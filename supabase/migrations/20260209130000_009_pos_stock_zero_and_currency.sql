-- POS: show products even with zero stock and allow negative stock by default

-- Update view to include all active branches and products (stock defaults to 0)
create or replace view public.v_pos_product_catalog as
select
  p.id as product_id,
  p.org_id,
  p.name,
  p.internal_code,
  p.barcode,
  p.sell_unit_type,
  p.uom,
  p.unit_price,
  p.is_active,
  b.id as branch_id,
  coalesce(si.quantity_on_hand, 0) as stock_on_hand
from public.products p
join public.branches b
  on b.org_id = p.org_id
  and b.is_active = true
left join public.stock_items si
  on si.product_id = p.id
  and si.org_id = p.org_id
  and si.branch_id = b.id;

-- Allow negative stock by default for MVP to avoid blocking sales on desync
alter table public.org_preferences
  alter column allow_negative_stock set default true;

update public.org_preferences
  set allow_negative_stock = true
where allow_negative_stock is distinct from true;

-- Update RPC to allow selling with zero/negative stock if allow_negative_stock is true
create or replace function public.rpc_create_sale(
  p_org_id uuid,
  p_branch_id uuid,
  p_payment_method public.payment_method,
  p_items jsonb
)
returns table (sale_id uuid, total numeric, created_at timestamptz)
language plpgsql
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
  v_items_count int := 0;
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
  end loop;

  update public.sales set total_amount = v_total where id = v_sale_id;

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
