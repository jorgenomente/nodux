-- Hardening anti-duplicados de catálogo: nombre y barcode normalizados.

create or replace function public.normalize_product_catalog_text(p_value text)
returns text
language sql
immutable
strict
as $$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          translate(
            lower(trim(p_value)),
            'áàäâãéèëêíìïîóòöôõúùüûñç',
            'aaaaaeeeeiiiiooooouuuunc'
          ),
          '[^a-z0-9]+',
          ' ',
          'g'
        ),
        '[[:space:]]+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

alter table public.products
  add column if not exists name_normalized text
  generated always as (public.normalize_product_catalog_text(name)) stored;

alter table public.products
  add column if not exists barcode_normalized text
  generated always as (nullif(regexp_replace(coalesce(barcode, ''), '[^0-9]', '', 'g'), '')) stored;

create unique index if not exists products_org_name_normalized_uq
  on public.products (org_id, name_normalized)
  where name_normalized is not null;

create unique index if not exists products_org_barcode_normalized_uq
  on public.products (org_id, barcode_normalized)
  where barcode_normalized is not null;

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
      is_active
    )
    values (
      coalesce(p_product_id, gen_random_uuid()),
      p_org_id,
      trim(p_name),
      nullif(trim(coalesce(p_internal_code, '')), ''),
      nullif(trim(coalesce(p_barcode, '')), ''),
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
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'product_upsert',
      'product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', trim(p_name),
        'internal_code', nullif(trim(coalesce(p_internal_code, '')), ''),
        'barcode', nullif(trim(coalesce(p_barcode, '')), ''),
        'sell_unit_type', p_sell_unit_type,
        'uom', p_uom,
        'unit_price', p_unit_price,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;

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
      trim(p_name),
      nullif(trim(coalesce(p_internal_code, '')), ''),
      nullif(trim(coalesce(p_barcode, '')), ''),
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
        'name', trim(p_name),
        'internal_code', nullif(trim(coalesce(p_internal_code, '')), ''),
        'barcode', nullif(trim(coalesce(p_barcode, '')), ''),
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
