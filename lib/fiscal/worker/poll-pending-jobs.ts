import { getFiscalAdminClient } from '@/lib/fiscal/rpc/client';
import type { FiscalInvoiceJobRow } from '@/lib/fiscal/rpc/types';

export const pollPendingJobs = async (batchSize = 20) => {
  const supabase = getFiscalAdminClient();

  const { data, error } = await supabase
    .from('invoice_jobs' as never)
    .select(
      'id,tenant_id,sale_id,sale_document_id,environment,point_of_sale_id,pto_vta,cbte_tipo,cbte_nro,job_status,attempt_count,requested_payload_json,correlation_id,created_at',
    )
    .eq('job_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`pollPendingJobs failed: ${error.message}`);
  }

  return (data ?? []) as unknown as FiscalInvoiceJobRow[];
};
