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
  severityFilter: string;
};

export default function ExpirationsFiltersClient({
  branches,
  selectedBranchId,
  severityFilter,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleBranchChange = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set('branch_id', value);
    if (severityFilter) params.set('severity', severityFilter);
    const next = params.toString();
    startTransition(() => {
      router.replace(`/expirations${next ? `?${next}` : ''}`);
    });
  };

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      Sucursal
      <select
        name="branch_id"
        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        defaultValue={selectedBranchId}
        onChange={(event) => handleBranchChange(event.target.value)}
        disabled={isPending}
        required
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}
