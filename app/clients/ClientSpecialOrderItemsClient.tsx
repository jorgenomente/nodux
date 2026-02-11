'use client';

import { useMemo, useState } from 'react';

type ProductOption = {
  id: string;
  name: string;
  sell_unit_type: 'unit' | 'weight' | 'bulk';
  uom: string;
};

type SupplierOption = {
  id: string;
  name: string;
};

type PrimarySupplierByProduct = Record<
  string,
  { supplier_id: string; supplier_name: string } | undefined
>;

type ItemRow = {
  rowId: string;
  productId: string;
  requestedQty: string;
  supplierId: string;
};

type Props = {
  products: ProductOption[];
  suppliers: SupplierOption[];
  primarySupplierByProduct: PrimarySupplierByProduct;
  inputName?: string;
};

const createRow = (): ItemRow => ({
  rowId: crypto.randomUUID(),
  productId: '',
  requestedQty: '1',
  supplierId: '',
});

export default function ClientSpecialOrderItemsClient({
  products,
  suppliers,
  primarySupplierByProduct,
  inputName = 'items_json',
}: Props) {
  const [items, setItems] = useState<ItemRow[]>([createRow()]);

  const payload = useMemo(() => {
    return items
      .map((item) => {
        const qty = Number(item.requestedQty);
        if (!item.productId || Number.isNaN(qty) || qty <= 0) return null;
        return {
          product_id: item.productId,
          requested_qty: Math.round(qty),
          supplier_id: item.supplierId || null,
        };
      })
      .filter(Boolean);
  }, [items]);

  const updateItem = (rowId: string, updates: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId ? { ...item, ...updates } : item,
      ),
    );
  };

  const handleProductChange = (rowId: string, productId: string) => {
    const primary = primarySupplierByProduct[productId];
    updateItem(rowId, {
      productId,
      supplierId: primary?.supplier_id ?? '',
    });
  };

  const addRow = () => {
    setItems((prev) => [...prev, createRow()]);
  };

  const removeRow = (rowId: string) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((item) => item.rowId !== rowId),
    );
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={inputName} value={JSON.stringify(payload)} />
      {items.map((item) => {
        const primary = primarySupplierByProduct[item.productId];
        return (
          <div key={item.rowId} className="grid gap-2 md:grid-cols-12">
            <label className="text-sm text-zinc-600 md:col-span-6">
              Producto
              <select
                value={item.productId}
                onChange={(event) =>
                  handleProductChange(item.rowId, event.target.value)
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              {primary?.supplier_name ? (
                <span className="mt-1 block text-xs text-zinc-400">
                  Proveedor sugerido: {primary.supplier_name}
                </span>
              ) : null}
            </label>
            <label className="text-sm text-zinc-600 md:col-span-2">
              Cantidad
              <input
                type="number"
                min="1"
                step="1"
                value={item.requestedQty}
                onChange={(event) =>
                  updateItem(item.rowId, { requestedQty: event.target.value })
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-zinc-600 md:col-span-3">
              Proveedor
              <select
                value={item.supplierId}
                onChange={(event) =>
                  updateItem(item.rowId, { supplierId: event.target.value })
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end md:col-span-1">
              <button
                type="button"
                onClick={() => removeRow(item.rowId)}
                className="w-full rounded border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600"
              >
                Quitar
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addRow}
        className="rounded border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700"
      >
        Agregar artículo
      </button>
    </div>
  );
}
