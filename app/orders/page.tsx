import { randomUUID } from 'crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import OrderDraftFiltersClient from '@/app/orders/OrderDraftFiltersClient';
import OrderDraftCreateFormClient from '@/app/orders/OrderDraftCreateFormClient';
import NewSupplierFromOrdersButton from '@/app/orders/NewSupplierFromOrdersButton';
import OrderSuggestionsClient from '@/app/orders/OrderSuggestionsClient';
import PageShell from '@/app/components/PageShell';
import { parseProductCategoryTags } from '@/app/products/product-category-tags';
import { resolveActiveBranchId } from '@/lib/branches/active-branch';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOrgMemberSession } from '@/lib/auth/org-session';
import {
  hasStaffModuleEnabled,
  resolveStaffHome,
} from '@/lib/auth/staff-modules';

type SearchParams = {
  branch_id?: string;
  status?: string;
  draft_supplier_id?: string;
  draft_branch_id?: string;
  draft_margin_pct?: string;
  draft_avg_mode?: string;
  result?: string;
};

type OrderRow = {
  order_id: string;
  supplier_name: string | null;
  supplier_id: string;
  branch_name: string | null;
  branch_id: string;
  status: string;
  is_archived?: boolean | null;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  reconciled_at: string | null;
  expected_receive_on: string | null;
  items_count?: number | null;
  estimated_total_amount?: number | null;
  payment_state?: 'pending' | 'partial' | 'paid' | 'overdue' | 'not_created';
  payable_due_on?: string | null;
  payable_outstanding_amount?: number | null;
};

type SupplierPaymentPreferenceRow = {
  id: string;
  name: string | null;
  is_active: boolean;
  preferred_payment_method: 'cash' | 'transfer' | null;
  payment_terms_days?: number | null;
  default_markup_pct?: number | null;
  order_frequency?: 'weekly' | 'biweekly' | 'every_3_weeks' | 'monthly' | null;
};

type SuggestionRow = {
  product_id: string;
  relation_type: 'primary' | 'secondary' | 'none';
  product_name: string | null;
  purchase_by_pack: boolean | null;
  units_per_pack: number | null;
  stock_on_hand: number | null;
  safety_stock: number | null;
  avg_daily_sales_30d: number | null;
  cycle_days?: number | null;
  suggested_qty: number | null;
  primary_supplier_name?: string | null;
  supplier_product_name?: string | null;
  supplier_sku?: string | null;
  supplier_price?: number | null;
};

type SafetyStockUpdate = {
  productId: string;
  safetyStock: number;
};

type ProductPriceRow = {
  id: string;
  unit_price: number | null;
};

type OrgPreferencesMarkupRow = {
  default_supplier_markup_pct: number | null;
};

type SupplierProductPriceRow = {
  product_id: string;
  supplier_price: number | null;
  supplier_sku?: string | null;
  supplier_product_name?: string | null;
};

type SupplierPrimaryRelationRow = {
  product_id: string;
  supplier_id?: string;
  supplier: {
    name: string | null;
  } | null;
};

type ProductCatalogOptionRow = {
  id: string;
  name: string;
  brand: string | null;
  category_tags: string[] | null;
  barcode: string | null;
  internal_code: string | null;
  is_active: boolean;
  purchase_by_pack?: boolean | null;
  units_per_pack?: number | null;
};

type SupplierProductRelationRow = {
  product_id: string;
  relation_type: 'primary' | 'secondary';
  supplier_product_name: string | null;
};

type SupplierRelationType = 'primary' | 'secondary' | 'none';

type BrandSuggestionRow = {
  brand: string | null;
};

type OrderItemAmountRow = {
  order_id: string;
  ordered_qty: number | null;
  unit_cost: number | null;
  product: {
    unit_price: number | null;
  } | null;
};

type SpecialOrderItemRow = {
  item_id: string;
  special_order_id: string;
  client_name: string | null;
  product_id: string;
  product_name: string | null;
  remaining_qty: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  branch_id: string | null;
  is_ordered: boolean | null;
};

const throwIfError = (
  error: { message?: string } | null,
  fallbackMessage: string,
) => {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
};

const mapProductUpsertError = (error: { message?: string; code?: string }) => {
  if (error.code === '23505') {
    return 'Ya existe un producto con el mismo nombre, código interno o barcode.';
  }
  return error.message || 'No se pudo guardar el producto.';
};

const orderFrequencyToCycleDays = (
  frequency:
    | 'weekly'
    | 'biweekly'
    | 'every_3_weeks'
    | 'monthly'
    | null
    | undefined,
) => {
  switch (frequency) {
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    case 'every_3_weeks':
      return 21;
    case 'monthly':
      return 30;
    default:
      return 7;
  }
};

const formatStatusLabel = (status: string) => {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'sent':
      return 'Enviado';
    case 'received':
      return 'Controlado';
    case 'reconciled':
      return 'Controlado';
    default:
      return status;
  }
};

const formatPaymentState = (state: string | null | undefined) => {
  switch (state) {
    case 'pending':
      return 'Pendiente';
    case 'partial':
      return 'Parcial';
    case 'paid':
      return 'Pagado';
    case 'overdue':
      return 'Vencido';
    default:
      return 'Sin cuenta';
  }
};

const formatPaymentMethod = (
  method: 'cash' | 'transfer' | null | undefined,
) => {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'transfer':
      return 'Transferencia';
    default:
      return 'Sin definir';
  }
};

const buildSupplierPaymentPreferenceNote = (
  supplier: SupplierPaymentPreferenceRow | null | undefined,
) => {
  if (!supplier) return null;

  if (supplier.preferred_payment_method === 'cash') {
    return 'Este proveedor prefiere pagos en efectivo al momento de la entrega.';
  }

  if (supplier.preferred_payment_method === 'transfer') {
    const paymentTermsDays = Number(supplier.payment_terms_days ?? 0);
    if (Number.isFinite(paymentTermsDays) && paymentTermsDays > 0) {
      return `Este proveedor prefiere transferencia dentro de ${paymentTermsDays} dia${paymentTermsDays === 1 ? '' : 's'} desde la fecha del pedido.`;
    }

    return 'Este proveedor prefiere pagos por transferencia.';
  }

  return null;
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('es-AR') : '—';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);

const resolveSupplierDefaultMarkupPct = ({
  supplier,
  orgDefaultMarkupPct,
}: {
  supplier: SupplierPaymentPreferenceRow | null | undefined;
  orgDefaultMarkupPct: number;
}) => {
  const supplierMarkupPct = Number(supplier?.default_markup_pct);
  if (Number.isFinite(supplierMarkupPct) && supplierMarkupPct >= 0) {
    return supplierMarkupPct;
  }

  return orgDefaultMarkupPct;
};

const isExpectedReceiveOverdue = (
  expectedReceiveOn: string | null,
  status: string,
) => {
  if (!expectedReceiveOn) return false;
  if (status === 'reconciled' || status === 'received') return false;
  const expected = new Date(expectedReceiveOn);
  if (Number.isNaN(expected.getTime())) return false;
  const today = new Date();
  const expectedDay = new Date(
    expected.getFullYear(),
    expected.getMonth(),
    expected.getDate(),
  );
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return expectedDay < todayDay;
};

const buildDraftResultUrl = ({
  result,
  supplierId,
  branchId,
  draftMarginPct,
  draftAvgMode,
  redirectAfterSave,
}: {
  result: string;
  supplierId?: string;
  branchId?: string;
  draftMarginPct?: string;
  draftAvgMode?: string;
  redirectAfterSave?: string;
}) => {
  const params = new URLSearchParams();
  params.set('result', result);
  if (supplierId) params.set('draft_supplier_id', supplierId);
  if (branchId) params.set('draft_branch_id', branchId);
  if (draftMarginPct) params.set('draft_margin_pct', draftMarginPct);
  if (draftAvgMode) params.set('draft_avg_mode', draftAvgMode);
  if (redirectAfterSave) params.set('redirect_after_save', redirectAfterSave);
  return `/orders?${params.toString()}`;
};

export default async function OrdersPage({
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
    if (!hasStaffModuleEnabled(resolvedModules, 'orders')) {
      const home = resolveStaffHome(resolvedModules);
      redirect(home);
    }
  }

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select(
      'id, name, is_active, preferred_payment_method, payment_terms_days, default_markup_pct, order_frequency',
    )
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');

  const supplierPaymentMethodById = new Map(
    ((suppliers as SupplierPaymentPreferenceRow[] | null) ?? []).map(
      (supplier) => [supplier.id, supplier.preferred_payment_method],
    ),
  );

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');

  const selectedBranchId = await resolveActiveBranchId({
    requestedBranchId: resolvedSearchParams.branch_id,
    allowedBranchIds: ((branches ?? []) as Array<{ id: string }>).map(
      (branch) => branch.id,
    ),
    fallbackBranchId: '',
    allowExplicitEmpty: true,
  });
  const selectedStatus =
    typeof resolvedSearchParams.status === 'string'
      ? resolvedSearchParams.status
      : '';
  const draftSupplierId =
    typeof resolvedSearchParams.draft_supplier_id === 'string'
      ? resolvedSearchParams.draft_supplier_id
      : '';
  const draftBranchId = await resolveActiveBranchId({
    requestedBranchId: resolvedSearchParams.draft_branch_id,
    allowedBranchIds: ((branches ?? []) as Array<{ id: string }>).map(
      (branch) => branch.id,
    ),
    fallbackBranchId: '',
  });
  const draftMarginPctRaw =
    typeof resolvedSearchParams.draft_margin_pct === 'string'
      ? resolvedSearchParams.draft_margin_pct
      : '';
  const draftAvgMode =
    typeof resolvedSearchParams.draft_avg_mode === 'string'
      ? resolvedSearchParams.draft_avg_mode
      : 'cycle';
  const { data: orgPreferencesMarkupRow } = await supabase
    .from('org_preferences')
    .select('default_supplier_markup_pct')
    .eq('org_id', orgId)
    .maybeSingle();
  const orgDefaultMarkupPct = Number(
    (orgPreferencesMarkupRow as OrgPreferencesMarkupRow | null)
      ?.default_supplier_markup_pct ?? 40,
  );
  const selectedSupplierForDraft = (
    (suppliers ?? []) as SupplierPaymentPreferenceRow[]
  ).find((supplier) => supplier.id === draftSupplierId);
  const effectiveDraftMarginPct =
    draftMarginPctRaw === ''
      ? resolveSupplierDefaultMarkupPct({
          supplier: selectedSupplierForDraft,
          orgDefaultMarkupPct,
        })
      : Number(draftMarginPctRaw);
  const draftMarginPct = effectiveDraftMarginPct;
  const draftSupplierCycleDays = orderFrequencyToCycleDays(
    selectedSupplierForDraft?.order_frequency,
  );

  let orderQuery = supabase
    .from('v_orders_admin')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (selectedBranchId) {
    orderQuery = orderQuery.eq('branch_id', selectedBranchId);
  }

  const statusValue = ['draft', 'sent', 'reconciled'].includes(selectedStatus)
    ? (selectedStatus as 'draft' | 'sent' | 'reconciled')
    : '';

  if (statusValue) {
    orderQuery = orderQuery.eq('status', statusValue);
  }

  const { data: orders } = await orderQuery;
  const orderRows = (orders as OrderRow[]) ?? [];
  const orderIds = orderRows.map((order) => order.order_id).filter(Boolean);

  const { data: orderItemsAmountData } =
    orderIds.length > 0
      ? await supabase
          .from('supplier_order_items')
          .select(
            'order_id, ordered_qty, unit_cost, product:products(unit_price)',
          )
          .eq('org_id', orgId)
          .in('order_id', orderIds)
      : { data: [] };

  const estimatedByOrderId = new Map<string, number>();
  (orderItemsAmountData as OrderItemAmountRow[] | null)?.forEach((row) => {
    const orderId = row.order_id;
    if (!orderId) return;

    const orderedQty = Number(row.ordered_qty ?? 0);
    const unitCost = Number(row.unit_cost ?? 0);
    const fallbackUnitPrice = Number(row.product?.unit_price ?? 0);
    const estimatedUnitAmount = unitCost > 0 ? unitCost : fallbackUnitPrice;
    const lineTotal = orderedQty * estimatedUnitAmount;

    if (!Number.isFinite(lineTotal)) return;
    estimatedByOrderId.set(
      orderId,
      Number(estimatedByOrderId.get(orderId) ?? 0) + lineTotal,
    );
  });

  const ordersList = orderRows.map((order) => ({
    ...order,
    estimated_total_amount: Number(estimatedByOrderId.get(order.order_id) ?? 0),
  }));
  const visibleOrders = ordersList.filter((order) => !order.is_archived);
  const archivedDraftOrders = ordersList.filter(
    (order) => order.is_archived && order.status === 'draft',
  );
  const pendingOrders = visibleOrders.filter(
    (order) => order.status !== 'reconciled',
  );
  const controlledOrders = visibleOrders.filter(
    (order) => order.status === 'reconciled',
  );

  const { data: suggestions } =
    draftSupplierId && draftBranchId
      ? await supabase
          .from('v_supplier_product_suggestions')
          .select('*')
          .eq('org_id', orgId)
          .eq('supplier_id', draftSupplierId)
          .eq('branch_id', draftBranchId)
          .order('product_name')
      : { data: [] };

  const { data: specialOrderItems } =
    draftSupplierId && draftBranchId
      ? await supabase
          .from('v_special_order_items_pending')
          .select(
            'item_id, special_order_id, client_name, product_id, product_name, remaining_qty, supplier_id, supplier_name, branch_id, is_ordered',
          )
          .eq('org_id', orgId)
          .eq('supplier_id', draftSupplierId)
          .eq('branch_id', draftBranchId)
          .eq('is_ordered', false)
      : { data: [] };

  const draftProductCatalog =
    draftSupplierId && draftBranchId
      ? await fetchAllPages<ProductCatalogOptionRow>(
          (from, to) =>
            supabase
              .from('products')
              .select(
                'id, name, brand, category_tags, barcode, internal_code, is_active, purchase_by_pack, units_per_pack',
              )
              .eq('org_id', orgId)
              .eq('is_active', true)
              .order('name')
              .range(from, to),
          {
            label: 'orders_draft_products',
          },
        )
      : [];
  const draftSupplierRelations =
    draftSupplierId && draftBranchId
      ? await fetchAllPages<SupplierProductRelationRow>(
          (from, to) =>
            supabase
              .from('supplier_products')
              .select('product_id, relation_type, supplier_product_name')
              .eq('org_id', orgId)
              .eq('supplier_id', draftSupplierId)
              .range(from, to),
          {
            label: 'orders_draft_supplier_products',
          },
        )
      : [];
  const draftBrandSuggestions =
    draftSupplierId && draftBranchId
      ? await fetchAllPages<BrandSuggestionRow>(
          (from, to) =>
            supabase
              .from('products' as never)
              .select('brand')
              .eq('org_id', orgId)
              .eq('is_active', true)
              .not('brand', 'is', null)
              .range(from, to),
          {
            label: 'orders_draft_brand_suggestions',
          },
        )
      : [];
  const draftPrimarySupplierRelations =
    draftSupplierId && draftBranchId
      ? await fetchAllPages<SupplierPrimaryRelationRow>(
          (from, to) =>
            supabase
              .from('supplier_products')
              .select('product_id, supplier_id, supplier:suppliers(name)')
              .eq('org_id', orgId)
              .eq('relation_type', 'primary')
              .range(from, to),
          {
            label: 'orders_draft_primary_supplier_products',
          },
        )
      : [];

  const suggestionIds = (suggestions as SuggestionRow[] | null)
    ?.map((row) => row.product_id)
    .filter(Boolean) as string[] | undefined;

  const { data: suggestionPrices } =
    suggestionIds && suggestionIds.length > 0
      ? await supabase
          .from('products')
          .select('id, unit_price')
          .eq('org_id', orgId)
          .in('id', suggestionIds)
      : { data: [] };
  const { data: supplierProductPrices } =
    draftSupplierId && suggestionIds && suggestionIds.length > 0
      ? await supabase
          .from('supplier_products')
          .select(
            'product_id, supplier_price, supplier_sku, supplier_product_name',
          )
          .eq('org_id', orgId)
          .eq('supplier_id', draftSupplierId)
          .in('product_id', suggestionIds)
      : { data: [] };
  const { data: primarySupplierRelations } =
    suggestionIds && suggestionIds.length > 0
      ? await supabase
          .from('supplier_products')
          .select('product_id, supplier:suppliers(name)')
          .eq('org_id', orgId)
          .eq('relation_type', 'primary')
          .in('product_id', suggestionIds)
      : { data: [] };

  const priceByProduct = new Map<string, number>();
  (suggestionPrices as ProductPriceRow[] | null)?.forEach((row) => {
    if (!row.id) return;
    priceByProduct.set(row.id, Number(row.unit_price ?? 0));
  });
  const supplierPriceByProduct = new Map<string, number>();
  (supplierProductPrices as SupplierProductPriceRow[] | null)?.forEach(
    (row) => {
      if (!row.product_id) return;
      supplierPriceByProduct.set(
        row.product_id,
        Number(row.supplier_price ?? 0),
      );
    },
  );
  const primarySupplierNameByProduct = new Map<string, string | null>();
  (primarySupplierRelations as SupplierPrimaryRelationRow[] | null)?.forEach(
    (row) => {
      if (!row.product_id) return;
      primarySupplierNameByProduct.set(
        row.product_id,
        row.supplier?.name ?? null,
      );
    },
  );
  const supplierProductMetaByProduct = new Map<
    string,
    SupplierProductPriceRow
  >();
  (supplierProductPrices as SupplierProductPriceRow[] | null)?.forEach(
    (row) => {
      if (!row.product_id) return;
      supplierProductMetaByProduct.set(row.product_id, row);
    },
  );
  const suggestionsWithPrimarySupplier = (
    (suggestions as SuggestionRow[] | null) ?? []
  ).map((row) => ({
    ...row,
    primary_supplier_name:
      row.relation_type === 'secondary'
        ? (primarySupplierNameByProduct.get(row.product_id) ?? null)
        : null,
    supplier_product_name:
      supplierProductMetaByProduct.get(row.product_id)?.supplier_product_name ??
      null,
    supplier_sku:
      supplierProductMetaByProduct.get(row.product_id)?.supplier_sku ?? null,
    supplier_price:
      supplierProductMetaByProduct.get(row.product_id)?.supplier_price ?? null,
  }));
  const draftSupplierRelationByProduct = new Map<
    string,
    SupplierProductRelationRow
  >();
  draftSupplierRelations.forEach((row) => {
    if (!row.product_id) return;
    draftSupplierRelationByProduct.set(row.product_id, row);
  });
  const draftPrimarySupplierByProduct = new Map<string, string | null>();
  draftPrimarySupplierRelations.forEach((row) => {
    if (!row.product_id) return;
    draftPrimarySupplierByProduct.set(
      row.product_id,
      row.supplier?.name ?? null,
    );
  });
  const draftProductOptions = draftProductCatalog.map((product) => {
    const relation = draftSupplierRelationByProduct.get(product.id);
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      internalCode: product.internal_code,
      supplierProductName: relation?.supplier_product_name ?? null,
      currentRelationType: relation?.relation_type ?? null,
      currentPrimarySupplierName:
        draftPrimarySupplierByProduct.get(product.id) ?? null,
    };
  });
  const draftProductNameSuggestions = draftProductCatalog.map((product) => ({
    product_id: product.id,
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    internal_code: product.internal_code,
    is_active: product.is_active,
  }));
  const draftBrandSuggestionValues = Array.from(
    new Set(
      draftBrandSuggestions
        .map((row) => String(row.brand ?? '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const draftCategoryTagSuggestionValues = Array.from(
    new Set(
      draftProductCatalog.flatMap((product) =>
        Array.isArray(product.category_tags)
          ? product.category_tags
              .map((tag) => String(tag ?? '').trim())
              .filter(Boolean)
          : [],
      ),
    ),
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const addExistingProductsToDraft = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const supplierId = String(
      formData.get('supplier_id') ?? draftSupplierId,
    ).trim();
    const branchId = String(formData.get('branch_id') ?? draftBranchId).trim();

    if (!supplierId || !branchId) {
      throw new Error('Debes seleccionar proveedor y sucursal.');
    }

    const rawItems = String(formData.get('items_json') ?? '[]').trim();
    let parsedItems: Array<{
      productId: string;
      supplierRelation?: SupplierRelationType;
      supplierProductName?: string;
      supplierSku?: string;
    }> = [];
    try {
      const payload = JSON.parse(rawItems);
      if (Array.isArray(payload)) {
        parsedItems = payload as typeof parsedItems;
      }
    } catch {
      parsedItems = [];
    }

    const sanitizedItems = parsedItems
      .map((item) => ({
        productId: String(item.productId ?? '').trim(),
        supplierRelation: (item.supplierRelation === 'primary' ||
        item.supplierRelation === 'secondary'
          ? item.supplierRelation
          : 'none') as SupplierRelationType,
        supplierProductName: String(item.supplierProductName ?? '').trim(),
        supplierSku: String(item.supplierSku ?? '').trim(),
      }))
      .filter((item) => item.productId);

    if (sanitizedItems.length === 0) {
      throw new Error('Selecciona al menos un producto.');
    }

    const productIds = sanitizedItems.map((item) => item.productId);
    const [{ data: productRows }, { data: currentSupplierRows }] =
      await Promise.all([
        supabaseServer
          .from('products')
          .select('id, name, purchase_by_pack, units_per_pack')
          .eq('org_id', orgId)
          .in('id', productIds),
        supabaseServer
          .from('supplier_products')
          .select(
            'product_id, supplier_price, supplier_product_name, supplier_sku',
          )
          .eq('org_id', orgId)
          .eq('supplier_id', supplierId)
          .in('product_id', productIds),
      ]);

    const productById = new Map(
      (
        productRows as Array<{
          id: string;
          name: string | null;
          purchase_by_pack: boolean | null;
          units_per_pack: number | null;
        }> | null
      )?.map((row) => [row.id, row]) ?? [],
    );
    const supplierRowByProduct = new Map<
      string,
      {
        supplier_price: number | null;
        supplier_product_name: string | null;
        supplier_sku: string | null;
      }
    >();
    (
      currentSupplierRows as Array<{
        product_id: string;
        supplier_price: number | null;
        supplier_product_name: string | null;
        supplier_sku: string | null;
      }> | null
    )?.forEach((row) => {
      supplierRowByProduct.set(row.product_id, {
        supplier_price: row.supplier_price,
        supplier_product_name: row.supplier_product_name,
        supplier_sku: row.supplier_sku,
      });
    });

    await Promise.all(
      sanitizedItems.map(async (item) => {
        if (item.supplierRelation === 'none') return;

        const currentSupplierMeta = supplierRowByProduct.get(item.productId);
        const { error } = await supabaseServer.rpc(
          'rpc_upsert_supplier_product',
          {
            p_org_id: orgId,
            p_supplier_id: supplierId,
            p_product_id: item.productId,
            p_supplier_sku:
              item.supplierSku || currentSupplierMeta?.supplier_sku || '',
            p_supplier_product_name:
              item.supplierProductName ||
              currentSupplierMeta?.supplier_product_name ||
              '',
            p_relation_type: item.supplierRelation,
            p_supplier_price:
              currentSupplierMeta?.supplier_price == null
                ? undefined
                : Number(currentSupplierMeta.supplier_price),
          },
        );
        throwIfError(error, 'No se pudo vincular proveedor al producto');
      }),
    );

    revalidatePath('/orders');
    revalidatePath('/products');
    revalidatePath(`/suppliers/${supplierId}`);

    return {
      addedProducts: sanitizedItems.map((item) => {
        const product = productById.get(item.productId);
        const currentSupplierMeta = supplierRowByProduct.get(item.productId);
        return {
          product_id: item.productId,
          relation_type: item.supplierRelation,
          product_name: product?.name ?? 'Producto',
          purchase_by_pack: product?.purchase_by_pack ?? null,
          units_per_pack:
            product?.units_per_pack == null
              ? null
              : Number(product.units_per_pack),
          stock_on_hand: null,
          safety_stock: 0,
          avg_daily_sales_30d: null,
          cycle_days: draftSupplierCycleDays,
          suggested_qty: 0,
          primary_supplier_name: null,
          supplier_product_name:
            item.supplierProductName ||
            currentSupplierMeta?.supplier_product_name ||
            null,
          supplier_sku:
            item.supplierSku || currentSupplierMeta?.supplier_sku || null,
          supplier_price:
            currentSupplierMeta?.supplier_price == null
              ? null
              : Number(currentSupplierMeta.supplier_price),
        };
      }),
    };
  };

  const createProductFromDraft = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();
    const supplierId = String(
      formData.get('supplier_id') ?? draftSupplierId,
    ).trim();
    const branchId = String(formData.get('branch_id') ?? draftBranchId).trim();

    if (!supplierId || !branchId) {
      throw new Error('Debes seleccionar proveedor y sucursal.');
    }

    const productId = randomUUID();
    const name = String(formData.get('name') ?? '').trim();
    const brand = String(formData.get('brand') ?? '').trim();
    const internalCode = String(formData.get('internal_code') ?? '').trim();
    const barcode = String(formData.get('barcode') ?? '').trim();
    const categoryTags = parseProductCategoryTags(
      String(formData.get('category_tags') ?? ''),
    );
    const unitPrice = Number(String(formData.get('unit_price') ?? '0').trim());
    const supplierPriceRaw = String(
      formData.get('supplier_price') ?? '',
    ).trim();
    const supplierPrice =
      supplierPriceRaw === '' ? null : Number(supplierPriceRaw);
    const sellUnitType = String(formData.get('sell_unit_type') ?? 'unit') as
      | 'unit'
      | 'weight'
      | 'bulk';
    const uom = String(formData.get('uom') ?? 'unit').trim() || 'unit';
    const purchaseByPack = formData.get('purchase_by_pack') === 'on';
    const unitsPerPackRaw = String(formData.get('units_per_pack') ?? '').trim();
    const unitsPerPack =
      purchaseByPack && unitsPerPackRaw !== '' ? Number(unitsPerPackRaw) : null;
    const shelfLifeDaysRaw = String(
      formData.get('shelf_life_days') ?? '',
    ).trim();
    const shelfLifeDays =
      shelfLifeDaysRaw === '' ? null : Number(shelfLifeDaysRaw);
    const safetyStockRaw = String(formData.get('safety_stock') ?? '').trim();
    const safetyStock = safetyStockRaw === '' ? null : Number(safetyStockRaw);
    const supplierRelationRaw = String(
      formData.get('supplier_relation') ?? 'primary',
    ).trim();
    const supplierRelation: SupplierRelationType =
      supplierRelationRaw === 'primary' || supplierRelationRaw === 'secondary'
        ? supplierRelationRaw
        : 'none';
    const supplierProductName = String(
      formData.get('supplier_product_name') ?? '',
    ).trim();
    const supplierSku = String(formData.get('supplier_sku') ?? '').trim();

    if (!name) {
      throw new Error('Debes completar el nombre del producto.');
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('El precio unitario debe ser mayor o igual a 0.');
    }
    if (
      supplierPrice !== null &&
      (!Number.isFinite(supplierPrice) || supplierPrice < 0)
    ) {
      throw new Error('El precio proveedor debe ser mayor o igual a 0.');
    }
    if (
      purchaseByPack &&
      (unitsPerPack == null ||
        !Number.isFinite(unitsPerPack) ||
        unitsPerPack < 2)
    ) {
      throw new Error(
        'Si se compra por paquete, debes indicar al menos 2 unidades por paquete.',
      );
    }
    if (
      shelfLifeDays !== null &&
      (!Number.isFinite(shelfLifeDays) || shelfLifeDays < 0)
    ) {
      throw new Error('El vencimiento aproximado debe ser mayor o igual a 0.');
    }
    if (
      safetyStock !== null &&
      (!Number.isFinite(safetyStock) || safetyStock < 0)
    ) {
      throw new Error('La cantidad de resguardo debe ser mayor o igual a 0.');
    }

    const { error: upsertProductError } = await supabaseServer.rpc(
      'rpc_upsert_product',
      {
        p_product_id: productId,
        p_org_id: orgId,
        p_name: name,
        p_internal_code: internalCode,
        p_barcode: barcode,
        p_sell_unit_type: sellUnitType,
        p_uom: uom,
        p_unit_price: unitPrice,
        p_is_active: true,
        p_shelf_life_days: shelfLifeDays,
      },
    );
    if (upsertProductError) {
      throw new Error(mapProductUpsertError(upsertProductError));
    }

    const { error: metadataError } = await admin
      .from('products' as never)
      .update({
        brand: brand || null,
        category_tags: categoryTags,
        purchase_by_pack: purchaseByPack,
        units_per_pack: purchaseByPack ? unitsPerPack : null,
      } as never)
      .eq('org_id', orgId)
      .eq('id', productId);
    throwIfError(metadataError, 'No se pudo guardar metadata del producto');

    if (supplierRelation !== 'none') {
      const { error: upsertSupplierError } = await supabaseServer.rpc(
        'rpc_upsert_supplier_product',
        {
          p_org_id: orgId,
          p_supplier_id: supplierId,
          p_product_id: productId,
          p_supplier_sku: supplierSku,
          p_supplier_product_name: supplierProductName,
          p_relation_type: supplierRelation,
          p_supplier_price:
            supplierPrice === null ? undefined : Number(supplierPrice),
        },
      );
      throwIfError(
        upsertSupplierError,
        'No se pudo guardar relación del proveedor',
      );
    }

    if (safetyStock !== null) {
      const { error: safetyStockError } = await supabaseServer.rpc(
        'rpc_set_safety_stock',
        {
          p_org_id: orgId,
          p_branch_id: branchId,
          p_product_id: productId,
          p_safety_stock: safetyStock,
        },
      );
      throwIfError(
        safetyStockError,
        'No se pudo guardar cantidad de resguardo',
      );
    }

    revalidatePath('/orders');
    revalidatePath('/products');
    revalidatePath(`/suppliers/${supplierId}`);

    return {
      addedProducts: [
        {
          product_id: productId,
          relation_type: supplierRelation,
          product_name: name,
          purchase_by_pack: purchaseByPack,
          units_per_pack: purchaseByPack ? unitsPerPack : null,
          stock_on_hand: null,
          safety_stock: safetyStock ?? 0,
          avg_daily_sales_30d: null,
          cycle_days: draftSupplierCycleDays,
          suggested_qty: 0,
          primary_supplier_name: null,
          supplier_product_name: supplierProductName || null,
          supplier_sku: supplierSku || null,
          supplier_price: supplierPrice,
        },
      ],
    };
  };

  const createOrder = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const supplierId = String(formData.get('supplier_id') ?? '').trim();
    const branchId = String(formData.get('branch_id') ?? '').trim();
    const formDraftMarginPct = String(
      formData.get('draft_margin_pct') ?? '',
    ).trim();
    const formDraftAvgMode = String(
      formData.get('draft_avg_mode') ?? '',
    ).trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const redirectAfterSave = String(
      formData.get('redirect_after_save') ?? '',
    ).trim();
    const action =
      String(formData.get('order_action') ?? '').trim() ||
      String(formData.get('fallback_order_action') ?? '').trim() ||
      'draft';

    if (!supplierId || !branchId) return;

    const safetyStockUpdates = Array.from(formData.entries())
      .filter(([key]) => key.startsWith('safety_stock_'))
      .map(([key, value]) => ({
        productId: key.replace('safety_stock_', ''),
        safetyStock: Number(value),
      }))
      .filter(
        (entry): entry is SafetyStockUpdate =>
          Boolean(entry.productId) &&
          Number.isFinite(entry.safetyStock) &&
          entry.safetyStock >= 0,
      );

    const persistSafetyStockUpdates = async () => {
      if (safetyStockUpdates.length === 0) return;

      await Promise.all(
        safetyStockUpdates.map(async ({ productId, safetyStock }) => {
          const { error } = await supabaseServer.rpc('rpc_set_safety_stock', {
            p_org_id: orgId,
            p_branch_id: branchId,
            p_product_id: productId,
            p_safety_stock: safetyStock,
          });

          if (error) {
            throw new Error(
              `No se pudo actualizar stock de resguardo para ${productId}: ${error.message}`,
            );
          }
        }),
      );
    };

    const supplierProductNameUpdates = Array.from(formData.entries())
      .filter(([key]) => key.startsWith('supplier_product_name_'))
      .map(([key, value]) => {
        const productId = key.replace('supplier_product_name_', '');
        return {
          productId,
          supplierProductName: String(value ?? '').trim(),
          relationType:
            String(formData.get(`relation_type_${productId}`) ?? 'primary') ||
            'primary',
          supplierSku: String(
            formData.get(`supplier_sku_${productId}`) ?? '',
          ).trim(),
          supplierPriceRaw: String(
            formData.get(`supplier_price_${productId}`) ?? '',
          ).trim(),
        };
      })
      .filter((entry) => Boolean(entry.productId));

    const persistSupplierProductNameUpdates = async () => {
      if (supplierProductNameUpdates.length === 0) return;

      await Promise.all(
        supplierProductNameUpdates.map(
          async ({
            productId,
            supplierProductName,
            relationType,
            supplierSku,
            supplierPriceRaw,
          }) => {
            const supplierPrice =
              supplierPriceRaw === '' ? null : Number(supplierPriceRaw);
            if (relationType === 'none') return;
            const { error } = await supabaseServer.rpc(
              'rpc_upsert_supplier_product',
              {
                p_org_id: orgId,
                p_supplier_id: supplierId,
                p_product_id: productId,
                p_supplier_sku: supplierSku,
                p_supplier_product_name: supplierProductName,
                p_relation_type:
                  relationType === 'secondary' ? 'secondary' : 'primary',
                p_supplier_price:
                  supplierPrice != null && Number.isFinite(supplierPrice)
                    ? supplierPrice
                    : undefined,
              },
            );

            if (error) {
              throw new Error(
                `No se pudo actualizar nombre de articulo en proveedor para ${productId}: ${error.message}`,
              );
            }
          },
        ),
      );
    };

    const items = Array.from(formData.entries())
      .filter(([key]) => key.startsWith('qty_'))
      .map(([key, value]) => ({
        productId: key.replace('qty_', ''),
        qty: Number(value),
        unitCost: Number(formData.get(`unit_cost_${key.replace('qty_', '')}`)),
      }))
      .filter((entry) => entry.productId && entry.qty > 0);

    await persistSafetyStockUpdates();
    await persistSupplierProductNameUpdates();

    if (items.length === 0) {
      revalidatePath('/orders');
      revalidatePath('/products');
      redirect(
        buildDraftResultUrl({
          result: 'order_items_required',
          supplierId,
          branchId,
          draftMarginPct: formDraftMarginPct,
          draftAvgMode: formDraftAvgMode,
          redirectAfterSave,
        }),
      );
    }

    const { data: result } = await supabaseServer.rpc(
      'rpc_create_supplier_order',
      {
        p_org_id: orgId,
        p_branch_id: branchId,
        p_supplier_id: supplierId,
        p_notes: notes,
      },
    );

    const orderId = result?.[0]?.order_id as string | undefined;

    if (!orderId) {
      revalidatePath('/orders');
      redirect(
        buildDraftResultUrl({
          result: 'order_error',
          supplierId,
          branchId,
          draftMarginPct: formDraftMarginPct,
          draftAvgMode: formDraftAvgMode,
          redirectAfterSave,
        }),
      );
    }

    await Promise.all(
      items.map((item) =>
        supabaseServer.rpc('rpc_upsert_supplier_order_item', {
          p_org_id: orgId,
          p_order_id: orderId,
          p_product_id: item.productId,
          p_ordered_qty: item.qty,
          p_unit_cost:
            Number.isFinite(item.unitCost) && item.unitCost > 0
              ? item.unitCost
              : 0,
        }),
      ),
    );

    if (action === 'sent') {
      await supabaseServer.rpc('rpc_set_supplier_order_status', {
        p_org_id: orgId,
        p_order_id: orderId,
        p_status: 'sent',
      });
    }

    const specialOrderItemIdsRaw = String(
      formData.get('special_order_item_ids') ?? '',
    ).trim();
    if (specialOrderItemIdsRaw) {
      try {
        const itemIds = JSON.parse(specialOrderItemIdsRaw) as string[];
        if (Array.isArray(itemIds) && itemIds.length > 0) {
          await supabaseServer.rpc('rpc_mark_special_order_items_ordered', {
            p_org_id: orgId,
            p_item_ids: itemIds,
            p_supplier_order_id: orderId,
          });
        }
      } catch {
        // ignore invalid payload
      }
    }

    revalidatePath('/orders');
    revalidatePath('/products');
    if (action === 'sent') {
      redirect('/orders?result=order_sent');
    }

    if (redirectAfterSave) {
      redirect(redirectAfterSave);
    }

    redirect('/orders?result=order_draft_saved');
  };

  const createSupplierFromOrders = async (formData: FormData) => {
    'use server';

    const actionSession = await getOrgMemberSession();
    if (!actionSession?.orgId) return;
    const supabaseServer = actionSession.supabase;
    const orgId = actionSession.orgId;
    const name = String(formData.get('name') ?? '').trim();
    const contactName = String(formData.get('contact_name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const orderFrequency = String(formData.get('order_frequency') ?? '').trim();
    const orderDay = String(formData.get('order_day') ?? '').trim();
    const receiveDay = String(formData.get('receive_day') ?? '').trim();
    const paymentTermsDaysRaw = String(
      formData.get('payment_terms_days') ?? '',
    ).trim();
    const preferredPaymentMethod = String(
      formData.get('preferred_payment_method') ?? '',
    ).trim();
    const paymentNote = String(formData.get('payment_note') ?? '').trim();
    const defaultMarkupPctRaw = String(
      formData.get('default_markup_pct') ?? '40',
    ).trim();
    const draftBranchIdFromModal = String(
      formData.get('draft_branch_id') ?? '',
    ).trim();
    const draftMarginPctFromModal = String(
      formData.get('draft_margin_pct') ?? '',
    ).trim();
    const draftAvgModeFromModal = String(
      formData.get('draft_avg_mode') ?? '',
    ).trim();
    const acceptsCash = preferredPaymentMethod !== 'transfer';
    const acceptsTransfer = preferredPaymentMethod !== 'cash';
    const paymentTermsDays =
      paymentTermsDaysRaw === ''
        ? null
        : Number.parseInt(paymentTermsDaysRaw, 10);
    const defaultMarkupPct = Number(defaultMarkupPctRaw);

    if (!name) return;
    if (
      paymentTermsDays !== null &&
      (Number.isNaN(paymentTermsDays) || paymentTermsDays < 0)
    ) {
      return;
    }
    if (
      Number.isNaN(defaultMarkupPct) ||
      defaultMarkupPct < 0 ||
      defaultMarkupPct > 1000
    ) {
      return;
    }

    const { data: createdSupplierRows } = await supabaseServer.rpc(
      'rpc_upsert_supplier',
      {
        p_supplier_id: randomUUID(),
        p_org_id: orgId,
        p_name: name,
        p_contact_name: contactName,
        p_phone: phone,
        p_email: email,
        p_notes: notes,
        p_is_active: true,
        p_order_frequency: orderFrequency || null,
        p_order_day: orderDay || null,
        p_receive_day: receiveDay || null,
        p_payment_terms_days: paymentTermsDays ?? undefined,
        p_preferred_payment_method:
          preferredPaymentMethod === 'cash' ||
          preferredPaymentMethod === 'transfer'
            ? preferredPaymentMethod
            : undefined,
        p_accepts_cash: acceptsCash,
        p_accepts_transfer: acceptsTransfer,
        p_payment_note: paymentNote || undefined,
        p_default_markup_pct: defaultMarkupPct,
      },
    );
    const createdSupplierId = String(
      (
        createdSupplierRows as Array<{ supplier_id?: string | null }> | null
      )?.[0]?.supplier_id ?? '',
    ).trim();

    revalidatePath('/suppliers');
    revalidatePath('/orders');

    const params = new URLSearchParams();
    if (createdSupplierId) params.set('draft_supplier_id', createdSupplierId);
    if (draftBranchIdFromModal)
      params.set('draft_branch_id', draftBranchIdFromModal);
    if (createdSupplierId) {
      params.set('draft_margin_pct', String(defaultMarkupPct));
    } else if (draftMarginPctFromModal) {
      params.set('draft_margin_pct', draftMarginPctFromModal);
    }
    if (draftAvgModeFromModal)
      params.set('draft_avg_mode', draftAvgModeFromModal);
    params.set('result', 'supplier_created');
    redirect(`/orders?${params.toString()}`);
  };

  const setOrderArchived = async (formData: FormData) => {
    'use server';

    const supabaseServer = await createServerSupabaseClient();
    const orderId = String(formData.get('order_id') ?? '').trim();
    const nextValue =
      String(formData.get('next_archived') ?? '').trim() === '1';

    if (!orderId) return;

    await supabaseServer.rpc('rpc_set_supplier_order_archived', {
      p_org_id: orgId,
      p_order_id: orderId,
      p_is_archived: nextValue,
    });

    revalidatePath('/orders');
    redirect(
      nextValue
        ? '/orders?result=order_archived'
        : '/orders?result=order_restored',
    );
  };

  const selectedSupplier = suppliers?.find(
    (supplier) => supplier.id === draftSupplierId,
  );
  const supplierPaymentPreferenceNote = buildSupplierPaymentPreferenceNote(
    (selectedSupplier as SupplierPaymentPreferenceRow | undefined) ?? null,
  );
  const selectedBranch = branches?.find(
    (branch) => branch.id === draftBranchId,
  );
  const safeMarginPct =
    Number.isNaN(draftMarginPct) || draftMarginPct < 0 ? 0 : draftMarginPct;
  const priceByProductRecord: Record<string, number> = {};
  priceByProduct.forEach((value, key) => {
    priceByProductRecord[key] = value;
  });
  const supplierPriceByProductRecord: Record<string, number> = {};
  supplierPriceByProduct.forEach((value, key) => {
    supplierPriceByProductRecord[key] = value;
  });
  const branchNameById = new Map<string, string>();
  branches?.forEach((branch) => {
    branchNameById.set(branch.id, branch.name);
  });
  const specialOrderItemsWithBranch = (specialOrderItems ?? []).map((item) => ({
    ...(item as SpecialOrderItemRow),
    branch_name: item.branch_id
      ? (branchNameById.get(item.branch_id) ?? null)
      : null,
  }));
  const result =
    typeof resolvedSearchParams.result === 'string'
      ? resolvedSearchParams.result
      : '';

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Pedidos</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Crea y administra pedidos a proveedor.
            </p>
          </div>
          <form className="flex flex-wrap items-center gap-2">
            <select
              name="branch_id"
              defaultValue={selectedBranchId}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Todas las sucursales</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="sent">Enviado</option>
              <option value="reconciled">Controlado</option>
            </select>
            <button
              type="submit"
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              Filtrar
            </button>
          </form>
        </div>
        {result === 'order_sent' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Pedido enviado correctamente.
          </div>
        ) : null}
        {result === 'order_draft_saved' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Borrador guardado correctamente.
          </div>
        ) : null}
        {result === 'order_items_required' ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Debes agregar al menos un item para crear el pedido.
          </div>
        ) : null}
        {result === 'order_error' ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            No se pudo crear el pedido. Intenta nuevamente.
          </div>
        ) : null}
        {result === 'order_archived' ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            Borrador archivado correctamente.
          </div>
        ) : null}
        {result === 'order_restored' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Borrador restaurado correctamente.
          </div>
        ) : null}
        {result === 'supplier_created' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Proveedor creado correctamente.
          </div>
        ) : null}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <details
            className="group"
            open={Boolean(draftSupplierId && draftBranchId)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold text-zinc-900">
              Armar pedido
              <span className="text-sm font-medium text-zinc-500 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="mt-4">
              <OrderDraftFiltersClient
                suppliers={(
                  (suppliers ?? []) as SupplierPaymentPreferenceRow[]
                ).map((supplier) => ({
                  id: supplier.id,
                  name: supplier.name ?? 'Proveedor',
                  default_markup_pct: supplier.default_markup_pct ?? null,
                }))}
                branches={
                  (branches ?? []) as Array<{ id: string; name: string }>
                }
                draftSupplierId={draftSupplierId}
                draftBranchId={draftBranchId}
                draftMarginPct={String(effectiveDraftMarginPct)}
                draftAvgMode={draftAvgMode}
                orgDefaultMarkupPct={orgDefaultMarkupPct}
                newSupplierButton={
                  <NewSupplierFromOrdersButton
                    action={createSupplierFromOrders}
                    draftBranchId={draftBranchId}
                    draftMarginPct={String(effectiveDraftMarginPct)}
                    draftAvgMode={draftAvgMode}
                  />
                }
              />

              {draftSupplierId && draftBranchId ? (
                <div className="mt-6 grid gap-4">
                  <OrderDraftCreateFormClient
                    enabled={Boolean(draftSupplierId && draftBranchId)}
                  >
                    <form
                      action={createOrder}
                      className="grid gap-4"
                      data-order-draft-create-form="true"
                    >
                      <input
                        type="hidden"
                        name="supplier_id"
                        value={draftSupplierId}
                      />
                      <input
                        type="hidden"
                        name="branch_id"
                        value={draftBranchId}
                      />
                      <input
                        type="hidden"
                        name="fallback_order_action"
                        value=""
                      />
                      <input
                        type="hidden"
                        name="redirect_after_save"
                        value=""
                      />
                      <OrderSuggestionsClient
                        key={`${draftSupplierId}-${draftBranchId}`}
                        suggestions={suggestionsWithPrimarySupplier}
                        priceByProduct={priceByProductRecord}
                        supplierPriceByProduct={supplierPriceByProductRecord}
                        avgMode={
                          (draftAvgMode as
                            | 'cycle'
                            | 'weekly'
                            | 'biweekly'
                            | 'monthly') || 'cycle'
                        }
                        safeMarginPct={safeMarginPct}
                        useEstimatedCostsByDefault={false}
                        allowEstimateToggle
                        supplierPaymentPreferenceNote={
                          supplierPaymentPreferenceNote
                        }
                        addProductsModal={{
                          supplierName:
                            selectedSupplier?.name ?? 'este proveedor',
                          products: draftProductOptions,
                          productNameSuggestions: draftProductNameSuggestions,
                          brandSuggestions: draftBrandSuggestionValues,
                          categoryTagSuggestions:
                            draftCategoryTagSuggestionValues,
                          onAddExistingProducts: addExistingProductsToDraft,
                          onCreateProduct: createProductFromDraft,
                        }}
                        supplierName={selectedSupplier?.name ?? 'Proveedor'}
                        branchName={selectedBranch?.name ?? 'Sucursal'}
                        showingSummary={`${selectedSupplier?.name ?? 'Proveedor'} · ${selectedBranch?.name ?? 'Sucursal'}`}
                        submitActions={
                          <>
                            <button
                              type="submit"
                              name="order_action"
                              value="draft"
                              className="rounded border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
                            >
                              Guardar borrador
                            </button>
                            <button
                              type="submit"
                              name="order_action"
                              value="sent"
                              className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                            >
                              Enviar pedido
                            </button>
                          </>
                        }
                        specialOrders={
                          specialOrderItemsWithBranch as Array<
                            SpecialOrderItemRow & { branch_name: string | null }
                          >
                        }
                      />

                      <label className="text-sm text-zinc-600">
                        Notas
                        <textarea
                          name="notes"
                          rows={2}
                          className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </form>
                  </OrderDraftCreateFormClient>
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                  Selecciona proveedor y sucursal para ver sugeridos.
                </div>
              )}
            </div>
          </details>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Listado</h2>
          <div className="mt-4 space-y-3">
            {pendingOrders.length > 0 ? (
              pendingOrders.map((order) => {
                const isOverdue = isExpectedReceiveOverdue(
                  order.expected_receive_on,
                  order.status,
                );
                return (
                  <div
                    key={order.order_id}
                    className={`rounded-lg border p-4 ${
                      isOverdue
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-zinc-200'
                    }`}
                  >
                    <Link
                      href={`/orders/${order.order_id}`}
                      className="block hover:opacity-90"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {order.supplier_name || 'Proveedor'} ·{' '}
                            {order.branch_name || 'Sucursal'}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Estado: {formatStatusLabel(order.status)} · Items:{' '}
                            {order.items_count ?? 0}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Monto estimado:{' '}
                            {formatCurrency(
                              Number(order.estimated_total_amount ?? 0),
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Pago:{' '}
                            <span
                              className={`font-semibold ${
                                order.payment_state === 'paid'
                                  ? 'text-emerald-700'
                                  : order.payment_state === 'overdue'
                                    ? 'text-rose-700'
                                    : 'text-amber-700'
                              }`}
                            >
                              {formatPaymentState(order.payment_state)}
                            </span>
                            {' · '}Saldo:{' '}
                            {formatCurrency(
                              Number(order.payable_outstanding_amount ?? 0),
                            )}
                            {' · '}Vence:{' '}
                            {formatDate(order.payable_due_on ?? null)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Método requerido:{' '}
                            <span className="font-semibold text-zinc-700">
                              {formatPaymentMethod(
                                supplierPaymentMethodById.get(
                                  order.supplier_id,
                                ),
                              )}
                            </span>
                          </p>
                          <p className="text-xs text-zinc-500">
                            Estimado recepción:{' '}
                            {formatDate(order.expected_receive_on)}
                          </p>
                          {isOverdue ? (
                            <p className="mt-1 inline-flex rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              Recepción vencida
                            </p>
                          ) : null}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </Link>
                    {order.status === 'draft' ? (
                      <div className="mt-3 flex justify-end border-t border-zinc-100 pt-3">
                        <form action={setOrderArchived}>
                          <input
                            type="hidden"
                            name="order_id"
                            value={order.order_id}
                          />
                          <input type="hidden" name="next_archived" value="1" />
                          <button
                            type="submit"
                            className="rounded border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700"
                          >
                            Archivar borrador
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-zinc-500">
                No hay pedidos pendientes.
              </div>
            )}
          </div>
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h3 className="text-sm font-semibold text-zinc-700">
              Pedidos controlados
            </h3>
            <div className="mt-3 space-y-3">
              {controlledOrders.length > 0 ? (
                controlledOrders.map((order) => (
                  <Link
                    key={order.order_id}
                    href={`/orders/${order.order_id}`}
                    className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {order.supplier_name || 'Proveedor'} ·{' '}
                          {order.branch_name || 'Sucursal'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Estado: {formatStatusLabel(order.status)} · Items:{' '}
                          {order.items_count ?? 0}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Monto estimado:{' '}
                          {formatCurrency(
                            Number(order.estimated_total_amount ?? 0),
                          )}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Pago:{' '}
                          <span
                            className={`font-semibold ${
                              order.payment_state === 'paid'
                                ? 'text-emerald-700'
                                : order.payment_state === 'overdue'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {formatPaymentState(order.payment_state)}
                          </span>
                          {' · '}Saldo:{' '}
                          {formatCurrency(
                            Number(order.payable_outstanding_amount ?? 0),
                          )}
                          {' · '}Vence:{' '}
                          {formatDate(order.payable_due_on ?? null)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Método requerido:{' '}
                          <span className="font-semibold text-zinc-700">
                            {formatPaymentMethod(
                              supplierPaymentMethodById.get(order.supplier_id),
                            )}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          Estimado recepción:{' '}
                          {formatDate(order.expected_receive_on)}
                        </p>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-zinc-500">
                  No hay pedidos controlados.
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800">
                <span>Archivados ({archivedDraftOrders.length})</span>
                <span className="text-xs text-zinc-500 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="mt-3 space-y-3">
                {archivedDraftOrders.length > 0 ? (
                  archivedDraftOrders.map((order) => (
                    <div
                      key={order.order_id}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <Link
                        href={`/orders/${order.order_id}`}
                        className="block hover:opacity-90"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {order.supplier_name || 'Proveedor'} ·{' '}
                              {order.branch_name || 'Sucursal'}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Estado: Borrador archivado · Items:{' '}
                              {order.items_count ?? 0}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Monto estimado:{' '}
                              {formatCurrency(
                                Number(order.estimated_total_amount ?? 0),
                              )}
                            </p>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                      </Link>
                      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-3">
                        <form action={setOrderArchived}>
                          <input
                            type="hidden"
                            name="order_id"
                            value={order.order_id}
                          />
                          <input type="hidden" name="next_archived" value="0" />
                          <button
                            type="submit"
                            className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
                          >
                            Restaurar
                          </button>
                        </form>
                        <Link
                          href={`/orders/${order.order_id}`}
                          className="rounded bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Ver pedido
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">
                    No hay borradores archivados.
                  </div>
                )}
              </div>
            </details>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
