-- Extend suppliers views with scheduling fields

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
  coalesce(sp_count.products_count, 0) as products_count,
  s.order_frequency,
  s.order_day,
  s.receive_day
from public.suppliers s
left join (
  select supplier_id, count(*) as products_count
  from public.supplier_products
  group by supplier_id
) sp_count
  on sp_count.supplier_id = s.id;

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
  sp.supplier_product_name,
  sp.relation_type,
  s.order_frequency,
  s.order_day,
  s.receive_day
from public.suppliers s
left join public.supplier_products sp
  on sp.supplier_id = s.id
  and sp.org_id = s.org_id
left join public.products p
  on p.id = sp.product_id
  and p.org_id = s.org_id;
