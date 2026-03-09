import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';

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
  created_by: string;
  created_by_name: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  items: unknown;
};

type OrgRow = {
  name: string;
};

type OrgUserRow = {
  display_name: string | null;
  role: 'superadmin' | 'org_admin' | 'staff';
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

const looksLikeUuid = (value: string | null | undefined) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );

const formatIssuedBy = (
  createdByName: string,
  createdBy: string,
  orgUser: OrgUserRow | null,
) => {
  if (createdByName && !looksLikeUuid(createdByName)) {
    return createdByName;
  }
  if (orgUser?.display_name && orgUser.display_name.trim()) {
    return orgUser.display_name.trim();
  }
  if (orgUser?.role === 'org_admin') {
    return 'Org Admin';
  }
  if (orgUser?.role === 'staff') {
    return 'Staff';
  }
  if (orgUser?.role === 'superadmin') {
    return 'Superadmin';
  }
  return `Usuario ${createdBy.slice(0, 8)}`;
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
  const { data: orgUserData } = await session.supabase
    .from('org_users' as never)
    .select('display_name, role')
    .eq('org_id', session.orgId)
    .eq('user_id', sale.created_by)
    .maybeSingle();

  const branchConfig = (branchConfigData ?? null) as BranchTicketConfigRow | null;
  const org = (orgData ?? { name: 'NODUX' }) as OrgRow;
  const orgUser = (orgUserData ?? null) as OrgUserRow | null;
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
  const issuedByLabel = formatIssuedBy(
    sale.created_by_name,
    sale.created_by,
    orgUser,
  );
  const qrDataUrl = qrUrl
    ? await QRCode.toDataURL(qrUrl, {
        margin: 0,
        width: isTicketFormat ? 160 : 220,
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      })
    : null;
  const formattedVoucher = `${fiscalInvoice.pto_vta
    .toString()
    .padStart(4, '0')}-${String(fiscalInvoice.cbte_nro).padStart(8, '0')}`;
  const formattedRecipient =
    fiscalInvoice.doc_tipo === 99 && fiscalInvoice.doc_nro === 0
      ? 'Consumidor final'
      : `Doc ${fiscalInvoice.doc_tipo} · ${fiscalInvoice.doc_nro}`;

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

      <div className="fiscal-print-root rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 shadow-sm print:border-none print:p-0 print:shadow-none">
        <p className="text-xs font-semibold tracking-[0.24em] text-zinc-500 uppercase">
          {isTicketFormat ? 'Ticket fiscal reimprimible' : 'Factura fiscal'}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950">{org.name}</h1>
            {branchConfig?.ticket_header_text ? (
              <p className="mt-1 max-w-xl text-xs text-zinc-600 whitespace-pre-line">
                {branchConfig.ticket_header_text}
              </p>
            ) : null}
          </div>
          <div className="min-w-[220px] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
              Comprobante
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {formattedVoucher}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              CAE {fiscalInvoice.cae ?? '—'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
              Datos de emisión
            </p>
            <div className="mt-3 grid gap-2 text-sm text-zinc-700">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Sucursal</span>
                <span className="font-medium text-zinc-900">
                  {sale.branch_name ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Fecha</span>
                <span className="font-medium text-zinc-900">
                  {formatDateTime(sale.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Emitido por</span>
                <span className="font-medium text-zinc-900">{issuedByLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Tipo</span>
                <span className="font-medium text-zinc-900">
                  {fiscalInvoice.cbte_tipo}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
              Validación fiscal
            </p>
            <div className="mt-3 grid gap-2 text-sm text-zinc-700">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">CAE</span>
                <span className="font-medium text-zinc-900">
                  {fiscalInvoice.cae ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Vence</span>
                <span className="font-medium text-zinc-900">
                  {fiscalInvoice.cae_expires_at ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Receptor</span>
                <span className="font-medium text-zinc-900">
                  {formattedRecipient}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Estado</span>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Autorizada
                </span>
              </div>
            </div>
          </div>
        </div>
        {branchConfig?.fiscal_ticket_note_text ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 whitespace-pre-line">
            {branchConfig.fiscal_ticket_note_text}
          </p>
        ) : null}

        <div className="mt-4 rounded-2xl border border-zinc-200">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
              Ítems
            </p>
          </div>
          <div className="px-4 py-3">
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500">Sin ítems.</p>
          ) : (
            <div className="grid gap-2">
              {items.map((item) => (
                <div
                  key={item.sale_item_id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{item.product_name}</p>
                    <p className="text-xs text-zinc-500">
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium text-zinc-900">
                    {formatCurrency(item.line_total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
            Totales
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-medium text-zinc-900">
                {formatCurrency(sale.subtotal_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Descuento</span>
              <span className="font-medium text-zinc-900">
                {formatCurrency(sale.discount_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(fiscalInvoice.imp_total, displayCurrency)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 p-4">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
            QR fiscal
          </p>
          {qrUrl ? (
            <div className="mt-3 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                {qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt="QR fiscal"
                    width={isTicketFormat ? 160 : 220}
                    height={isTicketFormat ? 160 : 220}
                    unoptimized
                    className="mx-auto h-auto w-full max-w-[220px]"
                  />
                ) : null}
              </div>
              <div>
                <p className="text-sm text-zinc-600">
                  Escaneá el QR o abrí la validación oficial desde AFIP.
                </p>
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-xl border border-zinc-200 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Abrir validación AFIP
                </a>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Ver payload QR
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-zinc-50 p-3 text-[11px] text-zinc-600">
                    {JSON.stringify(fiscalInvoice.qr_payload_json, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
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
