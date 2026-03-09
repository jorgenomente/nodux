import { fiscalLogger } from '@/lib/fiscal/shared/fiscal-logger';
import type { FiscalInvoiceJobRow } from '@/lib/fiscal/rpc/types';

export const processReconcileJob = async (
  job: FiscalInvoiceJobRow,
  options?: { dryRun?: boolean },
) => {
  const context = {
    invoiceJobId: job.id,
    tenantId: job.tenant_id,
    environment: job.environment,
    ptoVta: job.pto_vta,
    cbteTipo: job.cbte_tipo,
    cbteNro: job.cbte_nro,
    correlationId: job.correlation_id,
  };

  fiscalLogger.info('fiscal_reconcile_job_loaded', context, {
    dryRun: options?.dryRun ?? true,
  });

  // Lote 2 entrega estructura y contratos. La reconciliación externa se implementa luego.
  return { status: 'not_implemented' as const };
};
