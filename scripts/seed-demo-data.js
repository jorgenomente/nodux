const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const loadEnvFromFile = (fileName) => {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;

    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] == null) {
      process.env[key] = value;
    }
  });
};

loadEnvFromFile('.env.local');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_A = '22222222-2222-2222-2222-222222222222';
const BRANCH_B = '33333333-3333-3333-3333-333333333333';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
};

const suppliersSeed = [
  {
    name: 'Proveedor Semanal Demo',
    order_frequency: 'weekly',
    order_day: 'mon',
    receive_day: 'tue',
  },
  {
    name: 'Proveedor Quincenal Demo',
    order_frequency: 'biweekly',
    order_day: 'wed',
    receive_day: 'thu',
  },
  {
    name: 'Proveedor Mensual Demo',
    order_frequency: 'monthly',
    order_day: 'fri',
    receive_day: 'sat',
  },
];

const buildProducts = (supplierIndex) => {
  const productPrefix = `DEMO-S${supplierIndex + 1}`;
  const baseName = supplierIndex + 1;
  return Array.from({ length: 10 }, (_, idx) => {
    const suffix = String(idx + 1).padStart(2, '0');
    return {
      name: `Producto Demo ${baseName}-${suffix}`,
      internal_code: `${productPrefix}-${suffix}`,
      barcode: `779000${supplierIndex + 1}${suffix}${rand(100, 999)}`,
      sell_unit_type: 'unit',
      uom: 'unit',
      unit_price: randFloat(1500, 15000, 2),
      shelf_life_days: rand(7, 90),
      is_active: true,
    };
  });
};

const daysAgo = (days, hour = 10, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

(async () => {
  const { data: adminRow, error: adminError } = await supabase
    .from('org_users')
    .select('user_id')
    .eq('org_id', ORG_ID)
    .eq('role', 'org_admin')
    .maybeSingle();
  if (adminError) throw adminError;
  if (!adminRow?.user_id) {
    throw new Error('Org admin user not found for seed');
  }
  const adminUserId = adminRow.user_id;

  const { data: existingSuppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('org_id', ORG_ID)
    .in(
      'name',
      suppliersSeed.map((supplier) => supplier.name),
    );

  const supplierIdByName = new Map(
    (existingSuppliers ?? []).map((row) => [row.name, row.id]),
  );

  const suppliers = suppliersSeed.map((supplier) => ({
    id: supplierIdByName.get(supplier.name) ?? randomUUID(),
    org_id: ORG_ID,
    name: supplier.name,
    contact_name: 'Contacto Demo',
    phone: '1122334455',
    email: 'demo@proveedor.com',
    notes: 'Proveedor de prueba',
    is_active: true,
    order_frequency: supplier.order_frequency,
    order_day: supplier.order_day,
    receive_day: supplier.receive_day,
  }));

  const { error: supplierError } = await supabase
    .from('suppliers')
    .upsert(suppliers, { onConflict: 'id' });
  if (supplierError) throw supplierError;

  const productsSeed = suppliers.flatMap((supplier, idx) =>
    buildProducts(idx).map((product) => ({
      ...product,
      org_id: ORG_ID,
      supplier_id: supplier.id,
    })),
  );

  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, internal_code')
    .eq('org_id', ORG_ID)
    .in(
      'internal_code',
      productsSeed.map((product) => product.internal_code),
    );

  const productIdByCode = new Map(
    (existingProducts ?? []).map((row) => [row.internal_code, row.id]),
  );

  const products = productsSeed.map((product) => ({
    id: productIdByCode.get(product.internal_code) ?? randomUUID(),
    org_id: ORG_ID,
    name: product.name,
    internal_code: product.internal_code,
    barcode: product.barcode,
    sell_unit_type: product.sell_unit_type,
    uom: product.uom,
    unit_price: product.unit_price,
    shelf_life_days: product.shelf_life_days,
    is_active: product.is_active,
  }));

  const { error: productsError } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'id' });
  if (productsError) throw productsError;

  const productsBySupplier = suppliers.map((supplier, idx) => ({
    supplier,
    products: products.filter((product) =>
      product.internal_code.startsWith(`DEMO-S${idx + 1}`),
    ),
  }));

  const supplierProducts = productsBySupplier.flatMap((entry) =>
    entry.products.map((product) => ({
      org_id: ORG_ID,
      supplier_id: entry.supplier.id,
      product_id: product.id,
      supplier_sku: `SKU-${product.internal_code}`,
      supplier_product_name: `${product.name} (${entry.supplier.name})`,
      relation_type: 'primary',
    })),
  );

  const { error: supplierProductsError } = await supabase
    .from('supplier_products')
    .upsert(supplierProducts, {
      onConflict: 'org_id,supplier_id,product_id',
    });
  if (supplierProductsError) throw supplierProductsError;

  const stockItems = products.flatMap((product) => [
    {
      org_id: ORG_ID,
      branch_id: BRANCH_A,
      product_id: product.id,
      quantity_on_hand: rand(-5, 60),
      safety_stock: rand(5, 15),
    },
    {
      org_id: ORG_ID,
      branch_id: BRANCH_B,
      product_id: product.id,
      quantity_on_hand: rand(-5, 60),
      safety_stock: rand(5, 15),
    },
  ]);

  const { error: stockError } = await supabase
    .from('stock_items')
    .upsert(stockItems, { onConflict: 'org_id,branch_id,product_id' });
  if (stockError) throw stockError;

  const demoProductIds = products.map((product) => product.id);

  const { data: saleItemsToDelete } = await supabase
    .from('sale_items')
    .select('sale_id')
    .eq('org_id', ORG_ID)
    .in('product_id', demoProductIds);

  const saleIds = Array.from(
    new Set((saleItemsToDelete ?? []).map((row) => row.sale_id)),
  );

  if (saleIds.length > 0) {
    const { error: deleteSaleItemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('org_id', ORG_ID)
      .in('sale_id', saleIds);
    if (deleteSaleItemsError) throw deleteSaleItemsError;

    const { error: deleteSalesError } = await supabase
      .from('sales')
      .delete()
      .eq('org_id', ORG_ID)
      .in('id', saleIds);
    if (deleteSalesError) throw deleteSalesError;
  }

  const salesPayload = [];
  const saleItemsPayload = [];

  for (let day = 0; day < 90; day += 1) {
    const saleDateA = daysAgo(day, rand(9, 21), rand(0, 59));
    const saleDateB = daysAgo(day, rand(9, 21), rand(0, 59));

    [BRANCH_A, BRANCH_B].forEach((branchId, idx) => {
      const saleId = randomUUID();
      const createdAt = idx === 0 ? saleDateA : saleDateB;
      const itemCount = rand(3, 6);
      const chosenProducts = Array.from({ length: itemCount }, () =>
        pick(products),
      );
      let totalAmount = 0;

      chosenProducts.forEach((product) => {
        const quantity = randFloat(1, 6, 2);
        const lineTotal = Number(product.unit_price) * quantity;
        totalAmount += lineTotal;

        saleItemsPayload.push({
          org_id: ORG_ID,
          sale_id: saleId,
          product_id: product.id,
          product_name_snapshot: product.name,
          unit_price_snapshot: product.unit_price,
          quantity,
          line_total: Number(lineTotal.toFixed(2)),
        });
      });

      salesPayload.push({
        id: saleId,
        org_id: ORG_ID,
        branch_id: branchId,
        created_by: adminUserId,
        payment_method: 'cash',
        total_amount: Number(totalAmount.toFixed(2)),
        created_at: createdAt,
      });
    });
  }

  const { error: salesError } = await supabase
    .from('sales')
    .insert(salesPayload);
  if (salesError) throw salesError;

  const { error: saleItemsError } = await supabase
    .from('sale_items')
    .insert(saleItemsPayload);
  if (saleItemsError) throw saleItemsError;

  const { error: deleteOrderItemsError } = await supabase
    .from('supplier_order_items')
    .delete()
    .eq('org_id', ORG_ID)
    .in('product_id', demoProductIds);
  if (deleteOrderItemsError) throw deleteOrderItemsError;

  const { error: deleteOrdersError } = await supabase
    .from('supplier_orders')
    .delete()
    .eq('org_id', ORG_ID)
    .in(
      'supplier_id',
      suppliers.map((supplier) => supplier.id),
    );
  if (deleteOrdersError) throw deleteOrdersError;

  const orderSeeds = [
    { status: 'draft', daysAgo: 3 },
    { status: 'draft', daysAgo: 8 },
    { status: 'sent', daysAgo: 2 },
    { status: 'sent', daysAgo: 6 },
  ];

  const orderPayload = [];
  const orderItemsPayload = [];

  orderSeeds.forEach((seed, idx) => {
    const supplier = suppliers[idx % suppliers.length];
    const branchId = idx % 2 === 0 ? BRANCH_A : BRANCH_B;
    const orderId = randomUUID();
    const createdAt = daysAgo(seed.daysAgo, rand(8, 18), rand(0, 59));

    orderPayload.push({
      id: orderId,
      org_id: ORG_ID,
      branch_id: branchId,
      supplier_id: supplier.id,
      status: seed.status,
      notes: `Pedido demo ${seed.status}`,
      created_by: adminUserId,
      created_at: createdAt,
      sent_at: seed.status === 'sent' ? createdAt : null,
    });

    const supplierProducts = productsBySupplier.find(
      (entry) => entry.supplier.id === supplier.id,
    );
    const items = supplierProducts
      ? supplierProducts.products.slice(0, 5)
      : products.slice(0, 5);

    items.forEach((product) => {
      orderItemsPayload.push({
        id: randomUUID(),
        org_id: ORG_ID,
        order_id: orderId,
        product_id: product.id,
        ordered_qty: randFloat(2, 15, 2),
        received_qty: 0,
        unit_cost: 0,
      });
    });
  });

  const { error: ordersError } = await supabase
    .from('supplier_orders')
    .insert(orderPayload);
  if (ordersError) throw ordersError;

  const { error: orderItemsError } = await supabase
    .from('supplier_order_items')
    .insert(orderItemsPayload);
  if (orderItemsError) throw orderItemsError;

  console.log('Demo data seeded:');
  console.log('- Suppliers:', suppliers.length);
  console.log('- Products:', products.length);
  console.log('- Sales:', salesPayload.length);
  console.log('- Orders:', orderPayload.length);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
