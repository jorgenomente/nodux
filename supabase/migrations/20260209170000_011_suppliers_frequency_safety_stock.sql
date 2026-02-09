-- Suppliers frequency + product relation type + safety stock + suggestions

-- Enums
create type public.order_frequency as enum ('weekly', 'biweekly', 'every_3_weeks', 'monthly');
create type public.weekday as enum ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
create type public.supplier_product_relation_type as enum ('primary', 'secondary');

-- Suppliers scheduling fields
alter table public.suppliers
  add column if not exists order_frequency public.order_frequency,
  add column if not exists order_day public.weekday,
  add column if not exists receive_day public.weekday;

-- Supplier product relation type
alter table public.supplier_products
  add column if not exists relation_type public.supplier_product_relation_type not null default 'primary';

update public.supplier_products
  set relation_type = 'primary'
where relation_type is null;

alter table public.supplier_products
  add constraint supplier_products_org_product_relation_key
  unique (org_id, product_id, relation_type);

-- Safety stock per branch
alter table public.stock_items
  add column if not exists safety_stock numeric(14,3) not null default 0;

-- Update supplier detail view with relation type
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
  sp.relation_type
from public.suppliers s
left join public.supplier_products sp
  on sp.supplier_id = s.id
  and sp.org_id = s.org_id
left join public.products p
  on p.id = sp.product_id
  and p.org_id = s.org_id;

-- Suggestions view based on last 30 days
create or replace view public.v_supplier_product_suggestions as
with sales_30d as (
  select
    si.org_id,
    s.branch_id,
    si.product_id,
    sum(si.quantity) as total_qty
  from public.sale_items si
  join public.sales s
    on s.id = si.sale_id
    and s.org_id = si.org_id
  where s.created_at >= (now() - interval '30 days')
  group by si.org_id, s.branch_id, si.product_id
),
cycle_days as (
  select
    s.id as supplier_id,
    case s.order_frequency
      when 'weekly' then 7
      when 'biweekly' then 14
      when 'every_3_weeks' then 21
      when 'monthly' then 30
      else 30
    end as days
  from public.suppliers s
)
select
  sp.org_id,
  sp.supplier_id,
  b.id as branch_id,
  sp.product_id,
  p.name as product_name,
  sp.relation_type,
  coalesce(si.quantity_on_hand, 0) as stock_on_hand,
  coalesce(si.safety_stock, 0) as safety_stock,
  coalesce(s30.total_qty, 0) / 30.0 as avg_daily_sales_30d,
  cd.days as cycle_days,
  greatest(
    0,
    (coalesce(s30.total_qty, 0) / 30.0) * cd.days
    + coalesce(si.safety_stock, 0)
    - coalesce(si.quantity_on_hand, 0)
  ) as suggested_qty
from public.supplier_products sp
join public.products p
  on p.id = sp.product_id
  and p.org_id = sp.org_id
join public.suppliers s
  on s.id = sp.supplier_id
  and s.org_id = sp.org_id
join public.branches b
  on b.org_id = sp.org_id
  and b.is_active = true
left join public.stock_items si
  on si.org_id = sp.org_id
  and si.product_id = sp.product_id
  and si.branch_id = b.id
left join sales_30d s30
  on s30.org_id = sp.org_id
  and s30.product_id = sp.product_id
  and s30.branch_id = b.id
left join cycle_days cd
  on cd.supplier_id = sp.supplier_id
where p.is_active = true;

-- Update RPCs for supplier_products
create or replace function public.rpc_upsert_supplier_product(
  p_org_id uuid,
  p_supplier_id uuid,
  p_product_id uuid,
  p_supplier_sku text,
  p_supplier_product_name text,
  p_relation_type public.supplier_product_relation_type default 'primary'
)
returns table (id uuid)
language sql
as $$
  with upserted as (
    insert into public.supplier_products (
      org_id, supplier_id, product_id, supplier_sku, supplier_product_name, relation_type
    ) values (
      p_org_id, p_supplier_id, p_product_id, p_supplier_sku, p_supplier_product_name, p_relation_type
    )
    on conflict (org_id, product_id, relation_type) do update set
      supplier_id = excluded.supplier_id,
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
        'supplier_sku', p_supplier_sku,
        'supplier_product_name', p_supplier_product_name,
        'relation_type', p_relation_type
      ),
      null
    )
  )
  select id from upserted;
$$;

create or replace function public.rpc_remove_supplier_product(
  p_org_id uuid,
  p_supplier_id uuid,
  p_product_id uuid
)
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_products
  where org_id = p_org_id
    and supplier_id = p_supplier_id
    and product_id = p_product_id;

  delete from public.supplier_products
  where org_id = p_org_id
    and supplier_id = p_supplier_id
    and product_id = p_product_id;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_removed',
      'supplier_product',
      v_id,
      null,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'product_id', p_product_id
      ),
      null
    );
  end if;
end;
$$;

create or replace function public.rpc_remove_supplier_product_relation(
  p_org_id uuid,
  p_product_id uuid,
  p_relation_type public.supplier_product_relation_type
)
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_products
  where org_id = p_org_id
    and product_id = p_product_id
    and relation_type = p_relation_type;

  delete from public.supplier_products
  where org_id = p_org_id
    and product_id = p_product_id
    and relation_type = p_relation_type;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_removed',
      'supplier_product',
      v_id,
      null,
      jsonb_build_object(
        'product_id', p_product_id,
        'relation_type', p_relation_type
      ),
      null
    );
  end if;
end;
$$;
