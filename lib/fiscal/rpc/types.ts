import type {
  FiscalEnvironment,
  FiscalJobStatus,
} from '@/lib/fiscal/shared/fiscal-types';

export type FiscalInvoiceJobRow = {
  id: string;
  tenant_id: string;
  sale_id: string;
  sale_document_id: string;
  environment: FiscalEnvironment;
  point_of_sale_id: string | null;
  pto_vta: number;
  cbte_tipo: number;
  cbte_nro: number | null;
  job_status: FiscalJobStatus;
  attempt_count: number;
  requested_payload_json: Record<string, unknown> | null;
  correlation_id: string;
  created_at: string;
};

export type FiscalCredentialsRow = {
  id: string;
  tenant_id: string;
  environment: FiscalEnvironment;
  taxpayer_cuit: string;
  certificate_pem: string;
  encrypted_private_key: string;
  encryption_key_reference: string;
  status: 'pending' | 'active' | 'inactive' | 'revoked';
  ta_expires_at: string | null;
  wsaa_service_name: string;
  wsfe_service_name: string;
};

export type FiscalPointOfSaleRow = {
  id: string;
  tenant_id: string;
  location_id: string | null;
  environment: FiscalEnvironment;
  pto_vta: number;
  invoice_mode: 'sync' | 'async';
  status: 'active' | 'inactive';
};

export type ReserveSequenceResult = {
  invoice_job_id: string;
  tenant_id: string;
  environment: FiscalEnvironment;
  pto_vta: number;
  cbte_tipo: number;
  cbte_nro: number;
};
