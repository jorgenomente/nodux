import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

export default async function TopBar() {
  const supabase = await createServerSupabaseClient();
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-3">
      <div className="text-sm font-semibold text-zinc-900">NODUX</div>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded border border-transparent px-2 py-1 hover:border-zinc-200 hover:text-zinc-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>
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
