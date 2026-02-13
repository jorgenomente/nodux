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
};

export default function DashboardFiltersClient({
  branches,
  selectedBranchId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set('branch_id', value);
    const next = params.toString();
    startTransition(() => {
      router.replace(`/dashboard${next ? `?${next}` : ''}`);
    });
  };

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      Sucursal
      <select
        name="branch_id"
        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        defaultValue={selectedBranchId}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending}
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
