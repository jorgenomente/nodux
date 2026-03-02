import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

type CheckoutPayload = {
  orgSlug?: string;
  branchSlug?: string;
  customerName?: string;
  customerPhone?: string;
  paymentIntent?: 'pay_on_pickup' | 'transfer' | 'qr';
  customerNotes?: string;
  items?: Array<{ product_id?: string; quantity?: number }>;
};

const isValidPaymentIntent = (
  value: unknown,
): value is 'pay_on_pickup' | 'transfer' | 'qr' =>
  value === 'pay_on_pickup' || value === 'transfer' || value === 'qr';

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: 'Storefront no disponible por configuración.' },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as CheckoutPayload;

  const orgSlug = payload.orgSlug?.trim();
  const branchSlug = payload.branchSlug?.trim();
  const customerName = payload.customerName?.trim();
  const customerPhone = payload.customerPhone?.trim();

  if (!orgSlug || !branchSlug || !customerName || !customerPhone) {
    return NextResponse.json(
      { error: 'Faltan datos obligatorios para crear el pedido.' },
      { status: 400 },
    );
  }

  if (!isValidPaymentIntent(payload.paymentIntent)) {
    return NextResponse.json(
      { error: 'Método de pago inválido.' },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return NextResponse.json(
      { error: 'Debes incluir al menos un producto.' },
      { status: 400 },
    );
  }

  const items = payload.items
    .map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity ?? 0),
    }))
    .filter(
      (item) =>
        typeof item.product_id === 'string' &&
        item.product_id.length > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0,
    );

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'Los ítems del pedido son inválidos.' },
      { status: 400 },
    );
  }

  const supabase = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const supabaseRpc = supabase as unknown as {
    rpc: (
      fnName: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data, error } = await supabaseRpc.rpc('rpc_create_online_order', {
    p_org_slug: orgSlug,
    p_branch_slug: branchSlug,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_payment_intent: payload.paymentIntent,
    p_items: items,
    p_customer_notes: payload.customerNotes?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = (Array.isArray(data) ? data[0] : null) as
    | { online_order_id: string; order_code: string; tracking_token: string }
    | null;

  if (!row) {
    return NextResponse.json(
      { error: 'No se pudo generar el pedido.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    onlineOrderId: row.online_order_id,
    orderCode: row.order_code,
    trackingToken: row.tracking_token,
  });
}
