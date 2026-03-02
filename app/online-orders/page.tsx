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
  'online_orders',
] as const;

const moduleToRoute: Record<string, string> = {
  pos: '/pos',
  cashbox: '/cashbox',
  products_lookup: '/products/lookup',
  clients: '/clients',
  expirations: '/expirations',
  online_orders: '/online-orders',
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
  status?: string;
  notice?: string;
};

type BranchOption = {
  id: string;
  name: string;
};

type OnlineOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled';

type OnlineOrderRow = {
  online_order_id: string;
  org_id: string;
  branch_id: string;
  branch_name: string;
  order_code: string;
  status: OnlineOrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_notes: string | null;
  staff_notes: string | null;
  payment_intent: 'pay_on_pickup' | 'transfer' | 'qr';
  subtotal_amount: number;
  total_amount: number;
  created_at: string;
  tracking_token: string | null;
  has_payment_proof: boolean;
  payment_proof_review_status: 'pending' | 'approved' | 'rejected' | null;
};

type PaymentProofRow = {
  id: string;
  org_id: string;
  online_order_id: string;
  storage_path: string;
  review_status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  uploaded_at: string;
};

const statusLabel: Record<OnlineOrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  ready_for_pickup: 'Guardado / listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const getNextStatuses = (status: OnlineOrderStatus): OnlineOrderStatus[] => {
  if (status === 'pending') return ['confirmed', 'cancelled'];
  if (status === 'confirmed') return ['ready_for_pickup', 'cancelled'];
  if (status === 'ready_for_pickup') return ['delivered', 'cancelled'];
  return [];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', { hour12: false });

const buildListUrl = (params: {
  q?: string;
  branchId?: string;
  status?: string;
  notice?: string;
}) => {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.branchId) query.set('branch_id', params.branchId);
  if (params.status) query.set('status', params.status);
  if (params.notice) query.set('notice', params.notice);
  const qs = query.toString();
  return `/online-orders${qs ? `?${qs}` : ''}`;
};

export default async function OnlineOrdersPage({
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
    const enabledOnlineOrders = modules?.some(
      (module) => module.module_key === 'online_orders' && module.is_enabled,
    );
    if (!enabledOnlineOrders) {
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
  const selectedStatus =
    typeof resolvedSearchParams.status === 'string'
      ? resolvedSearchParams.status
      : '';
  const statusFilter = [
    'pending',
    'confirmed',
    'ready_for_pickup',
    'delivered',
    'cancelled',
  ].includes(selectedStatus)
    ? (selectedStatus as OnlineOrderStatus)
    : '';

  let ordersQuery = supabase
    .from('v_online_orders_admin' as never)
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (selectedBranchId) {
    ordersQuery = ordersQuery.eq('branch_id', selectedBranchId);
  }
  if (statusFilter) {
    ordersQuery = ordersQuery.eq('status', statusFilter);
  }
  if (query) {
    ordersQuery = ordersQuery.or(
      `order_code.ilike.%${query}%,customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%`,
    );
  }

  const { data: ordersData } = await ordersQuery.limit(100);
  const orders = (ordersData ?? []) as OnlineOrderRow[];
  const orderIds = orders.map((order) => order.online_order_id);

  const latestProofByOrderId = new Map<string, PaymentProofRow>();
  if (orderIds.length > 0) {
    const { data: proofsData } = await supabase
      .from('online_order_payment_proofs' as never)
      .select(
        'id, org_id, online_order_id, storage_path, review_status, review_note, uploaded_at',
      )
      .eq('org_id', orgId)
      .in('online_order_id', orderIds)
      .order('uploaded_at', { ascending: false });

    for (const proof of (proofsData ?? []) as PaymentProofRow[]) {
      if (!latestProofByOrderId.has(proof.online_order_id)) {
        latestProofByOrderId.set(proof.online_order_id, proof);
      }
    }
  }

  const signedProofUrlByOrderId = new Map<string, string>();
  await Promise.all(
    Array.from(latestProofByOrderId.values()).map(async (proof) => {
      const { data: signed } = await supabase.storage
        .from('online-order-proofs')
        .createSignedUrl(proof.storage_path, 60 * 60);

      if (signed?.signedUrl) {
        signedProofUrlByOrderId.set(proof.online_order_id, signed.signedUrl);
      }
    }),
  );

  const setStatus = async (formData: FormData) => {
    'use server';
    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId || !actionSession.effectiveRole) {
      redirect('/no-access');
    }

    const actionSupabase = actionSession.supabase;
    const actionOrgId = actionSession.orgId;
    const actionRole = actionSession.effectiveRole;
    const actionUserId = actionSession.userId;
    const orderId = String(formData.get('online_order_id') ?? '').trim();
    const newStatus = String(formData.get('new_status') ?? '').trim();
    const returnQ = String(formData.get('return_q') ?? '').trim();
    const returnBranchId = String(formData.get('return_branch_id') ?? '').trim();
    const returnStatus = String(formData.get('return_status') ?? '').trim();

    if (!orderId) {
      redirect(
        buildListUrl({
          q: returnQ,
          branchId: returnBranchId,
          status: returnStatus,
          notice: 'invalid_order',
        }),
      );
    }

    const validStatuses = [
      'pending',
      'confirmed',
      'ready_for_pickup',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(newStatus)) {
      redirect(
        buildListUrl({
          q: returnQ,
          branchId: returnBranchId,
          status: returnStatus,
          notice: 'invalid_status',
        }),
      );
    }

    const { data: orderRaw } = await actionSupabase
      .from('online_orders' as never)
      .select('id, org_id, branch_id')
      .eq('id', orderId)
      .eq('org_id', actionOrgId)
      .maybeSingle();
    const orderRow = orderRaw as {
      id: string;
      org_id: string;
      branch_id: string;
    } | null;

    if (!orderRow) {
      redirect(
        buildListUrl({
          q: returnQ,
          branchId: returnBranchId,
          status: returnStatus,
          notice: 'order_not_found',
        }),
      );
    }

    if (actionRole === 'staff') {
      const { data: membership } = await actionSupabase
        .from('branch_memberships')
        .select('id')
        .eq('org_id', actionOrgId)
        .eq('user_id', actionUserId)
        .eq('branch_id', orderRow.branch_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!membership) {
        redirect('/no-access');
      }

      const { data: modules } = await actionSupabase.rpc(
        'rpc_get_staff_effective_modules',
      );
      const enabledOnlineOrders = modules?.some(
        (module) => module.module_key === 'online_orders' && module.is_enabled,
      );
      if (!enabledOnlineOrders) {
        redirect('/no-access');
      }
    }

    const rpcClient = actionSupabase as unknown as {
      rpc: (
        fnName: string,
        params?: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    };

    const { error } = await rpcClient.rpc('rpc_set_online_order_status', {
      p_online_order_id: orderId,
      p_new_status: newStatus,
      p_internal_note: null,
      p_customer_note: null,
    });

    if (error) {
      redirect(
        buildListUrl({
          q: returnQ,
          branchId: returnBranchId,
          status: returnStatus,
          notice: `error:${encodeURIComponent(error.message)}`,
        }),
      );
    }

    revalidatePath('/online-orders');
    redirect(
      buildListUrl({
        q: returnQ,
        branchId: returnBranchId,
        status: returnStatus,
        notice: 'status_saved',
      }),
    );
  };

  const reviewProof = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId || !actionSession.effectiveRole) {
      redirect('/no-access');
    }

    const actionSupabase = actionSession.supabase;
    const actionOrgId = actionSession.orgId;
    const actionRole = actionSession.effectiveRole;
    const actionUserId = actionSession.userId;

    const proofId = String(formData.get('proof_id') ?? '').trim();
    const decision = String(formData.get('decision') ?? '').trim();
    const reviewNote = String(formData.get('review_note') ?? '').trim();
    const returnQ = String(formData.get('return_q') ?? '').trim();
    const returnBranchId = String(formData.get('return_branch_id') ?? '').trim();
    const returnStatus = String(formData.get('return_status') ?? '').trim();

    if (!proofId || !['approved', 'rejected'].includes(decision)) {
      redirect(
        buildListUrl({
          q: returnQ,
          branchId: returnBranchId,
          status: returnStatus,
          notice: 'invalid_proof_review',
        }),
      );
    }

    const { data: proofRaw } = await actionSupabase
      .from('online_order_payment_proofs' as never)
      .select('id, org_id, online_order_id')
      .eq('id', proofId)
      .eq('org_id', actionOrgId)
      .maybeSingle();
    const proofRow = proofRaw as {
      id: string;
      org_id: string;
      online_order_id: string;
    } | null;

    if (!proofRow) {
      redirect(
        buildListUrl({
          q: returnQ,
          branchId: returnBranchId,
          status: returnStatus,
          notice: 'proof_not_found',
        }),
      );
    }

    const { data: orderRaw } = await actionSupabase
      .from('online_orders' as never)
      .select('id, branch_id')
      .eq('id', proofRow.online_order_id)
      .eq('org_id', actionOrgId)
      .maybeSingle();
    const orderRow = orderRaw as { id: string; branch_id: string } | null;

    if (!orderRow) {
      redirect(
        buildListUrl({
          q: returnQ,
          branchId: returnBranchId,
          status: returnStatus,
          notice: 'order_not_found',
        }),
      );
    }

    if (actionRole === 'staff') {
      const { data: membership } = await actionSupabase
        .from('branch_memberships')
        .select('id')
        .eq('org_id', actionOrgId)
        .eq('user_id', actionUserId)
        .eq('branch_id', orderRow.branch_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!membership) {
        redirect('/no-access');
      }

      const { data: modules } = await actionSupabase.rpc(
        'rpc_get_staff_effective_modules',
      );
      const enabledOnlineOrders = modules?.some(
        (module) => module.module_key === 'online_orders' && module.is_enabled,
      );
      if (!enabledOnlineOrders) {
        redirect('/no-access');
      }
    }

    const { error } = await actionSupabase
      .from('online_order_payment_proofs' as never)
      .update(
        {
          review_status: decision as 'approved' | 'rejected',
          review_note: reviewNote || null,
          reviewed_by_user_id: actionUserId,
          reviewed_at: new Date().toISOString(),
        } as never,
      )
      .eq('id', proofId)
      .eq('org_id', actionOrgId);

    if (error) {
      redirect(
        buildListUrl({
          q: returnQ,
          branchId: returnBranchId,
          status: returnStatus,
          notice: `error:${encodeURIComponent(error.message)}`,
        }),
      );
    }

    revalidatePath('/online-orders');
    redirect(
      buildListUrl({
        q: returnQ,
        branchId: returnBranchId,
        status: returnStatus,
        notice: 'proof_review_saved',
      }),
    );
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pedidos online
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Gestiona pedidos creados desde storefront, con cambios de estado y
            acceso rápido al tracking.
          </p>
          {resolvedSearchParams.notice === 'status_saved' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Estado actualizado.
            </p>
          ) : null}
          {resolvedSearchParams.notice === 'proof_review_saved' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Revisión de comprobante guardada.
            </p>
          ) : null}
          {resolvedSearchParams.notice === 'invalid_proof_review' ? (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Revisión inválida.
            </p>
          ) : null}
          {resolvedSearchParams.notice === 'proof_not_found' ? (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              No encontramos el comprobante.
            </p>
          ) : null}
          {resolvedSearchParams.notice?.startsWith('error:') ? (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {decodeURIComponent(
                resolvedSearchParams.notice.replace('error:', ''),
              )}
            </p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-end">
            <div>
              <label className="text-xs font-semibold text-zinc-600" htmlFor="q">
                Buscar
              </label>
              <input
                id="q"
                name="q"
                defaultValue={query}
                placeholder="Pedido, cliente o teléfono"
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="branch_id"
              >
                Sucursal
              </label>
              <select
                id="branch_id"
                name="branch_id"
                defaultValue={selectedBranchId}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                {role === 'org_admin' ? (
                  <option value="">Todas</option>
                ) : null}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600" htmlFor="status">
                Estado
              </label>
              <select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="ready_for_pickup">Guardado/listo</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              Aplicar
            </button>
          </form>
        </section>

        <section className="grid gap-3">
          {orders.length === 0 ? (
            <article className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              No hay pedidos online para este filtro.
            </article>
          ) : null}

          {orders.map((order) => {
            const nextStatuses = getNextStatuses(order.status);
            const latestProof = latestProofByOrderId.get(order.online_order_id) ?? null;
            const proofUrl = signedProofUrlByOrderId.get(order.online_order_id) ?? '';
            return (
              <article
                key={order.online_order_id}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {order.order_code}
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {order.customer_name}
                    </h2>
                    <p className="text-sm text-zinc-600">
                      {order.customer_phone} · {order.branch_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900">
                      {formatCurrency(order.total_amount)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDateTime(order.created_at)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-orange-700">
                      {statusLabel[order.status]}
                    </p>
                  </div>
                </div>

                {order.customer_notes ? (
                  <p className="mt-3 rounded bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    Nota cliente: {order.customer_notes}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {order.tracking_token ? (
                    <Link
                      href={`/o/${order.tracking_token}`}
                      className="rounded-full border border-zinc-300 px-3 py-1 font-semibold text-zinc-700"
                    >
                      Ver tracking
                    </Link>
                  ) : null}
                  {latestProof ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                      Comprobante: {latestProof.review_status}
                    </span>
                  ) : (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-semibold text-zinc-600">
                      Sin comprobante
                    </span>
                  )}
                </div>

                {latestProof ? (
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-600">
                      Último comprobante: {formatDateTime(latestProof.uploaded_at)}
                    </p>
                    {proofUrl ? (
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                      >
                        Ver comprobante
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">
                        No se pudo generar vista previa temporal.
                      </p>
                    )}
                    {latestProof.review_note ? (
                      <p className="mt-2 text-xs text-zinc-700">
                        Nota revisión: {latestProof.review_note}
                      </p>
                    ) : null}
                    <form action={reviewProof} className="mt-3 grid gap-2">
                      <input type="hidden" name="proof_id" value={latestProof.id} />
                      <input type="hidden" name="return_q" value={query} />
                      <input
                        type="hidden"
                        name="return_branch_id"
                        value={selectedBranchId}
                      />
                      <input type="hidden" name="return_status" value={statusFilter} />
                      <textarea
                        name="review_note"
                        placeholder="Nota de revisión (opcional)"
                        className="min-h-20 rounded border border-zinc-300 bg-white px-3 py-2 text-xs"
                        defaultValue={latestProof.review_note ?? ''}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          name="decision"
                          value="approved"
                          className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                        >
                          Aprobar comprobante
                        </button>
                        <button
                          type="submit"
                          name="decision"
                          value="rejected"
                          className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                        >
                          Rechazar comprobante
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {nextStatuses.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {nextStatuses.map((nextStatus) => (
                      <form key={nextStatus} action={setStatus}>
                        <input
                          type="hidden"
                          name="online_order_id"
                          value={order.online_order_id}
                        />
                        <input type="hidden" name="new_status" value={nextStatus} />
                        <input type="hidden" name="return_q" value={query} />
                        <input
                          type="hidden"
                          name="return_branch_id"
                          value={selectedBranchId}
                        />
                        <input
                          type="hidden"
                          name="return_status"
                          value={statusFilter}
                        />
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700"
                        >
                          Marcar {statusLabel[nextStatus]}
                        </button>
                      </form>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs font-semibold text-zinc-500">
                    Estado final, sin transiciones disponibles.
                  </p>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </PageShell>
  );
}
