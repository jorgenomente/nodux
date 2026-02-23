import Link from 'next/link';
import { redirect } from 'next/navigation';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

export const dynamic = 'force-dynamic';

type SearchParams = {
  branch_id?: string;
  from_date?: string;
  to_date?: string;
  preset?: string;
};

type BranchOption = {
  id: string;
  name: string;
};

type SalesStatisticsRow = {
  sale_id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  created_at: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  supplier_id: string | null;
  supplier_name: string | null;
};

type AggregatedMetric = {
  key: string;
  label: string;
  units: number;
  revenue: number;
  saleCount: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatUnits = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 3,
  }).format(value);

const parseDateInputToIso = (value: string, endOfDay: boolean) => {
  if (!value) return '';
  const parsed = new Date(
    `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`,
  );
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetDates = (preset: string) => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const from = new Date(today);
  if (preset === 'last_7_days') {
    from.setDate(from.getDate() - 6);
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
  }
  if (preset === 'last_30_days') {
    from.setDate(from.getDate() - 29);
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
  }
  if (preset === 'last_90_days') {
    from.setDate(from.getDate() - 89);
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
  }
  if (preset === 'ytd') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return { from: toDateInputValue(startOfYear), to: toDateInputValue(to) };
  }
  return { from: '', to: '' };
};

const getIsoWeekLabel = (date: Date) => {
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
};

const sortByRevenueDesc = (a: AggregatedMetric, b: AggregatedMetric) =>
  b.revenue - a.revenue || b.units - a.units || b.saleCount - a.saleCount;

const sortByUnitsDesc = (a: AggregatedMetric, b: AggregatedMetric) =>
  b.units - a.units || b.revenue - a.revenue || b.saleCount - a.saleCount;

const sortByRevenueAsc = (a: AggregatedMetric, b: AggregatedMetric) =>
  a.revenue - b.revenue || a.units - b.units || a.saleCount - b.saleCount;

const sortByUnitsAsc = (a: AggregatedMetric, b: AggregatedMetric) =>
  a.units - b.units || a.revenue - b.revenue || a.saleCount - b.saleCount;

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

function RankingTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: AggregatedMetric[];
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Sin datos para este período.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-zinc-500 uppercase">
              <tr>
                <th className="px-2 py-1">Nombre</th>
                <th className="px-2 py-1 text-right">Unidades</th>
                <th className="px-2 py-1 text-right">Ingresos</th>
                <th className="px-2 py-1 text-right">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${title}-${row.key}`}
                  className="border-t border-zinc-100"
                >
                  <td className="px-2 py-1 text-zinc-800">{row.label}</td>
                  <td className="px-2 py-1 text-right text-zinc-700">
                    {formatUnits(row.units)}
                  </td>
                  <td className="px-2 py-1 text-right text-zinc-700">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-2 py-1 text-right text-zinc-700">
                    {row.saleCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default async function SalesStatisticsPage({
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

  const selectedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedPreset =
    typeof resolvedSearchParams.preset === 'string'
      ? resolvedSearchParams.preset
      : 'all_time';
  const manualFromDate =
    typeof resolvedSearchParams.from_date === 'string'
      ? resolvedSearchParams.from_date
      : '';
  const manualToDate =
    typeof resolvedSearchParams.to_date === 'string'
      ? resolvedSearchParams.to_date
      : '';

  const presetDates =
    manualFromDate || manualToDate
      ? { from: '', to: '' }
      : getPresetDates(selectedPreset);
  const effectiveFromDate = manualFromDate || presetDates.from;
  const effectiveToDate = manualToDate || presetDates.to;
  const effectiveFromIso = parseDateInputToIso(effectiveFromDate, false);
  const effectiveToIso = parseDateInputToIso(effectiveToDate, true);

  let query = supabase
    .from('v_sales_statistics_items' as never)
    .select('*')
    .eq('org_id', orgId);

  if (selectedBranchId) {
    query = query.eq('branch_id', selectedBranchId);
  }
  if (effectiveFromIso) {
    query = query.gte('created_at', effectiveFromIso);
  }
  if (effectiveToIso) {
    query = query.lte('created_at', effectiveToIso);
  }

  const { data: statisticsData } = await query;
  const rows = (statisticsData ?? []) as unknown as SalesStatisticsRow[];

  const saleIds = new Set<string>();
  const productMap = new Map<
    string,
    {
      key: string;
      label: string;
      units: number;
      revenue: number;
      sales: Set<string>;
    }
  >();
  const supplierMap = new Map<
    string,
    {
      key: string;
      label: string;
      units: number;
      revenue: number;
      sales: Set<string>;
    }
  >();
  const dayMap = new Map<
    string,
    {
      key: string;
      label: string;
      units: number;
      revenue: number;
      sales: Set<string>;
    }
  >();
  const weekMap = new Map<
    string,
    {
      key: string;
      label: string;
      units: number;
      revenue: number;
      sales: Set<string>;
    }
  >();
  const monthMap = new Map<
    string,
    {
      key: string;
      label: string;
      units: number;
      revenue: number;
      sales: Set<string>;
    }
  >();
  const weekdayMap = new Map<
    string,
    {
      key: string;
      label: string;
      units: number;
      revenue: number;
      sales: Set<string>;
    }
  >();

  let totalUnits = 0;
  let totalRevenue = 0;

  rows.forEach((row) => {
    const saleId = String(row.sale_id ?? '').trim();
    if (!saleId) return;

    const units = Number(row.quantity ?? 0);
    const revenue = Number(row.line_total ?? 0);
    if (!Number.isFinite(units) || !Number.isFinite(revenue)) return;

    const createdAt = new Date(row.created_at);
    if (Number.isNaN(createdAt.getTime())) return;

    saleIds.add(saleId);
    totalUnits += units;
    totalRevenue += revenue;

    const productKey =
      String(row.product_id ?? '').trim() || `product-${row.product_name}`;
    const productLabel = String(row.product_name ?? '').trim() || 'Producto';
    const productCurrent = productMap.get(productKey) ?? {
      key: productKey,
      label: productLabel,
      units: 0,
      revenue: 0,
      sales: new Set<string>(),
    };
    productCurrent.units += units;
    productCurrent.revenue += revenue;
    productCurrent.sales.add(saleId);
    productMap.set(productKey, productCurrent);

    const supplierKey =
      String(row.supplier_id ?? '').trim() || '__without_primary_supplier__';
    const supplierLabel =
      String(row.supplier_name ?? '').trim() || 'Sin proveedor primario';
    const supplierCurrent = supplierMap.get(supplierKey) ?? {
      key: supplierKey,
      label: supplierLabel,
      units: 0,
      revenue: 0,
      sales: new Set<string>(),
    };
    supplierCurrent.units += units;
    supplierCurrent.revenue += revenue;
    supplierCurrent.sales.add(saleId);
    supplierMap.set(supplierKey, supplierCurrent);

    const dayKey = toDateInputValue(createdAt);
    const dayCurrent = dayMap.get(dayKey) ?? {
      key: dayKey,
      label: dayKey,
      units: 0,
      revenue: 0,
      sales: new Set<string>(),
    };
    dayCurrent.units += units;
    dayCurrent.revenue += revenue;
    dayCurrent.sales.add(saleId);
    dayMap.set(dayKey, dayCurrent);

    const weekKey = getIsoWeekLabel(createdAt);
    const weekCurrent = weekMap.get(weekKey) ?? {
      key: weekKey,
      label: weekKey,
      units: 0,
      revenue: 0,
      sales: new Set<string>(),
    };
    weekCurrent.units += units;
    weekCurrent.revenue += revenue;
    weekCurrent.sales.add(saleId);
    weekMap.set(weekKey, weekCurrent);

    const monthKey = `${createdAt.getFullYear()}-${String(
      createdAt.getMonth() + 1,
    ).padStart(2, '0')}`;
    const monthCurrent = monthMap.get(monthKey) ?? {
      key: monthKey,
      label: monthKey,
      units: 0,
      revenue: 0,
      sales: new Set<string>(),
    };
    monthCurrent.units += units;
    monthCurrent.revenue += revenue;
    monthCurrent.sales.add(saleId);
    monthMap.set(monthKey, monthCurrent);

    const weekdayIndex = createdAt.getDay();
    const weekdayKey = String(weekdayIndex);
    const weekdayCurrent = weekdayMap.get(weekdayKey) ?? {
      key: weekdayKey,
      label: WEEKDAY_LABELS[weekdayIndex] ?? `Día ${weekdayIndex}`,
      units: 0,
      revenue: 0,
      sales: new Set<string>(),
    };
    weekdayCurrent.units += units;
    weekdayCurrent.revenue += revenue;
    weekdayCurrent.sales.add(saleId);
    weekdayMap.set(weekdayKey, weekdayCurrent);
  });

  const toAggregatedRows = (
    source: Map<
      string,
      {
        key: string;
        label: string;
        units: number;
        revenue: number;
        sales: Set<string>;
      }
    >,
  ): AggregatedMetric[] =>
    Array.from(source.values()).map((item) => ({
      key: item.key,
      label: item.label,
      units: item.units,
      revenue: item.revenue,
      saleCount: item.sales.size,
    }));

  const products = toAggregatedRows(productMap);
  const suppliers = toAggregatedRows(supplierMap);
  const days = toAggregatedRows(dayMap);
  const weeks = toAggregatedRows(weekMap);
  const months = toAggregatedRows(monthMap);
  const weekdays = WEEKDAY_ORDER.map((weekday) => {
    const current = weekdayMap.get(String(weekday));
    return {
      key: String(weekday),
      label: WEEKDAY_LABELS[weekday],
      units: current?.units ?? 0,
      revenue: current?.revenue ?? 0,
      saleCount: current?.sales.size ?? 0,
    };
  });

  const topProductsByUnits = [...products].sort(sortByUnitsDesc).slice(0, 10);
  const topProductsByRevenue = [...products]
    .sort(sortByRevenueDesc)
    .slice(0, 10);
  const lowProductsByUnits = [...products].sort(sortByUnitsAsc).slice(0, 10);
  const lowProductsByRevenue = [...products]
    .sort(sortByRevenueAsc)
    .slice(0, 10);

  const topSuppliersByRevenue = [...suppliers]
    .sort(sortByRevenueDesc)
    .slice(0, 10);
  const lowSuppliersByUnits = [...suppliers].sort(sortByUnitsAsc).slice(0, 10);

  const bestDays = [...days].sort(sortByRevenueDesc).slice(0, 10);
  const bestWeeks = [...weeks].sort(sortByRevenueDesc).slice(0, 10);
  const bestMonths = [...months].sort(sortByRevenueDesc).slice(0, 10);

  const averageTicket = saleIds.size > 0 ? totalRevenue / saleIds.size : 0;
  const selectedBranchName =
    branches.find((branch) => branch.id === selectedBranchId)?.name ?? '';

  const buildPresetHref = (preset: string) => {
    const params = new URLSearchParams();
    if (selectedBranchId) {
      params.set('branch_id', selectedBranchId);
    }
    params.set('preset', preset);
    return `/sales/statistics?${params.toString()}`;
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">
              Estadísticas de ventas
            </h1>
            <p className="text-sm text-zinc-500">
              Analiza productos, proveedores y tendencias por día/semana/mes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sales"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
            >
              Volver a ventas
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">
            Periodo activo:{' '}
            <span className="font-medium text-zinc-900">
              {effectiveFromDate || 'Inicio histórico'} →{' '}
              {effectiveToDate || 'Hasta hoy'}
            </span>
            {selectedBranchName ? (
              <span className="text-zinc-500">
                {' '}
                · Sucursal: {selectedBranchName}
              </span>
            ) : (
              <span className="text-zinc-500"> · Todas las sucursales</span>
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={buildPresetHref('all_time')}
              className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
            >
              Histórico completo
            </Link>
            <Link
              href={buildPresetHref('ytd')}
              className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
            >
              Año actual
            </Link>
            <Link
              href={buildPresetHref('last_90_days')}
              className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
            >
              Últimos 90 días
            </Link>
            <Link
              href={buildPresetHref('last_30_days')}
              className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
            >
              Últimos 30 días
            </Link>
            <Link
              href={buildPresetHref('last_7_days')}
              className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
            >
              Últimos 7 días
            </Link>
          </div>

          <form method="get" className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Sucursal
              <select
                name="branch_id"
                defaultValue={selectedBranchId}
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
              Desde
              <input
                name="from_date"
                type="date"
                defaultValue={effectiveFromDate}
                className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Hasta
              <input
                name="to_date"
                type="date"
                defaultValue={effectiveToDate}
                className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Aplicar
              </button>
              <Link
                href="/sales/statistics"
                className="rounded border border-zinc-200 px-4 py-2 text-sm text-zinc-700"
              >
                Limpiar
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-3 md:grid-cols-5">
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Ventas
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {saleIds.size}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Ingresos
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(totalRevenue)}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Unidades
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatUnits(totalUnits)}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Ticket promedio
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(averageTicket)}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Productos vendidos
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {products.length}
            </p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <RankingTable
            title="Productos más vendidos (unidades)"
            subtitle="Top 10 por cantidad de unidades vendidas."
            rows={topProductsByUnits}
          />
          <RankingTable
            title="Productos que más facturan"
            subtitle="Top 10 por ingresos totales."
            rows={topProductsByRevenue}
          />
          <RankingTable
            title="Productos con menor movimiento (unidades)"
            subtitle="Bottom 10 del período seleccionado."
            rows={lowProductsByUnits}
          />
          <RankingTable
            title="Productos con menor facturación"
            subtitle="Bottom 10 por ingresos del período."
            rows={lowProductsByRevenue}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <RankingTable
            title="Proveedores más relevantes"
            subtitle="Top 10 por ingresos de productos vendidos."
            rows={topSuppliersByRevenue}
          />
          <RankingTable
            title="Proveedores con menor movimiento"
            subtitle="Bottom 10 por unidades vendidas."
            rows={lowSuppliersByUnits}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <RankingTable
            title="Ventas por día de la semana"
            subtitle="Comparativo por ingresos para identificar qué día rinde más."
            rows={[...weekdays].sort(sortByRevenueDesc)}
          />
          <RankingTable
            title="Días con más ventas"
            subtitle="Top 10 días por ingresos."
            rows={bestDays}
          />
          <RankingTable
            title="Semanas con más ventas"
            subtitle="Top 10 semanas ISO por ingresos."
            rows={bestWeeks}
          />
          <RankingTable
            title="Meses con más ventas"
            subtitle="Top 10 meses por ingresos."
            rows={bestMonths}
          />
        </section>
      </div>
    </PageShell>
  );
}
