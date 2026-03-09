import { decryptPrivateKeyPem } from '@/lib/fiscal/auth/decrypt-private-key';
import { getOrRefreshWsaaTicket } from '@/lib/fiscal/auth/wsaa-client';
import type { FiscalEnvironment } from '@/lib/fiscal/shared/fiscal-types';
import { submitFEDummy } from '@/lib/fiscal/wsfe/wsfe-client';
import { resolveFiscalContext } from '@/lib/fiscal/worker/resolve-credentials';

export type FiscalConnectionTestResult = {
  environment: FiscalEnvironment;
  ptoVta: number;
  taxpayerCuit: string;
  wsaaExpiresAt: string;
  appServer: string | null;
  dbServer: string | null;
  authServer: string | null;
};

export const runFiscalConnectionTest = async (params: {
  tenantId: string;
  environment: FiscalEnvironment;
  ptoVta: number;
}): Promise<FiscalConnectionTestResult> => {
  const { credentials, pointOfSale } = await resolveFiscalContext({
    tenantId: params.tenantId,
    environment: params.environment,
    ptoVta: params.ptoVta,
  });

  const privateKeyPem = decryptPrivateKeyPem({
    encryptedPrivateKey: credentials.encrypted_private_key,
    encryptionKeyReference: credentials.encryption_key_reference,
  });

  const wsaa = await getOrRefreshWsaaTicket({
    credentials,
    privateKeyPem,
    context: {
      invoiceJobId: 'settings-fiscal-test',
      tenantId: credentials.tenant_id,
      environment: credentials.environment,
      ptoVta: pointOfSale.pto_vta,
      cbteTipo: 0,
      cbteNro: null,
      correlationId: `settings-fiscal-test-${credentials.environment}-${pointOfSale.pto_vta}`,
    },
  });

  const wsfeDummy = await submitFEDummy({
    environment: params.environment,
  });

  return {
    environment: params.environment,
    ptoVta: pointOfSale.pto_vta,
    taxpayerCuit: credentials.taxpayer_cuit,
    wsaaExpiresAt: wsaa.expiresAt,
    appServer: wsfeDummy.appServer,
    dbServer: wsfeDummy.dbServer,
    authServer: wsfeDummy.authServer,
  };
};
