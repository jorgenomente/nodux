import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import AmountInputAR from '@/app/components/AmountInputAR';
import PageShell from '@/app/components/PageShell';
import CashCountPairFields from '@/app/cashbox/CashCountPairFields';
import CashboxReconciliationSection from '@/app/cashbox/CashboxReconciliationSection';
import OpenCashSessionMetaFields from '@/app/cashbox/OpenCashSessionMetaFields';
import SystemDateTimeBadge from '@/app/cashbox/SystemDateTimeBadge';
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
  branch_id?: string;
  result?: string;
};

type BranchOption = {
  id: string;
  name: string;
};

type SessionSummary = {
  session_id: string;
  branch_id: string;
  status: 'open' | 'closed';
  period_type: 'shift' | 'day';
  session_label: string | null;
  opening_cash_amount: number;
  opening_reserve_amount: number;
  closing_drawer_amount: number | null;
  closing_reserve_amount: number | null;
  cash_sales_amount: number;
  card_sales_amount: number;
  mercadopago_sales_amount: number;
  manual_income_amount: number;
  manual_expense_amount: number;
  expected_cash_amount: number;
  counted_cash_amount: number | null;
  difference_amount: number | null;
  movements_count: number;
  opened_by: string;
  opened_controlled_by_name: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  close_note: string | null;
};

type MovementRow = {
  id: string;
  movement_type: 'expense' | 'income';
  category_key: string;
  amount: number;
  note: string | null;
  movement_at: string;
  created_at: string;
  created_by: string;
};

type MovementBreakdownRow = {
  movement_type: 'expense' | 'income';
  category_key: string;
  amount: number;
};

type ClosedSessionRow = {
  session_id: string;
  session_label: string | null;
  period_type: 'shift' | 'day';
  expected_cash_amount: number;
  closing_drawer_amount: number | null;
  closing_reserve_amount: number | null;
  counted_cash_amount: number | null;
  difference_amount: number | null;
  closed_at: string | null;
};

type SessionReconciliationRow = {
  row_key: string;
  row_group: 'cash_expected_total' | 'device' | 'mercadopago_total';
  payment_method:
    | 'cash'
    | 'card'
    | 'mercadopago'
    | 'debit'
    | 'credit'
    | 'transfer'
    | 'other';
  payment_device_id: string | null;
  payment_device_name: string | null;
  payment_device_provider: string | null;
  system_amount: number;
  payments_count: number;
  reported_amount: number | null;
  difference_amount: number | null;
};

const DEFAULT_CASH_DENOMINATIONS = [20000, 10000, 2000, 1000, 500, 200, 100];
const CLOSE_CASH_FORM_ID = 'cashbox-close-session-form';

const normalizeDenominations = (raw: unknown): number[] => {
  if (!Array.isArray(raw)) return DEFAULT_CASH_DENOMINATIONS;
  const parsed = raw
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.round(value * 100) / 100);
  const unique = Array.from(new Set(parsed));
  if (unique.length === 0) return DEFAULT_CASH_DENOMINATIONS;
  return unique.sort((a, b) => b - a);
};

const buildCountLines = (
  formData: FormData,
  prefix: string,
  denominations: number[],
) =>
  denominations.map((denominationValue, index) => {
    const raw = String(formData.get(`${prefix}_qty_${index}`) ?? '').trim();
    const quantity = Number.parseInt(raw || '0', 10);
    return {
      denomination_value: denominationValue,
      quantity:
        Number.isNaN(quantity) || quantity < 0 ? 0 : Math.floor(quantity),
    };
  });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR', { hour12: false });
};

const formatMovementCategory = (categoryKey: string) => {
  if (categoryKey === 'supplier_payment_cash') {
    return 'Pago proveedor (efectivo)';
  }
  if (categoryKey === 'delivery') return 'Delivery';
  if (categoryKey === 'libreria') return 'Libreria';
  if (categoryKey === 'limpieza') return 'Limpieza';
  if (categoryKey === 'servicios') return 'Servicios';
  if (categoryKey === 'otros') return 'Otros';
  return categoryKey;
};

const buildResultUrl = (branchId: string, result: string) => {
  const params = new URLSearchParams();
  if (branchId) params.set('branch_id', branchId);
  if (result) params.set('result', result);
  return `/cashbox${params.toString() ? `?${params.toString()}` : ''}`;
};

export default async function CashboxPage({
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
    const enabledCashbox = modules?.some(
      (module) => module.module_key === 'cashbox' && module.is_enabled,
    );
    if (!enabledCashbox) {
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
      .map((row) => row.branch_id)
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

  if (branches.length === 0) {
    redirect('/no-access');
  }

  const branchIds = new Set(branches.map((branch) => branch.id));
  const requestedBranchId =
    typeof resolvedSearchParams.branch_id === 'string'
      ? resolvedSearchParams.branch_id
      : '';
  const selectedBranchId = branchIds.has(requestedBranchId)
    ? requestedBranchId
    : branches[0].id;

  const { data: preferencesRow } = await supabase
    .from('org_preferences')
    .select('cash_denominations')
    .eq('org_id', orgId)
    .maybeSingle();

  const denominations = normalizeDenominations(
    (preferencesRow as { cash_denominations?: unknown } | null)
      ?.cash_denominations ?? null,
  );

  const { data: openSessionData } = await supabase
    .from('cash_sessions')
    .select('id')
    .eq('org_id', orgId)
    .eq('branch_id', selectedBranchId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const openSessionId = openSessionData?.id ?? null;

  const { data: summaryData } = openSessionId
    ? await supabase.rpc('rpc_get_cash_session_summary', {
        p_org_id: orgId,
        p_session_id: openSessionId,
      })
    : { data: null };

  const summary =
    ((summaryData as SessionSummary[] | null)?.[0] as
      | SessionSummary
      | undefined) ?? null;

  const { data: movementsData } = openSessionId
    ? await supabase
        .from('cash_session_movements')
        .select(
          'id, movement_type, category_key, amount, note, movement_at, created_at, created_by',
        )
        .eq('org_id', orgId)
        .eq('session_id', openSessionId)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] };

  const movements = (movementsData ?? []) as MovementRow[];

  const { data: movementBreakdownData } = openSessionId
    ? await supabase
        .from('cash_session_movements')
        .select('movement_type, category_key, amount')
        .eq('org_id', orgId)
        .eq('session_id', openSessionId)
    : { data: [] };
  const movementBreakdown = (movementBreakdownData ?? []) as
    | MovementBreakdownRow[]
    | [];

  const supplierPaymentCashExpense = movementBreakdown.reduce(
    (sum, row) =>
      row.movement_type === 'expense' &&
      row.category_key === 'supplier_payment_cash'
        ? sum + Number(row.amount ?? 0)
        : sum,
    0,
  );
  const allExpenseFromBreakdown = movementBreakdown.reduce(
    (sum, row) =>
      row.movement_type === 'expense' ? sum + Number(row.amount ?? 0) : sum,
    0,
  );
  const allIncomeFromBreakdown = movementBreakdown.reduce(
    (sum, row) =>
      row.movement_type === 'income' ? sum + Number(row.amount ?? 0) : sum,
    0,
  );
  const otherManualExpense = Math.max(
    allExpenseFromBreakdown - supplierPaymentCashExpense,
    0,
  );
  const manualIncomeForBreakdown =
    movementBreakdown.length > 0
      ? allIncomeFromBreakdown
      : Number(summary?.manual_income_amount ?? 0);
  const manualExpenseForBreakdown =
    movementBreakdown.length > 0
      ? allExpenseFromBreakdown
      : Number(summary?.manual_expense_amount ?? 0);
  const supplierPaymentMovements = movements.filter(
    (movement) =>
      movement.movement_type === 'expense' &&
      movement.category_key === 'supplier_payment_cash',
  );
  const otherExpenseMovements = movements.filter(
    (movement) =>
      movement.movement_type === 'expense' &&
      movement.category_key !== 'supplier_payment_cash',
  );
  const manualIncomeMovements = movements.filter(
    (movement) => movement.movement_type === 'income',
  );
  const expectedSystemComposedAmount =
    Number(summary?.opening_cash_amount ?? 0) +
    Number(summary?.opening_reserve_amount ?? 0) +
    Number(summary?.cash_sales_amount ?? 0) +
    manualIncomeForBreakdown -
    manualExpenseForBreakdown;

  const { data: reconciliationRowsData } = openSessionId
    ? await supabase.rpc(
        'rpc_get_cash_session_reconciliation_rows' as never,
        {
          p_org_id: orgId,
          p_session_id: openSessionId,
        } as never,
      )
    : { data: [] };
  const reconciliationRows = (reconciliationRowsData ?? []) as
    | SessionReconciliationRow[]
    | [];

  const { data: closedSessionsData } = await supabase
    .from('v_cashbox_session_current')
    .select(
      'session_id, session_label, period_type, expected_cash_amount, closing_drawer_amount, closing_reserve_amount, counted_cash_amount, difference_amount, closed_at',
    )
    .eq('org_id', orgId)
    .eq('branch_id', selectedBranchId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(10);

  const closedSessions = (closedSessionsData ?? []) as ClosedSessionRow[];

  const openCashSession = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const branchId = String(formData.get('branch_id') ?? '').trim();
    const periodType = String(formData.get('period_type') ?? 'shift').trim();
    const shiftLabel = String(formData.get('shift_label') ?? '').trim();
    const sessionLabelRaw = String(formData.get('session_label') ?? '').trim();
    const openedControlledByName = String(
      formData.get('opened_controlled_by_name') ?? '',
    ).trim();
    const sessionLabel =
      periodType === 'shift'
        ? shiftLabel === 'PM'
          ? 'PM'
          : 'AM'
        : sessionLabelRaw;
    const openingDrawerCountLines = buildCountLines(
      formData,
      'open_drawer',
      denominations,
    );
    const openingReserveCountLines = buildCountLines(
      formData,
      'open_reserve',
      denominations,
    );

    const { error } = await actionSession.supabase.rpc(
      'rpc_open_cash_session',
      {
        p_org_id: actionSession.orgId,
        p_branch_id: branchId,
        p_period_type: periodType,
        p_session_label: sessionLabel || undefined,
        p_opened_controlled_by_name: openedControlledByName || undefined,
        p_opening_drawer_count_lines: openingDrawerCountLines,
        p_opening_reserve_count_lines: openingReserveCountLines,
      },
    );

    revalidatePath('/cashbox');
    revalidatePath('/settings/audit-log');

    if (error) {
      redirect(buildResultUrl(branchId, `error:${error.message}`));
    }

    redirect(buildResultUrl(branchId, 'opened'));
  };

  const addMovement = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const branchId = String(formData.get('branch_id') ?? '').trim();
    const cashSessionId = String(formData.get('session_id') ?? '').trim();
    const movementType = String(
      formData.get('movement_type') ?? 'expense',
    ).trim();
    const categoryKey = String(formData.get('category_key') ?? '').trim();
    const amount = Number(String(formData.get('amount') ?? ''));
    const note = String(formData.get('note') ?? '').trim();

    const { error } = await actionSession.supabase.rpc(
      'rpc_add_cash_session_movement',
      {
        p_org_id: actionSession.orgId,
        p_session_id: cashSessionId,
        p_movement_type: movementType,
        p_category_key: categoryKey,
        p_amount: amount,
        p_note: note || undefined,
        p_movement_at: undefined,
      },
    );

    revalidatePath('/cashbox');
    revalidatePath('/settings/audit-log');

    if (error) {
      redirect(buildResultUrl(branchId, `error:${error.message}`));
    }

    redirect(buildResultUrl(branchId, 'movement_added'));
  };

  const closeCashSession = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const branchId = String(formData.get('branch_id') ?? '').trim();
    const cashSessionId = String(formData.get('session_id') ?? '').trim();
    const closeNote = String(formData.get('close_note') ?? '').trim();
    const controlledByName = String(
      formData.get('closed_controlled_by_name') ?? '',
    ).trim();
    const closeConfirmed = formData.get('close_confirmed') === 'on';
    const closingDrawerCountLines = buildCountLines(
      formData,
      'close_drawer',
      denominations,
    );
    const closingReserveCountLines = buildCountLines(
      formData,
      'close_reserve',
      denominations,
    );

    const { error } = await actionSession.supabase.rpc(
      'rpc_close_cash_session',
      {
        p_org_id: actionSession.orgId,
        p_session_id: cashSessionId,
        p_close_note: closeNote || undefined,
        p_closed_controlled_by_name: controlledByName || undefined,
        p_close_confirmed: closeConfirmed,
        p_closing_drawer_count_lines: closingDrawerCountLines,
        p_closing_reserve_count_lines: closingReserveCountLines,
      },
    );

    revalidatePath('/cashbox');
    revalidatePath('/settings/audit-log');

    if (error) {
      redirect(buildResultUrl(branchId, `error:${error.message}`));
    }

    redirect(buildResultUrl(branchId, 'closed'));
  };

  const saveReconciliationInputs = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) {
      redirect('/no-access');
    }

    const branchId = String(formData.get('branch_id') ?? '').trim();
    const cashSessionId = String(formData.get('session_id') ?? '').trim();
    const rowCount = Number.parseInt(
      String(formData.get('row_count') ?? '0'),
      10,
    );

    const entries: Array<{ row_key: string; reported_amount: number }> = [];
    const maxRows = Number.isNaN(rowCount) || rowCount < 0 ? 0 : rowCount;

    for (let index = 0; index < maxRows; index += 1) {
      const rowKey = String(formData.get(`row_key_${index}`) ?? '').trim();
      const rawReported = String(
        formData.get(`reported_amount_${index}`) ?? '',
      ).trim();
      if (!rowKey || rawReported === '') continue;
      const reportedAmount = Number(rawReported);
      if (!Number.isFinite(reportedAmount) || reportedAmount < 0) continue;
      entries.push({
        row_key: rowKey,
        reported_amount: Math.round(reportedAmount * 100) / 100,
      });
    }

    const { error } = await actionSession.supabase.rpc(
      'rpc_upsert_cash_session_reconciliation_inputs' as never,
      {
        p_org_id: actionSession.orgId,
        p_session_id: cashSessionId,
        p_entries: entries,
      } as never,
    );

    revalidatePath('/cashbox');
    revalidatePath('/settings/audit-log');

    if (error) {
      redirect(buildResultUrl(branchId, `error:${error.message}`));
    }

    redirect(buildResultUrl(branchId, 'reconciliation_saved'));
  };

  const result =
    typeof resolvedSearchParams.result === 'string'
      ? resolvedSearchParams.result
      : '';
  const latestClosedSessionId = closedSessions[0]?.session_id ?? null;
  const buildReportPdfHref = (sessionId: string) =>
    `/cashbox/report?branch_id=${encodeURIComponent(
      selectedBranchId,
    )}&session_id=${encodeURIComponent(sessionId)}`;
  const buildReportCsvHref = (sessionId: string) =>
    `/cashbox/report/export?branch_id=${encodeURIComponent(
      selectedBranchId,
    )}&session_id=${encodeURIComponent(sessionId)}`;

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Caja</h1>
            <p className="text-sm text-zinc-500">
              Apertura, movimientos y cierre por sucursal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {latestClosedSessionId ? (
              <>
                <a
                  href={buildReportCsvHref(latestClosedSessionId)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                >
                  Exportar CSV (último cierre)
                </a>
                <Link
                  href={buildReportPdfHref(latestClosedSessionId)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                >
                  Reporte PDF (último cierre)
                </Link>
              </>
            ) : (
              <span className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400">
                Reporte disponible al cerrar caja
              </span>
            )}
            <Link
              href="/settings/audit-log"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
            >
              Ver auditoria
            </Link>
          </div>
        </header>

        {result === 'opened' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Caja abierta correctamente.
          </p>
        ) : null}
        {result === 'movement_added' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Movimiento de caja registrado.
          </p>
        ) : null}
        {result === 'closed' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Caja cerrada correctamente.
          </p>
        ) : null}
        {result === 'reconciliation_saved' ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Conciliación guardada.
          </p>
        ) : null}
        {result.startsWith('error:') ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Error: {result.replace('error:', '')}
          </p>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-zinc-700">
              Sucursal
              <select
                name="branch_id"
                defaultValue={selectedBranchId}
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
            >
              Cambiar
            </button>
          </form>
        </section>

        {!summary ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Abrir caja (
              {branches.find((branch) => branch.id === selectedBranchId)?.name})
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Define los billetes iniciales de caja y reserva para comenzar el
              turno o el día.
            </p>

            <form action={openCashSession} className="mt-5 grid gap-4">
              <input type="hidden" name="branch_id" value={selectedBranchId} />
              <OpenCashSessionMetaFields />
              <CashCountPairFields
                denominations={denominations}
                drawerPrefix="open_drawer"
                reservePrefix="open_reserve"
                drawerTitle="Billetes iniciales en caja"
                reserveTitle="Billetes iniciales en reserva"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Abrir caja
                </button>
                <SystemDateTimeBadge />
              </div>
            </form>
          </section>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-5">
              <article className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Efectivo esperado total
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {formatCurrency(Number(summary.expected_cash_amount ?? 0))}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Apertura caja:{' '}
                  {formatCurrency(Number(summary.opening_cash_amount ?? 0))}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Apertura reserva:{' '}
                  {formatCurrency(Number(summary.opening_reserve_amount ?? 0))}
                </p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Ventas en efectivo
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {formatCurrency(Number(summary.cash_sales_amount ?? 0))}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Ingresos manuales:{' '}
                  {formatCurrency(Number(summary.manual_income_amount ?? 0))}
                </p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Ventas con tarjeta
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {formatCurrency(Number(summary.card_sales_amount ?? 0))}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Método: Tarjeta débito/crédito
                </p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Ventas MercadoPago
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {formatCurrency(
                    Number(summary.mercadopago_sales_amount ?? 0),
                  )}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Método: MercadoPago
                </p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Gastos manuales
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {formatCurrency(Number(summary.manual_expense_amount ?? 0))}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Movimientos: {summary.movements_count ?? 0}
                </p>
              </article>
            </section>

            <section>
              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Registrar movimiento
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Registra gastos o ingresos de la sucursal para conciliación de
                  caja.
                </p>

                <form action={addMovement} className="mt-4 grid gap-3">
                  <input
                    type="hidden"
                    name="branch_id"
                    value={selectedBranchId}
                  />
                  <input
                    type="hidden"
                    name="session_id"
                    value={summary.session_id}
                  />

                  <label className="text-sm text-zinc-700">
                    Tipo
                    <select
                      name="movement_type"
                      defaultValue="expense"
                      className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <option value="expense">Gasto</option>
                      <option value="income">Ingreso</option>
                    </select>
                  </label>

                  <label className="text-sm text-zinc-700">
                    Categoria
                    <select
                      name="category_key"
                      defaultValue="delivery"
                      className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <option value="delivery">Delivery</option>
                      <option value="libreria">Libreria</option>
                      <option value="limpieza">Limpieza</option>
                      <option value="servicios">Servicios</option>
                      <option value="otros">Otros</option>
                    </select>
                  </label>

                  <label className="text-sm text-zinc-700">
                    Monto
                    <AmountInputAR
                      name="amount"
                      className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                      placeholder="0"
                      required
                    />
                  </label>

                  <label className="text-sm text-zinc-700">
                    Nota (opcional)
                    <input
                      name="note"
                      placeholder="Detalle breve"
                      className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Guardar movimiento
                  </button>
                </form>
              </article>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Desglose del efectivo en sistema
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Este detalle explica de qué se compone el monto de efectivo que
                ves en conciliación.
              </p>
              <div className="mt-4 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <p>
                  Apertura caja:{' '}
                  <strong>
                    {formatCurrency(Number(summary.opening_cash_amount ?? 0))}
                  </strong>
                </p>
                <p>
                  + Apertura reserva:{' '}
                  <strong>
                    {formatCurrency(
                      Number(summary.opening_reserve_amount ?? 0),
                    )}
                  </strong>
                </p>
                <p>
                  + Ventas en efectivo:{' '}
                  <strong>
                    {formatCurrency(Number(summary.cash_sales_amount ?? 0))}
                  </strong>
                </p>
                <p>
                  + Ingresos manuales:{' '}
                  <strong>{formatCurrency(manualIncomeForBreakdown)}</strong>
                </p>
                <p>
                  - Egresos totales:{' '}
                  <strong>{formatCurrency(manualExpenseForBreakdown)}</strong>
                </p>
                <p className="border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
                  = Efectivo en sistema:{' '}
                  {formatCurrency(expectedSystemComposedAmount)}
                </p>
                {Math.abs(
                  expectedSystemComposedAmount -
                    Number(summary.expected_cash_amount ?? 0),
                ) > 0.009 ? (
                  <p className="text-xs text-amber-700">
                    Nota: el cálculo visual no coincide con el total de sistema.
                    Verifica movimientos y redondeos.
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <article className="rounded-lg border border-zinc-200 p-3">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Pagos proveedor en efectivo
                  </p>
                  {supplierPaymentMovements.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">
                      Sin pagos a proveedor en efectivo.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm">
                      {supplierPaymentMovements.map((movement) => (
                        <li
                          key={movement.id}
                          className="rounded bg-zinc-50 p-2"
                        >
                          <p className="font-medium text-zinc-800">
                            {formatCurrency(Number(movement.amount ?? 0))}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatDateTime(movement.movement_at)}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {movement.note?.trim() || 'Pago sin detalle'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>

                <article className="rounded-lg border border-zinc-200 p-3">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Otros egresos manuales
                  </p>
                  {otherExpenseMovements.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">
                      Sin egresos manuales.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm">
                      {otherExpenseMovements.map((movement) => (
                        <li
                          key={movement.id}
                          className="rounded bg-zinc-50 p-2"
                        >
                          <p className="font-medium text-zinc-800">
                            {formatCurrency(Number(movement.amount ?? 0))}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatMovementCategory(movement.category_key)} ·{' '}
                            {formatDateTime(movement.movement_at)}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {movement.note?.trim() || 'Sin nota'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>

                <article className="rounded-lg border border-zinc-200 p-3">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Ingresos manuales
                  </p>
                  {manualIncomeMovements.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">
                      Sin ingresos manuales.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm">
                      {manualIncomeMovements.map((movement) => (
                        <li
                          key={movement.id}
                          className="rounded bg-zinc-50 p-2"
                        >
                          <p className="font-medium text-zinc-800">
                            {formatCurrency(Number(movement.amount ?? 0))}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatMovementCategory(movement.category_key)} ·{' '}
                            {formatDateTime(movement.movement_at)}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {movement.note?.trim() || 'Sin nota'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Movimientos de la sesión
              </h2>

              {movements.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  Sin movimientos registrados.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2">Monto</th>
                        <th className="px-3 py-2">Usuario</th>
                        <th className="px-3 py-2">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr
                          key={movement.id}
                          className="border-t border-zinc-100"
                        >
                          <td className="px-3 py-2">
                            {formatDateTime(movement.movement_at)}
                          </td>
                          <td className="px-3 py-2">
                            {movement.movement_type === 'income'
                              ? 'Ingreso'
                              : 'Gasto'}
                          </td>
                          <td className="px-3 py-2">
                            {formatMovementCategory(movement.category_key)}
                          </td>
                          <td className="px-3 py-2">
                            {formatCurrency(Number(movement.amount ?? 0))}
                          </td>
                          <td className="px-3 py-2">{movement.created_by}</td>
                          <td className="px-3 py-2">{movement.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Conteo de efectivo
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Cuenta billetes en caja y en reserva para validar en vivo el
                total contra el esperado.
              </p>

              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <p>
                  Apertura: {formatDateTime(summary.opened_at)}
                  {summary.session_label ? ` · ${summary.session_label}` : ''}
                </p>
                <p>Tipo: {summary.period_type === 'day' ? 'Dia' : 'Turno'}</p>
                <p>
                  Responsable apertura:{' '}
                  {summary.opened_controlled_by_name?.trim() || '—'}
                </p>
                <p>
                  Esperado actual:{' '}
                  {formatCurrency(Number(summary.expected_cash_amount ?? 0))}
                </p>
              </div>
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Desglose del esperado en efectivo
                </p>
                <p className="mt-2">
                  Apertura caja:{' '}
                  <strong>
                    {formatCurrency(Number(summary.opening_cash_amount ?? 0))}
                  </strong>
                </p>
                <p>
                  Apertura reserva:{' '}
                  <strong>
                    {formatCurrency(
                      Number(summary.opening_reserve_amount ?? 0),
                    )}
                  </strong>
                </p>
                <p>
                  Ventas en efectivo:{' '}
                  <strong>
                    {formatCurrency(Number(summary.cash_sales_amount ?? 0))}
                  </strong>
                </p>
                <p>
                  Ingresos manuales:{' '}
                  <strong>{formatCurrency(manualIncomeForBreakdown)}</strong>
                </p>
                <p>
                  Egresos por pago proveedor (efectivo):{' '}
                  <strong>
                    {formatCurrency(Number(supplierPaymentCashExpense ?? 0))}
                  </strong>
                </p>
                <p>
                  Otros egresos manuales:{' '}
                  <strong>
                    {formatCurrency(Number(otherManualExpense ?? 0))}
                  </strong>
                </p>
                <p>
                  Total egresos manuales:{' '}
                  <strong>{formatCurrency(manualExpenseForBreakdown)}</strong>
                </p>
              </div>

              <div className="mt-4">
                <CashCountPairFields
                  denominations={denominations}
                  drawerPrefix="close_drawer"
                  reservePrefix="close_reserve"
                  drawerTitle="Billetes al cierre en caja"
                  reserveTitle="Billetes al cierre en reserva"
                  formId={CLOSE_CASH_FORM_ID}
                />
              </div>
            </section>

            <CashboxReconciliationSection
              branchId={selectedBranchId}
              sessionId={summary.session_id}
              rows={reconciliationRows}
              onSave={saveReconciliationInputs}
            />

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Confirmar cierre de caja
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Completa la firma operativa y confirma el cierre cuando la
                conciliación esté validada.
              </p>

              <form
                id={CLOSE_CASH_FORM_ID}
                action={closeCashSession}
                className="mt-4 grid gap-3"
              >
                <input
                  type="hidden"
                  name="branch_id"
                  value={selectedBranchId}
                />
                <input
                  type="hidden"
                  name="session_id"
                  value={summary.session_id}
                />

                <label className="text-sm text-zinc-700">
                  Controlado por (firma operativa)
                  <input
                    name="closed_controlled_by_name"
                    placeholder="Nombre y apellido"
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="text-sm text-zinc-700">
                  Observación (opcional)
                  <textarea
                    name="close_note"
                    rows={3}
                    placeholder="Motivo de diferencia, observaciones, etc."
                    className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" name="close_confirmed" required />
                  Confirmo el cierre de caja para esta sucursal.
                </label>

                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Cerrar caja
                </button>
              </form>
            </section>
          </>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            Ultimos cierres (
            {branches.find((branch) => branch.id === selectedBranchId)?.name})
          </h2>

          {closedSessions.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Aun no hay cierres registrados.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Cierre</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Esperado</th>
                    <th className="px-3 py-2">Caja</th>
                    <th className="px-3 py-2">Reserva</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Diferencia</th>
                    <th className="px-3 py-2">Reporte</th>
                  </tr>
                </thead>
                <tbody>
                  {closedSessions.map((closedSession) => (
                    <tr
                      key={closedSession.session_id}
                      className="border-t border-zinc-100"
                    >
                      <td className="px-3 py-2">
                        {formatDateTime(closedSession.closed_at)}
                      </td>
                      <td className="px-3 py-2">
                        {closedSession.period_type === 'day' ? 'Dia' : 'Turno'}
                        {closedSession.session_label
                          ? ` · ${closedSession.session_label}`
                          : ''}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(
                          Number(closedSession.expected_cash_amount ?? 0),
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(
                          Number(closedSession.closing_drawer_amount ?? 0),
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(
                          Number(closedSession.closing_reserve_amount ?? 0),
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(
                          Number(closedSession.counted_cash_amount ?? 0),
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 font-semibold ${
                          Number(closedSession.difference_amount ?? 0) === 0
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {formatCurrency(
                          Number(closedSession.difference_amount ?? 0),
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={buildReportCsvHref(closedSession.session_id)}
                            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
                          >
                            CSV
                          </a>
                          <Link
                            href={buildReportPdfHref(closedSession.session_id)}
                            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
                          >
                            PDF
                          </Link>
                        </div>
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
