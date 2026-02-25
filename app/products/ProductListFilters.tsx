'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

type Props = {
  initialQuery: string;
  initialPageSize: number;
};

export default function ProductListFilters({
  initialQuery,
  initialPageSize,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        params.set('q', trimmedQuery);
      }
      params.set('page', '1');
      params.set('page_size', String(pageSize));
      router.replace(`/products?${params.toString()}`, { scroll: false });
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, pageSize, router]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-72 flex-1 flex-col gap-1 text-sm text-zinc-700">
        Buscar por nombre
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej: coca 2l"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Por pagina
        <select
          value={String(pageSize)}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            if (
              PAGE_SIZE_OPTIONS.includes(
                parsed as (typeof PAGE_SIZE_OPTIONS)[number],
              )
            ) {
              setPageSize(parsed);
            }
          }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
