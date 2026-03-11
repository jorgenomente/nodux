'use client';

import Image from 'next/image';

import ProductActions from '@/app/products/ProductActions';

type StockByBranchItem = {
  branch_id: string;
  branch_name: string;
  quantity_on_hand: number;
};

type SafetyStockByBranchItem = {
  branch_name: string;
  safety_stock: number;
};

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
  default_markup_pct: number | null;
};

type SupplierByProductEntry = {
  primary?: SupplierOption & {
    supplier_sku?: string | null;
    supplier_product_name?: string | null;
    supplier_price?: number | null;
  };
  secondary?: SupplierOption;
};

type ProductRow = {
  product_id: string | null;
  name: string | null;
  brand?: string | null;
  internal_code: string | null;
  barcode: string | null;
  purchase_by_pack?: boolean | null;
  units_per_pack?: number | null;
  sell_unit_type: 'unit' | 'weight' | 'bulk' | null;
  uom: string | null;
  unit_price: number | null;
  image_url: string | null;
  is_active: boolean | null;
  shelf_life_days: number | null;
  stock_total: number | null;
  stock_by_branch: unknown;
};

type Props = {
  products: ProductRow[];
  suppliers: SupplierOption[];
  brandSuggestions: string[];
  supplierByProduct: Record<string, SupplierByProductEntry>;
  safetyStockGlobalByProduct: Record<string, number | null>;
  safetyStockByProduct: Record<string, SafetyStockByBranchItem[] | undefined>;
  canEdit: boolean;
  onUpdate: (formData: FormData) => Promise<void>;
};

const formatStockByBranch = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    return 'Sin detalle por sucursal.';
  }

  const parts = value
    .filter((item) =>
      Boolean(item && typeof item === 'object' && 'branch_name' in item),
    )
    .map((item) => {
      const entry = item as StockByBranchItem;
      return `${entry.branch_name}: ${entry.quantity_on_hand}`;
    });

  return parts.length > 0 ? parts.join(' · ') : 'Sin detalle por sucursal.';
};

const formatSafetyStockByBranch = (
  value: SafetyStockByBranchItem[] | undefined,
) => {
  if (!value || value.length === 0) {
    return 'Sin cantidad de resguardo.';
  }

  const parts = value.map(
    (item) => `${item.branch_name}: ${item.safety_stock}`,
  );
  return parts.length > 0 ? parts.join(' · ') : 'Sin cantidad de resguardo.';
};

export default function ProductListClient({
  products,
  suppliers,
  brandSuggestions,
  supplierByProduct,
  safetyStockGlobalByProduct,
  safetyStockByProduct,
  canEdit,
  onUpdate,
}: Props) {
  const formatSafetyStockDisplay = (productId: string) => {
    const globalValue = safetyStockGlobalByProduct[productId];
    if (globalValue != null) {
      return String(globalValue);
    }
    return formatSafetyStockByBranch(safetyStockByProduct[productId]);
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Listado</h2>
      </div>
      <div className="divide-y divide-zinc-100">
        {products.length === 0 ? (
          <div className="px-6 py-8 text-sm text-zinc-500">
            No hay productos para este filtro/página.
          </div>
        ) : (
          products.map((product) => (
            <div key={product.product_id ?? product.name} className="px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="w-fit rounded border border-zinc-200 p-1">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name ?? 'Producto'}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-16 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-zinc-100 text-[10px] font-semibold text-zinc-500 uppercase">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      SKU: {product.internal_code || 'Sin SKU'} · Barcode:{' '}
                      {product.barcode || 'Sin barcode'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Compra proveedor:{' '}
                      {product.purchase_by_pack
                        ? `Paquete x ${product.units_per_pack ?? '?'}`
                        : 'Por unidad'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Marca: {product.brand || 'Sin marca'}
                    </p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Vencimiento aprox:{' '}
                    {product.shelf_life_days ?? 'Sin definir'} días
                  </div>
                  <div className="text-xs text-zinc-500">
                    Cantidad de resguardo:{' '}
                    {product.product_id
                      ? formatSafetyStockDisplay(String(product.product_id))
                      : 'Sin cantidad de resguardo.'}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Proveedor:{' '}
                    {supplierByProduct[String(product.product_id)]?.primary
                      ?.name ?? 'Sin proveedor'}
                    {' · '}
                    Secundario:{' '}
                    {supplierByProduct[String(product.product_id)]?.secondary
                      ?.name ?? 'Sin proveedor'}
                  </div>
                  {product.product_id && canEdit ? (
                    <ProductActions
                      productId={String(product.product_id)}
                      name={product.name ?? ''}
                      brand={product.brand ?? ''}
                      internalCode={product.internal_code ?? null}
                      barcode={product.barcode ?? null}
                      purchaseByPack={Boolean(product.purchase_by_pack)}
                      unitsPerPack={
                        product.units_per_pack == null
                          ? null
                          : Number(product.units_per_pack)
                      }
                      sellUnitType={
                        (product.sell_unit_type ?? 'unit') as
                          | 'unit'
                          | 'weight'
                          | 'bulk'
                      }
                      uom={product.uom ?? 'unit'}
                      unitPrice={Number(product.unit_price ?? 0)}
                      primarySupplierPrice={
                        supplierByProduct[String(product.product_id)]?.primary
                          ?.supplier_price ?? null
                      }
                      imageUrl={product.image_url ?? null}
                      isActive={Boolean(product.is_active)}
                      shelfLifeDays={
                        product.shelf_life_days == null
                          ? null
                          : Number(product.shelf_life_days)
                      }
                      safetyStockValue={
                        safetyStockGlobalByProduct[
                          String(product.product_id)
                        ] ?? null
                      }
                      primarySupplierId={
                        supplierByProduct[String(product.product_id)]?.primary
                          ?.id ?? ''
                      }
                      secondarySupplierId={
                        supplierByProduct[String(product.product_id)]?.secondary
                          ?.id ?? ''
                      }
                      primarySupplierSku={
                        supplierByProduct[String(product.product_id)]?.primary
                          ?.supplier_sku ?? ''
                      }
                      primarySupplierProductName={
                        supplierByProduct[String(product.product_id)]?.primary
                          ?.supplier_product_name ?? ''
                      }
                      suppliers={suppliers}
                      brandSuggestions={brandSuggestions}
                      onSubmit={onUpdate}
                    />
                  ) : null}
                </div>
                <div className="text-right text-sm text-zinc-600">
                  <div className="font-medium">
                    ${product.unit_price?.toFixed?.(2) ?? product.unit_price}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Stock: {formatStockByBranch(product.stock_by_branch)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Stock total: {product.stock_total}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Estado: {product.is_active ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
