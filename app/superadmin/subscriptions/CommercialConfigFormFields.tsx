'use client';

import { useMemo, useState } from 'react';

type PricingMode = 'standard' | 'custom';
type DiscountMode = 'none' | 'percent' | 'fixed_amount';
type ServiceStatus = 'active' | 'grace' | 'suspended' | 'cancelled';

type CommercialConfigValues = {
  pricingMode: PricingMode;
  serviceStatus: ServiceStatus;
  basePriceMonthly: number;
  includedBranches: number;
  additionalBranchPriceMonthly: number;
  customMonthlyPrice: number | null;
  discountMode: DiscountMode;
  discountPercent: number | null;
  discountAmount: number | null;
  discountLabel: string;
  startedOn: string;
  renewsOn: string;
  cycleStartOn: string;
  cycleEndOn: string;
  cycleDueOn: string;
  graceUntil: string;
  customerNoteVisible: string;
  billingNotesInternal: string;
  autoBranchPricing: boolean;
  activeBranchCount: number;
  currencyCode: string;
};

type CommercialConfigFormFieldsProps = {
  values: CommercialConfigValues;
};

const formatCurrency = (value: number | null | undefined, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const discountModeLabel = (
  mode: DiscountMode,
  discountPercent: number | null,
  discountAmount: number | null,
  currencyCode: string,
) => {
  switch (mode) {
    case 'percent':
      return `${Number(discountPercent ?? 0)}%`;
    case 'fixed_amount':
      return formatCurrency(discountAmount, currencyCode);
    default:
      return 'Sin bonificacion';
  }
};

export default function CommercialConfigFormFields({
  values,
}: CommercialConfigFormFieldsProps) {
  const [pricingMode, setPricingMode] = useState<PricingMode>(
    values.pricingMode,
  );
  const [discountMode, setDiscountMode] = useState<DiscountMode>(
    values.discountMode,
  );
  const [basePrice, setBasePrice] = useState(String(values.basePriceMonthly));
  const [includedBranches, setIncludedBranches] = useState(
    String(values.includedBranches),
  );
  const [additionalBranchPrice, setAdditionalBranchPrice] = useState(
    String(values.additionalBranchPriceMonthly),
  );
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState(
    values.customMonthlyPrice == null ? '' : String(values.customMonthlyPrice),
  );
  const [discountPercent, setDiscountPercent] = useState(
    values.discountPercent == null ? '' : String(values.discountPercent),
  );
  const [discountAmount, setDiscountAmount] = useState(
    values.discountAmount == null ? '' : String(values.discountAmount),
  );
  const [discountLabel, setDiscountLabel] = useState(values.discountLabel);

  const preview = useMemo(() => {
    const base = Number(basePrice || 0);
    const included = Number(includedBranches || 0);
    const additional = Number(additionalBranchPrice || 0);
    const custom = Number(customMonthlyPrice || 0);
    const listPrice =
      pricingMode === 'custom'
        ? custom
        : base + Math.max(values.activeBranchCount - included, 0) * additional;
    const rawDiscount =
      discountMode === 'percent'
        ? listPrice * (Number(discountPercent || 0) / 100)
        : discountMode === 'fixed_amount'
          ? Number(discountAmount || 0)
          : 0;
    const discountApplied = Math.max(0, Math.min(listPrice, rawDiscount));
    const finalPrice = Math.max(0, listPrice - discountApplied);

    return {
      listPrice,
      discountApplied,
      finalPrice,
    };
  }, [
    additionalBranchPrice,
    basePrice,
    customMonthlyPrice,
    discountAmount,
    discountMode,
    discountPercent,
    includedBranches,
    pricingMode,
    values.activeBranchCount,
  ]);

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Lo que ve el cliente
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Vista resumida de precio lista, beneficio y total final.
            </p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Ahorra{' '}
            {formatCurrency(preview.discountApplied, values.currencyCode)}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Precio lista
            </p>
            <p className="mt-2 text-xl font-semibold text-zinc-900">
              {formatCurrency(preview.listPrice, values.currencyCode)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Bonificacion
            </p>
            <p className="mt-2 text-xl font-semibold text-emerald-700">
              -{formatCurrency(preview.discountApplied, values.currencyCode)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {discountLabel.trim() || 'Beneficio activo'} ·{' '}
              {discountModeLabel(
                discountMode,
                discountPercent === '' ? null : Number(discountPercent),
                discountAmount === '' ? null : Number(discountAmount),
                values.currencyCode,
              )}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-900 bg-zinc-900 p-4 text-white">
            <p className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">
              Total final
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(preview.finalPrice, values.currencyCode)}
            </p>
            <p className="mt-1 text-xs text-zinc-300">
              Este cliente paga{' '}
              {formatCurrency(preview.finalPrice, values.currencyCode)} de un
              precio lista de{' '}
              {formatCurrency(preview.listPrice, values.currencyCode)}.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Como se calcula</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Definí si el monto sale de la fórmula estándar o de un acuerdo manual.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1 text-sm text-zinc-700">
            Modo de pricing
            <select
              name="pricing_mode"
              value={pricingMode}
              onChange={(event) =>
                setPricingMode(event.target.value as PricingMode)
              }
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="standard">Standard</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Estado de servicio
            <select
              name="service_status"
              defaultValue={values.serviceStatus}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="active">active</option>
              <option value="grace">grace</option>
              <option value="suspended">suspended</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Precio base mensual
            <input
              type="number"
              name="base_price_monthly"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Sucursales incluidas
            <input
              type="number"
              name="included_branches"
              min="0"
              step="1"
              value={includedBranches}
              onChange={(event) => setIncludedBranches(event.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Adicional por sucursal
            <input
              type="number"
              name="additional_branch_price_monthly"
              min="0"
              step="0.01"
              value={additionalBranchPrice}
              onChange={(event) => setAdditionalBranchPrice(event.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          {pricingMode === 'custom' ? (
            <label className="grid gap-1 text-sm text-zinc-700">
              Precio custom mensual
              <input
                type="number"
                name="custom_monthly_price"
                min="0"
                step="0.01"
                value={customMonthlyPrice}
                onChange={(event) => setCustomMonthlyPrice(event.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          ) : (
            <input type="hidden" name="custom_monthly_price" value="" />
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-700 lg:col-span-2">
            <input
              type="checkbox"
              name="auto_branch_pricing"
              defaultChecked={values.autoBranchPricing}
            />
            Calcular precio segun sucursales activas
            <span className="text-xs text-zinc-500">
              Hoy la org tiene {values.activeBranchCount} sucursales activas.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Bonificacion</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Mostrá el beneficio de forma explícita para que la org vea cuánto
          ahorra.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1 text-sm text-zinc-700">
            Modo de bonificacion
            <select
              name="discount_mode"
              value={discountMode}
              onChange={(event) =>
                setDiscountMode(event.target.value as DiscountMode)
              }
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="none">Sin bonificacion</option>
              <option value="percent">Porcentaje</option>
              <option value="fixed_amount">Monto fijo</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Etiqueta visible
            <input
              type="text"
              name="discount_label"
              value={discountLabel}
              onChange={(event) => setDiscountLabel(event.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="Ej: Bonificacion cliente fundador"
            />
          </label>
          {discountMode === 'percent' ? (
            <label className="grid gap-1 text-sm text-zinc-700">
              Bonificacion %
              <input
                type="number"
                name="discount_percent"
                min="0"
                max="100"
                step="0.01"
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          ) : (
            <input type="hidden" name="discount_percent" value="" />
          )}
          {discountMode === 'fixed_amount' ? (
            <label className="grid gap-1 text-sm text-zinc-700">
              Bonificacion monto
              <input
                type="number"
                name="discount_amount"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          ) : (
            <input type="hidden" name="discount_amount" value="" />
          )}
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 lg:col-span-2">
            <p>
              <span className="font-semibold">Beneficio visible:</span>{' '}
              {discountLabel.trim() || 'Bonificacion'} ·{' '}
              {discountModeLabel(
                discountMode,
                discountPercent === '' ? null : Number(discountPercent),
                discountAmount === '' ? null : Number(discountAmount),
                values.currencyCode,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          Vigencia y ciclo
        </h3>
        <p className="mt-1 text-sm text-zinc-600">
          Separá lo contractual de la operación mensual para evitar errores.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1 text-sm text-zinc-700">
            Inicio de plan
            <input
              type="date"
              name="started_on"
              defaultValue={values.startedOn}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Renovacion
            <input
              type="date"
              name="renews_on"
              defaultValue={values.renewsOn}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Inicio ciclo actual
            <input
              type="date"
              name="cycle_start_on"
              defaultValue={values.cycleStartOn}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Fin ciclo actual
            <input
              type="date"
              name="cycle_end_on"
              defaultValue={values.cycleEndOn}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Vencimiento ciclo
            <input
              type="date"
              name="cycle_due_on"
              defaultValue={values.cycleDueOn}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Gracia hasta
            <input
              type="date"
              name="grace_until"
              defaultValue={values.graceUntil}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Notas</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Separá lo que ve el cliente de la referencia interna del equipo.
        </p>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm text-zinc-700">
            Nota visible al cliente
            <textarea
              name="customer_note_visible"
              rows={2}
              className="rounded-lg border border-zinc-300 px-3 py-2"
              defaultValue={values.customerNoteVisible}
            />
          </label>
          <label className="grid gap-1 text-sm text-zinc-700">
            Nota interna
            <textarea
              name="billing_notes_internal"
              rows={2}
              className="rounded-lg border border-zinc-300 px-3 py-2"
              defaultValue={values.billingNotesInternal}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
