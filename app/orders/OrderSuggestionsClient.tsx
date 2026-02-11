'use client';

import { useEffect, useState } from 'react';

type SuggestionRow = {
  product_id: string;
  relation_type: 'primary' | 'secondary';
  product_name: string | null;
  stock_on_hand: number | null;
  safety_stock: number | null;
  avg_daily_sales_30d: number | null;
  cycle_days?: number | null;
  suggested_qty: number | null;
};

type Props = {
  suggestions: SuggestionRow[];
  priceByProduct: Record<string, number>;
  avgMode: 'cycle' | 'weekly' | 'biweekly' | 'monthly';
  safeMarginPct: number;
  showingSummary?: string | null;
  specialOrders?: Array<{
    item_id: string;
    client_name: string | null;
    product_id: string;
    product_name: string | null;
    remaining_qty: number | null;
    supplier_name: string | null;
    special_order_id: string;
    branch_name: string | null;
  }>;
};

type SpecialOrderItem = NonNullable<Props['specialOrders']>[number];

const avgDaysForMode = (mode: Props['avgMode'], cycleDays: number): number => {
  switch (mode) {
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    case 'monthly':
      return 30;
    default:
      return cycleDays;
  }
};

export default function OrderSuggestionsClient({
  suggestions,
  priceByProduct,
  avgMode,
  safeMarginPct,
  showingSummary,
  specialOrders = [],
}: Props) {
  const [view, setView] = useState<'table' | 'cards'>(() => {
    if (typeof window === 'undefined') return 'table';
    const stored = window.localStorage.getItem('orders_suggestions_view');
    return stored === 'table' || stored === 'cards' ? stored : 'table';
  });

  useEffect(() => {
    window.localStorage.setItem('orders_suggestions_view', view);
  }, [view]);

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    suggestions.forEach((row) => {
      next[row.product_id] = Math.ceil(Number(row.suggested_qty ?? 0));
    });
    return next;
  });
  const [specialOrderItemIds, setSpecialOrderItemIds] = useState<string[]>([]);

  const renderRow = (row: SuggestionRow) => {
    const cycleDays = Number(row.cycle_days ?? 30);
    const avgDays = avgDaysForMode(avgMode, cycleDays);
    const avgCycle = Math.round(Number(row.avg_daily_sales_30d ?? 0) * avgDays);
    const unitPrice = priceByProduct[row.product_id] ?? 0;
    const unitCost = unitPrice * (1 - safeMarginPct / 100);
    const suggestedQty = Math.ceil(Number(row.suggested_qty ?? 0));
    const currentQty = quantities[row.product_id] ?? suggestedQty;
    const subtotal = unitCost * currentQty;

    return {
      avgCycle,
      unitPrice,
      unitCost,
      suggestedQty,
      currentQty,
      subtotal,
    };
  };

  const handleQtyChange = (productId: string, value: string) => {
    const parsed = Math.max(0, Math.round(Number(value)));
    setQuantities((prev) => ({
      ...prev,
      [productId]: Number.isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleAddSpecialOrderItem = (item: SpecialOrderItem) => {
    const remaining = Math.ceil(Number(item.remaining_qty ?? 0));
    setQuantities((prev) => {
      const current = prev[item.product_id] ?? 0;
      return {
        ...prev,
        [item.product_id]: current + Math.max(remaining, 0),
      };
    });
    setSpecialOrderItemIds((prev) =>
      prev.includes(item.item_id) ? prev : [...prev, item.item_id],
    );
  };

  const totalItems = suggestions.reduce(
    (total, row) => total + (quantities[row.product_id] ?? 0),
    0,
  );
  const totalCost = suggestions.reduce((total, row) => {
    const unitPrice = priceByProduct[row.product_id] ?? 0;
    const unitCost = unitPrice * (1 - safeMarginPct / 100);
    const qty = quantities[row.product_id] ?? 0;
    return total + unitCost * qty;
  }, 0);

  if (suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
        No hay sugerencias para este proveedor y sucursal.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="special_order_item_ids"
        value={JSON.stringify(specialOrderItemIds)}
      />
      {specialOrders.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="text-xs font-semibold text-amber-700 uppercase">
            Pedidos especiales pendientes
          </p>
          <div className="mt-3 space-y-2 text-xs text-amber-900">
            {specialOrders.map((item) => (
              <div
                key={item.item_id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  {item.product_name || 'Producto'} ·{' '}
                  {item.client_name || 'Cliente'}
                  {item.branch_name ? ` · ${item.branch_name}` : ''}
                  {item.supplier_name ? ` · ${item.supplier_name}` : ''}
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    Pendiente: {Math.ceil(Number(item.remaining_qty ?? 0))}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddSpecialOrderItem(item)}
                    className="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-800"
                  >
                    Agregar al pedido
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {showingSummary ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
          Mostrando: {showingSummary}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Vista: {view === 'table' ? 'Tabla' : 'Tarjetas'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('table')}
            className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
          >
            Tabla
          </button>
          <button
            type="button"
            onClick={() => setView('cards')}
            className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
          >
            Tarjetas
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Stock min</th>
                <th className="px-3 py-2">Promedio (ciclo)</th>
                <th className="px-3 py-2">Sugerido</th>
                <th className="px-3 py-2">Cantidad a pedir</th>
                <th className="px-3 py-2">Precio venta</th>
                <th className="px-3 py-2">Costo estimado</th>
                <th className="px-3 py-2">Subtotal estimado</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((row) => {
                const {
                  avgCycle,
                  unitPrice,
                  unitCost,
                  suggestedQty,
                  currentQty,
                  subtotal,
                } = renderRow(row);

                return (
                  <tr key={row.product_id} className="border-t">
                    <td className="px-3 py-2">
                      {row.product_name || 'Producto'}
                    </td>
                    <td className="px-3 py-2">{row.stock_on_hand ?? 0}</td>
                    <td className="px-3 py-2">{row.safety_stock ?? 0}</td>
                    <td className="px-3 py-2">{avgCycle}</td>
                    <td className="px-3 py-2 font-semibold">{suggestedQty}</td>
                    <td className="px-3 py-2">
                      <input
                        name={`qty_${row.product_id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={currentQty}
                        onChange={(event) =>
                          handleQtyChange(row.product_id, event.target.value)
                        }
                        className="w-24 rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">{unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2">{unitCost.toFixed(2)}</td>
                    <td className="px-3 py-2">{subtotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {suggestions.map((row) => {
            const {
              avgCycle,
              unitPrice,
              unitCost,
              suggestedQty,
              currentQty,
              subtotal,
            } = renderRow(row);

            return (
              <div
                key={row.product_id}
                className="rounded-lg border border-zinc-200 p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {row.product_name || 'Producto'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Stock: {row.stock_on_hand ?? 0} · Stock min:{' '}
                      {row.safety_stock ?? 0}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    Promedio (ciclo): {avgCycle}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-zinc-600">
                  <div className="flex items-center justify-between">
                    <span>Sugerido</span>
                    <span className="font-semibold text-zinc-900">
                      {suggestedQty}
                    </span>
                  </div>
                  <label className="flex items-center justify-between gap-2">
                    <span>Cantidad a pedir</span>
                    <input
                      name={`qty_${row.product_id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={currentQty}
                      onChange={(event) =>
                        handleQtyChange(row.product_id, event.target.value)
                      }
                      className="w-24 rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <div className="flex items-center justify-between">
                    <span>Precio venta</span>
                    <span>{unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Costo estimado</span>
                    <span>{unitCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-zinc-900">
                    <span>Subtotal estimado</span>
                    <span>{subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
        <div>
          Total estimado:{' '}
          <span className="font-semibold text-zinc-900">
            {Number(totalCost).toFixed(2)}
          </span>
        </div>
        <div>
          Cantidad total:{' '}
          <span className="font-semibold text-zinc-900">{totalItems}</span>
        </div>
      </div>
    </div>
  );
}
