import Link from 'next/link';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pos', label: 'POS' },
  { href: '/products', label: 'Productos' },
  { href: '/products/lookup', label: 'Lookup' },
  { href: '/expirations', label: 'Vencimientos' },
  { href: '/suppliers', label: 'Proveedores' },
  { href: '/orders', label: 'Pedidos' },
  { href: '/orders/calendar', label: 'Calendario' },
  { href: '/clients', label: 'Clientes' },
  { href: '/settings', label: 'Configuracion' },
  { href: '/settings/audit-log', label: 'Auditoria' },
  { href: '/superadmin', label: 'Superadmin' },
];

export default function TopBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-3">
      <div className="text-sm font-semibold text-zinc-900">NODUX</div>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
        {NAV_LINKS.map((link) => (
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
