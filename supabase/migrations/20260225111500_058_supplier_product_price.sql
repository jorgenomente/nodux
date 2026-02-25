-- Persist supplier price per product-supplier relation and expose it in detail view.

alter table public.supplier_products
  add column if not exists supplier_price numeric(14,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_products_supplier_price_nonnegative_ck'
  ) then
    alter table public.supplier_products
      add constraint supplier_products_supplier_price_nonnegative_ck
      check (supplier_price is null or supplier_price >= 0);
  end if;
end
$$;

drop view if exists public.v_supplier_detail_admin;

create view public.v_supplier_detail_admin as
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
  sp.supplier_price,
  sp.supplier_sku,
  sp.supplier_product_name,
  sp.relation_type,
  s.order_frequency,
  s.order_day,
  s.receive_day,
  s.payment_terms_days,
  s.preferred_payment_method,
  s.accepts_cash,
  s.accepts_transfer,
  s.payment_note,
  s.default_markup_pct
from public.suppliers s
left join public.supplier_products sp
  on sp.supplier_id = s.id
 and sp.org_id = s.org_id
left join public.products p
  on p.id = sp.product_id
 and p.org_id = s.org_id;

drop function if exists public.rpc_upsert_supplier_product(
  uuid,
  uuid,
  uuid,
  text,
  text
);

drop function if exists public.rpc_upsert_supplier_product(
  uuid,
  uuid,
  uuid,
  text,
  text,
  public.supplier_product_relation_type
);

create or replace function public.rpc_upsert_supplier_product(
  p_org_id uuid,
  p_supplier_id uuid,
  p_product_id uuid,
  p_supplier_sku text,
  p_supplier_product_name text,
  p_relation_type public.supplier_product_relation_type default 'primary',
  p_supplier_price numeric default null
)
returns table (id uuid)
language sql
as $$
  with upserted as (
    insert into public.supplier_products (
      org_id,
      supplier_id,
      product_id,
      supplier_price,
      supplier_sku,
      supplier_product_name,
      relation_type
    ) values (
      p_org_id,
      p_supplier_id,
      p_product_id,
      p_supplier_price,
      p_supplier_sku,
      p_supplier_product_name,
      p_relation_type
    )
    on conflict (org_id, product_id, relation_type) do update set
      supplier_id = excluded.supplier_id,
      supplier_price = excluded.supplier_price,
      supplier_sku = excluded.supplier_sku,
      supplier_product_name = excluded.supplier_product_name,
      relation_type = excluded.relation_type
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_upsert',
      'supplier_product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'product_id', p_product_id,
        'supplier_price', p_supplier_price,
        'supplier_sku', p_supplier_sku,
        'supplier_product_name', p_supplier_product_name,
        'relation_type', p_relation_type
      ),
      null
    )
  )
  select id from upserted;
$$;

grant execute on function public.rpc_upsert_supplier_product(
  uuid,
  uuid,
  uuid,
  text,
  text,
  public.supplier_product_relation_type,
  numeric
) to anon, authenticated, service_role;
