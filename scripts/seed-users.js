const fs = require('fs');
const path = require('path');
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

const users = [
  {
    email: 'superadmin@demo.com',
    role: 'superadmin',
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  },
  {
    email: 'admin@demo.com',
    role: 'org_admin',
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  },
  {
    email: 'staff@demo.com',
    role: 'staff',
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  },
];

const password = 'prueba123';

(async () => {
  for (const u of users) {
    let userId = u.id;
    let created = false;

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (
        !String(error.message || '')
          .toLowerCase()
          .includes('exists')
      ) {
        throw error;
      }

      const { data: listData, error: listError } =
        await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
      if (listError) throw listError;

      const existingUser = listData?.users?.find(
        (user) => user.email === u.email,
      );
      if (!existingUser) {
        throw new Error(`User not found after conflict for ${u.email}`);
      }

      userId = existingUser.id;
    } else {
      userId = data.user.id;
      created = true;
    }

    u.realId = userId;
    u.created = created;
  }

  const { error: orgError } = await supabase.from('orgs').upsert({
    id: ORG_ID,
    name: 'Demo Org',
    is_active: true,
  });
  if (orgError) throw orgError;

  const { error: branchError } = await supabase.from('branches').upsert([
    { id: BRANCH_A, org_id: ORG_ID, name: 'Sucursal A', is_active: true },
    { id: BRANCH_B, org_id: ORG_ID, name: 'Sucursal B', is_active: true },
  ]);
  if (branchError) throw branchError;

  const orgUsers = users.map((u) => ({
    org_id: ORG_ID,
    user_id: u.realId,
    role: u.role,
    is_active: true,
  }));

  const { error: orgUsersError } = await supabase
    .from('org_users')
    .upsert(orgUsers, { onConflict: 'org_id,user_id' });
  if (orgUsersError) throw orgUsersError;

  const staff = users.find((u) => u.role === 'staff');
  if (staff) {
    const { error: bmError } = await supabase.from('branch_memberships').upsert(
      [
        {
          org_id: ORG_ID,
          branch_id: BRANCH_A,
          user_id: staff.realId,
          is_active: true,
        },
        {
          org_id: ORG_ID,
          branch_id: BRANCH_B,
          user_id: staff.realId,
          is_active: true,
        },
      ],
      { onConflict: 'org_id,branch_id,user_id' },
    );
    if (bmError) throw bmError;

    const { error: modulesError } = await supabase
      .from('staff_module_access')
      .upsert(
        [
          {
            org_id: ORG_ID,
            branch_id: null,
            role: 'staff',
            module_key: 'pos',
            is_enabled: true,
          },
          {
            org_id: ORG_ID,
            branch_id: null,
            role: 'staff',
            module_key: 'products_lookup',
            is_enabled: true,
          },
          {
            org_id: ORG_ID,
            branch_id: null,
            role: 'staff',
            module_key: 'clients',
            is_enabled: true,
          },
          {
            org_id: ORG_ID,
            branch_id: null,
            role: 'staff',
            module_key: 'expirations',
            is_enabled: true,
          },
        ],
        { onConflict: 'org_id,branch_id,role,module_key' },
      );
    if (modulesError) throw modulesError;
  }

  const { error: prefsError } = await supabase.from('org_preferences').upsert({
    org_id: ORG_ID,
    critical_days: 3,
    warning_days: 7,
    allow_negative_stock: true,
  });
  if (prefsError) throw prefsError;

  console.log('Users ready:');
  users.forEach((u) =>
    console.log(
      `${u.email} (${u.role}) id=${u.realId} ${u.created ? 'created' : 'existing'}`,
    ),
  );
  console.log('Org/branches ready.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
