import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProductActions from '@/app/products/ProductActions';
import PageShell from '@/app/components/PageShell';

const sellUnitOptions = ['unit', 'weight', 'bulk'] as const;

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
};

type SupplierProductRow = {
  product_id: string;
  supplier_id: string;
  relation_type: 'primary' | 'secondary';
  suppliers?: { name: string | null } | null;
};

type SupplierByProduct = {
  primary?: SupplierOption;
  secondary?: SupplierOption;
};

type SafetyStockRow = {
  product_id: string | null;
  safety_stock: number | null;
  branches?: { name: string | null } | null;
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
    return 'Sin stock minimo.';
  }

  const parts = value.map(
    (item) => `${item.branch_name}: ${item.safety_stock}`,
  );
  return parts.length > 0 ? parts.join(' · ') : 'Sin stock minimo.';
};

export default async function ProductsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: membership } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.org_id || membership.role !== 'org_admin') {
    redirect('/no-access');
  }

  const [
    productsResult,
    branchesResult,
    suppliersResult,
    supplierProductsResult,
    safetyStockResult,
  ] = await Promise.all([
    supabase
      .from('v_products_admin')
      .select('*')
      .eq('org_id', membership.org_id)
      .order('name'),
    supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', membership.org_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('suppliers')
      .select('id, name, is_active')
      .eq('org_id', membership.org_id)
      .order('name'),
    supabase
      .from('supplier_products')
      .select('product_id, supplier_id, relation_type, suppliers(name)')
      .eq('org_id', membership.org_id),
    supabase
      .from('stock_items')
      .select('product_id, safety_stock, branches(name)')
      .eq('org_id', membership.org_id)
      .gt('safety_stock', 0),
  ]);

  const products = productsResult.data ?? [];
  const branches = branchesResult.data ?? [];
  const suppliers = (suppliersResult.data ?? []).filter(
    (supplier) => supplier.id && supplier.name,
  ) as SupplierOption[];

  const supplierLookup = new Map<string, SupplierOption>(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );

  const supplierByProduct = new Map<string, SupplierByProduct>();
  (supplierProductsResult.data as SupplierProductRow[] | null)?.forEach(
    (row) => {
      if (!row.product_id || !row.supplier_id) return;
      const current = supplierByProduct.get(row.product_id) ?? {};
      const lookup = supplierLookup.get(row.supplier_id);
      const supplierOption: SupplierOption = {
        id: row.supplier_id,
        name: lookup?.name ?? row.suppliers?.name ?? 'Proveedor',
        is_active: lookup?.is_active ?? true,
      };
      if (row.relation_type === 'primary') {
        current.primary = supplierOption;
      } else {
        current.secondary = supplierOption;
      }
      supplierByProduct.set(row.product_id, current);
    },
  );

  const safetyStockByProduct = new Map<string, SafetyStockByBranchItem[]>();
  (safetyStockResult.data as SafetyStockRow[] | null)?.forEach((row) => {
    if (!row.product_id) return;
    const list = safetyStockByProduct.get(row.product_id) ?? [];
    list.push({
      branch_name: row.branches?.name ?? 'Sucursal',
      safety_stock: Number(row.safety_stock ?? 0),
    });
    safetyStockByProduct.set(row.product_id, list);
  });

  const createProduct = async (formData: FormData): Promise<void> => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const name = String(formData.get('name') ?? '').trim();
    const internalCode = String(formData.get('internal_code') ?? '').trim();
    const barcode = String(formData.get('barcode') ?? '').trim();
    const sellUnitType = String(formData.get('sell_unit_type') ?? 'unit') as
      | 'unit'
      | 'weight'
      | 'bulk';
    const uom = String(formData.get('uom') ?? '').trim();
    const unitPriceRaw = String(formData.get('unit_price') ?? '0').trim();
    const shelfLifeRaw = String(formData.get('shelf_life_days') ?? '').trim();
    const primarySupplierId = String(
      formData.get('primary_supplier_id') ?? '',
    ).trim();
    const secondarySupplierId = String(
      formData.get('secondary_supplier_id') ?? '',
    ).trim();
    const safetyBranchId = String(
      formData.get('safety_branch_id') ?? '',
    ).trim();
    const safetyStockRaw = String(formData.get('safety_stock') ?? '').trim();

    if (!name) return;

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) return;
    const shelfLifeDays =
      shelfLifeRaw === '' ? null : Number.parseInt(shelfLifeRaw, 10);
    if (
      shelfLifeDays !== null &&
      (Number.isNaN(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      return;
    }

    const { data: userData } = await supabaseServer.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data: member } = await supabaseServer
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member?.org_id || member.role !== 'org_admin') return;

    const productId = randomUUID();

    await supabaseServer.rpc('rpc_upsert_product', {
      p_product_id: productId,
      p_org_id: member.org_id,
      p_name: name,
      p_internal_code: internalCode || '',
      p_barcode: barcode || '',
      p_sell_unit_type: sellUnitType,
      p_uom: uom || 'unit',
      p_unit_price: unitPrice,
      p_is_active: true,
      p_shelf_life_days: shelfLifeDays,
    });

    if (primarySupplierId) {
      await supabaseServer.rpc('rpc_upsert_supplier_product', {
        p_org_id: member.org_id,
        p_supplier_id: primarySupplierId,
        p_product_id: productId,
        p_supplier_sku: '',
        p_supplier_product_name: '',
        p_relation_type: 'primary',
      });
    }

    if (secondarySupplierId && secondarySupplierId !== primarySupplierId) {
      await supabaseServer.rpc('rpc_upsert_supplier_product', {
        p_org_id: member.org_id,
        p_supplier_id: secondarySupplierId,
        p_product_id: productId,
        p_supplier_sku: '',
        p_supplier_product_name: '',
        p_relation_type: 'secondary',
      });
    }

    if (safetyBranchId && safetyStockRaw !== '') {
      const safetyStock = Number(safetyStockRaw);
      if (!Number.isNaN(safetyStock) && safetyStock >= 0) {
        await supabaseServer.rpc('rpc_set_safety_stock', {
          p_org_id: member.org_id,
          p_branch_id: safetyBranchId,
          p_product_id: productId,
          p_safety_stock: safetyStock,
        });
      }
    }

    revalidatePath('/products');
  };

  const updateProduct = async (formData: FormData): Promise<void> => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();
    const name = String(formData.get('edit_name') ?? '').trim();
    const internalCode = String(
      formData.get('edit_internal_code') ?? '',
    ).trim();
    const barcode = String(formData.get('edit_barcode') ?? '').trim();
    const sellUnitType = String(
      formData.get('edit_sell_unit_type') ?? 'unit',
    ) as 'unit' | 'weight' | 'bulk';
    const uom = String(formData.get('edit_uom') ?? '').trim();
    const unitPriceRaw = String(formData.get('edit_unit_price') ?? '0').trim();
    const shelfLifeRaw = String(
      formData.get('edit_shelf_life_days') ?? '',
    ).trim();
    const isActive = formData.get('is_active') === 'true';
    const primarySupplierId = String(
      formData.get('primary_supplier_id') ?? '',
    ).trim();
    const secondarySupplierIdRaw = String(
      formData.get('secondary_supplier_id') ?? '',
    ).trim();

    if (!productId || !name) return;

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) return;
    const shelfLifeDays =
      shelfLifeRaw === '' ? null : Number.parseInt(shelfLifeRaw, 10);
    if (
      shelfLifeDays !== null &&
      (Number.isNaN(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      return;
    }

    const { data: userData } = await supabaseServer.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data: member } = await supabaseServer
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member?.org_id || member.role !== 'org_admin') return;

    await supabaseServer.rpc('rpc_upsert_product', {
      p_product_id: productId,
      p_org_id: member.org_id,
      p_name: name,
      p_internal_code: internalCode || '',
      p_barcode: barcode || '',
      p_sell_unit_type: sellUnitType,
      p_uom: uom || 'unit',
      p_unit_price: unitPrice,
      p_is_active: isActive,
      p_shelf_life_days: shelfLifeDays,
    });

    const secondarySupplierId =
      secondarySupplierIdRaw && secondarySupplierIdRaw !== primarySupplierId
        ? secondarySupplierIdRaw
        : '';

    if (primarySupplierId) {
      await supabaseServer.rpc('rpc_upsert_supplier_product', {
        p_org_id: member.org_id,
        p_supplier_id: primarySupplierId,
        p_product_id: productId,
        p_supplier_sku: '',
        p_supplier_product_name: '',
        p_relation_type: 'primary',
      });
    } else {
      await supabaseServer.rpc('rpc_remove_supplier_product_relation', {
        p_org_id: member.org_id,
        p_product_id: productId,
        p_relation_type: 'primary',
      });
    }

    if (secondarySupplierId) {
      await supabaseServer.rpc('rpc_upsert_supplier_product', {
        p_org_id: member.org_id,
        p_supplier_id: secondarySupplierId,
        p_product_id: productId,
        p_supplier_sku: '',
        p_supplier_product_name: '',
        p_relation_type: 'secondary',
      });
    } else {
      await supabaseServer.rpc('rpc_remove_supplier_product_relation', {
        p_org_id: member.org_id,
        p_product_id: productId,
        p_relation_type: 'secondary',
      });
    }

    revalidatePath('/products');
  };

  const adjustStock = async (formData: FormData): Promise<void> => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const quantityRaw = String(formData.get('new_quantity') ?? '0').trim();
    const reason = String(formData.get('reason') ?? '').trim();

    const newQuantity = Number(quantityRaw);
    if (!productId || !branchId) return;

    if (Number.isNaN(newQuantity)) return;

    const { data: userData } = await supabaseServer.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data: member } = await supabaseServer
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member?.org_id || member.role !== 'org_admin') return;

    await supabaseServer.rpc('rpc_adjust_stock_manual', {
      p_org_id: member.org_id,
      p_branch_id: branchId,
      p_product_id: productId,
      p_new_quantity_on_hand: newQuantity,
      p_reason: reason || 'manual',
    });

    revalidatePath('/products');
  };

  const setSafetyStock = async (formData: FormData): Promise<void> => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const productId = String(formData.get('product_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const safetyStockRaw = String(formData.get('safety_stock') ?? '').trim();

    if (!productId || !branchId || safetyStockRaw === '') return;

    const safetyStock = Number(safetyStockRaw);
    if (Number.isNaN(safetyStock) || safetyStock < 0) return;

    const { data: userData } = await supabaseServer.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data: member } = await supabaseServer
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member?.org_id || member.role !== 'org_admin') return;

    await supabaseServer.rpc('rpc_set_safety_stock', {
      p_org_id: member.org_id,
      p_branch_id: branchId,
      p_product_id: productId,
      p_safety_stock: safetyStock,
    });

    revalidatePath('/products');
  };

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-900">Productos</h1>
          <p className="text-sm text-zinc-500">
            Catalogo y stock por sucursal. Contrato: v_products_admin.
          </p>
        </header>

        <section className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Nuevo producto
          </h2>
          <form action={createProduct} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-zinc-700">
              Nombre
              <input
                name="name"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Codigo interno
              <input
                name="internal_code"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Barcode
              <input
                name="barcode"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Unidad de venta
              <select
                name="sell_unit_type"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                defaultValue="unit"
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
            <label className="text-sm font-medium text-zinc-700">
              Unidad de medida
              <input
                name="uom"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                defaultValue="unit"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Precio unitario
              <input
                name="unit_price"
                type="number"
                step="0.01"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                defaultValue="0"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Vencimiento aproximado (días)
              <input
                name="shelf_life_days"
                type="number"
                step="1"
                min="0"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Ej: 30"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Proveedor primario
              <select
                name="primary_supplier_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
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
            <label className="text-sm font-medium text-zinc-700">
              Proveedor secundario
              <select
                name="secondary_supplier_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
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
            <label className="text-sm font-medium text-zinc-700">
              Sucursal (stock minimo)
              <select
                name="safety_branch_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Sin stock minimo</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Stock minimo
              <input
                name="safety_stock"
                type="number"
                step="0.001"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Guardar producto
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Ajuste manual de stock
          </h2>
          <form action={adjustStock} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-zinc-700">
              Producto
              <select
                name="product_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Selecciona</option>
                {products
                  .filter((product) => Boolean(product.product_id))
                  .map((product) => (
                    <option
                      key={String(product.product_id)}
                      value={String(product.product_id)}
                    >
                      {product.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Sucursal
              <select
                name="branch_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Selecciona</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Nueva cantidad
              <input
                name="new_quantity"
                type="number"
                step="0.001"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                defaultValue="0"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Motivo
              <input
                name="reason"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Ajuste manual"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Ajustar stock
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Stock minimo por sucursal
          </h2>
          <form action={setSafetyStock} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-zinc-700">
              Producto
              <select
                name="product_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Selecciona</option>
                {products
                  .filter((product) => Boolean(product.product_id))
                  .map((product) => (
                    <option
                      key={String(product.product_id)}
                      value={String(product.product_id)}
                    >
                      {product.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Sucursal
              <select
                name="branch_id"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Selecciona</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Stock minimo
              <input
                name="safety_stock"
                type="number"
                step="0.001"
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                defaultValue="0"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Guardar stock minimo
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-zinc-900">Listado</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {products.length === 0 ? (
              <div className="px-6 py-8 text-sm text-zinc-500">
                No hay productos cargados.
              </div>
            ) : (
              products.map((product) => (
                <div key={product.product_id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {product.internal_code || 'Sin SKU'} ·{' '}
                          {product.barcode || 'Sin barcode'}
                        </p>
                      </div>
                      <div className="text-xs text-zinc-500">
                        Stock por sucursal:{' '}
                        {formatStockByBranch(product.stock_by_branch)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Vencimiento aprox:{' '}
                        {product.shelf_life_days ?? 'Sin definir'} días
                      </div>
                      <div className="text-xs text-zinc-500">
                        Stock minimo:{' '}
                        {formatSafetyStockByBranch(
                          safetyStockByProduct.get(String(product.product_id)),
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Proveedor:{' '}
                        {supplierByProduct.get(String(product.product_id))
                          ?.primary?.name ?? 'Sin proveedor'}
                        {' · '}
                        Secundario:{' '}
                        {supplierByProduct.get(String(product.product_id))
                          ?.secondary?.name ?? 'Sin proveedor'}
                      </div>
                      {product.product_id ? (
                        <ProductActions
                          productId={String(product.product_id)}
                          name={product.name ?? ''}
                          internalCode={product.internal_code ?? null}
                          barcode={product.barcode ?? null}
                          sellUnitType={
                            (product.sell_unit_type ?? 'unit') as
                              | 'unit'
                              | 'weight'
                              | 'bulk'
                          }
                          uom={product.uom ?? 'unit'}
                          unitPrice={Number(product.unit_price ?? 0)}
                          isActive={Boolean(product.is_active)}
                          shelfLifeDays={
                            product.shelf_life_days == null
                              ? null
                              : Number(product.shelf_life_days)
                          }
                          primarySupplierId={
                            supplierByProduct.get(String(product.product_id))
                              ?.primary?.id ?? ''
                          }
                          secondarySupplierId={
                            supplierByProduct.get(String(product.product_id))
                              ?.secondary?.id ?? ''
                          }
                          suppliers={suppliers}
                          onSubmit={updateProduct}
                        />
                      ) : null}
                    </div>
                    <div className="text-right text-sm text-zinc-600">
                      <div className="font-medium">
                        $
                        {product.unit_price?.toFixed?.(2) ?? product.unit_price}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {formatStockByBranch(product.stock_by_branch)}
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
      </div>
    </PageShell>
  );
}
