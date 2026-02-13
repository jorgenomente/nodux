-- Add expected receive date for supplier orders and expose it in orders views

alter table public.supplier_orders
  add column if not exists expected_receive_on date;

create index if not exists supplier_orders_expected_receive_on_idx
  on public.supplier_orders (org_id, branch_id, expected_receive_on)
  where expected_receive_on is not null;

drop view if exists public.v_order_detail_admin;
drop view if exists public.v_orders_admin;

create view public.v_orders_admin as
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
  so.expected_receive_on,
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
