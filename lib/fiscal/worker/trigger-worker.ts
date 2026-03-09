import type { FiscalExecutionMode } from '@/lib/fiscal/shared/fiscal-types';

const DEFAULT_BATCH_SIZE = 5;

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export const triggerFiscalWorker = async ({
  baseUrl,
  executionMode = 'live',
  batchSize = DEFAULT_BATCH_SIZE,
}: {
  baseUrl: string;
  executionMode?: FiscalExecutionMode;
  batchSize?: number;
}) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return {
      ok: false as const,
      error: 'Missing CRON_SECRET for fiscal worker trigger',
    };
  }

  const targetUrl = new URL(
    '/api/internal/fiscal/worker',
    normalizeBaseUrl(baseUrl),
  );
  targetUrl.searchParams.set('mode', executionMode);
  targetUrl.searchParams.set('batch_size', String(Math.max(1, batchSize)));

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      return {
        ok: false as const,
        error: payload?.error || `Fiscal worker trigger failed (${response.status})`,
      };
    }

    return {
      ok: true as const,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Fiscal worker trigger failed',
    };
  }
};
