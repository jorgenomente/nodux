'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

type Option = { id: string; name: string };

type Props = {
  suppliers: Option[];
  branches: Option[];
  draftSupplierId: string;
  draftBranchId: string;
  draftMarginPct?: string;
  draftAvgMode?: string;
};

export default function OrderDraftFiltersClient({
  suppliers,
  branches,
  draftSupplierId,
  draftBranchId,
  draftMarginPct,
  draftAvgMode,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pushNext = (nextSupplier: string, nextBranch: string) => {
    const params = new URLSearchParams();
    if (nextSupplier) params.set('draft_supplier_id', nextSupplier);
    if (nextBranch) params.set('draft_branch_id', nextBranch);
    if (draftMarginPct) params.set('draft_margin_pct', draftMarginPct);
    if (draftAvgMode) params.set('draft_avg_mode', draftAvgMode);
    const next = params.toString();
    startTransition(() => {
      router.replace(`/orders${next ? `?${next}` : ''}`);
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-sm text-zinc-600">
        Proveedor
        <select
          name="draft_supplier_id"
          defaultValue={draftSupplierId}
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
          onChange={(event) => pushNext(event.target.value, draftBranchId)}
          disabled={isPending}
        >
          <option value="">Seleccionar</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-zinc-600">
        Sucursal
        <select
          name="draft_branch_id"
          defaultValue={draftBranchId}
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
          onChange={(event) => pushNext(draftSupplierId, event.target.value)}
          disabled={isPending}
        >
          <option value="">Seleccionar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
