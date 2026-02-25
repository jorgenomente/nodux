'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  action: (formData: FormData) => Promise<void>;
  bulkQuery: string;
  bulkPage: number;
  bulkPageSize: number;
};

const orderFrequencyOptions = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Cada 2 semanas' },
  { value: 'every_3_weeks', label: 'Cada 3 semanas' },
  { value: 'monthly', label: 'Mensual (30 días)' },
] as const;

const weekdayOptions = [
  { value: 'mon', label: 'Lunes' },
  { value: 'tue', label: 'Martes' },
  { value: 'wed', label: 'Miércoles' },
  { value: 'thu', label: 'Jueves' },
  { value: 'fri', label: 'Viernes' },
  { value: 'sat', label: 'Sábado' },
  { value: 'sun', label: 'Domingo' },
] as const;

const toBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const encodeSnapshot = (value: unknown) => {
  try {
    return toBase64Url(JSON.stringify(value));
  } catch {
    return '';
  }
};

const collectBulkDraftSnapshot = () => {
  if (typeof document === 'undefined') return '';
  const form = document.querySelector<HTMLFormElement>(
    'form[data-bulk-products-form=\"true\"]',
  );
  if (!form) return '';
  const byName = (name: string) =>
    form.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[name=\"${name}\"]`,
    );
  const checked = (name: string) =>
    Boolean(
      form.querySelector<HTMLInputElement>(`input[name=\"${name}\"]:checked`),
    );

  const snapshot = {
    selectedProductIds: Array.from(
      form.querySelectorAll<HTMLInputElement>(
        'input[name=\"product_ids\"]:checked',
      ),
    ).map((input) => input.value),
    applyBrand: checked('apply_brand'),
    bulkBrand: byName('bulk_brand')?.value ?? '',
    applyPrimarySupplier: checked('apply_primary_supplier'),
    bulkPrimarySupplierId: byName('bulk_primary_supplier_id')?.value ?? '',
    applySecondarySupplier: checked('apply_secondary_supplier'),
    bulkSecondarySupplierId: byName('bulk_secondary_supplier_id')?.value ?? '',
    applySupplierPrice: checked('apply_supplier_price'),
    bulkSupplierPrice: byName('bulk_supplier_price')?.value ?? '',
    applyShelfLifeDays: checked('apply_shelf_life_days'),
    bulkShelfLifeDays: byName('bulk_shelf_life_days')?.value ?? '',
    bulkShelfLifeNoApplies: checked('bulk_shelf_life_no_applies'),
    applyUnitPrice: checked('apply_unit_price'),
    bulkUnitPrice: byName('bulk_unit_price')?.value ?? '',
  };

  return encodeSnapshot(snapshot);
};

export default function BulkCreateSupplierModal({
  action,
  bulkQuery,
  bulkPage,
  bulkPageSize,
}: Props) {
  const [open, setOpen] = useState(false);
  const [bulkStateSnapshot, setBulkStateSnapshot] = useState('');

  const modalContent = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-900">
            Nuevo proveedor rápido
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-1 text-xs text-zinc-600">
          Solo el nombre es obligatorio para salir del paso. Después puedes
          completar detalles desde `/suppliers`.
        </p>

        <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="bulk_q" value={bulkQuery} />
          <input type="hidden" name="bulk_page" value={String(bulkPage)} />
          <input
            type="hidden"
            name="bulk_page_size"
            value={String(bulkPageSize)}
          />
          <input type="hidden" name="bulk_state" value={bulkStateSnapshot} />
          <label className="text-sm text-zinc-600">
            Nombre *
            <input
              name="name"
              required
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600">
            Contacto
            <input
              name="contact_name"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600">
            Teléfono
            <input
              name="phone"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600">
            Email
            <input
              name="email"
              type="email"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600 md:col-span-2">
            Notas
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600">
            Frecuencia
            <select
              name="order_frequency"
              defaultValue=""
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar</option>
              {orderFrequencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-600">
            Día de pedido
            <select
              name="order_day"
              defaultValue=""
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar</option>
              {weekdayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-600">
            Día de recepción
            <select
              name="receive_day"
              defaultValue=""
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar</option>
              {weekdayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-600">
            Plazo de pago (días)
            <input
              name="payment_terms_days"
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600">
            % ganancia sugerida
            <input
              name="default_markup_pct"
              type="number"
              min={0}
              step="0.01"
              defaultValue="40"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-zinc-600">
            Método de pago preferido
            <select
              name="preferred_payment_method"
              defaultValue=""
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Sin preferencia</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </label>
          <label className="text-sm text-zinc-600 md:col-span-2">
            Datos de pago y notas del proveedor
            <textarea
              name="payment_note"
              rows={2}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <details className="rounded-lg border border-zinc-200 p-3 md:col-span-2">
            <summary className="cursor-pointer text-sm font-medium text-zinc-800">
              Agregar cuenta de transferencia (opcional)
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-zinc-600">
                Alias / etiqueta
                <input
                  name="account_label"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                Banco
                <input
                  name="bank_name"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                Titular
                <input
                  name="account_holder_name"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-zinc-600">
                CBU/CVU/Alias
                <input
                  name="account_identifier"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-600 md:col-span-2">
                <input
                  name="account_is_active"
                  type="checkbox"
                  defaultChecked
                />
                Cuenta activa
              </label>
            </div>
          </details>

          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Crear proveedor
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setBulkStateSnapshot(collectBulkDraftSnapshot());
          setOpen(true);
        }}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Crear proveedor
      </button>
      {modalContent && typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
