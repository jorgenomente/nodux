-- Productos: compra por paquete (unidades por paquete) + contratos de vistas para orders/onboarding.

alter table public.products
  add column if not exists purchase_by_pack boolean not null default false,
  add column if not exists units_per_pack integer;

alter table public.products
  drop constraint if exists products_purchase_pack_consistency_ck;

alter table public.products
  add constraint products_purchase_pack_consistency_ck
  check (
    (purchase_by_pack = false and units_per_pack is null)
    or (purchase_by_pack = true and units_per_pack is not null and units_per_pack > 1)
  );

drop view if exists public.v_products_incomplete_admin;

create view public.v_products_incomplete_admin
with (security_invoker = true) as
with primary_relation as (
  select
    sp.org_id,
    sp.product_id,
    bool_or(sp.relation_type = 'primary') as has_primary_supplier
  from public.supplier_products sp
  group by sp.org_id, sp.product_id
)
select
  p.org_id,
  p.id,
  p.name,
  p.brand,
  p.internal_code,
  p.barcode,
  p.purchase_by_pack,
  p.units_per_pack,
  p.sell_unit_type,
  p.uom,
  p.unit_price,
  p.shelf_life_days,
  coalesce(pr.has_primary_supplier, false) as has_primary_supplier,
  coalesce(pr.has_primary_supplier, false) = false as missing_primary_supplier,
  p.shelf_life_days is null as missing_shelf_life,
  (
    nullif(trim(coalesce(p.barcode, '')), '') is null
    and nullif(trim(coalesce(p.internal_code, '')), '') is null
  ) as missing_identifier
from public.products p
left join primary_relation pr
  on pr.org_id = p.org_id
 and pr.product_id = p.id
where p.is_active = true
  and (
    coalesce(pr.has_primary_supplier, false) = false
    or p.shelf_life_days is null
    or (
      nullif(trim(coalesce(p.barcode, '')), '') is null
      and nullif(trim(coalesce(p.internal_code, '')), '') is null
    )
  );

drop view if exists public.v_products_admin;

create view public.v_products_admin as
select
  p.id as product_id,
  p.org_id,
  p.name,
  p.brand,
  p.internal_code,
  p.barcode,
  p.purchase_by_pack,
  p.units_per_pack,
  p.sell_unit_type,
  p.uom,
  p.unit_price,
  p.image_url,
  p.is_active,
  p.created_at,
  p.updated_at,
  coalesce(sum(coalesce(si.quantity_on_hand, 0)), 0) as stock_total,
  jsonb_agg(
    jsonb_build_object(
      'branch_id', b.id,
      'branch_name', b.name,
      'quantity_on_hand', coalesce(si.quantity_on_hand, 0)
    )
    order by b.name
  ) as stock_by_branch,
  p.shelf_life_days
from public.products p
join public.branches b
  on b.org_id = p.org_id
left join public.stock_items si
  on si.product_id = p.id
  and si.branch_id = b.id
  and si.org_id = p.org_id
group by p.id;

drop view if exists public.v_supplier_product_suggestions;

create view public.v_supplier_product_suggestions as
with sales_30d as (
  select
    si.org_id,
    s.branch_id,
    si.product_id,
    sum(si.quantity) as total_qty
  from public.sale_items si
  join public.sales s
    on s.id = si.sale_id
    and s.org_id = si.org_id
  where s.created_at >= (now() - interval '30 days')
  group by si.org_id, s.branch_id, si.product_id
),
cycle_days as (
  select
    s.id as supplier_id,
    case s.order_frequency
      when 'weekly' then 7
      when 'biweekly' then 14
      when 'every_3_weeks' then 21
      when 'monthly' then 30
      else 30
    end as days
  from public.suppliers s
)
select
  sp.org_id,
  sp.supplier_id,
  b.id as branch_id,
  sp.product_id,
  p.name as product_name,
  p.purchase_by_pack,
  p.units_per_pack,
  sp.relation_type,
  coalesce(si.quantity_on_hand, 0) as stock_on_hand,
  coalesce(si.safety_stock, 0) as safety_stock,
  coalesce(s30.total_qty, 0) / 30.0 as avg_daily_sales_30d,
  cd.days as cycle_days,
  greatest(
    0,
    (coalesce(s30.total_qty, 0) / 30.0) * cd.days
    + coalesce(si.safety_stock, 0)
    - coalesce(si.quantity_on_hand, 0)
  ) as suggested_qty
from public.supplier_products sp
join public.products p
  on p.id = sp.product_id
  and p.org_id = sp.org_id
join public.suppliers s
  on s.id = sp.supplier_id
  and s.org_id = sp.org_id
join public.branches b
  on b.org_id = sp.org_id
  and b.is_active = true
left join public.stock_items si
  on si.org_id = sp.org_id
  and si.product_id = sp.product_id
  and si.branch_id = b.id
left join sales_30d s30
  on s30.org_id = sp.org_id
  and s30.product_id = sp.product_id
  and s30.branch_id = b.id
left join cycle_days cd
  on cd.supplier_id = sp.supplier_id
where p.is_active = true;

drop view if exists public.v_order_detail_admin;

create view public.v_order_detail_admin as
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
  so.expected_receive_on,
  so.controlled_by_user_id,
  so.controlled_by_name,
  ou.display_name as controlled_by_user_name,
  soi.id as order_item_id,
  soi.product_id,
  p.name as product_name,
  p.purchase_by_pack,
  p.units_per_pack,
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
left join public.org_users ou
  on ou.user_id = so.controlled_by_user_id
  and ou.org_id = so.org_id
left join public.supplier_order_items soi
  on soi.order_id = so.id
  and soi.org_id = so.org_id
left join public.products p
  on p.id = soi.product_id
  and p.org_id = so.org_id;
