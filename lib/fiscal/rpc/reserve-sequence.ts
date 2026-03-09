import { callFiscalRpc } from '@/lib/fiscal/rpc/client';
import type { ReserveSequenceResult } from '@/lib/fiscal/rpc/types';

export const reserveSequence = async (
  invoiceJobId: string,
): Promise<ReserveSequenceResult> => {
  const rows = await callFiscalRpc<ReserveSequenceResult[]>(
    'fn_fiscal_reserve_sequence',
    {
      p_invoice_job_id: invoiceJobId,
    },
  );

  const row = rows.at(0);
  if (!row) {
    throw new Error(
      `fn_fiscal_reserve_sequence returned empty result for job ${invoiceJobId}`,
    );
  }

  return row;
};
