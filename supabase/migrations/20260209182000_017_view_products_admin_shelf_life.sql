-- Include shelf_life_days in products admin view

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
