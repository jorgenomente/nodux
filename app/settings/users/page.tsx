import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type SearchParams = {
  result?: string;
};

type SettingsUserRow = {
  org_id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: 'org_admin' | 'staff' | 'superadmin';
  is_active: boolean;
  branch_ids: string[] | null;
  created_at: string;
};

type BranchRow = {
  branch_id: string;
  name: string;
  is_active: boolean;
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

  return { supabase, orgId: membership.org_id, currentUserId: user.id };
};

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await getOrgAdminContext();

  if (!context) {
    redirect('/no-access');
  }

  const inviteUser = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase();
    const role = String(formData.get('role') ?? 'staff') as
      | 'org_admin'
      | 'staff';
    const branchIds = formData
      .getAll('branch_ids')
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!email || !email.includes('@')) {
      redirect('/settings/users?result=invalid_invite');
    }

    await auth.supabase.rpc('rpc_invite_user_to_org', {
      p_org_id: auth.orgId,
      p_email: email,
      p_role: role,
      p_branch_ids: role === 'staff' ? branchIds : [],
    });

    revalidatePath('/settings/users');
    revalidatePath('/settings/audit-log');
    redirect('/settings/users?result=invited');
  };

  const updateMembership = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const userId = String(formData.get('user_id') ?? '').trim();
    const role = String(formData.get('role') ?? 'staff') as
      | 'org_admin'
      | 'staff';
    const displayName = String(formData.get('display_name') ?? '').trim();
    const isActiveLocked = formData.get('is_active_locked') === 'true';
    const isActiveCurrent = formData.get('is_active_current') === 'true';
    const isActive = isActiveLocked
      ? isActiveCurrent
      : formData.get('is_active') === 'on';
    const branchIds = formData
      .getAll('branch_ids')
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!userId) {
      redirect('/settings/users?result=invalid_update');
    }

    await auth.supabase.rpc('rpc_update_user_membership', {
      p_org_id: auth.orgId,
      p_user_id: userId,
      p_role: role,
      p_is_active: isActive,
      p_display_name: displayName,
      p_branch_ids: role === 'staff' ? branchIds : [],
    });

    revalidatePath('/settings/users');
    revalidatePath('/settings/audit-log');
    redirect('/settings/users?result=updated');
  };

  const [usersResult, branchesResult] = await Promise.all([
    context.supabase
      .from('v_settings_users_admin')
      .select('*')
      .eq('org_id', context.orgId)
      .order('created_at', { ascending: false }),
    context.supabase
      .from('v_branches_admin')
      .select('branch_id,name,is_active')
      .eq('org_id', context.orgId)
      .eq('is_active', true)
      .order('name'),
  ]);

  const users = (usersResult.data ?? []) as SettingsUserRow[];
  const branches = (branchesResult.data ?? []) as BranchRow[];

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Usuarios</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Invita usuarios y administra rol, sucursales y estado de acceso.
          </p>
          {searchParams.result === 'invited' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Usuario invitado correctamente.
            </p>
          ) : null}
          {searchParams.result === 'updated' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Membresia actualizada.
            </p>
          ) : null}
          {searchParams.result === 'invalid_invite' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Ingresa un email valido para invitar.
            </p>
          ) : null}
          {searchParams.result === 'invalid_update' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No se pudo procesar la actualizacion del usuario.
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Invitar usuario
          </h2>
          <form action={inviteUser} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="invite-email"
              >
                Email
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
                placeholder="persona@empresa.com"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="invite-role"
              >
                Rol
              </label>
              <select
                id="invite-role"
                name="role"
                defaultValue="staff"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="staff">Staff</option>
                <option value="org_admin">Org Admin</option>
              </select>
            </div>
            <div className="flex items-end md:col-span-1">
              <button
                type="submit"
                className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Invitar
              </button>
            </div>
            <div className="md:col-span-4">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="invite-branches"
              >
                Sucursales para Staff (si aplica)
              </label>
              <select
                id="invite-branches"
                name="branch_ids"
                multiple
                size={Math.min(branches.length || 1, 6)}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Usuarios de la organizacion
          </h2>
          <div className="mt-4 grid gap-4">
            {users.length === 0 ? (
              <p className="rounded border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                No hay usuarios registrados.
              </p>
            ) : (
              users.map((orgUser) => {
                const userBranchIds = Array.isArray(orgUser.branch_ids)
                  ? orgUser.branch_ids
                  : [];
                const isCurrentUser = orgUser.user_id === context.currentUserId;

                return (
                  <form
                    key={orgUser.user_id}
                    action={updateMembership}
                    className="grid gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-6"
                  >
                    <input
                      type="hidden"
                      name="user_id"
                      value={orgUser.user_id}
                    />
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-xs font-semibold text-zinc-600">
                        Email
                      </label>
                      <input
                        value={orgUser.email ?? ''}
                        disabled
                        className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-1">
                      <label className="text-xs font-semibold text-zinc-600">
                        Nombre
                      </label>
                      <input
                        name="display_name"
                        defaultValue={orgUser.display_name ?? ''}
                        className="rounded border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-1">
                      <label className="text-xs font-semibold text-zinc-600">
                        Rol
                      </label>
                      <select
                        name="role"
                        defaultValue={orgUser.role}
                        className="rounded border border-zinc-200 px-3 py-2 text-sm"
                      >
                        <option value="staff">Staff</option>
                        <option value="org_admin">Org Admin</option>
                      </select>
                    </div>
                    <div className="flex items-end md:col-span-1">
                      {isCurrentUser ? (
                        <>
                          <input
                            type="hidden"
                            name="is_active_locked"
                            value="true"
                          />
                          <input
                            type="hidden"
                            name="is_active_current"
                            value={String(orgUser.is_active)}
                          />
                        </>
                      ) : null}
                      <label className="flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={orgUser.is_active}
                          disabled={isCurrentUser}
                        />
                        Activo
                      </label>
                    </div>
                    <div className="flex items-end justify-end md:col-span-1">
                      <button
                        type="submit"
                        className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                      >
                        Guardar
                      </button>
                    </div>

                    <div className="md:col-span-6">
                      <label className="text-xs font-semibold text-zinc-600">
                        Sucursales asignadas
                      </label>
                      <select
                        name="branch_ids"
                        multiple
                        size={Math.min(branches.length || 1, 6)}
                        defaultValue={userBranchIds}
                        className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                      >
                        {branches.map((branch) => (
                          <option
                            key={branch.branch_id}
                            value={branch.branch_id}
                          >
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </form>
                );
              })
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
