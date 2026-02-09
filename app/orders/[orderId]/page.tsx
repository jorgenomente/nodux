import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type OrderDetailRow = {
  order_id: string;
  status: string;
  notes: string | null;
  supplier_id: string;
  supplier_name: string | null;
  branch_id: string;
  branch_name: string | null;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  reconciled_at: string | null;
  order_item_id: string | null;
  product_id: string | null;
  product_name: string | null;
  ordered_qty: number | null;
  received_qty: number | null;
  unit_cost: number | null;
  diff_qty: number | null;
};

export default async function OrderDetailPage({
  params,
}: {
  params: { orderId: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: membership } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.org_id || membership.role !== 'org_admin') {
    redirect('/no-access');
  }

  const orderId = params.orderId;
  const { data: detailRows } = await supabase
    .from('v_order_detail_admin')
    .select('*')
    .eq('org_id', membership.org_id)
    .eq('order_id', orderId);

  if (!detailRows || detailRows.length === 0) {
    redirect('/orders');
  }

  const order = detailRows[0] as OrderDetailRow;
  const items = (detailRows as OrderDetailRow[]).filter(
    (row) => row.product_id,
  );

  const { data: productOptions } = await supabase
    .from('v_products_typeahead_admin')
    .select('product_id, name, is_active')
    .eq('org_id', membership.org_id)
    .eq('is_active', true)
    .order('name');

  const addItem = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();
    const orderedQty = Number(formData.get('ordered_qty') ?? 0);

    if (!productId || orderedQty <= 0) return;

    await supabaseServer.rpc('rpc_upsert_supplier_order_item', {
      p_org_id: membership.org_id,
      p_order_id: orderId,
      p_product_id: productId,
      p_ordered_qty: orderedQty,
      p_unit_cost: 0,
    });

    revalidatePath(`/orders/${orderId}`);
  };

  const updateItem = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();
    const orderedQty = Number(formData.get('ordered_qty') ?? 0);

    if (!productId || orderedQty <= 0) return;

    await supabaseServer.rpc('rpc_upsert_supplier_order_item', {
      p_org_id: membership.org_id,
      p_order_id: orderId,
      p_product_id: productId,
      p_ordered_qty: orderedQty,
      p_unit_cost: 0,
    });

    revalidatePath(`/orders/${orderId}`);
  };

  const removeItem = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();

    if (!productId) return;

    await supabaseServer.rpc('rpc_remove_supplier_order_item', {
      p_org_id: membership.org_id,
      p_order_id: orderId,
      p_product_id: productId,
    });

    revalidatePath(`/orders/${orderId}`);
  };

  const sendOrder = async () => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();

    await supabaseServer.rpc('rpc_set_supplier_order_status', {
      p_org_id: membership.org_id,
      p_order_id: orderId,
      p_status: 'sent',
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
  };

  const reconcileOrder = async () => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();

    await supabaseServer.rpc('rpc_reconcile_supplier_order', {
      p_org_id: membership.org_id,
      p_order_id: orderId,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
  };

  const receiveOrder = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const itemsPayload = items
      .map((item) => {
        const value = Number(
          formData.get(`received_${item.order_item_id}`) ?? 0,
        );
        if (!item.order_item_id) return null;
        return {
          order_item_id: item.order_item_id,
          received_qty: value,
        };
      })
      .filter(Boolean);

    await supabaseServer.rpc('rpc_receive_supplier_order', {
      p_org_id: membership.org_id,
      p_order_id: orderId,
      p_items: itemsPayload,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
  };

  const canEdit = order.status === 'draft';
  const canReceive = order.status === 'sent';
  const canReconcile = order.status === 'received';

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <p className="text-xs text-zinc-500">
            <Link href="/orders" className="hover:underline">
              Pedidos
            </Link>{' '}
            / {order.order_id}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pedido {order.order_id}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {order.supplier_name} · {order.branch_name} · Estado: {order.status}
          </p>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-zinc-600">
              Creado: {new Date(order.created_at).toLocaleString('es-AR')}
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <form action={sendOrder}>
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Enviar pedido
                  </button>
                </form>
              )}
              {canReconcile && (
                <form action={reconcileOrder}>
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Conciliar
                  </button>
                </form>
              )}
            </div>
          </div>
          {order.notes ? (
            <div className="mt-3 text-sm text-zinc-500">
              Notas: {order.notes}
            </div>
          ) : null}
        </section>

        {canEdit ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Agregar ítem
            </h2>
            <form action={addItem} className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="text-sm text-zinc-600 md:col-span-2">
                Producto
                <select
                  name="product_id"
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {productOptions
                    ?.filter((product) => Boolean(product.product_id))
                    .map((product) => (
                      <option
                        key={String(product.product_id)}
                        value={String(product.product_id)}
                      >
                        {product.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm text-zinc-600">
                Cantidad
                <input
                  name="ordered_qty"
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Agregar
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Items</h2>
          {items.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">
              No hay items en este pedido.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.order_item_id}
                  className="rounded border border-zinc-200 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Ordenado: {item.ordered_qty ?? 0} · Recibido:{' '}
                        {item.received_qty ?? 0}
                      </p>
                    </div>
                    {canEdit ? (
                      <form action={removeItem}>
                        <input
                          type="hidden"
                          name="product_id"
                          value={item.product_id ?? ''}
                        />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-red-600"
                        >
                          Remover
                        </button>
                      </form>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <form
                      action={updateItem}
                      className="mt-3 grid gap-2 md:grid-cols-3"
                    >
                      <input
                        type="hidden"
                        name="product_id"
                        value={item.product_id ?? ''}
                      />
                      <label className="text-xs text-zinc-600">
                        Cantidad ordenada
                        <input
                          name="ordered_qty"
                          type="number"
                          step="0.01"
                          defaultValue={item.ordered_qty ?? 0}
                          className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="rounded bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {canReceive ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Recibir mercadería
            </h2>
            <form action={receiveOrder} className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.order_item_id}
                  className="grid gap-2 md:grid-cols-3"
                >
                  <div className="text-sm text-zinc-700">
                    {item.product_name}
                  </div>
                  <input
                    name={`received_${item.order_item_id}`}
                    type="number"
                    step="0.01"
                    defaultValue={item.ordered_qty ?? 0}
                    className="rounded border border-zinc-200 px-2 py-1 text-sm"
                  />
                  <div className="text-xs text-zinc-500">
                    Ordenado: {item.ordered_qty ?? 0}
                  </div>
                </div>
              ))}
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Confirmar recepción
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
