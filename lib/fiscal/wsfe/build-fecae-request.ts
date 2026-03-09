import type {
  FiscalInvoiceRequestInput,
  WsaaContext,
  WsfeFeCAERequest,
} from '@/lib/fiscal/shared/fiscal-types';

const assertPositiveNumber = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `FISCAL_REQUEST_INVALID_INTERNAL_CONTRACT: ${field} must be > 0`,
    );
  }
};

const assertNonNegativeNumber = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `FISCAL_REQUEST_INVALID_INTERNAL_CONTRACT: ${field} must be >= 0`,
    );
  }
};

const normalizeDate = (value: string) => {
  const compact = value.replaceAll('-', '').trim();
  if (!/^\d{8}$/.test(compact)) {
    throw new Error(
      'FISCAL_REQUEST_INVALID_INTERNAL_CONTRACT: cbteFch must be YYYYMMDD or YYYY-MM-DD',
    );
  }
  return compact;
};

export const buildFECAERequest = (params: {
  auth: WsaaContext;
  input: FiscalInvoiceRequestInput;
  cbteNroOverride?: number;
}): WsfeFeCAERequest => {
  const { auth, input } = params;
  const cbteNro = params.cbteNroOverride ?? input.cbteNro;

  assertPositiveNumber(input.ptoVta, 'ptoVta');
  assertPositiveNumber(input.cbteTipo, 'cbteTipo');
  assertPositiveNumber(Number(cbteNro), 'cbteNro');
  assertPositiveNumber(input.recipient.docTipo, 'recipient.docTipo');
  if (!Number.isFinite(input.recipient.docNro) || input.recipient.docNro < 0) {
    throw new Error(
      'FISCAL_REQUEST_INVALID_INTERNAL_CONTRACT: recipient.docNro must be >= 0',
    );
  }

  assertPositiveNumber(input.currencyRate, 'currencyRate');
  assertNonNegativeNumber(input.amounts.impTotal, 'amounts.impTotal');
  assertNonNegativeNumber(input.amounts.impNeto, 'amounts.impNeto');
  assertNonNegativeNumber(input.amounts.impIva, 'amounts.impIva');
  assertNonNegativeNumber(input.amounts.impTrib, 'amounts.impTrib');
  assertNonNegativeNumber(input.amounts.impOpEx, 'amounts.impOpEx');
  assertNonNegativeNumber(input.amounts.impTotConc, 'amounts.impTotConc');

  return {
    auth: {
      token: auth.token,
      sign: auth.sign,
      cuit: Number(auth.cuit),
    },
    feCabReq: {
      cantReg: 1,
      ptoVta: input.ptoVta,
      cbteTipo: input.cbteTipo,
    },
    feDetReq: {
      concepto: input.concept ?? 1,
      docTipo: input.recipient.docTipo,
      docNro: input.recipient.docNro,
      cbteDesde: Number(cbteNro),
      cbteHasta: Number(cbteNro),
      cbteFch: normalizeDate(input.cbteFch),
      impTotal: input.amounts.impTotal,
      impTotConc: input.amounts.impTotConc,
      impNeto: input.amounts.impNeto,
      impOpEx: input.amounts.impOpEx,
      impTrib: input.amounts.impTrib,
      impIVA: input.amounts.impIva,
      monId: input.currency,
      monCotiz: input.currencyRate,
      ivaItems: input.ivaItems,
      tributes: input.tributes,
    },
  };
};
