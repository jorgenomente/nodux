-- Sales invoicing split: billed vs non-billed, deferred invoicing RPC, and dashboard metrics.

alter table public.sales
  add column if not exists is_invoiced boolean not null default false,
  add column if not exists invoiced_at timestamptz;

update public.sales
set is_invoiced = coalesce(is_invoiced, false)
where is_invoiced is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_invoiced_at_required_ck'
  ) then
    alter table public.sales
      add constraint sales_invoiced_at_required_ck
      check (not is_invoiced or invoiced_at is not null);
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
    s.is_invoiced,
    coalesce(sum(sp.amount) filter (where sp.payment_method = 'cash'), 0) as cash_collected_amount,
    count(*) filter (where sp.payment_method = 'cash') > 0 as has_cash_component
  from public.sales s
  left join public.sale_payments sp on sp.sale_id = s.id
  group by s.id, s.org_id, s.branch_id, s.created_at, s.total_amount, s.cash_discount_amount, s.is_invoiced
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
    coalesce(count(*) filter (where s.created_at::date = current_date and s.cash_discount_amount > 0), 0) as cash_discounted_sales_today_count,
    coalesce(sum(s.total_amount) filter (where s.created_at::date = current_date and s.is_invoiced), 0) as invoiced_sales_today_total,
    coalesce(count(*) filter (where s.created_at::date = current_date and s.is_invoiced), 0) as invoiced_sales_today_count,
    coalesce(sum(s.total_amount) filter (where s.created_at::date = current_date and not s.is_invoiced), 0) as non_invoiced_sales_today_total,
    coalesce(count(*) filter (where s.created_at::date = current_date and not s.is_invoiced), 0) as non_invoiced_sales_today_count
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
  coalesce(c.client_orders_pending_count, 0) as client_orders_pending_count,
  coalesce(m.invoiced_sales_today_total, 0) as invoiced_sales_today_total,
  coalesce(m.invoiced_sales_today_count, 0) as invoiced_sales_today_count,
  coalesce(m.non_invoiced_sales_today_total, 0) as non_invoiced_sales_today_total,
  coalesce(m.non_invoiced_sales_today_count, 0) as non_invoiced_sales_today_count
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
  s.employee_discount_pct,
  s.is_invoiced,
  s.invoiced_at
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
  s.employee_discount_pct,
  s.is_invoiced,
  s.invoiced_at
from public.sales s
join public.branches b
  on b.id = s.branch_id
 and b.org_id = s.org_id
left join items_by_sale ibs on ibs.sale_id = s.id
left join payments_by_sale pbs on pbs.sale_id = s.id
left join creator_names cn
  on cn.org_id = s.org_id
 and cn.user_id = s.created_by;

drop function if exists public.rpc_get_dashboard_admin(uuid, uuid);

create function public.rpc_get_dashboard_admin(
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
  client_orders_pending_count bigint,
  invoiced_sales_today_total numeric,
  invoiced_sales_today_count bigint,
  non_invoiced_sales_today_total numeric,
  non_invoiced_sales_today_count bigint
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
    client_orders_pending_count,
    invoiced_sales_today_total,
    invoiced_sales_today_count,
    non_invoiced_sales_today_total,
    non_invoiced_sales_today_count
  from public.v_dashboard_admin
  where org_id = p_org_id
    and (
      p_branch_id is null and branch_id is null
      or p_branch_id is not null and branch_id = p_branch_id
    );
$$;

create or replace function public.rpc_mark_sale_invoiced(
  p_org_id uuid,
  p_sale_id uuid,
  p_source text default 'manual'
)
returns table (
  sale_id uuid,
  is_invoiced boolean,
  invoiced_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_sale public.sales%rowtype;
  v_pos_enabled boolean := false;
  v_source text := nullif(trim(coalesce(p_source, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
    and org_id = p_org_id;

  if v_sale.id is null then
    raise exception 'sale not found';
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
        and bm.branch_id = v_sale.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (
        select sma.is_enabled
        from public.staff_module_access sma
        where sma.org_id = p_org_id
          and sma.branch_id = v_sale.branch_id
          and sma.role = 'staff'
          and sma.module_key = 'pos'
        limit 1
      ),
      (
        select sma.is_enabled
        from public.staff_module_access sma
        where sma.org_id = p_org_id
          and sma.branch_id is null
          and sma.role = 'staff'
          and sma.module_key = 'pos'
        limit 1
      ),
      false
    )
    into v_pos_enabled;

    if not v_pos_enabled then
      raise exception 'pos module disabled';
    end if;
  end if;

  update public.sales
  set
    is_invoiced = true,
    invoiced_at = coalesce(invoiced_at, now())
  where id = p_sale_id
    and org_id = p_org_id;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_marked_invoiced',
    'sale',
    p_sale_id,
    v_sale.branch_id,
    jsonb_build_object(
      'source', coalesce(v_source, 'manual'),
      'invoiced_at', v_sale.invoiced_at
    ),
    null
  );

  return query
  select v_sale.id, v_sale.is_invoiced, v_sale.invoiced_at;
end;
$$;

grant all on function public.rpc_get_dashboard_admin(uuid, uuid) to anon;
grant all on function public.rpc_get_dashboard_admin(uuid, uuid) to authenticated;
grant all on function public.rpc_get_dashboard_admin(uuid, uuid) to service_role;

grant all on function public.rpc_mark_sale_invoiced(uuid, uuid, text) to anon;
grant all on function public.rpc_mark_sale_invoiced(uuid, uuid, text) to authenticated;
grant all on function public.rpc_mark_sale_invoiced(uuid, uuid, text) to service_role;
