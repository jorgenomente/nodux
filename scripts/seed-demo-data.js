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
const roundCurrency = (value) => Number(value.toFixed(2));

const suppliersSeed = [
  {
    name: 'Cafes del Puerto SRL',
    contact_name: 'Lucia Herrera',
    phone: '1145872210',
    email: 'compras@cafesdelpuerto.com.ar',
    notes: 'Tostadero para cafeterias de especialidad',
    order_frequency: 'weekly',
    order_day: 'mon',
    receive_day: 'tue',
    payment_terms_days: 7,
    preferred_payment_method: 'transfer',
    accepts_cash: false,
    accepts_transfer: true,
    payment_note: 'Transferencia a Cta Cte Banco Galicia',
  },
  {
    name: 'Yerbatera La Colina SA',
    contact_name: 'Diego Alvarez',
    phone: '1138016642',
    email: 'ventas@lacolina.com.ar',
    notes: 'Distribucion mayorista de yerbas y mate cocido',
    order_frequency: 'biweekly',
    order_day: 'wed',
    receive_day: 'thu',
    payment_terms_days: 15,
    preferred_payment_method: 'cash',
    accepts_cash: true,
    accepts_transfer: true,
    payment_note: 'Acepta pago contra entrega en sucursal',
  },
  {
    name: 'Dulces del Litoral SAS',
    contact_name: 'Paula Benitez',
    phone: '1122967701',
    email: 'facturacion@dulceslitoral.com.ar',
    notes: 'Chocolates y dulces en presentacion minorista',
    order_frequency: 'monthly',
    order_day: 'fri',
    receive_day: 'sat',
    payment_terms_days: 30,
    preferred_payment_method: 'transfer',
    accepts_cash: false,
    accepts_transfer: true,
    payment_note: 'Transferencia 72h antes del vencimiento',
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

const demoProductCatalogBySupplier = [
  {
    prefix: 'CDP',
    items: [
      {
        name: 'Cafe blend barista 1kg',
        base_price: 12900,
        shelf_life_days: 240,
      },
      {
        name: 'Cafe blend desayuno 500g',
        base_price: 7600,
        shelf_life_days: 210,
      },
      {
        name: 'Cafe molido Colombia 250g',
        base_price: 5900,
        shelf_life_days: 180,
      },
      {
        name: 'Cafe en grano Brasil 1kg',
        base_price: 11800,
        shelf_life_days: 240,
      },
      {
        name: 'Cafe descafeinado 500g',
        base_price: 8400,
        shelf_life_days: 220,
      },
      {
        name: 'Capsulas espresso caja x10',
        base_price: 4300,
        shelf_life_days: 300,
      },
      { name: 'Azucar mascabo 1kg', base_price: 3100, shelf_life_days: 365 },
      {
        name: 'Endulzante stevia 250ml',
        base_price: 2600,
        shelf_life_days: 365,
      },
      { name: 'Leche de almendras 1L', base_price: 4100, shelf_life_days: 120 },
      { name: 'Sirope vainilla 750ml', base_price: 6700, shelf_life_days: 300 },
    ],
  },
  {
    prefix: 'YLC',
    items: [
      { name: 'Yerba tradicional 1kg', base_price: 4600, shelf_life_days: 365 },
      { name: 'Yerba suave 1kg', base_price: 4900, shelf_life_days: 365 },
      {
        name: 'Yerba con hierbas 500g',
        base_price: 2800,
        shelf_life_days: 365,
      },
      { name: 'Yerba premium 500g', base_price: 3600, shelf_life_days: 365 },
      { name: 'Mate cocido caja x25', base_price: 2100, shelf_life_days: 420 },
      { name: 'Te negro hebras 100g', base_price: 2200, shelf_life_days: 365 },
      { name: 'Te verde hebras 100g', base_price: 2400, shelf_life_days: 365 },
      {
        name: 'Bombilla acero clasica',
        base_price: 3900,
        shelf_life_days: 999,
      },
      { name: 'Mate vidrio forrado', base_price: 7100, shelf_life_days: 999 },
      { name: 'Termo inoxidable 1L', base_price: 17800, shelf_life_days: 999 },
    ],
  },
  {
    prefix: 'DDL',
    items: [
      {
        name: 'Chocolate amargo 70 por ciento 100g',
        base_price: 4100,
        shelf_life_days: 330,
      },
      {
        name: 'Chocolate con leche 100g',
        base_price: 3700,
        shelf_life_days: 300,
      },
      { name: 'Chocolate blanco 100g', base_price: 3900, shelf_life_days: 300 },
      {
        name: 'Alfajor chocolate negro',
        base_price: 1800,
        shelf_life_days: 180,
      },
      {
        name: 'Alfajor chocolate blanco',
        base_price: 1800,
        shelf_life_days: 180,
      },
      {
        name: 'Dulce de leche clasico 450g',
        base_price: 3200,
        shelf_life_days: 240,
      },
      {
        name: 'Mermelada frutilla 454g',
        base_price: 2900,
        shelf_life_days: 270,
      },
      {
        name: 'Mermelada frutos rojos 454g',
        base_price: 3200,
        shelf_life_days: 270,
      },
      {
        name: 'Galletitas de manteca 150g',
        base_price: 2300,
        shelf_life_days: 150,
      },
      { name: 'Granola crocante 350g', base_price: 5100, shelf_life_days: 180 },
    ],
  },
];

const buildProducts = (supplierIndex) => {
  const catalog = demoProductCatalogBySupplier[supplierIndex];
  if (!catalog) return [];

  return catalog.items.map((item, idx) => {
    const suffix = String(idx + 1).padStart(2, '0');
    const jitter = randFloat(-0.08, 0.08, 2);
    return {
      name: item.name,
      internal_code: `${catalog.prefix}-${suffix}`,
      barcode: `7792${supplierIndex + 1}${suffix}${rand(1000, 9999)}`,
      sell_unit_type: 'unit',
      uom: 'unit',
      unit_price: Number((item.base_price * (1 + jitter)).toFixed(2)),
      shelf_life_days: item.shelf_life_days,
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
    contact_name: supplier.contact_name,
    phone: supplier.phone,
    email: supplier.email,
    notes: supplier.notes,
    is_active: true,
    order_frequency: supplier.order_frequency,
    order_day: supplier.order_day,
    receive_day: supplier.receive_day,
    payment_terms_days: supplier.payment_terms_days,
    preferred_payment_method: supplier.preferred_payment_method,
    accepts_cash: supplier.accepts_cash,
    accepts_transfer: supplier.accepts_transfer,
    payment_note: supplier.payment_note,
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
    payment_terms_days: 7,
    preferred_payment_method: 'transfer',
    accepts_cash: true,
    accepts_transfer: true,
    payment_note: 'Cuenta de pruebas smoke',
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
    {
      status: 'draft',
      daysAgo: 1,
      expectedReceiveOffsetDays: 2,
      note: 'Reposicion de granos para barra',
    },
    {
      status: 'draft',
      daysAgo: 5,
      expectedReceiveOffsetDays: 7,
      note: 'Pedido base para gondola de yerbas',
    },
    {
      status: 'sent',
      daysAgo: 2,
      expectedReceiveOffsetDays: 4,
      note: 'Pedido enviado para chocolates fin de semana',
    },
    {
      status: 'sent',
      daysAgo: 7,
      expectedReceiveOffsetDays: -1,
      note: 'Pedido demorado por logistica',
    },
    {
      status: 'sent',
      daysAgo: 3,
      expectedReceiveOffsetDays: 1,
      note: 'Pedido enviado pendiente de pago por transferencia',
    },
    {
      status: 'sent',
      daysAgo: 11,
      expectedReceiveOffsetDays: -2,
      note: 'Pedido enviado con fecha de recepcion vencida',
    },
    {
      status: 'received',
      daysAgo: 4,
      expectedReceiveOffsetDays: 0,
      note: 'Recepcion parcial de insumos de cafeteria',
    },
    {
      status: 'reconciled',
      daysAgo: 9,
      expectedReceiveOffsetDays: -3,
      note: 'Pedido controlado y listo para pago total',
    },
    {
      status: 'reconciled',
      daysAgo: 13,
      expectedReceiveOffsetDays: -8,
      note: 'Pedido controlado con vencimiento ya superado',
    },
    {
      status: 'received',
      daysAgo: 6,
      expectedReceiveOffsetDays: -2,
      note: 'Recepcion reciente pendiente de completar pago',
    },
    {
      status: 'received',
      daysAgo: 8,
      expectedReceiveOffsetDays: -1,
      note: 'Recepcion completa con pago transfer pendiente',
    },
    {
      status: 'reconciled',
      daysAgo: 15,
      expectedReceiveOffsetDays: -9,
      note: 'Controlado historico con saldo pendiente',
    },
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
      notes: seed.note,
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
          ? Math.max(orderedQty + rand(-2, 1), 1)
          : 0;
      const baseUnitCost =
        Number(product.unit_price ?? 0) * randFloat(0.5, 0.82, 2);
      orderItemsPayload.push({
        id: randomUUID(),
        org_id: ORG_ID,
        order_id: orderId,
        product_id: product.id,
        ordered_qty: orderedQty,
        received_qty: receivedQty,
        unit_cost: roundCurrency(baseUnitCost),
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

  const { data: existingPaymentAccounts, error: existingPaymentAccountsError } =
    await supabase
      .from('supplier_payment_accounts')
      .select('id, supplier_id')
      .eq('org_id', ORG_ID)
      .in(
        'supplier_id',
        suppliers.map((supplier) => supplier.id),
      )
      .order('created_at', { ascending: true });
  if (existingPaymentAccountsError) throw existingPaymentAccountsError;

  const accountIdBySupplierSeed = new Map();
  (existingPaymentAccounts ?? []).forEach((account) => {
    if (!accountIdBySupplierSeed.has(account.supplier_id)) {
      accountIdBySupplierSeed.set(account.supplier_id, account.id);
    }
  });

  const paymentAccountsSeed = suppliers.map((supplier, idx) => ({
    id: accountIdBySupplierSeed.get(supplier.id) ?? randomUUID(),
    org_id: ORG_ID,
    supplier_id: supplier.id,
    account_label: `Cuenta principal ${supplier.name}`,
    bank_name: ['Banco Galicia', 'Banco Nacion', 'Banco Santander'][idx % 3],
    account_holder_name: supplier.name,
    account_identifier: `ALIAS.${supplier.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}.${idx + 1}`,
    is_active: true,
    created_by: adminUserId,
    updated_by: adminUserId,
  }));

  const { error: paymentAccountsError } = await supabase
    .from('supplier_payment_accounts')
    .upsert(paymentAccountsSeed, {
      onConflict: 'id',
    });
  if (paymentAccountsError) throw paymentAccountsError;

  const { data: paymentAccountsData, error: paymentAccountsQueryError } =
    await supabase
      .from('supplier_payment_accounts')
      .select('id, supplier_id')
      .eq('org_id', ORG_ID)
      .in(
        'supplier_id',
        suppliers.map((supplier) => supplier.id),
      )
      .eq('is_active', true);
  if (paymentAccountsQueryError) throw paymentAccountsQueryError;

  const accountIdBySupplierId = new Map(
    (paymentAccountsData ?? []).map((account) => [
      account.supplier_id,
      account.id,
    ]),
  );

  const { data: payablesData, error: payablesError } = await supabase
    .from('supplier_payables')
    .select('id, order_id, supplier_id, branch_id, estimated_amount')
    .eq('org_id', ORG_ID)
    .in(
      'supplier_id',
      suppliers.map((supplier) => supplier.id),
    )
    .order('created_at', { ascending: true });
  if (payablesError) throw payablesError;

  const payableScenarios = [
    {
      invoiceMultiplier: 1.02,
      dueOffsetDays: -2,
      status: 'pending',
      method: 'transfer',
      note: 'Pendiente por transferencia vencida',
      paymentSlices: [],
    },
    {
      invoiceMultiplier: 1.01,
      dueOffsetDays: 1,
      status: 'pending',
      method: 'transfer',
      note: 'Pendiente por transferencia con vencimiento inmediato',
      paymentSlices: [],
    },
    {
      invoiceMultiplier: 1.04,
      dueOffsetDays: 5,
      status: 'pending',
      method: 'transfer',
      note: 'Pendiente por transferencia a 5 dias',
      paymentSlices: [],
    },
    {
      invoiceMultiplier: 1.01,
      dueOffsetDays: 2,
      status: 'partial',
      method: 'transfer',
      note: 'Pago parcial via transferencia',
      paymentSlices: [0.4],
    },
    {
      invoiceMultiplier: 1.0,
      dueOffsetDays: 4,
      status: 'partial',
      method: 'cash',
      note: 'Pago parcial en efectivo',
      paymentSlices: [0.5],
    },
    {
      invoiceMultiplier: 1.0,
      dueOffsetDays: 12,
      status: 'paid',
      method: 'transfer',
      note: 'Pago completo por transferencia',
      paymentSlices: [0.5, 0.5],
    },
    {
      invoiceMultiplier: 0.98,
      dueOffsetDays: -4,
      status: 'paid',
      method: 'cash',
      note: 'Factura cerrada en efectivo',
      paymentSlices: [1],
    },
  ];

  const supplierPaymentsPayload = [];
  for (let idx = 0; idx < (payablesData ?? []).length; idx += 1) {
    const payable = payablesData[idx];
    const scenario = payableScenarios[idx % payableScenarios.length];
    const invoiceAmount = roundCurrency(
      Number(payable.estimated_amount ?? 0) * scenario.invoiceMultiplier,
    );
    const paidAmount =
      scenario.status === 'pending'
        ? 0
        : scenario.status === 'partial'
          ? roundCurrency(invoiceAmount * scenario.paymentSlices[0])
          : invoiceAmount;
    const outstandingAmount = roundCurrency(
      Math.max(invoiceAmount - paidAmount, 0),
    );
    const payableStatus =
      outstandingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

    const { error: payableUpdateError } = await supabase
      .from('supplier_payables')
      .update({
        invoice_amount: invoiceAmount,
        due_on: isoDateFromOffset(scenario.dueOffsetDays),
        invoice_reference:
          scenario.method === 'transfer'
            ? `FAC-T-${String(idx + 1).padStart(4, '0')}`
            : `REM-C-${String(idx + 1).padStart(4, '0')}`,
        selected_payment_method: scenario.method,
        invoice_note: scenario.note,
        paid_amount: paidAmount,
        outstanding_amount: outstandingAmount,
        status: payableStatus,
        paid_at: payableStatus === 'paid' ? daysAgo(rand(0, 2), 11, 30) : null,
        updated_by: adminUserId,
      })
      .eq('id', payable.id)
      .eq('org_id', ORG_ID);
    if (payableUpdateError) throw payableUpdateError;

    if (paidAmount <= 0) continue;

    let remaining = paidAmount;
    scenario.paymentSlices.forEach((slice, paymentIdx) => {
      const amount =
        paymentIdx === scenario.paymentSlices.length - 1
          ? roundCurrency(remaining)
          : roundCurrency(paidAmount * slice);
      remaining = roundCurrency(Math.max(remaining - amount, 0));

      supplierPaymentsPayload.push({
        org_id: ORG_ID,
        branch_id: payable.branch_id,
        supplier_id: payable.supplier_id,
        payable_id: payable.id,
        order_id: payable.order_id,
        payment_method: scenario.method,
        transfer_account_id:
          scenario.method === 'transfer'
            ? (accountIdBySupplierId.get(payable.supplier_id) ?? null)
            : null,
        amount,
        paid_at: daysAgo(rand(0, 5), 10 + paymentIdx, rand(0, 59)),
        reference:
          scenario.method === 'transfer'
            ? `TRX-${String(idx + 1).padStart(3, '0')}-${paymentIdx + 1}`
            : `CAJA-${String(idx + 1).padStart(3, '0')}`,
        note: scenario.note,
        created_by: adminUserId,
      });
    });
  }

  if (supplierPaymentsPayload.length > 0) {
    const { error: supplierPaymentsError } = await supabase
      .from('supplier_payments')
      .insert(supplierPaymentsPayload);
    if (supplierPaymentsError) throw supplierPaymentsError;
  }

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
