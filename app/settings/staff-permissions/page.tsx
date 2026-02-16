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

const MODULE_DEFINITIONS: Record<
  string,
  { label: string; description: string }
> = {
  pos: {
    label: 'POS',
    description: 'Registro de ventas rapidas y cobro desde caja.',
  },
  cashbox: {
    label: 'Caja',
    description: 'Apertura, movimientos y cierre de caja por sucursal.',
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
};

const FALLBACK_MODULE_KEYS = Object.keys(MODULE_DEFINITIONS);

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

  const moduleKeys = Array.from(
    new Set([
      ...FALLBACK_MODULE_KEYS,
      ...accessRows.map((row) => row.module_key),
    ]),
  );

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
          {moduleKeys.map((moduleKey) => {
            const row = accessByModule.get(moduleKey);
            const currentEnabled = row?.is_enabled ?? false;
            const moduleMeta = MODULE_DEFINITIONS[moduleKey] ?? {
              label: moduleKey,
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
                      Fuente: {row?.source_scope ?? 'none'}
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
