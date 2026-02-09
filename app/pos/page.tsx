import { redirect } from 'next/navigation';

import PageShell from '@/app/components/PageShell';
import PosClient from '@/app/pos/PosClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const STAFF_MODULE_ORDER = [
  'pos',
  'products_lookup',
  'clients',
  'expirations',
] as const;
const moduleToRoute: Record<string, string> = {
  pos: '/pos',
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

export default async function PosPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: membership } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.org_id || !membership.role) {
    redirect('/no-access');
  }

  if (membership.role === 'superadmin') {
    redirect('/superadmin');
  }

  if (membership.role === 'staff') {
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

  if (membership.role === 'staff') {
    const { data: branchMemberships } = await supabase
      .from('branch_memberships')
      .select('branch_id')
      .eq('org_id', membership.org_id)
      .eq('user_id', user.id)
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
      .eq('org_id', membership.org_id)
      .eq('is_active', true)
      .in('id', branchIds)
      .order('name');

    branches = branchRows ?? [];
  } else {
    const { data: branchRows } = await supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', membership.org_id)
      .eq('is_active', true)
      .order('name');

    branches = branchRows ?? [];
  }

  const defaultBranchId = branches.length > 0 ? branches[0].id : null;

  const { data: initialProducts } = defaultBranchId
    ? await supabase
        .from('v_pos_product_catalog')
        .select(
          'product_id, name, internal_code, barcode, sell_unit_type, uom, unit_price, stock_on_hand, is_active',
        )
        .eq('org_id', membership.org_id)
        .eq('branch_id', defaultBranchId)
        .eq('is_active', true)
        .order('name')
        .limit(20)
    : { data: [] };

  return (
    <PageShell>
      <PosClient
        orgId={membership.org_id}
        role={membership.role === 'staff' ? 'staff' : 'org_admin'}
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
      />
    </PageShell>
  );
}
