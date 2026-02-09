-- Allow nullable product id for upsert

create or replace function public.rpc_upsert_product(
  p_product_id uuid,
  p_org_id uuid,
  p_name text,
  p_internal_code text,
  p_barcode text,
  p_sell_unit_type public.sell_unit_type,
  p_uom text,
  p_unit_price numeric,
  p_is_active boolean
)
returns table (product_id uuid)
language sql
as $$
  insert into public.products (
    id, org_id, name, internal_code, barcode, sell_unit_type, uom, unit_price, is_active
  )
  values (
    coalesce(p_product_id, gen_random_uuid()),
    p_org_id,
    p_name,
    p_internal_code,
    p_barcode,
    p_sell_unit_type,
    p_uom,
    p_unit_price,
    coalesce(p_is_active, true)
  )
  on conflict (id) do update set
    name = excluded.name,
    internal_code = excluded.internal_code,
    barcode = excluded.barcode,
    sell_unit_type = excluded.sell_unit_type,
    uom = excluded.uom,
    unit_price = excluded.unit_price,
    is_active = excluded.is_active
  returning id;
$$;
