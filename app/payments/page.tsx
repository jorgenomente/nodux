import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import InvoiceImageField from '@/app/payments/InvoiceImageField';
import PaymentAmountField from '@/app/payments/PaymentAmountField';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SearchParams = {
  branch_id?: string;
  supplier_id?: string;
  state?: string;
  q?: string;
  result?: string;
};

type BranchRow = {
  id: string;
  name: string;
};

type SupplierRow = {
  id: string;
  name: string;
  preferred_payment_method: 'cash' | 'transfer' | null;
};

type PayableRow = {
  payable_id: string;
  order_id: string;
  branch_id: string;
  branch_name: string | null;
  supplier_id: string;
  supplier_name: string | null;
  order_status: 'draft' | 'sent' | 'received' | 'reconciled';
  payable_status: 'pending' | 'partial' | 'paid';
  payment_state: 'pending' | 'partial' | 'paid' | 'overdue' | 'not_created';
  estimated_amount: number;
  invoice_amount: number | null;
  paid_amount: number;
  outstanding_amount: number;
  due_on: string | null;
  due_in_days: number | null;
  is_overdue: boolean;
  preferred_payment_method: 'cash' | 'transfer' | null;
  selected_payment_method: 'cash' | 'transfer' | null;
  invoice_reference: string | null;
  invoice_photo_url: string | null;
  invoice_note: string | null;
  paid_at: string | null;
  created_at: string;
};

type PaymentAccountRow = {
  id: string;
  supplier_id: string;
  account_label: string | null;
  bank_name: string | null;
  account_holder_name: string | null;
  account_identifier: string | null;
  is_active: boolean;
};

type LatestPaymentRow = {
  payable_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
  payment_method: 'cash' | 'transfer';
  reference: string | null;
  created_at: string;
};

type PayableSnapshotRow = {
  id: string;
  invoice_amount: number | null;
  estimated_amount: number | null;
  paid_amount: number;
  outstanding_amount: number;
  due_on: string | null;
  invoice_reference: string | null;
  invoice_photo_url: string | null;
  invoice_note: string | null;
  selected_payment_method: 'cash' | 'transfer' | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('es-AR') : '—';

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('es-AR') : '—';

const formatStatus = (value: string) => {
  switch (value) {
    case 'pending':
      return 'Pendiente';
    case 'partial':
      return 'Parcial';
    case 'paid':
      return 'Pagado';
    case 'overdue':
      return 'Vencido';
    default:
      return value;
  }
};

const formatOrderStatus = (value: PayableRow['order_status']) => {
  switch (value) {
    case 'sent':
      return 'Pendiente por recibir';
    case 'received':
      return 'Controlado';
    case 'reconciled':
      return 'Controlado';
    default:
      return 'Borrador';
  }
};

const formatPaymentMethod = (value: 'cash' | 'transfer' | null | undefined) => {
  switch (value) {
    case 'cash':
      return 'Efectivo';
    case 'transfer':
      return 'Transferencia';
    default:
      return 'Sin definir';
  }
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const nowForDateTimeLocalInput = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

const isNextRedirectError = (error: unknown): error is { digest: string } =>
  typeof error === 'object' &&
  error !== null &&
  'digest' in error &&
  typeof (error as { digest?: unknown }).digest === 'string' &&
  (error as { digest: string }).digest.startsWith('NEXT_REDIRECT');

const buildResultUrl = (
  branchId: string,
  supplierId: string,
  state: string,
  searchQuery: string,
  result: string,
) => {
  const params = new URLSearchParams();
  if (branchId) params.set('branch_id', branchId);
  if (supplierId) params.set('supplier_id', supplierId);
  if (state) params.set('state', state);
  if (searchQuery) params.set('q', searchQuery);
  if (result) params.set('result', result);
  return `/payments${params.toString() ? `?${params.toString()}` : ''}`;
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId) {
    redirect('/no-access');
  }

  const supabase = session.supabase;
  const orgId = session.orgId;

  const { data: branchesData } = await supabase
    .from('branches')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');
  const branches = (branchesData as BranchRow[] | null) ?? [];

  const { data: suppliersData } = await supabase
    .from('suppliers')
    .select('id, name, preferred_payment_method')
    .eq('org_id', orgId)
    .order('name');
  const suppliers = (suppliersData as SupplierRow[] | null) ?? [];
  const supplierRequiredMethodById = new Map(
    suppliers.map((supplier) => [
      supplier.id,
      supplier.preferred_payment_method,
    ]),
  );

  const selectedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedSupplierId =
    typeof resolvedSearchParams.supplier_id === 'string'
      ? resolvedSearchParams.supplier_id
      : '';
  const selectedState =
    typeof resolvedSearchParams.state === 'string'
      ? resolvedSearchParams.state
      : '';
  const selectedSearchQuery =
    typeof resolvedSearchParams.q === 'string'
      ? resolvedSearchParams.q.trim()
      : '';

  let query = supabase
    .from('v_supplier_payables_admin')
    .select('*')
    .eq('org_id', orgId)
    .order('due_on', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (selectedBranchId) {
    query = query.eq('branch_id', selectedBranchId);
  }

  if (selectedSupplierId) {
    query = query.eq('supplier_id', selectedSupplierId);
  }

  if (selectedState && ['pending', 'partial', 'paid'].includes(selectedState)) {
    query = query.eq('payable_status', selectedState);
  }

  const { data: payablesData } = await query;
  const rawPayables = (payablesData as PayableRow[] | null) ?? [];

  const stateFilteredPayables =
    selectedState === 'overdue'
      ? rawPayables.filter((row) => row.is_overdue)
      : selectedState === 'due_soon'
        ? rawPayables.filter(
            (row) =>
              row.payable_status !== 'paid' &&
              row.due_in_days != null &&
              row.due_in_days >= 0 &&
              row.due_in_days <= 7,
          )
        : rawPayables;

  const searchTokens = normalizeSearchText(selectedSearchQuery)
    .split(/\s+/)
    .filter(Boolean);
  const payables =
    searchTokens.length === 0
      ? stateFilteredPayables
      : stateFilteredPayables.filter((row) => {
          const haystack = normalizeSearchText(
            `${row.supplier_name ?? ''} ${row.branch_name ?? ''} ${row.order_id ?? ''}`,
          );
          return searchTokens.every((token) => haystack.includes(token));
        });

  const pendingPayables = payables
    .filter((row) => row.payable_status !== 'paid')
    .sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      if (a.due_on && b.due_on) {
        const dueDiff = a.due_on.localeCompare(b.due_on);
        if (dueDiff !== 0) return dueDiff;
      } else if (a.due_on && !b.due_on) {
        return -1;
      } else if (!a.due_on && b.due_on) {
        return 1;
      }
      return b.created_at.localeCompare(a.created_at);
    });

  const paidPayables = payables
    .filter((row) => row.payable_status === 'paid')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const signedInvoiceUrlByPayable = new Map<string, string>();
  await Promise.all(
    payables.map(async (payable) => {
      if (!payable.invoice_photo_url) return;
      const { data } = await supabase.storage
        .from('supplier-invoices')
        .createSignedUrl(payable.invoice_photo_url, 60 * 60);
      if (data?.signedUrl) {
        signedInvoiceUrlByPayable.set(payable.payable_id, data.signedUrl);
      }
    }),
  );

  const payableSupplierIds = Array.from(
    new Set(payables.map((row) => row.supplier_id).filter(Boolean)),
  );
  const payableIds = Array.from(new Set(payables.map((row) => row.payable_id)));

  const { data: latestPaymentsData } =
    payableIds.length > 0
      ? await supabase
          .from('supplier_payments')
          .select(
            'payable_id, amount, paid_at, note, payment_method, reference, created_at',
          )
          .eq('org_id', orgId)
          .in('payable_id', payableIds)
          .order('paid_at', { ascending: false })
          .order('created_at', { ascending: false })
      : { data: [] };

  const latestPaymentByPayable = new Map<string, LatestPaymentRow>();
  ((latestPaymentsData as LatestPaymentRow[] | null) ?? []).forEach(
    (payment) => {
      if (!latestPaymentByPayable.has(payment.payable_id)) {
        latestPaymentByPayable.set(payment.payable_id, payment);
      }
    },
  );

  const { data: accountsData } =
    payableSupplierIds.length > 0
      ? await supabase
          .from('supplier_payment_accounts')
          .select(
            'id, supplier_id, account_label, bank_name, account_holder_name, account_identifier, is_active',
          )
          .eq('org_id', orgId)
          .eq('is_active', true)
          .in('supplier_id', payableSupplierIds)
          .order('created_at', { ascending: false })
      : { data: [] };

  const accountsBySupplier = new Map<string, PaymentAccountRow[]>();
  ((accountsData as PaymentAccountRow[] | null) ?? []).forEach((account) => {
    const list = accountsBySupplier.get(account.supplier_id) ?? [];
    list.push(account);
    accountsBySupplier.set(account.supplier_id, list);
  });

  const updatePayable = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const payableId = String(formData.get('payable_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const supplierId = String(formData.get('supplier_id') ?? '').trim();
    const state = String(formData.get('state') ?? '').trim();
    const searchQuery = String(formData.get('q') ?? '').trim();
    const invoiceAmountRaw = String(
      formData.get('invoice_amount') ?? '',
    ).trim();
    const dueOnRaw = String(formData.get('due_on') ?? '').trim();
    const selectedMethod = String(
      formData.get('selected_payment_method') ?? '',
    ).trim();
    const invoiceReference = String(
      formData.get('invoice_reference') ?? '',
    ).trim();
    const invoicePhotoUrl = String(
      formData.get('invoice_photo_url') ?? '',
    ).trim();
    const invoicePhotoPath = String(
      formData.get('invoice_photo_path') ?? '',
    ).trim();
    const invoicePhotoDataUrl = String(
      formData.get('invoice_photo_data_url') ?? '',
    ).trim();
    const invoiceNote = String(formData.get('invoice_note') ?? '').trim();
    const payableBranchId = String(
      formData.get('payable_branch_id') ?? '',
    ).trim();

    let uploadedInvoicePhotoPath = invoicePhotoPath || undefined;
    if (invoicePhotoDataUrl) {
      const matches = /^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/.exec(
        invoicePhotoDataUrl,
      );

      if (!matches) {
        redirect(
          buildResultUrl(
            branchId,
            supplierId,
            state,
            searchQuery,
            'error:invalid_image',
          ),
        );
      }

      const contentType = matches?.[1] || 'image/jpeg';
      const base64Payload = matches?.[2] || '';
      const buffer = Buffer.from(base64Payload, 'base64');

      if (buffer.length > 450 * 1024) {
        redirect(
          buildResultUrl(
            branchId,
            supplierId,
            state,
            searchQuery,
            'error:image_too_large',
          ),
        );
      }

      const imagePath = `${actionSession.orgId}/${payableBranchId || 'no-branch'}/${payableId}/${Date.now()}.jpg`;
      const { error: uploadError } = await actionSession.supabase.storage
        .from('supplier-invoices')
        .upload(imagePath, buffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        redirect(
          buildResultUrl(
            branchId,
            supplierId,
            state,
            searchQuery,
            `error:${uploadError.message}`,
          ),
        );
      }

      uploadedInvoicePhotoPath = imagePath;
    }

    const invoiceAmount =
      invoiceAmountRaw === '' ? null : Number(invoiceAmountRaw);
    if (
      invoiceAmount !== null &&
      (Number.isNaN(invoiceAmount) || invoiceAmount < 0)
    ) {
      redirect(
        buildResultUrl(
          branchId,
          supplierId,
          state,
          searchQuery,
          'error:invalid_amount',
        ),
      );
    }

    const { error } = await actionSession.supabase.rpc(
      'rpc_update_supplier_payable',
      {
        p_org_id: actionSession.orgId,
        p_payable_id: payableId,
        p_invoice_amount: invoiceAmount ?? undefined,
        p_due_on: dueOnRaw || undefined,
        p_invoice_reference: invoiceReference || undefined,
        p_invoice_photo_url:
          uploadedInvoicePhotoPath || invoicePhotoUrl || undefined,
        p_invoice_note: invoiceNote || undefined,
        p_selected_payment_method:
          selectedMethod === 'cash' || selectedMethod === 'transfer'
            ? selectedMethod
            : undefined,
      },
    );

    revalidatePath('/payments');
    revalidatePath('/orders');
    revalidatePath('/settings/audit-log');

    if (error) {
      redirect(
        buildResultUrl(
          branchId,
          supplierId,
          state,
          searchQuery,
          `error:${error.message}`,
        ),
      );
    }

    redirect(
      buildResultUrl(
        branchId,
        supplierId,
        state,
        searchQuery,
        'payable_updated',
      ),
    );
  };

  const registerPayment = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }
    const payableId = String(formData.get('payable_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const supplierId = String(formData.get('supplier_id') ?? '').trim();
    const state = String(formData.get('state') ?? '').trim();
    const searchQuery = String(formData.get('q') ?? '').trim();

    try {
      const amount = Number(String(formData.get('amount') ?? '0'));
      const paymentMethod = String(formData.get('payment_method') ?? '').trim();
      const paidAtRaw = String(formData.get('paid_at') ?? '').trim();
      const isPartialPayment = formData.get('is_partial_payment') === 'on';
      const partialTotalAmountRaw = String(
        formData.get('partial_total_amount') ?? '',
      ).trim();
      const transferAccountId = String(
        formData.get('transfer_account_id') ?? '',
      ).trim();
      const reference = String(formData.get('reference') ?? '').trim();
      const note = String(formData.get('note') ?? '').trim();

      if (
        Number.isNaN(amount) ||
        amount <= 0 ||
        (paymentMethod !== 'cash' && paymentMethod !== 'transfer')
      ) {
        redirect(
          buildResultUrl(
            branchId,
            supplierId,
            state,
            searchQuery,
            'error:invalid_payment',
          ),
        );
      }

      const partialTotalAmount =
        partialTotalAmountRaw === '' ? null : Number(partialTotalAmountRaw);
      if (
        isPartialPayment &&
        (partialTotalAmount === null ||
          Number.isNaN(partialTotalAmount) ||
          partialTotalAmount <= 0)
      ) {
        redirect(
          buildResultUrl(
            branchId,
            supplierId,
            state,
            searchQuery,
            'error:partial_total_required',
          ),
        );
      }

      let paidAtIso: string | undefined;
      if (paidAtRaw) {
        const parsedPaidAt = new Date(paidAtRaw);
        if (Number.isNaN(parsedPaidAt.getTime())) {
          redirect(
            buildResultUrl(
              branchId,
              supplierId,
              state,
              searchQuery,
              'error:invalid_paid_at',
            ),
          );
        }
        paidAtIso = parsedPaidAt.toISOString();
      }

      const { data: payableData } = await actionSession.supabase
        .from('supplier_payables')
        .select(
          'id, invoice_amount, estimated_amount, paid_amount, outstanding_amount, due_on, invoice_reference, invoice_photo_url, invoice_note, selected_payment_method',
        )
        .eq('org_id', actionSession.orgId)
        .eq('id', payableId)
        .maybeSingle();

      const payable = (payableData as PayableSnapshotRow | null) ?? null;
      if (!payable) {
        redirect(
          buildResultUrl(
            branchId,
            supplierId,
            state,
            searchQuery,
            'error:payable_not_found',
          ),
        );
      }

      const currentPaid = Number(payable.paid_amount ?? 0);
      const currentOutstanding = Number(payable.outstanding_amount ?? 0);
      const currentBase = Number(
        payable.invoice_amount ?? payable.estimated_amount ?? 0,
      );
      const totalPaidAfterPayment = Number((currentPaid + amount).toFixed(2));

      let targetInvoiceAmount: number | null = null;
      if (isPartialPayment) {
        const partialTotal = Number(partialTotalAmount ?? 0);
        if (partialTotal < totalPaidAfterPayment) {
          redirect(
            buildResultUrl(
              branchId,
              supplierId,
              state,
              searchQuery,
              'error:partial_total_less_than_paid',
            ),
          );
        }
        targetInvoiceAmount = Number(partialTotal.toFixed(2));
      } else if (currentOutstanding > 0 && amount > currentOutstanding) {
        targetInvoiceAmount = Number(
          Math.max(currentBase, totalPaidAfterPayment).toFixed(2),
        );
      }

      if (targetInvoiceAmount !== null) {
        const selectedMethodToKeep =
          payable.selected_payment_method ?? paymentMethod;
        const { error: updatePayableError } = await actionSession.supabase.rpc(
          'rpc_update_supplier_payable',
          {
            p_org_id: actionSession.orgId,
            p_payable_id: payable.id,
            p_invoice_amount: targetInvoiceAmount,
            p_due_on: payable.due_on || undefined,
            p_invoice_reference: payable.invoice_reference ?? undefined,
            p_invoice_photo_url: payable.invoice_photo_url || undefined,
            p_invoice_note: payable.invoice_note || undefined,
            p_selected_payment_method:
              selectedMethodToKeep === 'cash' ||
              selectedMethodToKeep === 'transfer'
                ? selectedMethodToKeep
                : undefined,
          },
        );
        if (updatePayableError) {
          redirect(
            buildResultUrl(
              branchId,
              supplierId,
              state,
              searchQuery,
              `error:${updatePayableError.message}`,
            ),
          );
        }
      }

      const { error } = await actionSession.supabase.rpc(
        'rpc_register_supplier_payment',
        {
          p_org_id: actionSession.orgId,
          p_payable_id: payableId,
          p_amount: amount,
          p_payment_method: paymentMethod,
          p_paid_at: paidAtIso || undefined,
          p_transfer_account_id: transferAccountId || undefined,
          p_reference: reference || undefined,
          p_note: note || undefined,
        },
      );

      revalidatePath('/payments');
      revalidatePath('/orders');
      revalidatePath('/settings/audit-log');

      if (error) {
        redirect(
          buildResultUrl(
            branchId,
            supplierId,
            state,
            searchQuery,
            `error:${error.message}`,
          ),
        );
      }

      redirect(
        buildResultUrl(
          branchId,
          supplierId,
          state,
          searchQuery,
          'payment_registered',
        ),
      );
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }

      const unexpectedMessage =
        error instanceof Error ? error.message : 'unexpected_server_error';
      redirect(
        buildResultUrl(
          branchId,
          supplierId,
          state,
          searchQuery,
          `error:${unexpectedMessage}`,
        ),
      );
    }
  };

  const result =
    typeof resolvedSearchParams.result === 'string'
      ? resolvedSearchParams.result
      : '';
  const paidAtDefaultValue = nowForDateTimeLocalInput();

  const renderPayableCard = (payable: PayableRow) => {
    const accounts = accountsBySupplier.get(payable.supplier_id) ?? [];
    const latestPayment = latestPaymentByPayable.get(payable.payable_id);
    const currentRequiredMethod =
      supplierRequiredMethodById.get(payable.supplier_id) ??
      payable.preferred_payment_method;

    return (
      <article
        key={payable.payable_id}
        className="rounded-lg border border-zinc-200 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {payable.supplier_name || 'Proveedor'} ·{' '}
              {payable.branch_name || 'Sucursal'}
            </p>
            <p className="text-xs text-zinc-500">
              Pedido:{' '}
              <Link
                href={`/orders/${payable.order_id}`}
                className="font-semibold hover:underline"
              >
                {payable.order_id}
              </Link>
              {' · '}Estado pedido:{' '}
              <span className="font-semibold text-zinc-700">
                {formatOrderStatus(payable.order_status)}
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Estado pago:{' '}
              <span
                className={`font-semibold ${
                  payable.payment_state === 'paid'
                    ? 'text-emerald-700'
                    : payable.payment_state === 'overdue'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                }`}
              >
                {formatStatus(payable.payment_state)}
              </span>
              {' · '}Vencimiento: {formatDate(payable.due_on)}
              {' · '}Saldo:{' '}
              {formatCurrency(Number(payable.outstanding_amount ?? 0))}
            </p>
            <p className="text-xs text-zinc-500">
              Método requerido:{' '}
              <span className="font-semibold text-zinc-700">
                {formatPaymentMethod(currentRequiredMethod)}
              </span>
              {' · '}Seleccionado:{' '}
              <span className="font-semibold text-zinc-700">
                {formatPaymentMethod(payable.selected_payment_method)}
              </span>
            </p>
            <p className="text-xs text-zinc-500">
              Nro factura/remito:{' '}
              <span className="font-semibold text-zinc-700">
                {payable.invoice_reference || 'Sin cargar'}
              </span>
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>
              Estimado: {formatCurrency(Number(payable.estimated_amount ?? 0))}
            </p>
            <p>
              Factura: {formatCurrency(Number(payable.invoice_amount ?? 0))}
            </p>
            <p>Pagado: {formatCurrency(Number(payable.paid_amount ?? 0))}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {latestPayment ? (
            <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
              <p className="font-semibold">Último pago registrado</p>
              <p className="mt-1">
                {formatDateTime(latestPayment.paid_at)} ·{' '}
                {formatCurrency(Number(latestPayment.amount ?? 0))}
              </p>
              <p className="mt-1 text-sky-700">
                Nota:{' '}
                <span className="font-medium">
                  {latestPayment.note?.trim() || 'Sin nota'}
                </span>
              </p>
            </div>
          ) : null}

          <details className="rounded border border-zinc-200 p-3">
            <summary className="cursor-pointer text-xs font-semibold tracking-wide text-zinc-700 uppercase">
              Registrar factura/remito
            </summary>
            <form action={updatePayable} className="mt-3 grid gap-2">
              <input
                type="hidden"
                name="payable_id"
                value={payable.payable_id}
              />
              <input type="hidden" name="branch_id" value={selectedBranchId} />
              <input
                type="hidden"
                name="supplier_id"
                value={selectedSupplierId}
              />
              <input type="hidden" name="state" value={selectedState} />
              <input type="hidden" name="q" value={selectedSearchQuery} />
              <input
                type="hidden"
                name="payable_branch_id"
                value={payable.branch_id}
              />
              <label className="text-xs text-zinc-600">
                Numero de factura/remito
                <input
                  name="invoice_reference"
                  type="text"
                  defaultValue={payable.invoice_reference ?? ''}
                  placeholder="Ej: A-0003-00124567 o REM-4589"
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Monto exacto factura
                <input
                  name="invoice_amount"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={payable.invoice_amount ?? ''}
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Fecha indicada del remito/factura
                <input
                  name="due_on"
                  type="date"
                  defaultValue={payable.due_on ?? ''}
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Metodo seleccionado
                <select
                  name="selected_payment_method"
                  defaultValue={
                    payable.selected_payment_method ??
                    currentRequiredMethod ??
                    ''
                  }
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                >
                  <option value="">Sin definir</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </label>
              <label className="text-xs text-zinc-600">
                URL foto factura/remito (opcional)
                <input
                  name="invoice_photo_url"
                  defaultValue={payable.invoice_photo_url ?? ''}
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  placeholder="https://..."
                />
              </label>
              <InvoiceImageField
                inputName="invoice_photo_data_url"
                existingPath={payable.invoice_photo_url}
                defaultPreviewUrl={signedInvoiceUrlByPayable.get(
                  payable.payable_id,
                )}
              />
              <label className="text-xs text-zinc-600">
                Observaciones
                <textarea
                  name="invoice_note"
                  rows={2}
                  defaultValue={payable.invoice_note ?? ''}
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Guardar datos
              </button>
            </form>
          </details>

          {payable.payable_status === 'paid' ? (
            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Factura pagada
              {payable.paid_at
                ? ` el ${formatDateTime(payable.paid_at)}`
                : ''}{' '}
              · No requiere registrar nuevos pagos.
            </div>
          ) : (
            <details className="rounded border border-zinc-200 p-3">
              <summary className="cursor-pointer text-xs font-semibold tracking-wide text-zinc-700 uppercase">
                Registrar pago
              </summary>
              <form action={registerPayment} className="mt-3 grid gap-2">
                <input
                  type="hidden"
                  name="payable_id"
                  value={payable.payable_id}
                />
                <input
                  type="hidden"
                  name="branch_id"
                  value={selectedBranchId}
                />
                <input
                  type="hidden"
                  name="supplier_id"
                  value={selectedSupplierId}
                />
                <input type="hidden" name="state" value={selectedState} />
                <input type="hidden" name="q" value={selectedSearchQuery} />
                <PaymentAmountField
                  remainingAmount={Number(payable.outstanding_amount ?? 0)}
                  paidAmount={Number(payable.paid_amount ?? 0)}
                />
                <label className="text-xs text-zinc-600">
                  Fecha y hora de pago
                  <input
                    name="paid_at"
                    type="datetime-local"
                    defaultValue={paidAtDefaultValue}
                    className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs text-zinc-600">
                  Metodo
                  <select
                    name="payment_method"
                    defaultValue={payable.selected_payment_method ?? 'cash'}
                    className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </label>
                <label className="text-xs text-zinc-600">
                  Cuenta transferencia (opcional)
                  <select
                    name="transfer_account_id"
                    className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  >
                    <option value="">Sin cuenta</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_label ||
                          account.account_identifier ||
                          account.bank_name ||
                          'Cuenta'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-zinc-600">
                  Referencia (opcional)
                  <input
                    name="reference"
                    className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs text-zinc-600">
                  Nota (opcional)
                  <input
                    name="note"
                    className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Registrar pago
                </button>
              </form>
            </details>
          )}
        </div>
      </article>
    );
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Pagos a proveedores
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Gestiona pendientes por sucursal y registra pagos parciales o
              totales.
            </p>
          </div>
          <Link
            href="/settings/audit-log"
            className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            Ver auditoría
          </Link>
        </header>

        {result === 'payable_updated' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Cuenta por pagar actualizada.
          </p>
        ) : null}
        {result === 'payment_registered' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Pago registrado.
          </p>
        ) : null}
        {result.startsWith('error:') ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Error: {result.replace('error:', '')}
          </p>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <form className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-zinc-700">
              Sucursal
              <select
                name="branch_id"
                defaultValue={selectedBranchId}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-700">
              Proveedor
              <select
                name="supplier_id"
                defaultValue={selectedSupplierId}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-700">
              Estado
              <select
                name="state"
                defaultValue={selectedState}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
                <option value="paid">Pagado</option>
                <option value="overdue">Vencido</option>
                <option value="due_soon">Vence pronto (7 días)</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
              >
                Filtrar
              </button>
            </div>
            <label className="text-sm text-zinc-700 md:col-span-4">
              Buscar por nombre
              <input
                name="q"
                defaultValue={selectedSearchQuery}
                placeholder="Ej: palermo cafe puerto"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Pagos</h2>
          {payables.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No hay cuentas por pagar para estos filtros.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-800">
                  Pendientes por pagar
                </h3>
                {pendingPayables.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    No hay facturas pendientes con estos filtros.
                  </p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {pendingPayables.map((payable) =>
                      renderPayableCard(payable),
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-100 pt-6">
                <h3 className="text-sm font-semibold text-zinc-800">
                  Facturas pagadas
                </h3>
                {paidPayables.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    No hay facturas pagadas con estos filtros.
                  </p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {paidPayables.map((payable) => renderPayableCard(payable))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
