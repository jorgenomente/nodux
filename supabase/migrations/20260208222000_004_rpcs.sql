-- MVP RPCs (baseline)

create or replace function public.rpc_upsert_product(
  p_product_id uuid,
  p_org_id uuid,
  p_name text,
  p_internal_code text,
  p_barcode text,
  p_sell_unit_type public.sell_unit_type,
  p_uom text,
  p_unit_price numeric,
  p_is_active boolean
)
returns table (product_id uuid)
language sql
as $$
  insert into public.products (
    id, org_id, name, internal_code, barcode, sell_unit_type, uom, unit_price, is_active
  )
  values (
    coalesce(p_product_id, gen_random_uuid()),
    p_org_id,
    p_name,
    p_internal_code,
    p_barcode,
    p_sell_unit_type,
    p_uom,
    p_unit_price,
    coalesce(p_is_active, true)
  )
  on conflict (id) do update set
    name = excluded.name,
    internal_code = excluded.internal_code,
    barcode = excluded.barcode,
    sell_unit_type = excluded.sell_unit_type,
    uom = excluded.uom,
    unit_price = excluded.unit_price,
    is_active = excluded.is_active
  returning id;
$$;

create or replace function public.rpc_adjust_stock_manual(
  p_org_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_new_quantity_on_hand numeric,
  p_reason text
)
returns table (movement_id uuid, resulting_quantity_on_hand numeric)
language plpgsql
as $$
declare
  v_current numeric(14,3);
  v_delta numeric(14,3);
  v_movement_id uuid;
begin
  select quantity_on_hand
    into v_current
  from public.stock_items
  where org_id = p_org_id
    and branch_id = p_branch_id
    and product_id = p_product_id
  for update;

  if v_current is null then
    v_current := 0;
    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values (p_org_id, p_branch_id, p_product_id, p_new_quantity_on_hand);
  else
    update public.stock_items
      set quantity_on_hand = p_new_quantity_on_hand
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = p_product_id;
  end if;

  v_delta := p_new_quantity_on_hand - v_current;

  insert into public.stock_movements (
    org_id, branch_id, product_id, movement_type, quantity_delta, reason, source_type
  ) values (
    p_org_id, p_branch_id, p_product_id, 'manual_adjustment', v_delta, p_reason, 'manual_adjustment'
  ) returning id into v_movement_id;

  return query select v_movement_id, p_new_quantity_on_hand;
end;
$$;

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
  v_allow_negative boolean := false;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_price numeric(12,2);
  v_name text;
  v_line_total numeric(12,2);
  v_current numeric(14,3);
begin
  select allow_negative_stock into v_allow_negative
  from public.org_preferences
  where org_id = p_org_id;

  if v_allow_negative is null then
    v_allow_negative := false;
  end if;

  insert into public.sales (id, org_id, branch_id, created_by, payment_method, total_amount, created_at)
  values (v_sale_id, p_org_id, p_branch_id, auth.uid(), p_payment_method, 0, v_created_at);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
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

  return query select v_sale_id, v_total, v_created_at;
end;
$$;

create or replace function public.rpc_upsert_supplier(
  p_supplier_id uuid,
  p_org_id uuid,
  p_name text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_is_active boolean
)
returns table (supplier_id uuid)
language sql
as $$
  insert into public.suppliers (
    id, org_id, name, contact_name, phone, email, notes, is_active
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    p_name,
    p_contact_name,
    p_phone,
    p_email,
    p_notes,
    coalesce(p_is_active, true)
  )
  on conflict (id) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active
  returning id;
$$;

create or replace function public.rpc_upsert_supplier_product(
  p_org_id uuid,
  p_supplier_id uuid,
  p_product_id uuid,
  p_supplier_sku text,
  p_supplier_product_name text
)
returns table (id uuid)
language sql
as $$
  insert into public.supplier_products (
    org_id, supplier_id, product_id, supplier_sku, supplier_product_name
  ) values (
    p_org_id, p_supplier_id, p_product_id, p_supplier_sku, p_supplier_product_name
  )
  on conflict (org_id, supplier_id, product_id) do update set
    supplier_sku = excluded.supplier_sku,
    supplier_product_name = excluded.supplier_product_name
  returning id;
$$;

create or replace function public.rpc_remove_supplier_product(
  p_org_id uuid,
  p_supplier_id uuid,
  p_product_id uuid
)
returns void
language sql
as $$
  delete from public.supplier_products
  where org_id = p_org_id
    and supplier_id = p_supplier_id
    and product_id = p_product_id;
$$;

create or replace function public.rpc_create_supplier_order(
  p_org_id uuid,
  p_branch_id uuid,
  p_supplier_id uuid,
  p_notes text
)
returns table (order_id uuid)
language sql
as $$
  insert into public.supplier_orders (
    org_id, branch_id, supplier_id, status, notes, created_by
  ) values (
    p_org_id, p_branch_id, p_supplier_id, 'draft', p_notes, auth.uid()
  )
  returning id;
$$;

create or replace function public.rpc_upsert_supplier_order_item(
  p_org_id uuid,
  p_order_id uuid,
  p_product_id uuid,
  p_ordered_qty numeric,
  p_unit_cost numeric
)
returns table (order_item_id uuid)
language sql
as $$
  insert into public.supplier_order_items (
    org_id, order_id, product_id, ordered_qty, unit_cost
  ) values (
    p_org_id, p_order_id, p_product_id, p_ordered_qty, p_unit_cost
  )
  on conflict (order_id, product_id) do update set
    ordered_qty = excluded.ordered_qty,
    unit_cost = excluded.unit_cost
  returning id;
$$;

create or replace function public.rpc_remove_supplier_order_item(
  p_org_id uuid,
  p_order_id uuid,
  p_product_id uuid
)
returns void
language sql
as $$
  delete from public.supplier_order_items
  where org_id = p_org_id
    and order_id = p_order_id
    and product_id = p_product_id;
$$;

create or replace function public.rpc_set_supplier_order_status(
  p_org_id uuid,
  p_order_id uuid,
  p_status public.supplier_order_status
)
returns void
language plpgsql
as $$
begin
  if p_status = 'sent' then
    update public.supplier_orders
      set status = p_status,
          sent_at = now()
    where id = p_order_id and org_id = p_org_id;
  elsif p_status = 'reconciled' then
    update public.supplier_orders
      set status = p_status,
          reconciled_at = now()
    where id = p_order_id and org_id = p_org_id;
  else
    update public.supplier_orders
      set status = p_status
    where id = p_order_id and org_id = p_org_id;
  end if;
end;
$$;

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
  end loop;

  update public.supplier_orders
    set status = 'received',
        received_at = now()
  where id = p_order_id and org_id = p_org_id;
end;
$$;

create or replace function public.rpc_reconcile_supplier_order(
  p_org_id uuid,
  p_order_id uuid
)
returns void
language plpgsql
as $$
begin
  update public.supplier_orders
    set status = 'reconciled',
        reconciled_at = now()
  where id = p_order_id
    and org_id = p_org_id
    and status = 'received';
end;
$$;

create or replace function public.rpc_create_expiration_batch_manual(
  p_org_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_expires_on date,
  p_quantity numeric,
  p_source_ref_id uuid
)
returns table (batch_id uuid)
language sql
as $$
  insert into public.expiration_batches (
    org_id, branch_id, product_id, expires_on, quantity, source_type, source_ref_id
  ) values (
    p_org_id, p_branch_id, p_product_id, p_expires_on, p_quantity, 'manual', p_source_ref_id
  )
  returning id;
$$;

create or replace function public.rpc_adjust_expiration_batch(
  p_org_id uuid,
  p_batch_id uuid,
  p_new_quantity numeric
)
returns void
language sql
as $$
  update public.expiration_batches
    set quantity = p_new_quantity
  where id = p_batch_id and org_id = p_org_id;
$$;

create or replace function public.rpc_upsert_client(
  p_client_id uuid,
  p_org_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_is_active boolean
)
returns table (client_id uuid)
language sql
as $$
  insert into public.clients (
    id, org_id, name, phone, email, notes, is_active
  ) values (
    coalesce(p_client_id, gen_random_uuid()),
    p_org_id,
    p_name,
    p_phone,
    p_email,
    p_notes,
    coalesce(p_is_active, true)
  )
  on conflict (id) do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active
  returning id;
$$;

create or replace function public.rpc_create_special_order(
  p_org_id uuid,
  p_branch_id uuid,
  p_client_id uuid,
  p_description text,
  p_quantity numeric
)
returns table (special_order_id uuid)
language sql
as $$
  insert into public.client_special_orders (
    org_id, branch_id, client_id, description, quantity, status, created_by
  ) values (
    p_org_id, p_branch_id, p_client_id, p_description, p_quantity, 'pending', auth.uid()
  )
  returning id;
$$;

create or replace function public.rpc_set_special_order_status(
  p_org_id uuid,
  p_special_order_id uuid,
  p_status public.special_order_status
)
returns void
language sql
as $$
  update public.client_special_orders
    set status = p_status
  where id = p_special_order_id and org_id = p_org_id;
$$;

create or replace function public.rpc_invite_user_to_org(
  p_org_id uuid,
  p_email text,
  p_role public.user_role,
  p_branch_ids uuid[]
)
returns table (user_id uuid)
language plpgsql
as $$
declare
  v_user_id uuid;
  v_branch_id uuid;
begin
  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is null then
    raise exception 'user not found for email %', p_email;
  end if;

  insert into public.org_users (org_id, user_id, role)
  values (p_org_id, v_user_id, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  if p_role = 'staff' then
    foreach v_branch_id in array p_branch_ids loop
      insert into public.branch_memberships (org_id, branch_id, user_id)
      values (p_org_id, v_branch_id, v_user_id)
      on conflict (org_id, branch_id, user_id) do nothing;
    end loop;
  end if;

  return query select v_user_id;
end;
$$;

create or replace function public.rpc_update_user_membership(
  p_org_id uuid,
  p_user_id uuid,
  p_role public.user_role,
  p_is_active boolean,
  p_display_name text,
  p_branch_ids uuid[]
)
returns void
language plpgsql
as $$
declare
  v_branch_id uuid;
begin
  update public.org_users
    set role = p_role,
        is_active = coalesce(p_is_active, true),
        display_name = p_display_name
  where org_id = p_org_id and user_id = p_user_id;

  delete from public.branch_memberships
  where org_id = p_org_id and user_id = p_user_id;

  if p_role = 'staff' then
    foreach v_branch_id in array p_branch_ids loop
      insert into public.branch_memberships (org_id, branch_id, user_id)
      values (p_org_id, v_branch_id, p_user_id)
      on conflict (org_id, branch_id, user_id) do nothing;
    end loop;
  end if;
end;
$$;

create or replace function public.rpc_upsert_branch(
  p_branch_id uuid,
  p_org_id uuid,
  p_name text,
  p_address text,
  p_is_active boolean
)
returns table (branch_id uuid)
language sql
as $$
  insert into public.branches (id, org_id, name, address, is_active)
  values (coalesce(p_branch_id, gen_random_uuid()), p_org_id, p_name, p_address, coalesce(p_is_active, true))
  on conflict (id) do update set
    name = excluded.name,
    address = excluded.address,
    is_active = excluded.is_active
  returning id;
$$;

create or replace function public.rpc_get_staff_module_access(
  p_org_id uuid,
  p_branch_id uuid
)
returns table (module_key text, is_enabled boolean, source_scope text)
language sql
as $$
  with module_keys as (
    select distinct module_key
    from public.staff_module_access
    where org_id = p_org_id
      and role = 'staff'
  ),
  org_default as (
    select module_key, is_enabled
    from public.staff_module_access
    where org_id = p_org_id
      and branch_id is null
      and role = 'staff'
  ),
  branch_override as (
    select module_key, is_enabled
    from public.staff_module_access
    where org_id = p_org_id
      and branch_id = p_branch_id
      and role = 'staff'
  )
  select
    mk.module_key,
    coalesce(bo.is_enabled, od.is_enabled, false) as is_enabled,
    case
      when bo.module_key is not null then 'branch_override'
      when od.module_key is not null then 'org_default'
      else 'none'
    end as source_scope
  from module_keys mk
  left join org_default od on od.module_key = mk.module_key
  left join branch_override bo on bo.module_key = mk.module_key;
$$;

create or replace function public.rpc_set_staff_module_access(
  p_org_id uuid,
  p_branch_id uuid,
  p_module_key text,
  p_is_enabled boolean,
  p_role public.user_role
)
returns void
language sql
as $$
  insert into public.staff_module_access (org_id, branch_id, role, module_key, is_enabled)
  values (p_org_id, p_branch_id, coalesce(p_role, 'staff'), p_module_key, p_is_enabled)
  on conflict (org_id, branch_id, role, module_key) do update set
    is_enabled = excluded.is_enabled;
$$;

create or replace function public.rpc_list_clients(
  p_org_id uuid,
  p_branch_id uuid,
  p_search text,
  p_limit int,
  p_offset int
)
returns table (
  client_id uuid,
  name text,
  phone text,
  email text,
  active_special_orders_count bigint
)
language sql
as $$
  select
    c.id as client_id,
    c.name,
    c.phone,
    c.email,
    coalesce(count(co.id) filter (
      where co.status in ('pending', 'ordered', 'received')
        and (p_branch_id is null or co.branch_id = p_branch_id)
    ), 0) as active_special_orders_count
  from public.clients c
  left join public.client_special_orders co
    on co.client_id = c.id
    and co.org_id = c.org_id
  where c.org_id = p_org_id
    and (
      p_search is null
      or c.name ilike '%' || p_search || '%'
      or c.phone ilike '%' || p_search || '%'
      or c.email ilike '%' || p_search || '%'
    )
  group by c.id
  order by c.name
  limit coalesce(p_limit, 50)
  offset coalesce(p_offset, 0);
$$;

create or replace function public.rpc_get_client_detail(
  p_org_id uuid,
  p_client_id uuid
)
returns table (
  client_id uuid,
  name text,
  phone text,
  email text,
  notes text,
  is_active boolean,
  special_order_id uuid,
  description text,
  quantity numeric,
  status public.special_order_status,
  branch_id uuid,
  created_at timestamptz
)
language sql
as $$
  select
    c.id as client_id,
    c.name,
    c.phone,
    c.email,
    c.notes,
    c.is_active,
    co.id as special_order_id,
    co.description,
    co.quantity,
    co.status,
    co.branch_id,
    co.created_at
  from public.clients c
  left join public.client_special_orders co
    on co.client_id = c.id
    and co.org_id = c.org_id
  where c.org_id = p_org_id
    and c.id = p_client_id
  order by co.created_at desc nulls last;
$$;

create or replace function public.rpc_get_dashboard_admin(
  p_org_id uuid,
  p_branch_id uuid
)
returns table (
  org_id uuid,
  branch_id uuid,
  sales_today_total numeric,
  sales_today_count bigint,
  sales_week_total numeric,
  sales_month_total numeric,
  expirations_critical_count bigint,
  expirations_warning_count bigint,
  supplier_orders_pending_count bigint,
  client_orders_pending_count bigint
)
language sql
as $$
  select
    org_id,
    branch_id,
    sales_today_total,
    sales_today_count,
    sales_week_total,
    sales_month_total,
    expirations_critical_count,
    expirations_warning_count,
    supplier_orders_pending_count,
    client_orders_pending_count
  from public.v_dashboard_admin
  where org_id = p_org_id
    and (
      p_branch_id is null and branch_id is null
      or p_branch_id is not null and branch_id = p_branch_id
    );
$$;
