type SaleTicketDocumentItem = {
  sale_item_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type SaleTicketDocumentSale = {
  sale_id: string;
  branch_name: string | null;
  created_at: string;
  created_by_name: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  is_invoiced: boolean;
  client_name?: string | null;
  client_phone?: string | null;
};

type SaleTicketDocumentBranchConfig = {
  ticket_header_text: string | null;
  ticket_footer_text: string | null;
  fiscal_ticket_note_text: string | null;
  ticket_paper_width_mm: number | null;
  ticket_margin_top_mm: number | null;
  ticket_margin_right_mm: number | null;
  ticket_margin_bottom_mm: number | null;
  ticket_margin_left_mm: number | null;
  ticket_font_size_px: number | null;
  ticket_line_height: number | null;
};

export type SaleTicketPrintSettings = {
  paperWidthMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  fontSizePx: number;
  lineHeight: number;
};

const DEFAULT_PRINT_SETTINGS: SaleTicketPrintSettings = {
  paperWidthMm: 80,
  marginTopMm: 2,
  marginRightMm: 2,
  marginBottomMm: 2,
  marginLeftMm: 2,
  fontSizePx: 12,
  lineHeight: 1.35,
};

const sanitizeNumber = (
  value: number | null | undefined,
  range: { min: number; max: number; fallback: number },
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return range.fallback;
  return Math.min(Math.max(parsed, range.min), range.max);
};

export const parseSaleTicketItems = (
  value: unknown,
): SaleTicketDocumentItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const typed = row as Record<string, unknown>;
      return {
        sale_item_id: String(typed.sale_item_id ?? ''),
        product_name: String(typed.product_name ?? ''),
        unit_price: Number(typed.unit_price ?? 0),
        quantity: Number(typed.quantity ?? 0),
        line_total: Number(typed.line_total ?? 0),
      };
    })
    .filter((row): row is SaleTicketDocumentItem => Boolean(row?.sale_item_id));
};

export const resolveSaleTicketPrintSettings = (
  branchConfig: SaleTicketDocumentBranchConfig | null,
): SaleTicketPrintSettings => ({
  paperWidthMm: sanitizeNumber(branchConfig?.ticket_paper_width_mm, {
    min: 48,
    max: 80,
    fallback: DEFAULT_PRINT_SETTINGS.paperWidthMm,
  }),
  marginTopMm: sanitizeNumber(branchConfig?.ticket_margin_top_mm, {
    min: 0,
    max: 20,
    fallback: DEFAULT_PRINT_SETTINGS.marginTopMm,
  }),
  marginRightMm: sanitizeNumber(branchConfig?.ticket_margin_right_mm, {
    min: 0,
    max: 20,
    fallback: DEFAULT_PRINT_SETTINGS.marginRightMm,
  }),
  marginBottomMm: sanitizeNumber(branchConfig?.ticket_margin_bottom_mm, {
    min: 0,
    max: 20,
    fallback: DEFAULT_PRINT_SETTINGS.marginBottomMm,
  }),
  marginLeftMm: sanitizeNumber(branchConfig?.ticket_margin_left_mm, {
    min: 0,
    max: 20,
    fallback: DEFAULT_PRINT_SETTINGS.marginLeftMm,
  }),
  fontSizePx: Math.round(
    sanitizeNumber(branchConfig?.ticket_font_size_px, {
      min: 8,
      max: 24,
      fallback: DEFAULT_PRINT_SETTINGS.fontSizePx,
    }),
  ),
  lineHeight: sanitizeNumber(branchConfig?.ticket_line_height, {
    min: 1,
    max: 2.5,
    fallback: DEFAULT_PRINT_SETTINGS.lineHeight,
  }),
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR', { hour12: false });
};

export function SaleTicketDocument({
  sale,
  items,
  branchConfig,
  printSettings,
  orgDisplayName = 'NODUX',
  heading = 'Ticket de venta (copia no fiscal)',
}: {
  sale: SaleTicketDocumentSale;
  items: SaleTicketDocumentItem[];
  branchConfig: SaleTicketDocumentBranchConfig | null;
  printSettings: SaleTicketPrintSettings;
  orgDisplayName?: string | null;
  heading?: string;
}) {
  const contentWidthMm = Math.max(
    printSettings.paperWidthMm -
      printSettings.marginLeftMm -
      printSettings.marginRightMm,
    30,
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${printSettings.paperWidthMm}mm auto;
            margin: ${printSettings.marginTopMm}mm ${printSettings.marginRightMm}mm ${printSettings.marginBottomMm}mm ${printSettings.marginLeftMm}mm;
          }
          .ticket-print-root {
            width: ${contentWidthMm}mm;
            margin: 0;
            font-size: ${printSettings.fontSizePx}px;
            line-height: ${printSettings.lineHeight};
          }
        }
      `}</style>
      <div className="ticket-print-root rounded border border-zinc-300 bg-white p-4 text-sm text-zinc-900 print:border-none print:p-0">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {heading}
        </p>
        <h1 className="mt-1 text-xl font-semibold">
          {orgDisplayName?.trim() || 'NODUX'}
        </h1>
        {branchConfig?.ticket_header_text ? (
          <p className="mt-1 text-xs whitespace-pre-line text-zinc-600">
            {branchConfig.ticket_header_text}
          </p>
        ) : null}
        <p className="text-xs text-zinc-500">
          Sucursal: {sale.branch_name ?? '—'}
        </p>
        <p className="text-xs text-zinc-500">
          Fecha: {formatDateTime(sale.created_at)}
        </p>
        <p className="text-xs text-zinc-500">
          Vendedor: {sale.created_by_name}
        </p>
        <p className="text-xs text-zinc-500">
          Estado fiscal: {sale.is_invoiced ? 'Facturada' : 'No facturada'}
        </p>
        {sale.client_name ? (
          <p className="text-xs text-zinc-500">Cliente: {sale.client_name}</p>
        ) : null}
        {sale.client_phone ? (
          <p className="text-xs text-zinc-500">WhatsApp: {sale.client_phone}</p>
        ) : null}
        {branchConfig?.fiscal_ticket_note_text ? (
          <p className="text-xs whitespace-pre-line text-zinc-500">
            {branchConfig.fiscal_ticket_note_text}
          </p>
        ) : null}

        <div className="mt-3 border-t border-b border-zinc-200 py-2">
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500">Sin ítems.</p>
          ) : (
            <div className="grid gap-2">
              {items.map((item) => (
                <div
                  key={item.sale_item_id}
                  className="flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-zinc-500">
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.line_total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Subtotal</span>
            <span>{formatCurrency(Number(sale.subtotal_amount ?? 0))}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Descuento</span>
            <span>{formatCurrency(Number(sale.discount_amount ?? 0))}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(Number(sale.total_amount ?? 0))}</span>
          </div>
        </div>
        {branchConfig?.ticket_footer_text ? (
          <div className="mt-4 border-t border-zinc-200 pt-2 text-xs whitespace-pre-line text-zinc-600">
            {branchConfig.ticket_footer_text}
          </div>
        ) : null}
      </div>
    </>
  );
}
