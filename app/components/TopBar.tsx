import Link from 'next/link';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pos', label: 'POS' },
  { href: '/cashbox', label: 'Caja' },
  { href: '/products', label: 'Productos' },
  { href: '/products/lookup', label: 'Lookup' },
  { href: '/expirations', label: 'Vencimientos' },
  { href: '/suppliers', label: 'Proveedores' },
  { href: '/orders', label: 'Pedidos' },
  { href: '/payments', label: 'Pagos' },
  { href: '/orders/calendar', label: 'Calendario' },
  { href: '/clients', label: 'Clientes' },
  { href: '/settings', label: 'Configuracion' },
  { href: '/settings/audit-log', label: 'Auditoria' },
];

const canViewSuperadmin = async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');
  if (isPlatformAdmin) return true;

  const { data: membership } = await supabase
    .from('org_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return membership?.role === 'superadmin';
};

export default async function TopBar() {
  const showSuperadmin = await canViewSuperadmin();
  const links = showSuperadmin
    ? [...NAV_LINKS, { href: '/superadmin', label: 'Superadmin' }]
    : NAV_LINKS;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-3">
      <div className="text-sm font-semibold text-zinc-900">NODUX</div>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded border border-transparent px-2 py-1 hover:border-zinc-200 hover:text-zinc-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/logout"
        className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
      >
        Salir
      </Link>
    </div>
  );
}
