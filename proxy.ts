import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/supabase';

const PUBLIC_PATHS = ['/login', '/logout', '/no-access'];
const STAFF_MODULE_ORDER = [
  'pos',
  'cashbox',
  'products_lookup',
  'clients',
  'expirations',
];

const moduleToRoute: Record<string, string> = {
  pos: '/pos',
  cashbox: '/cashbox',
  products_lookup: '/products/lookup',
  clients: '/clients',
  expirations: '/expirations',
};

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

const resolveStaffHome = async (
  supabase: ReturnType<typeof createServerClient<Database>>,
) => {
  const { data: modules } = await supabase.rpc(
    'rpc_get_staff_effective_modules',
  );

  if (!modules || modules.length === 0) return '/no-access';

  const enabled = modules
    .filter((module) => module.is_enabled)
    .sort(
      (a, b) =>
        STAFF_MODULE_ORDER.indexOf(a.module_key) -
        STAFF_MODULE_ORDER.indexOf(b.module_key),
    );

  if (enabled.length === 0) return '/no-access';

  return moduleToRoute[enabled[0].module_key] ?? '/no-access';
};

const isStaffAllowedPath = (pathname: string) => {
  return (
    pathname === '/pos' ||
    pathname.startsWith('/cashbox') ||
    pathname.startsWith('/products/lookup') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/expirations') ||
    pathname.startsWith('/no-access')
  );
};

const resolveUserIsPlatformAdmin = async (
  supabase: ReturnType<typeof createServerClient<Database>>,
) => {
  const { data, error } = await supabase.rpc('is_platform_admin');
  if (error) return false;
  return Boolean(data);
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname === '/login') return response;
    if (isPublicPath(pathname)) return response;
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isPlatformAdmin = await resolveUserIsPlatformAdmin(supabase);

  const { data: membership } = isPlatformAdmin
    ? { data: null }
    : await supabase
        .from('org_users')
        .select('org_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

  const isLegacySuperadmin = membership?.role === 'superadmin';
  const isSuperadmin = isPlatformAdmin || isLegacySuperadmin;
  const role = membership?.role ?? null;

  if (!isSuperadmin && (!membership?.org_id || !membership?.role)) {
    return NextResponse.redirect(new URL('/no-access', request.url));
  }

  let homePath = '/dashboard';
  if (isSuperadmin) {
    homePath = '/superadmin';
  } else if (role === 'staff') {
    homePath = await resolveStaffHome(supabase);
  }

  if (pathname === '/login') {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (isPublicPath(pathname)) {
    return response;
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (isSuperadmin) {
    return response;
  }

  if (role === 'staff') {
    if (!isStaffAllowedPath(pathname)) {
      return NextResponse.redirect(new URL(homePath, request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
