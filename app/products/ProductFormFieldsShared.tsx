'use client';

import { useId, useMemo, useState } from 'react';

import AmountInputAR from '@/app/components/AmountInputAR';
import { PRODUCT_FORM_LABELS } from '@/app/products/product-form-contract';

const sellUnitOptions = ['unit', 'weight', 'bulk'] as const;

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
  default_markup_pct: number | null;
};

type FieldNameMap = {
  name: string;
  brand: string;
  internalCode: string;
  barcode: string;
  sellUnitType: string;
  uom: string;
  primarySupplierId: string;
  supplierPrice: string;
  unitPrice: string;
  shelfLifeDays: string;
  primarySupplierProductName: string;
  primarySupplierSku: string;
  secondarySupplierId: string;
  safetyStock: string;
};

type DefaultValueMap = {
  name?: string;
  brand?: string;
  internalCode?: string;
  barcode?: string;
  sellUnitType?: 'unit' | 'weight' | 'bulk';
  uom?: string;
  primarySupplierId?: string;
  supplierPrice?: number | string;
  unitPrice?: number | string;
  shelfLifeDays?: number | string;
  primarySupplierProductName?: string;
  primarySupplierSku?: string;
  secondarySupplierId?: string;
  safetyStock?: number | string;
};

type Props = {
  suppliers: SupplierOption[];
  brandSuggestions?: string[];
  fields: FieldNameMap;
  defaults?: DefaultValueMap;
  compact?: boolean;
  includeHelper?: boolean;
  lockPrimarySupplier?: boolean;
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function ProductFormFieldsShared({
  suppliers,
  brandSuggestions = [],
  fields,
  defaults,
  compact = false,
  includeHelper = true,
  lockPrimarySupplier = false,
}: Props) {
  const brandSuggestionsListId = useId();
  const [primarySupplierId, setPrimarySupplierId] = useState(
    defaults?.primarySupplierId ?? '',
  );
  const [supplierPrice, setSupplierPrice] = useState<number | null>(null);
  const initialShelfLife = String(defaults?.shelfLifeDays ?? '').trim();
  const [shelfLifeNoApplies, setShelfLifeNoApplies] = useState(
    initialShelfLife === '0',
  );
  const [shelfLifeValue, setShelfLifeValue] = useState(
    initialShelfLife === '0' ? '' : initialShelfLife,
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === primarySupplierId),
    [primarySupplierId, suppliers],
  );
  const markupPct = Number(selectedSupplier?.default_markup_pct ?? 40);
  const suggestedUnitPrice =
    supplierPrice != null && !Number.isNaN(supplierPrice) && supplierPrice > 0
      ? supplierPrice * (1 + markupPct / 100)
      : null;
  const helperText =
    suggestedUnitPrice == null
      ? `Sugerencia: completa "Precio proveedor" para calcular el precio unitario recomendado (${markupPct}% de ganancia).`
      : `Sugerido para precio unitario: $${currencyFormatter.format(
          suggestedUnitPrice,
        )} (${markupPct}% sobre precio proveedor).`;

  const labelClass = compact
    ? 'text-xs text-zinc-600'
    : 'text-sm font-medium text-zinc-700';
  const inputClass = compact
    ? 'mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm'
    : 'mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm';

  return (
    <>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.productName}
        <input
          name={fields.name}
          defaultValue={defaults?.name ?? ''}
          required
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.brand}
        <input
          name={fields.brand}
          defaultValue={defaults?.brand ?? ''}
          className={inputClass}
          placeholder="Ej: Arcor"
          list={brandSuggestionsListId}
        />
        {brandSuggestions.length > 0 ? (
          <datalist id={brandSuggestionsListId}>
            {brandSuggestions.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        ) : null}
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.internalCode}
        <input
          name={fields.internalCode}
          defaultValue={defaults?.internalCode ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.barcode}
        <input
          name={fields.barcode}
          defaultValue={defaults?.barcode ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.sellUnitType}
        <select
          name={fields.sellUnitType}
          defaultValue={defaults?.sellUnitType ?? 'unit'}
          className={inputClass}
        >
          {sellUnitOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'unit'
                ? 'Unidad'
                : option === 'weight'
                  ? 'Peso'
                  : 'Granel'}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.uom}
        <input
          name={fields.uom}
          defaultValue={defaults?.uom ?? 'unit'}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.primarySupplier}
        <select
          name={fields.primarySupplierId}
          value={primarySupplierId}
          onChange={(event) => setPrimarySupplierId(event.target.value)}
          className={inputClass}
          disabled={lockPrimarySupplier}
        >
          <option value="">Sin proveedor</option>
          {suppliers.map((supplier) => (
            <option
              key={supplier.id}
              value={supplier.id}
              disabled={!supplier.is_active}
            >
              {supplier.name}
              {supplier.is_active ? '' : ' (Inactivo)'}
            </option>
          ))}
        </select>
        {lockPrimarySupplier ? (
          <input
            type="hidden"
            name={fields.primarySupplierId}
            value={primarySupplierId}
          />
        ) : null}
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.supplierPrice}
        <AmountInputAR
          name={fields.supplierPrice}
          className={inputClass}
          onValueChange={setSupplierPrice}
          defaultValue={defaults?.supplierPrice ?? ''}
          placeholder="0"
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.unitPrice}
        <AmountInputAR
          name={fields.unitPrice}
          className={inputClass}
          defaultValue={defaults?.unitPrice ?? 0}
        />
        {includeHelper ? (
          <span className="mt-2 block text-xs text-zinc-500" title={helperText}>
            {helperText}
          </span>
        ) : null}
      </label>
      <div className={labelClass}>
        <span>{PRODUCT_FORM_LABELS.shelfLifeDays}</span>
        <input
          name={shelfLifeNoApplies ? undefined : fields.shelfLifeDays}
          type="number"
          step="1"
          min="0"
          value={shelfLifeNoApplies ? '' : shelfLifeValue}
          onChange={(event) => setShelfLifeValue(event.target.value)}
          disabled={shelfLifeNoApplies}
          className={inputClass}
          placeholder="Ej: 30"
        />
        {shelfLifeNoApplies ? (
          <input type="hidden" name={fields.shelfLifeDays} value="0" />
        ) : null}
        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={shelfLifeNoApplies}
            onChange={(event) => {
              const checked = event.target.checked;
              setShelfLifeNoApplies(checked);
              if (checked) {
                setShelfLifeValue('');
              }
            }}
          />
          No aplica vencimiento (guarda 0; en blanco o 0 no genera lotes
          automáticos)
        </label>
      </div>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.supplierProductName}
        <input
          name={fields.primarySupplierProductName}
          defaultValue={defaults?.primarySupplierProductName ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.supplierSku}
        <input
          name={fields.primarySupplierSku}
          defaultValue={defaults?.primarySupplierSku ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.secondarySupplier}
        <select
          name={fields.secondarySupplierId}
          defaultValue={defaults?.secondarySupplierId ?? ''}
          className={inputClass}
        >
          <option value="">Sin proveedor</option>
          {suppliers.map((supplier) => (
            <option
              key={supplier.id}
              value={supplier.id}
              disabled={!supplier.is_active}
            >
              {supplier.name}
              {supplier.is_active ? '' : ' (Inactivo)'}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {PRODUCT_FORM_LABELS.safetyStock}
        <input
          name={fields.safetyStock}
          type="number"
          step="0.001"
          min="0"
          defaultValue={defaults?.safetyStock ?? ''}
          className={inputClass}
          placeholder="0"
        />
        {!compact ? (
          <span className="mt-2 block text-xs text-zinc-400">
            Cantidad minima sugerida para evitar quiebres. Se aplica a todas las
            sucursales y se usa en sugerencias de compra.
          </span>
        ) : null}
      </label>
    </>
  );
}
