import { redirect } from 'next/navigation';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SearchParams = {
  from?: string;
  to?: string;
  action?: string;
  actor?: string;
  page?: string;
};

type AuditEntry = {
  id: string;
  org_id: string;
  branch_id: string | null;
  branch_name: string | null;
  created_at: string;
  action_key: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string;
  actor_display_name: string | null;
  actor_role: string | null;
  metadata: Record<string, unknown> | null;
};

const ACTION_LABELS: Record<string, string> = {
  product_upsert: 'Producto actualizado',
  stock_manual_adjust: 'Ajuste manual de stock',
  sale_created: 'Venta registrada',
  supplier_upsert: 'Proveedor actualizado',
  supplier_product_upsert: 'Producto de proveedor actualizado',
  supplier_product_removed: 'Producto de proveedor removido',
  supplier_order_created: 'Pedido a proveedor creado',
  supplier_order_item_upsert: 'Item de pedido actualizado',
  supplier_order_item_removed: 'Item de pedido removido',
  supplier_order_status_set: 'Estado de pedido actualizado',
  supplier_order_received: 'Pedido recibido',
  supplier_order_reconciled: 'Pedido conciliado',
  supplier_order_expected_receive_on_set:
    'Fecha estimada de recepción actualizada',
  expiration_batch_created: 'Lote de vencimiento creado',
  expiration_batch_adjusted: 'Lote de vencimiento ajustado',
  expiration_batch_date_corrected: 'Fecha de vencimiento corregida',
  expiration_waste_recorded: 'Batch movido a desperdicio',
  client_upsert: 'Cliente actualizado',
  special_order_created: 'Pedido especial creado',
  special_order_status_set: 'Estado de pedido especial actualizado',
  user_invited: 'Usuario invitado',
  user_membership_updated: 'Membresia actualizada',
  branch_upsert: 'Sucursal actualizada',
  staff_module_access_set: 'Permisos de staff actualizados',
  stock_safety_set: 'Stock de seguridad actualizado',
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-ES', { hour12: false });
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId) {
    redirect('/no-access');
  }
  const supabase = session.supabase;
  const orgId = session.orgId;

  const from = typeof searchParams.from === 'string' ? searchParams.from : '';
  const to = typeof searchParams.to === 'string' ? searchParams.to : '';
  const action =
    typeof searchParams.action === 'string' ? searchParams.action : '';
  const actor =
    typeof searchParams.actor === 'string' ? searchParams.actor : '';
  const pageRaw =
    typeof searchParams.page === 'string' ? searchParams.page : '1';
  const page = Math.max(Number(pageRaw) || 1, 1);
  const limit = 50;
  const fromIso = from ? `${from}T00:00:00.000Z` : null;
  const toIso = to ? `${to}T23:59:59.999Z` : null;

  let auditQuery = supabase
    .from('v_audit_log_admin')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (fromIso) auditQuery = auditQuery.gte('created_at', fromIso);
  if (toIso) auditQuery = auditQuery.lte('created_at', toIso);
  if (action) auditQuery = auditQuery.eq('action_key', action);
  if (actor) auditQuery = auditQuery.eq('actor_user_id', actor);

  const [auditResult, usersResult] = await Promise.all([
    auditQuery,
    supabase
      .from('org_users')
      .select('user_id, display_name, role')
      .eq('org_id', orgId)
      .order('display_name', { ascending: true }),
  ]);

  const auditEntries = (auditResult.data ?? []) as AuditEntry[];
  const totalCount = auditResult.count ?? auditEntries.length;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  const orgUsers = usersResult.data ?? [];

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Auditoria</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Registro de acciones importantes dentro de la organizacion.
          </p>
        </div>

        <form className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-semibold text-zinc-600"
              htmlFor="from"
            >
              Desde
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-600" htmlFor="to">
              Hasta
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-semibold text-zinc-600"
              htmlFor="action"
            >
              Accion
            </label>
            <input
              id="action"
              name="action"
              placeholder="action_key"
              defaultValue={action}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-semibold text-zinc-600"
              htmlFor="actor"
            >
              Usuario
            </label>
            <select
              id="actor"
              name="actor"
              defaultValue={actor}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {orgUsers.map((orgUser) => (
                <option key={orgUser.user_id} value={orgUser.user_id}>
                  {(orgUser.display_name || orgUser.user_id).toString()} (
                  {orgUser.role})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Filtrar
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            <span>
              Mostrando {auditEntries.length} de {totalCount} acciones
            </span>
            <span>
              Pagina {page} de {totalPages}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Accion</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Entidad</th>
                  <th className="px-4 py-3">Sucursal</th>
                  <th className="px-4 py-3">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm text-zinc-500"
                      colSpan={6}
                    >
                      No hay acciones registradas en el periodo seleccionado.
                    </td>
                  </tr>
                ) : (
                  auditEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3 text-zinc-700">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="px-4 py-3 text-zinc-900">
                        {ACTION_LABELS[entry.action_key] || entry.action_key}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {(
                          entry.actor_display_name || entry.actor_user_id
                        ).toString()}{' '}
                        ({entry.actor_role || 'N/A'})
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {entry.entity_type}
                        {entry.entity_id ? ` · ${entry.entity_id}` : ''}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {entry.branch_name || entry.branch_id || '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {entry.metadata ? (
                          <details>
                            <summary className="cursor-pointer text-xs text-zinc-500">
                              Ver
                            </summary>
                            <pre className="mt-2 max-w-sm overflow-auto rounded bg-zinc-900 p-2 text-xs text-zinc-100">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            <a
              className={`rounded border border-zinc-200 px-3 py-1 ${
                page <= 1 ? 'pointer-events-none opacity-50' : ''
              }`}
              href={`?from=${from}&to=${to}&action=${action}&actor=${actor}&page=${page - 1}`}
            >
              Anterior
            </a>
            <a
              className={`rounded border border-zinc-200 px-3 py-1 ${
                page >= totalPages ? 'pointer-events-none opacity-50' : ''
              }`}
              href={`?from=${from}&to=${to}&action=${action}&actor=${actor}&page=${page + 1}`}
            >
              Siguiente
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
