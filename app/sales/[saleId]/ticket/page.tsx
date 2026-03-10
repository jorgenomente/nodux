import Link from 'next/link';
import { redirect } from 'next/navigation';

import PrintTicketButton from '@/app/sales/PrintTicketButton';
import {
  parseSaleTicketItems,
  resolveSaleTicketPrintSettings,
  SaleTicketDocument,
} from '@/app/sales/SaleTicketDocument';
import { getOrgMemberSession } from '@/lib/auth/org-session';
import {
  hasStaffModuleEnabled,
  resolveStaffHome,
} from '@/lib/auth/staff-modules';

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
  is_invoiced: boolean;
  client_name: string | null;
  client_phone: string | null;
  items: unknown;
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

export default async function SaleTicketPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const resolvedParams = await params;
  const session = await getOrgMemberSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId) {
    redirect('/no-access');
  }

  if (session.effectiveRole === 'staff') {
    const { data: modules } = await session.supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const resolvedModules = (modules ?? []) as Array<{
      module_key: string;
      is_enabled: boolean;
    }>;
    if (!hasStaffModuleEnabled(resolvedModules, 'sales')) {
      const home = resolveStaffHome(resolvedModules);
      redirect(home);
    }
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

  const sale = detailData as SaleDetailRow;
  const items = parseSaleTicketItems(sale.items);
  const { data: branchConfigData } = await session.supabase
    .from('branches' as never)
    .select(
      'ticket_header_text, ticket_footer_text, fiscal_ticket_note_text, ticket_paper_width_mm, ticket_margin_top_mm, ticket_margin_right_mm, ticket_margin_bottom_mm, ticket_margin_left_mm, ticket_font_size_px, ticket_line_height',
    )
    .eq('org_id', session.orgId)
    .eq('id', sale.branch_id)
    .maybeSingle();
  const branchConfig = (branchConfigData ??
    null) as BranchTicketConfigRow | null;
  const printSettings = resolveSaleTicketPrintSettings(branchConfig);

  return (
    <div className="mx-auto w-full max-w-2xl p-4 print:p-0">
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
        <PrintTicketButton />
      </div>
      <SaleTicketDocument
        sale={sale}
        items={items}
        branchConfig={branchConfig}
        printSettings={printSettings}
      />
    </div>
  );
}
