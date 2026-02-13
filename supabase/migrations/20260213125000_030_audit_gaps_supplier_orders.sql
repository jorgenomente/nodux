-- Close audit gaps for supplier and order operational actions

create or replace function public.rpc_upsert_supplier(
  p_supplier_id uuid,
  p_org_id uuid,
  p_name text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_is_active boolean,
  p_order_frequency public.order_frequency default null,
  p_order_day public.weekday default null,
  p_receive_day public.weekday default null
)
returns table (supplier_id uuid)
language plpgsql
as $$
declare
  v_supplier_id uuid;
begin
  insert into public.suppliers (
    id,
    org_id,
    name,
    contact_name,
    phone,
    email,
    notes,
    is_active,
    order_frequency,
    order_day,
    receive_day
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    p_name,
    p_contact_name,
    p_phone,
    p_email,
    p_notes,
    coalesce(p_is_active, true),
    p_order_frequency,
    p_order_day,
    p_receive_day
  )
  on conflict (id) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active,
    order_frequency = excluded.order_frequency,
    order_day = excluded.order_day,
    receive_day = excluded.receive_day
  returning id into v_supplier_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_upsert',
    'supplier',
    v_supplier_id,
    null,
    jsonb_build_object(
      'name', p_name,
      'contact_name', p_contact_name,
      'phone', p_phone,
      'email', p_email,
      'is_active', coalesce(p_is_active, true),
      'order_frequency', p_order_frequency,
      'order_day', p_order_day,
      'receive_day', p_receive_day
    ),
    null
  );

  return query select v_supplier_id;
end;
$$;

create or replace function public.rpc_set_supplier_order_expected_receive_on(
  p_org_id uuid,
  p_order_id uuid,
  p_expected_receive_on date
)
returns void
language plpgsql
as $$
declare
  v_order record;
begin
  select id, branch_id, status, expected_receive_on
    into v_order
  from public.supplier_orders
  where id = p_order_id
    and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status not in ('sent', 'received') then
    raise exception 'expected receive date can be set only for sent/received orders';
  end if;

  update public.supplier_orders
    set expected_receive_on = p_expected_receive_on
  where id = p_order_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_expected_receive_on_set',
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object(
      'old_expected_receive_on', v_order.expected_receive_on,
      'new_expected_receive_on', p_expected_receive_on,
      'status', v_order.status
    ),
    null
  );
end;
$$;

grant all on function public.rpc_set_supplier_order_expected_receive_on(
  uuid,
  uuid,
  date
) to anon, authenticated, service_role;

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

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_received',
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object(
      'status', 'reconciled',
      'received_at', v_received_ts,
      'controlled_by_user_id', p_controlled_by_user_id,
      'controlled_by_name', nullif(p_controlled_by_name, ''),
      'items_count', jsonb_array_length(p_items)
    ),
    p_controlled_by_user_id
  );
end;
$$;
