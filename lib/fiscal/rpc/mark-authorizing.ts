import { callFiscalRpc } from '@/lib/fiscal/rpc/client';
import type { FiscalInvoiceJobRow } from '@/lib/fiscal/rpc/types';

export const markJobAuthorizing = async (params: {
  invoiceJobId: string;
  attemptCount?: number;
  requestedPayloadJson?: Record<string, unknown>;
}): Promise<FiscalInvoiceJobRow> =>
  callFiscalRpc<FiscalInvoiceJobRow>('fn_fiscal_mark_job_authorizing', {
    p_invoice_job_id: params.invoiceJobId,
    p_attempt_count: params.attemptCount ?? null,
    p_requested_payload_json: params.requestedPayloadJson ?? null,
  });
