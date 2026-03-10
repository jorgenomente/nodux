import { redirect } from 'next/navigation';
import QRCode from 'qrcode';

import PrintTicketButton from '@/app/sales/PrintTicketButton';
import {
  buildAfipQrUrl,
  type SaleFiscalInvoiceRow,
} from '@/app/sales/fiscal-document';
import ShareTicketWhatsappButton from '@/app/sales/ShareTicketWhatsappButton';
import {
  SaleFiscalInvoiceDocument,
  type BranchTicketConfigRow,
  type OrgUserRow,
  type SaleFiscalInvoiceDetailRow,
} from '@/app/sales/SaleFiscalInvoiceDocument';
import { getOrgMemberSession } from '@/lib/auth/org-session';

export const dynamic = 'force-dynamic';

type SaleDetailRow = SaleFiscalInvoiceDetailRow;

type OrgRow = {
  name: string;
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

  const branchConfig = (branchConfigData ??
    null) as BranchTicketConfigRow | null;
  const org = (orgData ?? { name: 'NODUX' }) as OrgRow;
  const orgUser = (orgUserData ?? null) as OrgUserRow | null;
  const qrUrl = buildAfipQrUrl(fiscalInvoice.qr_payload_json);
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
    <div className="mx-auto w-full max-w-3xl p-4 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <PrintTicketButton
            label={
              isTicketFormat ? 'Imprimir ticket fiscal' : 'Imprimir factura'
            }
          />
          {fiscalInvoice.render_status === 'completed' ? (
            <ShareTicketWhatsappButton
              saleId={sale.sale_id}
              endpointPath="invoice-share"
              label="Compartir factura por WhatsApp"
            />
          ) : null}
        </div>
      </div>

      <SaleFiscalInvoiceDocument
        sale={sale}
        fiscalInvoice={fiscalInvoice}
        branchConfig={branchConfig}
        orgName={org.name}
        orgUser={orgUser}
        isTicketFormat={isTicketFormat}
        qrUrl={qrUrl}
        qrDataUrl={qrDataUrl}
      />
    </div>
  );
}
