import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import OrderSuggestionsClient from '@/app/orders/OrderSuggestionsClient';
import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type SearchParams = {
  branch_id?: string;
  status?: string;
  draft_supplier_id?: string;
  draft_branch_id?: string;
  draft_margin_pct?: string;
  draft_avg_mode?: string;
};

type OrderRow = {
  order_id: string;
  supplier_name: string | null;
  supplier_id: string;
  branch_name: string | null;
  branch_id: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  reconciled_at: string | null;
  items_count?: number | null;
};

type SuggestionRow = {
  product_id: string;
  relation_type: 'primary' | 'secondary';
  product_name: string | null;
  stock_on_hand: number | null;
  safety_stock: number | null;
  avg_daily_sales_30d: number | null;
  cycle_days?: number | null;
  suggested_qty: number | null;
};

type ProductPriceRow = {
  id: string;
  unit_price: number | null;
};

type SpecialOrderItemRow = {
  item_id: string;
  special_order_id: string;
  client_name: string | null;
  product_id: string;
  product_name: string | null;
  remaining_qty: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  branch_id: string | null;
  is_ordered: boolean | null;
};

const formatStatusLabel = (status: string) => {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'sent':
      return 'Enviado';
    case 'received':
      return 'Recibido';
    case 'reconciled':
      return 'Controlado';
    default:
      return status;
  }
};

const formatAvgModeLabel = (mode: string) => {
  switch (mode) {
    case 'weekly':
      return 'Semanal';
    case 'biweekly':
      return 'Quincenal';
    case 'monthly':
      return 'Mensual';
    default:
      return 'Segun proveedor';
  }
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, is_active')
    .eq('org_id', membership.org_id)
    .eq('is_active', true)
    .order('name');

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('org_id', membership.org_id)
    .eq('is_active', true)
    .order('name');

  const selectedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedStatus =
    typeof resolvedSearchParams.status === 'string'
      ? resolvedSearchParams.status
      : '';
  const draftSupplierId =
    typeof resolvedSearchParams.draft_supplier_id === 'string'
      ? resolvedSearchParams.draft_supplier_id
      : '';
  const draftBranchId =
    typeof resolvedSearchParams.draft_branch_id === 'string'
      ? resolvedSearchParams.draft_branch_id
      : '';
  const draftMarginPctRaw =
    typeof resolvedSearchParams.draft_margin_pct === 'string'
      ? resolvedSearchParams.draft_margin_pct
      : '';
  const draftAvgMode =
    typeof resolvedSearchParams.draft_avg_mode === 'string'
      ? resolvedSearchParams.draft_avg_mode
      : 'cycle';
  const draftMarginPct =
    draftMarginPctRaw === '' ? 0 : Number(draftMarginPctRaw);

  let orderQuery = supabase
    .from('v_orders_admin')
    .select('*')
    .eq('org_id', membership.org_id)
    .order('created_at', { ascending: false });

  if (selectedBranchId) {
    orderQuery = orderQuery.eq('branch_id', selectedBranchId);
  }

  const statusValue = ['draft', 'sent', 'received', 'reconciled'].includes(
    selectedStatus,
  )
    ? (selectedStatus as 'draft' | 'sent' | 'received' | 'reconciled')
    : '';

  if (statusValue) {
    orderQuery = orderQuery.eq('status', statusValue);
  }

  const { data: orders } = await orderQuery;
  const ordersList = (orders as OrderRow[]) ?? [];
  const pendingOrders = ordersList.filter(
    (order) => order.status !== 'reconciled',
  );
  const controlledOrders = ordersList.filter(
    (order) => order.status === 'reconciled',
  );

  const { data: suggestions } =
    draftSupplierId && draftBranchId
      ? await supabase
          .from('v_supplier_product_suggestions')
          .select('*')
          .eq('org_id', membership.org_id)
          .eq('supplier_id', draftSupplierId)
          .eq('branch_id', draftBranchId)
          .eq('relation_type', 'primary')
          .order('product_name')
      : { data: [] };

  const { data: specialOrderItems } =
    draftSupplierId && draftBranchId
      ? await supabase
          .from('v_special_order_items_pending')
          .select(
            'item_id, special_order_id, client_name, product_id, product_name, remaining_qty, supplier_id, supplier_name, branch_id, is_ordered',
          )
          .eq('org_id', membership.org_id)
          .eq('supplier_id', draftSupplierId)
          .eq('branch_id', draftBranchId)
          .eq('is_ordered', false)
      : { data: [] };

  const suggestionIds = (suggestions as SuggestionRow[] | null)
    ?.map((row) => row.product_id)
    .filter(Boolean) as string[] | undefined;

  const { data: suggestionPrices } =
    suggestionIds && suggestionIds.length > 0
      ? await supabase
          .from('products')
          .select('id, unit_price')
          .eq('org_id', membership.org_id)
          .in('id', suggestionIds)
      : { data: [] };

  const priceByProduct = new Map<string, number>();
  (suggestionPrices as ProductPriceRow[] | null)?.forEach((row) => {
    if (!row.id) return;
    priceByProduct.set(row.id, Number(row.unit_price ?? 0));
  });

  const createOrder = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const supplierId = String(formData.get('supplier_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();

    if (!supplierId || !branchId) return;

    const { data: result } = await supabaseServer.rpc(
      'rpc_create_supplier_order',
      {
        p_org_id: membership.org_id,
        p_branch_id: branchId,
        p_supplier_id: supplierId,
        p_notes: notes,
      },
    );

    const orderId = result?.[0]?.order_id as string | undefined;

    if (!orderId) {
      revalidatePath('/orders');
      return;
    }

    const items = Array.from(formData.entries())
      .filter(([key]) => key.startsWith('qty_'))
      .map(([key, value]) => ({
        productId: key.replace('qty_', ''),
        qty: Number(value),
      }))
      .filter((entry) => entry.productId && entry.qty > 0);

    if (items.length === 0) {
      revalidatePath('/orders');
      return;
    }

    await Promise.all(
      items.map((item) =>
        supabaseServer.rpc('rpc_upsert_supplier_order_item', {
          p_org_id: membership.org_id,
          p_order_id: orderId,
          p_product_id: item.productId,
          p_ordered_qty: item.qty,
          p_unit_cost: 0,
        }),
      ),
    );

    const action = String(formData.get('order_action') ?? 'draft').trim();
    if (action === 'sent') {
      await supabaseServer.rpc('rpc_set_supplier_order_status', {
        p_org_id: membership.org_id,
        p_order_id: orderId,
        p_status: 'sent',
      });
    }

    const specialOrderItemIdsRaw = String(
      formData.get('special_order_item_ids') ?? '',
    ).trim();
    if (specialOrderItemIdsRaw) {
      try {
        const itemIds = JSON.parse(specialOrderItemIdsRaw) as string[];
        if (Array.isArray(itemIds) && itemIds.length > 0) {
          await supabaseServer.rpc('rpc_mark_special_order_items_ordered', {
            p_org_id: membership.org_id,
            p_item_ids: itemIds,
            p_supplier_order_id: orderId,
          });
        }
      } catch {
        // ignore invalid payload
      }
    }

    revalidatePath('/orders');
  };

  const selectedSupplier = suppliers?.find(
    (supplier) => supplier.id === draftSupplierId,
  );
  const selectedBranch = branches?.find(
    (branch) => branch.id === draftBranchId,
  );
  const safeMarginPct =
    Number.isNaN(draftMarginPct) || draftMarginPct < 0 ? 0 : draftMarginPct;
  const priceByProductRecord: Record<string, number> = {};
  priceByProduct.forEach((value, key) => {
    priceByProductRecord[key] = value;
  });
  const branchNameById = new Map<string, string>();
  branches?.forEach((branch) => {
    branchNameById.set(branch.id, branch.name);
  });
  const specialOrderItemsWithBranch = (specialOrderItems ?? []).map((item) => ({
    ...(item as SpecialOrderItemRow),
    branch_name: item.branch_id
      ? (branchNameById.get(item.branch_id) ?? null)
      : null,
  }));

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Pedidos</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Crea y administra pedidos a proveedor.
            </p>
          </div>
          <form className="flex flex-wrap items-center gap-2">
            <select
              name="branch_id"
              defaultValue={selectedBranchId}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Todas las sucursales</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="sent">Enviado</option>
              <option value="received">Recibido</option>
              <option value="reconciled">Controlado</option>
            </select>
            <button
              type="submit"
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              Filtrar
            </button>
          </form>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold text-zinc-900">
              Armar pedido
              <span className="text-sm font-medium text-zinc-500 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="mt-4">
              <form method="get" className="grid gap-3 md:grid-cols-3">
                <label className="text-sm text-zinc-600">
                  Proveedor
                  <select
                    name="draft_supplier_id"
                    defaultValue={draftSupplierId}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {suppliers?.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-zinc-600">
                  Sucursal
                  <select
                    name="draft_branch_id"
                    defaultValue={draftBranchId}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  >
                    Ver articulos
                  </button>
                </div>
              </form>

              {draftSupplierId && draftBranchId ? (
                <div className="mt-6 grid gap-4">
                  <form
                    method="get"
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700"
                  >
                    <p className="text-xs font-semibold text-zinc-500 uppercase">
                      Ajustes de sugeridos
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <label className="text-sm text-zinc-600">
                        Margen de ganancia (%)
                        <input
                          name="draft_margin_pct"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={draftMarginPctRaw}
                          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                          placeholder="Ej: 40"
                        />
                        <span
                          className="mt-1 block text-xs text-zinc-400"
                          title="Se usa para estimar el costo del articulo en el proveedor."
                        >
                          ⓘ Se usa para estimar el costo del articulo en el
                          proveedor.
                        </span>
                      </label>
                      <label className="text-sm text-zinc-600">
                        Promedio de ventas
                        <select
                          name="draft_avg_mode"
                          defaultValue={draftAvgMode}
                          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                        >
                          <option value="cycle">Segun proveedor</option>
                          <option value="weekly">Semanal</option>
                          <option value="biweekly">Quincenal</option>
                          <option value="monthly">Mensual</option>
                        </select>
                        <span className="mt-1 block text-xs text-zinc-400">
                          ⓘ Se usa para mostrar estadisticas de venta por
                          periodo.
                        </span>
                      </label>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="rounded border border-zinc-200 px-3 py-2 text-sm"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                    <input
                      type="hidden"
                      name="draft_supplier_id"
                      value={draftSupplierId}
                    />
                    <input
                      type="hidden"
                      name="draft_branch_id"
                      value={draftBranchId}
                    />
                  </form>

                  <form action={createOrder} className="grid gap-4">
                    <input
                      type="hidden"
                      name="supplier_id"
                      value={draftSupplierId}
                    />
                    <input
                      type="hidden"
                      name="branch_id"
                      value={draftBranchId}
                    />
                    <OrderSuggestionsClient
                      key={`${draftSupplierId}-${draftBranchId}`}
                      suggestions={suggestions as SuggestionRow[]}
                      priceByProduct={priceByProductRecord}
                      avgMode={
                        (draftAvgMode as
                          | 'cycle'
                          | 'weekly'
                          | 'biweekly'
                          | 'monthly') || 'cycle'
                      }
                      safeMarginPct={safeMarginPct}
                      showingSummary={`${selectedSupplier?.name ?? 'Proveedor'} · ${selectedBranch?.name ?? 'Sucursal'} · Margen: ${safeMarginPct.toFixed(2)}% · Promedio: ${formatAvgModeLabel(draftAvgMode)}`}
                      specialOrders={
                        specialOrderItemsWithBranch as Array<
                          SpecialOrderItemRow & { branch_name: string | null }
                        >
                      }
                    />

                    <label className="text-sm text-zinc-600">
                      Notas
                      <textarea
                        name="notes"
                        rows={2}
                        className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="submit"
                        name="order_action"
                        value="draft"
                        className="rounded border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
                      >
                        Guardar borrador
                      </button>
                      <button
                        type="submit"
                        name="order_action"
                        value="sent"
                        className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Enviar pedido
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                  Selecciona proveedor y sucursal para ver sugeridos.
                </div>
              )}
            </div>
          </details>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Listado</h2>
          <div className="mt-4 space-y-3">
            {pendingOrders.length > 0 ? (
              pendingOrders.map((order) => (
                <Link
                  key={order.order_id}
                  href={`/orders/${order.order_id}`}
                  className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {order.supplier_name || 'Proveedor'} ·{' '}
                        {order.branch_name || 'Sucursal'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Estado: {formatStatusLabel(order.status)} · Items:{' '}
                        {order.items_count ?? 0}
                      </p>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-sm text-zinc-500">
                No hay pedidos pendientes.
              </div>
            )}
          </div>
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h3 className="text-sm font-semibold text-zinc-700">
              Pedidos controlados
            </h3>
            <div className="mt-3 space-y-3">
              {controlledOrders.length > 0 ? (
                controlledOrders.map((order) => (
                  <Link
                    key={order.order_id}
                    href={`/orders/${order.order_id}`}
                    className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {order.supplier_name || 'Proveedor'} ·{' '}
                          {order.branch_name || 'Sucursal'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Estado: {formatStatusLabel(order.status)} · Items:{' '}
                          {order.items_count ?? 0}
                        </p>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(order.created_at).toLocaleDateString('es-AR')}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-zinc-500">
                  No hay pedidos controlados.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
