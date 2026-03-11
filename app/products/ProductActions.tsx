'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useDismissOnOutsideClick } from '@/app/components/useDismissOnOutsideClick';
import ProductFormFieldsShared from '@/app/products/ProductFormFieldsShared';

type Notice = { tone: 'success' | 'error'; message: string } | null;

type EditPayload = {
  productId: string;
  name: string;
  brand: string;
  categoryTags: string;
  internalCode: string;
  barcode: string;
  purchaseByPack: boolean;
  unitsPerPack: string;
  sellUnitType: 'unit' | 'weight' | 'bulk';
  uom: string;
  unitPrice: string;
  supplierPrice: string;
  isActive: boolean;
  primarySupplierId: string;
  secondarySupplierId: string;
  primarySupplierSku: string;
  primarySupplierProductName: string;
  shelfLifeDays: string;
  safetyStock: string;
  removeImage: boolean;
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
  categoryTags: string[] | null;
  internalCode: string | null;
  barcode: string | null;
  purchaseByPack: boolean;
  unitsPerPack: number | null;
  sellUnitType: 'unit' | 'weight' | 'bulk';
  uom: string;
  unitPrice: number;
  primarySupplierPrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  shelfLifeDays: number | null;
  safetyStockValue: number | null;
  primarySupplierId: string;
  secondarySupplierId: string;
  primarySupplierSku: string;
  primarySupplierProductName: string;
  suppliers: SupplierOption[];
  brandSuggestions: string[];
  onSubmit: (formData: FormData) => Promise<void>;
};

export default function ProductActions({
  productId,
  name,
  brand,
  categoryTags,
  internalCode,
  barcode,
  purchaseByPack,
  unitsPerPack,
  sellUnitType,
  uom,
  unitPrice,
  primarySupplierPrice,
  imageUrl,
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
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismissOnOutsideClick(containerRef, open, () => setOpen(false));
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
    formData.append('edit_category_tags', payload.categoryTags);
    formData.append('edit_internal_code', payload.internalCode);
    formData.append('edit_barcode', payload.barcode);
    if (payload.purchaseByPack) {
      formData.append('edit_purchase_by_pack', 'on');
    }
    formData.append('edit_units_per_pack', payload.unitsPerPack);
    formData.append('edit_sell_unit_type', payload.sellUnitType);
    formData.append('edit_uom', payload.uom);
    formData.append('edit_unit_price', payload.unitPrice);
    formData.append('edit_supplier_price', payload.supplierPrice);
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
    formData.append('remove_image', payload.removeImage ? 'true' : 'false');
    formData.append('edit_image_data_url', '');
    return formData;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setNotice({ tone: 'success', message: 'Guardando cambios...' });
    setIsSaving(true);
    try {
      await onSubmit(formData);
      router.refresh();
      setNotice({ tone: 'success', message: 'Cambios guardados.' });
      setOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios.';
      setNotice({
        tone: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async () => {
    if (isSaving) return;
    setNotice({
      tone: 'success',
      message: isActive ? 'Desactivando producto...' : 'Activando producto...',
    });
    setIsSaving(true);
    const formData = buildFormData({
      productId,
      name,
      brand: brand ?? '',
      categoryTags: (categoryTags ?? []).join(' '),
      internalCode: internalCode ?? '',
      barcode: barcode ?? '',
      purchaseByPack,
      unitsPerPack: unitsPerPack == null ? '' : String(unitsPerPack),
      sellUnitType,
      uom,
      unitPrice: String(unitPrice ?? 0),
      supplierPrice:
        primarySupplierPrice == null ? '' : String(primarySupplierPrice),
      isActive: !isActive,
      primarySupplierId,
      secondarySupplierId,
      primarySupplierSku,
      primarySupplierProductName,
      shelfLifeDays: shelfLifeDays == null ? '' : String(shelfLifeDays),
      safetyStock: safetyStockValue == null ? '' : String(safetyStockValue),
      removeImage: false,
    });
    try {
      await onSubmit(formData);
      router.refresh();
      setNotice({
        tone: 'success',
        message: isActive ? 'Producto desactivado.' : 'Producto activado.',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el estado del producto.';
      setNotice({
        tone: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          disabled={isSaving}
          className="rounded border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
        >
          {open ? 'Cerrar' : 'Editar'}
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isSaving}
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
              categoryTags: 'edit_category_tags',
              internalCode: 'edit_internal_code',
              barcode: 'edit_barcode',
              purchaseByPack: 'edit_purchase_by_pack',
              unitsPerPack: 'edit_units_per_pack',
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
              imageDataUrl: 'edit_image_data_url',
              removeImage: 'remove_image',
            }}
            defaults={{
              name,
              brand: brand ?? '',
              categoryTags: categoryTags ?? [],
              internalCode: internalCode ?? '',
              barcode: barcode ?? '',
              purchaseByPack,
              unitsPerPack: unitsPerPack ?? '',
              sellUnitType,
              uom,
              primarySupplierId,
              unitPrice,
              supplierPrice:
                primarySupplierPrice == null ? '' : primarySupplierPrice,
              shelfLifeDays: shelfLifeDays ?? '',
              primarySupplierProductName,
              primarySupplierSku,
              secondarySupplierId,
              safetyStock: safetyStockValue ?? '',
              imageUrl,
            }}
          />
          <div className="flex flex-wrap items-center gap-2 md:col-span-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
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
