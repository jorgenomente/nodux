import { redactSecrets } from '@/lib/fiscal/shared/redact-secrets';
import type { FiscalWorkerContext } from '@/lib/fiscal/shared/fiscal-types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogPayload = {
  level: LogLevel;
  message: string;
  context: FiscalWorkerContext;
  data?: unknown;
  at: string;
};

const writeLog = (payload: LogPayload) => {
  const line = JSON.stringify({
    ...payload,
    data: redactSecrets(payload.data),
  });

  if (payload.level === 'error') {
    console.error(line);
    return;
  }

  if (payload.level === 'warn') {
    console.warn(line);
    return;
  }

  if (payload.level === 'debug') {
    console.debug(line);
    return;
  }

  console.log(line);
};

const logWithLevel = (
  level: LogLevel,
  message: string,
  context: FiscalWorkerContext,
  data?: unknown,
) => {
  writeLog({
    level,
    message,
    context,
    data,
    at: new Date().toISOString(),
  });
};

export const fiscalLogger = {
  debug: (message: string, context: FiscalWorkerContext, data?: unknown) =>
    logWithLevel('debug', message, context, data),
  info: (message: string, context: FiscalWorkerContext, data?: unknown) =>
    logWithLevel('info', message, context, data),
  warn: (message: string, context: FiscalWorkerContext, data?: unknown) =>
    logWithLevel('warn', message, context, data),
  error: (message: string, context: FiscalWorkerContext, data?: unknown) =>
    logWithLevel('error', message, context, data),
};
