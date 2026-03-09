import { NextRequest, NextResponse } from 'next/server';

import type { FiscalExecutionMode } from '@/lib/fiscal/shared/fiscal-types';
import { runFiscalWorkerOnce } from '@/lib/fiscal/worker/run-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const parseBatchSize = (value: string | null) => {
  if (!value) {
    return 20;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Invalid batch_size. Use a positive integer.');
  }

  return Math.min(parsed, 100);
};

const parseExecutionMode = (value: string | null): FiscalExecutionMode => {
  if (!value) {
    return 'live';
  }

  if (value === 'live' || value === 'prod-safe') {
    return value;
  }

  throw new Error('Invalid mode. Use "live" or "prod-safe".');
};

const assertCronSecret = (request: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    throw new Error('Missing CRON_SECRET for fiscal worker route');
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }

  return true;
};

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const batchSize = parseBatchSize(
      request.nextUrl.searchParams.get('batch_size'),
    );
    const executionMode = parseExecutionMode(
      request.nextUrl.searchParams.get('mode'),
    );

    const result = await runFiscalWorkerOnce({
      batchSize,
      dryRun: false,
      executionMode,
    });

    return NextResponse.json({
      ok: true,
      executionMode,
      batchSize,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Fiscal worker failed';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
