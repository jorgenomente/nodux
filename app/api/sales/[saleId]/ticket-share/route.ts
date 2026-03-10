import { NextRequest, NextResponse } from 'next/server';

import { getOrgMemberSession } from '@/lib/auth/org-session';
import { buildWhatsAppHref } from '@/lib/clients/whatsapp';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { resolvePublicAppOrigin } from '@/lib/urls/public-origin';

export const dynamic = 'force-dynamic';

type SaleShareRow = {
  sale_id: string | null;
  client_name: string | null;
  client_phone: string | null;
};

type DeliveryLinkRow = {
  token: string | null;
};

const buildShareMessage = (params: {
  clientName: string | null;
  orgName: string;
  ticketUrl: string;
}) => {
  const greetingName = params.clientName?.trim() || 'cliente';
  return `Hola ${greetingName}, te compartimos tu comprobante de ${params.orgName}. Puedes verlo aquí: ${params.ticketUrl}`;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> },
) {
  const session = await getOrgMemberSession();
  if (!session?.orgId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const { saleId } = await params;
  const normalizedSaleId = String(saleId ?? '').trim();
  if (!normalizedSaleId) {
    return NextResponse.json(
      { ok: false, error: 'Missing saleId' },
      { status: 400 },
    );
  }

  const adminSupabase = createAdminSupabaseClient();

  const { data: saleData } = await adminSupabase
    .from('v_sale_detail_admin' as never)
    .select('sale_id, client_name, client_phone')
    .eq('org_id', session.orgId)
    .eq('sale_id', normalizedSaleId)
    .maybeSingle();
  const sale = (saleData ?? null) as SaleShareRow | null;

  if (!sale?.sale_id) {
    return NextResponse.json(
      { ok: false, error: 'Sale not found' },
      { status: 404 },
    );
  }

  if (!sale.client_phone) {
    return NextResponse.json(
      { ok: false, error: 'Sale client has no phone' },
      { status: 400 },
    );
  }

  const { data: orgData } = await adminSupabase
    .from('orgs')
    .select('name')
    .eq('id', session.orgId)
    .maybeSingle();
  const orgName = String(
    ((orgData ?? null) as { name?: string | null } | null)?.name ?? 'NODUX',
  );

  const { data: deliveryData, error: deliveryError } =
    await session.supabase.rpc(
      'rpc_get_or_create_sale_delivery_link' as never,
      {
        p_sale_id: normalizedSaleId,
        p_document_kind: 'sale_ticket',
        p_expires_at: null,
      } as never,
    );

  if (deliveryError) {
    return NextResponse.json(
      { ok: false, error: deliveryError.message },
      { status: 400 },
    );
  }

  const deliveryRow = (
    Array.isArray(deliveryData) ? deliveryData[0] : deliveryData
  ) as DeliveryLinkRow | null;
  const token = String(deliveryRow?.token ?? '').trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Could not create delivery link' },
      { status: 500 },
    );
  }

  await session.supabase.rpc(
    'rpc_mark_sale_delivery_link_shared' as never,
    {
      p_sale_id: normalizedSaleId,
      p_document_kind: 'sale_ticket',
      p_channel: 'whatsapp',
    } as never,
  );
  await session.supabase.rpc(
    'rpc_append_sale_delivery_event' as never,
    {
      p_sale_id: normalizedSaleId,
      p_document_kind: 'sale_ticket',
      p_event_kind: 'shared',
      p_channel: 'whatsapp',
      p_metadata: {
        source: 'ticket_share_route',
      },
    } as never,
  );

  const ticketUrl = `${resolvePublicAppOrigin(request)}/share/t/${token}`;
  const whatsappMessage = buildShareMessage({
    clientName: sale.client_name,
    orgName,
    ticketUrl,
  });
  const whatsappUrl = buildWhatsAppHref({
    phone: sale.client_phone,
    text: whatsappMessage,
  });

  if (!whatsappUrl) {
    return NextResponse.json(
      { ok: false, error: 'Could not build WhatsApp URL' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    saleId: normalizedSaleId,
    clientName: sale.client_name,
    clientPhone: sale.client_phone,
    ticketUrl,
    whatsappMessage,
    whatsappUrl,
  });
}
