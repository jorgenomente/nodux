import { loadEnvConfig } from '@next/env';
import { getFiscalEncryptionConfig } from '@/lib/fiscal/auth/get-encryption-config';
import type { FiscalExecutionMode } from '@/lib/fiscal/shared/fiscal-types';
import { runFiscalWorkerOnce } from '@/lib/fiscal/worker/run-worker';

loadEnvConfig(process.cwd());

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(
    `Invalid boolean env value "${value}" for fiscal worker. Use true/false.`,
  );
};

const parseBatchSizeEnv = (value: string | undefined) => {
  if (!value) {
    return 20;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid FISCAL_BATCH_SIZE="${value}". Use a positive integer.`,
    );
  }

  return parsed;
};

const parseExecutionModeEnv = (
  value: string | undefined,
): FiscalExecutionMode => {
  if (!value) {
    return 'live';
  }

  if (value === 'live' || value === 'prod-safe') {
    return value;
  }

  throw new Error(
    `Invalid FISCAL_EXECUTION_MODE="${value}". Use "live" or "prod-safe".`,
  );
};

const main = async () => {
  const executionMode = parseExecutionModeEnv(
    process.env.FISCAL_EXECUTION_MODE,
  );
  const dryRun = parseBooleanEnv(process.env.FISCAL_DRY_RUN, true);
  const batchSize = parseBatchSizeEnv(process.env.FISCAL_BATCH_SIZE);
  const encryption = getFiscalEncryptionConfig();

  const startedAt = new Date().toISOString();
  console.log(
    JSON.stringify(
      {
        event: 'fiscal_worker_start',
        startedAt,
        executionMode,
        dryRun,
        batchSize,
        encryptionSource: encryption.source,
        encryptionKeyReference: encryption.keyReference,
        encryptionFilePath:
          encryption.source === 'dev-file' ? encryption.filePath : undefined,
      },
      null,
      2,
    ),
  );

  const result = await runFiscalWorkerOnce({
    batchSize,
    dryRun,
    executionMode,
  });

  console.log(
    JSON.stringify(
      {
        event: 'fiscal_worker_finish',
        finishedAt: new Date().toISOString(),
        executionMode,
        dryRun,
        batchSize,
        ...result,
      },
      null,
      2,
    ),
  );
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        event: 'fiscal_worker_error',
        message,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
