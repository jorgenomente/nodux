'use client';

import { useState } from 'react';

type Notice = { tone: 'success' | 'error'; message: string } | null;

type EditPayload = {
  productId: string;
  name: string;
  internalCode: string;
  barcode: string;
  sellUnitType: 'unit' | 'weight' | 'bulk';
  uom: string;
  unitPrice: string;
  isActive: boolean;
  primarySupplierId: string;
  secondarySupplierId: string;
  shelfLifeDays: string;
  safetyStock: string;
};

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type Props = {
  productId: string;
  name: string;
  internalCode: string | null;
  barcode: string | null;
  sellUnitType: 'unit' | 'weight' | 'bulk';
  uom: string;
  unitPrice: number;
  isActive: boolean;
  shelfLifeDays: number | null;
  safetyStockValue: number | null;
  primarySupplierId: string;
  secondarySupplierId: string;
  suppliers: SupplierOption[];
  onSubmit: (formData: FormData) => void;
};

export default function ProductActions({
  productId,
  name,
  internalCode,
  barcode,
  sellUnitType,
  uom,
  unitPrice,
  isActive,
  shelfLifeDays,
  safetyStockValue,
  primarySupplierId,
  secondarySupplierId,
  suppliers,
  onSubmit,
}: Props) {
  const [notice, setNotice] = useState<Notice>(null);
  const [open, setOpen] = useState(false);
  const primaryOptions = suppliers.some(
    (supplier) => supplier.id === primarySupplierId,
  )
    ? suppliers
    : primarySupplierId
      ? [
          {
            id: primarySupplierId,
            name: 'Proveedor actual',
            is_active: true,
          },
          ...suppliers,
        ]
      : suppliers;
  const secondaryOptions = suppliers.some(
    (supplier) => supplier.id === secondarySupplierId,
  )
    ? suppliers
    : secondarySupplierId
      ? [
          {
            id: secondarySupplierId,
            name: 'Proveedor actual',
            is_active: true,
          },
          ...suppliers,
        ]
      : suppliers;

  const buildFormData = (payload: EditPayload) => {
    const formData = new FormData();
    formData.append('product_id', payload.productId);
    formData.append('edit_name', payload.name);
    formData.append('edit_internal_code', payload.internalCode);
    formData.append('edit_barcode', payload.barcode);
    formData.append('edit_sell_unit_type', payload.sellUnitType);
    formData.append('edit_uom', payload.uom);
    formData.append('edit_unit_price', payload.unitPrice);
    formData.append('is_active', String(payload.isActive));
    formData.append('primary_supplier_id', payload.primarySupplierId);
    formData.append('secondary_supplier_id', payload.secondarySupplierId);
    formData.append('edit_shelf_life_days', payload.shelfLifeDays);
    formData.append('edit_safety_stock', payload.safetyStock);
    return formData;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setNotice({ tone: 'success', message: 'Guardando cambios...' });
    onSubmit(formData);
  };

  const handleToggle = () => {
    setNotice({
      tone: 'success',
      message: isActive ? 'Desactivando producto...' : 'Activando producto...',
    });
    const formData = buildFormData({
      productId,
      name,
      internalCode: internalCode ?? '',
      barcode: barcode ?? '',
      sellUnitType,
      uom,
      unitPrice: String(unitPrice ?? 0),
      isActive: !isActive,
      primarySupplierId,
      secondarySupplierId,
      shelfLifeDays: shelfLifeDays == null ? '' : String(shelfLifeDays),
      safetyStock: safetyStockValue == null ? '' : String(safetyStockValue),
    });
    onSubmit(formData);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
        >
          {open ? 'Cerrar' : 'Editar'}
        </button>
        <button
          type="button"
          onClick={handleToggle}
          className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
        >
          {isActive ? 'Desactivar' : 'Activar'}
        </button>
      </div>
      {open ? (
        <form
          onSubmit={handleSubmit}
          className="grid gap-2 text-xs text-zinc-600 md:grid-cols-3"
        >
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="is_active" value={String(isActive)} />
          <label className="flex flex-col gap-1">
            Nombre
            <input
              name="edit_name"
              defaultValue={name}
              className="rounded border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            SKU
            <input
              name="edit_internal_code"
              defaultValue={internalCode ?? ''}
              className="rounded border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Barcode
            <input
              name="edit_barcode"
              defaultValue={barcode ?? ''}
              className="rounded border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Unidad
            <select
              name="edit_sell_unit_type"
              defaultValue={sellUnitType}
              className="rounded border border-zinc-200 px-2 py-1"
            >
              <option value="unit">Unidad</option>
              <option value="weight">Peso</option>
              <option value="bulk">Granel</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Unidad de medida
            <input
              name="edit_uom"
              defaultValue={uom}
              className="rounded border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Precio
            <input
              name="edit_unit_price"
              type="number"
              step="0.01"
              defaultValue={unitPrice ?? 0}
              className="rounded border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Vencimiento aprox (días)
            <input
              name="edit_shelf_life_days"
              type="number"
              step="1"
              min="0"
              defaultValue={shelfLifeDays ?? ''}
              className="rounded border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Stock minimo (global)
            <input
              name="edit_safety_stock"
              type="number"
              step="0.001"
              min="0"
              defaultValue={safetyStockValue ?? ''}
              className="rounded border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Proveedor primario
            <select
              name="primary_supplier_id"
              defaultValue={primarySupplierId}
              className="rounded border border-zinc-200 px-2 py-1"
            >
              <option value="">Sin proveedor</option>
              {primaryOptions.map((supplier) => (
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
          <label className="flex flex-col gap-1">
            Proveedor secundario
            <select
              name="secondary_supplier_id"
              defaultValue={secondarySupplierId}
              className="rounded border border-zinc-200 px-2 py-1"
            >
              <option value="">Sin proveedor</option>
              {secondaryOptions.map((supplier) => (
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
          <div className="flex flex-wrap items-center gap-2 md:col-span-3">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      ) : null}
      {notice ? (
        <div
          className={`rounded border px-3 py-2 text-xs ${
            notice.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {notice.message}
        </div>
      ) : null}
    </div>
  );
}
