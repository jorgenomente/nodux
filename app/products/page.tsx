import { randomUUID } from 'crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import NewProductForm from '@/app/products/NewProductForm';
import ProductListFilters from '@/app/products/ProductListFilters';
import ProductListClient from '@/app/products/ProductListClient';
import PageShell from '@/app/components/PageShell';
import { getOrgAdminSession } from '@/lib/auth/org-session';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
  default_markup_pct: number | null;
};

type SupplierProductRow = {
  product_id: string;
  supplier_id: string;
  relation_type: 'primary' | 'secondary';
  supplier_price: number | null;
  supplier_sku: string | null;
  supplier_product_name: string | null;
  suppliers?: { name: string | null } | null;
};

type SupplierByProduct = {
  primary?: SupplierOption & {
    supplier_price?: number | null;
    supplier_sku?: string | null;
    supplier_product_name?: string | null;
  };
  secondary?: SupplierOption;
};

type SafetyStockRow = {
  product_id: string | null;
  safety_stock: number | null;
  branches?: { name: string | null } | null;
};

type SearchParams = {
  q?: string;
  page?: string;
  page_size?: string;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getOrgAdminSession();
  if (!session) {
    redirect('/login');
  }

  if (!session.orgId) {
    redirect('/no-access');
  }
  const supabase = session.supabase;
  const orgId = session.orgId;
  const query = String(resolvedSearchParams.q ?? '').trim();
  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 5);
  const requestedPageSize = Number.parseInt(
    String(resolvedSearchParams.page_size ?? '20'),
    10,
  );
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedPageSize
    : 20;
  const requestedPage = Number.parseInt(
    String(resolvedSearchParams.page ?? '1'),
    10,
  );
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

  let productsCountQuery = supabase
    .from('v_products_admin')
    .select('product_id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  let productsRowsQuery = supabase
    .from('v_products_admin')
    .select('*')
    .eq('org_id', orgId)
    .order('name');

  tokens.forEach((token) => {
    productsCountQuery = productsCountQuery.ilike('name', `%${token}%`);
    productsRowsQuery = productsRowsQuery.ilike('name', `%${token}%`);
  });

  const productsCountResult = await productsCountQuery;
  const totalProducts = Number(productsCountResult.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageFrom = (currentPage - 1) * pageSize;
  const pageTo = pageFrom + pageSize - 1;

  const { data: productsRows } = await productsRowsQuery.range(
    pageFrom,
    pageTo,
  );
  const products = productsRows ?? [];
  const productIds = products
    .map((product) =>
      String((product as { product_id?: string }).product_id ?? ''),
    )
    .filter(Boolean);

  const [
    branchesResult,
    suppliersResult,
    supplierProductsResult,
    safetyStockResult,
    productsForAdjust,
    brandsForSuggestions,
  ] = await Promise.all([
    supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('suppliers' as never)
      .select('id, name, is_active, default_markup_pct')
      .eq('org_id', orgId)
      .order('name'),
    productIds.length === 0
      ? Promise.resolve({ data: [] as SupplierProductRow[] })
      : supabase
          .from('supplier_products' as never)
          .select(
            'product_id, supplier_id, relation_type, supplier_price, supplier_sku, supplier_product_name, suppliers(name)',
          )
          .eq('org_id', orgId)
          .in('product_id', productIds),
    productIds.length === 0
      ? Promise.resolve({ data: [] as SafetyStockRow[] })
      : supabase
          .from('stock_items')
          .select('product_id, safety_stock, branches(name)')
          .eq('org_id', orgId)
          .gt('safety_stock', 0)
          .in('product_id', productIds),
    fetchAllPages(
      (from, to) =>
        supabase
          .from('products' as never)
          .select('id, name')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('name')
          .range(from, to),
      { label: 'products_page_products_for_adjust' },
    ),
    fetchAllPages(
      (from, to) =>
        supabase
          .from('products' as never)
          .select('brand')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .not('brand', 'is', null)
          .range(from, to),
      { label: 'products_page_brands' },
    ),
  ]);

  const branches = branchesResult.data ?? [];
  const suppliers = ((suppliersResult.data ?? []) as SupplierOption[]).filter(
    (supplier) => supplier.id && supplier.name,
  );
  const brandSuggestions = Array.from(
    new Set(
      brandsForSuggestions
        .map((product) =>
          String((product as { brand?: string | null }).brand ?? '').trim(),
        )
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

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
        default_markup_pct: lookup?.default_markup_pct ?? 40,
      };
      if (row.relation_type === 'primary') {
        current.primary = {
          ...supplierOption,
          supplier_price: row.supplier_price,
          supplier_sku: row.supplier_sku,
          supplier_product_name: row.supplier_product_name,
        };
      } else {
        current.secondary = supplierOption;
      }
      supplierByProduct.set(row.product_id, current);
    },
  );

  const safetyStockByProduct = new Map<
    string,
    { branch_name: string; safety_stock: number }[]
  >();
  (safetyStockResult.data as SafetyStockRow[] | null)?.forEach((row) => {
    if (!row.product_id) return;
    const list = safetyStockByProduct.get(row.product_id) ?? [];
    list.push({
      branch_name: row.branches?.name ?? 'Sucursal',
      safety_stock: Number(row.safety_stock ?? 0),
    });
    safetyStockByProduct.set(row.product_id, list);
  });

  const safetyStockGlobalByProduct = new Map<string, number | null>();
  safetyStockByProduct.forEach((items, productId) => {
    if (!items || items.length === 0) {
      safetyStockGlobalByProduct.set(productId, null);
      return;
    }
    const firstValue = items[0]?.safety_stock ?? 0;
    const allSame = items.every((item) => item.safety_stock === firstValue);
    safetyStockGlobalByProduct.set(productId, allSame ? firstValue : null);
  });

  const supplierByProductRecord: Record<string, SupplierByProduct> = {};
  supplierByProduct.forEach((value, key) => {
    supplierByProductRecord[key] = value;
  });
  const safetyStockGlobalRecord: Record<string, number | null> = {};
  safetyStockGlobalByProduct.forEach((value, key) => {
    safetyStockGlobalRecord[key] = value;
  });
  const safetyStockByProductRecord: Record<
    string,
    { branch_name: string; safety_stock: number }[] | undefined
  > = {};
  safetyStockByProduct.forEach((value, key) => {
    safetyStockByProductRecord[key] = value;
  });

  const createProduct = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const name = String(formData.get('name') ?? '').trim();
    const brand = String(formData.get('brand') ?? '').trim();
    const internalCode = String(formData.get('internal_code') ?? '').trim();
    const barcode = String(formData.get('barcode') ?? '').trim();
    const sellUnitType = String(formData.get('sell_unit_type') ?? 'unit') as
      | 'unit'
      | 'weight'
      | 'bulk';
    const uom = String(formData.get('uom') ?? '').trim();
    const unitPriceRaw = String(formData.get('unit_price') ?? '0').trim();
    const supplierPriceRaw = String(
      formData.get('supplier_price') ?? '',
    ).trim();
    const shelfLifeRaw = String(formData.get('shelf_life_days') ?? '').trim();
    const primarySupplierId = String(
      formData.get('primary_supplier_id') ?? '',
    ).trim();
    const primarySupplierSku = String(
      formData.get('primary_supplier_sku') ?? '',
    ).trim();
    const primarySupplierProductName = String(
      formData.get('primary_supplier_product_name') ?? '',
    ).trim();
    const secondarySupplierId = String(
      formData.get('secondary_supplier_id') ?? '',
    ).trim();
    const safetyStockRaw = String(formData.get('safety_stock') ?? '').trim();

    if (!name) return;

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) return;
    if (supplierPriceRaw !== '') {
      const supplierPrice = Number(supplierPriceRaw);
      if (Number.isNaN(supplierPrice) || supplierPrice < 0) return;
    }
    const shelfLifeDays =
      shelfLifeRaw === '' ? null : Number.parseInt(shelfLifeRaw, 10);
    if (
      shelfLifeDays !== null &&
      (Number.isNaN(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      return;
    }

    const orgId = actionSession.orgId;

    const productId = randomUUID();

    await supabaseServer.rpc('rpc_upsert_product', {
      p_product_id: productId,
      p_org_id: orgId,
      p_name: name,
      p_internal_code: internalCode || '',
      p_barcode: barcode || '',
      p_sell_unit_type: sellUnitType,
      p_uom: uom || 'unit',
      p_unit_price: unitPrice,
      p_is_active: true,
      p_shelf_life_days: shelfLifeDays,
    });
    await supabaseServer
      .from('products' as never)
      .update({ brand: brand || null } as never)
      .eq('org_id', orgId)
      .eq('id', productId);

    if (primarySupplierId) {
      await supabaseServer.rpc('rpc_upsert_supplier_product', {
        p_org_id: orgId,
        p_supplier_id: primarySupplierId,
        p_product_id: productId,
        p_supplier_sku: primarySupplierSku,
        p_supplier_product_name: primarySupplierProductName,
        p_relation_type: 'primary',
        p_supplier_price:
          supplierPriceRaw === '' ? null : Number(supplierPriceRaw),
      });
    }

    if (secondarySupplierId && secondarySupplierId !== primarySupplierId) {
      await supabaseServer.rpc('rpc_upsert_supplier_product', {
        p_org_id: orgId,
        p_supplier_id: secondarySupplierId,
        p_product_id: productId,
        p_supplier_sku: '',
        p_supplier_product_name: '',
        p_relation_type: 'secondary',
        p_supplier_price: null,
      });
    }

    if (safetyStockRaw !== '') {
      const safetyStock = Number(safetyStockRaw);
      if (!Number.isNaN(safetyStock) && safetyStock >= 0) {
        const { data: activeBranches } = await supabaseServer
          .from('branches')
          .select('id')
          .eq('org_id', orgId)
          .eq('is_active', true);

        await Promise.all(
          (activeBranches ?? []).map((branch) =>
            supabaseServer.rpc('rpc_set_safety_stock', {
              p_org_id: orgId,
              p_branch_id: branch.id,
              p_product_id: productId,
              p_safety_stock: safetyStock,
            }),
          ),
        );
      }
    }

    revalidatePath('/products');
  };

  const updateProduct = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const productId = String(formData.get('product_id') ?? '').trim();
    const name = String(formData.get('edit_name') ?? '').trim();
    const brand = String(formData.get('edit_brand') ?? '').trim();
    const internalCode = String(
      formData.get('edit_internal_code') ?? '',
    ).trim();
    const barcode = String(formData.get('edit_barcode') ?? '').trim();
    const sellUnitType = String(
      formData.get('edit_sell_unit_type') ?? 'unit',
    ) as 'unit' | 'weight' | 'bulk';
    const uom = String(formData.get('edit_uom') ?? '').trim();
    const unitPriceRaw = String(formData.get('edit_unit_price') ?? '0').trim();
    const supplierPriceRaw = String(
      formData.get('edit_supplier_price') ?? '',
    ).trim();
    const shelfLifeRaw = String(
      formData.get('edit_shelf_life_days') ?? '',
    ).trim();
    const safetyStockRaw = String(
      formData.get('edit_safety_stock') ?? '',
    ).trim();
    const isActive = formData.get('is_active') === 'true';
    const primarySupplierId = String(
      formData.get('primary_supplier_id') ?? '',
    ).trim();
    const secondarySupplierIdRaw = String(
      formData.get('secondary_supplier_id') ?? '',
    ).trim();
    const primarySupplierSku = String(
      formData.get('primary_supplier_sku') ?? '',
    ).trim();
    const primarySupplierProductName = String(
      formData.get('primary_supplier_product_name') ?? '',
    ).trim();

    if (!productId || !name) return;

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) return;
    if (supplierPriceRaw !== '') {
      const supplierPrice = Number(supplierPriceRaw);
      if (Number.isNaN(supplierPrice) || supplierPrice < 0) return;
    }
    const shelfLifeDays =
      shelfLifeRaw === '' ? null : Number.parseInt(shelfLifeRaw, 10);
    if (
      shelfLifeDays !== null &&
      (Number.isNaN(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      return;
    }

    await supabaseServer.rpc('rpc_upsert_product', {
      p_product_id: productId,
      p_org_id: orgId,
      p_name: name,
      p_internal_code: internalCode || '',
      p_barcode: barcode || '',
      p_sell_unit_type: sellUnitType,
      p_uom: uom || 'unit',
      p_unit_price: unitPrice,
      p_is_active: isActive,
      p_shelf_life_days: shelfLifeDays,
    });
    await supabaseServer
      .from('products' as never)
      .update({ brand: brand || null } as never)
      .eq('org_id', orgId)
      .eq('id', productId);

    if (safetyStockRaw !== '') {
      const safetyStock = Number(safetyStockRaw);
      if (!Number.isNaN(safetyStock) && safetyStock >= 0) {
        const { data: activeBranches } = await supabaseServer
          .from('branches')
          .select('id')
          .eq('org_id', orgId)
          .eq('is_active', true);

        await Promise.all(
          (activeBranches ?? []).map((branch) =>
            supabaseServer.rpc('rpc_set_safety_stock', {
              p_org_id: orgId,
              p_branch_id: branch.id,
              p_product_id: productId,
              p_safety_stock: safetyStock,
            }),
          ),
        );
      }
    }

    const secondarySupplierId =
      secondarySupplierIdRaw && secondarySupplierIdRaw !== primarySupplierId
        ? secondarySupplierIdRaw
        : '';

    if (primarySupplierId) {
      await supabaseServer.rpc('rpc_upsert_supplier_product', {
        p_org_id: orgId,
        p_supplier_id: primarySupplierId,
        p_product_id: productId,
        p_supplier_sku: primarySupplierSku,
        p_supplier_product_name: primarySupplierProductName,
        p_relation_type: 'primary',
        p_supplier_price:
          supplierPriceRaw === '' ? null : Number(supplierPriceRaw),
      });
    } else {
      await supabaseServer.rpc('rpc_remove_supplier_product_relation', {
        p_org_id: orgId,
        p_product_id: productId,
        p_relation_type: 'primary',
      });
    }

    if (secondarySupplierId) {
      await supabaseServer.rpc('rpc_upsert_supplier_product', {
        p_org_id: orgId,
        p_supplier_id: secondarySupplierId,
        p_product_id: productId,
        p_supplier_sku: '',
        p_supplier_product_name: '',
        p_relation_type: 'secondary',
        p_supplier_price: null,
      });
    } else {
      await supabaseServer.rpc('rpc_remove_supplier_product_relation', {
        p_org_id: orgId,
        p_product_id: productId,
        p_relation_type: 'secondary',
      });
    }

    revalidatePath('/products');
  };

  const adjustStock = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgAdminSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const productId = String(formData.get('product_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const quantityRaw = String(formData.get('new_quantity') ?? '0').trim();
    const reason = String(formData.get('reason') ?? '').trim();

    const newQuantity = Number(quantityRaw);
    if (!productId || !branchId) return;

    if (Number.isNaN(newQuantity)) return;

    await supabaseServer.rpc('rpc_adjust_stock_manual', {
      p_org_id: orgId,
      p_branch_id: branchId,
      p_product_id: productId,
      p_new_quantity_on_hand: newQuantity,
      p_reason: reason || 'manual',
    });

    revalidatePath('/products');
  };

  const visibleFrom = totalProducts === 0 ? 0 : pageFrom + 1;
  const visibleTo = Math.min(pageFrom + products.length, totalProducts);
  const buildProductsHref = (targetPage: number, targetPageSize?: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(Math.max(1, targetPage)));
    params.set('page_size', String(targetPageSize ?? pageSize));
    return `/products?${params.toString()}`;
  };
  const pageWindowSize = 7;
  let pageStart = Math.max(1, currentPage - Math.floor(pageWindowSize / 2));
  const pageEnd = Math.min(totalPages, pageStart + pageWindowSize - 1);
  if (pageEnd - pageStart + 1 < pageWindowSize) {
    pageStart = Math.max(1, pageEnd - pageWindowSize + 1);
  }
  const pageNumbers = Array.from(
    { length: Math.max(0, pageEnd - pageStart + 1) },
    (_, index) => pageStart + index,
  );

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-900">Productos</h1>
          <p className="text-sm text-zinc-500">
            Catalogo y stock por sucursal. Contrato: v_products_admin.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold text-zinc-900">
              Nuevo producto
              <span className="text-sm font-medium text-zinc-500 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <NewProductForm
              suppliers={suppliers}
              brandSuggestions={brandSuggestions}
              onSubmit={createProduct}
            />
          </details>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold text-zinc-900">
              Ajuste manual de stock
              <span className="text-sm font-medium text-zinc-500 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <form
              action={adjustStock}
              className="mt-6 grid gap-4 md:grid-cols-2"
            >
              <label className="text-sm font-medium text-zinc-700">
                Producto
                <select
                  name="product_id"
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecciona</option>
                  {productsForAdjust
                    .filter((product) =>
                      Boolean((product as { id?: string }).id),
                    )
                    .map((product) => (
                      <option
                        key={String((product as { id?: string }).id)}
                        value={String((product as { id?: string }).id)}
                      >
                        {String((product as { name?: string }).name ?? '')}
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
          </details>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3">
            <ProductListFilters
              initialQuery={query}
              initialPageSize={pageSize}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600">
              <span>
                {totalProducts} productos totales. Mostrando {visibleFrom}-
                {visibleTo}.
              </span>
              <span>
                Pagina {currentPage} de {totalPages}
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href={buildProductsHref(Math.max(1, currentPage - 1))}
                className={`rounded border px-3 py-1.5 text-sm ${
                  currentPage <= 1
                    ? 'pointer-events-none border-zinc-200 text-zinc-400'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Anterior
              </Link>
              <Link
                href={buildProductsHref(Math.min(totalPages, currentPage + 1))}
                className={`rounded border px-3 py-1.5 text-sm ${
                  currentPage >= totalPages
                    ? 'pointer-events-none border-zinc-200 text-zinc-400'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Siguiente
              </Link>
            </div>
            {pageNumbers.length > 1 ? (
              <div className="flex flex-wrap gap-1">
                {pageNumbers.map((pageNumber) => (
                  <Link
                    key={pageNumber}
                    href={buildProductsHref(pageNumber)}
                    className={`rounded border px-2 py-1 text-xs ${
                      pageNumber === currentPage
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {pageNumber}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <ProductListClient
          products={products}
          suppliers={suppliers}
          brandSuggestions={brandSuggestions}
          supplierByProduct={supplierByProductRecord}
          safetyStockGlobalByProduct={safetyStockGlobalRecord}
          safetyStockByProduct={safetyStockByProductRecord}
          onUpdate={updateProduct}
        />
      </div>
    </PageShell>
  );
}
