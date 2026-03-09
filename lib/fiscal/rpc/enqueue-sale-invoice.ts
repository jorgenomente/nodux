import { callFiscalRpc } from '@/lib/fiscal/rpc/client';

export type EnqueueSaleInvoiceResult = {
  sale_document_id: string;
  invoice_job_id: string;
  job_status: string;
  already_existed: boolean;
};

export const enqueueSaleFiscalInvoice = async (params: {
  orgId: string;
  saleId: string;
  environment?: 'homo' | 'prod';
  cbteTipo?: number;
  docTipo?: number;
  docNro?: number;
  source?: string;
}) =>
  callFiscalRpc<EnqueueSaleInvoiceResult[]>('rpc_enqueue_sale_fiscal_invoice', {
    p_org_id: params.orgId,
    p_sale_id: params.saleId,
    p_environment: params.environment ?? 'homo',
    p_cbte_tipo: params.cbteTipo ?? 11,
    p_doc_tipo: params.docTipo ?? 99,
    p_doc_nro: params.docNro ?? 0,
    p_source: params.source ?? 'manual',
  }).then((rows) => {
    const first = rows?.[0];
    if (!first) {
      throw new Error('rpc_enqueue_sale_fiscal_invoice returned no rows');
    }
    return first;
  });
