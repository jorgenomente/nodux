import { NextResponse } from 'next/server';

import { getOrgAdminSession } from '@/lib/auth/org-session';

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
    const { data, error } = await supabase
      .from('products')
      .select(
        'name, internal_code, barcode, sell_unit_type, uom, unit_price, shelf_life_days, is_active',
      )
      .eq('org_id', orgId)
      .order('name');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = [
      'name',
      'internal_code',
      'barcode',
      'sell_unit_type',
      'uom',
      'unit_price',
      'shelf_life_days',
      'is_active',
    ];
    const csv = rowsToCsv(
      headers,
      (data ?? []).map((row) => ({
        name: row.name,
        internal_code: row.internal_code ?? '',
        barcode: row.barcode ?? '',
        sell_unit_type: row.sell_unit_type,
        uom: row.uom,
        unit_price: row.unit_price,
        shelf_life_days: row.shelf_life_days ?? '',
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
    const { data, error } = await supabase
      .from('suppliers')
      .select(
        'name, contact_name, phone, email, notes, order_frequency, order_day, receive_day, payment_terms_days, preferred_payment_method, accepts_cash, accepts_transfer, payment_note, is_active',
      )
      .eq('org_id', orgId)
      .order('name');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
      'preferred_payment_method',
      'accepts_cash',
      'accepts_transfer',
      'payment_note',
      'is_active',
    ];
    const csv = rowsToCsv(
      headers,
      (data ?? []).map((row) => ({
        name: row.name,
        contact_name: row.contact_name ?? '',
        phone: row.phone ?? '',
        email: row.email ?? '',
        notes: row.notes ?? '',
        order_frequency: row.order_frequency ?? '',
        order_day: row.order_day ?? '',
        receive_day: row.receive_day ?? '',
        payment_terms_days: row.payment_terms_days ?? '',
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
      .from('supplier_products')
      .select(
        'relation_type, supplier_sku, supplier_product_name, products(name, internal_code, barcode), suppliers(name)',
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
      'supplier_sku',
      'supplier_product_name',
    ];
    const csv = rowsToCsv(
      headers,
      (data ?? []).map((row) => {
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
