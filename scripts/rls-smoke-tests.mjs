import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const STAFF_EMAIL = 'staff@demo.com';
const ADMIN_EMAIL = 'admin@demo.com';
const SUPERADMIN_EMAIL = 'superadmin@demo.com';
const DEMO_PASSWORD = 'prueba123';

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

const assertOk = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`OK: ${message}`);
};

const expectDenied = (error, label) => {
  const payload = `${error?.message ?? ''} ${error?.code ?? ''}`.toLowerCase();
  const denied =
    payload.includes('not authorized') ||
    payload.includes('row-level security') ||
    payload.includes('permission denied') ||
    payload.includes('42501');

  assertOk(denied, label);
};

const signInClient = async (supabaseUrl, anonKey, email, password) => {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Login failed for ${email}: ${error.message}`);
  }

  return client;
};

loadEnvFromFile('.env.local');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(
    'Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let insertedProductId = null;
let insertedProductCode = null;

try {
  const staffClient = await signInClient(
    supabaseUrl,
    anonKey,
    STAFF_EMAIL,
    DEMO_PASSWORD,
  );
  const adminClient = await signInClient(
    supabaseUrl,
    anonKey,
    ADMIN_EMAIL,
    DEMO_PASSWORD,
  );
  const superadminClient = await signInClient(
    supabaseUrl,
    anonKey,
    SUPERADMIN_EMAIL,
    DEMO_PASSWORD,
  );

  const { data: staffProducts, error: staffProductsError } = await staffClient
    .from('products')
    .select('id')
    .eq('org_id', ORG_ID)
    .limit(1);

  assertOk(
    !staffProductsError &&
      Array.isArray(staffProducts) &&
      staffProducts.length > 0,
    'staff puede leer products de su org',
  );

  const deniedCode = `RLS-DENY-${Date.now()}`;
  const { error: staffInsertError } = await staffClient
    .from('products')
    .insert({
      org_id: ORG_ID,
      name: 'RLS Denied Product',
      internal_code: deniedCode,
      sell_unit_type: 'unit',
      uom: 'unit',
      unit_price: 1,
    });
  assertOk(Boolean(staffInsertError), 'staff no puede crear products');
  expectDenied(
    staffInsertError,
    'staff insert en products denegado por permisos',
  );

  insertedProductCode = `RLS-ALLOW-${Date.now()}`;
  const { data: adminInsertData, error: adminInsertError } = await adminClient
    .from('products')
    .insert({
      org_id: ORG_ID,
      name: 'RLS Allowed Product',
      internal_code: insertedProductCode,
      sell_unit_type: 'unit',
      uom: 'unit',
      unit_price: 10,
    })
    .select('id')
    .single();

  assertOk(
    !adminInsertError && typeof adminInsertData?.id === 'string',
    'org_admin puede crear products',
  );
  insertedProductId = adminInsertData.id;

  const { error: adminSuperadminRpcError } = await adminClient.rpc(
    'rpc_superadmin_set_active_org',
    { p_org_id: ORG_ID },
  );
  assertOk(
    Boolean(adminSuperadminRpcError),
    'org_admin no puede ejecutar RPC de superadmin',
  );
  expectDenied(
    adminSuperadminRpcError,
    'org_admin bloqueado en rpc_superadmin_set_active_org',
  );

  const {
    data: { user: { id: superadminUserId } = {} },
    error: superadminUserError,
  } = await superadminClient.auth.getUser();

  assertOk(
    !superadminUserError && typeof superadminUserId === 'string',
    'superadmin autenticado con user_id valido',
  );

  const { error: upsertPlatformAdminError } = await serviceClient
    .from('platform_admins')
    .upsert(
      {
        user_id: superadminUserId,
        created_by: superadminUserId,
      },
      { onConflict: 'user_id' },
    );
  if (upsertPlatformAdminError) throw upsertPlatformAdminError;

  const { data: isPlatformAdmin, error: isPlatformAdminError } =
    await superadminClient.rpc('is_platform_admin');
  assertOk(
    !isPlatformAdminError && isPlatformAdmin === true,
    'superadmin reconocido como platform_admin',
  );

  const { error: setActiveOrgError } = await superadminClient.rpc(
    'rpc_superadmin_set_active_org',
    { p_org_id: ORG_ID },
  );
  assertOk(!setActiveOrgError, 'superadmin puede activar org');

  const { data: activeOrgId, error: activeOrgError } =
    await superadminClient.rpc('rpc_get_active_org_id');
  assertOk(
    !activeOrgError && activeOrgId === ORG_ID,
    'rpc_get_active_org_id devuelve org activa esperada para superadmin',
  );

  const { data: superadminOrgs, error: superadminOrgsError } =
    await superadminClient
      .from('v_superadmin_orgs')
      .select('org_id')
      .eq('org_id', ORG_ID)
      .limit(1);

  assertOk(
    !superadminOrgsError &&
      Array.isArray(superadminOrgs) &&
      superadminOrgs.length === 1,
    'superadmin puede leer v_superadmin_orgs',
  );

  console.log('RLS smoke tests completed successfully.');
} catch (error) {
  console.error('RLS smoke tests failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  if (insertedProductId || insertedProductCode) {
    const query = serviceClient.from('products').delete().eq('org_id', ORG_ID);
    if (insertedProductId) {
      await query.eq('id', insertedProductId);
    } else if (insertedProductCode) {
      await query.eq('internal_code', insertedProductCode);
    }
  }
}
