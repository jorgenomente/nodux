'use client';

import { useState } from 'react';

import ProductFormFieldsShared from '@/app/products/ProductFormFieldsShared';

type Notice = { tone: 'success' | 'error'; message: string } | null;

type EditPayload = {
  productId: string;
  name: string;
  brand: string;
  internalCode: string;
  barcode: string;
  sellUnitType: 'unit' | 'weight' | 'bulk';
  uom: string;
  unitPrice: string;
  isActive: boolean;
  primarySupplierId: string;
  secondarySupplierId: string;
  primarySupplierSku: string;
  primarySupplierProductName: string;
  shelfLifeDays: string;
  safetyStock: string;
};

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
  default_markup_pct: number | null;
};

type Props = {
  productId: string;
  name: string;
  brand: string | null;
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
  primarySupplierSku: string;
  primarySupplierProductName: string;
  suppliers: SupplierOption[];
  brandSuggestions: string[];
  onSubmit: (formData: FormData) => void;
};

export default function ProductActions({
  productId,
  name,
  brand,
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
  primarySupplierSku,
  primarySupplierProductName,
  suppliers,
  brandSuggestions,
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
            default_markup_pct: 40,
          },
          ...suppliers,
        ]
      : suppliers;
  const buildFormData = (payload: EditPayload) => {
    const formData = new FormData();
    formData.append('product_id', payload.productId);
    formData.append('edit_name', payload.name);
    formData.append('edit_brand', payload.brand);
    formData.append('edit_internal_code', payload.internalCode);
    formData.append('edit_barcode', payload.barcode);
    formData.append('edit_sell_unit_type', payload.sellUnitType);
    formData.append('edit_uom', payload.uom);
    formData.append('edit_unit_price', payload.unitPrice);
    formData.append('is_active', String(payload.isActive));
    formData.append('primary_supplier_id', payload.primarySupplierId);
    formData.append('secondary_supplier_id', payload.secondarySupplierId);
    formData.append('primary_supplier_sku', payload.primarySupplierSku);
    formData.append(
      'primary_supplier_product_name',
      payload.primarySupplierProductName,
    );
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
      brand: brand ?? '',
      internalCode: internalCode ?? '',
      barcode: barcode ?? '',
      sellUnitType,
      uom,
      unitPrice: String(unitPrice ?? 0),
      isActive: !isActive,
      primarySupplierId,
      secondarySupplierId,
      primarySupplierSku,
      primarySupplierProductName,
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
          <ProductFormFieldsShared
            suppliers={primaryOptions}
            brandSuggestions={brandSuggestions}
            compact
            fields={{
              name: 'edit_name',
              brand: 'edit_brand',
              internalCode: 'edit_internal_code',
              barcode: 'edit_barcode',
              sellUnitType: 'edit_sell_unit_type',
              uom: 'edit_uom',
              primarySupplierId: 'primary_supplier_id',
              supplierPrice: 'edit_supplier_price',
              unitPrice: 'edit_unit_price',
              shelfLifeDays: 'edit_shelf_life_days',
              primarySupplierProductName: 'primary_supplier_product_name',
              primarySupplierSku: 'primary_supplier_sku',
              secondarySupplierId: 'secondary_supplier_id',
              safetyStock: 'edit_safety_stock',
            }}
            defaults={{
              name,
              brand: brand ?? '',
              internalCode: internalCode ?? '',
              barcode: barcode ?? '',
              sellUnitType,
              uom,
              primarySupplierId,
              unitPrice,
              shelfLifeDays: shelfLifeDays ?? '',
              primarySupplierProductName,
              primarySupplierSku,
              secondarySupplierId,
              safetyStock: safetyStockValue ?? '',
            }}
          />
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
