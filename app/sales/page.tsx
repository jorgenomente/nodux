import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import AmountInputAR from '@/app/components/AmountInputAR';
import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

export const dynamic = 'force-dynamic';

type SearchParams = {
  branch_id?: string;
  payment_method?: string;
  min_amount?: string;
  max_amount?: string;
  from_at?: string;
  to_at?: string;
  q?: string;
  scope?: string;
  debug?: string;
};

type BranchOption = {
  id: string;
  name: string;
};

type SaleRow = {
  sale_id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  created_at: string;
  created_by: string;
  created_by_name: string;
  employee_account_id: string | null;
  employee_name_snapshot: string | null;
  payment_method_summary: string;
  subtotal_amount: number;
  discount_amount: number;
  discount_pct: number;
  cash_discount_amount: number;
  cash_discount_pct: number;
  employee_discount_applied: boolean;
  employee_discount_amount: number;
  employee_discount_pct: number;
  total_amount: number;
  items_count: number;
  items_qty_total: number;
  item_names_summary: string;
  item_names_search: string;
  payment_methods: string[];
  cash_amount: number;
  card_amount: number;
  mercadopago_amount: number;
  other_amount: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR', { hour12: false });
};

const formatPaymentMethod = (value: string) => {
  switch (value) {
    case 'cash':
      return 'Efectivo';
    case 'card':
      return 'Tarjeta';
    case 'mercadopago':
      return 'MercadoPago';
    case 'mixed':
      return 'Mixto';
    case 'debit':
      return 'Débito';
    case 'credit':
      return 'Crédito';
    case 'transfer':
      return 'Transferencia';
    case 'other':
      return 'Otro';
    default:
      return value;
  }
};

const toIsoFromDatetimeLocal = (value: string | undefined) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
};

const toDatetimeLocalValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId) {
    redirect('/no-access');
  }

  const supabase = session.supabase;
  const orgId = session.orgId;

  const { data: branchesData } = await supabase
    .from('branches')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');
  const branches = (branchesData ?? []) as BranchOption[];
  const branchIds = new Set(branches.map((branch) => branch.id));
  const cookieStore = await cookies();
  const posBranchCookie =
    cookieStore.get('nodux_active_branch_id')?.value ?? '';

  const selectedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const scopeMode =
    typeof resolvedSearchParams.scope === 'string'
      ? resolvedSearchParams.scope
      : '';
  const forceAllBranches = scopeMode === 'all';
  const debugEnabled =
    typeof resolvedSearchParams.debug === 'string' &&
    resolvedSearchParams.debug === '1';
  const effectiveBranchId = selectedBranchId
    ? selectedBranchId
    : forceAllBranches
      ? ''
      : branchIds.has(posBranchCookie)
        ? posBranchCookie
        : '';
  const selectedMethod =
    typeof resolvedSearchParams.payment_method === 'string'
      ? resolvedSearchParams.payment_method
      : '';
  const minAmountRaw =
    typeof resolvedSearchParams.min_amount === 'string'
      ? resolvedSearchParams.min_amount
      : '';
  const maxAmountRaw =
    typeof resolvedSearchParams.max_amount === 'string'
      ? resolvedSearchParams.max_amount
      : '';
  const fromAtRaw =
    typeof resolvedSearchParams.from_at === 'string'
      ? resolvedSearchParams.from_at
      : '';
  const toAtRaw =
    typeof resolvedSearchParams.to_at === 'string'
      ? resolvedSearchParams.to_at
      : '';
  const searchRaw =
    typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  const minAmount = Number(minAmountRaw);
  const maxAmount = Number(maxAmountRaw);

  const hasManualFilters = Boolean(
    selectedBranchId ||
    selectedMethod ||
    minAmountRaw ||
    maxAmountRaw ||
    fromAtRaw ||
    toAtRaw ||
    searchRaw.trim(),
  );

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 0, 0);

  const effectiveFromAtLocal = fromAtRaw || toDatetimeLocalValue(startOfToday);
  const effectiveToAtLocal = toAtRaw || toDatetimeLocalValue(endOfToday);
  const fromAtIso = toIsoFromDatetimeLocal(effectiveFromAtLocal);
  const toAtIso = toIsoFromDatetimeLocal(effectiveToAtLocal);

  let query = supabase
    .from('v_sales_admin' as never)
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(300);

  if (effectiveBranchId) {
    query = query.eq('branch_id', effectiveBranchId);
  }
  if (selectedMethod) {
    query = query.contains('payment_methods', [selectedMethod]);
  }
  if (minAmountRaw.trim() !== '' && Number.isFinite(minAmount)) {
    query = query.gte('total_amount', minAmount);
  }
  if (maxAmountRaw.trim() !== '' && Number.isFinite(maxAmount)) {
    query = query.lte('total_amount', maxAmount);
  }
  if (fromAtIso) {
    query = query.gte('created_at', fromAtIso);
  }
  if (toAtIso) {
    query = query.lte('created_at', toAtIso);
  }
  if (searchRaw.trim().length >= 2) {
    query = query.or(
      `item_names_search.ilike.%${searchRaw.trim()}%,created_by_name.ilike.%${searchRaw.trim()}%,employee_name_snapshot.ilike.%${searchRaw.trim()}%,branch_name.ilike.%${searchRaw.trim()}%`,
    );
  }

  const { data: salesData } = await query;
  const sales = (salesData ?? []) as SaleRow[];

  const debugBaseQuery = supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', fromAtIso)
    .lte('created_at', toAtIso);
  const { count: debugSalesCount } = effectiveBranchId
    ? await debugBaseQuery.eq('branch_id', effectiveBranchId)
    : await debugBaseQuery;

  const totals = sales.reduce(
    (acc, row) => {
      acc.total += Number(row.total_amount ?? 0);
      acc.cash += Number(row.cash_amount ?? 0);
      acc.card += Number(row.card_amount ?? 0);
      acc.mercadopago += Number(row.mercadopago_amount ?? 0);
      return acc;
    },
    { total: 0, cash: 0, card: 0, mercadopago: 0 },
  );

  const effectiveBranchName =
    branches.find((branch) => branch.id === effectiveBranchId)?.name ?? null;

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Ventas</h1>
            <p className="text-sm text-zinc-500">
              Historial de ventas para auditoría operativa y control de caja.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sales/statistics"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
            >
              Ver estadísticas
            </Link>
            <Link
              href="/cashbox"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
            >
              Ir a caja
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 text-sm text-zinc-600">
            Mostrando ventas de hoy por defecto (
            {startOfToday.toLocaleDateString('es-AR')})
            {effectiveBranchName ? ` · Sucursal: ${effectiveBranchName}` : ''}.
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>
              Rango activo: {effectiveFromAtLocal} → {effectiveToAtLocal}
            </span>
            {posBranchCookie ? (
              <span>· Cookie POS: {posBranchCookie}</span>
            ) : null}
            <Link
              href="/sales?scope=all"
              className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
            >
              Ver hoy (todas las sucursales)
            </Link>
          </div>
          {debugEnabled ? (
            <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              debug org_id={orgId} | branch_id={effectiveBranchId || 'ALL'} |
              sales_count_raw={debugSalesCount ?? 0} | rows_view={sales.length}
            </div>
          ) : null}
          <details open={hasManualFilters} className="group">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-800 select-none">
              Filtros avanzados
            </summary>
            <form method="get" className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Sucursal
                <select
                  name="branch_id"
                  defaultValue={effectiveBranchId}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="">Todas</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Método de pago
                <select
                  name="payment_method"
                  defaultValue={selectedMethod}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="">Todos</option>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="mercadopago">MercadoPago</option>
                  <option value="debit">Débito</option>
                  <option value="credit">Crédito</option>
                  <option value="transfer">Transferencia</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Monto mínimo
                <AmountInputAR
                  name="min_amount"
                  defaultValue={minAmountRaw}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Monto máximo
                <AmountInputAR
                  name="max_amount"
                  defaultValue={maxAmountRaw}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Desde (fecha/hora)
                <input
                  name="from_at"
                  type="datetime-local"
                  defaultValue={effectiveFromAtLocal}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Hasta (fecha/hora)
                <input
                  name="to_at"
                  type="datetime-local"
                  defaultValue={effectiveToAtLocal}
                  className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
                Buscar por ítems, sucursal o usuario
                <input
                  name="q"
                  defaultValue={searchRaw}
                  placeholder="Ej: coca 2.25, caja 1, paola"
                  className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <div className="flex items-center gap-2 md:col-span-4">
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Aplicar filtros
                </button>
                <Link
                  href="/sales"
                  className="rounded border border-zinc-200 px-4 py-2 text-sm text-zinc-700"
                >
                  Volver a hoy
                </Link>
                <input type="hidden" name="scope" value={scopeMode} />
                <input
                  type="hidden"
                  name="debug"
                  value={debugEnabled ? '1' : '0'}
                />
              </div>
            </form>
          </details>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Total filtrado
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(totals.total)}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Efectivo
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(totals.cash)}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Tarjeta
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(totals.card)}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              MercadoPago
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(totals.mercadopago)}
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          {sales.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">
                No hay ventas para los filtros seleccionados.
              </p>
              <Link
                href="/sales"
                className="rounded border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
              >
                Ver ventas de hoy
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Hora</th>
                    <th className="px-3 py-2">Sucursal</th>
                    <th className="px-3 py-2">Ítems</th>
                    <th className="px-3 py-2">Métodos</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.sale_id} className="border-t border-zinc-100">
                      <td className="px-3 py-2">
                        {formatDateTime(sale.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-zinc-900">
                          {sale.branch_name ?? '—'}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {sale.created_by_name}
                        </div>
                        {sale.employee_name_snapshot ? (
                          <div className="text-xs text-amber-700">
                            Empleado: {sale.employee_name_snapshot}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div>{sale.items_count} productos</div>
                        <div className="max-w-[300px] truncate text-xs text-zinc-500">
                          {sale.item_names_summary || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(sale.payment_methods ?? []).map((method) => (
                            <span
                              key={`${sale.sale_id}-${method}`}
                              className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                            >
                              {formatPaymentMethod(method)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-zinc-900">
                        {formatCurrency(Number(sale.total_amount ?? 0))}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/sales/${sale.sale_id}`}
                          className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
