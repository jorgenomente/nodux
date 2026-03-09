type FiscalQrPayloadInput = {
  taxpayerCuit: number;
  cbteFch: string;
  ptoVta: number;
  cbteTipo: number;
  cbteNro: number;
  impTotal: number;
  currency: string;
  currencyRate: number;
  docTipo: number;
  docNro: number;
  cae: string;
};

const toIsoDate = (value: string) => {
  const normalized = value.replaceAll('-', '');
  if (!/^\d{8}$/.test(normalized)) {
    throw new Error(`Invalid fiscal date for QR payload: ${value}`);
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
};

export const buildFiscalQrPayload = (input: FiscalQrPayloadInput) => ({
  ver: 1,
  fecha: toIsoDate(input.cbteFch),
  cuit: input.taxpayerCuit,
  ptoVta: input.ptoVta,
  tipoCmp: input.cbteTipo,
  nroCmp: input.cbteNro,
  importe: Number(input.impTotal.toFixed(2)),
  moneda: input.currency,
  ctz: Number(input.currencyRate),
  tipoDocRec: input.docTipo,
  nroDocRec: input.docNro,
  tipoCodAut: 'E',
  codAut: Number(input.cae),
});
