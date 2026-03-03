import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOrgSession } from '@/lib/auth/org-session';
import TopBarNav from '@/app/components/TopBarNav';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pos', label: 'POS' },
  { href: '/sales', label: 'Ventas' },
  { href: '/sales/statistics', label: 'Estadisticas' },
  { href: '/cashbox', label: 'Caja' },
  { href: '/products', label: 'Productos' },
  { href: '/products/lookup', label: 'Lookup' },
  { href: '/expirations', label: 'Vencimientos' },
  { href: '/suppliers', label: 'Proveedores' },
  { href: '/orders', label: 'Pedidos' },
  { href: '/payments', label: 'Pagos' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/orders/calendar', label: 'Calendario' },
  { href: '/clients', label: 'Clientes' },
  { href: '/online-orders', label: 'Online Orders' },
  { href: '/settings', label: 'Configuracion' },
  { href: '/settings/audit-log', label: 'Auditoria' },
];

const SUPERADMIN_LINK = { href: '/superadmin', label: 'Superadmin' };
const ACTIVE_BRANCH_COOKIE = 'nodux_active_branch_id';
const NAV_GROUPS = [
  { label: 'Inicio', hrefs: ['/dashboard'] },
  {
    label: 'Ventas',
    hrefs: ['/pos', '/sales', '/sales/statistics', '/cashbox', '/clients'],
  },
  { label: 'Inventario', hrefs: ['/products', '/products/lookup', '/expirations'] },
  {
    label: 'Operaciones',
    hrefs: ['/orders', '/orders/calendar', '/onboarding', '/suppliers', '/payments'],
  },
  { label: 'Tienda Online', hrefs: ['/online-orders'] },
  { label: 'Configuracion', hrefs: ['/settings', '/settings/audit-log', '/superadmin'] },
] as const;

type BranchOption = {
  id: string;
  name: string;
};

export default async function TopBar() {
  async function setActiveBranchAction(formData: FormData) {
    'use server';

    const session = await getOrgSession();
    if (!session?.orgId) {
      return;
    }

    const branchId = String(formData.get('active_branch_id') ?? '').trim();
    const cookieStore = await cookies();

    if (!branchId) {
      cookieStore.set({
        name: ACTIVE_BRANCH_COOKIE,
        value: '',
        path: '/',
        maxAge: 0,
      });
    } else {
      cookieStore.set({
        name: ACTIVE_BRANCH_COOKIE,
        value: branchId,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 180,
      });
    }

    revalidatePath('/', 'layout');
  }

  const supabase = await createServerSupabaseClient();
  const orgSession = await getOrgSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showSuperadminLink = false;
  if (user) {
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');
    if (isPlatformAdmin) {
      showSuperadminLink = true;
    } else {
      const { data: membership } = await supabase
        .from('org_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      showSuperadminLink = membership?.role === 'superadmin';
    }
  }

  const navLinks = showSuperadminLink
    ? [...NAV_LINKS, SUPERADMIN_LINK]
    : NAV_LINKS;

  let orgName = 'Sin org activa';
  let branchOptions: BranchOption[] = [];

  if (orgSession?.orgId) {
    const { data: orgRaw } = await supabase
      .from('orgs')
      .select('name')
      .eq('id', orgSession.orgId)
      .maybeSingle();
    const orgData = orgRaw as { name: string } | null;
    if (orgData?.name) {
      orgName = orgData.name;
    }

    if (orgSession.effectiveRole === 'staff') {
      const { data: membershipsRaw } = await supabase
        .from('branch_memberships')
        .select('branch_id')
        .eq('org_id', orgSession.orgId)
        .eq('user_id', orgSession.userId)
        .eq('is_active', true);
      const memberships = (membershipsRaw ?? []) as { branch_id: string }[];
      const branchIds = memberships
        .map((row) => row.branch_id)
        .filter((value) => typeof value === 'string' && value.length > 0);

      if (branchIds.length > 0) {
        const { data: branchesRaw } = await supabase
          .from('branches')
          .select('id, name')
          .eq('org_id', orgSession.orgId)
          .eq('is_active', true)
          .in('id', branchIds)
          .order('name');
        branchOptions = (branchesRaw ?? []) as BranchOption[];
      }
    } else {
      const { data: branchesRaw } = await supabase
        .from('branches')
        .select('id, name')
        .eq('org_id', orgSession.orgId)
        .eq('is_active', true)
        .order('name');
      branchOptions = (branchesRaw ?? []) as BranchOption[];
    }
  }

  const cookieStore = await cookies();
  const cookieBranchId = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value ?? '';
  const selectedBranch =
    branchOptions.find((branch) => branch.id === cookieBranchId) ??
    branchOptions[0] ??
    null;
  const isStaff = orgSession?.effectiveRole === 'staff';
  const visibleNavLinks = isStaff
    ? navLinks.filter(
        (link) =>
          link.href !== '/settings/audit-log' &&
          link.href !== '/settings',
      )
    : navLinks;
  const linkByHref = new Map(visibleNavLinks.map((link) => [link.href, link]));
  const groupedNav = NAV_GROUPS.map((group) => ({
    label: group.label,
    links: group.hrefs
      .map((href) => linkByHref.get(href))
      .filter((link): link is { href: string; label: string } => Boolean(link)),
  })).filter((group) => group.links.length > 0);
  const userLabel =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Sin usuario';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold text-zinc-900">NODUX</div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700">
          <span className="font-semibold">ORG:</span> {orgName}
          <span className="mx-1 text-zinc-400">|</span>
          <span className="font-semibold">Sucursal:</span>{' '}
          {selectedBranch?.name ?? 'Sin sucursal'}
          <span className="mx-1 text-zinc-400">|</span>
          <span className="font-semibold">Usuario:</span> {userLabel}
        </div>
        {branchOptions.length > 0 && !isStaff ? (
          <form action={setActiveBranchAction} className="flex items-center gap-1">
            <select
              name="active_branch_id"
              defaultValue={selectedBranch?.id ?? ''}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700"
            >
              {branchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100"
            >
              Aplicar
            </button>
          </form>
        ) : null}
      </div>
      <TopBarNav groupedNav={groupedNav} />
      <form action="/logout" method="post">
        <button
          type="submit"
          className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
