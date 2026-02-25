import { NextResponse } from 'next/server';

import { getOrgAdminSession } from '@/lib/auth/org-session';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  internal_code: string | null;
  barcode: string | null;
  sell_unit_type: 'unit' | 'weight' | 'bulk';
  uom: string;
  unit_price: number;
  shelf_life_days: number | null;
  is_active: boolean;
};

type SupplierRow = {
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  order_frequency: string | null;
  order_day: string | null;
  receive_day: string | null;
  payment_terms_days: number | null;
  default_markup_pct: number | null;
  preferred_payment_method: 'cash' | 'transfer' | null;
  accepts_cash: boolean;
  accepts_transfer: boolean;
  payment_note: string | null;
  is_active: boolean;
};

type SupplierRelationRow = {
  product_id: string;
  relation_type: 'primary' | 'secondary';
  supplier_price: number | null;
  supplier_sku: string | null;
  supplier_product_name: string | null;
  suppliers:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
};

type ProductSupplierExportRow = {
  relation_type: 'primary' | 'secondary' | null;
  supplier_price: number | null;
  supplier_sku: string | null;
  supplier_product_name: string | null;
  products:
    | {
        name: string | null;
        internal_code: string | null;
        barcode: string | null;
      }
    | Array<{
        name: string | null;
        internal_code: string | null;
        barcode: string | null;
      }>
    | null;
  suppliers:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
};

type StockRow = {
  product_id: string | null;
  safety_stock: number | null;
};

const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const rowsToCsv = (headers: string[], rows: Array<Record<string, unknown>>) => {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) =>
    headers.map((header) => escapeCsvCell(row[header])).join(','),
  );
  return [headerLine, ...bodyLines].join('\n');
};

const toProductRow = (row: Record<string, unknown>): ProductRow => ({
  id: String(row.id ?? ''),
  name: String(row.name ?? ''),
  brand:
    row.brand == null || String(row.brand).trim() === ''
      ? null
      : String(row.brand),
  internal_code:
    row.internal_code == null || String(row.internal_code).trim() === ''
      ? null
      : String(row.internal_code),
  barcode:
    row.barcode == null || String(row.barcode).trim() === ''
      ? null
      : String(row.barcode),
  sell_unit_type:
    row.sell_unit_type === 'weight' || row.sell_unit_type === 'bulk'
      ? row.sell_unit_type
      : 'unit',
  uom: String(row.uom ?? 'unit'),
  unit_price: Number(row.unit_price ?? 0),
  shelf_life_days:
    row.shelf_life_days == null || String(row.shelf_life_days).trim() === ''
      ? null
      : Number(row.shelf_life_days),
  is_active: row.is_active !== false,
});

const toSupplierRow = (row: Record<string, unknown>): SupplierRow => ({
  name: String(row.name ?? ''),
  contact_name:
    row.contact_name == null || String(row.contact_name).trim() === ''
      ? null
      : String(row.contact_name),
  phone:
    row.phone == null || String(row.phone).trim() === ''
      ? null
      : String(row.phone),
  email:
    row.email == null || String(row.email).trim() === ''
      ? null
      : String(row.email),
  notes:
    row.notes == null || String(row.notes).trim() === ''
      ? null
      : String(row.notes),
  order_frequency:
    row.order_frequency == null || String(row.order_frequency).trim() === ''
      ? null
      : String(row.order_frequency),
  order_day:
    row.order_day == null || String(row.order_day).trim() === ''
      ? null
      : String(row.order_day),
  receive_day:
    row.receive_day == null || String(row.receive_day).trim() === ''
      ? null
      : String(row.receive_day),
  payment_terms_days:
    row.payment_terms_days == null ||
    String(row.payment_terms_days).trim() === ''
      ? null
      : Number(row.payment_terms_days),
  default_markup_pct:
    row.default_markup_pct == null ||
    String(row.default_markup_pct).trim() === ''
      ? null
      : Number(row.default_markup_pct),
  preferred_payment_method:
    row.preferred_payment_method === 'cash' ||
    row.preferred_payment_method === 'transfer'
      ? row.preferred_payment_method
      : null,
  accepts_cash: row.accepts_cash !== false,
  accepts_transfer: row.accepts_transfer !== false,
  payment_note:
    row.payment_note == null || String(row.payment_note).trim() === ''
      ? null
      : String(row.payment_note),
  is_active: row.is_active !== false,
});

export async function GET(request: Request) {
  const session = await getOrgAdminSession();
  if (!session?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const supabase = session.supabase;
  const orgId = session.orgId;
  const dateSuffix = new Date().toISOString().slice(0, 10);

  if (type === 'products') {
    const productsRaw = await fetchAllPages<Record<string, unknown>>(
      (from, to) =>
        supabase
          .from('products' as never)
          .select(
            'id, name, brand, internal_code, barcode, sell_unit_type, uom, unit_price, shelf_life_days, is_active',
          )
          .eq('org_id', orgId)
          .order('name')
          .range(from, to),
      { label: 'onboarding_export_products' },
    );
    const products = productsRaw.map(toProductRow);
    const productIds = products.map((row) => row.id).filter(Boolean);

    const [relations, stockRows] = await Promise.all([
      productIds.length === 0
        ? Promise.resolve([] as SupplierRelationRow[])
        : fetchAllPages<SupplierRelationRow>(
            (from, to) =>
              supabase
                .from('supplier_products' as never)
                .select(
                  'product_id, relation_type, supplier_price, supplier_sku, supplier_product_name, suppliers(name)',
                )
                .eq('org_id', orgId)
                .in('product_id', productIds)
                .range(from, to),
            { label: 'onboarding_export_product_relations' },
          ),
      productIds.length === 0
        ? Promise.resolve([] as StockRow[])
        : fetchAllPages<StockRow>(
            (from, to) =>
              supabase
                .from('stock_items')
                .select('product_id, safety_stock')
                .eq('org_id', orgId)
                .in('product_id', productIds)
                .range(from, to),
            { label: 'onboarding_export_product_safety_stock' },
          ),
    ]);

    const relationByProduct = new Map<
      string,
      {
        primary_supplier_name: string;
        supplier_price: number | null;
        primary_supplier_sku: string;
        primary_supplier_product_name: string;
        secondary_supplier_name: string;
      }
    >();

    for (const relation of relations) {
      const supplier = Array.isArray(relation.suppliers)
        ? relation.suppliers[0]
        : relation.suppliers;
      const supplierName = supplier?.name ?? '';
      if (!relation.product_id) continue;
      const current = relationByProduct.get(relation.product_id) ?? {
        primary_supplier_name: '',
        supplier_price: null,
        primary_supplier_sku: '',
        primary_supplier_product_name: '',
        secondary_supplier_name: '',
      };
      if (relation.relation_type === 'primary') {
        current.primary_supplier_name = supplierName;
        current.supplier_price = relation.supplier_price ?? null;
        current.primary_supplier_sku = relation.supplier_sku ?? '';
        current.primary_supplier_product_name =
          relation.supplier_product_name ?? '';
      } else if (relation.relation_type === 'secondary') {
        current.secondary_supplier_name = supplierName;
      }
      relationByProduct.set(relation.product_id, current);
    }

    const safetyStockByProduct = new Map<string, number[]>();
    for (const stock of stockRows) {
      if (!stock.product_id || stock.safety_stock == null) continue;
      const values = safetyStockByProduct.get(stock.product_id) ?? [];
      values.push(Number(stock.safety_stock));
      safetyStockByProduct.set(stock.product_id, values);
    }

    const getGlobalSafetyStock = (productId: string): number | '' => {
      const values = safetyStockByProduct.get(productId) ?? [];
      if (values.length === 0) return '';
      const first = values[0];
      const allEqual = values.every((value) => value === first);
      return allEqual ? first : '';
    };

    const headers = [
      'name',
      'brand',
      'internal_code',
      'barcode',
      'sell_unit_type',
      'uom',
      'primary_supplier_name',
      'supplier_price',
      'unit_price',
      'shelf_life_days',
      'primary_supplier_product_name',
      'primary_supplier_sku',
      'secondary_supplier_name',
      'safety_stock',
      'is_active',
    ];
    const csv = rowsToCsv(
      headers,
      products.map((row) => ({
        name: row.name,
        brand: row.brand ?? '',
        internal_code: row.internal_code ?? '',
        barcode: row.barcode ?? '',
        sell_unit_type: row.sell_unit_type,
        uom: row.uom,
        primary_supplier_name:
          relationByProduct.get(row.id)?.primary_supplier_name ?? '',
        supplier_price: relationByProduct.get(row.id)?.supplier_price ?? '',
        unit_price: row.unit_price,
        shelf_life_days: row.shelf_life_days ?? '',
        primary_supplier_product_name:
          relationByProduct.get(row.id)?.primary_supplier_product_name ?? '',
        primary_supplier_sku:
          relationByProduct.get(row.id)?.primary_supplier_sku ?? '',
        secondary_supplier_name:
          relationByProduct.get(row.id)?.secondary_supplier_name ?? '',
        safety_stock: getGlobalSafetyStock(row.id),
        is_active: row.is_active,
      })),
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"productos_master_${dateSuffix}.csv\"`,
      },
    });
  }

  if (type === 'suppliers') {
    const suppliersRaw = await fetchAllPages<Record<string, unknown>>(
      (from, to) =>
        supabase
          .from('suppliers' as never)
          .select(
            'name, contact_name, phone, email, notes, order_frequency, order_day, receive_day, payment_terms_days, default_markup_pct, preferred_payment_method, accepts_cash, accepts_transfer, payment_note, is_active',
          )
          .eq('org_id', orgId)
          .order('name')
          .range(from, to),
      { label: 'onboarding_export_suppliers' },
    );
    const suppliers = suppliersRaw.map(toSupplierRow);

    const headers = [
      'name',
      'contact_name',
      'phone',
      'email',
      'notes',
      'order_frequency',
      'order_day',
      'receive_day',
      'payment_terms_days',
      'default_markup_pct',
      'preferred_payment_method',
      'accepts_cash',
      'accepts_transfer',
      'payment_note',
      'is_active',
    ];
    const csv = rowsToCsv(
      headers,
      suppliers.map((row) => ({
        name: row.name,
        contact_name: row.contact_name ?? '',
        phone: row.phone ?? '',
        email: row.email ?? '',
        notes: row.notes ?? '',
        order_frequency: row.order_frequency ?? '',
        order_day: row.order_day ?? '',
        receive_day: row.receive_day ?? '',
        payment_terms_days: row.payment_terms_days ?? '',
        default_markup_pct: row.default_markup_pct ?? 40,
        preferred_payment_method: row.preferred_payment_method ?? '',
        accepts_cash: row.accepts_cash,
        accepts_transfer: row.accepts_transfer,
        payment_note: row.payment_note ?? '',
        is_active: row.is_active,
      })),
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"proveedores_master_${dateSuffix}.csv\"`,
      },
    });
  }

  if (type === 'product_supplier') {
    const { data, error } = await supabase
      .from('supplier_products' as never)
      .select(
        'relation_type, supplier_price, supplier_sku, supplier_product_name, products(name, internal_code, barcode), suppliers(name)',
      )
      .eq('org_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = [
      'product_name',
      'internal_code',
      'barcode',
      'supplier_name',
      'relation_type',
      'supplier_price',
      'supplier_sku',
      'supplier_product_name',
    ];
    const exportRows = (data ?? []) as unknown as ProductSupplierExportRow[];
    const csv = rowsToCsv(
      headers,
      exportRows.map((row) => {
        const product = Array.isArray(row.products)
          ? row.products[0]
          : row.products;
        const supplier = Array.isArray(row.suppliers)
          ? row.suppliers[0]
          : row.suppliers;
        return {
          product_name: product?.name ?? '',
          internal_code: product?.internal_code ?? '',
          barcode: product?.barcode ?? '',
          supplier_name: supplier?.name ?? '',
          relation_type: row.relation_type ?? '',
          supplier_price: row.supplier_price ?? '',
          supplier_sku: row.supplier_sku ?? '',
          supplier_product_name: row.supplier_product_name ?? '',
        };
      }),
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"producto_proveedor_master_${dateSuffix}.csv\"`,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
}
