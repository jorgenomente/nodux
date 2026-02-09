-- Baseline MVP schema for NODUX

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.user_role as enum ('superadmin', 'org_admin', 'staff');
create type public.sell_unit_type as enum ('unit', 'weight', 'bulk');
create type public.stock_movement_type as enum ('sale', 'purchase', 'manual_adjustment', 'expiration_adjustment');
create type public.supplier_order_status as enum ('draft', 'sent', 'received', 'reconciled');
create type public.special_order_status as enum ('pending', 'ordered', 'received', 'delivered');
create type public.payment_method as enum ('cash', 'debit', 'credit', 'transfer', 'other');

-- Helper function for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core tables
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.org_users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.branch_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, branch_id, user_id)
);

create table public.staff_module_access (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  role public.user_role not null default 'staff',
  module_key text not null,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, branch_id, role, module_key)
);

create table public.org_preferences (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  critical_days int not null default 3,
  warning_days int not null default 7,
  allow_negative_stock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Catalog and stock
create table public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  internal_code text,
  barcode text,
  sell_unit_type public.sell_unit_type not null,
  uom text not null,
  unit_price numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_org_internal_code_uq on public.products (org_id, internal_code) where internal_code is not null;
create unique index products_org_barcode_uq on public.products (org_id, barcode) where barcode is not null;

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity_on_hand numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  unique (org_id, branch_id, product_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type public.stock_movement_type not null,
  quantity_delta numeric(14,3) not null,
  reason text,
  source_type text,
  source_id uuid,
  expiration_batch_id uuid,
  created_at timestamptz not null default now()
);

-- Sales
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  payment_method public.payment_method not null,
  total_amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null,
  quantity numeric(14,3) not null,
  line_total numeric(12,2) not null
);

-- Expirations
create table public.expiration_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  expires_on date not null,
  quantity numeric(14,3) not null,
  source_type text not null,
  source_ref_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Suppliers and orders
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_sku text,
  supplier_product_name text,
  default_purchase_uom text,
  created_at timestamptz not null default now(),
  unique (org_id, supplier_id, product_id)
);

create table public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  status public.supplier_order_status not null default 'draft',
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  received_at timestamptz,
  reconciled_at timestamptz
);

create table public.supplier_order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  order_id uuid not null references public.supplier_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  ordered_qty numeric(14,3) not null,
  received_qty numeric(14,3) not null default 0,
  unit_cost numeric(12,2),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

-- Clients and special orders
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_special_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete cascade,
  description text not null,
  quantity numeric(14,3),
  status public.special_order_status not null default 'pending',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers
create trigger set_orgs_updated_at before update on public.orgs for each row execute function public.set_updated_at();
create trigger set_branches_updated_at before update on public.branches for each row execute function public.set_updated_at();
create trigger set_org_users_updated_at before update on public.org_users for each row execute function public.set_updated_at();
create trigger set_branch_memberships_updated_at before update on public.branch_memberships for each row execute function public.set_updated_at();
create trigger set_staff_module_access_updated_at before update on public.staff_module_access for each row execute function public.set_updated_at();
create trigger set_org_preferences_updated_at before update on public.org_preferences for each row execute function public.set_updated_at();
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger set_stock_items_updated_at before update on public.stock_items for each row execute function public.set_updated_at();
create trigger set_expiration_batches_updated_at before update on public.expiration_batches for each row execute function public.set_updated_at();
create trigger set_suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();
create trigger set_supplier_orders_updated_at before update on public.supplier_orders for each row execute function public.set_updated_at();
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger set_client_special_orders_updated_at before update on public.client_special_orders for each row execute function public.set_updated_at();

-- RLS helper functions
create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
  );
$$;

create or replace function public.is_org_admin(check_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
      and ou.role = 'org_admin'
  );
$$;

-- Enable RLS
alter table public.orgs enable row level security;
alter table public.branches enable row level security;
alter table public.org_users enable row level security;
alter table public.branch_memberships enable row level security;
alter table public.staff_module_access enable row level security;
alter table public.org_preferences enable row level security;
alter table public.products enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expiration_batches enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_products enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.supplier_order_items enable row level security;
alter table public.clients enable row level security;
alter table public.client_special_orders enable row level security;

-- Policies (baseline: org membership)
create policy orgs_select on public.orgs for select using (public.is_org_member(id));
create policy orgs_update on public.orgs for update using (public.is_org_admin(id));

create policy branches_select on public.branches for select using (public.is_org_member(org_id));
create policy branches_write on public.branches for insert with check (public.is_org_admin(org_id));
create policy branches_update on public.branches for update using (public.is_org_admin(org_id));

create policy org_users_select on public.org_users for select using (
  user_id = auth.uid() or public.is_org_admin(org_id)
);
create policy org_users_write on public.org_users for insert with check (public.is_org_admin(org_id));
create policy org_users_update on public.org_users for update using (public.is_org_admin(org_id));

create policy branch_memberships_select on public.branch_memberships for select using (
  user_id = auth.uid() or public.is_org_admin(org_id)
);
create policy branch_memberships_write on public.branch_memberships for insert with check (public.is_org_admin(org_id));
create policy branch_memberships_update on public.branch_memberships for update using (public.is_org_admin(org_id));

create policy staff_module_access_select on public.staff_module_access for select using (public.is_org_admin(org_id));
create policy staff_module_access_write on public.staff_module_access for insert with check (public.is_org_admin(org_id));
create policy staff_module_access_update on public.staff_module_access for update using (public.is_org_admin(org_id));

create policy org_preferences_select on public.org_preferences for select using (public.is_org_member(org_id));
create policy org_preferences_write on public.org_preferences for insert with check (public.is_org_admin(org_id));
create policy org_preferences_update on public.org_preferences for update using (public.is_org_admin(org_id));

create policy products_select on public.products for select using (public.is_org_member(org_id));
create policy products_write on public.products for insert with check (public.is_org_admin(org_id));
create policy products_update on public.products for update using (public.is_org_admin(org_id));

create policy stock_items_select on public.stock_items for select using (public.is_org_member(org_id));
create policy stock_items_write on public.stock_items for insert with check (public.is_org_admin(org_id));
create policy stock_items_update on public.stock_items for update using (public.is_org_admin(org_id));

create policy stock_movements_select on public.stock_movements for select using (public.is_org_member(org_id));
create policy stock_movements_write on public.stock_movements for insert with check (public.is_org_member(org_id));

create policy sales_select on public.sales for select using (public.is_org_member(org_id));
create policy sales_write on public.sales for insert with check (public.is_org_member(org_id));

create policy sale_items_select on public.sale_items for select using (public.is_org_member(org_id));
create policy sale_items_write on public.sale_items for insert with check (public.is_org_member(org_id));

create policy expiration_batches_select on public.expiration_batches for select using (public.is_org_member(org_id));
create policy expiration_batches_write on public.expiration_batches for insert with check (public.is_org_admin(org_id));
create policy expiration_batches_update on public.expiration_batches for update using (public.is_org_admin(org_id));

create policy suppliers_select on public.suppliers for select using (public.is_org_member(org_id));
create policy suppliers_write on public.suppliers for insert with check (public.is_org_admin(org_id));
create policy suppliers_update on public.suppliers for update using (public.is_org_admin(org_id));

create policy supplier_products_select on public.supplier_products for select using (public.is_org_member(org_id));
create policy supplier_products_write on public.supplier_products for insert with check (public.is_org_admin(org_id));
create policy supplier_products_update on public.supplier_products for update using (public.is_org_admin(org_id));

create policy supplier_orders_select on public.supplier_orders for select using (public.is_org_member(org_id));
create policy supplier_orders_write on public.supplier_orders for insert with check (public.is_org_admin(org_id));
create policy supplier_orders_update on public.supplier_orders for update using (public.is_org_admin(org_id));

create policy supplier_order_items_select on public.supplier_order_items for select using (public.is_org_member(org_id));
create policy supplier_order_items_write on public.supplier_order_items for insert with check (public.is_org_admin(org_id));
create policy supplier_order_items_update on public.supplier_order_items for update using (public.is_org_admin(org_id));

create policy clients_select on public.clients for select using (public.is_org_member(org_id));
create policy clients_write on public.clients for insert with check (public.is_org_member(org_id));
create policy clients_update on public.clients for update using (public.is_org_member(org_id));

create policy client_special_orders_select on public.client_special_orders for select using (public.is_org_member(org_id));
create policy client_special_orders_write on public.client_special_orders for insert with check (public.is_org_member(org_id));
create policy client_special_orders_update on public.client_special_orders for update using (public.is_org_member(org_id));

-- Notes:
-- Views and RPCs will be added in subsequent migrations to keep this baseline focused on core schema and RLS.
