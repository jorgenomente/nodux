import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getOrgAdminSession } from '@/lib/auth/org-session';
import RoleBranchChecklist from '@/app/settings/users/RoleBranchChecklist';

type SearchParams = {
  result?: string;
  view?: string;
};

const MANAGEABLE_ROLES = ['org_admin', 'staff'] as const;

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

type InviteUserRow = {
  user_id?: string | null;
  invited_user_id?: string | null;
};

const roleLabel = (role: SettingsUserRow['role']) => {
  if (role === 'org_admin') return 'Org Admin';
  if (role === 'staff') return 'Staff';
  return 'Superadmin';
};

const getOrgAdminContext = async () => {
  const session = await getOrgAdminSession();
  if (!session?.orgId) return null;
  return {
    supabase: session.supabase,
    orgId: session.orgId,
    currentUserId: session.userId,
  };
};

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const context = await getOrgAdminContext();

  if (!context) {
    redirect('/no-access');
  }

  const createUser = async (formData: FormData): Promise<void> => {
    'use server';

    const auth = await getOrgAdminContext();
    if (!auth) {
      redirect('/no-access');
    }

    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(formData.get('password') ?? '');
    const displayName = String(formData.get('display_name') ?? '').trim();
    const role = String(formData.get('role') ?? 'staff') as
      | 'org_admin'
      | 'staff';
    const branchIds = formData
      .getAll('branch_ids')
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!MANAGEABLE_ROLES.includes(role)) {
      redirect('/settings/users?result=superadmin_forbidden');
    }

    if (!email || !email.includes('@')) {
      redirect('/settings/users?result=invalid_create');
    }
    if (password.length < 8) {
      redirect('/settings/users?result=weak_password');
    }
    if (role === 'staff' && branchIds.length === 0) {
      redirect('/settings/users?result=missing_branch');
    }

    const admin = createAdminSupabaseClient();

    let createdUserId: string | null = null;
    let createdInAuth = false;

    const { data: createdUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: displayName ? { display_name: displayName } : undefined,
      });

    const message = String(createError?.message ?? '').toLowerCase();
    const alreadyExists =
      createError?.code === 'email_exists' ||
      message.includes('already') ||
      message.includes('exists');

    if (createError || !createdUser.user?.id) {
      if (!alreadyExists) {
        redirect('/settings/users?result=create_failed');
      }
    } else {
      createdUserId = createdUser.user.id;
      createdInAuth = true;
    }

    const { data: inviteData, error: inviteError } = await auth.supabase.rpc(
      'rpc_invite_user_to_org',
      {
        p_org_id: auth.orgId,
        p_email: email,
        p_role: role,
        p_branch_ids: role === 'staff' ? branchIds : [],
      },
    );
    if (inviteError) {
      if (createdInAuth && createdUserId) {
        await admin.auth.admin.deleteUser(createdUserId);
      }
      const message = String(createError?.message ?? '').toLowerCase();
      console.error('[settings.users.create] rpc_invite_user_to_org failed', {
        orgId: auth.orgId,
        email,
        role,
        error: inviteError.message,
        code: inviteError.code,
        details: inviteError.details,
        hint: inviteError.hint,
        createError: message || null,
      });
      redirect('/settings/users?result=membership_failed');
    }

    const inviteRows = Array.isArray(inviteData)
      ? (inviteData as InviteUserRow[])
      : [];
    const invitedUserId =
      inviteRows[0]?.invited_user_id ?? inviteRows[0]?.user_id ?? createdUserId;
    if (!invitedUserId) {
      if (createdInAuth && createdUserId) {
        await admin.auth.admin.deleteUser(createdUserId);
      }
      console.error('[settings.users.create] invite response without user id', {
        orgId: auth.orgId,
        email,
        role,
      });
      redirect('/settings/users?result=membership_failed');
    }

    const { error: membershipError } = await auth.supabase.rpc(
      'rpc_update_user_membership',
      {
        p_org_id: auth.orgId,
        p_user_id: invitedUserId,
        p_role: role,
        p_is_active: true,
        p_display_name: displayName,
        p_branch_ids: role === 'staff' ? branchIds : [],
      },
    );
    if (membershipError) {
      if (createdInAuth && createdUserId) {
        await admin.auth.admin.deleteUser(createdUserId);
      }
      console.error(
        '[settings.users.create] rpc_update_user_membership failed',
        {
          orgId: auth.orgId,
          userId: invitedUserId,
          role,
          error: membershipError.message,
          code: membershipError.code,
          details: membershipError.details,
          hint: membershipError.hint,
        },
      );
      redirect('/settings/users?result=membership_failed');
    }

    revalidatePath('/settings/users');
    revalidatePath('/settings/audit-log');
    redirect('/settings/users?result=created');
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
    const intent = String(formData.get('intent') ?? 'update_membership').trim();
    const resetPassword = String(formData.get('reset_password') ?? '');
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

    const { data: targetMembership } = await auth.supabase
      .from('org_users')
      .select('role')
      .eq('org_id', auth.orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (
      targetMembership?.role === 'superadmin' ||
      !MANAGEABLE_ROLES.includes(role)
    ) {
      redirect('/settings/users?result=superadmin_forbidden');
    }

    if (intent === 'reset_password') {
      if (resetPassword.length < 8) {
        redirect('/settings/users?result=weak_reset_password');
      }

      const admin = createAdminSupabaseClient();
      const { error: updatePasswordError } =
        await admin.auth.admin.updateUserById(userId, {
          password: resetPassword,
        });

      if (updatePasswordError) {
        redirect('/settings/users?result=reset_failed');
      }

      await admin.from('audit_log').insert({
        org_id: auth.orgId,
        action_key: 'user_password_reset_by_admin',
        entity_type: 'org_user',
        entity_id: userId,
        actor_user_id: auth.currentUserId,
        metadata: {
          source: 'settings_users',
        },
      });

      revalidatePath('/settings/users');
      revalidatePath('/settings/audit-log');
      redirect('/settings/users?result=password_reset');
    }

    const { error: updateMembershipError } = await auth.supabase.rpc(
      'rpc_update_user_membership',
      {
        p_org_id: auth.orgId,
        p_user_id: userId,
        p_role: role,
        p_is_active: isActive,
        p_display_name: displayName,
        p_branch_ids: role === 'staff' ? branchIds : [],
      },
    );
    if (updateMembershipError) {
      console.error(
        '[settings.users.update] rpc_update_user_membership failed',
        {
          orgId: auth.orgId,
          userId,
          role,
          error: updateMembershipError.message,
        },
      );
      redirect('/settings/users?result=membership_update_failed');
    }

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

  const users = ((usersResult.data ?? []) as SettingsUserRow[]).filter(
    (user) => user.role !== 'superadmin',
  );
  const branches = (branchesResult.data ?? []) as BranchRow[];
  const branchNameById = new Map(
    branches.map((branch) => [branch.branch_id, branch.name]),
  );
  const viewMode = params.view === 'cards' ? 'cards' : 'table';
  const tableViewHref = `/settings/users?view=table${
    params.result ? `&result=${encodeURIComponent(params.result)}` : ''
  }`;
  const cardsViewHref = `/settings/users?view=cards${
    params.result ? `&result=${encodeURIComponent(params.result)}` : ''
  }`;

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Usuarios</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Crea cuentas de acceso (sin validacion por email) y administra rol,
            sucursales y estado.
          </p>
          {params.result === 'created' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Usuario creado correctamente.
            </p>
          ) : null}
          {params.result === 'updated' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Membresia actualizada.
            </p>
          ) : null}
          {params.result === 'invalid_create' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Ingresa un email valido para crear la cuenta.
            </p>
          ) : null}
          {params.result === 'weak_password' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              La contraseña debe tener al menos 8 caracteres.
            </p>
          ) : null}
          {params.result === 'missing_branch' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Para usuarios Staff debes asignar al menos una sucursal.
            </p>
          ) : null}
          {params.result === 'email_exists' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Ya existe un usuario con ese email.
            </p>
          ) : null}
          {params.result === 'create_failed' ? (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              No se pudo crear el usuario. Intenta nuevamente.
            </p>
          ) : null}
          {params.result === 'membership_failed' ? (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Se creó la cuenta en Auth, pero falló la asignación a la
              organización/sucursales.
            </p>
          ) : null}
          {params.result === 'password_reset' ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Contraseña restablecida por admin.
            </p>
          ) : null}
          {params.result === 'weak_reset_password' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              La nueva contraseña debe tener al menos 8 caracteres.
            </p>
          ) : null}
          {params.result === 'reset_failed' ? (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              No se pudo restablecer la contraseña.
            </p>
          ) : null}
          {params.result === 'invalid_update' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No se pudo procesar la actualizacion del usuario.
            </p>
          ) : null}
          {params.result === 'membership_update_failed' ? (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              No se pudo actualizar la membresía del usuario.
            </p>
          ) : null}
          {params.result === 'superadmin_forbidden' ? (
            <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Los usuarios superadmin no se gestionan desde esta pantalla.
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <details>
            <summary className="cursor-pointer text-lg font-semibold text-zinc-900">
              Crear usuario
            </summary>
            <form
              action={createUser}
              className="mt-4 grid gap-4 border-t border-zinc-100 pt-4 md:grid-cols-4"
            >
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
              <div className="flex flex-col gap-1 md:col-span-2">
                <label
                  className="text-xs font-semibold text-zinc-600"
                  htmlFor="invite-display-name"
                >
                  Nombre visible (opcional)
                </label>
                <input
                  id="invite-display-name"
                  name="display_name"
                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="Maria Perez"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label
                  className="text-xs font-semibold text-zinc-600"
                  htmlFor="invite-password"
                >
                  Contraseña
                </label>
                <input
                  id="invite-password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="Minimo 8 caracteres"
                />
              </div>
              <div className="md:col-span-3">
                <RoleBranchChecklist
                  branches={branches}
                  defaultRole="staff"
                  roleLabel="Rol"
                  branchLabel="Sucursales para Staff (si aplica)"
                />
              </div>
              <div className="flex items-end md:col-span-1 md:justify-end">
                <button
                  type="submit"
                  className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Crear
                </button>
              </div>
            </form>
          </details>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">
              Usuarios de la organizacion
            </h2>
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs">
              <a
                href={tableViewHref}
                className={`rounded px-3 py-1.5 font-semibold ${
                  viewMode === 'table'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600'
                }`}
              >
                Tabla
              </a>
              <a
                href={cardsViewHref}
                className={`rounded px-3 py-1.5 font-semibold ${
                  viewMode === 'cards'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600'
                }`}
              >
                Tarjetas
              </a>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Vista activa:{' '}
            {viewMode === 'table'
              ? 'Tabla compacta por columnas'
              : 'Tarjetas con resumen visual'}
          </p>

          <div className="mt-4 grid gap-3">
            {users.length === 0 ? (
              <p className="rounded border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                No hay usuarios registrados.
              </p>
            ) : viewMode === 'table' ? (
              <>
                <div className="hidden grid-cols-12 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold tracking-wide text-zinc-600 uppercase md:grid">
                  <p className="col-span-3">Nombre</p>
                  <p className="col-span-3">Email</p>
                  <p className="col-span-2">Rol</p>
                  <p className="col-span-3">Sucursales</p>
                  <p className="col-span-1 text-right">Acción</p>
                </div>
                {users.map((orgUser) => {
                  const userBranchIds = Array.isArray(orgUser.branch_ids)
                    ? orgUser.branch_ids
                    : [];
                  const assignedBranchNames = userBranchIds.map(
                    (branchId) => branchNameById.get(branchId) ?? branchId,
                  );
                  const branchesLabel =
                    orgUser.role === 'org_admin'
                      ? 'Todas las sucursales (acceso global)'
                      : assignedBranchNames.length > 0
                        ? assignedBranchNames.join(', ')
                        : 'Sin sucursales';
                  const isCurrentUser =
                    orgUser.user_id === context.currentUserId;
                  const userName = orgUser.display_name || 'Sin nombre';
                  const userEmail = orgUser.email || 'Sin email';

                  return (
                    <form
                      key={orgUser.user_id}
                      action={updateMembership}
                      className="rounded-xl border border-zinc-200 p-4"
                    >
                      <input
                        type="hidden"
                        name="user_id"
                        value={orgUser.user_id}
                      />
                      <details>
                        <summary className="cursor-pointer list-none">
                          <div className="grid gap-2 md:grid-cols-12 md:items-center">
                            <div className="md:col-span-3">
                              <p className="text-xs font-semibold text-zinc-500 uppercase md:hidden">
                                Nombre
                              </p>
                              <p className="text-sm font-semibold text-zinc-900">
                                {userName}
                              </p>
                            </div>
                            <div className="md:col-span-3">
                              <p className="text-xs font-semibold text-zinc-500 uppercase md:hidden">
                                Email
                              </p>
                              <p className="text-sm text-zinc-700">
                                {userEmail}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-zinc-500 uppercase md:hidden">
                                Rol
                              </p>
                              <p className="text-sm text-zinc-700">
                                {roleLabel(orgUser.role)}
                              </p>
                            </div>
                            <div className="md:col-span-3">
                              <p className="text-xs font-semibold text-zinc-500 uppercase md:hidden">
                                Sucursales
                              </p>
                              <p className="text-sm text-zinc-700">
                                {branchesLabel}
                              </p>
                            </div>
                            <div className="md:col-span-1 md:text-right">
                              <span className="inline-flex rounded border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700">
                                Editar
                              </span>
                            </div>
                          </div>
                        </summary>

                        <div className="mt-3 grid gap-3 border-t border-zinc-100 pt-3 md:grid-cols-6">
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
                          <div className="md:col-span-2">
                            <RoleBranchChecklist
                              branches={branches}
                              defaultRole={
                                orgUser.role === 'staff' ? 'staff' : 'org_admin'
                              }
                              defaultSelectedBranchIds={userBranchIds}
                              roleLabel="Rol"
                              branchLabel="Sucursales asignadas"
                              roleName="role"
                              branchName="branch_ids"
                            />
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
                              name="intent"
                              value="update_membership"
                              className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                            >
                              Guardar
                            </button>
                          </div>

                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:col-span-6">
                            <h3 className="text-sm font-semibold text-zinc-900">
                              Credenciales (admin)
                            </h3>
                            <p className="mt-1 text-xs text-zinc-600">
                              La contraseña actual no se muestra. Solo un admin
                              puede asignar una nueva contraseña. Staff debe
                              solicitar este cambio al admin.
                            </p>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                              <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-semibold text-zinc-600">
                                  Usuario / email
                                </label>
                                <input
                                  value={orgUser.email ?? ''}
                                  disabled
                                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600"
                                />
                              </div>
                              <div className="flex flex-col gap-1 md:col-span-1">
                                <label className="text-xs font-semibold text-zinc-600">
                                  Nueva contraseña
                                </label>
                                <input
                                  type="password"
                                  name="reset_password"
                                  minLength={8}
                                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                                  placeholder="Minimo 8 caracteres"
                                />
                              </div>
                              <div className="md:col-span-3">
                                <button
                                  type="submit"
                                  name="intent"
                                  value="reset_password"
                                  className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                                >
                                  Restablecer contraseña
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </details>
                    </form>
                  );
                })}
              </>
            ) : (
              users.map((orgUser) => {
                const userBranchIds = Array.isArray(orgUser.branch_ids)
                  ? orgUser.branch_ids
                  : [];
                const assignedBranchNames = userBranchIds.map(
                  (branchId) => branchNameById.get(branchId) ?? branchId,
                );
                const branchesLabel =
                  orgUser.role === 'org_admin'
                    ? 'Todas las sucursales (acceso global)'
                    : assignedBranchNames.length > 0
                      ? assignedBranchNames.join(' · ')
                      : 'Sin sucursales asignadas';
                const isCurrentUser = orgUser.user_id === context.currentUserId;
                const userName = orgUser.display_name || 'Sin nombre';
                const userEmail = orgUser.email || 'Sin email';

                return (
                  <form
                    key={orgUser.user_id}
                    action={updateMembership}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <input
                      type="hidden"
                      name="user_id"
                      value={orgUser.user_id}
                    />
                    <details>
                      <summary className="cursor-pointer list-none">
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-base font-semibold text-zinc-900">
                                {userName}
                              </p>
                              <p className="text-sm text-zinc-700">
                                {userEmail}
                              </p>
                            </div>
                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-700 uppercase">
                              {roleLabel(orgUser.role)}
                            </span>
                          </div>
                          <div className="mt-2">
                            <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                              Sucursales
                            </p>
                            <p className="text-sm text-zinc-700">
                              {branchesLabel}
                            </p>
                          </div>
                          <div className="mt-3">
                            <span className="inline-flex rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                              Editar tarjeta
                            </span>
                          </div>
                        </div>
                      </summary>

                      <div className="mt-3 grid gap-3 border-t border-zinc-100 pt-3 md:grid-cols-6">
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
                        <div className="md:col-span-2">
                          <RoleBranchChecklist
                            branches={branches}
                            defaultRole={
                              orgUser.role === 'staff' ? 'staff' : 'org_admin'
                            }
                            defaultSelectedBranchIds={userBranchIds}
                            roleLabel="Rol"
                            branchLabel="Sucursales asignadas"
                            roleName="role"
                            branchName="branch_ids"
                          />
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
                            name="intent"
                            value="update_membership"
                            className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                          >
                            Guardar
                          </button>
                        </div>

                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:col-span-6">
                          <h3 className="text-sm font-semibold text-zinc-900">
                            Credenciales (admin)
                          </h3>
                          <p className="mt-1 text-xs text-zinc-600">
                            La contraseña actual no se muestra. Solo un admin
                            puede asignar una nueva contraseña. Staff debe
                            solicitar este cambio al admin.
                          </p>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div className="flex flex-col gap-1 md:col-span-2">
                              <label className="text-xs font-semibold text-zinc-600">
                                Usuario / email
                              </label>
                              <input
                                value={orgUser.email ?? ''}
                                disabled
                                className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600"
                              />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-1">
                              <label className="text-xs font-semibold text-zinc-600">
                                Nueva contraseña
                              </label>
                              <input
                                type="password"
                                name="reset_password"
                                minLength={8}
                                className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                                placeholder="Minimo 8 caracteres"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <button
                                type="submit"
                                name="intent"
                                value="reset_password"
                                className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                              >
                                Restablecer contraseña
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
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
