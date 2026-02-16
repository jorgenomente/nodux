import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
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
  cash_sales_amount: number;
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
  counted_cash_amount: number | null;
  difference_amount: number | null;
  closed_at: string | null;
};

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

  const { data: closedSessionsData } = await supabase
    .from('v_cashbox_session_current')
    .select(
      'session_id, session_label, period_type, expected_cash_amount, counted_cash_amount, difference_amount, closed_at',
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
    const openingAmount = Number(
      String(formData.get('opening_cash_amount') ?? ''),
    );
    const periodType = String(formData.get('period_type') ?? 'shift').trim();
    const sessionLabel = String(formData.get('session_label') ?? '').trim();

    const { error } = await actionSession.supabase.rpc(
      'rpc_open_cash_session',
      {
        p_org_id: actionSession.orgId,
        p_branch_id: branchId,
        p_opening_cash_amount: openingAmount,
        p_period_type: periodType,
        p_session_label: sessionLabel || undefined,
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
    const countedAmount = Number(
      String(formData.get('counted_cash_amount') ?? ''),
    );
    const closeNote = String(formData.get('close_note') ?? '').trim();

    const { error } = await actionSession.supabase.rpc(
      'rpc_close_cash_session',
      {
        p_org_id: actionSession.orgId,
        p_session_id: cashSessionId,
        p_counted_cash_amount: countedAmount,
        p_close_note: closeNote || undefined,
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
              Define monto inicial y tipo de cierre para comenzar el turno o el
              día.
            </p>

            <form
              action={openCashSession}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <input type="hidden" name="branch_id" value={selectedBranchId} />
              <label className="text-sm text-zinc-700">
                Monto inicial
                <input
                  name="opening_cash_amount"
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="text-sm text-zinc-700">
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
              <label className="text-sm text-zinc-700 md:col-span-2">
                Etiqueta (opcional)
                <input
                  name="session_label"
                  placeholder="Ej: Turno mañana"
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-2">
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
            <section className="grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Efectivo esperado
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {formatCurrency(Number(summary.expected_cash_amount ?? 0))}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Apertura:{' '}
                  {formatCurrency(Number(summary.opening_cash_amount ?? 0))}
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
                  Al cerrar se calcula automáticamente la diferencia contra lo
                  esperado.
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

                  <label className="text-sm text-zinc-700">
                    Total contado
                    <input
                      name="counted_cash_amount"
                      type="number"
                      min={0}
                      step="0.01"
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
                          <td className="px-3 py-2">{movement.category_key}</td>
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
                    <th className="px-3 py-2">Contado</th>
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
