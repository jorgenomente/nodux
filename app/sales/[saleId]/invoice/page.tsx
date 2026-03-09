import Link from 'next/link';
import { redirect } from 'next/navigation';

import PrintTicketButton from '@/app/sales/PrintTicketButton';
import {
  buildAfipQrUrl,
  type SaleFiscalInvoiceRow,
} from '@/app/sales/fiscal-document';
import { getOrgMemberSession } from '@/lib/auth/org-session';

export const dynamic = 'force-dynamic';

type SaleDetailRow = {
  sale_id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  created_at: string;
  created_by_name: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  items: unknown;
};

type OrgRow = {
  name: string;
};

type BranchTicketConfigRow = {
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

type SaleItem = {
  sale_item_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

const parseItems = (value: unknown): SaleItem[] => {
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
    .filter((row): row is SaleItem => Boolean(row?.sale_item_id));
};

const formatCurrency = (value: number, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR', { hour12: false });
};

const DEFAULT_PRINT_SETTINGS = {
  paperWidthMm: 80,
  marginTopMm: 2,
  marginRightMm: 2,
  marginBottomMm: 2,
  marginLeftMm: 2,
  fontSizePx: 12,
  lineHeight: 1.35,
} as const;

const sanitizeNumber = (
  value: number | null | undefined,
  range: { min: number; max: number; fallback: number },
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return range.fallback;
  return Math.min(Math.max(parsed, range.min), range.max);
};

export default async function SaleFiscalInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ saleId: string }>;
  searchParams?: Promise<{ format?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await getOrgMemberSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId || session.effectiveRole === 'staff') {
    redirect('/no-access');
  }

  const { data: detailData } = await session.supabase
    .from('v_sale_detail_admin' as never)
    .select('*')
    .eq('org_id', session.orgId)
    .eq('sale_id', resolvedParams.saleId)
    .maybeSingle();
  if (!detailData) {
    redirect('/sales');
  }

  const { data: fiscalInvoiceData } = await session.supabase
    .from('v_sale_fiscal_invoice_admin' as never)
    .select('*')
    .eq('org_id', session.orgId)
    .eq('sale_id', resolvedParams.saleId)
    .maybeSingle();
  if (!fiscalInvoiceData) {
    redirect(`/sales/${resolvedParams.saleId}`);
  }

  const sale = detailData as SaleDetailRow;
  const fiscalInvoice = fiscalInvoiceData as SaleFiscalInvoiceRow;
  const items = parseItems(sale.items);
  const { data: branchConfigData } = await session.supabase
    .from('branches' as never)
    .select(
      'ticket_header_text, ticket_footer_text, fiscal_ticket_note_text, ticket_paper_width_mm, ticket_margin_top_mm, ticket_margin_right_mm, ticket_margin_bottom_mm, ticket_margin_left_mm, ticket_font_size_px, ticket_line_height',
    )
    .eq('org_id', session.orgId)
    .eq('id', sale.branch_id)
    .maybeSingle();
  const { data: orgData } = await session.supabase
    .from('orgs' as never)
    .select('name')
    .eq('id', session.orgId)
    .maybeSingle();

  const branchConfig = (branchConfigData ?? null) as BranchTicketConfigRow | null;
  const org = (orgData ?? { name: 'NODUX' }) as OrgRow;
  const printSettings = {
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
  };
  const contentWidthMm = Math.max(
    printSettings.paperWidthMm -
      printSettings.marginLeftMm -
      printSettings.marginRightMm,
    30,
  );
  const qrUrl = buildAfipQrUrl(fiscalInvoice.qr_payload_json);
  const isTicketFormat = resolvedSearchParams?.format === 'ticket';
  const displayCurrency =
    fiscalInvoice.currency === 'PES' ? 'ARS' : fiscalInvoice.currency;

  return (
    <div className="mx-auto w-full max-w-3xl p-4 print:p-0">
      <style>{`
        @media print {
          @page {
            size: ${isTicketFormat ? `${printSettings.paperWidthMm}mm auto` : 'A4'};
            margin: ${printSettings.marginTopMm}mm ${printSettings.marginRightMm}mm ${printSettings.marginBottomMm}mm ${printSettings.marginLeftMm}mm;
          }
          .fiscal-print-root {
            width: ${isTicketFormat ? `${contentWidthMm}mm` : '100%'};
            margin: 0;
            font-size: ${printSettings.fontSizePx}px;
            line-height: ${printSettings.lineHeight};
          }
        }
      `}</style>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={`/sales/${sale.sale_id}`}
            className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            Volver al detalle
          </Link>
          <Link
            href="/sales"
            className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            Ir a ventas
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/sales/${sale.sale_id}/invoice?format=${isTicketFormat ? 'a4' : 'ticket'}`}
            className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            {isTicketFormat ? 'Ver A4' : 'Ver ticket'}
          </Link>
          <PrintTicketButton
            label={isTicketFormat ? 'Imprimir ticket fiscal' : 'Imprimir factura'}
          />
        </div>
      </div>

      <div className="fiscal-print-root rounded border border-zinc-300 bg-white p-4 text-sm text-zinc-900 print:border-none print:p-0">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {isTicketFormat ? 'Ticket fiscal reimprimible' : 'Factura fiscal'}
        </p>
        <h1 className="mt-1 text-xl font-semibold">{org.name}</h1>
        {branchConfig?.ticket_header_text ? (
          <p className="mt-1 text-xs text-zinc-600 whitespace-pre-line">
            {branchConfig.ticket_header_text}
          </p>
        ) : null}
        <div className="mt-3 grid gap-1 text-xs text-zinc-600">
          <p>Sucursal: {sale.branch_name ?? '—'}</p>
          <p>Fecha de venta: {formatDateTime(sale.created_at)}</p>
          <p>Emitido por: {sale.created_by_name}</p>
          <p>
            Comprobante: {fiscalInvoice.pto_vta.toString().padStart(4, '0')}-
            {String(fiscalInvoice.cbte_nro).padStart(8, '0')}
          </p>
          <p>Tipo: {fiscalInvoice.cbte_tipo}</p>
          <p>CAE: {fiscalInvoice.cae ?? '—'}</p>
          <p>Vencimiento CAE: {fiscalInvoice.cae_expires_at ?? '—'}</p>
          <p>
            Receptor: Doc {fiscalInvoice.doc_tipo} · {fiscalInvoice.doc_nro}
          </p>
        </div>
        {branchConfig?.fiscal_ticket_note_text ? (
          <p className="mt-2 text-xs text-zinc-500 whitespace-pre-line">
            {branchConfig.fiscal_ticket_note_text}
          </p>
        ) : null}

        <div className="mt-3 border-t border-b border-zinc-200 py-2">
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500">Sin ítems.</p>
          ) : (
            <div className="grid gap-2">
              {items.map((item) => (
                <div key={item.sale_item_id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-zinc-500">
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(item.line_total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Subtotal</span>
            <span>{formatCurrency(sale.subtotal_amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Descuento</span>
            <span>{formatCurrency(sale.discount_amount)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(fiscalInvoice.imp_total, displayCurrency)}</span>
          </div>
        </div>

        <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            QR fiscal
          </p>
          {qrUrl ? (
            <>
              <p className="mt-1 text-xs text-zinc-600">
                El payload QR ya quedó persistido. Podés abrir la validación oficial desde AFIP.
              </p>
              <a
                href={qrUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex rounded border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
              >
                Abrir QR AFIP
              </a>
              <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px] text-zinc-600">
                {JSON.stringify(fiscalInvoice.qr_payload_json, null, 2)}
              </pre>
            </>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">
              El payload QR todavía no está disponible.
            </p>
          )}
        </div>

        {branchConfig?.ticket_footer_text ? (
          <p className="mt-4 text-xs text-zinc-500 whitespace-pre-line">
            {branchConfig.ticket_footer_text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
