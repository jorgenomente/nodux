import { fiscalLogger } from '@/lib/fiscal/shared/fiscal-logger';
import { getOrRefreshWsaaTicket } from '@/lib/fiscal/auth/wsaa-client';
import { decryptPrivateKeyPem } from '@/lib/fiscal/auth/decrypt-private-key';
import { markJobAuthorized } from '@/lib/fiscal/rpc/mark-authorized';
import { markJobAuthorizing } from '@/lib/fiscal/rpc/mark-authorizing';
import { markJobFailed } from '@/lib/fiscal/rpc/mark-failed';
import { markJobPendingReconcile } from '@/lib/fiscal/rpc/mark-pending-reconcile';
import { markJobRejected } from '@/lib/fiscal/rpc/mark-rejected';
import { reserveSequence } from '@/lib/fiscal/rpc/reserve-sequence';
import type { FiscalInvoiceJobRow } from '@/lib/fiscal/rpc/types';
import type {
  FiscalExecutionMode,
  FiscalInvoiceRequestInput,
} from '@/lib/fiscal/shared/fiscal-types';
import { resolveFiscalContext } from '@/lib/fiscal/worker/resolve-credentials';
import { syncFiscalSequenceWithArca } from '@/lib/fiscal/worker/sync-fiscal-sequence';
import { getFiscalOrgControls } from '@/lib/fiscal/worker/get-fiscal-org-controls';
import { buildFECAERequest } from '@/lib/fiscal/wsfe/build-fecae-request';
import { submitFECAESolicitar, submitFEDummy } from '@/lib/fiscal/wsfe/wsfe-client';

export const processInvoiceJob = async (
  job: FiscalInvoiceJobRow,
  options?: { dryRun?: boolean; executionMode?: FiscalExecutionMode },
) => {
  const dryRun = options?.dryRun ?? true;
  const executionMode = options?.executionMode ?? 'live';
  const baseContext = {
    invoiceJobId: job.id,
    tenantId: job.tenant_id,
    environment: job.environment,
    ptoVta: job.pto_vta,
    cbteTipo: job.cbte_tipo,
    cbteNro: job.cbte_nro,
    correlationId: job.correlation_id,
  };
  let fiscalContext;
  try {
    fiscalContext = await resolveFiscalContext({
      tenantId: job.tenant_id,
      environment: job.environment,
      ptoVta: job.pto_vta,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Fiscal context resolution failed';
    await markJobFailed({
      invoiceJobId: job.id,
      lastErrorCode: 'FISCAL_CONFIG_RESOLUTION_FAILED',
      lastErrorMessage: message,
      responsePayloadJson: {
        reason: 'resolve_fiscal_context_failed',
      },
    });
    return { status: 'failed' as const };
  }

  if (dryRun) {
    const reserve = await reserveSequence(job.id);
    const dryRunContext = {
      ...baseContext,
      ptoVta: reserve.pto_vta,
      cbteTipo: reserve.cbte_tipo,
      cbteNro: reserve.cbte_nro,
    };
    fiscalLogger.info('fiscal_job_sequence_reserved', dryRunContext, reserve);
    fiscalLogger.info('fiscal_job_dry_run_stop_before_ws', dryRunContext);
    return { status: 'dry_run' as const };
  }

  const requestedPayloadJson = job.requested_payload_json;
  if (!requestedPayloadJson || typeof requestedPayloadJson !== 'object') {
    await markJobFailed({
      invoiceJobId: job.id,
      lastErrorCode: 'FISCAL_REQUEST_INVALID_INTERNAL_CONTRACT',
      lastErrorMessage: 'invoice_job.requested_payload_json missing or invalid',
      responsePayloadJson: {
        reason: 'missing_requested_payload_json',
      },
    });
    return { status: 'failed' as const };
  }

  let wsaa;
  try {
    const privateKeyPem = decryptPrivateKeyPem({
      encryptedPrivateKey: fiscalContext.credentials.encrypted_private_key,
      encryptionKeyReference: fiscalContext.credentials.encryption_key_reference,
    });

    wsaa = await getOrRefreshWsaaTicket({
      credentials: fiscalContext.credentials,
      privateKeyPem,
      context: baseContext,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'WSAA authentication failed';
    const code =
      error instanceof DOMException && error.name === 'AbortError'
        ? 'FISCAL_WSAA_TIMEOUT'
        : 'FISCAL_WSAA_AUTH_REJECTED';
    await markJobFailed({
      invoiceJobId: job.id,
      lastErrorCode: code,
      lastErrorMessage: message,
      responsePayloadJson: {
        reason: 'wsaa_failed',
      },
    });
    fiscalLogger.warn('fiscal_job_failed_before_wsfe', baseContext, {
      code,
      message,
    });
    return { status: 'failed' as const };
  }

  fiscalLogger.info('fiscal_job_wsaa_context_ready', baseContext, {
    wsaaExpiresAt: wsaa.expiresAt,
    executionMode,
  });

  if (executionMode === 'live' && job.environment === 'prod') {
    try {
      const controls = await getFiscalOrgControls(job.tenant_id);
      if (!controls.fiscalProdLiveEnabled) {
        await markJobFailed({
          invoiceJobId: job.id,
          lastErrorCode: 'FISCAL_PROD_LIVE_DISABLED',
          lastErrorMessage:
            'Live fiscal emission in prod is disabled for this organization',
          responsePayloadJson: {
            reason: 'prod_live_disabled',
            executionMode,
          },
        });
        return { status: 'failed' as const };
      }

      const remoteSequence = await syncFiscalSequenceWithArca({
        tenantId: job.tenant_id,
        environment: job.environment,
        taxpayerCuit: fiscalContext.credentials.taxpayer_cuit,
        ptoVta: job.pto_vta,
        cbteTipo: job.cbte_tipo,
        wsaa,
      });

      fiscalLogger.info('fiscal_sequence_synced_with_arca', baseContext, {
        lastAuthorized: remoteSequence.lastAuthorized,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to resolve fiscal org controls';
      await markJobFailed({
        invoiceJobId: job.id,
        lastErrorCode:
          message ===
          'Live fiscal emission in prod is disabled for this organization'
            ? 'FISCAL_PROD_LIVE_DISABLED'
            : 'FISCAL_PROD_LIVE_CONTROL_FAILED',
        lastErrorMessage: message,
        responsePayloadJson: {
          reason:
            message ===
            'Live fiscal emission in prod is disabled for this organization'
              ? 'prod_live_disabled'
              : 'prod_live_control_failed',
          executionMode,
        },
      });
      return { status: 'failed' as const };
    }
  }

  const reserve = await reserveSequence(job.id);
  const context = {
    ...baseContext,
    ptoVta: reserve.pto_vta,
    cbteTipo: reserve.cbte_tipo,
    cbteNro: reserve.cbte_nro,
  };

  fiscalLogger.info('fiscal_job_sequence_reserved', context, reserve);

  await markJobAuthorizing({
    invoiceJobId: job.id,
    requestedPayloadJson,
  });

  if (executionMode === 'prod-safe') {
    if (job.environment !== 'prod') {
      await markJobFailed({
        invoiceJobId: job.id,
        lastErrorCode: 'FISCAL_PROD_SAFE_REQUIRES_PROD_ENV',
        lastErrorMessage: 'prod-safe mode only supports invoice jobs in prod environment',
        responsePayloadJson: {
          reason: 'prod_safe_invalid_environment',
          executionMode,
          environment: job.environment,
        },
      });
      return { status: 'failed' as const };
    }

    try {
      const wsfeDummy = await submitFEDummy({
        environment: job.environment,
      });

      await markJobPendingReconcile({
        invoiceJobId: job.id,
        lastErrorCode: 'FISCAL_PROD_SAFE_STOP_BEFORE_FECAE',
        lastErrorMessage:
          'prod-safe mode verified WSAA and FEDummy, then stopped before FECAESolicitar',
        responsePayloadJson: {
          reason: 'prod_safe_stop_before_fecae',
          executionMode,
          wsaaExpiresAt: wsaa.expiresAt,
          wsfeDummy,
        },
      });

      fiscalLogger.info('fiscal_job_prod_safe_stop_before_fecae', context, {
        executionMode,
        wsaaExpiresAt: wsaa.expiresAt,
        wsfeDummy,
      });

      return { status: 'pending_reconcile' as const };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'WSFE FEDummy failed in prod-safe mode';
      await markJobPendingReconcile({
        invoiceJobId: job.id,
        lastErrorCode: 'FISCAL_PROD_SAFE_DUMMY_FAILED',
        lastErrorMessage: message,
        responsePayloadJson: {
          reason: 'prod_safe_dummy_failed',
          executionMode,
        },
      });
      fiscalLogger.warn('fiscal_job_prod_safe_dummy_failed', context, {
        executionMode,
        message,
      });
      return { status: 'pending_reconcile' as const };
    }
  }

  try {
    const fiscalRequestInput = requestedPayloadJson as FiscalInvoiceRequestInput;
    const fiscalRequest = buildFECAERequest({
      auth: wsaa,
      input: {
        ...fiscalRequestInput,
        ptoVta: reserve.pto_vta,
        cbteTipo: reserve.cbte_tipo,
      },
      cbteNroOverride: reserve.cbte_nro,
    });

    const wsfe = await submitFECAESolicitar({
      environment: job.environment,
      request: fiscalRequest,
    });

    if (wsfe.normalized.outcome === 'approved') {
      await markJobAuthorized({
        invoiceJobId: job.id,
        docTipo: fiscalRequestInput.recipient.docTipo,
        docNro: fiscalRequestInput.recipient.docNro,
        currency: fiscalRequestInput.currency,
        currencyRate: fiscalRequestInput.currencyRate,
        impTotal: fiscalRequestInput.amounts.impTotal,
        impNeto: fiscalRequestInput.amounts.impNeto,
        impIva: fiscalRequestInput.amounts.impIva,
        impTrib: fiscalRequestInput.amounts.impTrib,
        impOpEx: fiscalRequestInput.amounts.impOpEx,
        impTotConc: fiscalRequestInput.amounts.impTotConc,
        cae: wsfe.normalized.cae,
        caeExpiresAt: wsfe.normalized.caeExpiresAt,
        afipObservationsJson: { items: wsfe.normalized.observations },
        afipEventsJson: { items: wsfe.normalized.events },
        rawRequestJson: fiscalRequest as unknown as Record<string, unknown>,
        rawResponseJson: { soapXml: wsfe.rawXml },
        responsePayloadJson: wsfe.normalized.raw,
      });
      return { status: 'authorized' as const };
    }

    if (wsfe.normalized.outcome === 'rejected') {
      await markJobRejected({
        invoiceJobId: job.id,
        lastErrorCode: wsfe.normalized.code ?? 'FISCAL_REJECTED_BY_ARCA',
        lastErrorMessage: wsfe.normalized.message,
        responsePayloadJson: wsfe.normalized.raw,
        afipObservationsJson: { items: wsfe.normalized.observations },
        afipEventsJson: { items: wsfe.normalized.events },
      });
      return { status: 'rejected' as const };
    }

    if (wsfe.normalized.outcome === 'pending_reconcile') {
      await markJobPendingReconcile({
        invoiceJobId: job.id,
        lastErrorCode: wsfe.normalized.reason,
        lastErrorMessage: 'WSFE returned uncertain or malformed response',
        responsePayloadJson: wsfe.normalized.raw,
      });
      return { status: 'pending_reconcile' as const };
    }

    await markJobFailed({
      invoiceJobId: job.id,
      lastErrorCode: wsfe.normalized.error.code,
      lastErrorMessage: wsfe.normalized.error.message,
      responsePayloadJson: {
        error: wsfe.normalized.error,
      },
    });
    return { status: 'failed' as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown WSFE error';
    await markJobPendingReconcile({
      invoiceJobId: job.id,
      lastErrorCode: 'FISCAL_WSFE_REQUEST_FAILED',
      lastErrorMessage: message,
      responsePayloadJson: {
        reason: 'wsfe_request_failed',
      },
    });

    fiscalLogger.warn('fiscal_job_moved_pending_reconcile_wsfe_error', context, {
      message,
    });
    return { status: 'pending_reconcile' as const };
  }
};
