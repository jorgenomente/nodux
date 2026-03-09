import { Agent } from 'node:https';

const LEGACY_AFIP_HOSTS = new Set([
  'wsaa.afip.gov.ar',
  'wsaahomo.afip.gov.ar',
  'servicios1.afip.gov.ar',
  'wswhomo.afip.gov.ar',
]);

let legacyAfipAgent: Agent | null = null;

export const getAfipHttpsAgent = (hostname: string) => {
  if (!LEGACY_AFIP_HOSTS.has(hostname)) {
    return undefined;
  }

  if (!legacyAfipAgent) {
    legacyAfipAgent = new Agent({
      ciphers: 'DEFAULT@SECLEVEL=1',
    });
  }

  return legacyAfipAgent;
};
