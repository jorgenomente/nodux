-- Special orders with items, partial fulfillment, and supplier linkage

alter table public.client_special_orders
  add column if not exists notes text,
  alter column description drop not null;

create table if not exists public.client_special_order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  special_order_id uuid not null references public.client_special_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_order_id uuid references public.supplier_orders(id) on delete set null,
  requested_qty numeric(14,3) not null,
  fulfilled_qty numeric(14,3) not null default 0,
  is_ordered boolean not null default false,
  ordered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, special_order_id, product_id)
);

create trigger set_client_special_order_items_updated_at
  before update on public.client_special_order_items
  for each row execute function public.set_updated_at();

alter table public.client_special_order_items enable row level security;

create policy client_special_order_items_select
  on public.client_special_order_items
  for select using (public.is_org_member(org_id));

create policy client_special_order_items_write
  on public.client_special_order_items
  for insert with check (public.is_org_member(org_id));

create policy client_special_order_items_update
  on public.client_special_order_items
  for update using (public.is_org_member(org_id));

-- Replace special order creation to accept items

drop function if exists public.rpc_create_special_order(
  uuid,
  uuid,
  uuid,
  text,
  numeric
);

create or replace function public.rpc_create_special_order(
  p_org_id uuid,
  p_branch_id uuid,
  p_client_id uuid,
  p_items jsonb,
  p_notes text
)
returns table (special_order_id uuid)
language plpgsql
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_requested_qty numeric(14,3);
  v_supplier_id uuid;
  v_notes text;
  v_description text;
begin
  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  v_description := coalesce(v_notes, 'Pedido especial');

  insert into public.client_special_orders (
    org_id,
    branch_id,
    client_id,
    description,
    quantity,
    status,
    created_by,
    notes
  ) values (
    p_org_id,
    p_branch_id,
    p_client_id,
    v_description,
    null,
    'pending',
    auth.uid(),
    v_notes
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_requested_qty := (v_item ->> 'requested_qty')::numeric;
    v_supplier_id := nullif((v_item ->> 'supplier_id')::text, '')::uuid;

    if v_product_id is null or v_requested_qty is null or v_requested_qty <= 0 then
      raise exception 'invalid special order item';
    end if;

    insert into public.client_special_order_items (
      org_id,
      special_order_id,
      product_id,
      supplier_id,
      requested_qty,
      fulfilled_qty
    ) values (
      p_org_id,
      v_order_id,
      v_product_id,
      v_supplier_id,
      v_requested_qty,
      0
    );
  end loop;

  perform public.rpc_log_audit_event(
    p_org_id,
    'special_order_created',
    'special_order',
    v_order_id,
    p_branch_id,
    jsonb_build_object(
      'client_id', p_client_id,
      'items_count', jsonb_array_length(coalesce(p_items, '[]'::jsonb))
    ),
    null
  );

  return query select v_order_id;
end;
$$;

-- Extend client detail to include items

drop function if exists public.rpc_get_client_detail(
  uuid,
  uuid
);

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
  special_order_status public.special_order_status,
  special_order_notes text,
  special_order_branch_id uuid,
  special_order_created_at timestamptz,
  item_id uuid,
  product_id uuid,
  product_name text,
  requested_qty numeric,
  fulfilled_qty numeric,
  supplier_id uuid,
  supplier_name text
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
    so.id as special_order_id,
    so.status as special_order_status,
    so.notes as special_order_notes,
    so.branch_id as special_order_branch_id,
    so.created_at as special_order_created_at,
    soi.id as item_id,
    soi.product_id,
    p.name as product_name,
    soi.requested_qty,
    soi.fulfilled_qty,
    soi.supplier_id,
    s.name as supplier_name
  from public.clients c
  left join public.client_special_orders so
    on so.client_id = c.id
    and so.org_id = c.org_id
  left join public.client_special_order_items soi
    on soi.special_order_id = so.id
    and soi.org_id = so.org_id
  left join public.products p
    on p.id = soi.product_id
    and p.org_id = so.org_id
  left join public.suppliers s
    on s.id = soi.supplier_id
    and s.org_id = so.org_id
  where c.org_id = p_org_id
    and c.id = p_client_id
  order by so.created_at desc nulls last, p.name;
$$;

-- Items pending by supplier (alerts)
create or replace view public.v_special_order_items_pending as
select
  soi.id as item_id,
  soi.org_id,
  so.id as special_order_id,
  so.status as special_order_status,
  so.branch_id,
  c.id as client_id,
  c.name as client_name,
  soi.product_id,
  p.name as product_name,
  coalesce(soi.supplier_id, sp.supplier_id) as supplier_id,
  sup.name as supplier_name,
  soi.requested_qty,
  soi.fulfilled_qty,
  (soi.requested_qty - soi.fulfilled_qty) as remaining_qty,
  soi.is_ordered,
  soi.ordered_at
from public.client_special_order_items soi
left join public.client_special_orders so
  on so.id = soi.special_order_id
  and so.org_id = soi.org_id
left join public.clients c
  on c.id = so.client_id
  and c.org_id = so.org_id
left join public.products p
  on p.id = soi.product_id
  and p.org_id = soi.org_id
left join public.supplier_products sp
  on sp.product_id = soi.product_id
  and sp.org_id = soi.org_id
  and sp.relation_type = 'primary'
left join public.suppliers sup
  on sup.id = coalesce(soi.supplier_id, sp.supplier_id)
  and sup.org_id = soi.org_id
where so.status in ('pending', 'ordered', 'partial')
  and (soi.requested_qty - soi.fulfilled_qty) > 0;

-- Mark items ordered when added to supplier order
create or replace function public.rpc_mark_special_order_items_ordered(
  p_org_id uuid,
  p_item_ids uuid[],
  p_supplier_order_id uuid
)
returns void
language plpgsql
as $$
begin
  update public.client_special_order_items
    set is_ordered = true,
        ordered_at = now(),
        supplier_order_id = p_supplier_order_id
  where org_id = p_org_id
    and id = any(p_item_ids);

  update public.client_special_orders so
    set status = 'ordered'
  where so.org_id = p_org_id
    and so.id in (
      select distinct special_order_id
      from public.client_special_order_items
      where org_id = p_org_id and id = any(p_item_ids)
    )
    and so.status = 'pending';
end;
$$;

-- Extend sales to update special orders fulfillment

drop function if exists public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb
);

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
  v_remaining numeric(14,3);
  v_batch record;
  v_remaining_items bigint;
  v_item_rows record;
  v_to_apply numeric(14,3);
  v_order_status public.special_order_status;
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

    -- Consume expiration batches (FEFO)
    v_remaining := v_qty;
    for v_batch in
      select id, quantity
      from public.expiration_batches
      where org_id = p_org_id
        and branch_id = p_branch_id
        and product_id = v_product_id
        and quantity > 0
      order by expires_on asc, created_at asc
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
        order by created_at
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

  return query select v_sale_id, v_total, v_created_at;
end;
$$;

-- Special order payload for POS
create or replace function public.rpc_get_special_order_for_pos(
  p_org_id uuid,
  p_special_order_id uuid
)
returns table (
  special_order_id uuid,
  client_id uuid,
  client_name text,
  branch_id uuid,
  product_id uuid,
  product_name text,
  sell_unit_type public.sell_unit_type,
  uom text,
  unit_price numeric,
  remaining_qty numeric
)
language sql
as $$
  select
    so.id as special_order_id,
    c.id as client_id,
    c.name as client_name,
    so.branch_id,
    soi.product_id,
    p.name as product_name,
    p.sell_unit_type,
    p.uom,
    p.unit_price,
    (soi.requested_qty - soi.fulfilled_qty) as remaining_qty
  from public.client_special_orders so
  join public.clients c
    on c.id = so.client_id
    and c.org_id = so.org_id
  join public.client_special_order_items soi
    on soi.special_order_id = so.id
    and soi.org_id = so.org_id
  join public.products p
    on p.id = soi.product_id
    and p.org_id = so.org_id
  where so.org_id = p_org_id
    and so.id = p_special_order_id
    and (soi.requested_qty - soi.fulfilled_qty) > 0
  order by p.name;
$$;
