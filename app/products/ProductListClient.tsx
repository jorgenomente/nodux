'use client';

import { useMemo, useState } from 'react';

import ProductActions from '@/app/products/ProductActions';

type StockByBranchItem = {
  branch_id: string;
  branch_name: string;
  quantity_on_hand: number;
};

type SafetyStockByBranchItem = {
  branch_name: string;
  safety_stock: number;
};

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type SupplierByProductEntry = {
  primary?: SupplierOption;
  secondary?: SupplierOption;
};

type ProductRow = {
  product_id: string | null;
  name: string | null;
  internal_code: string | null;
  barcode: string | null;
  sell_unit_type: 'unit' | 'weight' | 'bulk' | null;
  uom: string | null;
  unit_price: number | null;
  is_active: boolean | null;
  shelf_life_days: number | null;
  stock_total: number | null;
  stock_by_branch: unknown;
};

type Props = {
  products: ProductRow[];
  suppliers: SupplierOption[];
  supplierByProduct: Record<string, SupplierByProductEntry>;
  safetyStockGlobalByProduct: Record<string, number | null>;
  safetyStockByProduct: Record<string, SafetyStockByBranchItem[] | undefined>;
  onUpdate: (formData: FormData) => void;
};

const formatStockByBranch = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    return 'Sin detalle por sucursal.';
  }

  const parts = value
    .filter((item) =>
      Boolean(item && typeof item === 'object' && 'branch_name' in item),
    )
    .map((item) => {
      const entry = item as StockByBranchItem;
      return `${entry.branch_name}: ${entry.quantity_on_hand}`;
    });

  return parts.length > 0 ? parts.join(' · ') : 'Sin detalle por sucursal.';
};

const formatSafetyStockByBranch = (
  value: SafetyStockByBranchItem[] | undefined,
) => {
  if (!value || value.length === 0) {
    return 'Sin stock minimo.';
  }

  const parts = value.map(
    (item) => `${item.branch_name}: ${item.safety_stock}`,
  );
  return parts.length > 0 ? parts.join(' · ') : 'Sin stock minimo.';
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

export default function ProductListClient({
  products,
  suppliers,
  supplierByProduct,
  safetyStockGlobalByProduct,
  safetyStockByProduct,
  onUpdate,
}: Props) {
  const [query, setQuery] = useState('');
  const queryTrimmed = query.trim();
  const tokens = useMemo(() => tokenize(queryTrimmed), [queryTrimmed]);

  const filteredProducts = useMemo(() => {
    if (queryTrimmed.length === 0) return products;
    if (queryTrimmed.length < 3) return [];
    if (tokens.length === 0) return products;

    return products.filter((product) => {
      const haystack = normalizeText(
        [product.name ?? '', product.internal_code ?? '', product.barcode ?? '']
          .filter(Boolean)
          .join(' '),
      );
      return tokens.every((token) => haystack.includes(token));
    });
  }, [products, queryTrimmed, tokens]);

  const showHint = queryTrimmed.length > 0 && queryTrimmed.length < 3;

  const formatSafetyStockDisplay = (productId: string) => {
    const globalValue = safetyStockGlobalByProduct[productId];
    if (globalValue != null) {
      return String(globalValue);
    }
    return formatSafetyStockByBranch(safetyStockByProduct[productId]);
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Listado</h2>
      </div>
      <div className="border-b border-zinc-100 px-6 py-4">
        <label className="text-sm text-zinc-600">
          Buscar productos (min 3 letras)
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Nombre, SKU o codigo de barras"
          />
        </label>
        {showHint ? (
          <p className="mt-2 text-xs text-zinc-500">
            Escribi al menos 3 letras para buscar.
          </p>
        ) : null}
      </div>
      <div className="divide-y divide-zinc-100">
        {filteredProducts.length === 0 ? (
          <div className="px-6 py-8 text-sm text-zinc-500">
            {queryTrimmed.length === 0
              ? 'No hay productos cargados.'
              : 'No hay coincidencias.'}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.product_id ?? product.name} className="px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      SKU: {product.internal_code || 'Sin SKU'} · Barcode:{' '}
                      {product.barcode || 'Sin barcode'}
                    </p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Vencimiento aprox:{' '}
                    {product.shelf_life_days ?? 'Sin definir'} días
                  </div>
                  <div className="text-xs text-zinc-500">
                    Stock minimo:{' '}
                    {product.product_id
                      ? formatSafetyStockDisplay(String(product.product_id))
                      : 'Sin stock minimo.'}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Proveedor:{' '}
                    {supplierByProduct[String(product.product_id)]?.primary
                      ?.name ?? 'Sin proveedor'}
                    {' · '}
                    Secundario:{' '}
                    {supplierByProduct[String(product.product_id)]?.secondary
                      ?.name ?? 'Sin proveedor'}
                  </div>
                  {product.product_id ? (
                    <ProductActions
                      productId={String(product.product_id)}
                      name={product.name ?? ''}
                      internalCode={product.internal_code ?? null}
                      barcode={product.barcode ?? null}
                      sellUnitType={
                        (product.sell_unit_type ?? 'unit') as
                          | 'unit'
                          | 'weight'
                          | 'bulk'
                      }
                      uom={product.uom ?? 'unit'}
                      unitPrice={Number(product.unit_price ?? 0)}
                      isActive={Boolean(product.is_active)}
                      shelfLifeDays={
                        product.shelf_life_days == null
                          ? null
                          : Number(product.shelf_life_days)
                      }
                      safetyStockValue={
                        safetyStockGlobalByProduct[
                          String(product.product_id)
                        ] ?? null
                      }
                      primarySupplierId={
                        supplierByProduct[String(product.product_id)]?.primary
                          ?.id ?? ''
                      }
                      secondarySupplierId={
                        supplierByProduct[String(product.product_id)]?.secondary
                          ?.id ?? ''
                      }
                      suppliers={suppliers}
                      onSubmit={onUpdate}
                    />
                  ) : null}
                </div>
                <div className="text-right text-sm text-zinc-600">
                  <div className="font-medium">
                    ${product.unit_price?.toFixed?.(2) ?? product.unit_price}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Stock: {formatStockByBranch(product.stock_by_branch)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Stock total: {product.stock_total}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Estado: {product.is_active ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
