import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { normalizeClientPhone } from '@/lib/clients/normalize';
import { getOrgMemberSession } from '@/lib/auth/org-session';
import type { OrgSession } from '@/lib/auth/org-session';
import { runFiscalWorkerOnce } from '@/lib/fiscal/worker/run-worker';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const FISCAL_SYNC_TIMEOUT_MS = 12000;
const FISCAL_SYNC_POLL_INTERVAL_MS = 500;

type CheckoutBody = {
  orgId: string;
  branchId: string;
  paymentMethod: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  specialOrderId?: string | null;
  closeSpecialOrder?: boolean;
  applyCashDiscount?: boolean;
  cashDiscountPct?: number | null;
  payments?: Array<{
    payment_method: string;
    amount: number;
    payment_device_id?: string | null;
  }> | null;
  applyEmployeeDiscount?: boolean;
  employeeDiscountPct?: number | null;
  employeeAccountId?: string | null;
  client?: {
    clientId?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  mode?: 'charge_only' | 'charge_and_invoice';
};

type ClientLookupRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type EnqueueFiscalResponse = {
  sale_document_id?: string | null;
  invoice_job_id?: string | null;
  job_status?: string | null;
  already_existed?: boolean | null;
};

type SaleFiscalStatusRow = {
  invoice_id: string;
  render_status:
    | 'pending'
    | 'reserved'
    | 'authorizing'
    | 'authorized'
    | 'rejected'
    | 'pending_reconcile'
    | 'render_pending'
    | 'completed'
    | 'failed';
  result_status: 'authorized' | 'rejected' | 'void' | 'unknown';
};

type InvoiceJobStatusRow = {
  id: string;
  job_status:
    | 'pending'
    | 'reserved'
    | 'authorizing'
    | 'authorized'
    | 'rejected'
    | 'pending_reconcile'
    | 'render_pending'
    | 'completed'
    | 'failed';
  last_error_code: string | null;
  last_error_message: string | null;
};

const callAuthedRpc = async <T>(params: {
  accessToken: string;
  rpcName: string;
  payload: Record<string, unknown>;
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase public env vars for POS checkout');
  }

  const response = await fetch(`${url}/rest/v1/rpc/${params.rpcName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${params.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(params.payload),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        message?: string;
        details?: string | null;
        hint?: string | null;
        code?: string | null;
      }
    | T
    | null;

  if (!response.ok) {
    return {
      data: null as T | null,
      error: {
        message:
          typeof payload === 'object' && payload && 'message' in payload
            ? String(payload.message ?? 'RPC failed')
            : 'RPC failed',
        details:
          typeof payload === 'object' && payload && 'details' in payload
            ? (payload.details ?? null)
            : null,
        hint:
          typeof payload === 'object' && payload && 'hint' in payload
            ? (payload.hint ?? null)
            : null,
        code:
          typeof payload === 'object' && payload && 'code' in payload
            ? (payload.code ?? null)
            : null,
      },
    };
  }

  return {
    data: payload as T,
    error: null,
  };
};

const sleep = async (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const resolveCheckoutClientId = async (params: {
  body: CheckoutBody;
  accessToken: string;
  supabase: OrgSession['supabase'];
}) => {
  const input = params.body.client;
  const clientId = String(input?.clientId ?? '').trim();
  const rawName = String(input?.name ?? '').trim();
  const normalizedPhone = normalizeClientPhone(input?.phone);
  const rawEmail = String(input?.email ?? '').trim();

  if (!clientId && !rawName && !normalizedPhone && !rawEmail) {
    return null;
  }

  let matchedClient: ClientLookupRow | null = null;

  if (clientId) {
    const { data } = await params.supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('org_id', params.body.orgId)
      .eq('id', clientId)
      .eq('is_active', true)
      .maybeSingle();

    matchedClient = (data as ClientLookupRow | null) ?? null;
  }

  if (!matchedClient && normalizedPhone) {
    const { data } = await params.supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('org_id', params.body.orgId)
      .eq('is_active', true)
      .limit(20)
      .ilike('phone', `%${normalizedPhone}%`);

    matchedClient =
      ((data as ClientLookupRow[] | null) ?? []).find(
        (row) => normalizeClientPhone(row.phone) === normalizedPhone,
      ) ?? null;
  }

  if (!matchedClient && !rawName) {
    return null;
  }

  if (!matchedClient && !normalizedPhone) {
    throw new Error('WhatsApp required for new client');
  }

  const effectiveClientId = matchedClient?.id ?? randomUUID();
  const effectiveName = rawName || matchedClient?.name || 'Cliente';
  const effectivePhone =
    normalizedPhone || normalizeClientPhone(matchedClient?.phone);
  const effectiveEmail = rawEmail || matchedClient?.email || '';

  const { error } = await callAuthedRpc<Array<{ client_id?: string | null }>>({
    accessToken: params.accessToken,
    rpcName: 'rpc_upsert_client',
    payload: {
      p_client_id: effectiveClientId,
      p_org_id: params.body.orgId,
      p_name: effectiveName,
      p_phone: effectivePhone,
      p_email: effectiveEmail,
      p_notes: '',
      p_is_active: true,
    },
  });

  if (error) {
    throw new Error(error.message || 'Could not upsert client');
  }

  return effectiveClientId;
};

const attemptSynchronousFiscalCompletion = async (params: {
  orgId: string;
  saleId: string;
  invoiceJobId: string;
}) => {
  try {
    await runFiscalWorkerOnce({
      batchSize: 5,
      dryRun: false,
      executionMode: 'live',
    });
  } catch (error) {
    return {
      status: 'processing' as const,
      error: error instanceof Error ? error.message : 'Fiscal worker failed',
    };
  }

  const adminSupabase = createAdminSupabaseClient();
  const deadline = Date.now() + FISCAL_SYNC_TIMEOUT_MS;

  while (Date.now() <= deadline) {
    const { data: invoiceRow } = await adminSupabase
      .from('v_sale_fiscal_invoice_admin' as never)
      .select('invoice_id, render_status, result_status')
      .eq('org_id', params.orgId)
      .eq('sale_id', params.saleId)
      .maybeSingle();

    const typedInvoiceRow = (invoiceRow ?? null) as SaleFiscalStatusRow | null;
    if (
      typedInvoiceRow &&
      typedInvoiceRow.result_status === 'authorized' &&
      typedInvoiceRow.render_status === 'completed'
    ) {
      return {
        status: 'completed' as const,
        invoiceId: typedInvoiceRow.invoice_id,
      };
    }

    const { data: jobRow } = await adminSupabase
      .from('invoice_jobs' as never)
      .select('id, job_status, last_error_code, last_error_message')
      .eq('id', params.invoiceJobId)
      .maybeSingle();

    const typedJobRow = (jobRow ?? null) as InvoiceJobStatusRow | null;
    if (
      typedJobRow &&
      (typedJobRow.job_status === 'failed' ||
        typedJobRow.job_status === 'rejected')
    ) {
      return {
        status: 'failed' as const,
        error:
          typedJobRow.last_error_message ||
          typedJobRow.last_error_code ||
          'Fiscal job failed',
      };
    }

    await sleep(FISCAL_SYNC_POLL_INTERVAL_MS);
  }

  return {
    status: 'processing' as const,
    error: null,
  };
};

export async function POST(request: NextRequest) {
  const session = await getOrgMemberSession();
  if (!session?.orgId || !session.effectiveRole) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const body = (await request.json()) as CheckoutBody;
  if (
    !body.orgId ||
    !body.branchId ||
    !Array.isArray(body.items) ||
    body.items.length === 0
  ) {
    return NextResponse.json(
      { ok: false, error: 'Invalid checkout payload' },
      { status: 400 },
    );
  }

  const {
    data: { session: authSession },
  } = await session.supabase.auth.getSession();

  if (!authSession?.access_token) {
    return NextResponse.json(
      { ok: false, error: 'Missing authenticated session for POS checkout' },
      { status: 401 },
    );
  }

  let resolvedClientId: string | null = null;
  try {
    resolvedClientId = await resolveCheckoutClientId({
      body,
      accessToken: authSession.access_token,
      supabase: session.supabase,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'No pudimos registrar o actualizar el cliente antes de cobrar.',
      },
      { status: 400 },
    );
  }

  const { data, error } = await callAuthedRpc<
    Array<{ sale_id?: string | null; total?: number | null }>
  >({
    accessToken: authSession.access_token,
    rpcName: 'rpc_create_sale',
    payload: {
      p_org_id: body.orgId,
      p_branch_id: body.branchId,
      p_payment_method: body.paymentMethod,
      p_items: body.items,
      p_special_order_id: body.specialOrderId ?? undefined,
      p_close_special_order: Boolean(body.closeSpecialOrder),
      p_apply_cash_discount: Boolean(body.applyCashDiscount),
      p_cash_discount_pct: body.applyCashDiscount
        ? (body.cashDiscountPct ?? undefined)
        : undefined,
      p_payments: body.payments ?? undefined,
      p_apply_employee_discount: Boolean(body.applyEmployeeDiscount),
      p_employee_discount_pct: body.applyEmployeeDiscount
        ? (body.employeeDiscountPct ?? undefined)
        : undefined,
      p_employee_account_id: body.applyEmployeeDiscount
        ? (body.employeeAccountId ?? undefined)
        : undefined,
      p_client_id: resolvedClientId ?? undefined,
    },
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 400 },
    );
  }

  const sale = (Array.isArray(data) ? data[0] : data) as {
    sale_id?: string | null;
    total?: number | null;
  } | null;
  const saleId = String(sale?.sale_id ?? '').trim();
  const total = Number(sale?.total ?? 0);
  let isInvoiced = false;
  let fiscalSyncStatus:
    | 'not_requested'
    | 'processing'
    | 'completed'
    | 'failed' = 'not_requested';
  let invoiceUrl: string | null = null;

  if (body.mode === 'charge_and_invoice' && saleId) {
    const { data: enqueueData, error: enqueueError } = await callAuthedRpc<
      EnqueueFiscalResponse[]
    >({
      accessToken: authSession.access_token,
      rpcName: 'rpc_enqueue_sale_fiscal_invoice',
      payload: {
        p_org_id: body.orgId,
        p_sale_id: saleId,
        p_environment: 'prod',
        p_cbte_tipo: 11,
        p_doc_tipo: 99,
        p_doc_nro: 0,
        p_source: 'pos_charge_and_invoice',
      },
    });

    if (enqueueError) {
      return NextResponse.json({
        ok: true,
        saleId,
        total,
        isInvoiced: false,
        fiscalError:
          'Venta cobrada, pero no pudimos iniciar la facturación fiscal. Puedes reintentar desde Ventas.',
      });
    }

    const enqueueRow = Array.isArray(enqueueData)
      ? enqueueData[0]
      : enqueueData;
    const invoiceJobId = String(enqueueRow?.invoice_job_id ?? '').trim();

    const { error: invoiceError } = await callAuthedRpc({
      accessToken: authSession.access_token,
      rpcName: 'rpc_mark_sale_invoiced',
      payload: {
        p_org_id: body.orgId,
        p_sale_id: saleId,
        p_source: 'pos_charge_and_invoice',
      },
    });

    if (invoiceError) {
      return NextResponse.json({
        ok: true,
        saleId,
        total,
        isInvoiced: false,
        fiscalError:
          'Venta cobrada y job fiscal encolado, pero no pudimos actualizar el estado visible de facturación.',
      });
    }

    isInvoiced = true;

    if (invoiceJobId) {
      const syncResult = await attemptSynchronousFiscalCompletion({
        orgId: body.orgId,
        saleId,
        invoiceJobId,
      });

      fiscalSyncStatus = syncResult.status;
      if (syncResult.status === 'completed') {
        invoiceUrl = `/sales/${saleId}/invoice`;
      }

      if (syncResult.status === 'failed') {
        return NextResponse.json({
          ok: true,
          saleId,
          total,
          isInvoiced: true,
          fiscalSyncStatus,
          invoiceUrl,
          fiscalError:
            'Venta cobrada, pero la facturación fiscal falló. Revísala desde Ventas.',
          fiscalDebugError: syncResult.error,
        });
      }
    } else {
      fiscalSyncStatus = 'processing';
    }
  }

  return NextResponse.json({
    ok: true,
    saleId,
    total,
    isInvoiced,
    fiscalSyncStatus,
    invoiceUrl,
  });
}
