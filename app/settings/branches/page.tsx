import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type BranchRow = {
  branch_id: string;
  org_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  members_count: number | null;
};

type SearchParams = {
  result?: string;
};

const getOrgAdminContext = async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.org_id || membership.role !== 'org_admin') {
    return null;
  }

  return { supabase, orgId: membership.org_id };
};

export default async function SettingsBranchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await getOrgAdminContext();

  if (!context) {
    redirect('/no-access');
  }

  const saveBranch = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const branchIdRaw = String(formData.get('branch_id') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    const addressRaw = String(formData.get('address') ?? '').trim();
    const isActive = formData.get('is_active') === 'on';

    if (!name) {
      redirect('/settings/branches?result=invalid');
    }

    await auth.supabase.rpc('rpc_upsert_branch', {
      p_branch_id: branchIdRaw || randomUUID(),
      p_org_id: auth.orgId,
      p_name: name,
      p_address: addressRaw,
      p_is_active: isActive,
    });

    revalidatePath('/settings/branches');
    revalidatePath('/products');
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    redirect('/settings/branches?result=saved');
  };

  const { data } = await context.supabase
    .from('v_branches_admin')
    .select('*')
    .eq('org_id', context.orgId)
    .order('name');

  const branches = (data ?? []) as BranchRow[];

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sucursales</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Crea y actualiza sucursales. Las sucursales inactivas dejan de estar
            disponibles para operacion.
          </p>
          {searchParams.result === 'saved' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Cambios guardados.
            </p>
          ) : null}
          {searchParams.result === 'invalid' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              El nombre es obligatorio.
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Nueva sucursal
          </h2>
          <form action={saveBranch} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="new-name"
              >
                Nombre
              </label>
              <input
                id="new-name"
                name="name"
                required
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Sucursal Centro"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="new-address"
              >
                Direccion
              </label>
              <input
                id="new-address"
                name="address"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Calle 123"
              />
            </div>
            <div className="flex items-end gap-3 md:col-span-1">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="is_active" defaultChecked />
                Activa
              </label>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Crear
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Sucursales existentes
          </h2>
          <div className="mt-4 grid gap-4">
            {branches.length === 0 ? (
              <p className="rounded border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                Todavia no hay sucursales cargadas.
              </p>
            ) : (
              branches.map((branch) => (
                <form
                  key={branch.branch_id}
                  action={saveBranch}
                  className="grid gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-5"
                >
                  <input
                    type="hidden"
                    name="branch_id"
                    value={branch.branch_id}
                  />
                  <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-xs font-semibold text-zinc-600">
                      Nombre
                    </label>
                    <input
                      name="name"
                      defaultValue={branch.name}
                      className="rounded border border-zinc-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-600">
                      Direccion
                    </label>
                    <input
                      name="address"
                      defaultValue={branch.address ?? ''}
                      className="rounded border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end md:col-span-1">
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={branch.is_active}
                      />
                      Activa
                    </label>
                  </div>
                  <div className="flex items-end justify-between gap-2 md:col-span-1">
                    <span className="text-xs text-zinc-500">
                      {Number(branch.members_count ?? 0)} usuarios
                    </span>
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              ))
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
