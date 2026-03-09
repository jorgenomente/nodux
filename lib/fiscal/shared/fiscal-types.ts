export type FiscalEnvironment = 'homo' | 'prod';

export type FiscalExecutionMode = 'live' | 'prod-safe';

export type FiscalJobStatus =
  | 'pending'
  | 'reserved'
  | 'authorizing'
  | 'authorized'
  | 'rejected'
  | 'pending_reconcile'
  | 'render_pending'
  | 'completed'
  | 'failed';

export type FiscalErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type FiscalErrorTransition =
  | 'rejected'
  | 'pending_reconcile'
  | 'failed'
  | 'render_pending'
  | 'none';

export type FiscalErrorClassification = {
  code: string;
  category: string;
  severity: FiscalErrorSeverity;
  retryable: boolean;
  reconcileRequired: boolean;
  jobTransition: FiscalErrorTransition;
  message: string;
  details?: Record<string, unknown>;
};

export type FiscalApprovedResult = {
  outcome: 'approved';
  cae: string;
  caeExpiresAt: string;
  result: string;
  observations: unknown[];
  events: unknown[];
  raw: Record<string, unknown>;
};

export type FiscalRejectedResult = {
  outcome: 'rejected';
  code?: string;
  message?: string;
  observations: unknown[];
  events: unknown[];
  raw: Record<string, unknown>;
};

export type FiscalPendingReconcileResult = {
  outcome: 'pending_reconcile';
  reason: string;
  raw?: Record<string, unknown>;
};

export type FiscalTechnicalErrorResult = {
  outcome: 'technical_error';
  error: FiscalErrorClassification;
};

export type FiscalNormalizedResult =
  | FiscalApprovedResult
  | FiscalRejectedResult
  | FiscalPendingReconcileResult
  | FiscalTechnicalErrorResult;

export type WsaaContext = {
  token: string;
  sign: string;
  cuit: string;
  expiresAt: string;
};

export type WsaaTra = {
  uniqueId: number;
  generationTime: string;
  expirationTime: string;
  service: string;
  xml: string;
};

export type WsaaSignedCms = {
  cmsBase64: string;
  certificatePem: string;
};

export type WsaaCacheEntry = WsaaContext & {
  obtainedAt: string;
};

export type FiscalDocumentRecipient = {
  docTipo: number;
  docNro: number;
};

export type FiscalInvoiceAmounts = {
  impTotal: number;
  impNeto: number;
  impIva: number;
  impTrib: number;
  impOpEx: number;
  impTotConc: number;
};

export type FiscalVatItem = {
  id: number;
  baseImp: number;
  importe: number;
};

export type FiscalTributeItem = {
  id: number;
  desc?: string;
  baseImp: number;
  alic: number;
  importe: number;
};

export type FiscalInvoiceRequestInput = {
  cbteTipo: number;
  ptoVta: number;
  cbteNro?: number | null;
  cbteFch: string;
  concept?: number;
  currency: string;
  currencyRate: number;
  recipient: FiscalDocumentRecipient;
  amounts: FiscalInvoiceAmounts;
  ivaItems?: FiscalVatItem[];
  tributes?: FiscalTributeItem[];
};

export type WsfeAuth = {
  token: string;
  sign: string;
  cuit: number;
};

export type WsfeFeCabReq = {
  cantReg: number;
  ptoVta: number;
  cbteTipo: number;
};

export type WsfeFeDetReq = {
  concepto: number;
  docTipo: number;
  docNro: number;
  cbteDesde: number;
  cbteHasta: number;
  cbteFch: string;
  impTotal: number;
  impTotConc: number;
  impNeto: number;
  impOpEx: number;
  impTrib: number;
  impIVA: number;
  monId: string;
  monCotiz: number;
  ivaItems?: FiscalVatItem[];
  tributes?: FiscalTributeItem[];
};

export type WsfeFeCAERequest = {
  auth: WsfeAuth;
  feCabReq: WsfeFeCabReq;
  feDetReq: WsfeFeDetReq;
};

export type RenderInput = {
  invoiceId: string;
  invoiceJobId: string;
  tenantId: string;
  environment: FiscalEnvironment;
  ptoVta: number;
  cbteTipo: number;
  cbteNro: number;
};

export type RenderOutput = {
  qrPayloadJson: Record<string, unknown>;
  pdfStoragePath: string;
  ticketStoragePath: string;
};

export type ReconcileAuthorized = {
  outcome: 'authorized';
  normalizedResult: Record<string, unknown>;
};

export type ReconcileRejected = {
  outcome: 'rejected';
  normalizedResult: Record<string, unknown>;
};

export type ReconcileStillUnknown = {
  outcome: 'still_unknown';
  reason: string;
};

export type ReconcileManualResolution = {
  outcome: 'manual_resolution';
  reason: string;
};

export type ReconcileResult =
  | ReconcileAuthorized
  | ReconcileRejected
  | ReconcileStillUnknown
  | ReconcileManualResolution;

export type FiscalWorkerContext = {
  invoiceJobId: string;
  tenantId: string;
  environment: FiscalEnvironment;
  ptoVta: number;
  cbteTipo: number;
  cbteNro: number | null;
  correlationId: string;
};
