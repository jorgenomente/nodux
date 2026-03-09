export type SaleFiscalInvoiceRow = {
  sale_id: string;
  org_id: string;
  invoice_id: string;
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
  cae_expires_at: string | null;
  result_status: 'authorized' | 'rejected' | 'void' | 'unknown';
  qr_payload_json: Record<string, unknown> | null;
  pdf_storage_path: string | null;
  ticket_storage_path: string | null;
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
  created_at: string;
  updated_at: string;
};

export const formatFiscalRenderStatus = (
  status: SaleFiscalInvoiceRow['render_status'],
) => {
  switch (status) {
    case 'completed':
      return 'Comprobante listo';
    case 'render_pending':
      return 'Render pendiente';
    case 'pending_reconcile':
      return 'Pendiente de reconciliación';
    case 'failed':
      return 'Falló';
    default:
      return 'En proceso';
  }
};

export const buildAfipQrUrl = (payload: Record<string, unknown> | null) => {
  if (!payload) return null;
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(encoded)}`;
};
