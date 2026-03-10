'use client';

import { useState } from 'react';

type BranchOption = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  name: string;
};

type TransferRow = {
  id: string;
};

type Props = {
  branches: BranchOption[];
  products: ProductOption[];
  canAdjustManualStock: boolean;
  canTransferStock: boolean;
  manualAdjustAction: (formData: FormData) => Promise<void>;
  transferStockAction: (formData: FormData) => Promise<void>;
};

const createTransferRow = (): TransferRow => ({
  id: crypto.randomUUID(),
});

export default function StockAdjustmentSection({
  branches,
  products,
  canAdjustManualStock,
  canTransferStock,
  manualAdjustAction,
  transferStockAction,
}: Props) {
  const [rows, setRows] = useState<TransferRow[]>([createTransferRow()]);

  const addRow = () => {
    setRows((current) => [...current, createTransferRow()]);
  };

  const removeRow = (rowId: string) => {
    setRows((current) => {
      if (current.length === 1) return current;
      return current.filter((row) => row.id !== rowId);
    });
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold text-zinc-900">
          Ajuste manual de stock
          <span className="text-sm font-medium text-zinc-500 transition group-open:rotate-180">
            ▾
          </span>
        </summary>

        {canAdjustManualStock ? (
          <form
            action={manualAdjustAction}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <label className="text-sm font-medium text-zinc-700">
              Producto
              <select
                name="product_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Selecciona</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Sucursal
              <select
                name="branch_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Selecciona</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Nueva cantidad
              <input
                name="new_quantity"
                type="number"
                step="0.001"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                defaultValue="0"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Motivo
              <input
                name="reason"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Ajuste manual"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Ajustar stock
              </button>
            </div>
          </form>
        ) : null}

        {canTransferStock ? (
          <div
            className={
              canAdjustManualStock
                ? 'mt-8 border-t border-zinc-100 pt-8'
                : 'mt-6'
            }
          >
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-900">
                Mover stock entre sucursales
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Descuenta stock en la sucursal origen y lo suma en la sucursal
                destino dentro de una sola operación.
              </p>
            </div>

            <form action={transferStockAction} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-zinc-700">
                  Desde sucursal
                  <select
                    name="from_branch_id"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Selecciona</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-zinc-700">
                  Hacia sucursal
                  <select
                    name="to_branch_id"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Selecciona</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3">
                {rows.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]"
                  >
                    <label className="text-sm font-medium text-zinc-700">
                      Artículo {index + 1}
                      <select
                        name="transfer_product_id"
                        className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Selecciona</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-zinc-700">
                      Cantidad a mover
                      <input
                        name="transfer_quantity"
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        defaultValue="1"
                        required
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-400"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <label className="text-sm font-medium text-zinc-700">
                Motivo
                <input
                  name="transfer_reason"
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="Transferencia entre sucursales"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
                >
                  Agregar artículo
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Mover stock
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </details>
    </section>
  );
}
