import { getFiscalAdminClient } from '@/lib/fiscal/rpc/client';

export type FiscalOrgControls = {
  fiscalProdEnqueueEnabled: boolean;
  fiscalProdLiveEnabled: boolean;
};

export const getFiscalOrgControls = async (tenantId: string) => {
  const supabase = getFiscalAdminClient();

  const { data, error } = await supabase
    .from('org_preferences' as never)
    .select('fiscal_prod_enqueue_enabled, fiscal_prod_live_enabled')
    .eq('org_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`getFiscalOrgControls failed: ${error.message}`);
  }

  const row = (data ?? null) as
    | {
        fiscal_prod_enqueue_enabled?: boolean | null;
        fiscal_prod_live_enabled?: boolean | null;
      }
    | null;

  return {
    fiscalProdEnqueueEnabled: row?.fiscal_prod_enqueue_enabled === true,
    fiscalProdLiveEnabled: row?.fiscal_prod_live_enabled === true,
  } satisfies FiscalOrgControls;
};
