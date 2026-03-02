-- Post-MVP foundation: public storefront + online orders + tracking.

create type public.online_order_status as enum (
  'pending',
  'confirmed',
  'ready_for_pickup',
  'delivered',
  'cancelled'
);

create type public.online_payment_intent as enum (
  'pay_on_pickup',
  'transfer',
  'qr'
);

create type public.online_proof_review_status as enum (
  'pending',
  'approved',
  'rejected'
);

alter table public.orgs
  add column if not exists storefront_slug text;

alter table public.branches
  add column if not exists storefront_slug text;

alter table public.products
  add column if not exists image_url text;

create or replace function public.slugify_text(p_input text)
returns text
language sql
immutable
as $$
  select nullif(trim(both '-' from regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]+', '-', 'g')), '');
$$;

create or replace function public.fn_next_org_storefront_slug(
  p_slug_base text,
  p_exclude_org_id uuid default null
)
returns text
language plpgsql
as $$
declare
  v_base text := coalesce(public.slugify_text(p_slug_base), 'tienda');
  v_try text;
  v_n int := 1;
begin
  loop
    v_try := case when v_n = 1 then v_base else v_base || '-' || v_n::text end;
    exit when not exists (
      select 1
      from public.orgs o
      where o.storefront_slug = v_try
        and (p_exclude_org_id is null or o.id <> p_exclude_org_id)
    );
    v_n := v_n + 1;
  end loop;

  return v_try;
end;
$$;

create or replace function public.fn_next_branch_storefront_slug(
  p_org_id uuid,
  p_slug_base text,
  p_exclude_branch_id uuid default null
)
returns text
language plpgsql
as $$
declare
  v_base text := coalesce(public.slugify_text(p_slug_base), 'sucursal');
  v_try text;
  v_n int := 1;
begin
  loop
    v_try := case when v_n = 1 then v_base else v_base || '-' || v_n::text end;
    exit when not exists (
      select 1
      from public.branches b
      where b.org_id = p_org_id
        and b.storefront_slug = v_try
        and (p_exclude_branch_id is null or b.id <> p_exclude_branch_id)
    );
    v_n := v_n + 1;
  end loop;

  return v_try;
end;
$$;

create or replace function public.trg_set_org_storefront_slug()
returns trigger
language plpgsql
as $$
declare
  v_base text;
begin
  v_base := coalesce(public.slugify_text(new.storefront_slug), public.slugify_text(new.name), 'tienda');
  new.storefront_slug := public.fn_next_org_storefront_slug(v_base, new.id);
  return new;
end;
$$;

create or replace function public.trg_set_branch_storefront_slug()
returns trigger
language plpgsql
as $$
declare
  v_base text;
begin
  v_base := coalesce(public.slugify_text(new.storefront_slug), public.slugify_text(new.name), 'sucursal');
  new.storefront_slug := public.fn_next_branch_storefront_slug(new.org_id, v_base, new.id);
  return new;
end;
$$;

drop trigger if exists trg_orgs_set_storefront_slug on public.orgs;
create trigger trg_orgs_set_storefront_slug
before insert or update of name, storefront_slug
on public.orgs
for each row
execute function public.trg_set_org_storefront_slug();

drop trigger if exists trg_branches_set_storefront_slug on public.branches;
create trigger trg_branches_set_storefront_slug
before insert or update of name, storefront_slug
on public.branches
for each row
execute function public.trg_set_branch_storefront_slug();

with org_slug_seed as (
  select
    o.id,
    coalesce(public.slugify_text(o.name), 'tienda') as slug_base,
    row_number() over (
      partition by coalesce(public.slugify_text(o.name), 'tienda')
      order by o.created_at, o.id
    ) as rn
  from public.orgs o
), org_slug_final as (
  select
    s.id,
    case
      when s.rn = 1 then s.slug_base
      else s.slug_base || '-' || s.rn::text
    end as slug_value
  from org_slug_seed s
)
update public.orgs o
set storefront_slug = f.slug_value
from org_slug_final f
where o.id = f.id
  and (o.storefront_slug is null or btrim(o.storefront_slug) = '');

with branch_slug_seed as (
  select
    b.id,
    b.org_id,
    coalesce(public.slugify_text(b.name), 'sucursal') as slug_base,
    row_number() over (
      partition by b.org_id, coalesce(public.slugify_text(b.name), 'sucursal')
      order by b.created_at, b.id
    ) as rn
  from public.branches b
), branch_slug_final as (
  select
    s.id,
    case
      when s.rn = 1 then s.slug_base
      else s.slug_base || '-' || s.rn::text
    end as slug_value
  from branch_slug_seed s
)
update public.branches b
set storefront_slug = f.slug_value
from branch_slug_final f
where b.id = f.id
  and (b.storefront_slug is null or btrim(b.storefront_slug) = '');

create unique index if not exists orgs_storefront_slug_uq
  on public.orgs (storefront_slug)
  where storefront_slug is not null;

create unique index if not exists branches_org_storefront_slug_uq
  on public.branches (org_id, storefront_slug)
  where storefront_slug is not null;

create table if not exists public.storefront_settings (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  is_enabled boolean not null default false,
  allow_out_of_stock_order boolean not null default false,
  whatsapp_phone text,
  pickup_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storefront_domains (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  hostname text not null,
  is_active boolean not null default true,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostname)
);

create table if not exists public.online_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_code text not null,
  status public.online_order_status not null default 'pending',
  customer_name text not null,
  customer_phone text not null,
  customer_notes text,
  staff_notes text,
  payment_intent public.online_payment_intent not null default 'pay_on_pickup',
  subtotal_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  created_by_user_id uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  ready_for_pickup_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, order_code)
);

create table if not exists public.online_order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  online_order_id uuid not null references public.online_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null,
  quantity numeric(14,3) not null check (quantity > 0),
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.online_order_status_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  online_order_id uuid not null references public.online_orders(id) on delete cascade,
  old_status public.online_order_status,
  new_status public.online_order_status not null,
  internal_note text,
  customer_note text,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.online_order_tracking_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  online_order_id uuid not null references public.online_orders(id) on delete cascade,
  token text not null,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token)
);

create unique index if not exists online_order_tracking_tokens_active_by_order_uq
  on public.online_order_tracking_tokens (online_order_id)
  where is_active = true;

create table if not exists public.online_order_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  online_order_id uuid not null references public.online_orders(id) on delete cascade,
  storage_path text not null,
  review_status public.online_proof_review_status not null default 'pending',
  review_note text,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now()
);

create index if not exists online_orders_org_branch_status_idx
  on public.online_orders (org_id, branch_id, status, created_at desc);

create index if not exists online_orders_org_created_at_idx
  on public.online_orders (org_id, created_at desc);

create index if not exists online_order_items_order_idx
  on public.online_order_items (online_order_id);

create index if not exists online_order_status_history_order_idx
  on public.online_order_status_history (online_order_id, changed_at);

create index if not exists online_order_payment_proofs_order_idx
  on public.online_order_payment_proofs (online_order_id, uploaded_at desc);

create trigger set_storefront_settings_updated_at
before update on public.storefront_settings
for each row execute function public.set_updated_at();

create trigger set_storefront_domains_updated_at
before update on public.storefront_domains
for each row execute function public.set_updated_at();

create trigger set_online_orders_updated_at
before update on public.online_orders
for each row execute function public.set_updated_at();

alter table public.storefront_settings enable row level security;
alter table public.storefront_domains enable row level security;
alter table public.online_orders enable row level security;
alter table public.online_order_items enable row level security;
alter table public.online_order_status_history enable row level security;
alter table public.online_order_tracking_tokens enable row level security;
alter table public.online_order_payment_proofs enable row level security;

drop policy if exists storefront_settings_select on public.storefront_settings;
create policy storefront_settings_select
on public.storefront_settings
for select
using (public.is_org_member(org_id));

drop policy if exists storefront_settings_write on public.storefront_settings;
create policy storefront_settings_write
on public.storefront_settings
for insert
with check (public.is_org_admin_or_superadmin(org_id));

drop policy if exists storefront_settings_update on public.storefront_settings;
create policy storefront_settings_update
on public.storefront_settings
for update
using (public.is_org_admin_or_superadmin(org_id));

drop policy if exists storefront_domains_select on public.storefront_domains;
create policy storefront_domains_select
on public.storefront_domains
for select
using (public.is_org_member(org_id));

drop policy if exists storefront_domains_write on public.storefront_domains;
create policy storefront_domains_write
on public.storefront_domains
for insert
with check (public.is_org_admin_or_superadmin(org_id));

drop policy if exists storefront_domains_update on public.storefront_domains;
create policy storefront_domains_update
on public.storefront_domains
for update
using (public.is_org_admin_or_superadmin(org_id));

drop policy if exists online_orders_select on public.online_orders;
create policy online_orders_select
on public.online_orders
for select
using (public.is_org_member(org_id));

drop policy if exists online_orders_write on public.online_orders;
create policy online_orders_write
on public.online_orders
for insert
with check (public.is_org_member(org_id));

drop policy if exists online_orders_update on public.online_orders;
create policy online_orders_update
on public.online_orders
for update
using (public.is_org_member(org_id));

drop policy if exists online_order_items_select on public.online_order_items;
create policy online_order_items_select
on public.online_order_items
for select
using (public.is_org_member(org_id));

drop policy if exists online_order_items_write on public.online_order_items;
create policy online_order_items_write
on public.online_order_items
for insert
with check (public.is_org_member(org_id));

drop policy if exists online_order_items_update on public.online_order_items;
create policy online_order_items_update
on public.online_order_items
for update
using (public.is_org_member(org_id));

drop policy if exists online_order_status_history_select on public.online_order_status_history;
create policy online_order_status_history_select
on public.online_order_status_history
for select
using (public.is_org_member(org_id));

drop policy if exists online_order_status_history_write on public.online_order_status_history;
create policy online_order_status_history_write
on public.online_order_status_history
for insert
with check (public.is_org_member(org_id));

drop policy if exists online_order_tracking_tokens_select on public.online_order_tracking_tokens;
create policy online_order_tracking_tokens_select
on public.online_order_tracking_tokens
for select
using (public.is_org_member(org_id));

drop policy if exists online_order_tracking_tokens_write on public.online_order_tracking_tokens;
create policy online_order_tracking_tokens_write
on public.online_order_tracking_tokens
for insert
with check (public.is_org_member(org_id));

drop policy if exists online_order_tracking_tokens_update on public.online_order_tracking_tokens;
create policy online_order_tracking_tokens_update
on public.online_order_tracking_tokens
for update
using (public.is_org_member(org_id));

drop policy if exists online_order_payment_proofs_select on public.online_order_payment_proofs;
create policy online_order_payment_proofs_select
on public.online_order_payment_proofs
for select
using (public.is_org_member(org_id));

drop policy if exists online_order_payment_proofs_write on public.online_order_payment_proofs;
create policy online_order_payment_proofs_write
on public.online_order_payment_proofs
for insert
with check (public.is_org_member(org_id));

drop policy if exists online_order_payment_proofs_update on public.online_order_payment_proofs;
create policy online_order_payment_proofs_update
on public.online_order_payment_proofs
for update
using (public.is_org_member(org_id));

create or replace function public.rpc_get_public_storefront_branches(
  p_org_slug text
)
returns table (
  org_name text,
  org_slug text,
  branch_name text,
  branch_slug text,
  is_active boolean,
  is_enabled boolean,
  whatsapp_phone text,
  pickup_instructions text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    o.name,
    o.storefront_slug,
    b.name,
    b.storefront_slug,
    b.is_active,
    ss.is_enabled,
    ss.whatsapp_phone,
    ss.pickup_instructions
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  where o.is_active = true
    and o.storefront_slug = p_org_slug
  order by b.name;
end;
$$;

create or replace function public.rpc_get_public_storefront_products(
  p_org_slug text,
  p_branch_slug text
)
returns table (
  org_name text,
  org_slug text,
  branch_name text,
  branch_slug text,
  product_id uuid,
  product_name text,
  unit_price numeric,
  stock_on_hand numeric,
  image_url text,
  is_available boolean,
  whatsapp_phone text,
  pickup_instructions text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    o.name,
    o.storefront_slug,
    b.name,
    b.storefront_slug,
    p.id,
    p.name,
    p.unit_price,
    coalesce(si.quantity_on_hand, 0::numeric) as stock_on_hand,
    p.image_url,
    (p.is_active and coalesce(si.quantity_on_hand, 0::numeric) > 0::numeric),
    ss.whatsapp_phone,
    ss.pickup_instructions
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  join public.products p
    on p.org_id = o.id
   and p.is_active = true
  left join public.stock_items si
    on si.org_id = o.id
   and si.branch_id = b.id
   and si.product_id = p.id
  where o.is_active = true
    and o.storefront_slug = p_org_slug
    and b.storefront_slug = p_branch_slug
  order by p.name;
end;
$$;

create or replace function public.rpc_create_online_order(
  p_org_slug text,
  p_branch_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_payment_intent public.online_payment_intent,
  p_items jsonb,
  p_customer_notes text default null
)
returns table (
  online_order_id uuid,
  order_code text,
  tracking_token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_branch_id uuid;
  v_allow_out_of_stock_order boolean;
  v_order_id uuid := gen_random_uuid();
  v_order_code text := upper('ONL-' || substr(replace(v_order_id::text, '-', ''), 1, 10));
  v_tracking_token text := replace(gen_random_uuid()::text, '-', '');
  v_actor uuid := auth.uid();
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric(14,3);
  v_product_name text;
  v_unit_price numeric(12,2);
  v_stock numeric(14,3);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items are required';
  end if;

  select o.id, b.id, ss.allow_out_of_stock_order
    into v_org_id, v_branch_id, v_allow_out_of_stock_order
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  where o.is_active = true
    and o.storefront_slug = p_org_slug
    and b.storefront_slug = p_branch_slug;

  if v_org_id is null or v_branch_id is null then
    raise exception 'storefront not found or disabled';
  end if;

  if coalesce(btrim(p_customer_name), '') = '' then
    raise exception 'customer_name is required';
  end if;

  if coalesce(btrim(p_customer_phone), '') = '' then
    raise exception 'customer_phone is required';
  end if;

  insert into public.online_orders (
    id,
    org_id,
    branch_id,
    order_code,
    status,
    customer_name,
    customer_phone,
    customer_notes,
    payment_intent,
    subtotal_amount,
    total_amount,
    created_by_user_id
  ) values (
    v_order_id,
    v_org_id,
    v_branch_id,
    v_order_code,
    'pending',
    btrim(p_customer_name),
    btrim(p_customer_phone),
    p_customer_notes,
    p_payment_intent,
    0,
    0,
    v_actor
  );

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := nullif(v_item->>'quantity', '')::numeric;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid item payload';
    end if;

    select p.name, p.unit_price, coalesce(si.quantity_on_hand, 0)
      into v_product_name, v_unit_price, v_stock
    from public.products p
    left join public.stock_items si
      on si.org_id = p.org_id
     and si.product_id = p.id
     and si.branch_id = v_branch_id
    where p.org_id = v_org_id
      and p.id = v_product_id
      and p.is_active = true;

    if v_product_name is null then
      raise exception 'product not found or inactive: %', v_product_id;
    end if;

    if not v_allow_out_of_stock_order and v_quantity > coalesce(v_stock, 0) then
      raise exception 'insufficient stock for product %', v_product_name;
    end if;

    insert into public.online_order_items (
      org_id,
      online_order_id,
      product_id,
      product_name_snapshot,
      unit_price_snapshot,
      quantity,
      line_total
    ) values (
      v_org_id,
      v_order_id,
      v_product_id,
      v_product_name,
      v_unit_price,
      v_quantity,
      round((v_unit_price * v_quantity)::numeric, 2)
    );

    v_total := v_total + round((v_unit_price * v_quantity)::numeric, 2);
  end loop;

  update public.online_orders
  set subtotal_amount = v_total,
      total_amount = v_total
  where id = v_order_id;

  insert into public.online_order_status_history (
    org_id,
    online_order_id,
    old_status,
    new_status,
    changed_by_user_id,
    customer_note
  ) values (
    v_org_id,
    v_order_id,
    null,
    'pending',
    v_actor,
    p_customer_notes
  );

  insert into public.online_order_tracking_tokens (
    org_id,
    online_order_id,
    token,
    is_active
  ) values (
    v_org_id,
    v_order_id,
    v_tracking_token,
    true
  );

  online_order_id := v_order_id;
  order_code := v_order_code;
  tracking_token := v_tracking_token;
  return next;
end;
$$;

create or replace function public.rpc_set_online_order_status(
  p_online_order_id uuid,
  p_new_status public.online_order_status,
  p_internal_note text default null,
  p_customer_note text default null
)
returns table (
  online_order_id uuid,
  old_status public.online_order_status,
  new_status public.online_order_status,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_old_status public.online_order_status;
  v_branch_id uuid;
  v_now timestamptz := now();
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  select oo.org_id, oo.status, oo.branch_id
    into v_org_id, v_old_status, v_branch_id
  from public.online_orders oo
  where oo.id = p_online_order_id;

  if v_org_id is null then
    raise exception 'online order not found';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'permission denied';
  end if;

  if v_old_status = p_new_status then
    online_order_id := p_online_order_id;
    old_status := v_old_status;
    new_status := p_new_status;
    changed_at := v_now;
    return next;
    return;
  end if;

  if v_old_status = 'pending' and p_new_status not in ('confirmed', 'cancelled') then
    raise exception 'invalid status transition';
  end if;

  if v_old_status = 'confirmed' and p_new_status not in ('ready_for_pickup', 'cancelled') then
    raise exception 'invalid status transition';
  end if;

  if v_old_status = 'ready_for_pickup' and p_new_status not in ('delivered', 'cancelled') then
    raise exception 'invalid status transition';
  end if;

  if v_old_status in ('delivered', 'cancelled') then
    raise exception 'cannot transition from final state';
  end if;

  update public.online_orders oo
  set status = p_new_status,
      staff_notes = coalesce(p_internal_note, oo.staff_notes),
      confirmed_at = case when p_new_status = 'confirmed' then v_now else oo.confirmed_at end,
      ready_for_pickup_at = case when p_new_status = 'ready_for_pickup' then v_now else oo.ready_for_pickup_at end,
      delivered_at = case when p_new_status = 'delivered' then v_now else oo.delivered_at end,
      cancelled_at = case when p_new_status = 'cancelled' then v_now else oo.cancelled_at end
  where oo.id = p_online_order_id;

  insert into public.online_order_status_history (
    org_id,
    online_order_id,
    old_status,
    new_status,
    internal_note,
    customer_note,
    changed_by_user_id,
    changed_at
  ) values (
    v_org_id,
    p_online_order_id,
    v_old_status,
    p_new_status,
    p_internal_note,
    p_customer_note,
    v_actor,
    v_now
  );

  perform public.rpc_log_audit_event(
    v_org_id,
    'online_order_status_set',
    'online_orders',
    p_online_order_id,
    v_branch_id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_new_status,
      'internal_note', p_internal_note,
      'customer_note', p_customer_note
    ),
    v_actor
  );

  online_order_id := p_online_order_id;
  old_status := v_old_status;
  new_status := p_new_status;
  changed_at := v_now;
  return next;
end;
$$;

create or replace function public.rpc_get_online_order_tracking(
  p_tracking_token text
)
returns table (
  order_code text,
  store_name text,
  branch_name text,
  status public.online_order_status,
  created_at timestamptz,
  last_status_at timestamptz,
  customer_name text,
  timeline jsonb,
  whatsapp_phone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_org_id uuid;
begin
  select ott.online_order_id, ott.org_id
    into v_order_id, v_org_id
  from public.online_order_tracking_tokens ott
  where ott.token = p_tracking_token
    and ott.is_active = true
    and (ott.expires_at is null or ott.expires_at > now())
  limit 1;

  if v_order_id is null then
    return;
  end if;

  return query
  with status_history as (
    select jsonb_agg(
      jsonb_build_object(
        'old_status', h.old_status,
        'new_status', h.new_status,
        'changed_at', h.changed_at,
        'customer_note', h.customer_note
      ) order by h.changed_at asc
    ) as history,
    max(h.changed_at) as last_changed_at
    from public.online_order_status_history h
    where h.online_order_id = v_order_id
  )
  select
    oo.order_code,
    o.name,
    b.name,
    oo.status,
    oo.created_at,
    coalesce(sh.last_changed_at, oo.updated_at),
    oo.customer_name,
    coalesce(sh.history, '[]'::jsonb),
    ss.whatsapp_phone
  from public.online_orders oo
  join public.orgs o
    on o.id = oo.org_id
  join public.branches b
    on b.id = oo.branch_id
  left join public.storefront_settings ss
    on ss.org_id = oo.org_id
  left join status_history sh
    on true
  where oo.id = v_order_id
    and oo.org_id = v_org_id;
end;
$$;

create or replace view public.v_online_orders_admin as
select
  oo.id as online_order_id,
  oo.org_id,
  oo.branch_id,
  b.name as branch_name,
  oo.order_code,
  oo.status,
  oo.customer_name,
  oo.customer_phone,
  oo.customer_notes,
  oo.staff_notes,
  oo.payment_intent,
  oo.subtotal_amount,
  oo.total_amount,
  oo.confirmed_at,
  oo.ready_for_pickup_at,
  oo.delivered_at,
  oo.cancelled_at,
  oo.created_at,
  oo.updated_at,
  (select ott.token
   from public.online_order_tracking_tokens ott
   where ott.online_order_id = oo.id
     and ott.is_active = true
   order by ott.created_at desc
   limit 1) as tracking_token,
  exists (
    select 1
    from public.online_order_payment_proofs opp
    where opp.online_order_id = oo.id
  ) as has_payment_proof,
  (select opp.review_status
   from public.online_order_payment_proofs opp
   where opp.online_order_id = oo.id
   order by opp.uploaded_at desc
   limit 1) as payment_proof_review_status
from public.online_orders oo
join public.branches b
  on b.id = oo.branch_id;

grant execute on function public.rpc_get_public_storefront_branches(text) to anon;
grant execute on function public.rpc_get_public_storefront_branches(text) to authenticated;
grant execute on function public.rpc_get_public_storefront_products(text, text) to anon;
grant execute on function public.rpc_get_public_storefront_products(text, text) to authenticated;
grant execute on function public.rpc_create_online_order(text, text, text, text, public.online_payment_intent, jsonb, text) to anon;
grant execute on function public.rpc_create_online_order(text, text, text, text, public.online_payment_intent, jsonb, text) to authenticated;
grant execute on function public.rpc_set_online_order_status(uuid, public.online_order_status, text, text) to authenticated;
grant execute on function public.rpc_get_online_order_tracking(text) to anon;
grant execute on function public.rpc_get_online_order_tracking(text) to authenticated;
