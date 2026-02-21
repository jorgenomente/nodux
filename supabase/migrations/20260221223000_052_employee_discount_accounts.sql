-- Employee discount + branch-level employee accounts for POS.

alter table public.org_preferences
  add column if not exists employee_discount_enabled boolean not null default true,
  add column if not exists employee_discount_default_pct numeric(5,2) not null default 10,
  add column if not exists employee_discount_combinable_with_cash_discount boolean not null default false;

update public.org_preferences
set employee_discount_enabled = true
where employee_discount_enabled is null;

update public.org_preferences
set employee_discount_default_pct = 10
where employee_discount_default_pct is null;

update public.org_preferences
set employee_discount_combinable_with_cash_discount = false
where employee_discount_combinable_with_cash_discount is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'org_preferences_employee_discount_default_pct_ck'
  ) then
    alter table public.org_preferences
      add constraint org_preferences_employee_discount_default_pct_ck
      check (employee_discount_default_pct >= 0 and employee_discount_default_pct <= 100);
  end if;
end;
$$;

create table if not exists public.employee_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, branch_id, name)
);

create index if not exists employee_accounts_org_branch_idx
  on public.employee_accounts (org_id, branch_id);

create trigger set_employee_accounts_updated_at
before update on public.employee_accounts
for each row execute function public.set_updated_at();

alter table public.employee_accounts enable row level security;

create policy employee_accounts_select
on public.employee_accounts
for select
using (public.is_org_member(org_id));

create policy employee_accounts_write
on public.employee_accounts
for insert
with check (public.is_org_admin(org_id));

create policy employee_accounts_update
on public.employee_accounts
for update
using (public.is_org_admin(org_id));

alter table public.sales
  add column if not exists employee_account_id uuid references public.employee_accounts(id) on delete set null,
  add column if not exists employee_name_snapshot text,
  add column if not exists cash_discount_amount numeric(12,2) not null default 0,
  add column if not exists cash_discount_pct numeric(5,2) not null default 0,
  add column if not exists employee_discount_applied boolean not null default false,
  add column if not exists employee_discount_amount numeric(12,2) not null default 0,
  add column if not exists employee_discount_pct numeric(5,2) not null default 0;

update public.sales
set cash_discount_amount = coalesce(discount_amount, 0)
where cash_discount_amount is null;

update public.sales
set cash_discount_pct = coalesce(discount_pct, 0)
where cash_discount_pct is null;

update public.sales
set employee_discount_applied = false
where employee_discount_applied is null;

update public.sales
set employee_discount_amount = 0
where employee_discount_amount is null;

update public.sales
set employee_discount_pct = 0
where employee_discount_pct is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_cash_discount_pct_range_ck'
  ) then
    alter table public.sales
      add constraint sales_cash_discount_pct_range_ck
      check (cash_discount_pct >= 0 and cash_discount_pct <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_cash_discount_amount_range_ck'
  ) then
    alter table public.sales
      add constraint sales_cash_discount_amount_range_ck
      check (cash_discount_amount >= 0 and cash_discount_amount <= subtotal_amount);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_employee_discount_pct_range_ck'
  ) then
    alter table public.sales
      add constraint sales_employee_discount_pct_range_ck
      check (employee_discount_pct >= 0 and employee_discount_pct <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_employee_discount_amount_range_ck'
  ) then
    alter table public.sales
      add constraint sales_employee_discount_amount_range_ck
      check (employee_discount_amount >= 0 and employee_discount_amount <= subtotal_amount);
  end if;
end;
$$;

create or replace view public.v_dashboard_admin as
with scopes as (
  select o.id as org_id, null::uuid as branch_id
  from public.orgs o
  union all
  select b.org_id, b.id as branch_id
  from public.branches b
),
sales_agg as (
  select
    s.id as sale_id,
    s.org_id,
    s.branch_id,
    s.created_at,
    s.total_amount,
    s.cash_discount_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method = 'cash'), 0) as cash_collected_amount,
    count(*) filter (where sp.payment_method = 'cash') > 0 as has_cash_component
  from public.sales s
  left join public.sale_payments sp on sp.sale_id = s.id
  group by s.id, s.org_id, s.branch_id, s.created_at, s.total_amount, s.cash_discount_amount
),
metrics as (
  select
    s.org_id,
    s.branch_id,
    coalesce(sum(s.total_amount) filter (where s.created_at::date = current_date), 0) as sales_today_total,
    coalesce(count(*) filter (where s.created_at::date = current_date), 0) as sales_today_count,
    coalesce(sum(s.total_amount) filter (where s.created_at >= date_trunc('week', now())), 0) as sales_week_total,
    coalesce(sum(s.total_amount) filter (where s.created_at >= date_trunc('month', now())), 0) as sales_month_total,
    coalesce(sum(s.cash_collected_amount) filter (where s.created_at::date = current_date), 0) as cash_sales_today_total,
    coalesce(count(*) filter (where s.created_at::date = current_date and s.has_cash_component), 0) as cash_sales_today_count,
    coalesce(sum(s.cash_discount_amount) filter (where s.created_at::date = current_date), 0) as cash_discount_today_total,
    coalesce(count(*) filter (where s.created_at::date = current_date and s.cash_discount_amount > 0), 0) as cash_discounted_sales_today_count
  from sales_agg s
  group by s.org_id, s.branch_id
),
expiration_counts as (
  select
    eb.org_id,
    eb.branch_id,
    count(*) filter (where (eb.expires_on - current_date) <= op.critical_days) as expirations_critical_count,
    count(*) filter (where (eb.expires_on - current_date) > op.critical_days and (eb.expires_on - current_date) <= op.warning_days) as expirations_warning_count
  from public.expiration_batches eb
  left join public.org_preferences op on op.org_id = eb.org_id
  group by eb.org_id, eb.branch_id
),
order_counts as (
  select
    so.org_id,
    so.branch_id,
    count(*) filter (where so.status in ('sent', 'received')) as supplier_orders_pending_count
  from public.supplier_orders so
  group by so.org_id, so.branch_id
),
client_order_counts as (
  select
    co.org_id,
    co.branch_id,
    count(*) filter (where co.status in ('pending', 'ordered', 'received')) as client_orders_pending_count
  from public.client_special_orders co
  group by co.org_id, co.branch_id
)
select
  sc.org_id,
  sc.branch_id,
  coalesce(m.sales_today_total, 0) as sales_today_total,
  coalesce(m.sales_today_count, 0) as sales_today_count,
  coalesce(m.sales_week_total, 0) as sales_week_total,
  coalesce(m.sales_month_total, 0) as sales_month_total,
  coalesce(m.cash_sales_today_total, 0) as cash_sales_today_total,
  coalesce(m.cash_sales_today_count, 0) as cash_sales_today_count,
  coalesce(m.cash_discount_today_total, 0) as cash_discount_today_total,
  coalesce(m.cash_discounted_sales_today_count, 0) as cash_discounted_sales_today_count,
  coalesce(e.expirations_critical_count, 0) as expirations_critical_count,
  coalesce(e.expirations_warning_count, 0) as expirations_warning_count,
  coalesce(o.supplier_orders_pending_count, 0) as supplier_orders_pending_count,
  coalesce(c.client_orders_pending_count, 0) as client_orders_pending_count
from scopes sc
left join metrics m
  on m.org_id = sc.org_id
  and (m.branch_id = sc.branch_id or (m.branch_id is null and sc.branch_id is null))
left join expiration_counts e
  on e.org_id = sc.org_id
  and (e.branch_id = sc.branch_id or (e.branch_id is null and sc.branch_id is null))
left join order_counts o
  on o.org_id = sc.org_id
  and (o.branch_id = sc.branch_id or (o.branch_id is null and sc.branch_id is null))
left join client_order_counts c
  on c.org_id = sc.org_id
  and (c.branch_id = sc.branch_id or (c.branch_id is null and sc.branch_id is null));

create or replace view public.v_sales_admin
with (security_invoker = true) as
with payment_totals as (
  select
    sp.sale_id,
    coalesce(sum(sp.amount) filter (where sp.payment_method = 'cash'), 0)::numeric(12,2) as cash_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text in ('card', 'debit', 'credit')), 0)::numeric(12,2) as card_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text = 'mercadopago'), 0)::numeric(12,2) as mercadopago_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text not in ('cash', 'card', 'debit', 'credit', 'mercadopago')), 0)::numeric(12,2) as other_amount,
    array_agg(distinct sp.payment_method::text order by sp.payment_method::text) as payment_methods
  from public.sale_payments sp
  group by sp.sale_id
),
item_totals as (
  select
    si.sale_id,
    count(*)::int as items_count,
    coalesce(sum(si.quantity), 0)::numeric(14,3) as items_qty_total,
    string_agg(distinct si.product_name_snapshot, ', ' order by si.product_name_snapshot) as item_names_summary,
    lower(string_agg(distinct si.product_name_snapshot, ' ' order by si.product_name_snapshot)) as item_names_search
  from public.sale_items si
  group by si.sale_id
),
creator_names as (
  select
    ou.org_id,
    ou.user_id,
    coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as creator_name
  from public.org_users ou
)
select
  s.id as sale_id,
  s.org_id,
  s.branch_id,
  b.name as branch_name,
  s.created_at,
  s.created_by,
  coalesce(cn.creator_name, s.created_by::text) as created_by_name,
  s.payment_method as payment_method_summary,
  s.subtotal_amount,
  s.discount_amount,
  s.discount_pct,
  s.total_amount,
  coalesce(it.items_count, 0) as items_count,
  coalesce(it.items_qty_total, 0)::numeric(14,3) as items_qty_total,
  coalesce(it.item_names_summary, '') as item_names_summary,
  coalesce(it.item_names_search, '') as item_names_search,
  coalesce(pt.payment_methods, array[]::text[]) as payment_methods,
  coalesce(pt.cash_amount, 0)::numeric(12,2) as cash_amount,
  coalesce(pt.card_amount, 0)::numeric(12,2) as card_amount,
  coalesce(pt.mercadopago_amount, 0)::numeric(12,2) as mercadopago_amount,
  coalesce(pt.other_amount, 0)::numeric(12,2) as other_amount,
  s.employee_account_id,
  s.employee_name_snapshot,
  s.cash_discount_amount,
  s.cash_discount_pct,
  s.employee_discount_applied,
  s.employee_discount_amount,
  s.employee_discount_pct
from public.sales s
join public.branches b
  on b.id = s.branch_id
 and b.org_id = s.org_id
left join payment_totals pt on pt.sale_id = s.id
left join item_totals it on it.sale_id = s.id
left join creator_names cn
  on cn.org_id = s.org_id
 and cn.user_id = s.created_by;

create or replace view public.v_sale_detail_admin
with (security_invoker = true) as
with items_by_sale as (
  select
    si.sale_id,
    jsonb_agg(
      jsonb_build_object(
        'sale_item_id', si.id,
        'product_id', si.product_id,
        'product_name', si.product_name_snapshot,
        'unit_price', si.unit_price_snapshot,
        'quantity', si.quantity,
        'line_total', si.line_total
      )
      order by si.product_name_snapshot
    ) as items
  from public.sale_items si
  group by si.sale_id
),
payments_by_sale as (
  select
    sp.sale_id,
    jsonb_agg(
      jsonb_build_object(
        'sale_payment_id', sp.id,
        'payment_method', sp.payment_method,
        'amount', sp.amount,
        'payment_device_id', sp.payment_device_id,
        'payment_device_name', ppd.device_name,
        'payment_device_provider', ppd.provider,
        'created_at', sp.created_at
      )
      order by sp.created_at, sp.id
    ) as payments
  from public.sale_payments sp
  left join public.pos_payment_devices ppd
    on ppd.id = sp.payment_device_id
   and ppd.org_id = sp.org_id
  group by sp.sale_id
),
creator_names as (
  select
    ou.org_id,
    ou.user_id,
    coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as creator_name
  from public.org_users ou
)
select
  s.id as sale_id,
  s.org_id,
  s.branch_id,
  b.name as branch_name,
  s.created_at,
  s.created_by,
  coalesce(cn.creator_name, s.created_by::text) as created_by_name,
  s.payment_method as payment_method_summary,
  s.subtotal_amount,
  s.discount_amount,
  s.discount_pct,
  s.total_amount,
  coalesce(ibs.items, '[]'::jsonb) as items,
  coalesce(pbs.payments, '[]'::jsonb) as payments,
  s.employee_account_id,
  s.employee_name_snapshot,
  s.cash_discount_amount,
  s.cash_discount_pct,
  s.employee_discount_applied,
  s.employee_discount_amount,
  s.employee_discount_pct
from public.sales s
join public.branches b
  on b.id = s.branch_id
 and b.org_id = s.org_id
left join items_by_sale ibs on ibs.sale_id = s.id
left join payments_by_sale pbs on pbs.sale_id = s.id
left join creator_names cn
  on cn.org_id = s.org_id
 and cn.user_id = s.created_by;

drop function if exists public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb,
  uuid,
  boolean,
  boolean,
  numeric,
  jsonb,
  uuid
);

drop function if exists public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb,
  uuid,
  boolean,
  boolean,
  numeric,
  jsonb,
  uuid,
  boolean,
  numeric,
  uuid
);

create or replace function public.rpc_create_sale(
  p_org_id uuid,
  p_branch_id uuid,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_special_order_id uuid default null,
  p_close_special_order boolean default false,
  p_apply_cash_discount boolean default false,
  p_cash_discount_pct numeric default null,
  p_payments jsonb default null,
  p_payment_device_id uuid default null,
  p_apply_employee_discount boolean default false,
  p_employee_discount_pct numeric default null,
  p_employee_account_id uuid default null
)
returns table (sale_id uuid, total numeric, created_at timestamptz)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_sale_id uuid := gen_random_uuid();
  v_total numeric(12,2) := 0;
  v_subtotal numeric(12,2) := 0;
  v_discount_amount numeric(12,2) := 0;
  v_discount_pct numeric(5,2) := 0;
  v_created_at timestamptz := now();
  v_allow_negative boolean := true;
  v_cash_discount_enabled boolean := true;
  v_cash_discount_default_pct numeric(5,2) := 10;
  v_employee_discount_enabled boolean := true;
  v_employee_discount_default_pct numeric(5,2) := 10;
  v_employee_discount_combinable boolean := false;
  v_pos_enabled boolean := false;
  v_cash_discount_applied boolean := false;
  v_employee_discount_applied boolean := false;
  v_cash_discount_amount numeric(12,2) := 0;
  v_cash_discount_pct numeric(5,2) := 0;
  v_employee_discount_amount numeric(12,2) := 0;
  v_employee_discount_pct numeric(5,2) := 0;
  v_employee_name_snapshot text := null;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_price numeric(12,2);
  v_name text;
  v_line_total numeric(12,2);
  v_current numeric(14,3);
  v_remaining numeric(14,3);
  v_batch record;
  v_items_count int := 0;
  v_remaining_items bigint;
  v_item_rows record;
  v_to_apply numeric(14,3);
  v_order_status public.special_order_status;
  v_payment jsonb;
  v_payment_method public.payment_method;
  v_payment_amount numeric(12,2);
  v_payments_sum numeric(12,2) := 0;
  v_payments_count int := 0;
  v_has_cash_payment boolean := false;
  v_single_payment_method public.payment_method := null;
  v_summary_payment_method public.payment_method := null;
  v_payment_rows jsonb := '[]'::jsonb;
  v_payment_device_id uuid;
  v_single_payment_device_id uuid := null;
  v_effective_payment_method public.payment_method;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    if not exists (
      select 1
      from public.org_users ou
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.is_active = true
        and ou.role = 'staff'
    ) then
      raise exception 'not authorized';
    end if;

    if not exists (
      select 1
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.branch_id = p_branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id = p_branch_id
         and sma.role = 'staff'
         and sma.module_key = 'pos'
       limit 1),
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id is null
         and sma.role = 'staff'
         and sma.module_key = 'pos'
       limit 1),
      false
    ) into v_pos_enabled;

    if not v_pos_enabled then
      raise exception 'pos module disabled';
    end if;
  end if;

  v_effective_payment_method := p_payment_method;

  if v_effective_payment_method::text = 'mixed' and (p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0) then
    raise exception 'mixed payment requires payments detail';
  end if;

  if p_cash_discount_pct is not null and not coalesce(p_apply_cash_discount, false) then
    raise exception 'cash discount pct requires apply_cash_discount';
  end if;

  if p_employee_discount_pct is not null and not coalesce(p_apply_employee_discount, false) then
    raise exception 'employee discount pct requires apply_employee_discount';
  end if;

  if p_employee_account_id is not null and not coalesce(p_apply_employee_discount, false) then
    raise exception 'employee account requires apply_employee_discount';
  end if;

  if p_payments is null then
    if v_effective_payment_method::text in ('card', 'mercadopago') and p_payment_device_id is null then
      raise exception 'payment_device_id required for card and mercadopago';
    end if;

    if p_payment_device_id is not null and v_effective_payment_method::text not in ('card', 'mercadopago') then
      raise exception 'payment_device_id only allowed for card and mercadopago';
    end if;

    if p_payment_device_id is not null and not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = p_branch_id
        and ppd.is_active = true
    ) then
      raise exception 'invalid payment device';
    end if;

    v_single_payment_device_id := p_payment_device_id;
  end if;

  select
    allow_negative_stock,
    cash_discount_enabled,
    cash_discount_default_pct,
    employee_discount_enabled,
    employee_discount_default_pct,
    employee_discount_combinable_with_cash_discount
  into
    v_allow_negative,
    v_cash_discount_enabled,
    v_cash_discount_default_pct,
    v_employee_discount_enabled,
    v_employee_discount_default_pct,
    v_employee_discount_combinable
  from public.org_preferences
  where org_id = p_org_id;

  if v_allow_negative is null then
    v_allow_negative := true;
  end if;

  if v_cash_discount_enabled is null then
    v_cash_discount_enabled := true;
  end if;

  if v_cash_discount_default_pct is null then
    v_cash_discount_default_pct := 10;
  end if;

  if v_employee_discount_enabled is null then
    v_employee_discount_enabled := true;
  end if;

  if v_employee_discount_default_pct is null then
    v_employee_discount_default_pct := 10;
  end if;

  if v_employee_discount_combinable is null then
    v_employee_discount_combinable := false;
  end if;

  insert into public.sales (
    id,
    org_id,
    branch_id,
    created_by,
    employee_account_id,
    employee_name_snapshot,
    payment_method,
    subtotal_amount,
    discount_amount,
    discount_pct,
    cash_discount_amount,
    cash_discount_pct,
    employee_discount_applied,
    employee_discount_amount,
    employee_discount_pct,
    total_amount,
    created_at
  )
  values (
    v_sale_id,
    p_org_id,
    p_branch_id,
    auth.uid(),
    null,
    null,
    case when v_effective_payment_method::text = 'mixed' then 'other'::public.payment_method else v_effective_payment_method end,
    0,
    0,
    0,
    0,
    0,
    false,
    0,
    0,
    0,
    v_created_at
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_items_count := v_items_count + 1;
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := (v_item ->> 'quantity')::numeric;

    select p.unit_price, p.name
      into v_price, v_name
    from public.products p
    where p.id = v_product_id
      and p.org_id = p_org_id;

    if v_price is null then
      raise exception 'product not found %', v_product_id;
    end if;

    select quantity_on_hand
      into v_current
    from public.stock_items
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = v_product_id
    for update;

    if v_current is null then
      v_current := 0;
    end if;

    if not v_allow_negative and v_current < v_qty then
      raise exception 'insufficient stock for %', v_product_id;
    end if;

    v_line_total := v_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into public.sale_items (
      org_id, sale_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total
    ) values (
      p_org_id, v_sale_id, v_product_id, v_name, v_price, v_qty, v_line_total
    );

    if v_current = 0 then
      insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
      values (p_org_id, p_branch_id, v_product_id, v_current - v_qty)
      on conflict (org_id, branch_id, product_id)
      do update set quantity_on_hand = public.stock_items.quantity_on_hand - v_qty;
    else
      update public.stock_items
        set quantity_on_hand = quantity_on_hand - v_qty
      where org_id = p_org_id
        and branch_id = p_branch_id
        and product_id = v_product_id;
    end if;

    insert into public.stock_movements (
      org_id, branch_id, product_id, movement_type, quantity_delta, source_type, source_id
    ) values (
      p_org_id, p_branch_id, v_product_id, 'sale', -v_qty, 'sale', v_sale_id
    );

    v_remaining := v_qty;
    for v_batch in
      select id, quantity
      from public.expiration_batches
      where org_id = p_org_id
        and branch_id = p_branch_id
        and product_id = v_product_id
        and quantity > 0
      order by expires_on asc, public.expiration_batches.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if v_batch.quantity >= v_remaining then
        update public.expiration_batches
          set quantity = quantity - v_remaining,
              updated_at = now()
        where id = v_batch.id;
        v_remaining := 0;
      else
        update public.expiration_batches
          set quantity = 0,
              updated_at = now()
        where id = v_batch.id;
        v_remaining := v_remaining - v_batch.quantity;
      end if;
    end loop;

    if p_special_order_id is not null then
      for v_item_rows in
        select id, requested_qty, fulfilled_qty
        from public.client_special_order_items
        where org_id = p_org_id
          and special_order_id = p_special_order_id
          and product_id = v_product_id
        order by public.client_special_order_items.created_at
        for update
      loop
        exit when v_qty <= 0;
        v_to_apply := least(v_qty, v_item_rows.requested_qty - v_item_rows.fulfilled_qty);
        if v_to_apply > 0 then
          update public.client_special_order_items
            set fulfilled_qty = fulfilled_qty + v_to_apply
          where id = v_item_rows.id;
          v_qty := v_qty - v_to_apply;
        end if;
      end loop;
    end if;
  end loop;

  v_total := v_subtotal;

  if p_payments is null then
    if v_effective_payment_method::text = 'mixed' then
      raise exception 'mixed payment requires payments detail';
    end if;

    v_payments_count := 1;
    v_single_payment_method := v_effective_payment_method;
    v_has_cash_payment := v_effective_payment_method = 'cash';
  else
    if jsonb_typeof(p_payments) <> 'array' then
      raise exception 'payments must be an array';
    end if;

    if jsonb_array_length(p_payments) = 0 then
      raise exception 'payments cannot be empty';
    end if;

    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      if coalesce(v_payment->>'payment_method', '') = '' then
        raise exception 'payment_method required in payments';
      end if;

      v_payment_method := (v_payment->>'payment_method')::public.payment_method;

      if v_payment_method::text = 'mixed' then
        raise exception 'mixed is not allowed inside payments detail';
      end if;

      v_payment_amount := round(coalesce((v_payment->>'amount')::numeric, 0), 2);
      if v_payment_amount <= 0 then
        raise exception 'payment amount must be greater than 0';
      end if;

      v_payment_device_id := nullif(v_payment->>'payment_device_id', '')::uuid;

      if v_payment_method::text in ('card', 'mercadopago') and v_payment_device_id is null then
        raise exception 'payment_device_id required for card and mercadopago';
      end if;

      if v_payment_method::text not in ('card', 'mercadopago') and v_payment_device_id is not null then
        raise exception 'payment_device_id only allowed for card and mercadopago';
      end if;

      if v_payment_device_id is not null and not exists (
        select 1
        from public.pos_payment_devices ppd
        where ppd.id = v_payment_device_id
          and ppd.org_id = p_org_id
          and ppd.branch_id = p_branch_id
          and ppd.is_active = true
      ) then
        raise exception 'invalid payment device';
      end if;

      v_payments_sum := v_payments_sum + v_payment_amount;
      v_payments_count := v_payments_count + 1;
      v_has_cash_payment := v_has_cash_payment or v_payment_method = 'cash';

      if v_payments_count = 1 then
        v_single_payment_method := v_payment_method;
        v_single_payment_device_id := v_payment_device_id;
      end if;

      v_payment_rows := v_payment_rows || jsonb_build_object(
        'payment_method', v_payment_method,
        'amount', v_payment_amount,
        'payment_device_id', v_payment_device_id
      );
    end loop;
  end if;

  if coalesce(p_apply_cash_discount, false) then
    if not v_cash_discount_enabled then
      raise exception 'cash discount disabled';
    end if;

    if not (v_payments_count = 1 and v_single_payment_method = 'cash') then
      raise exception 'cash discount only allowed for full cash payment';
    end if;

    v_cash_discount_applied := true;
    v_cash_discount_pct := coalesce(p_cash_discount_pct, v_cash_discount_default_pct, 0);

    if v_cash_discount_pct < 0 or v_cash_discount_pct > 100 then
      raise exception 'invalid cash discount pct';
    end if;

    v_cash_discount_amount := round((v_subtotal * v_cash_discount_pct) / 100.0, 2);
    v_total := greatest(v_subtotal - v_cash_discount_amount, 0);
  end if;

  if coalesce(p_apply_employee_discount, false) then
    if not v_employee_discount_enabled then
      raise exception 'employee discount disabled';
    end if;

    if p_employee_account_id is null then
      raise exception 'employee account required';
    end if;

    if not exists (
      select 1
      from public.employee_accounts ea
      where ea.id = p_employee_account_id
        and ea.org_id = p_org_id
        and ea.branch_id = p_branch_id
        and ea.is_active = true
    ) then
      raise exception 'invalid employee account';
    end if;

    if v_cash_discount_applied and not v_employee_discount_combinable then
      raise exception 'employee discount cannot be combined with cash discount';
    end if;

    v_employee_discount_applied := true;
    v_employee_discount_pct := coalesce(p_employee_discount_pct, v_employee_discount_default_pct, 0);

    if v_employee_discount_pct < 0 or v_employee_discount_pct > 100 then
      raise exception 'invalid employee discount pct';
    end if;

    select ea.name
      into v_employee_name_snapshot
    from public.employee_accounts ea
    where ea.id = p_employee_account_id
      and ea.org_id = p_org_id
      and ea.branch_id = p_branch_id
      and ea.is_active = true;

    v_employee_discount_amount := round((v_total * v_employee_discount_pct) / 100.0, 2);
    v_total := greatest(v_total - v_employee_discount_amount, 0);
  end if;

  v_discount_amount := round(v_cash_discount_amount + v_employee_discount_amount, 2);
  if v_subtotal > 0 then
    v_discount_pct := round((v_discount_amount * 100.0) / v_subtotal, 2);
  else
    v_discount_pct := 0;
  end if;

  if p_payments is null then
    v_payment_rows := jsonb_build_array(
      jsonb_build_object(
        'payment_method', v_effective_payment_method,
        'amount', v_total,
        'payment_device_id', v_single_payment_device_id
      )
    );
    v_payments_sum := v_total;
  end if;

  if round(v_payments_sum, 2) <> round(v_total, 2) then
    raise exception 'payments total must equal sale total';
  end if;

  if v_payments_count > 1 then
    v_summary_payment_method := 'mixed';
  else
    v_summary_payment_method := v_single_payment_method;
  end if;

  for v_payment in select * from jsonb_array_elements(v_payment_rows)
  loop
    insert into public.sale_payments (
      org_id,
      sale_id,
      payment_method,
      amount,
      payment_device_id,
      created_at
    ) values (
      p_org_id,
      v_sale_id,
      (v_payment->>'payment_method')::public.payment_method,
      (v_payment->>'amount')::numeric,
      nullif(v_payment->>'payment_device_id', '')::uuid,
      v_created_at
    );
  end loop;

  update public.sales
  set
    employee_account_id = case when v_employee_discount_applied then p_employee_account_id else null end,
    employee_name_snapshot = case when v_employee_discount_applied then v_employee_name_snapshot else null end,
    payment_method = v_summary_payment_method,
    subtotal_amount = v_subtotal,
    discount_amount = v_discount_amount,
    discount_pct = v_discount_pct,
    cash_discount_amount = v_cash_discount_amount,
    cash_discount_pct = v_cash_discount_pct,
    employee_discount_applied = v_employee_discount_applied,
    employee_discount_amount = v_employee_discount_amount,
    employee_discount_pct = v_employee_discount_pct,
    total_amount = v_total
  where id = v_sale_id;

  if p_special_order_id is not null then
    select status into v_order_status
    from public.client_special_orders
    where org_id = p_org_id and id = p_special_order_id;

    select count(*) into v_remaining_items
    from public.client_special_order_items
    where org_id = p_org_id
      and special_order_id = p_special_order_id
      and (requested_qty - fulfilled_qty) > 0;

    if p_close_special_order then
      update public.client_special_orders
        set status = 'delivered'
      where org_id = p_org_id and id = p_special_order_id;
    else
      if v_remaining_items = 0 then
        update public.client_special_orders
          set status = 'delivered'
        where org_id = p_org_id and id = p_special_order_id;
      else
        update public.client_special_orders
          set status = 'partial'
        where org_id = p_org_id and id = p_special_order_id;
      end if;
    end if;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_created',
    'sale',
    v_sale_id,
    p_branch_id,
    jsonb_build_object(
      'subtotal_amount', v_subtotal,
      'discount_amount', v_discount_amount,
      'discount_pct', v_discount_pct,
      'cash_discount_applied', v_cash_discount_applied,
      'cash_discount_amount', v_cash_discount_amount,
      'cash_discount_pct', v_cash_discount_pct,
      'employee_discount_applied', v_employee_discount_applied,
      'employee_discount_amount', v_employee_discount_amount,
      'employee_discount_pct', v_employee_discount_pct,
      'employee_account_id', case when v_employee_discount_applied then p_employee_account_id else null end,
      'employee_name_snapshot', case when v_employee_discount_applied then v_employee_name_snapshot else null end,
      'payment_method', v_summary_payment_method,
      'has_cash_component', v_has_cash_payment,
      'payments', v_payment_rows,
      'items_count', v_items_count,
      'total', v_total
    ),
    null
  );

  return query select v_sale_id, v_total, v_created_at;
end;
$$;

grant execute on function public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb,
  uuid,
  boolean,
  boolean,
  numeric,
  jsonb,
  uuid,
  boolean,
  numeric,
  uuid
) to authenticated;

grant execute on function public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb,
  uuid,
  boolean,
  boolean,
  numeric,
  jsonb,
  uuid,
  boolean,
  numeric,
  uuid
) to service_role;
