import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/supabase';

const PUBLIC_PATHS = ['/landing', '/demo', '/login', '/logout', '/no-access'];
const MARKETING_PATHS = ['/', '/landing', '/demo', '/demo/enter'];
const STORE_FRONT_RESERVED_SEGMENTS = new Set([
  'landing',
  'demo',
  'login',
  'logout',
  'no-access',
  'dashboard',
  'pos',
  'cashbox',
  'products',
  'sales',
  'expirations',
  'suppliers',
  'orders',
  'clients',
  'online-orders',
  'settings',
  'payments',
  'onboarding',
  'superadmin',
  'api',
  'o',
  '_next',
]);
const APP_HOST = 'app.nodux.app';
const CANONICAL_MARKETING_HOST = 'nodux.app';
const MARKETING_HOSTS = new Set([CANONICAL_MARKETING_HOST, 'www.nodux.app']);
const STAFF_MODULE_ORDER = [
  'dashboard',
  'pos',
  'sales',
  'sales_statistics',
  'cashbox',
  'products',
  'products_lookup',
  'suppliers',
  'orders',
  'orders_calendar',
  'payments',
  'clients',
  'expirations',
  'onboarding',
  'online_orders',
  'settings',
];
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const moduleToRoute: Record<string, string> = {
  dashboard: '/dashboard',
  pos: '/pos',
  sales: '/sales',
  sales_statistics: '/sales/statistics',
  cashbox: '/cashbox',
  products: '/products',
  products_lookup: '/products/lookup',
  suppliers: '/suppliers',
  orders: '/orders',
  orders_calendar: '/orders/calendar',
  payments: '/payments',
  clients: '/clients',
  expirations: '/expirations',
  onboarding: '/onboarding',
  online_orders: '/online-orders',
  settings: '/settings',
};

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

const isPublicTrackingPath = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 2 && segments[0] === 'o';
};

const isPublicStorefrontPath = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0 || segments.length > 2) return false;
  if (STORE_FRONT_RESERVED_SEGMENTS.has(segments[0])) return false;
  return true;
};

const isPublicStorefrontApiPath = (pathname: string) =>
  pathname === '/api/storefront/order';

const isDemoPath = (pathname: string) =>
  pathname === '/demo' || pathname.startsWith('/demo/');

const isDemoEnterPath = (pathname: string) =>
  pathname === '/demo/enter' || pathname.startsWith('/demo/enter/');

const isMarketingPath = (pathname: string) =>
  MARKETING_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

const isServerActionRequest = (request: NextRequest) =>
  request.method === 'POST' && request.headers.has('next-action');

const parseReadonlyDemoEmails = () =>
  (process.env.DEMO_READONLY_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const redirectToHost = (
  request: NextRequest,
  host: string,
  pathname: string,
) => {
  const url = request.nextUrl.clone();
  url.hostname = host;
  url.pathname = pathname;
  url.protocol = 'https:';
  url.port = '';
  return NextResponse.redirect(url);
};

const resolveStaffHome = (
  modules: Array<{ module_key: string; is_enabled: boolean }>,
) => {
  if (!modules || modules.length === 0) return '/no-access';

  const enabled = modules.filter(
    (module) => module.is_enabled && module.module_key in moduleToRoute,
  );

  if (enabled.length === 0) return '/no-access';

  const rank = (moduleKey: string) => {
    const index = STAFF_MODULE_ORDER.indexOf(moduleKey);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  enabled.sort((a, b) => rank(a.module_key) - rank(b.module_key));

  return moduleToRoute[enabled[0].module_key] ?? '/no-access';
};

const isStaffAllowedPath = (
  pathname: string,
  enabledModuleKeys: Set<string>,
) => {
  if (pathname.startsWith('/no-access')) return true;
  if (pathname === '/') return true;

  if (pathname.startsWith('/dashboard'))
    return enabledModuleKeys.has('dashboard');
  if (pathname.startsWith('/pos')) return enabledModuleKeys.has('pos');
  if (pathname.startsWith('/sales/statistics'))
    return enabledModuleKeys.has('sales_statistics');
  if (pathname.startsWith('/sales')) return enabledModuleKeys.has('sales');
  if (pathname.startsWith('/cashbox')) return enabledModuleKeys.has('cashbox');
  if (pathname.startsWith('/products/lookup'))
    return enabledModuleKeys.has('products_lookup');
  if (pathname.startsWith('/products'))
    return enabledModuleKeys.has('products');
  if (pathname.startsWith('/suppliers'))
    return enabledModuleKeys.has('suppliers');
  if (pathname.startsWith('/orders/calendar'))
    return enabledModuleKeys.has('orders_calendar');
  if (pathname.startsWith('/orders')) return enabledModuleKeys.has('orders');
  if (pathname.startsWith('/payments'))
    return enabledModuleKeys.has('payments');
  if (pathname.startsWith('/clients')) return enabledModuleKeys.has('clients');
  if (pathname.startsWith('/expirations'))
    return enabledModuleKeys.has('expirations');
  if (pathname.startsWith('/onboarding'))
    return enabledModuleKeys.has('onboarding');
  if (pathname.startsWith('/online-orders'))
    return enabledModuleKeys.has('online_orders');
  if (pathname === '/settings') return enabledModuleKeys.has('settings');

  return false;
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
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isMarketingHost = MARKETING_HOSTS.has(hostname);
  const isAppHost = hostname === APP_HOST;
  const isServerAction = isServerActionRequest(request);

  if (hostname === 'www.nodux.app') {
    return redirectToHost(request, CANONICAL_MARKETING_HOST, pathname);
  }

  if (isMarketingHost) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/landing', request.url));
    }

    if (
      !isMarketingPath(pathname) &&
      !isPublicStorefrontPath(pathname) &&
      !isPublicTrackingPath(pathname) &&
      !isPublicStorefrontApiPath(pathname)
    ) {
      return redirectToHost(request, APP_HOST, pathname);
    }
  }

  if (
    isAppHost &&
    (pathname.startsWith('/landing') ||
      (isDemoPath(pathname) && !isDemoEnterPath(pathname)) ||
      isPublicStorefrontPath(pathname) ||
      isPublicTrackingPath(pathname))
  ) {
    return redirectToHost(request, 'nodux.app', pathname);
  }

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
    if (isPublicTrackingPath(pathname)) return response;
    if (isPublicStorefrontPath(pathname)) return response;
    if (isPublicStorefrontApiPath(pathname)) return response;
    if (isServerAction) return response;
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const demoReadonlyEmails = parseReadonlyDemoEmails();
  const normalizedUserEmail = user.email?.toLowerCase() ?? null;
  const isReadonlyDemoUser =
    normalizedUserEmail !== null &&
    demoReadonlyEmails.length > 0 &&
    demoReadonlyEmails.includes(normalizedUserEmail);

  if (
    isReadonlyDemoUser &&
    MUTATING_METHODS.has(request.method) &&
    pathname !== '/logout' &&
    pathname !== '/demo/enter'
  ) {
    if (isServerAction) {
      return NextResponse.json(
        { error: 'demo_read_only', message: 'Demo en modo solo lectura.' },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL('/demo?readonly=1', request.url));
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
    if (pathname === '/no-access') {
      return response;
    }
    if (isServerAction) return response;
    return NextResponse.redirect(new URL('/no-access', request.url));
  }

  let homePath = '/dashboard';
  let staffEnabledModules = new Set<string>();
  if (isSuperadmin) {
    homePath = '/superadmin';
  } else if (role === 'staff') {
    const { data: modules } = await supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const resolvedModules = (modules ?? []) as Array<{
      module_key: string;
      is_enabled: boolean;
    }>;
    staffEnabledModules = new Set(
      resolvedModules
        .filter((module) => module.is_enabled)
        .map((module) => module.module_key),
    );
    homePath = resolveStaffHome(resolvedModules);
  }

  if (pathname === '/login') {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (isPublicPath(pathname)) {
    return response;
  }

  if (isPublicTrackingPath(pathname) || isPublicStorefrontPath(pathname)) {
    return response;
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (isSuperadmin) {
    return response;
  }

  if (role === 'staff') {
    if (!isStaffAllowedPath(pathname, staffEnabledModules)) {
      if (isServerAction) return response;
      return NextResponse.redirect(new URL(homePath, request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
