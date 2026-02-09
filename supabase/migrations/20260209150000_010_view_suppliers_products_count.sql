-- Add products_count to suppliers admin view

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
  s.updated_at,
  coalesce(sp_count.products_count, 0) as products_count
from public.suppliers s
left join (
  select supplier_id, count(*) as products_count
  from public.supplier_products
  group by supplier_id
) sp_count
  on sp_count.supplier_id = s.id;
