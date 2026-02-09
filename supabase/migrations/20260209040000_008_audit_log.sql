-- Audit log: table, RLS, view, RPC + instrumentation of write RPCs

-- Helper: org admin or superadmin
create or replace function public.is_org_admin_or_superadmin(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
      and ou.role in ('org_admin', 'superadmin')
  );
$$;

grant execute on function public.is_org_admin_or_superadmin(uuid) to authenticated;

-- Table
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  action_key text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_org_created_at_idx on public.audit_log (org_id, created_at desc);
create index if not exists audit_log_org_action_idx on public.audit_log (org_id, action_key);
create index if not exists audit_log_org_actor_idx on public.audit_log (org_id, actor_user_id);

alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log
  for select
  using (public.is_org_admin_or_superadmin(org_id));

-- RPC to write audit log (append-only)
create or replace function public.rpc_log_audit_event(
  p_org_id uuid,
  p_action_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_branch_id uuid,
  p_metadata jsonb,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  insert into public.audit_log (
    org_id,
    actor_user_id,
    branch_id,
    action_key,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_org_id,
    coalesce(p_actor_user_id, auth.uid()),
    p_branch_id,
    p_action_key,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
end;
$$;

grant execute on function public.rpc_log_audit_event(uuid, text, text, uuid, uuid, jsonb, uuid) to authenticated;

-- View for admin read
create or replace view public.v_audit_log_admin
with (security_invoker = true) as
select
  al.id,
  al.org_id,
  al.branch_id,
  b.name as branch_name,
  al.created_at,
  al.action_key,
  al.entity_type,
  al.entity_id,
  al.actor_user_id,
  ou.display_name as actor_display_name,
  ou.role as actor_role,
  al.metadata
from public.audit_log al
left join public.org_users ou
  on ou.org_id = al.org_id
  and ou.user_id = al.actor_user_id
left join public.branches b
  on b.id = al.branch_id;

grant select on public.v_audit_log_admin to anon;
grant select on public.v_audit_log_admin to authenticated;
grant select on public.v_audit_log_admin to service_role;

-- Instrumentation: log key write actions

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
  with upserted as (
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
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'product_upsert',
      'product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'internal_code', nullif(p_internal_code, ''),
        'barcode', nullif(p_barcode, ''),
        'sell_unit_type', p_sell_unit_type,
        'uom', p_uom,
        'unit_price', p_unit_price,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
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

  perform public.rpc_log_audit_event(
    p_org_id,
    'stock_manual_adjust',
    'stock_item',
    p_product_id,
    p_branch_id,
    jsonb_build_object(
      'new_quantity_on_hand', p_new_quantity_on_hand,
      'delta', v_delta,
      'reason', p_reason
    ),
    null
  );

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
    v_allow_negative := false;
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
  with upserted as (
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
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_upsert',
      'supplier',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'contact_name', p_contact_name,
        'phone', p_phone,
        'email', p_email,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
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
  with upserted as (
    insert into public.supplier_products (
      org_id, supplier_id, product_id, supplier_sku, supplier_product_name
    ) values (
      p_org_id, p_supplier_id, p_product_id, p_supplier_sku, p_supplier_product_name
    )
    on conflict (org_id, supplier_id, product_id) do update set
      supplier_sku = excluded.supplier_sku,
      supplier_product_name = excluded.supplier_product_name
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
        'supplier_product_name', p_supplier_product_name
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

create or replace function public.rpc_create_supplier_order(
  p_org_id uuid,
  p_branch_id uuid,
  p_supplier_id uuid,
  p_notes text
)
returns table (order_id uuid)
language sql
as $$
  with inserted as (
    insert into public.supplier_orders (
      org_id, branch_id, supplier_id, status, notes, created_by
    ) values (
      p_org_id, p_branch_id, p_supplier_id, 'draft', p_notes, auth.uid()
    )
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_created',
      'supplier_order',
      (select id from inserted),
      p_branch_id,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'status', 'draft',
        'notes', p_notes
      ),
      null
    )
  )
  select id from inserted;
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
  with upserted as (
    insert into public.supplier_order_items (
      org_id, order_id, product_id, ordered_qty, unit_cost
    ) values (
      p_org_id, p_order_id, p_product_id, p_ordered_qty, p_unit_cost
    )
    on conflict (order_id, product_id) do update set
      ordered_qty = excluded.ordered_qty,
      unit_cost = excluded.unit_cost
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_item_upsert',
      'supplier_order_item',
      (select id from upserted),
      null,
      jsonb_build_object(
        'order_id', p_order_id,
        'product_id', p_product_id,
        'ordered_qty', p_ordered_qty,
        'unit_cost', p_unit_cost
      ),
      null
    )
  )
  select id from upserted;
$$;

create or replace function public.rpc_remove_supplier_order_item(
  p_org_id uuid,
  p_order_id uuid,
  p_product_id uuid
)
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_order_items
  where org_id = p_org_id
    and order_id = p_order_id
    and product_id = p_product_id;

  delete from public.supplier_order_items
  where org_id = p_org_id
    and order_id = p_order_id
    and product_id = p_product_id;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_item_removed',
      'supplier_order_item',
      v_id,
      null,
      jsonb_build_object(
        'order_id', p_order_id,
        'product_id', p_product_id
      ),
      null
    );
  end if;
end;
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

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_status_set',
    'supplier_order',
    p_order_id,
    null,
    jsonb_build_object('status', p_status),
    null
  );
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
  v_items_count int := 0;
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
    v_items_count := v_items_count + 1;
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

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_received',
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object('items_count', v_items_count),
    null
  );
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

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_reconciled',
    'supplier_order',
    p_order_id,
    null,
    null,
    null
  );
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
  with inserted as (
    insert into public.expiration_batches (
      org_id, branch_id, product_id, expires_on, quantity, source_type, source_ref_id
    ) values (
      p_org_id, p_branch_id, p_product_id, p_expires_on, p_quantity, 'manual', p_source_ref_id
    )
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'expiration_batch_created',
      'expiration_batch',
      (select id from inserted),
      p_branch_id,
      jsonb_build_object(
        'product_id', p_product_id,
        'expires_on', p_expires_on,
        'quantity', p_quantity
      ),
      null
    )
  )
  select id from inserted;
$$;

create or replace function public.rpc_adjust_expiration_batch(
  p_org_id uuid,
  p_batch_id uuid,
  p_new_quantity numeric
)
returns void
language plpgsql
as $$
begin
  update public.expiration_batches
    set quantity = p_new_quantity
  where id = p_batch_id and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'expiration_batch_adjusted',
    'expiration_batch',
    p_batch_id,
    null,
    jsonb_build_object('new_quantity', p_new_quantity),
    null
  );
end;
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
  with upserted as (
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
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'client_upsert',
      'client',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'phone', p_phone,
        'email', p_email,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
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
  with inserted as (
    insert into public.client_special_orders (
      org_id, branch_id, client_id, description, quantity, status, created_by
    ) values (
      p_org_id, p_branch_id, p_client_id, p_description, p_quantity, 'pending', auth.uid()
    )
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'special_order_created',
      'special_order',
      (select id from inserted),
      p_branch_id,
      jsonb_build_object(
        'client_id', p_client_id,
        'quantity', p_quantity,
        'status', 'pending'
      ),
      null
    )
  )
  select id from inserted;
$$;

create or replace function public.rpc_set_special_order_status(
  p_org_id uuid,
  p_special_order_id uuid,
  p_status public.special_order_status
)
returns void
language plpgsql
as $$
begin
  update public.client_special_orders
    set status = p_status
  where id = p_special_order_id and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'special_order_status_set',
    'special_order',
    p_special_order_id,
    null,
    jsonb_build_object('status', p_status),
    null
  );
end;
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

  perform public.rpc_log_audit_event(
    p_org_id,
    'user_invited',
    'org_user',
    v_user_id,
    null,
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'branch_ids', p_branch_ids
    ),
    null
  );

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

  perform public.rpc_log_audit_event(
    p_org_id,
    'user_membership_updated',
    'org_user',
    p_user_id,
    null,
    jsonb_build_object(
      'role', p_role,
      'is_active', coalesce(p_is_active, true),
      'display_name', p_display_name,
      'branch_ids', p_branch_ids
    ),
    null
  );
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
  with upserted as (
    insert into public.branches (id, org_id, name, address, is_active)
    values (coalesce(p_branch_id, gen_random_uuid()), p_org_id, p_name, p_address, coalesce(p_is_active, true))
    on conflict (id) do update set
      name = excluded.name,
      address = excluded.address,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'branch_upsert',
      'branch',
      (select id from upserted),
      (select id from upserted),
      jsonb_build_object(
        'name', p_name,
        'address', p_address,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
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
  with upserted as (
    insert into public.staff_module_access (org_id, branch_id, role, module_key, is_enabled)
    values (p_org_id, p_branch_id, coalesce(p_role, 'staff'), p_module_key, p_is_enabled)
    on conflict (org_id, branch_id, role, module_key) do update set
      is_enabled = excluded.is_enabled
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'staff_module_access_set',
      'staff_module_access',
      (select id from upserted),
      p_branch_id,
      jsonb_build_object(
        'module_key', p_module_key,
        'is_enabled', p_is_enabled,
        'role', coalesce(p_role, 'staff')
      ),
      null
    )
  )
  select null;
$$;
