const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_A = '22222222-2222-2222-2222-222222222222';
const SEED_ORDER_ID = '93000000-0000-0000-0000-000000000001';
const FALLBACK_SUPPLIER_ID = '93000000-0000-0000-0000-000000000010';

const SEED_SALES = [
  {
    sale_id: '90000000-0000-0000-0000-000000000001',
    payment_method_summary: 'card',
    item_lines: [
      '92000000-0000-0000-0000-000000000011',
      '92000000-0000-0000-0000-000000000012',
    ],
    payment_lines: [
      {
        line_id: '91000000-0000-0000-0000-000000000001',
        method: 'card',
        ratio: 1,
        device: 'posnet',
      },
    ],
  },
  {
    sale_id: '90000000-0000-0000-0000-000000000002',
    payment_method_summary: 'mercadopago',
    item_lines: [
      '92000000-0000-0000-0000-000000000021',
      '92000000-0000-0000-0000-000000000022',
    ],
    payment_lines: [
      {
        line_id: '91000000-0000-0000-0000-000000000002',
        method: 'mercadopago',
        ratio: 1,
        device: 'mercadopago',
      },
    ],
  },
  {
    sale_id: '90000000-0000-0000-0000-000000000003',
    payment_method_summary: 'mixed',
    item_lines: [
      '92000000-0000-0000-0000-000000000031',
      '92000000-0000-0000-0000-000000000032',
    ],
    payment_lines: [
      {
        line_id: '91000000-0000-0000-0000-000000000003',
        method: 'card',
        ratio: 0.4,
        device: 'mercadopago',
      },
      {
        line_id: '91000000-0000-0000-0000-000000000004',
        method: 'mercadopago',
        ratio: 0.6,
        device: 'mercadopago',
      },
    ],
  },
];

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

const roundCurrency = (value) => Math.round(value * 100) / 100;

const buildNowIso = (offsetMinutes = 0) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + offsetMinutes);
  return date.toISOString();
};

loadEnvFromFile('.env.local');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const asAdmin = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  const { error: loginError } = await asAdmin.auth.signInWithPassword({
    email: 'admin@demo.com',
    password: 'prueba123',
  });
  if (loginError) throw loginError;

  const { data: adminMembership, error: adminMembershipError } = await service
    .from('org_users')
    .select('user_id')
    .eq('org_id', ORG_ID)
    .eq('role', 'org_admin')
    .maybeSingle();
  if (adminMembershipError) throw adminMembershipError;
  if (!adminMembership?.user_id) {
    throw new Error('Org admin user not found');
  }
  const adminUserId = adminMembership.user_id;

  let sessionId = null;
  const { data: openSessionRows, error: openSessionError } = await service
    .from('cash_sessions')
    .select('id')
    .eq('org_id', ORG_ID)
    .eq('branch_id', BRANCH_A)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1);
  if (openSessionError) throw openSessionError;

  if (openSessionRows?.[0]?.id) {
    sessionId = openSessionRows[0].id;
  } else {
    const { data: openResult, error: openRpcError } = await asAdmin.rpc(
      'rpc_open_cash_session',
      {
        p_org_id: ORG_ID,
        p_branch_id: BRANCH_A,
        p_period_type: 'shift',
        p_session_label: 'AM',
        p_opened_controlled_by_name: 'Seed Admin',
        p_opening_drawer_count_lines: [
          { denomination_value: 20000, quantity: 2 },
          { denomination_value: 10000, quantity: 2 },
          { denomination_value: 1000, quantity: 5 },
        ],
        p_opening_reserve_count_lines: [
          { denomination_value: 20000, quantity: 1 },
          { denomination_value: 10000, quantity: 1 },
        ],
      },
    );
    if (openRpcError) throw openRpcError;
    sessionId = openResult?.[0]?.session_id ?? null;
  }

  if (!sessionId) {
    throw new Error('Failed to get/open cash session');
  }

  const { data: devices, error: devicesError } = await service
    .from('pos_payment_devices')
    .select('id, provider')
    .eq('org_id', ORG_ID)
    .eq('branch_id', BRANCH_A)
    .eq('is_active', true);
  if (devicesError) throw devicesError;

  const posnetDeviceId = (devices ?? []).find(
    (device) => device.provider === 'posnet',
  )?.id;
  const mercadopagoDeviceId = (devices ?? []).find(
    (device) => device.provider === 'mercadopago',
  )?.id;

  if (!posnetDeviceId || !mercadopagoDeviceId) {
    throw new Error('Missing active posnet/mercadopago devices in branch A');
  }

  const { data: products, error: productsError } = await service
    .from('products')
    .select('id, name, unit_price')
    .eq('org_id', ORG_ID)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(8);
  if (productsError) throw productsError;
  if (!products || products.length < 3) {
    throw new Error('Need at least 3 active products to seed sales/orders');
  }

  const { data: supplierProductsRows, error: supplierProductsError } =
    await service
      .from('supplier_products')
      .select('supplier_id, product_id')
      .eq('org_id', ORG_ID)
      .limit(500);
  if (supplierProductsError) throw supplierProductsError;
  if (!supplierProductsRows || supplierProductsRows.length === 0) {
    throw new Error('No supplier_products found. Run demo seed first.');
  }

  const supplierRowsBySupplier = new Map();
  supplierProductsRows.forEach((row) => {
    const key = row.supplier_id;
    const list = supplierRowsBySupplier.get(key) ?? [];
    list.push(row);
    supplierRowsBySupplier.set(key, list);
  });

  let selectedSupplierEntry = Array.from(supplierRowsBySupplier.values()).find(
    (rows) => rows.length >= 3,
  );
  if (!selectedSupplierEntry) {
    const { error: upsertFallbackSupplierError } = await service
      .from('suppliers')
      .upsert(
        {
          id: FALLBACK_SUPPLIER_ID,
          org_id: ORG_ID,
          name: 'Proveedor Seed Caja',
          contact_name: 'Seed Bot',
          is_active: true,
          order_frequency: 'weekly',
          order_day: 'mon',
          receive_day: 'tue',
          payment_terms_days: 7,
          preferred_payment_method: 'cash',
          accepts_cash: true,
          accepts_transfer: true,
          payment_note: 'Proveedor fallback para pruebas de caja',
        },
        { onConflict: 'id' },
      );
    if (upsertFallbackSupplierError) throw upsertFallbackSupplierError;

    const fallbackProductIds = products
      .slice(0, 3)
      .map((product) => product.id);
    const { error: upsertFallbackSupplierProductsError } = await service
      .from('supplier_products')
      .upsert(
        fallbackProductIds.map((productId, index) => ({
          org_id: ORG_ID,
          supplier_id: FALLBACK_SUPPLIER_ID,
          product_id: productId,
          supplier_sku: `SEED-CAJA-${index + 1}`,
          supplier_product_name: `Seed caja item ${index + 1}`,
          relation_type: 'primary',
        })),
        { onConflict: 'org_id,supplier_id,product_id' },
      );
    if (upsertFallbackSupplierProductsError) {
      throw upsertFallbackSupplierProductsError;
    }

    selectedSupplierEntry = fallbackProductIds.map((productId) => ({
      supplier_id: FALLBACK_SUPPLIER_ID,
      product_id: productId,
    }));
  }

  const selectedSupplierId = selectedSupplierEntry[0].supplier_id;

  const { data: supplierData, error: supplierDataError } = await service
    .from('suppliers')
    .select('name')
    .eq('org_id', ORG_ID)
    .eq('id', selectedSupplierId)
    .maybeSingle();
  if (supplierDataError) throw supplierDataError;
  const selectedSupplierName = supplierData?.name ?? 'Proveedor demo';

  const selectedProductIds = selectedSupplierEntry
    .slice(0, 3)
    .map((row) => row.product_id);
  const { data: productsForOrder, error: productsForOrderError } = await service
    .from('products')
    .select('id, unit_price')
    .eq('org_id', ORG_ID)
    .in('id', selectedProductIds);
  if (productsForOrderError) throw productsForOrderError;

  const unitPriceByProductId = new Map(
    (productsForOrder ?? []).map((row) => [
      row.id,
      Number(row.unit_price ?? 0),
    ]),
  );

  const orderItemsSource = selectedProductIds.map((productId, index) => ({
    order_item_id: `93100000-0000-0000-0000-00000000000${index + 1}`,
    product_id: productId,
    unit_cost: roundCurrency((unitPriceByProductId.get(productId) ?? 0) * 0.72),
    ordered_qty: index === 0 ? 8 : index === 1 ? 6 : 4,
  }));

  const seedOrderCreatedAt = buildNowIso(-20);
  const seedOrderSentAt = buildNowIso(-15);

  const { error: upsertSeedOrderError } = await service
    .from('supplier_orders')
    .upsert(
      {
        id: SEED_ORDER_ID,
        org_id: ORG_ID,
        branch_id: BRANCH_A,
        supplier_id: selectedSupplierId,
        status: 'sent',
        notes:
          'Seed caja hoy: pedido enviado con items para controlar en /orders',
        created_by: adminUserId,
        created_at: seedOrderCreatedAt,
        sent_at: seedOrderSentAt,
        received_at: null,
        reconciled_at: null,
        controlled_by_name: null,
        controlled_by_user_id: null,
      },
      { onConflict: 'id' },
    );
  if (upsertSeedOrderError) throw upsertSeedOrderError;

  const { error: deleteSeedOrderItemsError } = await service
    .from('supplier_order_items')
    .delete()
    .eq('org_id', ORG_ID)
    .eq('order_id', SEED_ORDER_ID);
  if (deleteSeedOrderItemsError) throw deleteSeedOrderItemsError;

  const { error: insertSeedOrderItemsError } = await service
    .from('supplier_order_items')
    .insert(
      orderItemsSource.map((item) => ({
        id: item.order_item_id,
        org_id: ORG_ID,
        order_id: SEED_ORDER_ID,
        product_id: item.product_id,
        ordered_qty: item.ordered_qty,
        received_qty: 0,
        unit_cost: item.unit_cost,
        created_at: seedOrderCreatedAt,
      })),
    );
  if (insertSeedOrderItemsError) throw insertSeedOrderItemsError;

  const itemsForSale = [
    {
      product_id: products[0].id,
      product_name_snapshot: products[0].name,
      unit_price_snapshot: Number(products[0].unit_price ?? 0),
      quantity: 1,
    },
    {
      product_id: products[1].id,
      product_name_snapshot: products[1].name,
      unit_price_snapshot: Number(products[1].unit_price ?? 0),
      quantity: 1,
    },
  ];

  const totalAmount = roundCurrency(
    itemsForSale.reduce(
      (acc, item) => acc + item.unit_price_snapshot * Number(item.quantity),
      0,
    ),
  );

  const saleIds = SEED_SALES.map((row) => row.sale_id);

  const { error: deleteSalePaymentsError } = await service
    .from('sale_payments')
    .delete()
    .eq('org_id', ORG_ID)
    .in('sale_id', saleIds);
  if (deleteSalePaymentsError) throw deleteSalePaymentsError;

  const { error: deleteSaleItemsError } = await service
    .from('sale_items')
    .delete()
    .eq('org_id', ORG_ID)
    .in('sale_id', saleIds);
  if (deleteSaleItemsError) throw deleteSaleItemsError;

  const salesPayload = SEED_SALES.map((seed, index) => ({
    id: seed.sale_id,
    org_id: ORG_ID,
    branch_id: BRANCH_A,
    created_by: adminUserId,
    payment_method: seed.payment_method_summary,
    subtotal_amount: totalAmount,
    discount_amount: 0,
    discount_pct: 0,
    total_amount: totalAmount,
    created_at: buildNowIso(0),
  }));

  const { error: upsertSalesError } = await service
    .from('sales')
    .upsert(salesPayload, { onConflict: 'id' });
  if (upsertSalesError) throw upsertSalesError;

  const saleItemsPayload = [];
  const salePaymentsPayload = [];

  SEED_SALES.forEach((seed) => {
    itemsForSale.forEach((item, itemIndex) => {
      saleItemsPayload.push({
        id: seed.item_lines[itemIndex],
        org_id: ORG_ID,
        sale_id: seed.sale_id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        unit_price_snapshot: item.unit_price_snapshot,
        quantity: item.quantity,
        line_total: roundCurrency(item.unit_price_snapshot * item.quantity),
      });
    });

    let assigned = 0;
    seed.payment_lines.forEach((line, index) => {
      const base = roundCurrency(totalAmount * line.ratio);
      const amount =
        index === seed.payment_lines.length - 1
          ? roundCurrency(totalAmount - assigned)
          : base;
      assigned = roundCurrency(assigned + amount);

      salePaymentsPayload.push({
        id: line.line_id,
        org_id: ORG_ID,
        sale_id: seed.sale_id,
        payment_method: line.method,
        amount,
        payment_device_id:
          line.device === 'posnet' ? posnetDeviceId : mercadopagoDeviceId,
        created_at: buildNowIso(0),
      });
    });
  });

  const { error: insertSaleItemsError } = await service
    .from('sale_items')
    .insert(saleItemsPayload);
  if (insertSaleItemsError) throw insertSaleItemsError;

  const { error: insertSalePaymentsError } = await service
    .from('sale_payments')
    .insert(salePaymentsPayload);
  if (insertSalePaymentsError) throw insertSalePaymentsError;

  const { data: payableRows, error: payableRowsError } = await service
    .from('v_supplier_payables_admin')
    .select('payable_id, order_id, supplier_name, created_at')
    .eq('org_id', ORG_ID)
    .eq('branch_id', BRANCH_A)
    .eq('order_status', 'reconciled')
    .order('created_at', { ascending: false })
    .limit(1);
  if (payableRowsError) throw payableRowsError;
  if (!payableRows?.[0]) {
    throw new Error('No reconciled payable found in branch A');
  }

  const payable = payableRows[0];
  const todayIsoDate = new Date().toISOString().slice(0, 10);

  const { error: updatePayableError } = await asAdmin.rpc(
    'rpc_update_supplier_payable',
    {
      p_org_id: ORG_ID,
      p_payable_id: payable.payable_id,
      p_invoice_amount: 12000,
      p_due_on: todayIsoDate,
      p_invoice_reference: 'FAC-CAJA-HOY-001',
      p_invoice_note:
        'Seed caja hoy: pedido controlado con pago efectivo de prueba',
      p_selected_payment_method: 'cash',
    },
  );
  if (updatePayableError) throw updatePayableError;

  const { data: existingSeedPayments, error: existingSeedPaymentsError } =
    await service
      .from('supplier_payments')
      .select('id')
      .eq('org_id', ORG_ID)
      .eq('payable_id', payable.payable_id)
      .eq('reference', 'SEED-CAJA-HOY')
      .gte('paid_at', `${todayIsoDate}T00:00:00.000Z`)
      .lte('paid_at', `${todayIsoDate}T23:59:59.999Z`)
      .limit(1);
  if (existingSeedPaymentsError) throw existingSeedPaymentsError;

  if ((existingSeedPayments ?? []).length === 0) {
    const { error: registerPaymentError } = await asAdmin.rpc(
      'rpc_register_supplier_payment',
      {
        p_org_id: ORG_ID,
        p_payable_id: payable.payable_id,
        p_amount: 3000,
        p_payment_method: 'cash',
        p_paid_at: new Date().toISOString(),
        p_transfer_account_id: null,
        p_reference: 'SEED-CAJA-HOY',
        p_note: 'Seed caja hoy - pago efectivo pedido reconciliado',
      },
    );
    if (registerPaymentError) throw registerPaymentError;
  }

  const { data: reconciliationRows, error: reconciliationRowsError } =
    await asAdmin.rpc('rpc_get_cash_session_reconciliation_rows', {
      p_org_id: ORG_ID,
      p_session_id: sessionId,
    });
  if (reconciliationRowsError) throw reconciliationRowsError;

  console.log('Cashbox today seed ready:');
  console.log(`- Session: ${sessionId}`);
  console.log(`- Seed sales upserted: ${SEED_SALES.length}`);
  console.log(
    `- Seed order ready to control: ${SEED_ORDER_ID} (${selectedSupplierName})`,
  );
  console.log(`- Reconciliation rows: ${(reconciliationRows ?? []).length}`);
  console.log(
    `- MercadoPago total: ${
      (reconciliationRows ?? []).find(
        (row) => row.row_key === 'mercadopago_total',
      )?.system_amount ?? 0
    }`,
  );
  console.log(`- Payable for supplier cash payment: ${payable.payable_id}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
