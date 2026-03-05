-- Evita conflicto unique (org_id, supplier_id, product_id) al promover
-- un proveedor ya existente en el producto desde secondary -> primary (o viceversa).

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
  with cleared_same_supplier as (
    delete from public.supplier_products sp
    where sp.org_id = p_org_id
      and sp.product_id = p_product_id
      and sp.supplier_id = p_supplier_id
      and sp.relation_type <> p_relation_type
    returning sp.id
  ),
  upserted as (
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
