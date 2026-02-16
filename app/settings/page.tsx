import Link from 'next/link';
import { redirect } from 'next/navigation';

import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';

const SETTINGS_LINKS = [
  {
    href: '/settings/users',
    title: 'Usuarios',
    description: 'Invitar usuarios, asignar rol y activar/desactivar acceso.',
  },
  {
    href: '/settings/branches',
    title: 'Sucursales',
    description: 'Crear y editar sucursales operativas de la organizacion.',
  },
  {
    href: '/settings/staff-permissions',
    title: 'Permisos de staff',
    description: 'Habilitar o deshabilitar modulos para personal operativo.',
  },
  {
    href: '/settings/preferences',
    title: 'Preferencias',
    description: 'Ajustar umbrales de alertas y configuracion operativa base.',
  },
  {
    href: '/settings/audit-log',
    title: 'Auditoria',
    description: 'Revisar acciones criticas registradas en la organizacion.',
  },
];

export default async function SettingsPage() {
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }

  if (!session.orgId) {
    redirect('/no-access');
  }

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Configuracion
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Gestion centralizada de usuarios, sucursales, permisos y
            preferencias.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {SETTINGS_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
            >
              <h2 className="text-base font-semibold text-zinc-900">
                {item.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">{item.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </PageShell>
  );
}
