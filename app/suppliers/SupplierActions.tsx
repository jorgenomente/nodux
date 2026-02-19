'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  supplierId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  orderFrequency: string | null;
  orderDay: string | null;
  receiveDay: string | null;
  paymentTermsDays: number | null;
  preferredPaymentMethod: string | null;
  paymentNote: string | null;
  orderFrequencyOptions: ReadonlyArray<{ value: string; label: string }>;
  weekdayOptions: ReadonlyArray<{ value: string; label: string }>;
  onSubmit: (formData: FormData) => Promise<void>;
};

export default function SupplierActions({
  supplierId,
  name,
  contactName,
  phone,
  email,
  notes,
  isActive,
  orderFrequency,
  orderDay,
  receiveDay,
  paymentTermsDays,
  preferredPaymentMethod,
  paymentNote,
  orderFrequencyOptions,
  weekdayOptions,
  onSubmit,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const derivedAcceptsCash = preferredPaymentMethod !== 'transfer';
  const derivedAcceptsTransfer = preferredPaymentMethod !== 'cash';
  const submitWithRefresh = async (formData: FormData) => {
    await onSubmit(formData);
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
      >
        {open ? 'Cerrar' : 'Editar'}
      </button>
      <form action={submitWithRefresh} className="inline">
        <input type="hidden" name="supplier_id" value={supplierId} />
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="contact_name" value={contactName ?? ''} />
        <input type="hidden" name="phone" value={phone ?? ''} />
        <input type="hidden" name="email" value={email ?? ''} />
        <input type="hidden" name="notes" value={notes ?? ''} />
        <input type="hidden" name="is_active" value={String(!isActive)} />
        <input
          type="hidden"
          name="order_frequency"
          value={orderFrequency ?? ''}
        />
        <input type="hidden" name="order_day" value={orderDay ?? ''} />
        <input type="hidden" name="receive_day" value={receiveDay ?? ''} />
        <input
          type="hidden"
          name="payment_terms_days"
          value={paymentTermsDays ?? ''}
        />
        <input
          type="hidden"
          name="preferred_payment_method"
          value={preferredPaymentMethod ?? ''}
        />
        <input
          type="hidden"
          name="accepts_cash"
          value={derivedAcceptsCash ? 'on' : ''}
        />
        <input
          type="hidden"
          name="accepts_transfer"
          value={derivedAcceptsTransfer ? 'on' : ''}
        />
        <input type="hidden" name="payment_note" value={paymentNote ?? ''} />
        <button
          type="submit"
          className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
        >
          {isActive ? 'Desactivar' : 'Activar'}
        </button>
      </form>
      {open ? (
        <form
          action={submitWithRefresh}
          className="mt-2 grid w-full gap-2 md:grid-cols-2"
        >
          <input type="hidden" name="supplier_id" value={supplierId} />
          <label className="text-xs text-zinc-600">
            Nombre
            <input
              name="name"
              defaultValue={name}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-600">
            Contacto
            <input
              name="contact_name"
              defaultValue={contactName ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-600">
            Teléfono
            <input
              name="phone"
              defaultValue={phone ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-600">
            Email
            <input
              name="email"
              type="email"
              defaultValue={email ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-600 md:col-span-2">
            Notas
            <textarea
              name="notes"
              defaultValue={notes ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              rows={2}
            />
          </label>
          <label className="text-xs text-zinc-600">
            Estado
            <select
              name="is_active"
              defaultValue={String(isActive)}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          <label className="text-xs text-zinc-600">
            Frecuencia
            <select
              name="order_frequency"
              defaultValue={orderFrequency ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            >
              <option value="">Seleccionar</option>
              {orderFrequencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-600">
            Día pedido
            <select
              name="order_day"
              defaultValue={orderDay ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            >
              <option value="">Seleccionar</option>
              {weekdayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-600">
            Día recepción
            <select
              name="receive_day"
              defaultValue={receiveDay ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            >
              <option value="">Seleccionar</option>
              {weekdayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-600">
            Plazo de pago (días)
            <input
              name="payment_terms_days"
              type="number"
              min={0}
              defaultValue={paymentTermsDays ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-600">
            Método de pago preferido
            <select
              name="preferred_payment_method"
              defaultValue={preferredPaymentMethod ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
            >
              <option value="">Sin preferencia</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </label>
          <input
            type="hidden"
            name="accepts_cash"
            value={derivedAcceptsCash ? 'on' : ''}
          />
          <input
            type="hidden"
            name="accepts_transfer"
            value={derivedAcceptsTransfer ? 'on' : ''}
          />
          <label className="text-xs text-zinc-600 md:col-span-2">
            Datos de pago y notas del proveedor
            <textarea
              name="payment_note"
              defaultValue={paymentNote ?? ''}
              className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              rows={2}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
