import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

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

type SupplierPayableRow = {
  payable_id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  supplier_id: string;
  supplier_name: string | null;
  order_id: string;
  order_status: string;
  payable_status: string;
  payment_state: string;
  estimated_amount: number | string | null;
  invoice_amount: number | string | null;
  paid_amount: number | string | null;
  outstanding_amount: number | string | null;
  due_on: string | null;
  is_overdue: boolean | null;
  created_at: string;
};

type AggregatedMetric = {
  key: string;
  label: string;
  units: number;
  revenue: number;
  saleCount: number;
};

type SupplierPaymentsMetric = {
  key: string;
  label: string;
  ordersCount: number;
  totalPaid: number;
  totalOutstanding: number;
  totalInvoiced: number;
  overdueCount: number;
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

const getPresetLabel = (preset: string) => {
  if (preset === 'ytd') return 'Año actual';
  if (preset === 'last_90_days') return 'Últimos 90 días';
  if (preset === 'last_30_days') return 'Últimos 30 días';
  if (preset === 'last_7_days') return 'Últimos 7 días';
  return 'Histórico completo';
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

const sortSupplierByPaidDesc = (
  a: SupplierPaymentsMetric,
  b: SupplierPaymentsMetric,
) =>
  b.totalPaid - a.totalPaid ||
  b.ordersCount - a.ordersCount ||
  b.totalOutstanding - a.totalOutstanding;

const sortSupplierByOutstandingDesc = (
  a: SupplierPaymentsMetric,
  b: SupplierPaymentsMetric,
) =>
  b.totalOutstanding - a.totalOutstanding ||
  b.ordersCount - a.ordersCount ||
  b.totalPaid - a.totalPaid;

const sortSupplierByOrdersDesc = (
  a: SupplierPaymentsMetric,
  b: SupplierPaymentsMetric,
) =>
  b.ordersCount - a.ordersCount ||
  b.totalPaid - a.totalPaid ||
  b.totalOutstanding - a.totalOutstanding;

const sortSupplierByOrdersAsc = (
  a: SupplierPaymentsMetric,
  b: SupplierPaymentsMetric,
) =>
  a.ordersCount - b.ordersCount ||
  a.totalPaid - b.totalPaid ||
  a.totalOutstanding - b.totalOutstanding;

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

function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-2xl border border-zinc-200 bg-white"
    >
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>
          <span className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600">
            Desplegar
          </span>
        </div>
      </summary>
      <div className="border-t border-zinc-100 p-4">{children}</div>
    </details>
  );
}

function SupplierPaymentsTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: SupplierPaymentsMetric[];
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Sin cuentas por pagar para este período.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-zinc-500 uppercase">
              <tr>
                <th className="px-2 py-1">Proveedor</th>
                <th className="px-2 py-1 text-right">Pedidos</th>
                <th className="px-2 py-1 text-right">Pagado</th>
                <th className="px-2 py-1 text-right">Pendiente</th>
                <th className="px-2 py-1 text-right">Vencidas</th>
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
                    {row.ordersCount}
                  </td>
                  <td className="px-2 py-1 text-right text-zinc-700">
                    {formatCurrency(row.totalPaid)}
                  </td>
                  <td className="px-2 py-1 text-right text-zinc-700">
                    {formatCurrency(row.totalOutstanding)}
                  </td>
                  <td className="px-2 py-1 text-right text-zinc-700">
                    {row.overdueCount}
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
  const allBranches = (branchesData ?? []) as BranchOption[];

  const { data: branchMembershipsData } = await supabase
    .from('branch_memberships')
    .select('branch_id')
    .eq('org_id', orgId)
    .eq('user_id', session.userId)
    .eq('is_active', true);

  const membershipBranchIds = new Set(
    (branchMembershipsData ?? [])
      .map((row) => String(row.branch_id ?? '').trim())
      .filter(Boolean),
  );
  const assignedBranches =
    membershipBranchIds.size > 0
      ? allBranches.filter((branch) => membershipBranchIds.has(branch.id))
      : [];
  const hasSingleAssignedBranch = assignedBranches.length === 1;
  const forcedBranchId = hasSingleAssignedBranch ? assignedBranches[0].id : '';
  const branches =
    membershipBranchIds.size > 0 ? assignedBranches : allBranches;
  const branchIds = new Set(branches.map((branch) => branch.id));

  const requestedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedBranchId = hasSingleAssignedBranch
    ? forcedBranchId
    : branchIds.has(requestedBranchId)
      ? requestedBranchId
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

  let payablesQuery = supabase
    .from('v_supplier_payables_admin' as never)
    .select('*')
    .eq('org_id', orgId);

  if (selectedBranchId) {
    payablesQuery = payablesQuery.eq('branch_id', selectedBranchId);
  }
  if (effectiveFromIso) {
    payablesQuery = payablesQuery.gte('created_at', effectiveFromIso);
  }
  if (effectiveToIso) {
    payablesQuery = payablesQuery.lte('created_at', effectiveToIso);
  }

  const { data: payablesData } = await payablesQuery;
  const supplierPayables = (payablesData ?? []) as unknown as SupplierPayableRow[];

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

  const supplierPaymentsMap = new Map<string, SupplierPaymentsMetric>();
  let totalSupplierPaid = 0;
  let totalSupplierOutstanding = 0;
  let supplierOverduePayablesCount = 0;

  supplierPayables.forEach((row) => {
    const supplierKey = String(row.supplier_id ?? '').trim();
    if (!supplierKey) return;

    const paidAmount = Number(row.paid_amount ?? 0);
    const outstandingAmount = Number(row.outstanding_amount ?? 0);
    const invoiceAmount = Number(row.invoice_amount ?? row.estimated_amount ?? 0);
    const isOverdue = Boolean(row.is_overdue) || row.payment_state === 'overdue';

    const safePaidAmount = Number.isFinite(paidAmount) ? paidAmount : 0;
    const safeOutstandingAmount = Number.isFinite(outstandingAmount)
      ? outstandingAmount
      : 0;
    const safeInvoiceAmount = Number.isFinite(invoiceAmount) ? invoiceAmount : 0;

    totalSupplierPaid += safePaidAmount;
    totalSupplierOutstanding += safeOutstandingAmount;
    if (isOverdue) {
      supplierOverduePayablesCount += 1;
    }

    const current = supplierPaymentsMap.get(supplierKey) ?? {
      key: supplierKey,
      label: String(row.supplier_name ?? '').trim() || 'Proveedor sin nombre',
      ordersCount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      totalInvoiced: 0,
      overdueCount: 0,
    };

    current.ordersCount += 1;
    current.totalPaid += safePaidAmount;
    current.totalOutstanding += safeOutstandingAmount;
    current.totalInvoiced += safeInvoiceAmount;
    if (isOverdue) {
      current.overdueCount += 1;
    }

    supplierPaymentsMap.set(supplierKey, current);
  });

  const supplierPaymentsRows = Array.from(supplierPaymentsMap.values());
  const topSuppliersByPaid = [...supplierPaymentsRows]
    .sort(sortSupplierByPaidDesc)
    .slice(0, 10);
  const topSuppliersByOutstanding = [...supplierPaymentsRows]
    .sort(sortSupplierByOutstandingDesc)
    .slice(0, 10);
  const frequentSuppliers = [...supplierPaymentsRows]
    .sort(sortSupplierByOrdersDesc)
    .slice(0, 10);
  const leastFrequentSuppliers = [...supplierPaymentsRows]
    .filter((row) => row.ordersCount > 0)
    .sort(sortSupplierByOrdersAsc)
    .slice(0, 10);

  const averageTicket = saleIds.size > 0 ? totalRevenue / saleIds.size : 0;
  const selectedBranchName =
    branches.find((branch) => branch.id === selectedBranchId)?.name ?? '';
  const activePresetLabel = getPresetLabel(selectedPreset);
  const activeModeLabel =
    manualFromDate || manualToDate ? 'Rango manual' : activePresetLabel;
  const isSingleBranchScoped = hasSingleAssignedBranch;

  const buildPresetHref = (preset: string) => {
    const params = new URLSearchParams();
    if (isSingleBranchScoped && forcedBranchId) {
      params.set('branch_id', forcedBranchId);
    } else if (selectedBranchId) {
      params.set('branch_id', selectedBranchId);
    }
    params.set('preset', preset);
    return `/sales/statistics?${params.toString()}`;
  };

  const clearHref =
    isSingleBranchScoped && forcedBranchId
      ? `/sales/statistics?branch_id=${forcedBranchId}`
      : '/sales/statistics';

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
                disabled={isSingleBranchScoped}
                className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              >
                {!isSingleBranchScoped ? <option value="">Todas</option> : null}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {isSingleBranchScoped ? (
                <span className="text-[11px] text-zinc-500">
                  Sucursal fija por asignación de usuario.
                </span>
              ) : null}
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
              {isSingleBranchScoped && forcedBranchId ? (
                <input type="hidden" name="branch_id" value={forcedBranchId} />
              ) : null}
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Aplicar
              </button>
              <Link
                href={clearHref}
                className="rounded border border-zinc-200 px-4 py-2 text-sm text-zinc-700"
              >
                Limpiar
              </Link>
            </div>
          </form>

          <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-xs font-semibold tracking-wide text-zinc-700 uppercase">
              Mostrando
            </p>
            <p className="mt-1 text-sm text-zinc-700">
              Configuración activa:{' '}
              <span className="font-medium text-zinc-900">
                {selectedBranchName || 'Todas las sucursales'} ·{' '}
                {effectiveFromDate || 'Inicio histórico'} →{' '}
                {effectiveToDate || 'Hasta hoy'} · {activeModeLabel}
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Esta configuración aplica a ventas de artículos y a proveedores y
              pagos.
            </p>
          </div>
        </section>

        <CollapsibleSection
          title="Ventas de artículos"
          description="Todo lo relacionado al rendimiento de ventas y tendencias temporales."
          defaultOpen
        >
          <div className="grid gap-3 md:grid-cols-5">
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
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
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
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Proveedores y pagos"
          description="Pagos hechos a proveedores, saldos pendientes y frecuencia de pedidos por proveedor."
        >
          <div className="grid gap-3 md:grid-cols-5">
            <article className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Cuentas
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {supplierPayables.length}
              </p>
            </article>
            <article className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Pagado
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {formatCurrency(totalSupplierPaid)}
              </p>
            </article>
            <article className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Pendiente
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {formatCurrency(totalSupplierOutstanding)}
              </p>
            </article>
            <article className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Vencidas
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {supplierOverduePayablesCount}
              </p>
            </article>
            <article className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Proveedores activos
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {supplierPaymentsRows.length}
              </p>
            </article>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SupplierPaymentsTable
              title="Proveedores más importantes"
              subtitle="Top 10 por monto total pagado."
              rows={topSuppliersByPaid}
            />
            <SupplierPaymentsTable
              title="Proveedores con mayor saldo pendiente"
              subtitle="Top 10 por deuda abierta."
              rows={topSuppliersByOutstanding}
            />
            <SupplierPaymentsTable
              title="Proveedores más frecuentes"
              subtitle="Top 10 por cantidad de pedidos/facturas."
              rows={frequentSuppliers}
            />
            <SupplierPaymentsTable
              title="Proveedores menos solicitados"
              subtitle="Bottom 10 por cantidad de pedidos/facturas."
              rows={leastFrequentSuppliers}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <RankingTable
              title="Proveedores más relevantes en ventas"
              subtitle="Top 10 por ingresos de productos vendidos."
              rows={topSuppliersByRevenue}
            />
            <RankingTable
              title="Proveedores con menor movimiento en ventas"
              subtitle="Bottom 10 por unidades vendidas."
              rows={lowSuppliersByUnits}
            />
          </div>
        </CollapsibleSection>
      </div>
    </PageShell>
  );
}
