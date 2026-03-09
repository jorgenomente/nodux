import type {
  FiscalEnvironment,
  WsaaCacheEntry,
  WsaaContext,
} from '@/lib/fiscal/shared/fiscal-types';

type WsaaCacheKeyParams = {
  tenantId: string;
  environment: FiscalEnvironment;
  taxpayerCuit: string;
  serviceName: string;
};

const wsaaTicketCache = new Map<string, WsaaCacheEntry>();

const toCacheKey = (params: WsaaCacheKeyParams) =>
  [
    params.tenantId,
    params.environment,
    params.taxpayerCuit,
    params.serviceName,
  ].join(':');

const isExpired = (expiresAt: string, renewBeforeSeconds: number) => {
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return true;
  }

  return expiresAtMs - renewBeforeSeconds * 1000 <= Date.now();
};

export const getCachedWsaaTicket = (
  params: WsaaCacheKeyParams & { renewBeforeSeconds?: number },
): WsaaContext | null => {
  const renewBeforeSeconds = params.renewBeforeSeconds ?? 60 * 5;
  const entry = wsaaTicketCache.get(toCacheKey(params));
  if (!entry) {
    return null;
  }

  if (isExpired(entry.expiresAt, renewBeforeSeconds)) {
    wsaaTicketCache.delete(toCacheKey(params));
    return null;
  }

  return {
    token: entry.token,
    sign: entry.sign,
    cuit: entry.cuit,
    expiresAt: entry.expiresAt,
  };
};

export const setCachedWsaaTicket = (
  params: WsaaCacheKeyParams & { ticket: WsaaContext; obtainedAt?: string },
) => {
  wsaaTicketCache.set(toCacheKey(params), {
    ...params.ticket,
    obtainedAt: params.obtainedAt ?? new Date().toISOString(),
  });
};

export const invalidateCachedWsaaTicket = (params: WsaaCacheKeyParams) => {
  wsaaTicketCache.delete(toCacheKey(params));
};
