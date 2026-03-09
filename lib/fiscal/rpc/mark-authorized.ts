import { callFiscalRpc } from '@/lib/fiscal/rpc/client';

export type MarkAuthorizedInput = {
  invoiceJobId: string;
  docTipo: number;
  docNro: number;
  currency: string;
  currencyRate: number;
  impTotal: number;
  impNeto: number;
  impIva: number;
  impTrib: number;
  impOpEx: number;
  impTotConc: number;
  cae: string;
  caeExpiresAt: string;
  afipObservationsJson?: Record<string, unknown>;
  afipEventsJson?: Record<string, unknown>;
  rawRequestJson?: Record<string, unknown>;
  rawResponseJson?: Record<string, unknown>;
  responsePayloadJson?: Record<string, unknown>;
};

export const markJobAuthorized = async (
  input: MarkAuthorizedInput,
): Promise<string> =>
  callFiscalRpc<string>('fn_fiscal_mark_job_authorized', {
    p_invoice_job_id: input.invoiceJobId,
    p_doc_tipo: input.docTipo,
    p_doc_nro: input.docNro,
    p_currency: input.currency,
    p_currency_rate: input.currencyRate,
    p_imp_total: input.impTotal,
    p_imp_neto: input.impNeto,
    p_imp_iva: input.impIva,
    p_imp_trib: input.impTrib,
    p_imp_op_ex: input.impOpEx,
    p_imp_tot_conc: input.impTotConc,
    p_cae: input.cae,
    p_cae_expires_at: input.caeExpiresAt,
    p_afip_observations_json: input.afipObservationsJson ?? null,
    p_afip_events_json: input.afipEventsJson ?? null,
    p_raw_request_json: input.rawRequestJson ?? null,
    p_raw_response_json: input.rawResponseJson ?? null,
    p_response_payload_json: input.responsePayloadJson ?? null,
  });
