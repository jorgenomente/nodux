import { getFiscalAdminClient } from '@/lib/fiscal/rpc/client';
import type {
  FiscalCredentialsRow,
  FiscalPointOfSaleRow,
} from '@/lib/fiscal/rpc/types';
import type { FiscalEnvironment } from '@/lib/fiscal/shared/fiscal-types';

export type ResolvedFiscalContext = {
  credentials: FiscalCredentialsRow;
  pointOfSale: FiscalPointOfSaleRow;
};

export const resolveFiscalContext = async (params: {
  tenantId: string;
  environment: FiscalEnvironment;
  ptoVta: number;
}): Promise<ResolvedFiscalContext> => {
  const supabase = getFiscalAdminClient();

  const { data: credentials, error: credentialsError } = await supabase
    .from('fiscal_credentials' as never)
    .select(
      'id,tenant_id,environment,taxpayer_cuit,certificate_pem,encrypted_private_key,encryption_key_reference,status,ta_expires_at,wsaa_service_name,wsfe_service_name',
    )
    .eq('tenant_id', params.tenantId)
    .eq('environment', params.environment)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (credentialsError) {
    throw new Error(
      `resolveFiscalContext(credentials) failed: ${credentialsError.message}`,
    );
  }

  if (!credentials) {
    throw new Error(
      `FISCAL_CONFIG_CREDENTIALS_NOT_FOUND tenant=${params.tenantId} env=${params.environment}`,
    );
  }

  const { data: pointOfSale, error: pointOfSaleError } = await supabase
    .from('points_of_sale' as never)
    .select('id,tenant_id,location_id,environment,pto_vta,invoice_mode,status')
    .eq('tenant_id', params.tenantId)
    .eq('environment', params.environment)
    .eq('pto_vta', params.ptoVta)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (pointOfSaleError) {
    throw new Error(
      `resolveFiscalContext(point_of_sale) failed: ${pointOfSaleError.message}`,
    );
  }

  if (!pointOfSale) {
    throw new Error(
      `FISCAL_CONFIG_POINT_OF_SALE_NOT_FOUND tenant=${params.tenantId} env=${params.environment} pto_vta=${params.ptoVta}`,
    );
  }

  return {
    credentials: credentials as unknown as FiscalCredentialsRow,
    pointOfSale: pointOfSale as unknown as FiscalPointOfSaleRow,
  };
};
