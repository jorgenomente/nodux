-- Onboarding: paginated resolver contract for products with incomplete data.
create or replace view public.v_products_incomplete_admin
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
