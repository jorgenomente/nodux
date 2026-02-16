import Link from 'next/link';
import { redirect } from 'next/navigation';

import DashboardFiltersClient from '@/app/dashboard/DashboardFiltersClient';
import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type SearchParams = {
  branch_id?: string;
};

type BranchOption = {
  id: string;
  name: string;
};

type DashboardRow = {
  org_id: string | null;
  branch_id: string | null;
  sales_today_total: number | null;
  sales_today_count: number | null;
  sales_week_total: number | null;
  sales_month_total: number | null;
  expirations_critical_count: number | null;
  expirations_warning_count: number | null;
  supplier_orders_pending_count: number | null;
  client_orders_pending_count: number | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    value,
  );

export default async function DashboardPage({
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

  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');
  const { data: membership } = isPlatformAdmin
    ? { data: null }
    : await supabase
        .from('org_users')
        .select('org_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

  let orgId = '';
  let canAccessDashboard = false;

  if (isPlatformAdmin) {
    const { data: activeOrgId } = await supabase.rpc('rpc_get_active_org_id');
    if (typeof activeOrgId === 'string' && activeOrgId) {
      orgId = activeOrgId;
      canAccessDashboard = true;
    } else {
      redirect('/superadmin?result=active_org_invalid');
    }
  } else if (
    membership?.org_id &&
    (membership.role === 'org_admin' || membership.role === 'superadmin')
  ) {
    orgId = membership.org_id;
    canAccessDashboard = true;
  }

  if (!canAccessDashboard || !orgId) {
    redirect('/no-access');
  }

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');
  const branchOptions = (branches ?? []) as BranchOption[];

  const requestedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedBranchId = branchOptions.some(
    (branch) => branch.id === requestedBranchId,
  )
    ? requestedBranchId
    : (branchOptions[0]?.id ?? '');

  const { data: dashboardData, error: dashboardError } = await supabase.rpc(
    'rpc_get_dashboard_admin',
    {
      p_org_id: orgId,
      p_branch_id: (selectedBranchId || null) as unknown as string,
    },
  );

  const dashboardRow = (dashboardData?.[0] as DashboardRow | undefined) ?? null;

  const salesTodayTotal = Number(dashboardRow?.sales_today_total ?? 0);
  const salesTodayCount = Number(dashboardRow?.sales_today_count ?? 0);
  const salesWeekTotal = Number(dashboardRow?.sales_week_total ?? 0);
  const salesMonthTotal = Number(dashboardRow?.sales_month_total ?? 0);
  const expirationsCritical = Number(
    dashboardRow?.expirations_critical_count ?? 0,
  );
  const expirationsWarning = Number(
    dashboardRow?.expirations_warning_count ?? 0,
  );
  const supplierOrdersPending = Number(
    dashboardRow?.supplier_orders_pending_count ?? 0,
  );
  const clientOrdersPending = Number(
    dashboardRow?.client_orders_pending_count ?? 0,
  );

  const alerts = [
    expirationsCritical > 0
      ? {
          key: 'expirations-critical',
          severity: 'critical',
          title: 'Vencimientos críticos',
          subtitle: `${expirationsCritical} productos por vencer en breve.`,
          href: '/expirations',
        }
      : null,
    expirationsWarning > 0
      ? {
          key: 'expirations-warning',
          severity: 'warning',
          title: 'Vencimientos próximos',
          subtitle: `${expirationsWarning} productos por vencer pronto.`,
          href: '/expirations',
        }
      : null,
    supplierOrdersPending > 0
      ? {
          key: 'supplier-orders',
          severity: 'info',
          title: 'Pedidos a proveedor pendientes',
          subtitle: `${supplierOrdersPending} pedidos en curso.`,
          href: '/orders',
        }
      : null,
    clientOrdersPending > 0
      ? {
          key: 'client-orders',
          severity: 'info',
          title: 'Pedidos especiales pendientes',
          subtitle: `${clientOrdersPending} pedidos de clientes.`,
          href: '/clients',
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    subtitle: string;
    href: string;
  }>;

  const severityStyles: Record<string, string> = {
    critical: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    info: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            Visión operativa del negocio. Contrato: rpc_get_dashboard_admin.
          </p>
        </header>

        <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <DashboardFiltersClient
            branches={branchOptions}
            selectedBranchId={selectedBranchId}
          />
          <div className="text-xs text-zinc-500">
            Mostrando:{' '}
            <strong className="text-zinc-700">
              {branchOptions.find((branch) => branch.id === selectedBranchId)
                ?.name ?? 'Sucursal'}
            </strong>
          </div>
        </section>

        {dashboardError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            No pudimos cargar el dashboard.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase">
              Ventas hoy
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(salesTodayTotal)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {salesTodayCount} ventas
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase">
              Ventas semana
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(salesWeekTotal)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Últimos 7 días</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase">
              Ventas mes
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {formatCurrency(salesMonthTotal)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Últimos 30 días</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase">
              Ítems vencimiento
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {expirationsCritical + expirationsWarning}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {expirationsCritical} críticos · {expirationsWarning} próximos
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Alertas críticas
            </h2>
            <Link
              href="/settings/preferences"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
            >
              Ajustar alertas
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
              Todo en orden por ahora.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {alerts.map((alert) => (
                <Link
                  key={alert.key}
                  href={alert.href}
                  className={`flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm transition hover:shadow-sm ${severityStyles[alert.severity]}`}
                >
                  <span className="text-sm font-semibold">{alert.title}</span>
                  <span className="text-xs">{alert.subtitle}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase">
              Vencimientos
            </p>
            <p className="mt-2 text-xl font-semibold text-zinc-900">
              {expirationsCritical + expirationsWarning}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {expirationsCritical} críticos · {expirationsWarning} próximos
            </p>
            <Link
              href="/expirations"
              className="mt-3 inline-flex text-xs font-semibold text-zinc-700 hover:text-zinc-900"
            >
              Ver vencimientos →
            </Link>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase">
              Pedidos proveedor
            </p>
            <p className="mt-2 text-xl font-semibold text-zinc-900">
              {supplierOrdersPending}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Pedidos en curso</p>
            <Link
              href="/orders"
              className="mt-3 inline-flex text-xs font-semibold text-zinc-700 hover:text-zinc-900"
            >
              Ver pedidos →
            </Link>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase">
              Pedidos clientes
            </p>
            <p className="mt-2 text-xl font-semibold text-zinc-900">
              {clientOrdersPending}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Pedidos pendientes</p>
            <Link
              href="/clients"
              className="mt-3 inline-flex text-xs font-semibold text-zinc-700 hover:text-zinc-900"
            >
              Ver pedidos →
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
