'use client';

import { useEffect, useMemo, useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type BranchOption = {
  id: string;
  name: string;
};

type ProductLookupRow = {
  product_id: string;
  name: string;
  internal_code: string | null;
  barcode: string | null;
  unit_price: number;
  stock_on_hand: number;
};

type Props = {
  orgId: string;
  branches: BranchOption[];
  defaultBranchId: string;
};

const SEARCH_MIN_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 250;
const RESULT_LIMIT = 30;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);

const formatStock = (value: number) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value);

const tokenizeQuery = (query: string) =>
  query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

export default function ProductsLookupClient({
  orgId,
  branches,
  defaultBranchId,
}: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductLookupRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryTokens = useMemo(() => tokenizeQuery(query), [query]);
  const shouldSearch = query.trim().length >= SEARCH_MIN_CHARS;
  const visibleResults = shouldSearch ? results : [];

  const handleBranchChange = (value: string) => {
    setBranchId(value);
    setErrorMessage(null);
    setIsLoading(false);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setErrorMessage(null);
    if (value.trim().length < SEARCH_MIN_CHARS) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    if (!branchId || !shouldSearch) {
      return () => {
        isActive = false;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      let request = supabase
        .from('v_pos_product_catalog')
        .select(
          'product_id, name, internal_code, barcode, unit_price, stock_on_hand',
        )
        .eq('org_id', orgId)
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('name')
        .limit(RESULT_LIMIT);

      for (const token of queryTokens) {
        request = request.ilike('name', `%${token}%`);
      }

      const { data, error } = await request;

      if (!isActive) return;

      if (error) {
        setErrorMessage(
          'No se pudo buscar productos. Reintentá en unos segundos.',
        );
        setResults([]);
        setIsLoading(false);
        return;
      }

      setResults((data as ProductLookupRow[] | null) ?? []);
      setIsLoading(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [branchId, orgId, queryTokens, shouldSearch, supabase]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          Consulta de productos
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Buscá por nombre para ver precio y stock en segundos.
        </p>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-1">
            <label
              htmlFor="lookup-branch"
              className="text-xs font-semibold text-zinc-600"
            >
              Sucursal
            </label>
            <select
              id="lookup-branch"
              value={branchId}
              onChange={(event) => handleBranchChange(event.target.value)}
              className="h-11 rounded-lg border border-zinc-300 px-3 text-sm"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label
              htmlFor="lookup-query"
              className="text-xs font-semibold text-zinc-600"
            >
              Producto
            </label>
            <input
              id="lookup-query"
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="Ej: coca 2.25 retornable"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              className="h-12 rounded-lg border border-zinc-300 px-3 text-base"
            />
            <p className="text-xs text-zinc-500">
              Podés escribir palabras en cualquier orden. Mínimo{' '}
              {SEARCH_MIN_CHARS} caracteres.
            </p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {!shouldSearch ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-600">
          Empezá escribiendo el nombre del producto para buscar.
        </p>
      ) : null}

      {isLoading ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-600">
          Buscando productos...
        </p>
      ) : null}

      {shouldSearch && !isLoading && visibleResults.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
          No encontramos productos con esa búsqueda.
        </p>
      ) : null}

      {visibleResults.length > 0 ? (
        <section className="grid gap-2">
          {visibleResults.map((product) => (
            <article
              key={product.product_id}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {product.internal_code
                      ? `Cod: ${product.internal_code}`
                      : 'Sin código interno'}
                    {product.barcode ? ` · EAN: ${product.barcode}` : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold whitespace-nowrap text-zinc-900">
                  {formatCurrency(Number(product.unit_price ?? 0))}
                </p>
              </div>

              <div className="mt-2 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                Stock: {formatStock(Number(product.stock_on_hand ?? 0))}
              </div>
            </article>
          ))}

          {visibleResults.length >= RESULT_LIMIT ? (
            <p className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
              Mostrando hasta {RESULT_LIMIT} resultados. Agregá más palabras
              para afinar.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
