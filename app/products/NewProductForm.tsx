'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import ProductFormFieldsShared from '@/app/products/ProductFormFieldsShared';

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
  default_markup_pct: number | null;
};

type Props = {
  suppliers: SupplierOption[];
  brandSuggestions: string[];
  productNameSuggestions?: Array<{
    product_id: string;
    name: string;
    brand?: string | null;
    barcode?: string | null;
    internal_code?: string | null;
    is_active?: boolean;
  }>;
  onSubmit: (formData: FormData) => Promise<void>;
  defaults?: {
    primarySupplierId?: string;
  };
  lockPrimarySupplier?: boolean;
};

export default function NewProductForm({
  suppliers,
  brandSuggestions,
  productNameSuggestions = [],
  onSubmit,
  defaults,
  lockPrimarySupplier = false,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNameDuplicate, setIsNameDuplicate] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [notice, setNotice] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isNameDuplicate || isSubmitting) return;
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setNotice({ tone: 'success', message: 'Guardando producto...' });
    try {
      await onSubmit(formData);
      setNotice({ tone: 'success', message: 'Producto guardado.' });
      setFormKey((prev) => prev + 1);
      setIsNameDuplicate(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el producto.';
      setNotice({ tone: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
      <ProductFormFieldsShared
        key={formKey}
        suppliers={suppliers}
        brandSuggestions={brandSuggestions}
        productNameSuggestions={productNameSuggestions}
        onNameDuplicateStateChange={setIsNameDuplicate}
        defaults={defaults}
        lockPrimarySupplier={lockPrimarySupplier}
        fields={{
          name: 'name',
          brand: 'brand',
          internalCode: 'internal_code',
          barcode: 'barcode',
          purchaseByPack: 'purchase_by_pack',
          unitsPerPack: 'units_per_pack',
          sellUnitType: 'sell_unit_type',
          uom: 'uom',
          primarySupplierId: 'primary_supplier_id',
          supplierPrice: 'supplier_price',
          unitPrice: 'unit_price',
          shelfLifeDays: 'shelf_life_days',
          primarySupplierProductName: 'primary_supplier_product_name',
          primarySupplierSku: 'primary_supplier_sku',
          secondarySupplierId: 'secondary_supplier_id',
          safetyStock: 'safety_stock',
          imageDataUrl: 'image_data_url',
          removeImage: 'remove_image',
        }}
      />
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting || isNameDuplicate}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {isSubmitting
            ? 'Guardando...'
            : isNameDuplicate
              ? 'Revisar duplicado'
              : 'Guardar producto'}
        </button>
      </div>
      {notice ? (
        <div
          className={`rounded border px-3 py-2 text-xs md:col-span-2 ${
            notice.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {notice.message}
        </div>
      ) : null}
    </form>
  );
}
