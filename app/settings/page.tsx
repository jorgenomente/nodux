import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import PageShell from '@/app/components/PageShell';
import { getOrgMemberSession } from '@/lib/auth/org-session';
import {
  hasStaffModuleEnabled,
  resolveStaffHome,
} from '@/lib/auth/staff-modules';

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
    href: '/settings/tickets',
    title: 'Tickets e impresion',
    description:
      'Configurar plantillas por sucursal para ticket no fiscal y comprobante fiscal de prueba.',
  },
  {
    href: '/settings/fiscal',
    title: 'Facturacion fiscal',
    description:
      'Asociar certificado fiscal de la ORG y configurar puntos de venta por sucursal.',
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
    href: '/settings/membership',
    title: 'Membresia',
    description:
      'Ver plan actual, monto mensual, medios de pago e historial de comprobantes.',
  },
  {
    href: '/settings/audit-log',
    title: 'Auditoria',
    description: 'Revisar acciones criticas registradas en la organizacion.',
  },
];

export default async function SettingsPage() {
  const session = await getOrgMemberSession();
  if (!session) {
    redirect('/login');
  }

  if (!session.orgId) {
    redirect('/no-access');
  }

  const supabase = session.supabase;
  const orgId = session.orgId;
  const role = session.effectiveRole;

  if (role === 'staff') {
    const { data: modules } = await supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const resolvedModules = (modules ?? []) as Array<{
      module_key: string;
      is_enabled: boolean;
    }>;
    if (!hasStaffModuleEnabled(resolvedModules, 'settings')) {
      const home = resolveStaffHome(resolvedModules);
      redirect(home);
    }
  }
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get('x-forwarded-proto');
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = forwardedHost || requestHeaders.get('host') || 'app.nodux.app';
  const protocol =
    forwardedProto || (host.includes('localhost') ? 'http' : 'https');
  const appBaseUrl = `${protocol}://${host}`;

  const { data: orgRaw } = await supabase
    .from('orgs')
    .select('id, name, storefront_slug')
    .eq('id', orgId)
    .maybeSingle();
  const orgData = orgRaw as {
    id: string;
    name: string;
    storefront_slug: string | null;
  } | null;

  const { data: settingsRaw } = await supabase
    .from('storefront_settings' as never)
    .select('org_id, is_enabled')
    .eq('org_id', orgId)
    .maybeSingle();
  const storefrontSettings = settingsRaw as {
    org_id: string;
    is_enabled: boolean;
  } | null;

  const { data: branchesRaw } = await supabase
    .from('branches' as never)
    .select('id, name, storefront_slug, is_active')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');
  const activeBranches = (branchesRaw ?? []) as unknown as Array<{
    id: string;
    name: string;
    storefront_slug: string | null;
    is_active: boolean;
  }>;

  const orgSlug = orgData?.storefront_slug?.trim() ?? '';
  const storefrontEnabled = storefrontSettings?.is_enabled === true;
  const orgPublicPath = orgSlug ? `/${orgSlug}` : '';
  const orgPublicUrl = orgPublicPath ? `${appBaseUrl}${orgPublicPath}` : '';

  async function toggleStorefrontEnabledAction(formData: FormData) {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) {
      redirect('/login');
    }

    const nextEnabledRaw = String(formData.get('next_enabled') ?? '').trim();
    const nextEnabled = nextEnabledRaw === 'true';
    const actionSupabase = actionSession.supabase;
    const actionOrgId = actionSession.orgId;

    const { data: existingRaw, error: existingError } = await actionSupabase
      .from('storefront_settings' as never)
      .select('org_id')
      .eq('org_id', actionOrgId)
      .maybeSingle();
    if (existingError) {
      throw new Error(
        existingError.message || 'No se pudo consultar storefront_settings.',
      );
    }
    const existing = existingRaw as { org_id: string } | null;

    if (existing) {
      const { error: updateError } = await actionSupabase
        .from('storefront_settings' as never)
        .update({ is_enabled: nextEnabled } as never)
        .eq('org_id', actionOrgId);
      if (updateError) {
        throw new Error(
          updateError.message || 'No se pudo actualizar storefront_settings.',
        );
      }
    } else {
      const { error: insertError } = await actionSupabase
        .from('storefront_settings' as never)
        .insert({ org_id: actionOrgId, is_enabled: nextEnabled } as never);
      if (insertError) {
        throw new Error(
          insertError.message || 'No se pudo crear storefront_settings.',
        );
      }
    }

    revalidatePath('/settings');
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

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">
            Tienda online
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Referencia rápida para QA del canal online por organización y
            sucursal.
          </p>

          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Estado storefront
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  storefrontEnabled ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {storefrontEnabled ? 'Habilitado' : 'Deshabilitado'}
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                Org slug: {orgSlug || 'Sin definir'}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Base URL detectada: {appBaseUrl}
              </p>
              <form action={toggleStorefrontEnabledAction} className="mt-3">
                <input
                  type="hidden"
                  name="next_enabled"
                  value={storefrontEnabled ? 'false' : 'true'}
                />
                <button
                  type="submit"
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    storefrontEnabled
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {storefrontEnabled
                    ? 'Deshabilitar tienda online'
                    : 'Habilitar tienda online'}
                </button>
              </form>
              {orgPublicUrl ? (
                <p className="mt-2 text-xs break-all text-zinc-700">
                  Link público org:{' '}
                  <a
                    href={orgPublicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-700 underline"
                  >
                    {orgPublicUrl}
                  </a>
                </p>
              ) : (
                <p className="mt-2 text-xs text-amber-700">
                  Falta definir slug de organización para generar link público.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Sucursales activas y links públicos
              </p>
              {activeBranches.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-600">
                  No hay sucursales activas.
                </p>
              ) : (
                <div className="mt-2 grid gap-2">
                  {activeBranches.map((branch) => {
                    const branchSlug = branch.storefront_slug?.trim() ?? '';
                    const branchPublicPath =
                      orgSlug && branchSlug ? `/${orgSlug}/${branchSlug}` : '';
                    const branchPublicUrl = branchPublicPath
                      ? `${appBaseUrl}${branchPublicPath}`
                      : '';
                    return (
                      <div
                        key={branch.id}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-zinc-900">
                          {branch.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          Branch slug: {branchSlug || 'Sin definir'}
                        </p>
                        {branchPublicUrl ? (
                          <p className="mt-1 text-xs break-all text-zinc-700">
                            <a
                              href={branchPublicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-blue-700 underline"
                            >
                              {branchPublicUrl}
                            </a>
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-amber-700">
                            Falta slug de org o sucursal para este link.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
