import { randomUUID } from 'crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import ClientSpecialOrderItemsClient from '@/app/clients/ClientSpecialOrderItemsClient';
import { getOrgMemberSession } from '@/lib/auth/org-session';

const STAFF_MODULE_ORDER = [
  'pos',
  'cashbox',
  'products_lookup',
  'clients',
  'expirations',
] as const;
const moduleToRoute: Record<string, string> = {
  pos: '/pos',
  cashbox: '/cashbox',
  products_lookup: '/products/lookup',
  clients: '/clients',
  expirations: '/expirations',
};

const resolveStaffHome = (
  modules: Array<{ module_key: string; is_enabled: boolean }>,
) => {
  const enabled = modules
    .filter((module) => module.is_enabled)
    .sort(
      (a, b) =>
        STAFF_MODULE_ORDER.indexOf(
          a.module_key as (typeof STAFF_MODULE_ORDER)[number],
        ) -
        STAFF_MODULE_ORDER.indexOf(
          b.module_key as (typeof STAFF_MODULE_ORDER)[number],
        ),
    );

  if (enabled.length === 0) return '/no-access';

  return moduleToRoute[enabled[0].module_key] ?? '/no-access';
};

type SearchParams = {
  q?: string;
  branch_id?: string;
  client_id?: string;
};

type ClientRow = {
  client_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active_special_orders_count: number | null;
};

type ClientDetailRow = {
  client_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean | null;
  special_order_id: string | null;
  special_order_status:
    | 'pending'
    | 'ordered'
    | 'partial'
    | 'delivered'
    | 'cancelled'
    | null;
  special_order_notes: string | null;
  special_order_branch_id: string | null;
  special_order_created_at: string | null;
  item_id: string | null;
  product_id: string | null;
  product_name: string | null;
  requested_qty: number | null;
  fulfilled_qty: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
};

type BranchOption = {
  id: string;
  name: string;
};

const specialOrderStatusOptions = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'ordered', label: 'Pedido' },
  { value: 'partial', label: 'Parcial' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
] as const;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('es-AR') : '—';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getOrgMemberSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId || !session.effectiveRole) {
    redirect('/no-access');
  }
  const supabase = session.supabase;
  const orgId = session.orgId;
  const role = session.effectiveRole;
  const userId = session.userId;

  if (role === 'staff') {
    const { data: modules } = await supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const enabledClients = modules?.some(
      (module) => module.module_key === 'clients' && module.is_enabled,
    );
    if (!enabledClients) {
      const home = resolveStaffHome(modules ?? []);
      redirect(home);
    }
  }

  let branches: BranchOption[] = [];

  if (role === 'staff') {
    const { data: branchMemberships } = await supabase
      .from('branch_memberships')
      .select('branch_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('is_active', true);

    const branchIds = (branchMemberships ?? [])
      .map((bm) => bm.branch_id)
      .filter(Boolean);
    if (branchIds.length === 0) {
      redirect('/no-access');
    }

    const { data: branchRows } = await supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .in('id', branchIds)
      .order('name');

    branches = (branchRows ?? []) as BranchOption[];
  } else {
    const { data: branchRows } = await supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name');

    branches = (branchRows ?? []) as BranchOption[];
  }

  const branchIds = new Set(branches.map((branch) => branch.id));
  const requestedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedBranchId =
    role === 'staff'
      ? branchIds.has(requestedBranchId)
        ? requestedBranchId
        : (branches[0]?.id ?? '')
      : requestedBranchId;
  const query =
    typeof resolvedSearchParams.q === 'string'
      ? resolvedSearchParams.q.trim()
      : '';

  const { data: clientsData } = await supabase.rpc('rpc_list_clients', {
    p_org_id: orgId,
    p_branch_id: (selectedBranchId || null) as unknown as string,
    p_search: (query || null) as unknown as string,
    p_limit: 50,
    p_offset: 0,
  });

  const clients = (clientsData as ClientRow[]) ?? [];

  const selectedClientId =
    typeof resolvedSearchParams.client_id === 'string'
      ? resolvedSearchParams.client_id
      : '';
  const currentParams = new URLSearchParams();
  if (query) currentParams.set('q', query);
  if (selectedBranchId) currentParams.set('branch_id', selectedBranchId);
  if (selectedClientId) currentParams.set('client_id', selectedClientId);
  const returnTo = `/clients${currentParams.toString() ? `?${currentParams.toString()}` : ''}`;

  const { data: clientDetailData } = selectedClientId
    ? await supabase.rpc('rpc_get_client_detail', {
        p_org_id: orgId,
        p_client_id: selectedClientId,
      })
    : { data: null };

  const detailRows = (clientDetailData as ClientDetailRow[]) ?? [];
  const selectedClient = detailRows[0];
  const specialOrdersById = new Map<
    string,
    {
      order: ClientDetailRow;
      items: ClientDetailRow[];
    }
  >();
  detailRows.forEach((row) => {
    if (!row.special_order_id) return;
    const existing = specialOrdersById.get(row.special_order_id) ?? {
      order: row,
      items: [],
    };
    if (row.item_id) {
      existing.items.push(row);
    }
    specialOrdersById.set(row.special_order_id, existing);
  });
  const specialOrders = Array.from(specialOrdersById.values()).sort((a, b) =>
    (b.order.special_order_created_at ?? '').localeCompare(
      a.order.special_order_created_at ?? '',
    ),
  );

  const branchById = new Map<string, string>();
  branches.forEach((branch) => {
    branchById.set(branch.id, branch.name);
  });

  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, sell_unit_type, uom')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');

  const { data: suppliersData } = await supabase
    .from('suppliers')
    .select('id, name, is_active')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');

  const { data: supplierProductsData } = await supabase
    .from('supplier_products')
    .select('product_id, supplier_id, relation_type, suppliers(name)')
    .eq('org_id', orgId)
    .eq('relation_type', 'primary');

  const primarySupplierByProduct: Record<
    string,
    { supplier_id: string; supplier_name: string } | undefined
  > = {};
  (supplierProductsData ?? []).forEach((row) => {
    if (!row.product_id || !row.supplier_id) return;
    primarySupplierByProduct[row.product_id] = {
      supplier_id: row.supplier_id,
      supplier_name:
        (row.suppliers as { name?: string } | null)?.name ?? 'Proveedor',
    };
  });

  const createClient = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const actionOrgId = actionSession.orgId;
    const name = String(formData.get('name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();

    if (!name) return;

    await supabaseServer.rpc('rpc_upsert_client', {
      p_client_id: randomUUID(),
      p_org_id: actionOrgId,
      p_name: name,
      p_phone: phone,
      p_email: email,
      p_notes: notes,
      p_is_active: true,
    });

    revalidatePath('/clients');
  };

  const updateClient = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const actionOrgId = actionSession.orgId;
    const clientId = String(formData.get('client_id') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const isActive = String(formData.get('is_active') ?? 'true') === 'true';

    if (!clientId || !name) return;

    await supabaseServer.rpc('rpc_upsert_client', {
      p_client_id: clientId,
      p_org_id: actionOrgId,
      p_name: name,
      p_phone: phone,
      p_email: email,
      p_notes: notes,
      p_is_active: isActive,
    });

    revalidatePath('/clients');
  };

  const createSpecialOrder = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const actionOrgId = actionSession.orgId;
    const clientId = String(formData.get('client_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const itemsRaw = String(formData.get('items_json') ?? '').trim();
    let items: unknown = [];
    if (itemsRaw) {
      try {
        items = JSON.parse(itemsRaw);
      } catch {
        items = [];
      }
    }

    if (!clientId || !branchId || !Array.isArray(items) || items.length === 0) {
      return;
    }

    await supabaseServer.rpc('rpc_create_special_order', {
      p_org_id: actionOrgId,
      p_branch_id: branchId,
      p_client_id: clientId,
      p_items: items,
      p_notes: notes,
    });

    revalidatePath('/clients');
  };

  const updateSpecialOrderStatus = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const actionOrgId = actionSession.orgId;
    const specialOrderId = String(
      formData.get('special_order_id') ?? '',
    ).trim();
    const statusRaw = String(formData.get('status') ?? '').trim();
    const status = [
      'pending',
      'ordered',
      'partial',
      'delivered',
      'cancelled',
    ].includes(statusRaw)
      ? (statusRaw as
          | 'pending'
          | 'ordered'
          | 'partial'
          | 'delivered'
          | 'cancelled')
      : null;

    if (!specialOrderId || !status) return;

    await supabaseServer.rpc('rpc_set_special_order_status', {
      p_org_id: actionOrgId,
      p_special_order_id: specialOrderId,
      p_status: status,
    });

    revalidatePath('/clients');
    const returnToPath = String(formData.get('return_to') ?? '').trim();
    if (returnToPath) {
      redirect(returnToPath);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-900">Clientes</h1>
          <p className="text-sm text-zinc-500">
            Gestiona clientes y pedidos especiales por sucursal.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold text-zinc-900">
              Nuevo cliente
              <span className="text-sm font-medium text-zinc-500 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <form
              action={createClient}
              className="mt-6 grid gap-4 md:grid-cols-2"
            >
              <label className="text-sm font-medium text-zinc-700">
                Nombre
                <input
                  name="name"
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Teléfono
                <input
                  name="phone"
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Email
                <input
                  name="email"
                  type="email"
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-zinc-700 md:col-span-2">
                Notas
                <textarea
                  name="notes"
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Crear cliente
                </button>
              </div>
            </form>
          </details>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <form className="flex flex-wrap items-end gap-3" method="get">
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                Buscar
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Nombre, teléfono o email"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                Sucursal
                <select
                  name="branch_id"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  defaultValue={selectedBranchId}
                >
                  {role === 'org_admin' && <option value="">Todas</option>}
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700"
              >
                Filtrar
              </button>
            </form>
            <div className="text-sm text-zinc-500">
              {clients.length} clientes
            </div>
          </div>

          {clients.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
              No hay clientes para este filtro.
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {clients.map((client) => {
                const isActive = client.client_id === selectedClientId;
                const params = new URLSearchParams(currentParams);
                params.set('client_id', client.client_id);
                return (
                  <Link
                    key={client.client_id}
                    href={`/clients?${params.toString()}`}
                    className={`rounded-xl border px-4 py-3 ${
                      isActive
                        ? 'border-zinc-900 bg-zinc-50'
                        : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {client.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {client.phone || 'Sin teléfono'} ·{' '}
                          {client.email || 'Sin email'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-zinc-600">
                        Pedidos activos:{' '}
                        {client.active_special_orders_count ?? 0}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {selectedClient ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {selectedClient.name}
                </h2>
                <p className="text-sm text-zinc-500">
                  {selectedClient.phone || 'Sin teléfono'} ·{' '}
                  {selectedClient.email || 'Sin email'}
                </p>
              </div>
              <span className="text-xs text-zinc-500">
                Estado: {selectedClient.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <details className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                Editar cliente
              </summary>
              <form
                action={updateClient}
                className="mt-4 grid gap-3 md:grid-cols-2"
              >
                <input
                  type="hidden"
                  name="client_id"
                  value={selectedClient.client_id}
                />
                <label className="text-sm text-zinc-600">
                  Nombre
                  <input
                    name="name"
                    defaultValue={selectedClient.name}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Teléfono
                  <input
                    name="phone"
                    defaultValue={selectedClient.phone ?? ''}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Email
                  <input
                    name="email"
                    type="email"
                    defaultValue={selectedClient.email ?? ''}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Estado
                  <select
                    name="is_active"
                    defaultValue={String(selectedClient.is_active ?? true)}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </label>
                <label className="text-sm text-zinc-600 md:col-span-2">
                  Notas
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={selectedClient.notes ?? ''}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Guardar cliente
                  </button>
                </div>
              </form>
            </details>

            <details className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                Nuevo pedido especial
              </summary>
              <form action={createSpecialOrder} className="mt-4 grid gap-3">
                <input
                  type="hidden"
                  name="client_id"
                  value={selectedClient.client_id}
                />
                {role === 'org_admin' ? (
                  <label className="text-sm text-zinc-600">
                    Sucursal
                    <select
                      name="branch_id"
                      defaultValue={selectedBranchId}
                      className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Seleccionar sucursal</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <input
                    type="hidden"
                    name="branch_id"
                    value={selectedBranchId}
                  />
                )}
                <ClientSpecialOrderItemsClient
                  products={
                    (productsData ?? []) as Array<{
                      id: string;
                      name: string;
                      sell_unit_type: 'unit' | 'weight' | 'bulk';
                      uom: string;
                    }>
                  }
                  suppliers={
                    (suppliersData ?? []) as Array<{
                      id: string;
                      name: string;
                    }>
                  }
                  primarySupplierByProduct={primarySupplierByProduct}
                />
                <label className="text-sm text-zinc-600">
                  Notas (opcional)
                  <textarea
                    name="notes"
                    rows={2}
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <div>
                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Crear pedido
                  </button>
                </div>
              </form>
            </details>

            <div className="mt-6 border-t border-zinc-100 pt-6">
              <h3 className="text-sm font-semibold text-zinc-900">
                Pedidos especiales
              </h3>
              {specialOrders.length === 0 ? (
                <div className="mt-3 text-sm text-zinc-500">
                  Este cliente no tiene pedidos especiales.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {specialOrders.map(({ order, items }) => (
                    <div
                      key={order.special_order_id}
                      className="rounded border border-zinc-200 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            Pedido especial ·{' '}
                            {order.special_order_notes || 'Sin notas'}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {order.special_order_branch_id
                              ? (branchById.get(
                                  order.special_order_branch_id,
                                ) ?? order.special_order_branch_id)
                              : 'Sucursal sin definir'}{' '}
                            · {formatDate(order.special_order_created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs text-zinc-500">
                          <span>
                            Estado: {order.special_order_status ?? 'pending'}
                          </span>
                          <Link
                            href={`/pos?special_order_id=${order.special_order_id}`}
                            className="text-xs font-semibold text-zinc-700 underline"
                          >
                            Ir a POS
                          </Link>
                        </div>
                      </div>
                      {items.length > 0 ? (
                        <div className="mt-3 space-y-2 text-xs text-zinc-600">
                          {items.map((item) => (
                            <div
                              key={item.item_id}
                              className="flex flex-wrap items-center justify-between gap-2"
                            >
                              <span>
                                {item.product_name ?? 'Producto'} ·{' '}
                                {item.supplier_name || 'Sin proveedor'}
                              </span>
                              <span>
                                Pedido: {item.requested_qty ?? 0} · Entregado:{' '}
                                {item.fulfilled_qty ?? 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <form
                        action={updateSpecialOrderStatus}
                        className="mt-3 flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="special_order_id"
                          value={order.special_order_id ?? ''}
                        />
                        <input
                          type="hidden"
                          name="return_to"
                          value={returnTo}
                        />
                        <label className="text-xs text-zinc-600">
                          Estado
                          <select
                            name="status"
                            defaultValue={
                              order.special_order_status ?? 'pending'
                            }
                            className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                          >
                            {specialOrderStatusOptions.map((option) => (
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
                          Actualizar
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            Seleccioná un cliente para ver detalles y pedidos especiales.
          </section>
        )}
      </div>
    </PageShell>
  );
}
