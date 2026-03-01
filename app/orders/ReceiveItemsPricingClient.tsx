'use client';

import { useMemo, useState } from 'react';

type ReceiveItem = {
  order_item_id: string;
  product_id: string;
  product_name: string | null;
  ordered_qty: number;
  default_received_qty: number;
  default_unit_cost: number;
  suggested_unit_cost: number;
  default_unit_price: number;
  markup_pct: number;
};

type Props = {
  items: ReceiveItem[];
  disableQtyEditing?: boolean;
  defaultApplyTax?: boolean;
  defaultTaxPct?: number;
  defaultApplyDiscount?: boolean;
  defaultDiscountAmount?: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

export default function ReceiveItemsPricingClient({
  items,
  disableQtyEditing = false,
  defaultApplyTax = false,
  defaultTaxPct = 21,
  defaultApplyDiscount = false,
  defaultDiscountAmount = 0,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'rows' | 'cards'>('cards');
  const [receivedQtyByItem, setReceivedQtyByItem] = useState<
    Record<string, string>
  >(() => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.order_item_id] = String(item.default_received_qty);
    });
    return next;
  });
  const [unitCostByItem, setUnitCostByItem] = useState<Record<string, string>>(
    () => {
      const next: Record<string, string> = {};
      items.forEach((item) => {
        next[item.order_item_id] = Number(item.default_unit_cost).toFixed(2);
      });
      return next;
    },
  );
  const [applyTax, setApplyTax] = useState(defaultApplyTax);
  const [taxPct, setTaxPct] = useState(String(defaultTaxPct));
  const [applyDiscount, setApplyDiscount] = useState(defaultApplyDiscount);
  const [discountAmount, setDiscountAmount] = useState(
    Number(defaultDiscountAmount).toFixed(2),
  );
  const [unitPriceByItem, setUnitPriceByItem] = useState<Record<string, string>>(
    () => {
      const next: Record<string, string> = {};
      items.forEach((item) => {
        next[item.order_item_id] = Number(item.default_unit_price).toFixed(2);
      });
      return next;
    },
  );

  const totals = useMemo(() => {
    const subtotalWithoutTax = items.reduce((total, item) => {
      const qtyRaw = receivedQtyByItem[item.order_item_id] ?? '0';
      const unitCostRaw = unitCostByItem[item.order_item_id] ?? '0';
      const qty = qtyRaw === '' ? 0 : Number(qtyRaw);
      const unitCost = unitCostRaw === '' ? 0 : Number(unitCostRaw);
      if (!Number.isFinite(qty) || !Number.isFinite(unitCost)) return total;
      return total + qty * unitCost;
    }, 0);
    const taxPctValue = taxPct === '' ? 0 : Number(taxPct);
    const taxAmount =
      applyTax && Number.isFinite(taxPctValue) && taxPctValue > 0
        ? (subtotalWithoutTax * taxPctValue) / 100
        : 0;
    const subtotalWithTax = subtotalWithoutTax + taxAmount;
    const discountValue = discountAmount === '' ? 0 : Number(discountAmount);
    const safeDiscount =
      applyDiscount && Number.isFinite(discountValue) && discountValue > 0
        ? discountValue
        : 0;
    const totalInvoice = Math.max(subtotalWithTax - safeDiscount, 0);
    return {
      subtotalWithoutTax,
      taxAmount,
      subtotalWithTax,
      discountAmount: safeDiscount,
      totalInvoice,
    };
  }, [applyDiscount, applyTax, discountAmount, items, receivedQtyByItem, taxPct, unitCostByItem]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    const tokens = query.split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const name = (item.product_name ?? '').toLowerCase();
      return tokens.every((token) => name.includes(token));
    });
  }, [items, searchQuery]);

  return (
    <div className="space-y-4">
      <label className="block text-sm text-zinc-600">
        Buscar artículo
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Ej: leche descremada"
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm md:max-w-sm"
        />
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Vista</span>
        <button
          type="button"
          onClick={() => setViewMode('cards')}
          className={`rounded border px-2 py-1 text-xs ${
            viewMode === 'cards'
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 text-zinc-700'
          }`}
        >
          Tarjetas
        </button>
        <button
          type="button"
          onClick={() => setViewMode('rows')}
          className={`rounded border px-2 py-1 text-xs ${
            viewMode === 'rows'
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 text-zinc-700'
          }`}
        >
          Filas
        </button>
      </div>
      <div className="space-y-2">
        {viewMode === 'rows'
          ? filteredItems.map((item) => (
              <div
                key={item.order_item_id}
                className="rounded border border-zinc-200 p-3"
              >
                <div className="grid gap-2 md:grid-cols-5">
                  <div className="text-sm text-zinc-700">{item.product_name}</div>
                  <div className="text-xs text-zinc-500">
                    Ordenado: {item.ordered_qty}
                  </div>
                  <label className="text-xs text-zinc-600">
                    Cantidad recibida
                    <input
                      name={`received_${item.order_item_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={receivedQtyByItem[item.order_item_id] ?? '0'}
                      onChange={(event) =>
                        setReceivedQtyByItem((prev) => ({
                          ...prev,
                          [item.order_item_id]: event.target.value,
                        }))
                      }
                      readOnly={disableQtyEditing}
                      aria-disabled={disableQtyEditing}
                      className={`mt-1 w-full rounded border px-2 py-1 text-sm ${
                        disableQtyEditing
                          ? 'border-zinc-200 bg-zinc-100 text-zinc-500'
                          : 'border-zinc-200'
                      }`}
                    />
                  </label>
                  <label className="text-xs text-zinc-600">
                    Precio proveedor (unitario)
                    <input
                      name={`unit_cost_${item.order_item_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitCostByItem[item.order_item_id] ?? '0'}
                      onChange={(event) =>
                        setUnitCostByItem((prev) => ({
                          ...prev,
                          [item.order_item_id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="rounded bg-zinc-100 p-2 text-xs text-zinc-700">
                    Precio venta (unitario)
                    <input
                      name={`unit_price_${item.order_item_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={unitPriceByItem[item.order_item_id] ?? '0'}
                      onChange={(event) =>
                        setUnitPriceByItem((prev) => ({
                          ...prev,
                          [item.order_item_id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-zinc-500">
                      Sugerido:{' '}
                      {(
                        (Number(unitCostByItem[item.order_item_id] ?? 0) || 0) *
                        (1 + item.markup_pct / 100)
                      ).toFixed(2)}{' '}
                      ({item.markup_pct.toFixed(2)}%)
                    </span>
                  </label>
                </div>
              </div>
            ))
          : filteredItems.map((item) => (
              <div
                key={item.order_item_id}
                className="rounded-lg border border-zinc-200 p-3"
              >
                <p className="text-sm font-semibold text-zinc-800">
                  {item.product_name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Ordenado: {item.ordered_qty}
                </p>
                <div className="mt-3 grid gap-2">
                  <label className="text-xs text-zinc-600">
                    Cantidad recibida
                    <input
                      name={`received_${item.order_item_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={receivedQtyByItem[item.order_item_id] ?? '0'}
                      onChange={(event) =>
                        setReceivedQtyByItem((prev) => ({
                          ...prev,
                          [item.order_item_id]: event.target.value,
                        }))
                      }
                      readOnly={disableQtyEditing}
                      aria-disabled={disableQtyEditing}
                      className={`mt-1 w-full rounded border px-2 py-1 text-sm ${
                        disableQtyEditing
                          ? 'border-zinc-200 bg-zinc-100 text-zinc-500'
                          : 'border-zinc-200'
                      }`}
                    />
                  </label>
                  <label className="text-xs text-zinc-600">
                    Precio proveedor (unitario)
                    <input
                      name={`unit_cost_${item.order_item_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitCostByItem[item.order_item_id] ?? '0'}
                      onChange={(event) =>
                        setUnitCostByItem((prev) => ({
                          ...prev,
                          [item.order_item_id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="rounded bg-zinc-100 p-2 text-xs text-zinc-700">
                    Precio venta (unitario)
                    <input
                      name={`unit_price_${item.order_item_id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={unitPriceByItem[item.order_item_id] ?? '0'}
                      onChange={(event) =>
                        setUnitPriceByItem((prev) => ({
                          ...prev,
                          [item.order_item_id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-zinc-500">
                      Sugerido:{' '}
                      {(
                        (Number(unitCostByItem[item.order_item_id] ?? 0) || 0) *
                        (1 + item.markup_pct / 100)
                      ).toFixed(2)}{' '}
                      ({item.markup_pct.toFixed(2)}%)
                    </span>
                  </label>
                </div>
              </div>
            ))}
        {filteredItems.length === 0 ? (
          <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
            No se encontraron artículos con ese filtro.
          </div>
        ) : null}
      </div>
      <p className="text-xs text-zinc-500">
        *PRECIO VENTA (UNITARIO): Este sera el precio de venta en el sistema.
      </p>

      <div className="rounded border border-zinc-200 p-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="apply_tax"
                checked={applyTax}
                onChange={(event) => setApplyTax(event.target.checked)}
                value="1"
                className="h-4 w-4 rounded border-zinc-300"
              />
              Aplicar IVA
            </label>
            <label className="flex items-center gap-2 text-zinc-600">
              <span>% IVA</span>
              <input
                type="number"
                name="tax_pct"
                min="0"
                step="0.01"
                value={taxPct}
                onChange={(event) => setTaxPct(event.target.value)}
                disabled={!applyTax}
                className="w-24 rounded border border-zinc-200 px-2 py-1 text-xs disabled:bg-zinc-100"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="apply_discount"
                checked={applyDiscount}
                onChange={(event) => setApplyDiscount(event.target.checked)}
                value="1"
                className="h-4 w-4 rounded border-zinc-300"
              />
              Aplicar descuento
            </label>
            <label className="flex items-center gap-2 text-zinc-600">
              <span>Monto descuento (ARS)</span>
              <input
                type="number"
                name="discount_amount"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                disabled={!applyDiscount}
                className="w-28 rounded border border-zinc-200 px-2 py-1 text-xs disabled:bg-zinc-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-zinc-700 md:max-w-lg">
          <div className="flex items-center justify-between">
            <span>Subtotal sin IVA</span>
            <span>{formatCurrency(totals.subtotalWithoutTax)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>IVA</span>
            <span>{formatCurrency(totals.taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subtotal con IVA</span>
            <span>{formatCurrency(totals.subtotalWithTax)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Descuento</span>
            <span>-{formatCurrency(totals.discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
            <span>Total remito/factura</span>
            <span>{formatCurrency(totals.totalInvoice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
