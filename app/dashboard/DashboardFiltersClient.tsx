'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

type BranchOption = {
  id: string;
  name: string;
};

type Props = {
  branches: BranchOption[];
  selectedBranchId: string;
  selectedOpsScope: 'today' | 'week';
};

export default function DashboardFiltersClient({
  branches,
  selectedBranchId,
  selectedOpsScope,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(selectedBranchId);
  const [opsScope, setOpsScope] = useState<'today' | 'week'>(selectedOpsScope);

  useEffect(() => {
    setBranchId(selectedBranchId);
  }, [selectedBranchId]);

  useEffect(() => {
    setOpsScope(selectedOpsScope);
  }, [selectedOpsScope]);

  const handleChange = (value: string, opsScope: 'today' | 'week') => {
    const params = new URLSearchParams();
    if (value) params.set('branch_id', value);
    if (opsScope) params.set('ops_scope', opsScope);
    const next = params.toString();
    startTransition(() => {
      router.replace(`/dashboard${next ? `?${next}` : ''}`);
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        Sucursal
        <select
          name="branch_id"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={branchId}
          onChange={(event) => {
            const nextBranchId = event.target.value;
            setBranchId(nextBranchId);
            handleChange(nextBranchId, opsScope);
          }}
          disabled={isPending}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
        Vista operativa
        <select
          name="ops_scope"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={opsScope}
          onChange={(event) => {
            const nextOpsScope = event.target.value as 'today' | 'week';
            setOpsScope(nextOpsScope);
            handleChange(branchId, nextOpsScope);
          }}
          disabled={isPending}
        >
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
        </select>
      </label>
    </div>
  );
}
