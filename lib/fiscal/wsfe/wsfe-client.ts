import type {
  FiscalNormalizedResult,
  WsfeFeCAERequest,
} from '@/lib/fiscal/shared/fiscal-types';
import { normalizeWsfeResponse } from '@/lib/fiscal/wsfe/normalize-wsfe-response';

const DEFAULT_WSFE_TIMEOUT_MS = 10000;

const WSFE_ENDPOINTS = {
  homo: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  prod: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
} as const;

const buildAbortSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
};

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

const extractTagValue = (xml: string, tagName: string) => {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match?.[1]?.trim() ?? null;
};

export const submitFECAESolicitar = async (params: {
  environment: 'homo' | 'prod';
  request: WsfeFeCAERequest;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}): Promise<{ normalized: FiscalNormalizedResult; rawXml: string }> => {
  const timeoutMs =
    params.timeoutMs ?? Number(process.env.FISCAL_WSFE_TIMEOUT_MS || DEFAULT_WSFE_TIMEOUT_MS);
  const fetchFn = params.fetchFn ?? fetch;
  const abort = buildAbortSignal(timeoutMs);
  const endpoint = WSFE_ENDPOINTS[params.environment];

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://ar.gov.afip.dif.FEV1/FECAESolicitar"',
      },
      body: buildFeCAEEnvelope(params.request),
      signal: abort.signal,
    });

    const rawXml = await response.text();
    if (!response.ok) {
      throw new Error(`WSFE HTTP ${response.status}: ${rawXml.slice(0, 400)}`);
    }

    return {
      normalized: normalizeWsfeResponse(rawXml),
      rawXml,
    };
  } finally {
    abort.clear();
  }
};

export const submitFEDummy = async (params: {
  environment: 'homo' | 'prod';
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}) => {
  const timeoutMs =
    params.timeoutMs ??
    Number(process.env.FISCAL_WSFE_TIMEOUT_MS || DEFAULT_WSFE_TIMEOUT_MS);
  const fetchFn = params.fetchFn ?? fetch;
  const abort = buildAbortSignal(timeoutMs);
  const endpoint = WSFE_ENDPOINTS[params.environment];

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://ar.gov.afip.dif.FEV1/FEDummy"',
      },
      body: buildFEDummyEnvelope(),
      signal: abort.signal,
    });

    const rawXml = await response.text();
    if (!response.ok) {
      throw new Error(`WSFE FEDummy HTTP ${response.status}: ${rawXml.slice(0, 400)}`);
    }

    return {
      rawXml,
      appServer: extractTagValue(rawXml, 'AppServer'),
      dbServer: extractTagValue(rawXml, 'DbServer'),
      authServer: extractTagValue(rawXml, 'AuthServer'),
    };
  } finally {
    abort.clear();
  }
};
