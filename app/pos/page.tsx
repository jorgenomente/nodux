import { redirect } from 'next/navigation';

import PageShell from '@/app/components/PageShell';
import PosClient from '@/app/pos/PosClient';
import { getOrgMemberSession } from '@/lib/auth/org-session';

type PosDiscountPreferences = {
  cash_discount_enabled: boolean;
  cash_discount_default_pct: number;
};

const STAFF_MODULE_ORDER = [
  'pos',
  'cashbox',
  'products_lookup',
  'clients',
  'expirations',
] as const;
const moduleToRoute: Record<string, string> = {
  pos: '/pos',
  cashbox: '/cashbox',
  products_lookup: '/products/lookup',
  clients: '/clients',
  expirations: '/expirations',
};

const resolveStaffHome = (
  modules: Array<{ module_key: string; is_enabled: boolean }>,
) => {
  const enabled = modules
    .filter((module) => module.is_enabled)
    .sort(
      (a, b) =>
        STAFF_MODULE_ORDER.indexOf(
          a.module_key as (typeof STAFF_MODULE_ORDER)[number],
        ) -
        STAFF_MODULE_ORDER.indexOf(
          b.module_key as (typeof STAFF_MODULE_ORDER)[number],
        ),
    );

  if (enabled.length === 0) return '/no-access';

  return moduleToRoute[enabled[0].module_key] ?? '/no-access';
};

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ special_order_id?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getOrgMemberSession();
  if (!session) {
    redirect('/login');
  }
  if (!session.orgId || !session.role || !session.effectiveRole) {
    redirect('/no-access');
  }

  const supabase = session.supabase;
  const role = session.effectiveRole;
  const orgId = session.orgId;
  const userId = session.userId;

  if (role === 'staff') {
    const { data: modules } = await supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const enabledPos = modules?.some(
      (module) => module.module_key === 'pos' && module.is_enabled,
    );
    if (!enabledPos) {
      const home = resolveStaffHome(modules ?? []);
      redirect(home);
    }
  }

  let branches: Array<{ id: string; name: string }> = [];

  if (role === 'staff') {
    const { data: branchMemberships } = await supabase
      .from('branch_memberships')
      .select('branch_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('is_active', true);

    const branchIds = (branchMemberships ?? [])
      .map((bm) => bm.branch_id)
      .filter(Boolean);
    if (branchIds.length === 0) {
      redirect('/no-access');
    }

    const { data: branchRows } = await supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .in('id', branchIds)
      .order('name');

    branches = branchRows ?? [];
  } else {
    const { data: branchRows } = await supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name');

    branches = branchRows ?? [];
  }

  let defaultBranchId = branches.length > 0 ? branches[0].id : null;

  const specialOrderId =
    typeof resolvedSearchParams.special_order_id === 'string'
      ? resolvedSearchParams.special_order_id
      : '';

  const { data: specialOrderItems } = specialOrderId
    ? await supabase.rpc('rpc_get_special_order_for_pos', {
        p_org_id: orgId,
        p_special_order_id: specialOrderId,
      })
    : { data: null };

  const specialOrderRows =
    (specialOrderItems as Array<{
      special_order_id: string;
      client_id: string;
      client_name: string;
      branch_id: string;
      product_id: string;
      product_name: string;
      sell_unit_type: 'unit' | 'weight' | 'bulk';
      uom: string;
      unit_price: number | null;
      remaining_qty: number | null;
    }>) ?? [];

  const specialOrderMeta = specialOrderRows[0];

  if (specialOrderMeta?.branch_id) {
    if (role === 'staff') {
      const allowed = branches.some(
        (branch) => branch.id === specialOrderMeta.branch_id,
      );
      if (!allowed) {
        redirect('/no-access');
      }
    }
    defaultBranchId = specialOrderMeta.branch_id;
  }

  const { data: initialProducts } = defaultBranchId
    ? await supabase
        .from('v_pos_product_catalog')
        .select(
          'product_id, name, internal_code, barcode, sell_unit_type, uom, unit_price, stock_on_hand, is_active',
        )
        .eq('org_id', orgId)
        .eq('branch_id', defaultBranchId)
        .eq('is_active', true)
        .order('name')
        .limit(20)
    : { data: [] };

  const { data: initialPaymentDevices } = defaultBranchId
    ? await supabase
        .from('pos_payment_devices' as never)
        .select('id, device_name, provider')
        .eq('org_id', orgId)
        .eq('branch_id', defaultBranchId)
        .eq('is_active', true)
        .order('device_name')
    : { data: [] };

  const { data: preferencesRow } = await supabase
    .from('org_preferences')
    .select('cash_discount_enabled, cash_discount_default_pct')
    .eq('org_id', orgId)
    .maybeSingle();

  const cashDiscount = (preferencesRow as PosDiscountPreferences | null) ?? {
    cash_discount_enabled: true,
    cash_discount_default_pct: 10,
  };

  return (
    <PageShell>
      <PosClient
        orgId={orgId}
        role={role === 'staff' ? 'staff' : 'org_admin'}
        branches={branches}
        defaultBranchId={defaultBranchId}
        initialProducts={
          (initialProducts ?? []) as Array<{
            product_id: string;
            name: string;
            internal_code: string | null;
            barcode: string | null;
            sell_unit_type: 'unit' | 'weight' | 'bulk';
            uom: string;
            unit_price: number;
            stock_on_hand: number;
            is_active: boolean;
          }>
        }
        initialPaymentDevices={
          (initialPaymentDevices ?? []) as Array<{
            id: string;
            device_name: string;
            provider: 'posnet' | 'mercadopago' | 'other';
          }>
        }
        specialOrder={{
          specialOrderId: specialOrderMeta?.special_order_id ?? null,
          clientName: specialOrderMeta?.client_name ?? null,
          items: specialOrderRows.map((row) => ({
            product_id: row.product_id,
            name: row.product_name,
            sell_unit_type: row.sell_unit_type,
            uom: row.uom,
            unit_price: Number(row.unit_price ?? 0),
            quantity: Number(row.remaining_qty ?? 0),
          })),
        }}
        cashDiscount={cashDiscount}
      />
    </PageShell>
  );
}
