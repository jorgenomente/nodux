-- Extend rpc_upsert_product with shelf life days

create or replace function public.rpc_upsert_product(
  p_product_id uuid,
  p_org_id uuid,
  p_name text,
  p_internal_code text,
  p_barcode text,
  p_sell_unit_type public.sell_unit_type,
  p_uom text,
  p_unit_price numeric,
  p_is_active boolean,
  p_shelf_life_days integer default null
)
returns table (product_id uuid)
language sql
as $$
  with upserted as (
    insert into public.products (
      id,
      org_id,
      name,
      internal_code,
      barcode,
      sell_unit_type,
      uom,
      unit_price,
      is_active,
      shelf_life_days
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
      coalesce(p_is_active, true),
      p_shelf_life_days
    )
    on conflict (id) do update set
      name = excluded.name,
      internal_code = excluded.internal_code,
      barcode = excluded.barcode,
      sell_unit_type = excluded.sell_unit_type,
      uom = excluded.uom,
      unit_price = excluded.unit_price,
      is_active = excluded.is_active,
      shelf_life_days = excluded.shelf_life_days
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'product_upsert',
      'product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'internal_code', p_internal_code,
        'barcode', p_barcode,
        'sell_unit_type', p_sell_unit_type,
        'uom', p_uom,
        'unit_price', p_unit_price,
        'is_active', p_is_active,
        'shelf_life_days', p_shelf_life_days
      ),
      null
    )
  )
  select id from upserted;
$$;
