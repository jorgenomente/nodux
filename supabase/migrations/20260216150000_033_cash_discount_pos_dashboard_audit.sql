-- Cash discount support (fixed pct from preferences, apply only on cash sales)
-- Includes: org preferences fields, sales discount fields,
-- rpc_create_sale hardening, and dashboard metrics.

alter table public.org_preferences
  add column if not exists cash_discount_enabled boolean not null default true,
  add column if not exists cash_discount_default_pct numeric(5,2) not null default 10;

update public.org_preferences
set cash_discount_enabled = true
where cash_discount_enabled is null;

update public.org_preferences
set cash_discount_default_pct = 10
where cash_discount_default_pct is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'org_preferences_cash_discount_default_pct_ck'
  ) then
    alter table public.org_preferences
      add constraint org_preferences_cash_discount_default_pct_ck
      check (cash_discount_default_pct >= 0 and cash_discount_default_pct <= 100);
  end if;
end;
$$;

alter table public.sales
  add column if not exists subtotal_amount numeric(12,2),
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists discount_pct numeric(5,2) not null default 0;

update public.sales
set subtotal_amount = total_amount
where subtotal_amount is null;

update public.sales
set discount_amount = 0
where discount_amount is null;

update public.sales
set discount_pct = 0
where discount_pct is null;

alter table public.sales
  alter column subtotal_amount set not null,
  alter column subtotal_amount set default 0,
  alter column discount_amount set default 0,
  alter column discount_pct set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_discount_pct_range_ck'
  ) then
    alter table public.sales
      add constraint sales_discount_pct_range_ck
      check (discount_pct >= 0 and discount_pct <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_discount_amount_range_ck'
  ) then
    alter table public.sales
      add constraint sales_discount_amount_range_ck
      check (discount_amount >= 0 and discount_amount <= subtotal_amount);
  end if;
end;
$$;

drop function if exists public.rpc_get_dashboard_admin(uuid, uuid);
drop view if exists public.v_dashboard_admin;

create or replace view public.v_dashboard_admin as
with scopes as (
  select o.id as org_id, null::uuid as branch_id
  from public.orgs o
  union all
  select b.org_id, b.id as branch_id
  from public.branches b
),
metrics as (
  select
    s.org_id,
    s.branch_id,
    coalesce(sum(s.total_amount) filter (where s.created_at::date = current_date), 0) as sales_today_total,
    coalesce(count(*) filter (where s.created_at::date = current_date), 0) as sales_today_count,
    coalesce(sum(s.total_amount) filter (where s.created_at >= date_trunc('week', now())), 0) as sales_week_total,
    coalesce(sum(s.total_amount) filter (where s.created_at >= date_trunc('month', now())), 0) as sales_month_total,
    coalesce(sum(s.total_amount) filter (where s.payment_method = 'cash' and s.created_at::date = current_date), 0) as cash_sales_today_total,
    coalesce(count(*) filter (where s.payment_method = 'cash' and s.created_at::date = current_date), 0) as cash_sales_today_count,
    coalesce(sum(s.discount_amount) filter (where s.payment_method = 'cash' and s.created_at::date = current_date), 0) as cash_discount_today_total,
    coalesce(count(*) filter (where s.payment_method = 'cash' and s.discount_amount > 0 and s.created_at::date = current_date), 0) as cash_discounted_sales_today_count
  from public.sales s
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

create or replace function public.rpc_get_dashboard_admin(
  p_org_id uuid,
  p_branch_id uuid
)
returns table (
  org_id uuid,
  branch_id uuid,
  sales_today_total numeric,
  sales_today_count bigint,
  sales_week_total numeric,
  sales_month_total numeric,
  cash_sales_today_total numeric,
  cash_sales_today_count bigint,
  cash_discount_today_total numeric,
  cash_discounted_sales_today_count bigint,
  expirations_critical_count bigint,
  expirations_warning_count bigint,
  supplier_orders_pending_count bigint,
  client_orders_pending_count bigint
)
language sql
as $$
  select
    org_id,
    branch_id,
    sales_today_total,
    sales_today_count,
    sales_week_total,
    sales_month_total,
    cash_sales_today_total,
    cash_sales_today_count,
    cash_discount_today_total,
    cash_discounted_sales_today_count,
    expirations_critical_count,
    expirations_warning_count,
    supplier_orders_pending_count,
    client_orders_pending_count
  from public.v_dashboard_admin
  where org_id = p_org_id
    and (
      p_branch_id is null and branch_id is null
      or p_branch_id is not null and branch_id = p_branch_id
    );
$$;

grant execute on function public.rpc_get_dashboard_admin(uuid, uuid) to authenticated;

drop function if exists public.rpc_create_sale(uuid, uuid, public.payment_method, jsonb);
drop function if exists public.rpc_create_sale(uuid, uuid, public.payment_method, jsonb, uuid, boolean);

create or replace function public.rpc_create_sale(
  p_org_id uuid,
  p_branch_id uuid,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_special_order_id uuid default null,
  p_close_special_order boolean default false,
  p_apply_cash_discount boolean default false,
  p_cash_discount_pct numeric default null
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
  v_pos_enabled boolean := false;
  v_cash_discount_applied boolean := false;
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

  select
    allow_negative_stock,
    cash_discount_enabled,
    cash_discount_default_pct
  into
    v_allow_negative,
    v_cash_discount_enabled,
    v_cash_discount_default_pct
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

  if p_payment_method <> 'cash' and (coalesce(p_apply_cash_discount, false) or p_cash_discount_pct is not null) then
    raise exception 'cash discount only allowed for cash payment';
  end if;

  insert into public.sales (
    id,
    org_id,
    branch_id,
    created_by,
    payment_method,
    subtotal_amount,
    discount_amount,
    discount_pct,
    total_amount,
    created_at
  )
  values (
    v_sale_id,
    p_org_id,
    p_branch_id,
    auth.uid(),
    p_payment_method,
    0,
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

    -- Consume expiration batches (FEFO)
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

    -- Apply fulfillment to special order items
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

  if p_payment_method = 'cash' and coalesce(p_apply_cash_discount, false) and v_cash_discount_enabled then
    v_cash_discount_applied := true;
    v_discount_pct := coalesce(p_cash_discount_pct, v_cash_discount_default_pct, 0);

    if v_discount_pct < 0 or v_discount_pct > 100 then
      raise exception 'invalid cash discount pct';
    end if;

    v_discount_amount := round((v_subtotal * v_discount_pct) / 100.0, 2);
    v_total := greatest(v_subtotal - v_discount_amount, 0);
  end if;

  update public.sales
  set
    subtotal_amount = v_subtotal,
    discount_amount = v_discount_amount,
    discount_pct = v_discount_pct,
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
      'payment_method', p_payment_method,
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
  numeric
) to authenticated;
