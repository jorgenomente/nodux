import type {
  LocalAgentHealth,
  LocalAgentPrintPayload,
  PrintableTicketSnapshot,
} from '@/lib/printing/contracts';

export type LocalPrintMode = 'browser' | 'local_agent';

export type LocalPrintSettings = {
  mode: LocalPrintMode;
  agentUrl: string;
  printerTarget: string;
  cut: boolean;
  cashDrawer: boolean;
  copies: number;
};

const STORAGE_KEY = 'nodux.local-print-settings.v1';
const DEFAULT_AGENT_URL = 'http://127.0.0.1:4891';

export const DEFAULT_LOCAL_PRINT_SETTINGS: LocalPrintSettings = {
  mode: 'browser',
  agentUrl: DEFAULT_AGENT_URL,
  printerTarget: 'cashier-front',
  cut: true,
  cashDrawer: false,
  copies: 1,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_AGENT_URL;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

export const readLocalPrintSettings = (): LocalPrintSettings => {
  if (typeof window === 'undefined') return DEFAULT_LOCAL_PRINT_SETTINGS;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_LOCAL_PRINT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return DEFAULT_LOCAL_PRINT_SETTINGS;

    return {
      mode: parsed.mode === 'local_agent' ? 'local_agent' : 'browser',
      agentUrl: normalizeUrl(String(parsed.agentUrl ?? DEFAULT_AGENT_URL)),
      printerTarget:
        String(
          parsed.printerTarget ?? DEFAULT_LOCAL_PRINT_SETTINGS.printerTarget,
        ).trim() || DEFAULT_LOCAL_PRINT_SETTINGS.printerTarget,
      cut: parsed.cut !== false,
      cashDrawer: parsed.cashDrawer === true,
      copies: Math.min(Math.max(Number(parsed.copies ?? 1) || 1, 1), 3),
    };
  } catch {
    return DEFAULT_LOCAL_PRINT_SETTINGS;
  }
};

export const writeLocalPrintSettings = (settings: LocalPrintSettings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...settings,
      agentUrl: normalizeUrl(settings.agentUrl),
    }),
  );
};

const splitMultiline = (value?: string | null) =>
  String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const buildLocalAgentPayload = (
  ticket: PrintableTicketSnapshot,
  settings: LocalPrintSettings,
): LocalAgentPrintPayload => {
  const paperWidthMm = Number(ticket.printConfig?.paperWidthMm);
  const resolvedPaperWidthMm = Number.isFinite(paperWidthMm)
    ? Math.min(Math.max(paperWidthMm, 48), 80)
    : 80;
  const createdAt = new Date(ticket.createdAtIso);
  const resolvedCreatedAt = Number.isNaN(createdAt.getTime())
    ? ticket.createdAtIso
    : createdAt.toLocaleString('es-AR', { hour12: false });

  return {
    jobId: `sale-ticket-${ticket.saleId ?? Date.now()}`,
    documentType: 'sale_ticket',
    printerTarget: settings.printerTarget,
    paperWidthMm: resolvedPaperWidthMm,
    locale: 'es-AR',
    currency: 'ARS',
    copies: settings.copies,
    cut: settings.cut,
    cashDrawer: settings.cashDrawer,
    headerLines: ['NODUX', ...splitMultiline(ticket.ticketHeaderText)],
    metaLines: [
      `Sucursal: ${ticket.branchName}`,
      `Fecha: ${resolvedCreatedAt}`,
      `Estado fiscal: ${ticket.isInvoiced ? 'Facturada' : 'No facturada'}`,
      ...(ticket.saleId ? [`Venta: ${ticket.saleId.slice(0, 8)}`] : []),
      ...splitMultiline(ticket.fiscalTicketNoteText),
    ],
    items: ticket.items.map((item) => ({
      name: item.name,
      qty: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
    totals: {
      subtotal: ticket.subtotal,
      discount: ticket.discount,
      total: ticket.total,
    },
    footerLines: splitMultiline(ticket.ticketFooterText),
  };
};

export const checkLocalPrintAgent = async (
  agentUrl: string,
): Promise<LocalAgentHealth> => {
  const response = await fetch(`${normalizeUrl(agentUrl)}/health`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`health_${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!isRecord(payload)) return { ok: false };

  return {
    ok: payload.ok === true,
    agentVersion:
      typeof payload.agentVersion === 'string' ? payload.agentVersion : null,
  };
};

export const printViaLocalAgent = async (
  ticket: PrintableTicketSnapshot,
  settings: LocalPrintSettings,
) => {
  const response = await fetch(`${normalizeUrl(settings.agentUrl)}/print`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payload: buildLocalAgentPayload(ticket, settings),
    }),
  });

  if (!response.ok) {
    throw new Error(`print_${response.status}`);
  }

  return response.json();
};
