type Option = {
  value: string;
  label: string;
};

type Props = {
  orderFrequencyOptions: ReadonlyArray<Option>;
  weekdayOptions: ReadonlyArray<Option>;
};

export default function SupplierCreateFormFields({
  orderFrequencyOptions,
  weekdayOptions,
}: Props) {
  return (
    <>
      <label className="text-sm text-zinc-600">
        Nombre
        <input
          name="name"
          required
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-zinc-600">
        Persona de contacto
        <input
          name="contact_name"
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-zinc-600">
        Teléfono
        <input
          name="phone"
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-zinc-600">
        Email
        <input
          name="email"
          type="email"
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-zinc-600 md:col-span-2">
        Notas
        <textarea
          name="notes"
          rows={2}
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-zinc-600">
        Frecuencia
        <select
          name="order_frequency"
          defaultValue=""
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-zinc-600">
        % de ganancia deseado
        <input
          name="default_markup_pct"
          type="number"
          min={0}
          step="0.01"
          defaultValue="40"
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-zinc-600">
        Método de pago preferido
        <select
          name="preferred_payment_method"
          defaultValue=""
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
    </>
  );
}
