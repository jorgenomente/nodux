import { mapAfipErrorToFiscalClassification } from '@/lib/fiscal/wsfe/map-afip-errors';
import type { FiscalNormalizedResult } from '@/lib/fiscal/shared/fiscal-types';

const extractTagValue = (xml: string, tagName: string) => {
  const match = xml.match(
    new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i'),
  );
  return match?.[1]?.trim() ?? null;
};

const extractRepeatingValues = (xml: string, tagName: string) => {
  return [
    ...xml.matchAll(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'gi')),
  ].map((match) => match[1]?.trim());
};

export const normalizeWsfeResponse = (
  soapXml: string,
): FiscalNormalizedResult => {
  const resultado = extractTagValue(soapXml, 'Resultado');
  const cae = extractTagValue(soapXml, 'CAE');
  const caeFchVto = extractTagValue(soapXml, 'CAEFchVto');
  const errores = extractRepeatingValues(soapXml, 'Err');
  const observaciones = extractRepeatingValues(soapXml, 'Obs');
  const eventos = extractRepeatingValues(soapXml, 'Evt');

  if (resultado === 'A' && cae && caeFchVto) {
    return {
      outcome: 'approved',
      cae,
      caeExpiresAt: caeFchVto,
      result: resultado,
      observations: observaciones,
      events: eventos,
      raw: { soapXml },
    };
  }

  if (resultado === 'R' || errores.length > 0) {
    const error = mapAfipErrorToFiscalClassification({
      message: errores[0] || 'AFIP / ARCA rechazó formalmente el comprobante',
      details: {
        observaciones,
        eventos,
      },
    });

    return {
      outcome: 'rejected',
      code: error.code,
      message: error.message,
      observations: observaciones,
      events: eventos,
      raw: { soapXml },
    };
  }

  return {
    outcome: 'pending_reconcile',
    reason: 'FISCAL_WSFE_MALFORMED_RESPONSE',
    raw: { soapXml },
  };
};
