-- Productos: categorias por hashtags para maestro, recepcion y filtro storefront.

create or replace function public.normalize_product_category_tags(p_tags text[])
returns text[]
language sql
immutable
as $$
  with raw_tags as (
    select
      ord,
      trim(
        both '-' from regexp_replace(
          translate(
            lower(coalesce(tag, '')),
            'áàäâãéèëêíìïîóòöôõúùüûñç',
            'aaaaaeeeeiiiiooooouuuunc'
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      ) as normalized
    from unnest(coalesce(p_tags, '{}'::text[])) with ordinality as source(tag, ord)
  ),
  prefixed as (
    select
      ord,
      case
        when normalized = '' then null
        else '#' || normalized
      end as tag
    from raw_tags
  ),
  deduped as (
    select distinct on (tag)
      tag,
      ord
    from prefixed
    where tag is not null
    order by tag, ord
  )
  select coalesce(array_agg(tag order by ord), '{}'::text[])
  from deduped;
$$;

create or replace function public.trg_products_normalize_category_tags()
returns trigger
language plpgsql
as $$
begin
  new.category_tags := public.normalize_product_category_tags(new.category_tags);
  return new;
end;
$$;

alter table public.products
  add column if not exists category_tags text[] not null default '{}'::text[];

update public.products
set category_tags = public.normalize_product_category_tags(category_tags)
where category_tags is distinct from public.normalize_product_category_tags(category_tags);

drop trigger if exists trg_products_normalize_category_tags on public.products;

create trigger trg_products_normalize_category_tags
before insert or update of category_tags on public.products
for each row
execute function public.trg_products_normalize_category_tags();

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
  p.category_tags,
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
  p.category_tags,
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
  p.category_tags,
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

drop function if exists public.rpc_get_public_storefront_products(text, text);

create function public.rpc_get_public_storefront_products(
  p_org_slug text,
  p_branch_slug text
)
returns table (
  org_name text,
  org_slug text,
  branch_name text,
  branch_slug text,
  product_id uuid,
  product_name text,
  unit_price numeric,
  stock_on_hand numeric,
  image_url text,
  category_tags text[],
  is_available boolean,
  whatsapp_phone text,
  pickup_instructions text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    o.name,
    o.storefront_slug,
    b.name,
    b.storefront_slug,
    p.id,
    p.name,
    p.unit_price,
    coalesce(si.quantity_on_hand, 0::numeric) as stock_on_hand,
    p.image_url,
    p.category_tags,
    (p.is_active and coalesce(si.quantity_on_hand, 0::numeric) > 0::numeric),
    coalesce(
      nullif(btrim(b.storefront_whatsapp_phone), ''),
      nullif(btrim(ss.whatsapp_phone), '')
    ) as whatsapp_phone,
    ss.pickup_instructions
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  join public.products p
    on p.org_id = o.id
   and p.is_active = true
  left join public.stock_items si
    on si.org_id = o.id
   and si.branch_id = b.id
   and si.product_id = p.id
  where o.is_active = true
    and o.storefront_slug = p_org_slug
    and b.storefront_slug = p_branch_slug
  order by p.name;
end;
$$;

grant execute on function public.rpc_get_public_storefront_products(text, text) to anon;
grant execute on function public.rpc_get_public_storefront_products(text, text) to authenticated;
grant execute on function public.rpc_get_public_storefront_products(text, text) to service_role;
