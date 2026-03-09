import { request as httpsRequest } from 'node:https';

import { getAfipHttpsAgent } from '@/lib/fiscal/shared/afip-https-agent';
import type {
  FiscalNormalizedResult,
  WsfeAuth,
  WsfeFeCAERequest,
} from '@/lib/fiscal/shared/fiscal-types';
import { normalizeWsfeResponse } from '@/lib/fiscal/wsfe/normalize-wsfe-response';

const DEFAULT_WSFE_TIMEOUT_MS = 10000;

const WSFE_ENDPOINTS = {
  homo: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  prod: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
} as const;

const renderIvaItems = (items?: WsfeFeCAERequest['feDetReq']['ivaItems']) => {
  if (!items?.length) return '';
  return `<Iva>${items
    .map(
      (item) => `<AlicIva><Id>${item.id}</Id><BaseImp>${item.baseImp}</BaseImp><Importe>${item.importe}</Importe></AlicIva>`,
    )
    .join('')}</Iva>`;
};

const renderTributes = (items?: WsfeFeCAERequest['feDetReq']['tributes']) => {
  if (!items?.length) return '';
  return `<Tributos>${items
    .map(
      (item) =>
        `<Tributo><Id>${item.id}</Id><Desc>${item.desc ?? ''}</Desc><BaseImp>${item.baseImp}</BaseImp><Alic>${item.alic}</Alic><Importe>${item.importe}</Importe></Tributo>`,
    )
    .join('')}</Tributos>`;
};

const buildFeCAEEnvelope = (request: WsfeFeCAERequest) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${request.auth.token}</Token>
        <Sign>${request.auth.sign}</Sign>
        <Cuit>${request.auth.cuit}</Cuit>
      </Auth>
      <FeCAEReq>
        <FeCabReq>
          <CantReg>${request.feCabReq.cantReg}</CantReg>
          <PtoVta>${request.feCabReq.ptoVta}</PtoVta>
          <CbteTipo>${request.feCabReq.cbteTipo}</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>${request.feDetReq.concepto}</Concepto>
            <DocTipo>${request.feDetReq.docTipo}</DocTipo>
            <DocNro>${request.feDetReq.docNro}</DocNro>
            <CbteDesde>${request.feDetReq.cbteDesde}</CbteDesde>
            <CbteHasta>${request.feDetReq.cbteHasta}</CbteHasta>
            <CbteFch>${request.feDetReq.cbteFch}</CbteFch>
            <ImpTotal>${request.feDetReq.impTotal}</ImpTotal>
            <ImpTotConc>${request.feDetReq.impTotConc}</ImpTotConc>
            <ImpNeto>${request.feDetReq.impNeto}</ImpNeto>
            <ImpOpEx>${request.feDetReq.impOpEx}</ImpOpEx>
            <ImpTrib>${request.feDetReq.impTrib}</ImpTrib>
            <ImpIVA>${request.feDetReq.impIVA}</ImpIVA>
            <MonId>${request.feDetReq.monId}</MonId>
            <MonCotiz>${request.feDetReq.monCotiz}</MonCotiz>
            ${renderIvaItems(request.feDetReq.ivaItems)}
            ${renderTributes(request.feDetReq.tributes)}
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>
    </FECAESolicitar>
  </soap:Body>
</soap:Envelope>`;

const buildFEDummyEnvelope = () => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <FEDummy xmlns="http://ar.gov.afip.dif.FEV1/" />
  </soap:Body>
</soap:Envelope>`;

const buildFECompUltimoAutorizadoEnvelope = (params: {
  auth: WsfeAuth;
  ptoVta: number;
  cbteTipo: number;
}) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <FECompUltimoAutorizado xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${params.auth.token}</Token>
        <Sign>${params.auth.sign}</Sign>
        <Cuit>${params.auth.cuit}</Cuit>
      </Auth>
      <PtoVta>${params.ptoVta}</PtoVta>
      <CbteTipo>${params.cbteTipo}</CbteTipo>
    </FECompUltimoAutorizado>
  </soap:Body>
</soap:Envelope>`;

const extractTagValue = (xml: string, tagName: string) => {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match?.[1]?.trim() ?? null;
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
              new Error(
                `WSFE FECompUltimoAutorizado HTTP ${statusCode}: ${rawXml.slice(0, 400)}`,
              ),
            );
            return;
          }
          resolve(rawXml);
        });
      },
    );

    req.setTimeout(params.timeoutMs, () => {
      req.destroy(new Error('WSFE FECompUltimoAutorizado timeout'));
    });
    req.on('error', (error) => reject(error));
    req.write(params.body);
    req.end();
  });

export const submitFECAESolicitar = async (params: {
  environment: 'homo' | 'prod';
  request: WsfeFeCAERequest;
  timeoutMs?: number;
}): Promise<{ normalized: FiscalNormalizedResult; rawXml: string }> => {
  const timeoutMs =
    params.timeoutMs ?? Number(process.env.FISCAL_WSFE_TIMEOUT_MS || DEFAULT_WSFE_TIMEOUT_MS);
  const endpoint = WSFE_ENDPOINTS[params.environment];

  const rawXml = await postSoapXmlOverHttps({
    endpoint,
    soapAction: '"http://ar.gov.afip.dif.FEV1/FECAESolicitar"',
    body: buildFeCAEEnvelope(params.request),
    timeoutMs,
  });

  return {
    normalized: normalizeWsfeResponse(rawXml),
    rawXml,
  };
};

export const submitFEDummy = async (params: {
  environment: 'homo' | 'prod';
  timeoutMs?: number;
}) => {
  const timeoutMs =
    params.timeoutMs ??
    Number(process.env.FISCAL_WSFE_TIMEOUT_MS || DEFAULT_WSFE_TIMEOUT_MS);
  const endpoint = WSFE_ENDPOINTS[params.environment];

  const rawXml = await postSoapXmlOverHttps({
    endpoint,
    soapAction: '"http://ar.gov.afip.dif.FEV1/FEDummy"',
    body: buildFEDummyEnvelope(),
    timeoutMs,
  });

  return {
    rawXml,
    appServer: extractTagValue(rawXml, 'AppServer'),
    dbServer: extractTagValue(rawXml, 'DbServer'),
    authServer: extractTagValue(rawXml, 'AuthServer'),
  };
};

export const submitFECompUltimoAutorizado = async (params: {
  environment: 'homo' | 'prod';
  auth: WsfeAuth;
  ptoVta: number;
  cbteTipo: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}) => {
  const timeoutMs =
    params.timeoutMs ??
    Number(process.env.FISCAL_WSFE_TIMEOUT_MS || DEFAULT_WSFE_TIMEOUT_MS);
  const endpoint = WSFE_ENDPOINTS[params.environment];
  const rawXml = await postSoapXmlOverHttps({
    endpoint,
    soapAction: '"http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado"',
    body: buildFECompUltimoAutorizadoEnvelope({
      auth: params.auth,
      ptoVta: params.ptoVta,
      cbteTipo: params.cbteTipo,
    }),
    timeoutMs,
  });

  const cbteNroRaw = extractTagValue(rawXml, 'CbteNro') ?? '0';
  const lastAuthorized = Number.parseInt(cbteNroRaw, 10);
  if (!Number.isFinite(lastAuthorized) || lastAuthorized < 0) {
    throw new Error(
      `WSFE FECompUltimoAutorizado returned invalid CbteNro: ${cbteNroRaw}`,
    );
  }

  return {
    rawXml,
    lastAuthorized,
  };
};
