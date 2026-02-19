'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

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
          defaultValue={selectedBranchId}
          onChange={(event) =>
            handleChange(event.target.value, selectedOpsScope)
          }
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
          defaultValue={selectedOpsScope}
          onChange={(event) =>
            handleChange(
              selectedBranchId,
              event.target.value as 'today' | 'week',
            )
          }
          disabled={isPending}
        >
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
        </select>
      </label>
    </div>
  );
}
