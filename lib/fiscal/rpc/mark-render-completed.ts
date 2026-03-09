import { callFiscalRpc } from '@/lib/fiscal/rpc/client';
import type { FiscalInvoiceJobRow } from '@/lib/fiscal/rpc/types';

export const markRenderCompleted = async (params: {
  invoiceJobId: string;
  invoiceId: string;
  pdfStoragePath?: string;
  ticketStoragePath?: string;
  qrPayloadJson?: Record<string, unknown>;
}): Promise<FiscalInvoiceJobRow> =>
  callFiscalRpc<FiscalInvoiceJobRow>('fn_fiscal_mark_render_completed', {
    p_invoice_job_id: params.invoiceJobId,
    p_invoice_id: params.invoiceId,
    p_pdf_storage_path: params.pdfStoragePath ?? null,
    p_ticket_storage_path: params.ticketStoragePath ?? null,
    p_qr_payload_json: params.qrPayloadJson ?? null,
  });
