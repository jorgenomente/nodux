'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState, useTransition } from 'react';

type SupplierOption = {
  id: string;
  name: string;
  default_markup_pct: number | null;
};

type BranchOption = { id: string; name: string };

type Props = {
  suppliers: SupplierOption[];
  branches: BranchOption[];
  draftSupplierId: string;
  draftBranchId: string;
  draftMarginPct?: string;
  draftAvgMode?: string;
  orgDefaultMarkupPct: number;
  newSupplierButton?: ReactNode;
};

export default function OrderDraftFiltersClient({
  suppliers,
  branches,
  draftSupplierId,
  draftBranchId,
  draftMarginPct,
  draftAvgMode,
  orgDefaultMarkupPct,
  newSupplierButton,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(draftSupplierId);
  const [branchId, setBranchId] = useState(draftBranchId);

  useEffect(() => {
    setSupplierId(draftSupplierId);
  }, [draftSupplierId]);

  useEffect(() => {
    setBranchId(draftBranchId);
  }, [draftBranchId]);

  const resolveSupplierMarginPct = (nextSupplierId: string) => {
    const supplier = suppliers.find((item) => item.id === nextSupplierId);
    const supplierMarkupPct = Number(supplier?.default_markup_pct);
    if (Number.isFinite(supplierMarkupPct) && supplierMarkupPct >= 0) {
      return String(supplierMarkupPct);
    }

    return String(orgDefaultMarkupPct);
  };

  const pushNext = (
    nextSupplier: string,
    nextBranch: string,
    nextMarginPct?: string,
  ) => {
    const params = new URLSearchParams();
    if (nextSupplier) params.set('draft_supplier_id', nextSupplier);
    if (nextBranch) params.set('draft_branch_id', nextBranch);
    if (nextMarginPct) params.set('draft_margin_pct', nextMarginPct);
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
        <div className="mt-1 flex gap-2">
          <select
            name="draft_supplier_id"
            value={supplierId}
            className="w-full rounded border border-zinc-200 px-3 py-2 text-sm"
            onChange={(event) => {
              const nextSupplierId = event.target.value;
              setSupplierId(nextSupplierId);
              pushNext(
                nextSupplierId,
                branchId,
                nextSupplierId ? resolveSupplierMarginPct(nextSupplierId) : '',
              );
            }}
            disabled={isPending}
          >
            <option value="">Seleccionar</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          {newSupplierButton}
        </div>
      </label>
      <label className="text-sm text-zinc-600">
        Sucursal
        <select
          name="draft_branch_id"
          value={branchId}
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
          onChange={(event) => {
            const nextBranchId = event.target.value;
            setBranchId(nextBranchId);
            pushNext(supplierId, nextBranchId, draftMarginPct);
          }}
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
