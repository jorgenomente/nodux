import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const STAFF_MODULE_ORDER = [
  'pos',
  'products_lookup',
  'clients',
  'expirations',
] as const;
const moduleToRoute: Record<string, string> = {
  pos: '/pos',
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
  branch_id?: string;
  severity?: string;
  notice?: string;
};

type ExpirationRow = {
  batch_id: string;
  org_id: string;
  branch_id: string | null;
  branch_name: string | null;
  product_id: string | null;
  product_name: string | null;
  expires_on: string;
  days_left: number | null;
  quantity: number | null;
  batch_code: string | null;
  severity: 'critical' | 'warning' | 'info' | string | null;
};

type ProductOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type BranchOption = {
  id: string;
  name: string;
};

const severityLabels: Record<string, string> = {
  all: 'Todas',
  critical: 'Critico (0-3 dias)',
  soon: 'Pronto (4-7 dias)',
};

const severityBadge: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  soon: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const buildSearchParams = (base: SearchParams, updates: SearchParams) => {
  const params = new URLSearchParams();
  const branchId = updates.branch_id ?? base.branch_id ?? '';
  const severity = updates.severity ?? base.severity ?? '';
  if (branchId) params.set('branch_id', branchId);
  if (severity) params.set('severity', severity);
  if (updates.notice) params.set('notice', updates.notice);
  return params.toString();
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('es-AR') : '-';

export default async function ExpirationsPage({
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

  if (!membership?.org_id || !membership.role) {
    redirect('/no-access');
  }

  if (membership.role === 'superadmin') {
    redirect('/superadmin');
  }

  if (membership.role === 'staff') {
    const { data: modules } = await supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const enabledExpirations = modules?.some(
      (module) => module.module_key === 'expirations' && module.is_enabled,
    );
    if (!enabledExpirations) {
      const home = resolveStaffHome(modules ?? []);
      redirect(home);
    }
  }

  let branches: BranchOption[] = [];

  if (membership.role === 'staff') {
    const { data: branchMemberships } = await supabase
      .from('branch_memberships')
      .select('branch_id')
      .eq('org_id', membership.org_id)
      .eq('user_id', user.id)
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
      .eq('org_id', membership.org_id)
      .eq('is_active', true)
      .in('id', branchIds)
      .order('name');

    branches = (branchRows ?? []) as BranchOption[];
  } else {
    const { data: branchRows } = await supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', membership.org_id)
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
    membership.role === 'staff'
      ? branchIds.has(requestedBranchId)
        ? requestedBranchId
        : (branches[0]?.id ?? '')
      : requestedBranchId || branches[0]?.id || '';
  const selectedSeverity =
    typeof resolvedSearchParams.severity === 'string'
      ? resolvedSearchParams.severity
      : '';
  const severityFilter = ['critical', 'soon'].includes(selectedSeverity)
    ? (selectedSeverity as 'critical' | 'soon')
    : '';

  let expirationsQuery = supabase
    .from('v_expirations_due')
    .select('*')
    .eq('org_id', membership.org_id)
    .order('days_left', { ascending: true })
    .order('expires_on', { ascending: true });

  if (selectedBranchId) {
    expirationsQuery = expirationsQuery.eq('branch_id', selectedBranchId);
  }

  if (severityFilter === 'critical') {
    expirationsQuery = expirationsQuery.lte('days_left', 3);
  }

  if (severityFilter === 'soon') {
    expirationsQuery = expirationsQuery.gte('days_left', 4).lte('days_left', 7);
  }

  const { data: expirations, error: expirationsError } = await expirationsQuery;
  const expirationRows = (expirations as ExpirationRow[]) ?? [];

  const { data: products } =
    membership.role === 'org_admin'
      ? await supabase
          .from('products')
          .select('id, name, is_active')
          .eq('org_id', membership.org_id)
          .eq('is_active', true)
          .order('name')
      : { data: [] };
  const productOptions = (products ?? []) as ProductOption[];

  const createBatch = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const {
      data: { user: actionUser },
    } = await supabaseServer.auth.getUser();

    if (!actionUser) {
      redirect('/login');
    }

    const { data: actionMembership } = await supabaseServer
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', actionUser.id)
      .maybeSingle();

    if (!actionMembership?.org_id || actionMembership.role !== 'org_admin') {
      redirect('/no-access');
    }

    const branchId = String(formData.get('branch_id') ?? '').trim();
    const productId = String(formData.get('product_id') ?? '').trim();
    const expiresOn = String(formData.get('expires_on') ?? '').trim();
    const quantityRaw = String(formData.get('quantity') ?? '').trim();
    const quantity = Number.parseFloat(quantityRaw);

    const returnBranchId = String(
      formData.get('return_branch_id') ?? '',
    ).trim();
    const returnSeverity = String(formData.get('return_severity') ?? '').trim();

    const params = new URLSearchParams();
    if (returnBranchId) params.set('branch_id', returnBranchId);
    if (returnSeverity) params.set('severity', returnSeverity);

    if (!branchId || !productId || !expiresOn || Number.isNaN(quantity)) {
      params.set('notice', 'error');
      redirect(`/expirations?${params.toString()}`);
    }

    if (quantity <= 0) {
      params.set('notice', 'error');
      redirect(`/expirations?${params.toString()}`);
    }

    const { error } = await supabaseServer.rpc(
      'rpc_create_expiration_batch_manual',
      {
        p_org_id: actionMembership.org_id,
        p_branch_id: branchId,
        p_product_id: productId,
        p_expires_on: expiresOn,
        p_quantity: quantity,
        p_source_ref_id: null as unknown as string,
      },
    );

    if (error) {
      params.set('notice', 'error');
      redirect(`/expirations?${params.toString()}`);
    }

    revalidatePath('/expirations');
    params.set('notice', 'created');
    redirect(`/expirations?${params.toString()}`);
  };

  const adjustBatch = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const {
      data: { user: actionUser },
    } = await supabaseServer.auth.getUser();

    if (!actionUser) {
      redirect('/login');
    }

    const { data: actionMembership } = await supabaseServer
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', actionUser.id)
      .maybeSingle();

    if (!actionMembership?.org_id || actionMembership.role !== 'org_admin') {
      redirect('/no-access');
    }

    const batchId = String(formData.get('batch_id') ?? '').trim();
    const quantityRaw = String(formData.get('new_quantity') ?? '').trim();
    const newQuantity = Number.parseFloat(quantityRaw);

    const returnBranchId = String(
      formData.get('return_branch_id') ?? '',
    ).trim();
    const returnSeverity = String(formData.get('return_severity') ?? '').trim();
    const params = new URLSearchParams();
    if (returnBranchId) params.set('branch_id', returnBranchId);
    if (returnSeverity) params.set('severity', returnSeverity);

    if (!batchId || Number.isNaN(newQuantity) || newQuantity < 0) {
      params.set('notice', 'error');
      redirect(`/expirations?${params.toString()}`);
    }

    const { error } = await supabaseServer.rpc('rpc_adjust_expiration_batch', {
      p_org_id: actionMembership.org_id,
      p_batch_id: batchId,
      p_new_quantity: newQuantity,
    });

    if (error) {
      params.set('notice', 'error');
      redirect(`/expirations?${params.toString()}`);
    }

    revalidatePath('/expirations');
    params.set('notice', 'adjusted');
    redirect(`/expirations?${params.toString()}`);
  };

  const updateBatchDate = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const {
      data: { user: actionUser },
    } = await supabaseServer.auth.getUser();

    if (!actionUser) {
      redirect('/login');
    }

    const { data: actionMembership } = await supabaseServer
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', actionUser.id)
      .maybeSingle();

    if (!actionMembership?.org_id || actionMembership.role !== 'org_admin') {
      redirect('/no-access');
    }

    const batchId = String(formData.get('batch_id') ?? '').trim();
    const newExpiresOn = String(formData.get('new_expires_on') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();

    const returnBranchId = String(
      formData.get('return_branch_id') ?? '',
    ).trim();
    const returnSeverity = String(formData.get('return_severity') ?? '').trim();
    const params = new URLSearchParams();
    if (returnBranchId) params.set('branch_id', returnBranchId);
    if (returnSeverity) params.set('severity', returnSeverity);

    if (!batchId || !newExpiresOn || !reason) {
      params.set('notice', 'error');
      redirect(`/expirations?${params.toString()}`);
    }

    const { error } = await supabaseServer.rpc(
      'rpc_update_expiration_batch_date',
      {
        p_org_id: actionMembership.org_id,
        p_batch_id: batchId,
        p_new_expires_on: newExpiresOn,
        p_reason: reason,
      },
    );

    if (error) {
      params.set('notice', 'error');
      redirect(`/expirations?${params.toString()}`);
    }

    revalidatePath('/expirations');
    params.set('notice', 'dated');
    redirect(`/expirations?${params.toString()}`);
  };

  const notice =
    resolvedSearchParams.notice === 'created'
      ? { tone: 'success', message: 'Vencimiento registrado.' }
      : resolvedSearchParams.notice === 'adjusted'
        ? { tone: 'success', message: 'Vencimiento ajustado.' }
        : resolvedSearchParams.notice === 'dated'
          ? { tone: 'success', message: 'Fecha de vencimiento corregida.' }
          : resolvedSearchParams.notice === 'error'
            ? { tone: 'error', message: 'No pudimos guardar el vencimiento.' }
            : null;

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-900">Vencimientos</h1>
          <p className="text-sm text-zinc-500">
            Lotes por vencer creados automaticamente al recibir pedidos o de
            forma manual. Contrato: v_expirations_due.
          </p>
        </header>

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

        <section className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <form className="flex flex-wrap items-end gap-3" method="get">
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                Sucursal
                <select
                  name="branch_id"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  defaultValue={selectedBranchId}
                  required
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="severity" value={severityFilter} />
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700"
              >
                Filtrar
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {['all', 'critical', 'soon'].map((key) => {
                const isActive =
                  (key === 'all' && !severityFilter) || severityFilter === key;
                const params = buildSearchParams(resolvedSearchParams, {
                  severity: key === 'all' ? '' : key,
                });
                return (
                  <Link
                    key={key}
                    href={`/expirations${params ? `?${params}` : ''}`}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      isActive
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 text-zinc-600'
                    }`}
                  >
                    {severityLabels[key]}
                  </Link>
                );
              })}
            </div>
          </div>

          {membership.role === 'org_admin' ? (
            <details className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-zinc-900">
                Registrar vencimiento manual
                <span className="text-base text-zinc-500">▾</span>
              </summary>
              <form
                action={createBatch}
                className="mt-4 grid gap-3 md:grid-cols-2"
              >
                <label className="text-sm font-medium text-zinc-700">
                  Producto
                  <select
                    name="product_id"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Seleccionar producto</option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  type="hidden"
                  name="branch_id"
                  value={selectedBranchId}
                />
                <label className="text-sm font-medium text-zinc-700">
                  Fecha de vencimiento
                  <input
                    type="date"
                    name="expires_on"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-zinc-700">
                  Cantidad
                  <input
                    type="number"
                    name="quantity"
                    step="0.01"
                    min="0"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    required
                  />
                </label>
                <input
                  type="hidden"
                  name="return_branch_id"
                  value={selectedBranchId}
                />
                <input
                  type="hidden"
                  name="return_severity"
                  value={severityFilter}
                />
                <div className="flex items-center gap-3 md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Guardar vencimiento
                  </button>
                  <span className="text-xs text-zinc-500">
                    Los ajustes se reflejan en alertas automaticas.
                  </span>
                </div>
              </form>
            </details>
          ) : null}

          {expirationsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              No pudimos cargar vencimientos. Intentalo de nuevo.
            </div>
          ) : null}

          {expirationRows.length === 0 && !expirationsError ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
              No hay vencimientos proximos para este filtro.
            </div>
          ) : null}

          {expirationRows.length > 0 ? (
            <div className="grid gap-3">
              {expirationRows.map((row) => {
                const daysLeft = row.days_left ?? null;
                const severity =
                  daysLeft !== null && daysLeft <= 3
                    ? 'critical'
                    : daysLeft !== null && daysLeft <= 7
                      ? 'soon'
                      : 'info';
                return (
                  <div
                    key={row.batch_id}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-900">
                          {row.product_name ?? 'Producto'}
                        </h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${severityBadge[severity] ?? severityBadge.info}`}
                        >
                          {severityLabels[severity] ?? 'Info'}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-500">
                        Vence: {formatDate(row.expires_on)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                        {row.batch_code ? (
                          <span>
                            Batch:{' '}
                            <strong className="text-zinc-700">
                              {row.batch_code}
                            </strong>
                          </span>
                        ) : null}
                        <span>
                          Dias restantes:{' '}
                          <strong className="text-zinc-700">
                            {row.days_left ?? '-'}
                          </strong>
                        </span>
                        <span>
                          Cantidad:{' '}
                          <strong className="text-zinc-700">
                            {Number(row.quantity ?? 0).toLocaleString('es-AR')}
                          </strong>
                        </span>
                        {selectedBranchId === '' && row.branch_name ? (
                          <span>
                            Sucursal:{' '}
                            <strong className="text-zinc-700">
                              {row.branch_name}
                            </strong>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {membership.role === 'org_admin' ? (
                      <div className="flex w-full flex-col gap-2 md:w-64">
                        <details className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                          <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
                            Ajustar cantidad
                          </summary>
                          <form
                            action={adjustBatch}
                            className="mt-3 grid gap-2"
                          >
                            <input
                              type="hidden"
                              name="batch_id"
                              value={row.batch_id}
                            />
                            <input
                              type="hidden"
                              name="return_branch_id"
                              value={selectedBranchId}
                            />
                            <input
                              type="hidden"
                              name="return_severity"
                              value={severityFilter}
                            />
                            <label className="text-xs font-medium text-zinc-600">
                              Nueva cantidad
                              <input
                                type="number"
                                name="new_quantity"
                                step="0.01"
                                min="0"
                                defaultValue={row.quantity ?? 0}
                                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                              />
                            </label>
                            <button
                              type="submit"
                              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700"
                            >
                              Guardar ajuste
                            </button>
                          </form>
                        </details>
                        <details className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                          <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
                            Corregir fecha
                          </summary>
                          <form
                            action={updateBatchDate}
                            className="mt-3 grid gap-2"
                          >
                            <input
                              type="hidden"
                              name="batch_id"
                              value={row.batch_id}
                            />
                            <input
                              type="hidden"
                              name="return_branch_id"
                              value={selectedBranchId}
                            />
                            <input
                              type="hidden"
                              name="return_severity"
                              value={severityFilter}
                            />
                            <label className="text-xs font-medium text-zinc-600">
                              Nueva fecha
                              <input
                                type="date"
                                name="new_expires_on"
                                defaultValue={row.expires_on ?? ''}
                                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                required
                              />
                            </label>
                            <label className="text-xs font-medium text-zinc-600">
                              Motivo
                              <input
                                type="text"
                                name="reason"
                                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                placeholder="Ej: fecha real del proveedor"
                                required
                              />
                            </label>
                            <button
                              type="submit"
                              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700"
                            >
                              Guardar fecha
                            </button>
                          </form>
                        </details>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
