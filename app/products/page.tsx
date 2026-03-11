import { randomUUID } from 'crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import NewProductForm from '@/app/products/NewProductForm';
import { parseProductCategoryTags } from '@/app/products/product-category-tags';
import ProductListFilters from '@/app/products/ProductListFilters';
import ProductListClient from '@/app/products/ProductListClient';
import StockAdjustmentSection from '@/app/products/StockAdjustmentSection';
import PageShell from '@/app/components/PageShell';
import { getOrgMemberSession } from '@/lib/auth/org-session';
import {
  hasStaffModuleEnabled,
  resolveStaffHome,
} from '@/lib/auth/staff-modules';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';

type SupplierOption = {
  id: string;
  name: string;
  is_active: boolean;
  default_markup_pct: number | null;
};

type BranchOption = {
  id: string;
  name: string;
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

type ProductCatalogRow = {
  id: string;
  name: string;
  brand: string | null;
  category_tags: string[] | null;
  internal_code: string | null;
  barcode: string | null;
  purchase_by_pack: boolean | null;
  units_per_pack: number | null;
  is_active: boolean;
};

type SearchParams = {
  q?: string;
  page?: string;
  page_size?: string;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const PRODUCT_IMAGES_BUCKET = 'product-images';

const throwIfError = (
  error: { message: string } | null,
  context: string,
): void => {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
};

const normalizeProductName = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const mapProductUpsertError = (error: { message?: string; code?: string }) => {
  const message = String(error.message ?? '').toLowerCase();
  if (error.code === '23505' || message.includes('duplicate key')) {
    if (message.includes('products_org_barcode_normalized_uq')) {
      return 'Ya existe otro producto con ese código de barras (normalizado).';
    }
    if (message.includes('products_org_name_normalized_uq')) {
      return 'Ya existe otro producto con un nombre equivalente.';
    }
    if (message.includes('products_org_internal_code_uq')) {
      return 'Ya existe otro producto con ese código interno.';
    }
    if (message.includes('products_org_barcode_uq')) {
      return 'Ya existe otro producto con ese código de barras.';
    }
    return 'Ya existe un producto duplicado en este catálogo.';
  }
  return error.message ?? 'No se pudo guardar el producto.';
};

const ensureCanManageProductImages = async (
  session: Awaited<ReturnType<typeof getOrgMemberSession>>,
) => {
  if (!session?.orgId) {
    throw new Error('Sesión inválida.');
  }

  if (session.effectiveRole === 'org_admin') {
    return;
  }

  if (session.effectiveRole === 'staff') {
    const { data: modules } = await session.supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const resolvedModules = (modules ?? []) as Array<{
      module_key: string;
      is_enabled: boolean;
    }>;
    if (hasStaffModuleEnabled(resolvedModules, 'products')) {
      return;
    }
  }

  throw new Error('No tienes permisos para editar imágenes de productos.');
};

const parseImageDataUrl = (dataUrlRaw: string) => {
  const dataUrl = dataUrlRaw.trim();
  if (!dataUrl) return null;
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!matches) return null;
  const contentType = matches[1] || 'image/jpeg';
  const base64 = matches[2] || '';
  if (!base64) return null;

  return {
    contentType,
    buffer: Buffer.from(base64, 'base64'),
  };
};

const uploadProductImage = async ({
  orgId,
  productId,
  buffer,
}: {
  orgId: string;
  productId: string;
  buffer: Buffer;
}) => {
  const imagePath = `${orgId}/${productId}.jpg`;
  const admin = createAdminSupabaseClient();
  const { error: uploadError } = await admin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(imagePath, buffer, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '31536000',
    });
  if (uploadError) {
    throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
  }
  return admin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(imagePath).data
    .publicUrl;
};

const removeProductImage = async ({
  orgId,
  productId,
}: {
  orgId: string;
  productId: string;
}) => {
  const imagePath = `${orgId}/${productId}.jpg`;
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([imagePath]);
  if (error) {
    throw new Error(`No se pudo quitar la imagen: ${error.message}`);
  }
};

const updateProductMetadata = async ({
  orgId,
  productId,
  brand,
  categoryTags,
  imageUrl,
  purchaseByPack,
  unitsPerPack,
}: {
  orgId: string;
  productId: string;
  brand: string;
  categoryTags: string[];
  imageUrl: string | null;
  purchaseByPack: boolean;
  unitsPerPack: number | null;
}) => {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from('products' as never)
    .update({
      brand: brand || null,
      category_tags: categoryTags,
      image_url: imageUrl,
      purchase_by_pack: purchaseByPack,
      units_per_pack: purchaseByPack ? unitsPerPack : null,
    } as never)
    .eq('org_id', orgId)
    .eq('id', productId);
  if (error) {
    throw new Error(
      `No se pudo guardar metadatos del producto: ${error.message}`,
    );
  }
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getOrgMemberSession();
  if (!session) {
    redirect('/login');
  }

  if (!session.orgId) {
    redirect('/no-access');
  }
  const supabase = session.supabase;
  const dataClient = session.isPlatformAdmin
    ? createAdminSupabaseClient()
    : supabase;
  const orgId = session.orgId;
  const role = session.effectiveRole;
  if (role === 'staff') {
    const { data: modules } = await supabase.rpc(
      'rpc_get_staff_effective_modules',
    );
    const resolvedModules = (modules ?? []) as Array<{
      module_key: string;
      is_enabled: boolean;
    }>;
    if (!hasStaffModuleEnabled(resolvedModules, 'products')) {
      const home = resolveStaffHome(resolvedModules);
      redirect(home);
    }
  }
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

  let productsCountQuery = dataClient
    .from('v_products_admin')
    .select('product_id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  let productsRowsQuery = dataClient
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

  let branches: BranchOption[] = [];

  if (role === 'staff') {
    const { data: membershipRows } = await supabase
      .from('branch_memberships')
      .select('branch_id')
      .eq('org_id', orgId)
      .eq('user_id', session.userId)
      .eq('is_active', true);

    const branchIds = (membershipRows ?? [])
      .map((row) => row.branch_id)
      .filter((value): value is string => typeof value === 'string');

    if (branchIds.length > 0) {
      const { data: staffBranches } = await supabase
        .from('branches')
        .select('id, name')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .in('id', branchIds)
        .order('name');
      branches = (staffBranches ?? []) as BranchOption[];
    }
  } else {
    const { data: allBranches } = await dataClient
      .from('branches')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name');
    branches = (allBranches ?? []) as BranchOption[];
  }

  const [
    suppliersResult,
    supplierProductsResult,
    safetyStockResult,
    productsCatalogRaw,
    brandsForSuggestions,
  ] = await Promise.all([
    dataClient
      .from('suppliers' as never)
      .select('id, name, is_active, default_markup_pct')
      .eq('org_id', orgId)
      .order('name'),
    productIds.length === 0
      ? Promise.resolve({ data: [] as SupplierProductRow[] })
      : dataClient
          .from('supplier_products' as never)
          .select(
            'product_id, supplier_id, relation_type, supplier_price, supplier_sku, supplier_product_name, suppliers(name)',
          )
          .eq('org_id', orgId)
          .in('product_id', productIds),
    productIds.length === 0
      ? Promise.resolve({ data: [] as SafetyStockRow[] })
      : dataClient
          .from('stock_items')
          .select('product_id, safety_stock, branches(name)')
          .eq('org_id', orgId)
          .gt('safety_stock', 0)
          .in('product_id', productIds),
    fetchAllPages(
      (from, to) =>
        dataClient
          .from('products' as never)
          .select(
            'id, name, brand, category_tags, internal_code, barcode, purchase_by_pack, units_per_pack, is_active',
          )
          .eq('org_id', orgId)
          .order('name')
          .range(from, to),
      { label: 'products_page_products_catalog' },
    ),
    fetchAllPages(
      (from, to) =>
        dataClient
          .from('products' as never)
          .select('brand')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .not('brand', 'is', null)
          .range(from, to),
      { label: 'products_page_brands' },
    ),
  ]);

  const productsCatalog = (productsCatalogRaw as ProductCatalogRow[]).filter(
    (product) => product.id && product.name,
  );
  const productsForAdjust = productsCatalog.filter(
    (product) => product.is_active,
  );
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
  const categoryTagSuggestions = Array.from(
    new Set(
      productsCatalog.flatMap((product) =>
        Array.isArray(product.category_tags)
          ? product.category_tags
              .map((tag) => String(tag ?? '').trim())
              .filter(Boolean)
          : [],
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const productNameSuggestions = productsCatalog.map((product) => ({
    product_id: product.id,
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    internal_code: product.internal_code,
    is_active: product.is_active,
  }));

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

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) return;
    await ensureCanManageProductImages(actionSession);
    const supabaseServer = actionSession.isPlatformAdmin
      ? createAdminSupabaseClient()
      : actionSession.supabase;
    const name = String(formData.get('name') ?? '').trim();
    const brand = String(formData.get('brand') ?? '').trim();
    const categoryTags = parseProductCategoryTags(
      String(formData.get('category_tags') ?? ''),
    );
    const internalCode = String(formData.get('internal_code') ?? '').trim();
    const barcode = String(formData.get('barcode') ?? '').trim();
    const purchaseByPack = formData.get('purchase_by_pack') === 'on';
    const unitsPerPackRaw = String(formData.get('units_per_pack') ?? '').trim();
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
    const imageDataUrlRaw = String(formData.get('image_data_url') ?? '');

    if (!name) {
      throw new Error('El nombre del producto es obligatorio.');
    }

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw new Error('El precio unitario debe ser mayor o igual a 0.');
    }
    if (supplierPriceRaw !== '') {
      const supplierPrice = Number(supplierPriceRaw);
      if (Number.isNaN(supplierPrice) || supplierPrice < 0) {
        throw new Error('El precio proveedor debe ser mayor o igual a 0.');
      }
    }
    const shelfLifeDays =
      shelfLifeRaw === '' ? null : Number.parseInt(shelfLifeRaw, 10);
    if (
      shelfLifeDays !== null &&
      (Number.isNaN(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      throw new Error('Vencimiento aproximado inválido.');
    }
    const unitsPerPack = purchaseByPack
      ? Number.parseInt(unitsPerPackRaw, 10)
      : null;
    if (
      purchaseByPack &&
      (unitsPerPackRaw === '' ||
        Number.isNaN(unitsPerPack ?? Number.NaN) ||
        Number(unitsPerPack) <= 1)
    ) {
      throw new Error('Unidades por paquete debe ser un entero mayor a 1.');
    }

    const orgId = actionSession.orgId;
    const normalizedName = normalizeProductName(name);
    const nameDuplicate = productsCatalog.find(
      (product) => normalizeProductName(product.name) === normalizedName,
    );
    if (nameDuplicate) {
      throw new Error(
        `Ya existe un producto similar por nombre: ${nameDuplicate.name}.`,
      );
    }

    const productId = randomUUID();
    const parsedImage = parseImageDataUrl(imageDataUrlRaw);
    let imageUrl: string | null = null;

    if (parsedImage && parsedImage.buffer.byteLength > 0) {
      imageUrl = await uploadProductImage({
        orgId,
        productId,
        buffer: parsedImage.buffer,
      });
    }

    const { error: upsertProductError } = await supabaseServer.rpc(
      'rpc_upsert_product',
      {
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
      },
    );
    if (upsertProductError) {
      throw new Error(mapProductUpsertError(upsertProductError));
    }
    await updateProductMetadata({
      orgId,
      productId,
      brand,
      categoryTags,
      imageUrl,
      purchaseByPack,
      unitsPerPack,
    });

    if (primarySupplierId) {
      const { error: upsertPrimarySupplierError } = await supabaseServer.rpc(
        'rpc_upsert_supplier_product',
        {
          p_org_id: orgId,
          p_supplier_id: primarySupplierId,
          p_product_id: productId,
          p_supplier_sku: primarySupplierSku,
          p_supplier_product_name: primarySupplierProductName,
          p_relation_type: 'primary',
          p_supplier_price:
            supplierPriceRaw === '' ? undefined : Number(supplierPriceRaw),
        },
      );
      throwIfError(
        upsertPrimarySupplierError,
        'No se pudo guardar proveedor primario',
      );
    }

    if (secondarySupplierId && secondarySupplierId !== primarySupplierId) {
      const { error: upsertSecondarySupplierError } = await supabaseServer.rpc(
        'rpc_upsert_supplier_product',
        {
          p_org_id: orgId,
          p_supplier_id: secondarySupplierId,
          p_product_id: productId,
          p_supplier_sku: '',
          p_supplier_product_name: '',
          p_relation_type: 'secondary',
          p_supplier_price: undefined,
        },
      );
      throwIfError(
        upsertSecondarySupplierError,
        'No se pudo guardar proveedor secundario',
      );
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
            supabaseServer
              .rpc('rpc_set_safety_stock', {
                p_org_id: orgId,
                p_branch_id: branch.id,
                p_product_id: productId,
                p_safety_stock: safetyStock,
              })
              .then(({ error }) =>
                throwIfError(error, 'No se pudo guardar cantidad de resguardo'),
              ),
          ),
        );
      }
    }

    revalidatePath('/products');
  };

  const updateProduct = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) return;
    await ensureCanManageProductImages(actionSession);
    const supabaseServer = actionSession.isPlatformAdmin
      ? createAdminSupabaseClient()
      : actionSession.supabase;
    const orgId = actionSession.orgId;
    const productId = String(formData.get('product_id') ?? '').trim();
    const name = String(formData.get('edit_name') ?? '').trim();
    const brand = String(formData.get('edit_brand') ?? '').trim();
    const categoryTags = parseProductCategoryTags(
      String(formData.get('edit_category_tags') ?? ''),
    );
    const internalCode = String(
      formData.get('edit_internal_code') ?? '',
    ).trim();
    const barcode = String(formData.get('edit_barcode') ?? '').trim();
    const purchaseByPack = formData.get('edit_purchase_by_pack') === 'on';
    const unitsPerPackRaw = String(
      formData.get('edit_units_per_pack') ?? '',
    ).trim();
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
    const imageDataUrlRaw = String(formData.get('edit_image_data_url') ?? '');
    const removeImage = formData.get('remove_image') === 'true';

    if (!productId || !name) {
      throw new Error('Producto inválido para edición.');
    }

    const unitPrice = Number(unitPriceRaw);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw new Error('El precio unitario debe ser mayor o igual a 0.');
    }
    if (supplierPriceRaw !== '') {
      const supplierPrice = Number(supplierPriceRaw);
      if (Number.isNaN(supplierPrice) || supplierPrice < 0) {
        throw new Error('El precio proveedor debe ser mayor o igual a 0.');
      }
    }
    const shelfLifeDays =
      shelfLifeRaw === '' ? null : Number.parseInt(shelfLifeRaw, 10);
    if (
      shelfLifeDays !== null &&
      (Number.isNaN(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      throw new Error('Vencimiento aproximado inválido.');
    }
    const unitsPerPack = purchaseByPack
      ? Number.parseInt(unitsPerPackRaw, 10)
      : null;
    if (
      purchaseByPack &&
      (unitsPerPackRaw === '' ||
        Number.isNaN(unitsPerPack ?? Number.NaN) ||
        Number(unitsPerPack) <= 1)
    ) {
      throw new Error('Unidades por paquete debe ser un entero mayor a 1.');
    }

    const parsedImage = parseImageDataUrl(imageDataUrlRaw);
    const admin = createAdminSupabaseClient();
    const { data: currentProductRaw, error: currentProductError } = await admin
      .from('products' as never)
      .select('image_url')
      .eq('org_id', orgId)
      .eq('id', productId)
      .maybeSingle();
    if (currentProductError) {
      throw new Error(
        `No se pudo leer imagen actual del producto: ${currentProductError.message}`,
      );
    }
    const currentProduct = currentProductRaw as {
      image_url?: string | null;
    } | null;

    let nextImageUrl = currentProduct?.image_url ?? null;

    if (removeImage) {
      await removeProductImage({ orgId, productId });
      nextImageUrl = null;
    }

    if (parsedImage && parsedImage.buffer.byteLength > 0) {
      nextImageUrl = await uploadProductImage({
        orgId,
        productId,
        buffer: parsedImage.buffer,
      });
    }

    const { error: updateUpsertProductError } = await supabaseServer.rpc(
      'rpc_upsert_product',
      {
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
      },
    );
    if (updateUpsertProductError) {
      throw new Error(mapProductUpsertError(updateUpsertProductError));
    }
    await updateProductMetadata({
      orgId,
      productId,
      brand,
      categoryTags,
      imageUrl: nextImageUrl,
      purchaseByPack,
      unitsPerPack,
    });

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
            supabaseServer
              .rpc('rpc_set_safety_stock', {
                p_org_id: orgId,
                p_branch_id: branch.id,
                p_product_id: productId,
                p_safety_stock: safetyStock,
              })
              .then(({ error }) =>
                throwIfError(
                  error,
                  'No se pudo actualizar cantidad de resguardo',
                ),
              ),
          ),
        );
      }
    }

    const secondarySupplierId =
      secondarySupplierIdRaw && secondarySupplierIdRaw !== primarySupplierId
        ? secondarySupplierIdRaw
        : '';

    if (primarySupplierId) {
      const { error: updatePrimarySupplierError } = await supabaseServer.rpc(
        'rpc_upsert_supplier_product',
        {
          p_org_id: orgId,
          p_supplier_id: primarySupplierId,
          p_product_id: productId,
          p_supplier_sku: primarySupplierSku,
          p_supplier_product_name: primarySupplierProductName,
          p_relation_type: 'primary',
          p_supplier_price:
            supplierPriceRaw === '' ? undefined : Number(supplierPriceRaw),
        },
      );
      throwIfError(
        updatePrimarySupplierError,
        'No se pudo actualizar proveedor primario',
      );
    } else {
      const { error: removePrimarySupplierError } = await supabaseServer.rpc(
        'rpc_remove_supplier_product_relation',
        {
          p_org_id: orgId,
          p_product_id: productId,
          p_relation_type: 'primary',
        },
      );
      throwIfError(
        removePrimarySupplierError,
        'No se pudo quitar proveedor primario',
      );
    }

    if (secondarySupplierId) {
      const { error: updateSecondarySupplierError } = await supabaseServer.rpc(
        'rpc_upsert_supplier_product',
        {
          p_org_id: orgId,
          p_supplier_id: secondarySupplierId,
          p_product_id: productId,
          p_supplier_sku: '',
          p_supplier_product_name: '',
          p_relation_type: 'secondary',
          p_supplier_price: undefined,
        },
      );
      throwIfError(
        updateSecondarySupplierError,
        'No se pudo actualizar proveedor secundario',
      );
    } else {
      const { error: removeSecondarySupplierError } = await supabaseServer.rpc(
        'rpc_remove_supplier_product_relation',
        {
          p_org_id: orgId,
          p_product_id: productId,
          p_relation_type: 'secondary',
        },
      );
      throwIfError(
        removeSecondarySupplierError,
        'No se pudo quitar proveedor secundario',
      );
    }

    revalidatePath('/products');
  };

  const adjustStock = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.isPlatformAdmin
      ? createAdminSupabaseClient()
      : actionSession.supabase;
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

  const transferStock = async (formData: FormData): Promise<void> => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId || !actionSession.effectiveRole) return;

    const supabaseServer = actionSession.isPlatformAdmin
      ? createAdminSupabaseClient()
      : actionSession.supabase;
    const orgId = actionSession.orgId;
    const fromBranchId = String(formData.get('from_branch_id') ?? '').trim();
    const toBranchId = String(formData.get('to_branch_id') ?? '').trim();
    const reason = String(formData.get('transfer_reason') ?? '').trim();

    const productIds = formData
      .getAll('transfer_product_id')
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
    const quantities = formData
      .getAll('transfer_quantity')
      .map((value) => String(value ?? '').trim());

    if (!fromBranchId || !toBranchId) {
      throw new Error('Debes seleccionar sucursal origen y destino.');
    }

    if (fromBranchId === toBranchId) {
      throw new Error('La sucursal origen y destino deben ser distintas.');
    }

    if (productIds.length === 0 || productIds.length !== quantities.length) {
      throw new Error('La lista de artículos a mover es inválida.');
    }

    const aggregatedItems = new Map<string, number>();

    productIds.forEach((productId, index) => {
      const quantity = Number(quantities[index] ?? '0');
      if (Number.isNaN(quantity) || quantity <= 0) {
        throw new Error('Cada cantidad a mover debe ser mayor a 0.');
      }
      aggregatedItems.set(
        productId,
        Number((aggregatedItems.get(productId) ?? 0) + quantity),
      );
    });

    const items = Array.from(aggregatedItems.entries()).map(
      ([productId, quantity]) => ({
        product_id: productId,
        quantity,
      }),
    );

    const { error } = await supabaseServer.rpc(
      'rpc_transfer_stock_between_branches' as never,
      {
        p_org_id: orgId,
        p_from_branch_id: fromBranchId,
        p_to_branch_id: toBranchId,
        p_items: items,
        p_reason: reason || 'transferencia entre sucursales',
      } as never,
    );

    if (error) {
      throw new Error(error.message || 'No se pudo mover el stock.');
    }

    revalidatePath('/products');
  };

  const canManageCatalog = role === 'org_admin';
  const canAdjustManualStock = canManageCatalog;
  const canTransferStock = branches.length > 1;

  const visibleFrom = totalProducts === 0 ? 0 : pageFrom + 1;
  const visibleTo = Math.min(pageFrom + products.length, totalProducts);
  const productsForList = products.map((product) => ({
    ...product,
    image_url: (product as { image_url?: string | null }).image_url ?? null,
  }));
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
            Catalogo y stock por sucursal.
          </p>
        </header>

        {canManageCatalog ? (
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
                categoryTagSuggestions={categoryTagSuggestions}
                productNameSuggestions={productNameSuggestions}
                onSubmit={createProduct}
              />
            </details>
          </section>
        ) : null}

        {canAdjustManualStock || canTransferStock ? (
          <StockAdjustmentSection
            branches={branches}
            products={productsForAdjust.map((product) => ({
              id: product.id,
              name: product.name,
            }))}
            canAdjustManualStock={canAdjustManualStock}
            canTransferStock={canTransferStock}
            manualAdjustAction={adjustStock}
            transferStockAction={transferStock}
          />
        ) : null}

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
          products={productsForList}
          suppliers={suppliers}
          brandSuggestions={brandSuggestions}
          categoryTagSuggestions={categoryTagSuggestions}
          productNameSuggestions={productNameSuggestions}
          supplierByProduct={supplierByProductRecord}
          safetyStockGlobalByProduct={safetyStockGlobalRecord}
          safetyStockByProduct={safetyStockByProductRecord}
          canEdit={canManageCatalog}
          onUpdate={updateProduct}
        />
      </div>
    </PageShell>
  );
}
