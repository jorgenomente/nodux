import { getFiscalAdminClient } from '@/lib/fiscal/rpc/client';
import type { WsaaContext } from '@/lib/fiscal/shared/fiscal-types';
import { submitFECompUltimoAutorizado } from '@/lib/fiscal/wsfe/wsfe-client';

export const syncFiscalSequenceWithArca = async (params: {
  tenantId: string;
  environment: 'homo' | 'prod';
  taxpayerCuit: string;
  ptoVta: number;
  cbteTipo: number;
  wsaa: WsaaContext;
}) => {
  const remote = await submitFECompUltimoAutorizado({
    environment: params.environment,
    auth: {
      token: params.wsaa.token,
      sign: params.wsaa.sign,
      cuit: Number.parseInt(params.taxpayerCuit, 10),
    },
    ptoVta: params.ptoVta,
    cbteTipo: params.cbteTipo,
  });

  const supabase = getFiscalAdminClient();
  const payload = {
    tenant_id: params.tenantId,
    environment: params.environment,
    pto_vta: params.ptoVta,
    cbte_tipo: params.cbteTipo,
    last_local_reserved: remote.lastAuthorized,
    last_arca_confirmed: remote.lastAuthorized,
    status: 'healthy',
  };

  const { error } = await supabase.from('fiscal_sequences' as never).upsert(
    payload as never,
    {
      onConflict: 'tenant_id,environment,pto_vta,cbte_tipo',
    },
  );

  if (error) {
    throw new Error(`syncFiscalSequenceWithArca failed: ${error.message}`);
  }

  return remote;
};
