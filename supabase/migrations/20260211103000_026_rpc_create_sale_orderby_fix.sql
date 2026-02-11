-- Fix ambiguous created_at references inside rpc_create_sale

create or replace function public.rpc_create_sale(
  p_org_id uuid,
  p_branch_id uuid,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_special_order_id uuid default null,
  p_close_special_order boolean default false
)
returns table (sale_id uuid, total numeric, created_at timestamptz)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_sale_id uuid := gen_random_uuid();
  v_total numeric(12,2) := 0;
  v_created_at timestamptz := now();
  v_allow_negative boolean := true;
  v_pos_enabled boolean := false;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_price numeric(12,2);
  v_name text;
  v_line_total numeric(12,2);
  v_current numeric(14,3);
  v_remaining numeric(14,3);
  v_batch record;
  v_items_count int := 0;
  v_remaining_items bigint;
  v_item_rows record;
  v_to_apply numeric(14,3);
  v_order_status public.special_order_status;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    if not exists (
      select 1
      from public.org_users ou
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.is_active = true
        and ou.role = 'staff'
    ) then
      raise exception 'not authorized';
    end if;

    if not exists (
      select 1
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.branch_id = p_branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id = p_branch_id
         and sma.role = 'staff'
         and sma.module_key = 'pos'
       limit 1),
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id is null
         and sma.role = 'staff'
         and sma.module_key = 'pos'
       limit 1),
      false
    ) into v_pos_enabled;

    if not v_pos_enabled then
      raise exception 'pos module disabled';
    end if;
  end if;

  select allow_negative_stock into v_allow_negative
  from public.org_preferences
  where org_id = p_org_id;

  if v_allow_negative is null then
    v_allow_negative := true;
  end if;

  insert into public.sales (id, org_id, branch_id, created_by, payment_method, total_amount, created_at)
  values (v_sale_id, p_org_id, p_branch_id, auth.uid(), p_payment_method, 0, v_created_at);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_items_count := v_items_count + 1;
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := (v_item ->> 'quantity')::numeric;

    select p.unit_price, p.name
      into v_price, v_name
    from public.products p
    where p.id = v_product_id
      and p.org_id = p_org_id;

    if v_price is null then
      raise exception 'product not found %', v_product_id;
    end if;

    select quantity_on_hand
      into v_current
    from public.stock_items
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = v_product_id
    for update;

    if v_current is null then
      v_current := 0;
    end if;

    if not v_allow_negative and v_current < v_qty then
      raise exception 'insufficient stock for %', v_product_id;
    end if;

    v_line_total := v_price * v_qty;
    v_total := v_total + v_line_total;

    insert into public.sale_items (
      org_id, sale_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total
    ) values (
      p_org_id, v_sale_id, v_product_id, v_name, v_price, v_qty, v_line_total
    );

    if v_current = 0 then
      insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
      values (p_org_id, p_branch_id, v_product_id, v_current - v_qty)
      on conflict (org_id, branch_id, product_id)
      do update set quantity_on_hand = public.stock_items.quantity_on_hand - v_qty;
    else
      update public.stock_items
        set quantity_on_hand = quantity_on_hand - v_qty
      where org_id = p_org_id
        and branch_id = p_branch_id
        and product_id = v_product_id;
    end if;

    insert into public.stock_movements (
      org_id, branch_id, product_id, movement_type, quantity_delta, source_type, source_id
    ) values (
      p_org_id, p_branch_id, v_product_id, 'sale', -v_qty, 'sale', v_sale_id
    );

    -- Consume expiration batches (FEFO)
    v_remaining := v_qty;
    for v_batch in
      select id, quantity
      from public.expiration_batches
      where org_id = p_org_id
        and branch_id = p_branch_id
        and product_id = v_product_id
        and quantity > 0
      order by expires_on asc, public.expiration_batches.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      if v_batch.quantity >= v_remaining then
        update public.expiration_batches
          set quantity = quantity - v_remaining,
              updated_at = now()
        where id = v_batch.id;
        v_remaining := 0;
      else
        update public.expiration_batches
          set quantity = 0,
              updated_at = now()
        where id = v_batch.id;
        v_remaining := v_remaining - v_batch.quantity;
      end if;
    end loop;

    -- Apply fulfillment to special order items
    if p_special_order_id is not null then
      for v_item_rows in
        select id, requested_qty, fulfilled_qty
        from public.client_special_order_items
        where org_id = p_org_id
          and special_order_id = p_special_order_id
          and product_id = v_product_id
        order by public.client_special_order_items.created_at
        for update
      loop
        exit when v_qty <= 0;
        v_to_apply := least(v_qty, v_item_rows.requested_qty - v_item_rows.fulfilled_qty);
        if v_to_apply > 0 then
          update public.client_special_order_items
            set fulfilled_qty = fulfilled_qty + v_to_apply
          where id = v_item_rows.id;
          v_qty := v_qty - v_to_apply;
        end if;
      end loop;
    end if;
  end loop;

  update public.sales set total_amount = v_total where id = v_sale_id;

  if p_special_order_id is not null then
    select status into v_order_status
    from public.client_special_orders
    where org_id = p_org_id and id = p_special_order_id;

    select count(*) into v_remaining_items
    from public.client_special_order_items
    where org_id = p_org_id
      and special_order_id = p_special_order_id
      and (requested_qty - fulfilled_qty) > 0;

    if p_close_special_order then
      update public.client_special_orders
        set status = 'delivered'
      where org_id = p_org_id and id = p_special_order_id;
    else
      if v_remaining_items = 0 then
        update public.client_special_orders
          set status = 'delivered'
        where org_id = p_org_id and id = p_special_order_id;
      else
        update public.client_special_orders
          set status = 'partial'
        where org_id = p_org_id and id = p_special_order_id;
      end if;
    end if;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_created',
    'sale',
    v_sale_id,
    p_branch_id,
    jsonb_build_object(
      'total', v_total,
      'payment_method', p_payment_method,
      'items_count', v_items_count
    ),
    null
  );

  return query select v_sale_id, v_total, v_created_at;
end;
$$;
