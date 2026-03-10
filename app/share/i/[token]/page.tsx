import QRCode from 'qrcode';

import {
  buildAfipQrUrl,
  type SaleFiscalInvoiceRow,
} from '@/app/sales/fiscal-document';
import {
  SaleFiscalInvoiceDocument,
  type BranchTicketConfigRow,
  type OrgUserRow,
  type SaleFiscalInvoiceDetailRow,
} from '@/app/sales/SaleFiscalInvoiceDocument';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SharedFiscalInvoiceRow = SaleFiscalInvoiceDetailRow &
  SaleFiscalInvoiceRow & {
    org_name: string;
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
    issuer_display_name: string | null;
    issuer_role: 'superadmin' | 'org_admin' | 'staff' | null;
  };

type DeliveryLogRpc = {
  rpc: (
    fnName: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export default async function SharedSaleInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ format?: string }>;
}) {
  const { token } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createServerSupabaseClient();
  const supabaseRpc = supabase as unknown as {
    rpc: (
      fnName: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data, error } = await supabaseRpc.rpc(
    'rpc_get_sale_invoice_delivery',
    {
      p_token: token,
    },
  );

  if (error) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          No pudimos cargar la factura compartida. Intenta nuevamente más tarde.
        </div>
      </main>
    );
  }

  const rows = Array.isArray(data) ? (data as SharedFiscalInvoiceRow[]) : [];
  const invoice = rows[0] ?? null;

  if (!invoice) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          Link inválido, vencido o factura todavía no disponible.
        </div>
      </main>
    );
  }

  await (supabase as unknown as DeliveryLogRpc).rpc(
    'rpc_append_sale_delivery_event',
    {
      p_sale_id: invoice.sale_id,
      p_document_kind: 'sale_invoice',
      p_event_kind: 'opened',
      p_channel: 'public_link',
      p_metadata: {
        source: 'shared_invoice_page',
        token_kind: 'public',
      },
    },
  );

  const branchConfig: BranchTicketConfigRow = {
    ticket_header_text: invoice.ticket_header_text,
    ticket_footer_text: invoice.ticket_footer_text,
    fiscal_ticket_note_text: invoice.fiscal_ticket_note_text,
    ticket_paper_width_mm: invoice.ticket_paper_width_mm,
    ticket_margin_top_mm: invoice.ticket_margin_top_mm,
    ticket_margin_right_mm: invoice.ticket_margin_right_mm,
    ticket_margin_bottom_mm: invoice.ticket_margin_bottom_mm,
    ticket_margin_left_mm: invoice.ticket_margin_left_mm,
    ticket_font_size_px: invoice.ticket_font_size_px,
    ticket_line_height: invoice.ticket_line_height,
  };
  const orgUser: OrgUserRow | null = invoice.issuer_role
    ? {
        display_name: invoice.issuer_display_name,
        role: invoice.issuer_role,
      }
    : null;
  const qrUrl = buildAfipQrUrl(invoice.qr_payload_json);
  const isTicketFormat = resolvedSearchParams?.format === 'ticket';
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-6 text-zinc-900 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto w-full max-w-3xl print:max-w-none">
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm print:hidden">
          <p className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
            Factura compartida
          </p>
          <p className="text-sm text-zinc-600">
            Puedes imprimirla o guardarla como comprobante fiscal.
          </p>
        </div>

        <SaleFiscalInvoiceDocument
          sale={invoice}
          fiscalInvoice={invoice}
          branchConfig={branchConfig}
          orgName={invoice.org_name}
          orgUser={orgUser}
          isTicketFormat={isTicketFormat}
          qrUrl={qrUrl}
          qrDataUrl={qrDataUrl}
          showHeaderActions={false}
        />
      </div>
    </main>
  );
}
