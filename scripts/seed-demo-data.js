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

const suppliersSmoke = [
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Distribuidora Cafe Real',
    order_frequency: 'weekly',
    order_day: 'mon',
    receive_day: 'tue',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Yerba y Afines Norte',
    order_frequency: 'biweekly',
    order_day: 'wed',
    receive_day: 'thu',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Dulces del Litoral',
    order_frequency: 'monthly',
    order_day: 'fri',
    receive_day: 'sat',
  },
];

const smokeProducts = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    name: 'Cafe Molido 500g',
    internal_code: 'SMOKE-CAFE-500',
    barcode: '7790001000011',
    unit_price: 5500,
    shelf_life_days: 180,
    supplier_id: suppliersSmoke[0].id,
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    name: 'Cafe en Granos 1kg',
    internal_code: 'SMOKE-CAFE-1K',
    barcode: '7790001000028',
    unit_price: 11200,
    shelf_life_days: 240,
    supplier_id: suppliersSmoke[0].id,
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    name: 'Yerba Mate 1kg',
    internal_code: 'SMOKE-MATE-1K',
    barcode: '7790002000018',
    unit_price: 4200,
    shelf_life_days: 365,
    supplier_id: suppliersSmoke[1].id,
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    name: 'Yerba Mate Suave 500g',
    internal_code: 'SMOKE-MATE-500',
    barcode: '7790002000025',
    unit_price: 2500,
    shelf_life_days: 365,
    supplier_id: suppliersSmoke[1].id,
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    name: 'Chocolate Amargo 70%',
    internal_code: 'SMOKE-CHOCO-70',
    barcode: '7790003000015',
    unit_price: 3800,
    shelf_life_days: 365,
    supplier_id: suppliersSmoke[2].id,
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-ccccccccccc2',
    name: 'Chocolate con Leche 100g',
    internal_code: 'SMOKE-CHOCO-ML',
    barcode: '7790003000022',
    unit_price: 2600,
    shelf_life_days: 300,
    supplier_id: suppliersSmoke[2].id,
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

const isoDateFromOffset = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
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

  const smokeSuppliers = suppliersSmoke.map((supplier) => ({
    id: supplier.id,
    org_id: ORG_ID,
    name: supplier.name,
    contact_name: 'Contacto Smoke',
    phone: '1133445566',
    email: 'smoke@proveedor.com',
    notes: 'Proveedor smoke test',
    is_active: true,
    order_frequency: supplier.order_frequency,
    order_day: supplier.order_day,
    receive_day: supplier.receive_day,
  }));

  const { error: supplierError } = await supabase
    .from('suppliers')
    .upsert([...suppliers, ...smokeSuppliers], { onConflict: 'id' });
  if (supplierError) throw supplierError;

  const productsSeed = suppliers.flatMap((supplier, idx) =>
    buildProducts(idx).map((product) => ({
      ...product,
      org_id: ORG_ID,
      supplier_id: supplier.id,
    })),
  );

  const smokeProductsSeed = smokeProducts.map((product) => ({
    id: product.id,
    org_id: ORG_ID,
    name: product.name,
    internal_code: product.internal_code,
    barcode: product.barcode,
    sell_unit_type: 'unit',
    uom: 'unit',
    unit_price: product.unit_price,
    shelf_life_days: product.shelf_life_days,
    is_active: true,
  }));

  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, internal_code')
    .eq('org_id', ORG_ID)
    .in(
      'internal_code',
      [...productsSeed, ...smokeProductsSeed].map(
        (product) => product.internal_code,
      ),
    );

  const productIdByCode = new Map(
    (existingProducts ?? []).map((row) => [row.internal_code, row.id]),
  );

  const products = [...productsSeed, ...smokeProductsSeed].map((product) => ({
    id:
      productIdByCode.get(product.internal_code) ?? product.id ?? randomUUID(),
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

  const productIdByInternalCode = new Map(
    products.map((product) => [product.internal_code, product.id]),
  );

  const productsBySupplier = suppliers.map((supplier, idx) => ({
    supplier,
    products: products.filter((product) =>
      product.internal_code.startsWith(`DEMO-S${idx + 1}`),
    ),
  }));

  const smokeProductsBySupplier = suppliersSmoke.map((supplier) => ({
    supplier,
    products: products.filter(
      (product) =>
        product.internal_code.startsWith('SMOKE-') &&
        smokeProducts.some(
          (seed) =>
            seed.internal_code === product.internal_code &&
            seed.supplier_id === supplier.id,
        ),
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

  const smokeSupplierProducts = smokeProductsBySupplier.flatMap((entry) =>
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
    .upsert([...supplierProducts, ...smokeSupplierProducts], {
      onConflict: 'org_id,supplier_id,product_id',
    });
  if (supplierProductsError) throw supplierProductsError;

  const stockItems = products.flatMap((product) => [
    {
      org_id: ORG_ID,
      branch_id: BRANCH_A,
      product_id: product.id,
      quantity_on_hand: product.internal_code.startsWith('SMOKE-')
        ? rand(10, 40)
        : rand(-5, 60),
      safety_stock: rand(5, 15),
    },
    {
      org_id: ORG_ID,
      branch_id: BRANCH_B,
      product_id: product.id,
      quantity_on_hand: product.internal_code.startsWith('SMOKE-')
        ? rand(10, 40)
        : rand(-5, 60),
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
    { status: 'draft', daysAgo: 3, expectedReceiveOffsetDays: 2 },
    { status: 'draft', daysAgo: 8, expectedReceiveOffsetDays: 6 },
    { status: 'sent', daysAgo: 2, expectedReceiveOffsetDays: 3 },
    { status: 'sent', daysAgo: 10, expectedReceiveOffsetDays: -1 },
    { status: 'received', daysAgo: 6, expectedReceiveOffsetDays: 0 },
    { status: 'reconciled', daysAgo: 12, expectedReceiveOffsetDays: -4 },
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
      sent_at:
        seed.status === 'sent' ||
        seed.status === 'received' ||
        seed.status === 'reconciled'
          ? createdAt
          : null,
      received_at:
        seed.status === 'received' || seed.status === 'reconciled'
          ? daysAgo(Math.max(seed.daysAgo - 1, 0), 13, rand(0, 59))
          : null,
      reconciled_at:
        seed.status === 'reconciled'
          ? daysAgo(Math.max(seed.daysAgo - 1, 0), 14, rand(0, 59))
          : null,
      controlled_by_name: seed.status === 'reconciled' ? 'Admin Demo' : null,
      controlled_by_user_id: seed.status === 'reconciled' ? adminUserId : null,
      expected_receive_on: isoDateFromOffset(seed.expectedReceiveOffsetDays),
    });

    const supplierProducts = productsBySupplier.find(
      (entry) => entry.supplier.id === supplier.id,
    );
    const items = supplierProducts
      ? supplierProducts.products.slice(0, 5)
      : products.slice(0, 5);

    items.forEach((product) => {
      const orderedQty = rand(2, 15);
      const receivedQty =
        seed.status === 'received' || seed.status === 'reconciled'
          ? orderedQty
          : 0;
      orderItemsPayload.push({
        id: randomUUID(),
        org_id: ORG_ID,
        order_id: orderId,
        product_id: product.id,
        ordered_qty: orderedQty,
        received_qty: receivedQty,
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

  const { error: deleteExpirationBatchesError } = await supabase
    .from('expiration_batches')
    .delete()
    .eq('org_id', ORG_ID)
    .in('product_id', demoProductIds);
  if (deleteExpirationBatchesError) throw deleteExpirationBatchesError;

  const expirationProductsA = smokeProducts
    .slice(0, 3)
    .map((product) => productIdByInternalCode.get(product.internal_code))
    .filter(Boolean);
  const expirationProductsB = smokeProducts
    .slice(3, 6)
    .map((product) => productIdByInternalCode.get(product.internal_code))
    .filter(Boolean);

  const expirationBatchesPayload = [
    ...expirationProductsA.map((productId, idx) => ({
      id: randomUUID(),
      org_id: ORG_ID,
      branch_id: BRANCH_A,
      product_id: productId,
      expires_on: isoDateFromOffset([-2, 2, 7][idx] ?? 10),
      quantity: rand(3, 12),
      source_type: 'seed_demo',
      batch_code: `SEED-A-${idx + 1}`,
    })),
    ...expirationProductsB.map((productId, idx) => ({
      id: randomUUID(),
      org_id: ORG_ID,
      branch_id: BRANCH_B,
      product_id: productId,
      expires_on: isoDateFromOffset([-1, 3, 9][idx] ?? 12),
      quantity: rand(3, 12),
      source_type: 'seed_demo',
      batch_code: `SEED-B-${idx + 1}`,
    })),
  ];

  if (expirationBatchesPayload.length > 0) {
    const { error: expirationBatchesError } = await supabase
      .from('expiration_batches')
      .insert(expirationBatchesPayload);
    if (expirationBatchesError) throw expirationBatchesError;
  }

  const clientsSeed = [
    {
      id: '77777777-7777-7777-7777-777777777777',
      name: 'Juan Perez',
      phone: '1130001111',
      email: 'juan.perez@demo.com',
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      name: 'Maria Gomez',
      phone: '1130002222',
      email: 'maria.gomez@demo.com',
    },
  ];

  const { error: clientsError } = await supabase.from('clients').upsert(
    clientsSeed.map((client) => ({
      id: client.id,
      org_id: ORG_ID,
      name: client.name,
      phone: client.phone,
      email: client.email,
      notes: 'Cliente smoke test',
      is_active: true,
    })),
    { onConflict: 'id' },
  );
  if (clientsError) throw clientsError;

  const specialOrdersSeed = [
    {
      id: '99999999-9999-9999-9999-999999999999',
      client_id: clientsSeed[0].id,
      branch_id: BRANCH_A,
      notes: 'Pedido de cafe y yerba',
      status: 'pending',
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
      client_id: clientsSeed[1].id,
      branch_id: BRANCH_B,
      notes: 'Pedido de chocolates',
      status: 'ordered',
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
      client_id: clientsSeed[0].id,
      branch_id: BRANCH_A,
      notes: 'Pedido parcial de chocolates',
      status: 'partial',
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad',
      client_id: clientsSeed[1].id,
      branch_id: BRANCH_B,
      notes: 'Pedido entregado de cafe',
      status: 'delivered',
    },
  ];

  const { error: specialOrdersError } = await supabase
    .from('client_special_orders')
    .upsert(
      specialOrdersSeed.map((order) => ({
        id: order.id,
        org_id: ORG_ID,
        branch_id: order.branch_id,
        client_id: order.client_id,
        description: order.notes,
        quantity: null,
        status: order.status,
        created_by: adminUserId,
        notes: order.notes,
      })),
      { onConflict: 'id' },
    );
  if (specialOrdersError) throw specialOrdersError;

  const specialOrderItemsSeed = [
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
      special_order_id: specialOrdersSeed[0].id,
      product_id: productIdByInternalCode.get('SMOKE-CAFE-500'),
      requested_qty: 2,
      supplier_id: suppliersSmoke[0].id,
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
      special_order_id: specialOrdersSeed[0].id,
      product_id: productIdByInternalCode.get('SMOKE-MATE-1K'),
      requested_qty: 1,
      supplier_id: suppliersSmoke[1].id,
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
      special_order_id: specialOrdersSeed[1].id,
      product_id: productIdByInternalCode.get('SMOKE-CHOCO-70'),
      requested_qty: 3,
      supplier_id: suppliersSmoke[2].id,
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6',
      special_order_id: specialOrdersSeed[2].id,
      product_id: productIdByInternalCode.get('SMOKE-CHOCO-ML'),
      requested_qty: 4,
      supplier_id: suppliersSmoke[2].id,
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7',
      special_order_id: specialOrdersSeed[3].id,
      product_id: productIdByInternalCode.get('SMOKE-CAFE-1K'),
      requested_qty: 1,
      supplier_id: suppliersSmoke[0].id,
    },
  ];

  const { error: specialOrderItemsError } = await supabase
    .from('client_special_order_items')
    .upsert(
      specialOrderItemsSeed
        .filter((item) => item.product_id)
        .map((item) => ({
          id: item.id,
          org_id: ORG_ID,
          special_order_id: item.special_order_id,
          product_id: item.product_id,
          supplier_id: item.supplier_id,
          requested_qty: item.requested_qty,
          fulfilled_qty:
            item.special_order_id === specialOrdersSeed[2].id
              ? item.requested_qty - 1
              : item.special_order_id === specialOrdersSeed[3].id
                ? item.requested_qty
                : 0,
          is_ordered:
            item.special_order_id === specialOrdersSeed[1].id ||
            item.special_order_id === specialOrdersSeed[2].id ||
            item.special_order_id === specialOrdersSeed[3].id,
          ordered_at:
            item.special_order_id === specialOrdersSeed[1].id ||
            item.special_order_id === specialOrdersSeed[2].id ||
            item.special_order_id === specialOrdersSeed[3].id
              ? daysAgo(2, 11, 30)
              : null,
        })),
      { onConflict: 'org_id,special_order_id,product_id' },
    );
  if (specialOrderItemsError) throw specialOrderItemsError;

  console.log('Demo data seeded:');
  console.log('- Suppliers:', suppliers.length);
  console.log('- Products:', products.length);
  console.log('- Smoke suppliers:', suppliersSmoke.length);
  console.log('- Smoke products:', smokeProducts.length);
  console.log('- Smoke clients:', clientsSeed.length);
  console.log('- Smoke special orders:', specialOrdersSeed.length);
  console.log('- Expiration batches:', expirationBatchesPayload.length);
  console.log('- Sales:', salesPayload.length);
  console.log('- Orders:', orderPayload.length);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
