import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { fiscalLogger } from '@/lib/fiscal/shared/fiscal-logger';
import type {
  WsaaContext,
  WsaaTra,
  FiscalWorkerContext,
} from '@/lib/fiscal/shared/fiscal-types';
import type { FiscalCredentialsRow } from '@/lib/fiscal/rpc/types';
import { getFiscalAdminClient } from '@/lib/fiscal/rpc/client';
import { buildTra } from '@/lib/fiscal/auth/build-tra';
import {
  getCachedWsaaTicket,
  setCachedWsaaTicket,
} from '@/lib/fiscal/auth/wsaa-cache';
import { signTra, type WsaaSignerAdapter } from '@/lib/fiscal/auth/sign-tra';

const execFileAsync = promisify(execFile);

const DEFAULT_WSAA_TIMEOUT_MS = 10000;
const DEFAULT_RENEW_BEFORE_SECONDS = 60 * 5;

const WSAA_ENDPOINTS = {
  homo: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  prod: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
} as const;

const SOAP_ACTION = '""';

const toWorkerContext = (context?: FiscalWorkerContext): FiscalWorkerContext =>
  context ?? {
    invoiceJobId: 'system',
    tenantId: 'system',
    environment: 'homo',
    ptoVta: 0,
    cbteTipo: 0,
    cbteNro: null,
    correlationId: 'system',
  };

const decodeXmlEntities = (value: string) =>
  value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');

const extractTagValue = (xml: string, tagName: string) => {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match?.[1]?.trim() ?? null;
};

const buildLoginCmsEnvelope = (cmsBase64: string) => `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header />
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

const parseLoginCmsResponse = (soapXml: string, taxpayerCuit: string): WsaaContext => {
  const encodedTicket = extractTagValue(soapXml, 'loginCmsReturn');
  if (!encodedTicket) {
    throw new Error('WSAA response does not contain loginCmsReturn');
  }

  const ticketXml = decodeXmlEntities(encodedTicket);
  const token = extractTagValue(ticketXml, 'token');
  const sign = extractTagValue(ticketXml, 'sign');
  const expiresAt = extractTagValue(ticketXml, 'expirationTime');

  if (!token || !sign || !expiresAt) {
    throw new Error('WSAA ticket is missing token, sign or expirationTime');
  }

  return {
    token,
    sign,
    cuit: taxpayerCuit,
    expiresAt,
  };
};

const buildAbortSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
};

class OpenSslCmsSigner implements WsaaSignerAdapter {
  async signCmsBase64(input: {
    traXml: string;
    certificatePem: string;
    privateKeyPem: string;
    passphrase?: string;
  }): Promise<string> {
    const tempDir = await mkdtemp(join(tmpdir(), 'nodux-wsaa-'));
    const traPath = join(tempDir, 'tra.xml');
    const certPath = join(tempDir, 'certificate.pem');
    const keyPath = join(tempDir, 'private-key.pem');
    const outPath = join(tempDir, 'signed.cms');

    try {
      await writeFile(traPath, input.traXml, 'utf8');
      await writeFile(certPath, input.certificatePem, 'utf8');
      await writeFile(keyPath, input.privateKeyPem, 'utf8');

      const args = [
        'cms',
        '-sign',
        '-in',
        traPath,
        '-signer',
        certPath,
        '-inkey',
        keyPath,
        '-out',
        outPath,
        '-outform',
        'DER',
        '-nodetach',
        '-binary',
      ];

      if (input.passphrase) {
        args.push('-passin', `pass:${input.passphrase}`);
      }

      await execFileAsync('openssl', args);
      const { stdout } = await execFileAsync('openssl', [
        'base64',
        '-A',
        '-in',
        outPath,
      ]);

      return stdout.trim();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

const persistWsaaTicketMetadata = async (params: {
  credentialId: string;
  expiresAt: string;
}) => {
  const supabase = getFiscalAdminClient();
  const { error } = await supabase
    .from('fiscal_credentials' as never)
    .update({
      last_ta_obtained_at: new Date().toISOString(),
      ta_expires_at: params.expiresAt,
    } as never)
    .eq('id', params.credentialId);

  if (error) {
    throw new Error(`persistWsaaTicketMetadata failed: ${error.message}`);
  }
};

export const getOrRefreshWsaaTicket = async (params: {
  credentials: FiscalCredentialsRow;
  privateKeyPem: string;
  passphrase?: string;
  context?: FiscalWorkerContext;
  signer?: WsaaSignerAdapter;
  timeoutMs?: number;
  renewBeforeSeconds?: number;
  fetchFn?: typeof fetch;
}): Promise<WsaaContext> => {
  const renewBeforeSeconds =
    params.renewBeforeSeconds ?? DEFAULT_RENEW_BEFORE_SECONDS;
  const cached = getCachedWsaaTicket({
    tenantId: params.credentials.tenant_id,
    environment: params.credentials.environment,
    taxpayerCuit: params.credentials.taxpayer_cuit,
    serviceName: params.credentials.wsaa_service_name,
    renewBeforeSeconds,
  });

  if (cached) {
    fiscalLogger.info('wsaa_token_loaded', toWorkerContext(params.context), {
      credentialId: params.credentials.id,
      expiresAt: cached.expiresAt,
      source: 'memory_cache',
    });
    return cached;
  }

  const timeoutMs =
    params.timeoutMs ?? Number(process.env.FISCAL_WSAA_TIMEOUT_MS || DEFAULT_WSAA_TIMEOUT_MS);
  const fetchFn = params.fetchFn ?? fetch;
  const signer = params.signer ?? new OpenSslCmsSigner();
  const tra: WsaaTra = buildTra({
    service: params.credentials.wsaa_service_name,
  });
  const signed = await signTra({
    tra,
    certificatePem: params.credentials.certificate_pem,
    privateKeyPem: params.privateKeyPem,
    passphrase: params.passphrase,
    signer,
  });

  const endpoint = WSAA_ENDPOINTS[params.credentials.environment];
  const abort = buildAbortSignal(timeoutMs);

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'text/xml; charset=utf-8',
        SOAPAction: SOAP_ACTION,
      },
      body: buildLoginCmsEnvelope(signed.cmsBase64),
      signal: abort.signal,
    });

    const soapXml = await response.text();
    if (!response.ok) {
      throw new Error(`WSAA HTTP ${response.status}: ${soapXml.slice(0, 400)}`);
    }

    const ticket = parseLoginCmsResponse(
      soapXml,
      params.credentials.taxpayer_cuit,
    );

    setCachedWsaaTicket({
      tenantId: params.credentials.tenant_id,
      environment: params.credentials.environment,
      taxpayerCuit: params.credentials.taxpayer_cuit,
      serviceName: params.credentials.wsaa_service_name,
      ticket,
    });

    await persistWsaaTicketMetadata({
      credentialId: params.credentials.id,
      expiresAt: ticket.expiresAt,
    });

    fiscalLogger.info('wsaa_token_renewed', toWorkerContext(params.context), {
      credentialId: params.credentials.id,
      expiresAt: ticket.expiresAt,
      endpoint,
    });

    return ticket;
  } finally {
    abort.clear();
  }
};
