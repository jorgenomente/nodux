'use client';

import { useEffect, useMemo, useState } from 'react';

type SupplierOption = {
  id: string;
  name: string;
  default_markup_pct: number | null;
};

type Props = {
  suppliers: SupplierOption[];
  defaultApplySupplierPrice: boolean;
  defaultSupplierPrice: string;
  defaultApplyUnitPrice: boolean;
  defaultUnitPrice: string;
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const parseAmount = (value: string) => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toInputAmount = (value: number) => {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(2);
};

export default function BulkPricingSuggestion({
  suppliers,
  defaultApplySupplierPrice,
  defaultSupplierPrice,
  defaultApplyUnitPrice,
  defaultUnitPrice,
}: Props) {
  const [primarySupplierId, setPrimarySupplierId] = useState('');
  const [applySupplierPrice, setApplySupplierPrice] = useState(
    defaultApplySupplierPrice,
  );
  const [supplierPrice, setSupplierPrice] = useState(defaultSupplierPrice);
  const [applyUnitPrice, setApplyUnitPrice] = useState(defaultApplyUnitPrice);
  const [unitPrice, setUnitPrice] = useState(defaultUnitPrice);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const select = document.querySelector<HTMLSelectElement>(
      'select[name="bulk_primary_supplier_id"]',
    );
    if (!select) return;

    const sync = () => setPrimarySupplierId(select.value);
    sync();
    select.addEventListener('change', sync);
    return () => select.removeEventListener('change', sync);
  }, []);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === primarySupplierId),
    [primarySupplierId, suppliers],
  );
  const markupPct = Number(selectedSupplier?.default_markup_pct ?? 40);
  const supplierPriceNumber = parseAmount(supplierPrice);
  const suggestedUnitPrice =
    supplierPriceNumber != null && supplierPriceNumber > 0
      ? supplierPriceNumber * (1 + markupPct / 100)
      : null;

  const helperText =
    suggestedUnitPrice == null
      ? `Sugerencia: completa "Precio proveedor" para calcular el precio unitario recomendado (${markupPct}% de ganancia).`
      : `Sugerido para precio unitario: $${currencyFormatter.format(
          suggestedUnitPrice,
        )} (${markupPct}% sobre precio proveedor).`;

  return (
    <>
      <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-[260px_1fr] md:items-center">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            name="apply_supplier_price"
            checked={applySupplierPrice}
            onChange={(event) => setApplySupplierPrice(event.target.checked)}
          />
          Aplicar precio proveedor (primario)
        </label>
        <input
          type="number"
          name="bulk_supplier_price"
          min="0"
          step="0.01"
          placeholder="0"
          value={supplierPrice}
          onChange={(event) => setSupplierPrice(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
        />
      </div>

      <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-[260px_1fr] md:items-center">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            name="apply_unit_price"
            checked={applyUnitPrice}
            onChange={(event) => setApplyUnitPrice(event.target.checked)}
          />
          Aplicar precio unitario
        </label>
        <div>
          <input
            type="number"
            name="bulk_unit_price"
            min="0"
            step="0.01"
            placeholder="0"
            value={unitPrice}
            onChange={(event) => {
              setUnitPrice(event.target.value);
            }}
            className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">{helperText}</span>
            {suggestedUnitPrice != null ? (
              <button
                type="button"
                onClick={() => {
                  setUnitPrice(toInputAmount(suggestedUnitPrice));
                }}
                className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Usar sugerido
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
