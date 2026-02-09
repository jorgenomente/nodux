import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type SearchParams = {
  branch_id?: string;
  status?: string;
  supplier_id?: string;
  suggest_branch_id?: string;
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
  suggested_qty: number | null;
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
  const suggestSupplierId =
    typeof resolvedSearchParams.supplier_id === 'string'
      ? resolvedSearchParams.supplier_id
      : '';
  const suggestBranchId =
    typeof resolvedSearchParams.suggest_branch_id === 'string'
      ? resolvedSearchParams.suggest_branch_id
      : '';

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

  const { data: suggestions } =
    suggestSupplierId && suggestBranchId
      ? await supabase
          .from('v_supplier_product_suggestions')
          .select('*')
          .eq('org_id', membership.org_id)
          .eq('supplier_id', suggestSupplierId)
          .eq('branch_id', suggestBranchId)
          .order('relation_type')
          .order('product_name')
      : { data: [] };

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

    revalidatePath('/orders');

    if (orderId) {
      redirect(`/orders/${orderId}`);
    }
  };

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
              <option value="reconciled">Conciliado</option>
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
          <h2 className="text-lg font-semibold text-zinc-900">Nuevo pedido</h2>
          <form action={createOrder} className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm text-zinc-600">
              Proveedor
              <select
                name="supplier_id"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                required
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
                name="branch_id"
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Seleccionar</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-600 md:col-span-3">
              Notas
              <textarea
                name="notes"
                rows={2}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Crear pedido
              </button>
            </div>
          </form>
          <form method="get" className="mt-6 grid gap-3 md:grid-cols-3">
            <h3 className="text-sm font-semibold text-zinc-900 md:col-span-3">
              Sugerencia de pedido (30 días)
            </h3>
            <label className="text-sm text-zinc-600">
              Proveedor
              <select
                name="supplier_id"
                defaultValue={suggestSupplierId}
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
                name="suggest_branch_id"
                defaultValue={suggestBranchId}
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
                Ver sugerencias
              </button>
            </div>
          </form>
          {suggestions && suggestions.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Stock min</th>
                    <th className="px-3 py-2">Promedio 30d</th>
                    <th className="px-3 py-2">Sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {(suggestions as SuggestionRow[]).map((row) => (
                    <tr
                      key={`${row.product_id}-${row.relation_type}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2">
                        {row.product_name || 'Producto'}
                      </td>
                      <td className="px-3 py-2">
                        {row.relation_type === 'primary'
                          ? 'Principal'
                          : 'Secundario'}
                      </td>
                      <td className="px-3 py-2">{row.stock_on_hand ?? 0}</td>
                      <td className="px-3 py-2">{row.safety_stock ?? 0}</td>
                      <td className="px-3 py-2">
                        {Number(row.avg_daily_sales_30d ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {Number(row.suggested_qty ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Listado</h2>
          <div className="mt-4 space-y-3">
            {orders && orders.length > 0 ? (
              (orders as OrderRow[]).map((order) => (
                <a
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
                        Estado: {order.status} · Items: {order.items_count ?? 0}
                      </p>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="text-sm text-zinc-500">Aún no hay pedidos.</div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
