'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  initialQuery: string;
};

export default function SuppliersSearchInput({ initialQuery }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = value.trim();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (trimmed.length >= 3) {
        params.set('q', trimmed);
      }
      const next = params.toString();
      startTransition(() => {
        router.replace(`/suppliers${next ? `?${next}` : ''}`);
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [router, value]);

  return (
    <label className="flex w-full max-w-sm flex-col gap-1 text-sm text-zinc-600">
      Buscar proveedor
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Escribe al menos 3 letras"
        className="rounded border border-zinc-200 px-3 py-2 text-sm"
        disabled={isPending}
      />
    </label>
  );
}
