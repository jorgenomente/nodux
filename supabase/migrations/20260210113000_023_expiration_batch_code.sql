-- Add batch_code for expiration batches and generate it on order reception

alter table public.expiration_batches
  add column if not exists batch_code text;

drop view if exists public.v_expirations_due;

create view public.v_expirations_due as
select
  eb.id as batch_id,
  eb.org_id,
  eb.branch_id,
  b.name as branch_name,
  eb.product_id,
  p.name as product_name,
  eb.expires_on,
  (eb.expires_on - current_date) as days_left,
  eb.quantity,
  eb.batch_code,
  op.critical_days,
  op.warning_days,
  case
    when (eb.expires_on - current_date) <= op.critical_days then 'critical'
    when (eb.expires_on - current_date) <= op.warning_days then 'warning'
    else 'info'
  end as severity
from public.expiration_batches eb
left join public.products p
  on p.id = eb.product_id
  and p.org_id = eb.org_id
left join public.branches b
  on b.id = eb.branch_id
  and b.org_id = eb.org_id
left join public.org_preferences op
  on op.org_id = eb.org_id
where eb.quantity > 0;

drop view if exists public.v_expiration_batch_detail;

create view public.v_expiration_batch_detail as
select
  eb.id as batch_id,
  eb.org_id,
  eb.branch_id,
  b.name as branch_name,
  eb.product_id,
  p.name as product_name,
  eb.expires_on,
  (eb.expires_on - current_date) as days_left,
  eb.quantity,
  eb.batch_code,
  eb.source_type,
  eb.source_ref_id,
  eb.created_at
from public.expiration_batches eb
left join public.products p
  on p.id = eb.product_id
  and p.org_id = eb.org_id
left join public.branches b
  on b.id = eb.branch_id
  and b.org_id = eb.org_id;

create or replace function public.rpc_receive_supplier_order(
  p_org_id uuid,
  p_order_id uuid,
  p_items jsonb,
  p_received_at timestamptz default null,
  p_controlled_by_user_id uuid default null,
  p_controlled_by_name text default null
)
returns void
language plpgsql
as $$
declare
  v_item jsonb;
  v_order record;
  v_item_id uuid;
  v_received_qty numeric(14,3);
  v_product_id uuid;
  v_shelf_life_days integer;
  v_expires_on date;
  v_received_ts timestamptz;
  v_received_date date;
  v_supplier_name text;
  v_supplier_code text;
  v_seq int;
  v_batch_code text;
begin
  select * into v_order
  from public.supplier_orders
  where id = p_order_id and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status <> 'sent' then
    raise exception 'order must be sent before received';
  end if;

  v_received_ts := coalesce(p_received_at, now());
  v_received_date := v_received_ts::date;

  select name into v_supplier_name
  from public.suppliers
  where id = v_order.supplier_id and org_id = p_org_id;

  v_supplier_code := upper(left(
    regexp_replace(
      translate(coalesce(v_supplier_name, ''), 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'),
      '[^A-Za-z]',
      '',
      'g'
    ),
    3
  ));

  if v_supplier_code is null or length(v_supplier_code) < 3 then
    v_supplier_code := 'SUP';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'order_item_id')::uuid;
    v_received_qty := (v_item ->> 'received_qty')::numeric;

    update public.supplier_order_items
      set received_qty = v_received_qty
    where id = v_item_id
      and order_id = p_order_id
      and org_id = p_org_id
    returning product_id into v_product_id;

    if v_product_id is null then
      raise exception 'order item not found %', v_item_id;
    end if;

    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values (p_org_id, v_order.branch_id, v_product_id, v_received_qty)
    on conflict (org_id, branch_id, product_id)
    do update set quantity_on_hand = public.stock_items.quantity_on_hand + v_received_qty;

    insert into public.stock_movements (
      org_id, branch_id, product_id, movement_type, quantity_delta, source_type, source_id
    ) values (
      p_org_id, v_order.branch_id, v_product_id, 'purchase', v_received_qty, 'purchase', p_order_id
    );

    if v_received_qty > 0 then
      select shelf_life_days into v_shelf_life_days
      from public.products
      where id = v_product_id and org_id = p_org_id;

      if v_shelf_life_days is not null and v_shelf_life_days > 0 then
        v_expires_on := v_received_date + v_shelf_life_days;

        select coalesce(
          max((regexp_match(batch_code, '-(\\d{3})$'))[1]::int),
          0
        ) + 1
        into v_seq
        from public.expiration_batches
        where org_id = p_org_id
          and branch_id = v_order.branch_id
          and batch_code like (v_supplier_code || '-' || to_char(v_received_date, 'YYYYMMDD') || '-%');

        v_batch_code := v_supplier_code || '-' || to_char(v_received_date, 'YYYYMMDD') || '-' || lpad(v_seq::text, 3, '0');

        insert into public.expiration_batches (
          org_id,
          branch_id,
          product_id,
          expires_on,
          quantity,
          source_type,
          source_ref_id,
          batch_code,
          created_at,
          updated_at
        ) values (
          p_org_id,
          v_order.branch_id,
          v_product_id,
          v_expires_on,
          v_received_qty,
          'purchase',
          p_order_id,
          v_batch_code,
          now(),
          now()
        );
      end if;
    end if;
  end loop;

  update public.supplier_orders
    set status = 'reconciled',
        received_at = v_received_ts,
        reconciled_at = now(),
        controlled_by_user_id = p_controlled_by_user_id,
        controlled_by_name = nullif(p_controlled_by_name, '')
  where id = p_order_id and org_id = p_org_id;
end;
$$;
