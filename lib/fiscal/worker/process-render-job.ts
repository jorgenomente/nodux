import { buildFiscalQrPayload } from '@/lib/fiscal/render/build-qr-payload';
import { getFiscalAdminClient } from '@/lib/fiscal/rpc/client';
import { markJobFailed } from '@/lib/fiscal/rpc/mark-failed';
import { markRenderCompleted } from '@/lib/fiscal/rpc/mark-render-completed';
import type { FiscalInvoiceJobRow } from '@/lib/fiscal/rpc/types';
import { fiscalLogger } from '@/lib/fiscal/shared/fiscal-logger';
import { resolveFiscalContext } from '@/lib/fiscal/worker/resolve-credentials';

type InvoiceRow = {
  id: string;
  sale_id: string;
  invoice_job_id: string;
  environment: 'homo' | 'prod';
  pto_vta: number;
  cbte_tipo: number;
  cbte_nro: number;
  doc_tipo: number;
  doc_nro: number;
  currency: string;
  currency_rate: number;
  imp_total: number;
  cae: string | null;
  raw_request_json: Record<string, unknown> | null;
};

const resolveCbteFch = (invoice: InvoiceRow) => {
  const cbteFch = (invoice.raw_request_json?.feDetReq as
    | Record<string, unknown>
    | undefined)?.cbteFch;
  if (typeof cbteFch === 'string' && cbteFch.trim()) {
    return cbteFch.trim();
  }
  throw new Error(`Missing cbteFch in raw_request_json for invoice ${invoice.id}`);
};

export const processRenderJob = async (
  job: FiscalInvoiceJobRow,
  options?: { dryRun?: boolean },
) => {
  const dryRun = options?.dryRun ?? true;
  const context = {
    invoiceJobId: job.id,
    tenantId: job.tenant_id,
    environment: job.environment,
    ptoVta: job.pto_vta,
    cbteTipo: job.cbte_tipo,
    cbteNro: job.cbte_nro,
    correlationId: job.correlation_id,
  };

  if (dryRun) {
    fiscalLogger.info('fiscal_render_job_dry_run_stop', context);
    return { status: 'dry_run' as const };
  }

  const supabase = getFiscalAdminClient();
  const { data, error } = await supabase
    .from('invoices' as never)
    .select(
      'id,sale_id,invoice_job_id,environment,pto_vta,cbte_tipo,cbte_nro,doc_tipo,doc_nro,currency,currency_rate,imp_total,cae,raw_request_json',
    )
    .eq('invoice_job_id', job.id)
    .maybeSingle();

  if (error) {
    await markJobFailed({
      invoiceJobId: job.id,
      lastErrorCode: 'FISCAL_RENDER_INVOICE_LOAD_FAILED',
      lastErrorMessage: error.message,
      responsePayloadJson: { reason: 'invoice_load_failed' },
    });
    return { status: 'failed' as const };
  }

  if (!data) {
    await markJobFailed({
      invoiceJobId: job.id,
      lastErrorCode: 'FISCAL_RENDER_INVOICE_NOT_FOUND',
      lastErrorMessage: 'Authorized invoice not found for render_pending job',
      responsePayloadJson: { reason: 'invoice_not_found' },
    });
    return { status: 'failed' as const };
  }

  const invoice = data as unknown as InvoiceRow;
  if (!invoice.cae) {
    await markJobFailed({
      invoiceJobId: job.id,
      lastErrorCode: 'FISCAL_RENDER_MISSING_CAE',
      lastErrorMessage: 'Authorized invoice is missing CAE',
      responsePayloadJson: { reason: 'missing_cae' },
    });
    return { status: 'failed' as const };
  }

  try {
    const fiscalContext = await resolveFiscalContext({
      tenantId: job.tenant_id,
      environment: job.environment,
      ptoVta: job.pto_vta,
    });
    const qrPayloadJson = buildFiscalQrPayload({
      taxpayerCuit: Number(fiscalContext.credentials.taxpayer_cuit),
      cbteFch: resolveCbteFch(invoice),
      ptoVta: invoice.pto_vta,
      cbteTipo: invoice.cbte_tipo,
      cbteNro: invoice.cbte_nro,
      impTotal: Number(invoice.imp_total),
      currency: invoice.currency,
      currencyRate: Number(invoice.currency_rate),
      docTipo: invoice.doc_tipo,
      docNro: Number(invoice.doc_nro),
      cae: invoice.cae,
    });

    await markRenderCompleted({
      invoiceJobId: job.id,
      invoiceId: invoice.id,
      pdfStoragePath: `/sales/${invoice.sale_id}/invoice`,
      ticketStoragePath: `/sales/${invoice.sale_id}/invoice?format=ticket`,
      qrPayloadJson,
    });

    fiscalLogger.info('fiscal_render_completed', context, {
      invoiceId: invoice.id,
      pdfStoragePath: `/sales/${invoice.sale_id}/invoice`,
      ticketStoragePath: `/sales/${invoice.sale_id}/invoice?format=ticket`,
    });
    return { status: 'completed' as const };
  } catch (renderError) {
    const message =
      renderError instanceof Error ? renderError.message : 'Fiscal render failed';
    await markJobFailed({
      invoiceJobId: job.id,
      lastErrorCode: 'FISCAL_RENDER_FAILED',
      lastErrorMessage: message,
      responsePayloadJson: { reason: 'render_failed' },
    });
    fiscalLogger.warn('fiscal_render_failed', context, { message });
    return { status: 'failed' as const };
  }
};
