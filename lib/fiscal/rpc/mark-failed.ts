import { callFiscalRpc } from '@/lib/fiscal/rpc/client';
import type { FiscalInvoiceJobRow } from '@/lib/fiscal/rpc/types';

export const markJobFailed = async (params: {
  invoiceJobId: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  responsePayloadJson?: Record<string, unknown>;
}): Promise<FiscalInvoiceJobRow> =>
  callFiscalRpc<FiscalInvoiceJobRow>('fn_fiscal_mark_job_failed', {
    p_invoice_job_id: params.invoiceJobId,
    p_last_error_code: params.lastErrorCode ?? null,
    p_last_error_message: params.lastErrorMessage ?? null,
    p_response_payload_json: params.responsePayloadJson ?? null,
  });
