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
  expected_receive_on: string | null;
  controlled_by_user_id: string | null;
  controlled_by_name: string | null;
  controlled_by_user_name: string | null;
  order_item_id: string | null;
  product_id: string | null;
  product_name: string | null;
  ordered_qty: number | null;
  received_qty: number | null;
  unit_cost: number | null;
  diff_qty: number | null;
};

const formatStatusLabel = (status: string) => {
  switch (status) {
    case 'draft':
      return 'Pendiente por realizar';
    case 'sent':
      return 'Pendiente por recibir';
    case 'received':
      return 'Pendiente por recibir';
    case 'reconciled':
      return 'Recibido y controlado';
    default:
      return status;
  }
};

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('es-AR') : '—';
const formatDateInput = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

const statusOptions = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviado' },
];

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ notice?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
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

  const orderId = resolvedParams.orderId;
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

    revalidatePath('/orders');
    redirect(`/orders/${orderId}?notice=sent`);
  };

  const setOrderStatus = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const nextStatus = formData.get('next_status');

    if (nextStatus !== 'draft' && nextStatus !== 'sent') {
      return;
    }

    if (nextStatus === order.status) {
      return;
    }

    await supabaseServer.rpc('rpc_set_supplier_order_status', {
      p_org_id: membership.org_id,
      p_order_id: orderId,
      p_status: nextStatus,
    });

    revalidatePath('/orders');
    redirect(`/orders/${orderId}?notice=status`);
  };

  const receiveOrder = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const receivedAtRaw = String(formData.get('received_at') ?? '').trim();
    const controlledByName = String(
      formData.get('controlled_by_name') ?? '',
    ).trim();

    if (!controlledByName) {
      redirect(`/orders/${orderId}?notice=controlled_required`);
    }
    const parsedReceivedAt = receivedAtRaw ? new Date(receivedAtRaw) : null;
    const receivedAt =
      parsedReceivedAt && !Number.isNaN(parsedReceivedAt.getTime())
        ? parsedReceivedAt.toISOString()
        : null;
    const { data: userData } = await supabaseServer.auth.getUser();
    const userId = userData.user?.id ?? null;
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

    if (order.status === 'sent') {
      await supabaseServer.rpc('rpc_receive_supplier_order', {
        p_org_id: membership.org_id,
        p_order_id: orderId,
        p_items: itemsPayload,
        p_received_at: receivedAt,
        p_controlled_by_user_id: userId,
        p_controlled_by_name: controlledByName,
      });
    }

    if (order.status === 'received') {
      await supabaseServer
        .from('supplier_orders')
        .update({
          status: 'reconciled',
          received_at:
            receivedAt ?? order.received_at ?? new Date().toISOString(),
          reconciled_at: receivedAt ?? new Date().toISOString(),
          controlled_by_user_id: userId,
          controlled_by_name: controlledByName,
        })
        .eq('org_id', membership.org_id)
        .eq('id', orderId)
        .eq('status', 'received');
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
  };

  const setExpectedReceiveOn = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const expectedReceiveOnRaw = String(
      formData.get('expected_receive_on') ?? '',
    ).trim();
    const expectedReceiveOn = expectedReceiveOnRaw || null;

    await supabaseServer.rpc('rpc_set_supplier_order_expected_receive_on', {
      p_org_id: membership.org_id,
      p_order_id: orderId,
      p_expected_receive_on: expectedReceiveOn as unknown as string,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders/calendar');
    redirect(`/orders/${orderId}?notice=expected_receive_updated`);
  };

  const canEdit = order.status === 'draft';
  const canReceive = order.status === 'sent' || order.status === 'received';
  const canSetManualStatus =
    order.status === 'draft' || order.status === 'sent';
  const canSetExpectedReceive =
    order.status === 'sent' || order.status === 'received';
  const controlledByLabel =
    order.controlled_by_name || order.controlled_by_user_name;
  const receiveDefaultAt = new Date().toISOString().slice(0, 16);
  const userLabel = user.email ?? user.id;
  const isFinalized = order.status === 'reconciled';
  const notice =
    resolvedSearchParams?.notice === 'sent'
      ? { tone: 'success', message: 'Pedido enviado.' }
      : resolvedSearchParams?.notice === 'status'
        ? { tone: 'success', message: 'Estado actualizado.' }
        : resolvedSearchParams?.notice === 'controlled_required'
          ? {
              tone: 'error',
              message: 'Indicá quién controló el pedido.',
            }
          : resolvedSearchParams?.notice === 'expected_receive_updated'
            ? { tone: 'success', message: 'Fecha estimada actualizada.' }
            : null;

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
            {order.supplier_name} · {order.branch_name} · Estado:{' '}
            {formatStatusLabel(order.status)}
          </p>
        </div>

        {notice ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-zinc-600">
              Creado: {formatDateTime(order.created_at)}
              {' · '}
              Enviado: {formatDateTime(order.sent_at)}
              {' · '}
              Controlado: {formatDateTime(order.reconciled_at)}
            </div>
            <div className="flex flex-wrap gap-2">
              {canSetManualStatus ? (
                <form action={setOrderStatus} className="flex flex-wrap gap-2">
                  <label className="text-xs font-semibold text-zinc-600">
                    Estado
                    <select
                      name="next_status"
                      defaultValue={order.status}
                      className="ml-2 rounded border border-zinc-200 px-2 py-1 text-xs"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                  >
                    Actualizar estado
                  </button>
                </form>
              ) : null}
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
            </div>
          </div>
          {controlledByLabel ? (
            <div className="mt-2 text-sm text-zinc-500">
              Controlado por: {controlledByLabel}
              {order.controlled_by_user_name && order.controlled_by_name
                ? ` (Usuario: ${order.controlled_by_user_name})`
                : null}
            </div>
          ) : null}
          {!isFinalized ? (
            <div className="mt-2 text-xs text-zinc-500">
              La recepcion y el control se confirman desde “Recibir y controlar
              mercadería”.
            </div>
          ) : null}
          {canSetExpectedReceive ? (
            <form
              action={setExpectedReceiveOn}
              className="mt-3 flex flex-wrap items-end gap-2"
            >
              <label className="text-xs font-semibold text-zinc-600">
                Fecha estimada de recepción
                <input
                  type="date"
                  name="expected_receive_on"
                  defaultValue={formatDateInput(order.expected_receive_on)}
                  className="ml-2 rounded border border-zinc-200 px-2 py-1 text-xs"
                />
              </label>
              <button
                type="submit"
                className="rounded border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
              >
                Guardar fecha
              </button>
            </form>
          ) : null}
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
              Recibir y controlar mercadería
            </h2>
            <form action={receiveOrder} className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-zinc-600">
                  Fecha y hora de recepción
                  <input
                    name="received_at"
                    type="datetime-local"
                    defaultValue={receiveDefaultAt}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Controlado por (nombre)
                  <input
                    name="controlled_by_name"
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="Ej: Juan Perez"
                    required
                  />
                  <span className="mt-1 block text-xs text-zinc-400">
                    Autofirma: {userLabel}
                  </span>
                </label>
              </div>
              {order.status === 'received' ? (
                <p className="text-xs text-zinc-500">
                  Pedido legado en estado <code>received</code>: esta acción
                  solo registra el control final (fecha/firma) y lo cierra como
                  recibido y controlado.
                </p>
              ) : null}
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
                    defaultValue={
                      order.status === 'received'
                        ? (item.received_qty ?? item.ordered_qty ?? 0)
                        : (item.ordered_qty ?? 0)
                    }
                    disabled={order.status === 'received'}
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
                {order.status === 'received'
                  ? 'Confirmar control'
                  : 'Confirmar recepción'}
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
