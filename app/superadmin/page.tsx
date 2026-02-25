import { randomUUID } from 'crypto';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type SearchParams = {
  q?: string;
  org?: string;
  result?: string;
};

type SuperadminOrgRow = {
  org_id: string;
  org_name: string;
  timezone: string;
  is_active: boolean;
  branches_count: number | null;
  users_count: number | null;
  created_at: string;
};

type SuperadminOrgDetailRow = {
  org_id: string;
  org_name: string;
  timezone: string;
  org_is_active: boolean;
  branch_id: string | null;
  branch_name: string | null;
  branch_address: string | null;
  branch_is_active: boolean | null;
  user_id: string | null;
  display_name: string | null;
  role: string | null;
  user_is_active: boolean | null;
};

type SuperadminContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
  isPlatformAdmin: boolean;
};

type SuperadminContextResult =
  | { status: 'ok'; context: SuperadminContext }
  | { status: 'no_user' }
  | { status: 'no_superadmin'; userId: string; role: string | null };

const isNextRedirectError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const digest =
    'digest' in error && typeof error.digest === 'string' ? error.digest : '';
  return digest.startsWith('NEXT_REDIRECT');
};

const getSuperadminContext = async (
  source: string,
): Promise<SuperadminContextResult> => {
  const cookieStore = await cookies();
  const supabaseCookieNames = cookieStore
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith('sb-'));

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[superadmin.context] auth.getUser returned null', {
      source,
      sbCookieCount: supabaseCookieNames.length,
      sbCookieNames: supabaseCookieNames.slice(0, 4),
    });
    return { status: 'no_user' };
  }

  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');
  if (isPlatformAdmin) {
    return {
      status: 'ok',
      context: { supabase, userId: user.id, isPlatformAdmin: true },
    };
  }

  const { data: membership } = await supabase
    .from('org_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (membership?.role === 'superadmin') {
    // First superadmin can bootstrap platform_admins on empty installs.
    await supabase.rpc('rpc_bootstrap_platform_admin');
    const { data: bootstrapped } = await supabase.rpc('is_platform_admin');
    if (bootstrapped) {
      return {
        status: 'ok',
        context: {
          supabase,
          userId: user.id,
          isPlatformAdmin: true,
        },
      };
    }
  }

  console.warn('[superadmin.context] user has no superadmin context', {
    source,
    userId: user.id,
    role: membership?.role ?? null,
  });
  return {
    status: 'no_superadmin',
    userId: user.id,
    role: membership?.role ?? null,
  };
};

export default async function SuperadminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const contextResult = await getSuperadminContext('page-load');

  if (contextResult.status === 'no_user') {
    redirect('/login?result=session_missing');
  }
  if (contextResult.status !== 'ok') {
    redirect('/no-access');
  }
  const context = contextResult.context;

  const createOrg = async (formData: FormData): Promise<void> => {
    'use server';
    try {
      const contextResult = await getSuperadminContext('create-org');
      if (contextResult.status === 'no_user') {
        redirect('/login?result=session_missing');
      }
      if (contextResult.status !== 'ok') {
        redirect('/no-access');
      }
      const auth = contextResult.context;

      const orgName = String(formData.get('org_name') ?? '').trim();
      const timezone =
        String(formData.get('timezone') ?? 'UTC').trim() || 'UTC';
      const branchName =
        String(formData.get('initial_branch_name') ?? '').trim() ||
        'Casa Central';
      const branchAddress = String(
        formData.get('initial_branch_address') ?? '',
      ).trim();
      const ownerEmail = String(formData.get('owner_email') ?? '')
        .trim()
        .toLowerCase();
      const ownerPassword = String(formData.get('owner_password') ?? '');
      const ownerName = String(formData.get('owner_display_name') ?? '').trim();

      if (!auth.isPlatformAdmin) {
        redirect('/superadmin?result=active_org_denied');
      }

      if (!orgName) {
        redirect('/superadmin?result=invalid_org');
      }
      if (!ownerEmail || !ownerEmail.includes('@')) {
        redirect('/superadmin?result=invalid_owner_email');
      }
      if (ownerPassword.length < 8) {
        redirect('/superadmin?result=weak_owner_password');
      }

      const admin = createAdminSupabaseClient();
      const { data: createdUser, error: createUserError } =
        await admin.auth.admin.createUser({
          email: ownerEmail,
          password: ownerPassword,
          email_confirm: true,
          user_metadata: ownerName ? { display_name: ownerName } : undefined,
        });

      if (createUserError || !createdUser.user?.id) {
        const message = String(createUserError?.message ?? '').toLowerCase();
        const alreadyExists =
          createUserError?.code === 'email_exists' ||
          message.includes('already') ||
          message.includes('exists');
        if (alreadyExists) {
          redirect('/superadmin?result=owner_email_exists');
        }
        redirect('/superadmin?result=owner_create_error');
      }

      const { data, error } = await auth.supabase.rpc(
        'rpc_superadmin_create_org',
        {
          p_org_name: orgName,
          p_timezone: timezone,
          p_initial_branch_name: branchName,
          p_initial_branch_address: branchAddress || undefined,
          p_owner_user_id: createdUser.user.id,
          p_owner_display_name: ownerName || undefined,
        },
      );

      if (error) {
        redirect('/superadmin?result=org_error');
      }

      const newOrgId =
        Array.isArray(data) && data[0] && typeof data[0].org_id === 'string'
          ? data[0].org_id
          : '';

      if (auth.isPlatformAdmin && newOrgId) {
        await auth.supabase.rpc('rpc_superadmin_set_active_org', {
          p_org_id: newOrgId,
        });
      }

      revalidatePath('/superadmin');
      redirect(
        `/superadmin?result=org_created${newOrgId ? `&org=${newOrgId}` : ''}`,
      );
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.error('[superadmin.createOrg] unexpected error', error);
      redirect('/superadmin?result=org_error');
    }
  };

  const setActiveOrg = async (formData: FormData): Promise<void> => {
    'use server';
    try {
      const contextResult = await getSuperadminContext('set-active-org');
      if (contextResult.status === 'no_user') {
        redirect('/login?result=session_missing');
      }
      if (contextResult.status !== 'ok') {
        redirect('/no-access');
      }
      const auth = contextResult.context;

      if (!auth.isPlatformAdmin) {
        redirect('/superadmin?result=active_org_denied');
      }

      const orgId = String(formData.get('org_id') ?? '').trim();
      if (!orgId) {
        redirect('/superadmin?result=active_org_invalid');
      }

      const { error } = await auth.supabase.rpc(
        'rpc_superadmin_set_active_org',
        {
          p_org_id: orgId,
        },
      );

      if (error) {
        redirect('/superadmin?result=active_org_error');
      }

      revalidatePath('/superadmin');
      redirect(`/superadmin?org=${orgId}&result=active_org_saved`);
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.error('[superadmin.setActiveOrg] unexpected error', error);
      redirect('/superadmin?result=active_org_error');
    }
  };

  const createBranch = async (formData: FormData): Promise<void> => {
    'use server';
    const orgId = String(formData.get('org_id') ?? '').trim();

    try {
      const contextResult = await getSuperadminContext('create-branch');
      if (contextResult.status === 'no_user') {
        redirect('/login?result=session_missing');
      }
      if (contextResult.status !== 'ok') {
        redirect('/no-access');
      }
      const auth = contextResult.context;

      const branchName = String(formData.get('branch_name') ?? '').trim();
      const branchAddress = String(formData.get('branch_address') ?? '').trim();

      if (!orgId || !branchName) {
        redirect(`/superadmin?org=${orgId}&result=invalid_branch`);
      }

      const { error } = await auth.supabase.rpc(
        'rpc_superadmin_upsert_branch',
        {
          p_org_id: orgId,
          p_branch_id: randomUUID(),
          p_name: branchName,
          p_address: branchAddress || undefined,
          p_is_active: true,
        },
      );

      if (error) {
        redirect(`/superadmin?org=${orgId}&result=branch_error`);
      }

      revalidatePath('/superadmin');
      redirect(`/superadmin?org=${orgId}&result=branch_created`);
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.error('[superadmin.createBranch] unexpected error', error);
      redirect(`/superadmin?org=${orgId}&result=branch_error`);
    }
  };

  const createOrgAdmin = async (formData: FormData): Promise<void> => {
    'use server';
    const orgId = String(formData.get('org_id') ?? '').trim();

    try {
      const contextResult = await getSuperadminContext('create-org-admin');
      if (contextResult.status === 'no_user') {
        redirect('/login?result=session_missing');
      }
      if (
        contextResult.status !== 'ok' ||
        !contextResult.context.isPlatformAdmin
      ) {
        redirect('/no-access');
      }
      const auth = contextResult.context;

      const ownerEmail = String(formData.get('owner_email') ?? '')
        .trim()
        .toLowerCase();
      const ownerPassword = String(formData.get('owner_password') ?? '');
      const ownerName = String(formData.get('owner_display_name') ?? '').trim();

      if (!orgId || !ownerEmail || !ownerEmail.includes('@')) {
        redirect(`/superadmin?org=${orgId}&result=invalid_owner_email`);
      }
      if (ownerPassword.length < 8) {
        redirect(`/superadmin?org=${orgId}&result=weak_owner_password`);
      }

      const admin = createAdminSupabaseClient();
      const { data: createdUser, error: createUserError } =
        await admin.auth.admin.createUser({
          email: ownerEmail,
          password: ownerPassword,
          email_confirm: true,
          user_metadata: ownerName ? { display_name: ownerName } : undefined,
        });

      if (createUserError || !createdUser.user?.id) {
        const message = String(createUserError?.message ?? '').toLowerCase();
        const alreadyExists =
          createUserError?.code === 'email_exists' ||
          message.includes('already') ||
          message.includes('exists');
        if (alreadyExists) {
          redirect(`/superadmin?org=${orgId}&result=owner_email_exists`);
        }
        redirect(`/superadmin?org=${orgId}&result=owner_create_error`);
      }

      await auth.supabase.rpc('rpc_invite_user_to_org', {
        p_org_id: orgId,
        p_email: ownerEmail,
        p_role: 'org_admin',
        p_branch_ids: [],
      });

      await auth.supabase.rpc('rpc_update_user_membership', {
        p_org_id: orgId,
        p_user_id: createdUser.user.id,
        p_role: 'org_admin',
        p_is_active: true,
        p_display_name: ownerName || '',
        p_branch_ids: [],
      });

      revalidatePath('/superadmin');
      redirect(`/superadmin?org=${orgId}&result=owner_created`);
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.error('[superadmin.createOrgAdmin] unexpected error', error);
      redirect(`/superadmin?org=${orgId}&result=owner_create_error`);
    }
  };

  const search = (params.q ?? '').trim();
  const requestedOrgId = (params.org ?? '').trim();

  let orgsQuery = context.supabase
    .from('v_superadmin_orgs')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    orgsQuery = orgsQuery.ilike('org_name', `%${search}%`);
  }

  const { data: orgRows } = await orgsQuery;
  const orgs = (orgRows ?? []) as SuperadminOrgRow[];

  const { data: activeOrgIdData } = context.isPlatformAdmin
    ? await context.supabase.rpc('rpc_get_active_org_id')
    : { data: null };
  const activeOrgId =
    typeof activeOrgIdData === 'string' ? activeOrgIdData : '';

  const selectedOrgId =
    orgs.find((org) => org.org_id === requestedOrgId)?.org_id ??
    orgs.find((org) => org.org_id === activeOrgId)?.org_id ??
    orgs[0]?.org_id ??
    '';

  const { data: detailRows } = selectedOrgId
    ? await context.supabase
        .from('v_superadmin_org_detail')
        .select('*')
        .eq('org_id', selectedOrgId)
    : { data: [] };

  const details = (detailRows ?? []) as SuperadminOrgDetailRow[];
  const selectedOrg = orgs.find((org) => org.org_id === selectedOrgId) ?? null;
  const branches = details
    .filter((row) => row.branch_id)
    .reduce<
      Array<{
        id: string;
        name: string;
        address: string | null;
        isActive: boolean;
      }>
    >((acc, row) => {
      if (!row.branch_id || acc.some((branch) => branch.id === row.branch_id)) {
        return acc;
      }
      acc.push({
        id: row.branch_id,
        name: row.branch_name ?? 'Sucursal',
        address: row.branch_address,
        isActive: Boolean(row.branch_is_active),
      });
      return acc;
    }, []);

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Superadmin</h1>
          <p className="text-sm text-zinc-600">
            Gestiona organizaciones, sucursales y contexto activo de soporte.
          </p>
          {context.isPlatformAdmin ? (
            <p className="text-xs text-zinc-500">
              Org activa:{' '}
              <strong>{selectedOrg?.org_name ?? 'No seleccionada'}</strong>
            </p>
          ) : null}
          {params.result === 'org_created' ? (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Organización creada correctamente.
            </p>
          ) : null}
          {params.result === 'branch_created' ? (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Sucursal creada correctamente.
            </p>
          ) : null}
          {params.result === 'active_org_saved' ? (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Organización activa actualizada.
            </p>
          ) : null}
          {params.result === 'owner_created' ? (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Admin inicial creado para la organización.
            </p>
          ) : null}
          {params.result === 'owner_email_exists' ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              El email del admin inicial ya existe.
            </p>
          ) : null}
          {params.result === 'invalid_owner_email' ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Ingresa un email válido para el admin inicial.
            </p>
          ) : null}
          {params.result === 'weak_owner_password' ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              La contraseña del admin inicial debe tener al menos 8 caracteres.
            </p>
          ) : null}
          {params.result?.includes('error') ||
          params.result?.includes('invalid') ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No se pudo completar la acción. Revisa los datos e intenta de
              nuevo.
            </p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            Nueva organización
          </h2>
          <form action={createOrg} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="org-name"
              >
                Nombre de org
              </label>
              <input
                id="org-name"
                name="org_name"
                required
                placeholder="Tienda Palermo"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="org-timezone"
              >
                Timezone
              </label>
              <input
                id="org-timezone"
                name="timezone"
                defaultValue="UTC"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="org-branch-name"
              >
                Sucursal inicial
              </label>
              <input
                id="org-branch-name"
                name="initial_branch_name"
                defaultValue="Casa Central"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end md:col-span-1">
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Crear org
              </button>
            </div>
            <div className="flex flex-col gap-1 md:col-span-4">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="org-branch-address"
              >
                Dirección sucursal inicial
              </label>
              <input
                id="org-branch-address"
                name="initial_branch_address"
                placeholder="Calle y número"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="owner-email"
              >
                Email admin inicial (OA)
              </label>
              <input
                id="owner-email"
                name="owner_email"
                type="email"
                required
                placeholder="admin@tienda.com"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="owner-name"
              >
                Nombre admin (opcional)
              </label>
              <input
                id="owner-name"
                name="owner_display_name"
                placeholder="Nombre Apellido"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label
                className="text-xs font-semibold text-zinc-600"
                htmlFor="owner-password"
              >
                Contraseña admin inicial
              </label>
              <input
                id="owner-password"
                name="owner_password"
                type="password"
                minLength={8}
                required
                placeholder="Mínimo 8 caracteres"
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
          </form>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">
                Organizaciones
              </h2>
              <form action="/superadmin" className="flex items-end gap-2">
                <input
                  name="q"
                  defaultValue={search}
                  placeholder="Buscar por nombre"
                  className="rounded border border-zinc-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                >
                  Buscar
                </button>
              </form>
            </div>

            <div className="mt-4 space-y-3">
              {orgs.length === 0 ? (
                <p className="rounded border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                  No hay organizaciones para este filtro.
                </p>
              ) : (
                orgs.map((org) => (
                  <div
                    key={org.org_id}
                    className={`rounded-xl border p-4 ${
                      org.org_id === selectedOrgId
                        ? 'border-zinc-900 bg-zinc-50'
                        : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {org.org_name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {Number(org.branches_count ?? 0)} sucursales ·{' '}
                          {Number(org.users_count ?? 0)} usuarios
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/superadmin?org=${org.org_id}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
                          className="rounded border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700"
                        >
                          Ver
                        </Link>
                        {context.isPlatformAdmin ? (
                          <form action={setActiveOrg}>
                            <input
                              type="hidden"
                              name="org_id"
                              value={org.org_id}
                            />
                            <button
                              type="submit"
                              className="rounded bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
                            >
                              Activar
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Detalle de organización
            </h2>
            {!selectedOrg ? (
              <p className="mt-4 rounded border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                Selecciona una organización para ver su detalle.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-sm font-semibold text-zinc-900">
                    {selectedOrg.org_name}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Timezone: {selectedOrg.timezone} · Estado:{' '}
                    {selectedOrg.is_active ? 'Activa' : 'Inactiva'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {context.isPlatformAdmin ? (
                      <form action={setActiveOrg}>
                        <input
                          type="hidden"
                          name="org_id"
                          value={selectedOrg.org_id}
                        />
                        <button
                          type="submit"
                          className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Activar esta org
                        </button>
                      </form>
                    ) : null}
                    <Link
                      href="/dashboard"
                      className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700"
                    >
                      Ir a dashboard
                    </Link>
                  </div>
                </div>

                <form
                  action={createOrgAdmin}
                  className="grid gap-3 rounded-xl border border-zinc-200 p-4"
                >
                  <input
                    type="hidden"
                    name="org_id"
                    value={selectedOrg.org_id}
                  />
                  <p className="text-sm font-semibold text-zinc-900">
                    Crear admin inicial (org existente)
                  </p>
                  <input
                    name="owner_email"
                    type="email"
                    required
                    placeholder="admin@tienda.com"
                    className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <input
                    name="owner_display_name"
                    placeholder="Nombre Apellido (opcional)"
                    className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <input
                    name="owner_password"
                    type="password"
                    minLength={8}
                    required
                    placeholder="Contraseña inicial (mínimo 8)"
                    className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-fit rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                  >
                    Crear admin inicial
                  </button>
                </form>

                <form
                  action={createBranch}
                  className="grid gap-3 rounded-xl border border-zinc-200 p-4"
                >
                  <input
                    type="hidden"
                    name="org_id"
                    value={selectedOrg.org_id}
                  />
                  <p className="text-sm font-semibold text-zinc-900">
                    Nueva sucursal
                  </p>
                  <input
                    name="branch_name"
                    required
                    placeholder="Sucursal Norte"
                    className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <input
                    name="branch_address"
                    placeholder="Dirección"
                    className="rounded border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-fit rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                  >
                    Crear sucursal
                  </button>
                </form>

                <div className="space-y-2">
                  {branches.length === 0 ? (
                    <p className="rounded border border-dashed border-zinc-200 px-4 py-4 text-sm text-zinc-500">
                      Esta organización no tiene sucursales.
                    </p>
                  ) : (
                    branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      >
                        <p className="font-semibold text-zinc-900">
                          {branch.name}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {branch.address || 'Sin dirección'} ·{' '}
                          {branch.isActive ? 'Activa' : 'Inactiva'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
