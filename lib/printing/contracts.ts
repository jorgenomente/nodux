export type PrintableTicketSnapshot = {
  branchName: string;
  ticketHeaderText?: string | null;
  ticketFooterText?: string | null;
  fiscalTicketNoteText?: string | null;
  printConfig?: {
    paperWidthMm?: number | null;
    marginTopMm?: number | null;
    marginRightMm?: number | null;
    marginBottomMm?: number | null;
    marginLeftMm?: number | null;
    fontSizePx?: number | null;
    lineHeight?: number | null;
  };
  createdAtIso: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  isPaid: boolean;
  isInvoiced: boolean;
  saleId?: string;
};

export type LocalPrintPayloadDocumentType = 'sale_ticket';

export type LocalAgentPrintPayload = {
  jobId: string;
  documentType: LocalPrintPayloadDocumentType;
  printerTarget: string;
  paperWidthMm: number;
  locale: 'es-AR';
  currency: 'ARS';
  copies: number;
  cut: boolean;
  cashDrawer: boolean;
  headerLines: string[];
  metaLines: string[];
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    total: number;
  };
  footerLines: string[];
};

export type LocalAgentHealth = {
  ok: boolean;
  agentVersion?: string | null;
};
