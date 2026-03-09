import { callFiscalRpc } from '@/lib/fiscal/rpc/client';
import type { FiscalInvoiceJobRow } from '@/lib/fiscal/rpc/types';

export const markJobRejected = async (params: {
  invoiceJobId: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  responsePayloadJson?: Record<string, unknown>;
  afipObservationsJson?: Record<string, unknown>;
  afipEventsJson?: Record<string, unknown>;
}): Promise<FiscalInvoiceJobRow> =>
  callFiscalRpc<FiscalInvoiceJobRow>('fn_fiscal_mark_job_rejected', {
    p_invoice_job_id: params.invoiceJobId,
    p_last_error_code: params.lastErrorCode ?? null,
    p_last_error_message: params.lastErrorMessage ?? null,
    p_response_payload_json: params.responsePayloadJson ?? null,
    p_afip_observations_json: params.afipObservationsJson ?? null,
    p_afip_events_json: params.afipEventsJson ?? null,
  });
