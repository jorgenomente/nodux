-- Create expiration batches on order receipt using product shelf life days

create or replace function public.rpc_receive_supplier_order(
  p_org_id uuid,
  p_order_id uuid,
  p_items jsonb
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
        v_expires_on := current_date + v_shelf_life_days;
        insert into public.expiration_batches (
          org_id,
          branch_id,
          product_id,
          expires_on,
          quantity,
          source_type,
          source_ref_id,
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
          now(),
          now()
        );
      end if;
    end if;
  end loop;

  update public.supplier_orders
    set status = 'received',
        received_at = now()
  where id = p_order_id and org_id = p_org_id;
end;
$$;
