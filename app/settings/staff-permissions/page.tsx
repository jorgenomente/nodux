import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

type SearchParams = {
  scope?: string;
  result?: string;
};

type BranchRow = {
  branch_id: string;
  name: string;
};

type ModuleAccessRow = {
  module_key: string;
  is_enabled: boolean;
  source_scope: string;
};

const STAFF_FULL_ACCESS_KEY = '__full_access__';

const MODULE_DEFINITIONS: Record<string, { label: string; description: string }> = {
  dashboard: {
    label: 'Dashboard',
    description: 'Resumen operativo del negocio para seguimiento diario.',
  },
  pos: {
    label: 'POS',
    description: 'Registro de ventas rapidas y cobro desde caja.',
  },
  sales: {
    label: 'Ventas',
    description: 'Historial y consulta de ventas realizadas.',
  },
  sales_statistics: {
    label: 'Estadisticas',
    description: 'Analitica comercial y tendencias de ventas.',
  },
  cashbox: {
    label: 'Caja',
    description: 'Apertura, movimientos y cierre de caja por sucursal.',
  },
  products: {
    label: 'Productos',
    description: 'Gestion y consulta del catalogo de productos.',
  },
  products_lookup: {
    label: 'Consulta de precios',
    description: 'Busqueda de productos y precios para atencion en piso.',
  },
  clients: {
    label: 'Clientes',
    description: 'Gestion operativa de clientes y pedidos especiales.',
  },
  expirations: {
    label: 'Vencimientos',
    description: 'Seguimiento y correccion de lotes proximos a vencer.',
  },
  suppliers: {
    label: 'Proveedores',
    description: 'Consulta de proveedores y su informacion operativa.',
  },
  orders: {
    label: 'Pedidos',
    description: 'Pedidos a proveedor y seguimiento de estado.',
  },
  orders_calendar: {
    label: 'Calendario',
    description: 'Agenda operativa de envios y recepciones de proveedores.',
  },
  payments: {
    label: 'Pagos',
    description: 'Registro y control de pagos a proveedores.',
  },
  onboarding: {
    label: 'Onboarding',
    description: 'Carga/importacion de datos maestros.',
  },
  online_orders: {
    label: 'Pedidos online',
    description: 'Gestion operativa de pedidos entrantes desde storefront.',
  },
  settings: {
    label: 'Configuracion',
    description: 'Acceso a configuraciones operativas del sistema.',
  },
};

const ALL_MODULE_KEYS = [
  'dashboard',
  'pos',
  'sales',
  'sales_statistics',
  'cashbox',
  'products',
  'products_lookup',
  'suppliers',
  'orders',
  'orders_calendar',
  'payments',
  'clients',
  'expirations',
  'onboarding',
  'online_orders',
  'settings',
] as const;

const FALLBACK_MODULE_KEYS = ALL_MODULE_KEYS.filter((moduleKey) =>
  Boolean(MODULE_DEFINITIONS[moduleKey]),
);

const getOrgAdminContext = async () => {
  const session = await getOrgAdminSession();
  if (!session?.orgId) return null;
  return { supabase: session.supabase, orgId: session.orgId };
};

export default async function SettingsStaffPermissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await getOrgAdminContext();

  if (!context) {
    redirect('/no-access');
  }

  const scope =
    typeof searchParams.scope === 'string' && searchParams.scope.trim()
      ? searchParams.scope
      : 'org';
  const scopeBranchId = scope === 'org' ? null : scope;

  const setModuleAccess = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const moduleKey = String(formData.get('module_key') ?? '').trim();
    const scopeBranch = String(formData.get('scope_branch_id') ?? '').trim();
    const isEnabled = String(formData.get('is_enabled') ?? 'false') === 'true';

    if (!moduleKey) {
      redirect('/settings/staff-permissions?result=invalid');
    }

    await auth.supabase.rpc('rpc_set_staff_module_access', {
      p_org_id: auth.orgId,
      p_branch_id: (scopeBranch || null) as unknown as string,
      p_module_key: moduleKey,
      p_is_enabled: isEnabled,
      p_role: 'staff',
    });

    revalidatePath('/settings/staff-permissions');
    revalidatePath('/pos');
    revalidatePath('/cashbox');
    revalidatePath('/products/lookup');
    revalidatePath('/clients');
    revalidatePath('/expirations');
    revalidatePath('/online-orders');
    revalidatePath('/settings/audit-log');

    const nextScopeQuery = scopeBranch ? scopeBranch : 'org';
    redirect(
      `/settings/staff-permissions?scope=${nextScopeQuery}&result=saved`,
    );
  };

  const [branchesResult, accessResult] = await Promise.all([
    context.supabase
      .from('v_branches_admin')
      .select('branch_id,name')
      .eq('org_id', context.orgId)
      .eq('is_active', true)
      .order('name'),
    context.supabase.rpc('rpc_get_staff_module_access', {
      p_org_id: context.orgId,
      p_branch_id: scopeBranchId as unknown as string,
    }),
  ]);

  const branches = (branchesResult.data ?? []) as BranchRow[];
  const accessRows = (accessResult.data ?? []) as ModuleAccessRow[];
  const accessByModule = new Map<string, ModuleAccessRow>(
    accessRows.map((row) => [row.module_key, row]),
  );

  const moduleKeys = [...FALLBACK_MODULE_KEYS];
  const fullAccessRow = accessByModule.get(STAFF_FULL_ACCESS_KEY);
  const fullAccessEnabled = fullAccessRow?.is_enabled ?? false;
  const fullAccessSource = fullAccessRow?.source_scope ?? 'none';

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Permisos de staff
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Define que modulos estan disponibles para usuarios operativos.
          </p>
          {searchParams.result === 'saved' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Permiso actualizado.
            </p>
          ) : null}
          {searchParams.result === 'invalid' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              El modulo indicado no es valido.
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <form className="grid gap-2 md:max-w-sm">
            <label
              className="text-xs font-semibold text-zinc-600"
              htmlFor="scope"
            >
              Scope
            </label>
            <select
              id="scope"
              name="scope"
              defaultValue={scope}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="org">Toda la organizacion</option>
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  Sucursal: {branch.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="mt-2 w-fit rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
            >
              Aplicar filtro
            </button>
          </form>
        </section>

        <section className="grid gap-3">
          <form
            action={setModuleAccess}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <input type="hidden" name="module_key" value={STAFF_FULL_ACCESS_KEY} />
            <input
              type="hidden"
              name="scope_branch_id"
              value={scopeBranchId ?? ''}
            />
            <input
              type="hidden"
              name="is_enabled"
              value={String(!fullAccessEnabled)}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Acceso completo staff (operativo)
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Habilita por defecto todos los módulos operativos de staff.
                  Luego puedes deshabilitar módulos puntuales debajo.
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Fuente: {fullAccessSource}
                </p>
              </div>
              <button
                type="submit"
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  fullAccessEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-900 text-white'
                }`}
              >
                {fullAccessEnabled ? 'Deshabilitar' : 'Habilitar'}
              </button>
            </div>
          </form>

          {moduleKeys.map((moduleKey) => {
            const row = accessByModule.get(moduleKey);
            const currentEnabled =
              row?.is_enabled ?? fullAccessEnabled;
            const resolvedSource =
              row?.source_scope ??
              (fullAccessEnabled ? `full_access(${fullAccessSource})` : 'none');
            const moduleMeta = MODULE_DEFINITIONS[moduleKey] ?? {
              label: moduleKey.replaceAll('_', ' '),
              description: 'Modulo sin descripcion.',
            };

            return (
              <form
                key={moduleKey}
                action={setModuleAccess}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <input type="hidden" name="module_key" value={moduleKey} />
                <input
                  type="hidden"
                  name="scope_branch_id"
                  value={scopeBranchId ?? ''}
                />
                <input
                  type="hidden"
                  name="is_enabled"
                  value={String(!currentEnabled)}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">
                      {moduleMeta.label}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {moduleMeta.description}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Fuente: {resolvedSource}
                    </p>
                  </div>
                  <button
                    type="submit"
                    className={`rounded px-3 py-2 text-sm font-semibold ${
                      currentEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-zinc-900 text-white'
                    }`}
                  >
                    {currentEnabled ? 'Deshabilitar' : 'Habilitar'}
                  </button>
                </div>
              </form>
            );
          })}
        </section>
      </div>
    </PageShell>
  );
}
