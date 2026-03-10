import PrintTicketButton from '@/app/sales/PrintTicketButton';
import {
  parseSaleTicketItems,
  resolveSaleTicketPrintSettings,
  SaleTicketDocument,
} from '@/app/sales/SaleTicketDocument';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SharedTicketRow = {
  sale_id: string;
  org_name: string;
  branch_name: string | null;
  created_at: string;
  created_by_name: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  is_invoiced: boolean;
  client_name: string | null;
  client_phone: string | null;
  items: unknown;
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

type DeliveryLogRpc = {
  rpc: (
    fnName: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export default async function SharedSaleTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const supabaseRpc = supabase as unknown as {
    rpc: (
      fnName: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data, error } = await supabaseRpc.rpc(
    'rpc_get_sale_ticket_delivery',
    {
      p_token: token,
    },
  );

  if (error) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          No pudimos cargar el ticket compartido. Intenta nuevamente más tarde.
        </div>
      </main>
    );
  }

  const rows = Array.isArray(data) ? (data as SharedTicketRow[]) : [];
  const ticket = rows[0] ?? null;

  if (!ticket) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          Link inválido o vencido.
        </div>
      </main>
    );
  }

  await (supabase as unknown as DeliveryLogRpc).rpc(
    'rpc_append_sale_delivery_event',
    {
      p_sale_id: ticket.sale_id,
      p_document_kind: 'sale_ticket',
      p_event_kind: 'opened',
      p_channel: 'public_link',
      p_metadata: {
        source: 'shared_ticket_page',
        token_kind: 'public',
      },
    },
  );

  const items = parseSaleTicketItems(ticket.items);
  const branchConfig = {
    ticket_header_text: ticket.ticket_header_text,
    ticket_footer_text: ticket.ticket_footer_text,
    fiscal_ticket_note_text: ticket.fiscal_ticket_note_text,
    ticket_paper_width_mm: ticket.ticket_paper_width_mm,
    ticket_margin_top_mm: ticket.ticket_margin_top_mm,
    ticket_margin_right_mm: ticket.ticket_margin_right_mm,
    ticket_margin_bottom_mm: ticket.ticket_margin_bottom_mm,
    ticket_margin_left_mm: ticket.ticket_margin_left_mm,
    ticket_font_size_px: ticket.ticket_font_size_px,
    ticket_line_height: ticket.ticket_line_height,
  };
  const printSettings = resolveSaleTicketPrintSettings(branchConfig);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-6 text-zinc-900 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto w-full max-w-2xl print:max-w-none">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm print:hidden">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
              Ticket compartido
            </p>
            <p className="text-sm text-zinc-600">
              Puedes imprimirlo o guardarlo como comprobante.
            </p>
          </div>
          <PrintTicketButton />
        </div>

        <SaleTicketDocument
          sale={ticket}
          items={items}
          branchConfig={branchConfig}
          printSettings={printSettings}
          orgDisplayName={ticket.org_name}
        />
      </div>
    </main>
  );
}
