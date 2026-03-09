export const STAFF_MODULE_ORDER = [
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
] as const;

export const STAFF_MODULE_TO_ROUTE: Record<string, string> = {
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

export type StaffModuleRow = {
  module_key: string;
  is_enabled: boolean;
};

export const resolveStaffHome = (modules: StaffModuleRow[]) => {
  const enabledKnown = (modules || []).filter(
    (module) => module.is_enabled && module.module_key in STAFF_MODULE_TO_ROUTE,
  );

  if (enabledKnown.length === 0) return '/no-access';

  const rank = (moduleKey: string) => {
    const index = STAFF_MODULE_ORDER.indexOf(
      moduleKey as (typeof STAFF_MODULE_ORDER)[number],
    );
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  enabledKnown.sort((a, b) => rank(a.module_key) - rank(b.module_key));
  return STAFF_MODULE_TO_ROUTE[enabledKnown[0].module_key] ?? '/no-access';
};

export const hasStaffModuleEnabled = (
  modules: StaffModuleRow[],
  moduleKey: string,
) =>
  modules.some(
    (module) => module.module_key === moduleKey && module.is_enabled,
  );
