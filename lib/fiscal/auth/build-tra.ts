import { randomInt } from 'node:crypto';

import type { WsaaTra } from '@/lib/fiscal/shared/fiscal-types';

const DEFAULT_GENERATION_SKEW_SECONDS = 60 * 5;
const DEFAULT_EXPIRATION_WINDOW_SECONDS = 60 * 5;

const toIsoWithoutMilliseconds = (date: Date) =>
  date.toISOString().replace(/\.\d{3}Z$/, 'Z');

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export const buildTra = (params: {
  service: string;
  now?: Date;
  uniqueId?: number;
  generationSkewSeconds?: number;
  expirationWindowSeconds?: number;
}): WsaaTra => {
  const now = params.now ?? new Date();
  const generationSkewSeconds =
    params.generationSkewSeconds ?? DEFAULT_GENERATION_SKEW_SECONDS;
  const expirationWindowSeconds =
    params.expirationWindowSeconds ?? DEFAULT_EXPIRATION_WINDOW_SECONDS;
  const uniqueId =
    params.uniqueId ?? Math.floor(now.getTime() / 1000) + randomInt(0, 1000);
  const generationTime = new Date(
    now.getTime() - generationSkewSeconds * 1000,
  );
  const expirationTime = new Date(
    now.getTime() + expirationWindowSeconds * 1000,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${toIsoWithoutMilliseconds(generationTime)}</generationTime>
    <expirationTime>${toIsoWithoutMilliseconds(expirationTime)}</expirationTime>
  </header>
  <service>${escapeXml(params.service)}</service>
</loginTicketRequest>`;

  return {
    uniqueId,
    generationTime: toIsoWithoutMilliseconds(generationTime),
    expirationTime: toIsoWithoutMilliseconds(expirationTime),
    service: params.service,
    xml,
  };
};
