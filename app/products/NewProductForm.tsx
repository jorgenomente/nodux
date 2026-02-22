'use client';

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
  onSubmit: (formData: FormData) => Promise<void>;
};

export default function NewProductForm({
  suppliers,
  brandSuggestions,
  onSubmit,
}: Props) {
  return (
    <form action={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
      <ProductFormFieldsShared
        suppliers={suppliers}
        brandSuggestions={brandSuggestions}
        fields={{
          name: 'name',
          brand: 'brand',
          internalCode: 'internal_code',
          barcode: 'barcode',
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
        }}
      />
      <div className="md:col-span-2">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Guardar producto
        </button>
      </div>
    </form>
  );
}
