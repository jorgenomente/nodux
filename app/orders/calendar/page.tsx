import Link from 'next/link';
import { redirect } from 'next/navigation';

import CalendarFiltersClient from '@/app/orders/calendar/CalendarFiltersClient';
import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type SearchParams = {
  branch_id?: string;
  status?: string;
  period?: string;
  from?: string;
  to?: string;
};

type BranchOption = {
  id: string;
  name: string;
};

type SupplierRow = {
  id: string;
  name: string;
  order_frequency: 'weekly' | 'biweekly' | 'every_3_weeks' | 'monthly' | null;
  order_day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null;
  receive_day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null;
  created_at: string;
};

type OrderRow = {
  order_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  status: 'draft' | 'sent' | 'received' | 'reconciled' | null;
  created_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  reconciled_at: string | null;
  expected_receive_on: string | null;
};

type CardStatus = 'pending_send' | 'pending_receive' | 'controlled';

type CalendarCard = {
  id: string;
  date_key: string;
  date_label: string;
  supplier_id: string;
  supplier_name: string;
  branch_name: string | null;
  status: CardStatus;
  order_id: string | null;
  order_status: OrderRow['status'];
};

const weekDayToIndex: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const statusLabel: Record<CardStatus, string> = {
  pending_send: 'Pedido pendiente por realizar',
  pending_receive: 'Pedido pendiente por recibir',
  controlled: 'Pedido recibido y controlado',
};

const statusClassName: Record<CardStatus, string> = {
  pending_send: 'border-sky-200 bg-sky-50 text-sky-900',
  pending_receive: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  controlled: 'border-emerald-300 bg-emerald-100 text-emerald-950',
};

const toUtcDate = (value: Date) =>
  new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );

const addUtcDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const parseDateInput = (value: string | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toUtcDate(parsed);
};

const formatDateLabel = (value: Date) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('es-AR') : '—';

const formatDateInputValue = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : '';

const diffDaysUtc = (from: Date, to: Date) =>
  Math.floor((to.getTime() - from.getTime()) / 86400000);

const matchesFrequency = (
  frequency: SupplierRow['order_frequency'],
  anchorDate: Date,
  targetDate: Date,
) => {
  const days = diffDaysUtc(anchorDate, targetDate);
  if (days < 0) return false;

  if (frequency === 'weekly' || !frequency) return true;
  if (frequency === 'biweekly') return days % 14 === 0;
  if (frequency === 'every_3_weeks') return days % 21 === 0;
  if (frequency === 'monthly') return days % 30 === 0;
  return true;
};

const withinRange = (value: Date, start: Date, end: Date) =>
  value >= start && value <= end;

const getStartOfWeek = (date: Date) => {
  const day = (date.getUTCDay() + 6) % 7;
  return addUtcDays(date, -day);
};

const getEndOfWeek = (date: Date) => addUtcDays(getStartOfWeek(date), 6);

const getStartOfMonth = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const getEndOfMonth = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

const getDateRange = (
  period: string,
  from: string | undefined,
  to: string | undefined,
) => {
  const today = toUtcDate(new Date());

  if (period === 'today') {
    return { start: today, end: today };
  }

  if (period === 'month') {
    return { start: getStartOfMonth(today), end: getEndOfMonth(today) };
  }

  if (period === 'custom') {
    const parsedFrom = parseDateInput(from);
    const parsedTo = parseDateInput(to);
    if (parsedFrom && parsedTo && parsedFrom <= parsedTo) {
      return { start: parsedFrom, end: parsedTo };
    }
    return { start: addUtcDays(today, -7), end: addUtcDays(today, 7) };
  }

  return { start: getStartOfWeek(today), end: getEndOfWeek(today) };
};

const toStatusFilter = (value: string | undefined) => {
  if (
    value === 'pending_send' ||
    value === 'pending_receive' ||
    value === 'controlled'
  ) {
    return value;
  }
  return 'all';
};

const formatOrderStatusLabel = (status: OrderRow['status']) => {
  if (status === 'draft') return 'Pendiente por realizar';
  if (status === 'sent' || status === 'received')
    return 'Pendiente por recibir';
  if (status === 'reconciled') return 'Recibido y controlado';
  return null;
};

const expectedReceiveDate = (
  explicitExpectedOn: string | null,
  sentAt: string | null,
  receiveDay: SupplierRow['receive_day'],
) => {
  if (explicitExpectedOn) {
    const explicit = parseDateInput(explicitExpectedOn);
    if (explicit) return explicit;
  }
  if (!sentAt || !receiveDay) return null;
  const base = toUtcDate(new Date(sentAt));
  const targetWeekDay = weekDayToIndex[receiveDay];
  const currentWeekDay = base.getUTCDay();
  const offset = (targetWeekDay - currentWeekDay + 7) % 7;
  return addUtcDays(base, offset === 0 ? 7 : offset);
};

export default async function OrdersCalendarPage({
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

  let branches: BranchOption[] = [];

  if (membership.role === 'staff') {
    const { data: branchMemberships } = await supabase
      .from('branch_memberships')
      .select('branch_id')
      .eq('org_id', membership.org_id)
      .eq('user_id', user.id)
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

  const period =
    resolvedSearchParams.period === 'today' ||
    resolvedSearchParams.period === 'month' ||
    resolvedSearchParams.period === 'custom'
      ? resolvedSearchParams.period
      : 'week';
  const statusFilter = toStatusFilter(resolvedSearchParams.status);
  const { start, end } = getDateRange(
    period,
    resolvedSearchParams.from,
    resolvedSearchParams.to,
  );

  const fromKey = toDateKey(start);
  const toKey = toDateKey(end);

  const { data: suppliersData } = await supabase
    .from('suppliers')
    .select('id, name, order_frequency, order_day, receive_day, created_at')
    .eq('org_id', membership.org_id)
    .eq('is_active', true)
    .order('name');

  let ordersQuery = supabase
    .from('v_orders_admin')
    .select(
      'order_id, supplier_id, supplier_name, branch_id, branch_name, status, created_at, sent_at, received_at, reconciled_at, expected_receive_on',
    )
    .eq('org_id', membership.org_id)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (selectedBranchId) {
    ordersQuery = ordersQuery.eq('branch_id', selectedBranchId);
  }

  const { data: ordersData } = await ordersQuery;

  const suppliers = (suppliersData ?? []) as SupplierRow[];
  const orders = (ordersData ?? []) as OrderRow[];

  const setExpectedReceiveOn = async (formData: FormData) => {
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

    const orderId = String(formData.get('order_id') ?? '').trim();
    const expectedReceiveOnRaw = String(
      formData.get('expected_receive_on') ?? '',
    ).trim();

    if (!orderId) return;

    const expectedReceiveOn = expectedReceiveOnRaw || null;

    await supabaseServer
      .from('supplier_orders')
      .update({ expected_receive_on: expectedReceiveOn })
      .eq('org_id', actionMembership.org_id)
      .eq('id', orderId)
      .in('status', ['sent', 'received']);
  };

  const suppliersById = new Map<string, SupplierRow>();
  suppliers.forEach((supplier) => {
    suppliersById.set(supplier.id, supplier);
  });
  const ordersById = new Map<string, OrderRow>();
  orders.forEach((order) => {
    if (!order.order_id) return;
    ordersById.set(order.order_id, order);
  });

  const cards: CalendarCard[] = [];
  suppliers.forEach((supplier) => {
    if (!supplier.order_day) return;

    const anchorDate = toUtcDate(new Date(supplier.created_at));
    const totalDays = diffDaysUtc(start, end);

    for (let offset = 0; offset <= totalDays; offset += 1) {
      const date = addUtcDays(start, offset);
      if (
        weekDayToIndex[supplier.order_day] !== date.getUTCDay() ||
        !matchesFrequency(supplier.order_frequency, anchorDate, date)
      ) {
        continue;
      }

      const key = toDateKey(date);
      const matchingOrder = orders.find((order) => {
        if (order.supplier_id !== supplier.id) return false;
        if (!order.sent_at) return false;
        const sent = toUtcDate(new Date(order.sent_at));
        return toDateKey(sent) === key;
      });

      if (!matchingOrder) {
        cards.push({
          id: `${supplier.id}-${key}-send`,
          date_key: key,
          date_label: formatDateLabel(date),
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          branch_name: null,
          status: 'pending_send',
          order_id: null,
          order_status: null,
        });
      }
    }
  });

  orders.forEach((order) => {
    if (!order.order_id || !order.supplier_id || !order.supplier_name) return;

    const supplier = suppliersById.get(order.supplier_id);

    const controlledDate = order.reconciled_at;
    if (controlledDate) {
      const controlled = toUtcDate(new Date(controlledDate));
      if (withinRange(controlled, start, end)) {
        cards.push({
          id: `${order.order_id}-controlled-${toDateKey(controlled)}`,
          date_key: toDateKey(controlled),
          date_label: formatDateLabel(controlled),
          supplier_id: order.supplier_id,
          supplier_name: order.supplier_name,
          branch_name: order.branch_name,
          status: 'controlled',
          order_id: order.order_id,
          order_status: order.status,
        });
      }
    }

    if (
      (order.status === 'sent' || order.status === 'received') &&
      !order.reconciled_at
    ) {
      const expected = expectedReceiveDate(
        order.expected_receive_on,
        order.sent_at,
        supplier?.receive_day ?? null,
      );
      const fallback = order.sent_at
        ? toUtcDate(new Date(order.sent_at))
        : null;
      const receiveDate = expected ?? fallback;
      if (receiveDate && withinRange(receiveDate, start, end)) {
        cards.push({
          id: `${order.order_id}-pending-receive-${toDateKey(receiveDate)}`,
          date_key: toDateKey(receiveDate),
          date_label: formatDateLabel(receiveDate),
          supplier_id: order.supplier_id,
          supplier_name: order.supplier_name,
          branch_name: order.branch_name,
          status: 'pending_receive',
          order_id: order.order_id,
          order_status: order.status,
        });
      }
    }
  });

  const filteredCards = cards
    .filter((card) =>
      statusFilter === 'all' ? true : card.status === statusFilter,
    )
    .sort((a, b) => {
      if (a.date_key === b.date_key) {
        if (a.status === b.status) {
          return a.supplier_name.localeCompare(b.supplier_name);
        }
        return a.status.localeCompare(b.status);
      }
      return a.date_key.localeCompare(b.date_key);
    });

  const grouped = new Map<
    string,
    { date_label: string; items: CalendarCard[] }
  >();
  filteredCards.forEach((card) => {
    const current = grouped.get(card.date_key) ?? {
      date_label: card.date_label,
      items: [],
    };
    current.items.push(card);
    grouped.set(card.date_key, current);
  });

  const calendarDays = Array.from(grouped.entries());

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">
            Pedidos a proveedor
          </p>
          <h1 className="text-xl font-semibold text-zinc-900">
            Calendario de proveedores
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Estado operativo sincronizado con pedidos: pendiente por realizar,
            pendiente por recibir y recibido/controlado.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
              Flujo envío
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
              Flujo recepción
            </span>
          </div>
        </div>

        <CalendarFiltersClient
          branches={branches}
          selectedBranchId={selectedBranchId}
          selectedStatus={statusFilter}
          selectedPeriod={period}
          selectedFrom={resolvedSearchParams.from ?? fromKey}
          selectedTo={resolvedSearchParams.to ?? toKey}
        />

        {calendarDays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            No hay resultados para el filtro seleccionado.
          </div>
        ) : null}

        {calendarDays.map(([dateKey, group]) => (
          <section key={dateKey} className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
              {group.date_label}
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {group.items.map((card) => (
                <article
                  key={card.id}
                  className={`rounded-xl border px-3 py-3 ${statusClassName[card.status]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {card.supplier_name}
                      </p>
                      {!card.order_status ? (
                        <p className="text-xs opacity-90">
                          {statusLabel[card.status]}
                        </p>
                      ) : null}
                      {card.branch_name ? (
                        <p className="mt-1 text-xs opacity-90">
                          Sucursal: {card.branch_name}
                        </p>
                      ) : null}
                      {card.order_status ? (
                        <p className="mt-1 text-xs opacity-90">
                          Estado de pedido:{' '}
                          {formatOrderStatusLabel(card.order_status)}
                        </p>
                      ) : null}
                    </div>

                    {card.order_id ? (
                      <Link
                        href={`/orders/${card.order_id}`}
                        className="rounded-lg border border-current px-2 py-1 text-xs font-semibold"
                      >
                        {card.status === 'pending_receive'
                          ? 'Ver y controlar'
                          : 'Ver pedido'}
                      </Link>
                    ) : membership.role === 'org_admin' &&
                      card.status === 'pending_send' ? (
                      <Link
                        href={`/orders?draft_supplier_id=${card.supplier_id}&draft_branch_id=${selectedBranchId}`}
                        className="rounded-lg border border-current px-2 py-1 text-xs font-semibold"
                      >
                        Crear pedido
                      </Link>
                    ) : null}
                  </div>
                  {membership.role === 'org_admin' &&
                  card.status === 'pending_receive' &&
                  card.order_id ? (
                    <form
                      action={setExpectedReceiveOn}
                      className="mt-3 flex flex-wrap items-end gap-2"
                    >
                      <input
                        type="hidden"
                        name="order_id"
                        value={card.order_id}
                      />
                      <label className="text-xs font-medium opacity-90">
                        Fecha estimada
                        <input
                          type="date"
                          name="expected_receive_on"
                          defaultValue={formatDateInputValue(
                            expectedReceiveDate(
                              ordersById.get(card.order_id)
                                ?.expected_receive_on ?? null,
                              ordersById.get(card.order_id)?.sent_at ?? null,
                              suppliersById.get(card.supplier_id)
                                ?.receive_day ?? null,
                            ),
                          )}
                          className="mt-1 h-9 rounded-lg border border-current/30 bg-white/70 px-2 text-xs"
                        />
                      </label>
                      <button
                        type="submit"
                        className="h-9 rounded-lg border border-current px-3 text-xs font-semibold"
                      >
                        Guardar fecha
                      </button>
                    </form>
                  ) : null}
                  {card.order_id ? null : (
                    <p className="mt-2 text-xs opacity-90">
                      Todavía no hay pedido enviado para esta fecha.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-2xl bg-white p-4 text-xs text-zinc-500 shadow-sm">
          <p>
            Rango activo: {formatDateLabel(start)} a {formatDateLabel(end)}.
          </p>
          <p className="mt-1">
            Las fechas/estados se sincronizan con los pedidos de{' '}
            <code>orders</code>. Si un pedido cambia a enviado o controlado, se
            refleja aquí.
          </p>
          <p className="mt-1">
            Ejemplo de fecha real: {formatDateTime(new Date().toISOString())}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
