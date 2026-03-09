import type { FiscalErrorClassification } from '@/lib/fiscal/shared/fiscal-types';

export const mapAfipErrorToFiscalClassification = (params: {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}): FiscalErrorClassification => ({
  code: params.code || 'FISCAL_REJECTED_BY_ARCA',
  category: 'fiscal_rejection',
  severity: 'high',
  retryable: false,
  reconcileRequired: false,
  jobTransition: 'rejected',
  message: params.message || 'AFIP / ARCA rechazó formalmente el comprobante',
  details: params.details,
});
