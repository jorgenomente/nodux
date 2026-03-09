import { request as httpsRequest } from 'node:https';
import * as forge from 'node-forge';

import { fiscalLogger } from '@/lib/fiscal/shared/fiscal-logger';
import { getAfipHttpsAgent } from '@/lib/fiscal/shared/afip-https-agent';
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

const postSoapXmlOverHttps = async (params: {
  endpoint: string;
  soapAction: string;
  body: string;
  timeoutMs: number;
}) =>
  new Promise<string>((resolve, reject) => {
    const url = new URL(params.endpoint);
    const req = httpsRequest(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        agent: getAfipHttpsAgent(url.hostname),
        headers: {
          'content-type': 'text/xml; charset=utf-8',
          SOAPAction: params.soapAction,
          'content-length': Buffer.byteLength(params.body, 'utf8'),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          const rawXml = Buffer.concat(chunks).toString('utf8');
          const statusCode = res.statusCode ?? 0;
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(`WSAA HTTP ${statusCode}: ${rawXml.slice(0, 400)}`),
            );
            return;
          }
          resolve(rawXml);
        });
      },
    );

    req.setTimeout(params.timeoutMs, () => {
      req.destroy(new Error('WSAA timeout'));
    });
    req.on('error', (error) => reject(error));
    req.write(params.body);
    req.end();
  });

const resolveForgePrivateKey = (privateKeyPem: string, passphrase?: string) => {
  if (!passphrase) {
    return forge.pki.privateKeyFromPem(privateKeyPem);
  }

  const decrypted =
    forge.pki.decryptRsaPrivateKey(privateKeyPem, passphrase) ??
    forge.pki.privateKeyFromPem(privateKeyPem);

  return decrypted;
};

class ForgeCmsSigner implements WsaaSignerAdapter {
  async signCmsBase64(input: {
    traXml: string;
    certificatePem: string;
    privateKeyPem: string;
    passphrase?: string;
  }): Promise<string> {
    const certificate = forge.pki.certificateFromPem(input.certificatePem);
    const privateKey = resolveForgePrivateKey(
      input.privateKeyPem,
      input.passphrase,
    );

    const signedData = forge.pkcs7.createSignedData();
    signedData.content = forge.util.createBuffer(input.traXml, 'utf8');
    signedData.addCertificate(certificate);
    signedData.addSigner({
      key: privateKey,
      certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date() as never,
        },
      ],
    });
    signedData.sign({ detached: false });

    const derBytes = forge.asn1.toDer(signedData.toAsn1()).getBytes();
    return Buffer.from(derBytes, 'binary').toString('base64');
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
  const signer = params.signer ?? new ForgeCmsSigner();
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
  try {
    const soapXml = await postSoapXmlOverHttps({
      endpoint,
      soapAction: SOAP_ACTION,
      body: buildLoginCmsEnvelope(signed.cmsBase64),
      timeoutMs,
    });

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
  } catch (error) {
    fiscalLogger.error('wsaa_request_failed', toWorkerContext(params.context), {
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown WSAA error',
    });
    throw error;
  }
};
