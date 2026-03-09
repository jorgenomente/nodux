import type { FiscalExecutionMode } from '@/lib/fiscal/shared/fiscal-types';
import { pollPendingJobs } from '@/lib/fiscal/worker/poll-pending-jobs';
import { pollReconcileJobs } from '@/lib/fiscal/worker/poll-reconcile-jobs';
import { processInvoiceJob } from '@/lib/fiscal/worker/process-invoice-job';
import { processReconcileJob } from '@/lib/fiscal/worker/process-reconcile-job';

export type FiscalWorkerRunResult = {
  pendingProcessed: number;
  reconcileProcessed: number;
};

export const runFiscalWorkerOnce = async (options?: {
  batchSize?: number;
  dryRun?: boolean;
  executionMode?: FiscalExecutionMode;
}) => {
  const batchSize = options?.batchSize ?? 20;
  const dryRun = options?.dryRun ?? true;
  const executionMode = options?.executionMode ?? 'live';

  const pendingJobs = await pollPendingJobs(batchSize);
  for (const job of pendingJobs) {
    await processInvoiceJob(job, { dryRun, executionMode });
  }

  const reconcileJobs = await pollReconcileJobs(batchSize);
  for (const job of reconcileJobs) {
    await processReconcileJob(job, { dryRun });
  }

  return {
    pendingProcessed: pendingJobs.length,
    reconcileProcessed: reconcileJobs.length,
  } satisfies FiscalWorkerRunResult;
};
