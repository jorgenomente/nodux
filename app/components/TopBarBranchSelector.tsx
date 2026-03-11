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
};

const ACTIVE_BRANCH_COOKIE = 'nodux_active_branch_id';

export default function TopBarBranchSelector({
  branches,
  selectedBranchId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftBranchId, setDraftBranchId] = useState(selectedBranchId);

  useEffect(() => {
    setDraftBranchId(selectedBranchId);
  }, [selectedBranchId]);

  const handleApply = () => {
    const cookieValue = encodeURIComponent(draftBranchId);
    if (!draftBranchId) {
      document.cookie = `${ACTIVE_BRANCH_COOKIE}=; path=/; max-age=0; samesite=lax`;
    } else {
      document.cookie = `${ACTIVE_BRANCH_COOKIE}=${cookieValue}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    }

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1">
      <select
        name="active_branch_id"
        value={draftBranchId}
        onChange={(event) => setDraftBranchId(event.target.value)}
        disabled={isPending}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleApply}
        disabled={isPending || draftBranchId === selectedBranchId}
        className={`rounded border px-2 py-1 text-[11px] ${
          isPending || draftBranchId === selectedBranchId
            ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400'
            : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
        }`}
      >
        {isPending ? 'Aplicando...' : 'Aplicar'}
      </button>
    </div>
  );
}
