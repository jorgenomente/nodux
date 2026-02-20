import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import CashCountPairFields from '@/app/cashbox/CashCountPairFields';
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

type SessionPaymentBreakdownRow = {
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
  total_amount: number;
  payments_count: number;
};

const DEFAULT_CASH_DENOMINATIONS = [20000, 10000, 2000, 1000, 500, 200, 100];

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
  return categoryKey;
};

const formatPaymentMethod = (method: string) => {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'card':
      return 'Tarjeta';
    case 'mercadopago':
      return 'MercadoPago';
    case 'debit':
      return 'Débito';
    case 'credit':
      return 'Crédito';
    case 'transfer':
      return 'Transferencia';
    case 'other':
      return 'Otro';
    default:
      return method;
  }
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

  const { data: paymentBreakdownData } = openSessionId
    ? await supabase.rpc(
        'rpc_get_cash_session_payment_breakdown' as never,
        {
          p_org_id: orgId,
          p_session_id: openSessionId,
        } as never,
      )
    : { data: [] };
  const paymentBreakdown = (paymentBreakdownData ?? []) as
    | SessionPaymentBreakdownRow[]
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
    const sessionLabel = String(formData.get('session_label') ?? '').trim();
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

  const result =
    typeof resolvedSearchParams.result === 'string'
      ? resolvedSearchParams.result
      : '';

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
          <Link
            href="/settings/audit-log"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            Ver auditoria
          </Link>
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
              <label className="text-sm text-zinc-700 md:max-w-sm">
                Tipo
                <select
                  name="period_type"
                  defaultValue="shift"
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="shift">Turno</option>
                  <option value="day">Dia</option>
                </select>
              </label>
              <CashCountPairFields
                denominations={denominations}
                drawerPrefix="open_drawer"
                reservePrefix="open_reserve"
                drawerTitle="Billetes iniciales en caja"
                reserveTitle="Billetes iniciales en reserva"
              />
              <label className="text-sm text-zinc-700">
                Etiqueta (opcional)
                <input
                  name="session_label"
                  placeholder="Ej: Turno mañana"
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <div>
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Abrir caja
                </button>
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

            <section className="grid gap-6 lg:grid-cols-2">
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
                    <input
                      name="amount"
                      type="number"
                      min={0.01}
                      step="0.01"
                      className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
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

              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Cerrar caja
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Al cerrar se cuentan billetes en caja y en reserva; el sistema
                  calcula el total y la diferencia automáticamente.
                </p>

                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                  <p>
                    Apertura: {formatDateTime(summary.opened_at)}
                    {summary.session_label ? ` · ${summary.session_label}` : ''}
                  </p>
                  <p>Tipo: {summary.period_type === 'day' ? 'Dia' : 'Turno'}</p>
                  <p>
                    Esperado actual:{' '}
                    {formatCurrency(Number(summary.expected_cash_amount ?? 0))}
                  </p>
                </div>

                <form action={closeCashSession} className="mt-4 grid gap-3">
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

                  <CashCountPairFields
                    denominations={denominations}
                    drawerPrefix="close_drawer"
                    reservePrefix="close_reserve"
                    drawerTitle="Billetes al cierre en caja"
                    reserveTitle="Billetes al cierre en reserva"
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
              </article>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Conciliación por medio y dispositivo
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Compara los totales del sistema por método y por posnet contra
                tus comprobantes del turno.
              </p>
              {paymentBreakdown.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  Sin cobros registrados en la sesión.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">Método</th>
                        <th className="px-3 py-2">Dispositivo</th>
                        <th className="px-3 py-2">Operaciones</th>
                        <th className="px-3 py-2">Monto sistema</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentBreakdown.map((row) => (
                        <tr
                          key={`${row.payment_method}-${row.payment_device_id ?? 'none'}`}
                          className="border-t border-zinc-100"
                        >
                          <td className="px-3 py-2">
                            {formatPaymentMethod(row.payment_method)}
                          </td>
                          <td className="px-3 py-2">
                            {row.payment_device_name ?? 'Sin dispositivo'}
                          </td>
                          <td className="px-3 py-2">
                            {Number(row.payments_count ?? 0)}
                          </td>
                          <td className="px-3 py-2 font-semibold text-zinc-900">
                            {formatCurrency(Number(row.total_amount ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
