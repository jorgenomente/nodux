-- MVP views (baseline)

create or replace view public.v_stock_by_branch as
select
  si.org_id,
  si.branch_id,
  si.product_id,
  si.quantity_on_hand,
  si.updated_at
from public.stock_items si;

create or replace view public.v_products_admin as
select
  p.id as product_id,
  p.org_id,
  p.name,
  p.internal_code,
  p.barcode,
  p.sell_unit_type,
  p.uom,
  p.unit_price,
  p.is_active,
  p.created_at,
  p.updated_at,
  coalesce(sum(si.quantity_on_hand), 0) as stock_total
from public.products p
left join public.stock_items si
  on si.product_id = p.id
  and si.org_id = p.org_id
group by p.id;

create or replace view public.v_pos_product_catalog as
select
  p.id as product_id,
  p.org_id,
  p.name,
  p.internal_code,
  p.barcode,
  p.sell_unit_type,
  p.uom,
  p.unit_price,
  p.is_active,
  si.branch_id,
  coalesce(si.quantity_on_hand, 0) as stock_on_hand
from public.products p
left join public.stock_items si
  on si.product_id = p.id
  and si.org_id = p.org_id;

create or replace view public.v_products_typeahead_admin as
select
  p.id as product_id,
  p.org_id,
  p.name,
  p.is_active
from public.products p;

create or replace view public.v_suppliers_admin as
select
  s.id as supplier_id,
  s.org_id,
  s.name,
  s.contact_name,
  s.phone,
  s.email,
  s.notes,
  s.is_active,
  s.created_at,
  s.updated_at
from public.suppliers s;

create or replace view public.v_supplier_detail_admin as
select
  s.id as supplier_id,
  s.org_id,
  s.name,
  s.contact_name,
  s.phone,
  s.email,
  s.notes,
  s.is_active,
  s.created_at,
  s.updated_at,
  sp.product_id,
  p.name as product_name,
  p.is_active as product_is_active,
  p.barcode,
  p.internal_code,
  sp.supplier_sku,
  sp.supplier_product_name
from public.suppliers s
left join public.supplier_products sp
  on sp.supplier_id = s.id
  and sp.org_id = s.org_id
left join public.products p
  on p.id = sp.product_id
  and p.org_id = s.org_id;

create or replace view public.v_orders_admin as
select
  so.id as order_id,
  so.org_id,
  so.branch_id,
  b.name as branch_name,
  so.supplier_id,
  s.name as supplier_name,
  so.status,
  so.created_at,
  so.sent_at,
  so.received_at,
  so.reconciled_at,
  coalesce(items.items_count, 0) as items_count
from public.supplier_orders so
left join public.suppliers s
  on s.id = so.supplier_id
  and s.org_id = so.org_id
left join public.branches b
  on b.id = so.branch_id
  and b.org_id = so.org_id
left join (
  select order_id, count(*) as items_count
  from public.supplier_order_items
  group by order_id
) items
  on items.order_id = so.id;

create or replace view public.v_order_detail_admin as
select
  so.id as order_id,
  so.org_id,
  so.status,
  so.notes,
  so.supplier_id,
  s.name as supplier_name,
  so.branch_id,
  b.name as branch_name,
  so.created_at,
  so.sent_at,
  so.received_at,
  so.reconciled_at,
  soi.id as order_item_id,
  soi.product_id,
  p.name as product_name,
  soi.ordered_qty,
  soi.received_qty,
  soi.unit_cost,
  (soi.received_qty - soi.ordered_qty) as diff_qty
from public.supplier_orders so
left join public.suppliers s
  on s.id = so.supplier_id
  and s.org_id = so.org_id
left join public.branches b
  on b.id = so.branch_id
  and b.org_id = so.org_id
left join public.supplier_order_items soi
  on soi.order_id = so.id
  and soi.org_id = so.org_id
left join public.products p
  on p.id = soi.product_id
  and p.org_id = so.org_id;

create or replace view public.v_expirations_due as
select
  eb.id as batch_id,
  eb.org_id,
  eb.branch_id,
  b.name as branch_name,
  eb.product_id,
  p.name as product_name,
  eb.expires_on,
  (eb.expires_on - current_date) as days_left,
  eb.quantity,
  op.critical_days,
  op.warning_days,
  case
    when (eb.expires_on - current_date) <= op.critical_days then 'critical'
    when (eb.expires_on - current_date) <= op.warning_days then 'warning'
    else 'info'
  end as severity
from public.expiration_batches eb
left join public.products p
  on p.id = eb.product_id
  and p.org_id = eb.org_id
left join public.branches b
  on b.id = eb.branch_id
  and b.org_id = eb.org_id
left join public.org_preferences op
  on op.org_id = eb.org_id;

create or replace view public.v_expiration_batch_detail as
select
  eb.id as batch_id,
  eb.org_id,
  eb.branch_id,
  b.name as branch_name,
  eb.product_id,
  p.name as product_name,
  eb.expires_on,
  eb.quantity,
  eb.source_type,
  eb.source_ref_id,
  eb.created_at,
  eb.updated_at
from public.expiration_batches eb
left join public.products p
  on p.id = eb.product_id
  and p.org_id = eb.org_id
left join public.branches b
  on b.id = eb.branch_id
  and b.org_id = eb.org_id;

create or replace view public.v_branches_admin as
select
  b.id as branch_id,
  b.org_id,
  b.name,
  b.address,
  b.is_active,
  b.created_at,
  b.updated_at,
  coalesce(m.members_count, 0) as members_count
from public.branches b
left join (
  select branch_id, count(*) as members_count
  from public.branch_memberships
  where is_active = true
  group by branch_id
) m on m.branch_id = b.id;

create or replace view public.v_settings_users_admin as
select
  ou.org_id,
  ou.user_id,
  au.email,
  ou.display_name,
  ou.role,
  ou.is_active,
  ou.created_at,
  array_remove(array_agg(bm.branch_id), null) as branch_ids
from public.org_users ou
left join auth.users au on au.id = ou.user_id
left join public.branch_memberships bm
  on bm.user_id = ou.user_id
  and bm.org_id = ou.org_id
  and bm.is_active = true
group by ou.org_id, ou.user_id, au.email, ou.display_name, ou.role, ou.is_active, ou.created_at;

create or replace view public.v_staff_effective_modules as
with memberships as (
  select bm.org_id, bm.branch_id
  from public.branch_memberships bm
  where bm.user_id = auth.uid()
    and bm.is_active = true
),
module_keys as (
  select sma.org_id, sma.branch_id, sma.module_key, sma.is_enabled
  from public.staff_module_access sma
  where sma.role = 'staff'
),
resolved as (
  select
    m.org_id,
    m.branch_id,
    mk.module_key,
    case
      when bo.module_key is not null then bo.is_enabled
      when od.module_key is not null then od.is_enabled
      else false
    end as is_enabled,
    case
      when bo.module_key is not null then 'branch_override'
      when od.module_key is not null then 'org_default'
      else 'none'
    end as source_scope
  from memberships m
  join (
    select distinct org_id, module_key
    from module_keys
  ) mk on mk.org_id = m.org_id
  left join module_keys od
    on od.org_id = m.org_id
    and od.branch_id is null
    and od.module_key = mk.module_key
  left join module_keys bo
    on bo.org_id = m.org_id
    and bo.branch_id = m.branch_id
    and bo.module_key = mk.module_key
)
select * from resolved;

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
    coalesce(sum(s.total_amount) filter (where s.created_at >= date_trunc('month', now())), 0) as sales_month_total
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
