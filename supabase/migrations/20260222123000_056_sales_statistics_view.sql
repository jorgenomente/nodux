-- Sales statistics base contract for /sales/statistics

create or replace view public.v_sales_statistics_items
with (security_invoker = true) as
select
  s.id as sale_id,
  s.org_id,
  s.branch_id,
  b.name as branch_name,
  s.created_at,
  si.product_id,
  si.product_name_snapshot as product_name,
  si.quantity,
  si.unit_price_snapshot as unit_price,
  si.line_total,
  sp.supplier_id,
  sup.name as supplier_name
from public.sales s
join public.branches b
  on b.id = s.branch_id
 and b.org_id = s.org_id
join public.sale_items si
  on si.sale_id = s.id
 and si.org_id = s.org_id
left join public.supplier_products sp
  on sp.org_id = s.org_id
 and sp.product_id = si.product_id
 and sp.relation_type = 'primary'
left join public.suppliers sup
  on sup.id = sp.supplier_id
 and sup.org_id = s.org_id;

grant select on public.v_sales_statistics_items to authenticated;
grant select on public.v_sales_statistics_items to service_role;
