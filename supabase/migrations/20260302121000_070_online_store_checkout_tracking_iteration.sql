-- Iteration: simplify public checkout (pay on pickup), add customer address,
-- branch-level WhatsApp config, and richer tracking payload.

alter table public.branches
  add column if not exists storefront_whatsapp_phone text;

alter table public.online_orders
  add column if not exists customer_address text;

create or replace view public.v_branches_admin as
select
  b.id as branch_id,
  b.org_id,
  b.name,
  b.address,
  b.is_active,
  b.created_at,
  b.updated_at,
  coalesce(m.members_count, 0::bigint) as members_count,
  b.ticket_header_text,
  b.ticket_footer_text,
  b.fiscal_ticket_note_text,
  b.ticket_paper_width_mm,
  b.ticket_margin_top_mm,
  b.ticket_margin_right_mm,
  b.ticket_margin_bottom_mm,
  b.ticket_margin_left_mm,
  b.ticket_font_size_px,
  b.ticket_line_height,
  b.storefront_slug,
  b.storefront_whatsapp_phone
from public.branches b
left join (
  select
    branch_memberships.branch_id,
    count(*) as members_count
  from public.branch_memberships
  where branch_memberships.is_active = true
  group by branch_memberships.branch_id
) m on m.branch_id = b.id;

create or replace function public.rpc_get_public_storefront_branches(
  p_org_slug text
)
returns table (
  org_name text,
  org_slug text,
  branch_name text,
  branch_slug text,
  is_active boolean,
  is_enabled boolean,
  whatsapp_phone text,
  pickup_instructions text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    o.name,
    o.storefront_slug,
    b.name,
    b.storefront_slug,
    b.is_active,
    ss.is_enabled,
    coalesce(
      nullif(btrim(b.storefront_whatsapp_phone), ''),
      nullif(btrim(ss.whatsapp_phone), '')
    ) as whatsapp_phone,
    ss.pickup_instructions
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  where o.is_active = true
    and o.storefront_slug = p_org_slug
  order by b.name;
end;
$$;

create or replace function public.rpc_get_public_storefront_products(
  p_org_slug text,
  p_branch_slug text
)
returns table (
  org_name text,
  org_slug text,
  branch_name text,
  branch_slug text,
  product_id uuid,
  product_name text,
  unit_price numeric,
  stock_on_hand numeric,
  image_url text,
  is_available boolean,
  whatsapp_phone text,
  pickup_instructions text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    o.name,
    o.storefront_slug,
    b.name,
    b.storefront_slug,
    p.id,
    p.name,
    p.unit_price,
    coalesce(si.quantity_on_hand, 0::numeric) as stock_on_hand,
    p.image_url,
    (p.is_active and coalesce(si.quantity_on_hand, 0::numeric) > 0::numeric),
    coalesce(
      nullif(btrim(b.storefront_whatsapp_phone), ''),
      nullif(btrim(ss.whatsapp_phone), '')
    ) as whatsapp_phone,
    ss.pickup_instructions
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  join public.products p
    on p.org_id = o.id
   and p.is_active = true
  left join public.stock_items si
    on si.org_id = o.id
   and si.branch_id = b.id
   and si.product_id = p.id
  where o.is_active = true
    and o.storefront_slug = p_org_slug
    and b.storefront_slug = p_branch_slug
  order by p.name;
end;
$$;

drop function if exists public.rpc_create_online_order(
  text,
  text,
  text,
  text,
  public.online_payment_intent,
  jsonb,
  text
);

create or replace function public.rpc_create_online_order(
  p_org_slug text,
  p_branch_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb,
  p_customer_notes text default null
)
returns table (
  online_order_id uuid,
  order_code text,
  tracking_token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_branch_id uuid;
  v_allow_out_of_stock_order boolean;
  v_order_id uuid := gen_random_uuid();
  v_order_code text := upper('ONL-' || substr(replace(v_order_id::text, '-', ''), 1, 10));
  v_tracking_token text := replace(gen_random_uuid()::text, '-', '');
  v_actor uuid := auth.uid();
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric(14,3);
  v_product_name text;
  v_unit_price numeric(12,2);
  v_stock numeric(14,3);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items are required';
  end if;

  select o.id, b.id, ss.allow_out_of_stock_order
    into v_org_id, v_branch_id, v_allow_out_of_stock_order
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  where o.is_active = true
    and o.storefront_slug = p_org_slug
    and b.storefront_slug = p_branch_slug;

  if v_org_id is null or v_branch_id is null then
    raise exception 'storefront not found or disabled';
  end if;

  if coalesce(btrim(p_customer_name), '') = '' then
    raise exception 'customer_name is required';
  end if;

  if coalesce(btrim(p_customer_phone), '') = '' then
    raise exception 'customer_phone is required';
  end if;

  if coalesce(btrim(p_customer_address), '') = '' then
    raise exception 'customer_address is required';
  end if;

  insert into public.online_orders (
    id,
    org_id,
    branch_id,
    order_code,
    status,
    customer_name,
    customer_phone,
    customer_address,
    customer_notes,
    payment_intent,
    subtotal_amount,
    total_amount,
    created_by_user_id
  ) values (
    v_order_id,
    v_org_id,
    v_branch_id,
    v_order_code,
    'pending',
    btrim(p_customer_name),
    btrim(p_customer_phone),
    btrim(p_customer_address),
    p_customer_notes,
    'pay_on_pickup',
    0,
    0,
    v_actor
  );

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := nullif(v_item->>'quantity', '')::numeric;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid item payload';
    end if;

    select p.name, p.unit_price, coalesce(si.quantity_on_hand, 0)
      into v_product_name, v_unit_price, v_stock
    from public.products p
    left join public.stock_items si
      on si.org_id = p.org_id
     and si.product_id = p.id
     and si.branch_id = v_branch_id
    where p.org_id = v_org_id
      and p.id = v_product_id
      and p.is_active = true;

    if v_product_name is null then
      raise exception 'product not found or inactive: %', v_product_id;
    end if;

    if not v_allow_out_of_stock_order and v_quantity > coalesce(v_stock, 0) then
      raise exception 'insufficient stock for product %', v_product_name;
    end if;

    insert into public.online_order_items (
      org_id,
      online_order_id,
      product_id,
      product_name_snapshot,
      unit_price_snapshot,
      quantity,
      line_total
    ) values (
      v_org_id,
      v_order_id,
      v_product_id,
      v_product_name,
      v_unit_price,
      v_quantity,
      round((v_unit_price * v_quantity)::numeric, 2)
    );

    v_total := v_total + round((v_unit_price * v_quantity)::numeric, 2);
  end loop;

  update public.online_orders
  set subtotal_amount = v_total,
      total_amount = v_total
  where id = v_order_id;

  insert into public.online_order_status_history (
    org_id,
    online_order_id,
    old_status,
    new_status,
    changed_by_user_id,
    customer_note
  ) values (
    v_org_id,
    v_order_id,
    null,
    'pending',
    v_actor,
    p_customer_notes
  );

  insert into public.online_order_tracking_tokens (
    org_id,
    online_order_id,
    token,
    is_active
  ) values (
    v_org_id,
    v_order_id,
    v_tracking_token,
    true
  );

  online_order_id := v_order_id;
  order_code := v_order_code;
  tracking_token := v_tracking_token;
  return next;
end;
$$;

drop function if exists public.rpc_get_online_order_tracking(text);

create or replace function public.rpc_get_online_order_tracking(
  p_tracking_token text
)
returns table (
  order_code text,
  store_name text,
  branch_name text,
  status public.online_order_status,
  created_at timestamptz,
  last_status_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_notes text,
  payment_intent public.online_payment_intent,
  total_amount numeric,
  items jsonb,
  timeline jsonb,
  whatsapp_phone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_org_id uuid;
begin
  select ott.online_order_id, ott.org_id
    into v_order_id, v_org_id
  from public.online_order_tracking_tokens ott
  where ott.token = p_tracking_token
    and ott.is_active = true
    and (ott.expires_at is null or ott.expires_at > now())
  limit 1;

  if v_order_id is null then
    return;
  end if;

  return query
  with status_history as (
    select jsonb_agg(
      jsonb_build_object(
        'old_status', h.old_status,
        'new_status', h.new_status,
        'changed_at', h.changed_at,
        'customer_note', h.customer_note
      ) order by h.changed_at asc
    ) as history,
    max(h.changed_at) as last_changed_at
    from public.online_order_status_history h
    where h.online_order_id = v_order_id
  ),
  order_items as (
    select jsonb_agg(
      jsonb_build_object(
        'product_name', oi.product_name_snapshot,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price_snapshot,
        'line_total', oi.line_total
      ) order by oi.created_at asc
    ) as items_json
    from public.online_order_items oi
    where oi.online_order_id = v_order_id
  )
  select
    oo.order_code,
    o.name,
    b.name,
    oo.status,
    oo.created_at,
    coalesce(sh.last_changed_at, oo.updated_at),
    oo.customer_name,
    oo.customer_phone,
    oo.customer_address,
    oo.customer_notes,
    oo.payment_intent,
    oo.total_amount,
    coalesce(oi.items_json, '[]'::jsonb),
    coalesce(sh.history, '[]'::jsonb),
    coalesce(
      nullif(btrim(b.storefront_whatsapp_phone), ''),
      nullif(btrim(ss.whatsapp_phone), '')
    )
  from public.online_orders oo
  join public.orgs o
    on o.id = oo.org_id
  join public.branches b
    on b.id = oo.branch_id
  left join public.storefront_settings ss
    on ss.org_id = oo.org_id
  left join status_history sh
    on true
  left join order_items oi
    on true
  where oo.id = v_order_id
    and oo.org_id = v_org_id;
end;
$$;

create or replace view public.v_online_orders_admin as
select
  oo.id as online_order_id,
  oo.org_id,
  oo.branch_id,
  b.name as branch_name,
  oo.order_code,
  oo.status,
  oo.customer_name,
  oo.customer_phone,
  oo.customer_notes,
  oo.staff_notes,
  oo.payment_intent,
  oo.subtotal_amount,
  oo.total_amount,
  oo.confirmed_at,
  oo.ready_for_pickup_at,
  oo.delivered_at,
  oo.cancelled_at,
  oo.created_at,
  oo.updated_at,
  (select ott.token
   from public.online_order_tracking_tokens ott
   where ott.online_order_id = oo.id
     and ott.is_active = true
   order by ott.created_at desc
   limit 1) as tracking_token,
  exists (
    select 1
    from public.online_order_payment_proofs opp
    where opp.online_order_id = oo.id
  ) as has_payment_proof,
  (select opp.review_status
   from public.online_order_payment_proofs opp
   where opp.online_order_id = oo.id
   order by opp.uploaded_at desc
   limit 1) as payment_proof_review_status,
  oo.customer_address
from public.online_orders oo
join public.branches b
  on b.id = oo.branch_id;

grant execute on function public.rpc_get_public_storefront_branches(text) to anon;
grant execute on function public.rpc_get_public_storefront_branches(text) to authenticated;
grant execute on function public.rpc_get_public_storefront_products(text, text) to anon;
grant execute on function public.rpc_get_public_storefront_products(text, text) to authenticated;
grant execute on function public.rpc_create_online_order(text, text, text, text, text, jsonb, text) to anon;
grant execute on function public.rpc_create_online_order(text, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.rpc_get_online_order_tracking(text) to anon;
grant execute on function public.rpc_get_online_order_tracking(text) to authenticated;
