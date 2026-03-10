-- Inline stock transfer between branches from /products manual adjustment section.

alter type public.stock_movement_type add value if not exists 'branch_transfer';

create or replace function public.rpc_transfer_stock_between_branches(
  p_org_id uuid,
  p_from_branch_id uuid,
  p_to_branch_id uuid,
  p_items jsonb,
  p_reason text default null
)
returns table (
  transfer_id uuid,
  moved_items_count integer,
  total_quantity_moved numeric
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_transfer_id uuid := gen_random_uuid();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_actor_is_admin boolean := false;
  v_products_enabled boolean := false;
  v_items_count integer := 0;
  v_total_quantity numeric(14,3) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_source_qty numeric(14,3);
  v_target_qty numeric(14,3);
  v_product_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_from_branch_id is null or p_to_branch_id is null then
    raise exception 'source and destination branches are required';
  end if;

  if p_from_branch_id = p_to_branch_id then
    raise exception 'source and destination branches must differ';
  end if;

  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one transfer item is required';
  end if;

  if not exists (
    select 1
    from public.branches b
    where b.org_id = p_org_id
      and b.id = p_from_branch_id
      and b.is_active = true
  ) then
    raise exception 'source branch not found';
  end if;

  if not exists (
    select 1
    from public.branches b
    where b.org_id = p_org_id
      and b.id = p_to_branch_id
      and b.is_active = true
  ) then
    raise exception 'destination branch not found';
  end if;

  v_actor_is_admin := public.is_org_admin_or_superadmin(p_org_id);

  if not v_actor_is_admin then
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

    if (
      select count(distinct bm.branch_id)
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.is_active = true
    ) < 2 then
      raise exception 'staff requires at least two assigned branches';
    end if;

    if not exists (
      select 1
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.branch_id = p_from_branch_id
        and bm.is_active = true
    ) then
      raise exception 'source branch not allowed';
    end if;

    if not exists (
      select 1
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.branch_id = p_to_branch_id
        and bm.is_active = true
    ) then
      raise exception 'destination branch not allowed';
    end if;

    select bool_and(m.is_enabled)
      into v_products_enabled
    from public.rpc_get_staff_effective_modules() m
    where m.org_id = p_org_id
      and m.module_key = 'products'
      and m.branch_id in (p_from_branch_id, p_to_branch_id);

    if coalesce(v_products_enabled, false) is not true then
      raise exception 'products module disabled';
    end if;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_qty := nullif(v_item ->> 'quantity', '')::numeric;

    if v_product_id is null or v_qty is null then
      raise exception 'invalid transfer item';
    end if;

    if v_qty <= 0 then
      raise exception 'transfer quantity must be greater than 0';
    end if;

    select p.name
      into v_product_name
    from public.products p
    where p.org_id = p_org_id
      and p.id = v_product_id;

    if v_product_name is null then
      raise exception 'product not found %', v_product_id;
    end if;

    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values
      (p_org_id, p_from_branch_id, v_product_id, 0),
      (p_org_id, p_to_branch_id, v_product_id, 0)
    on conflict (org_id, branch_id, product_id) do nothing;

    with locked_rows as (
      select si.branch_id, si.quantity_on_hand
      from public.stock_items si
      where si.org_id = p_org_id
        and si.product_id = v_product_id
        and si.branch_id in (p_from_branch_id, p_to_branch_id)
      order by si.branch_id
      for update
    )
    select
      coalesce(
        max(case when lr.branch_id = p_from_branch_id then lr.quantity_on_hand end),
        0
      ),
      coalesce(
        max(case when lr.branch_id = p_to_branch_id then lr.quantity_on_hand end),
        0
      )
      into v_source_qty, v_target_qty
    from locked_rows lr;

    if v_source_qty < v_qty then
      raise exception 'insufficient stock for product %', v_product_name;
    end if;

    update public.stock_items
      set quantity_on_hand = v_source_qty - v_qty
    where org_id = p_org_id
      and branch_id = p_from_branch_id
      and product_id = v_product_id;

    update public.stock_items
      set quantity_on_hand = v_target_qty + v_qty
    where org_id = p_org_id
      and branch_id = p_to_branch_id
      and product_id = v_product_id;

    insert into public.stock_movements (
      org_id,
      branch_id,
      product_id,
      movement_type,
      quantity_delta,
      reason,
      source_type,
      source_id
    )
    values
      (
        p_org_id,
        p_from_branch_id,
        v_product_id,
        'branch_transfer',
        -v_qty,
        coalesce(v_reason, 'transferencia entre sucursales'),
        'branch_transfer',
        v_transfer_id
      ),
      (
        p_org_id,
        p_to_branch_id,
        v_product_id,
        'branch_transfer',
        v_qty,
        coalesce(v_reason, 'transferencia entre sucursales'),
        'branch_transfer',
        v_transfer_id
      );

    v_items_count := v_items_count + 1;
    v_total_quantity := v_total_quantity + v_qty;
  end loop;

  perform public.rpc_log_audit_event(
    p_org_id,
    'stock_branch_transfer',
    'stock_transfer',
    v_transfer_id,
    null,
    jsonb_build_object(
      'from_branch_id', p_from_branch_id,
      'to_branch_id', p_to_branch_id,
      'items', p_items,
      'moved_items_count', v_items_count,
      'total_quantity_moved', v_total_quantity,
      'reason', coalesce(v_reason, 'transferencia entre sucursales')
    ),
    null
  );

  return query
  select v_transfer_id, v_items_count, v_total_quantity;
end;
$$;

grant execute on function public.rpc_transfer_stock_between_branches(uuid, uuid, uuid, jsonb, text) to authenticated;
