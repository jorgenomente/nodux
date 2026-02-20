-- POS payment tracking by device + unified card method + MercadoPago.
-- Cashbox integration: supplier cash payments auto-register as expense movement in open session.

alter type public.payment_method add value if not exists 'card';
alter type public.payment_method add value if not exists 'mercadopago';

create table if not exists public.pos_payment_devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  device_name text not null,
  provider text not null default 'posnet',
  is_active boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pos_payment_devices_provider_ck check (provider in ('posnet', 'mercadopago', 'other')),
  constraint pos_payment_devices_device_name_not_blank_ck check (length(trim(device_name)) > 0),
  constraint pos_payment_devices_unique_org_branch_name unique (org_id, branch_id, device_name)
);

create index if not exists pos_payment_devices_org_branch_active_idx
  on public.pos_payment_devices (org_id, branch_id, is_active, device_name);

insert into public.pos_payment_devices (
  org_id,
  branch_id,
  device_name,
  provider,
  is_active
)
select
  b.org_id,
  b.id,
  'Posnet principal',
  'posnet',
  true
from public.branches b
where b.is_active = true
on conflict (org_id, branch_id, device_name) do nothing;

insert into public.pos_payment_devices (
  org_id,
  branch_id,
  device_name,
  provider,
  is_active
)
select
  b.org_id,
  b.id,
  'MercadoPago principal',
  'mercadopago',
  true
from public.branches b
where b.is_active = true
on conflict (org_id, branch_id, device_name) do nothing;

create or replace function public.trg_seed_pos_payment_devices_for_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pos_payment_devices (
    org_id,
    branch_id,
    device_name,
    provider,
    is_active
  ) values
    (new.org_id, new.id, 'Posnet principal', 'posnet', true),
    (new.org_id, new.id, 'MercadoPago principal', 'mercadopago', true)
  on conflict (org_id, branch_id, device_name) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_branches_seed_pos_payment_devices on public.branches;
create trigger trg_branches_seed_pos_payment_devices
after insert on public.branches
for each row
execute function public.trg_seed_pos_payment_devices_for_branch();

alter table public.pos_payment_devices enable row level security;

drop policy if exists pos_payment_devices_select on public.pos_payment_devices;
create policy pos_payment_devices_select
on public.pos_payment_devices
for select
using (public.is_org_member(org_id));

drop policy if exists pos_payment_devices_write on public.pos_payment_devices;
create policy pos_payment_devices_write
on public.pos_payment_devices
for insert
with check (public.is_org_member(org_id));

drop policy if exists pos_payment_devices_update on public.pos_payment_devices;
create policy pos_payment_devices_update
on public.pos_payment_devices
for update
using (public.is_org_member(org_id));

alter table public.sale_payments
  add column if not exists payment_device_id uuid null references public.pos_payment_devices(id) on delete set null;

create index if not exists sale_payments_payment_device_id_idx
  on public.sale_payments (payment_device_id);

alter table public.cash_session_movements
  add column if not exists supplier_payment_id uuid null references public.supplier_payments(id) on delete set null;

create unique index if not exists cash_session_movements_supplier_payment_uniq_idx
  on public.cash_session_movements (supplier_payment_id)
  where supplier_payment_id is not null;

drop function if exists public.rpc_get_cash_session_summary(uuid, uuid);
drop view if exists public.v_cashbox_session_current;

create or replace view public.v_cashbox_session_current as
with sales_by_method as (
  select
    cs.id as session_id,
    coalesce(sum(sp.amount) filter (where sp.payment_method = 'cash'), 0) as cash_sales_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text in ('card', 'debit', 'credit')), 0) as card_sales_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text = 'mercadopago'), 0) as mercadopago_sales_amount
  from public.cash_sessions cs
  left join public.sales s
    on s.org_id = cs.org_id
    and s.branch_id = cs.branch_id
    and s.created_at >= cs.opened_at
    and s.created_at <= coalesce(cs.closed_at, now())
  left join public.sale_payments sp
    on sp.sale_id = s.id
  group by cs.id
),
movement_totals as (
  select
    csm.session_id,
    coalesce(sum(case when csm.movement_type = 'income' then csm.amount else 0 end), 0) as manual_income_amount,
    coalesce(sum(case when csm.movement_type = 'expense' then csm.amount else 0 end), 0) as manual_expense_amount,
    count(*) as movements_count
  from public.cash_session_movements csm
  group by csm.session_id
)
select
  cs.id as session_id,
  cs.org_id,
  cs.branch_id,
  cs.status,
  cs.period_type,
  cs.session_label,
  cs.opening_cash_amount,
  cs.opening_reserve_amount,
  cs.closing_drawer_amount,
  cs.closing_reserve_amount,
  coalesce(sbm.cash_sales_amount, 0) as cash_sales_amount,
  coalesce(sbm.card_sales_amount, 0) as card_sales_amount,
  coalesce(sbm.mercadopago_sales_amount, 0) as mercadopago_sales_amount,
  coalesce(mt.manual_income_amount, 0) as manual_income_amount,
  coalesce(mt.manual_expense_amount, 0) as manual_expense_amount,
  (
    cs.opening_cash_amount
    + cs.opening_reserve_amount
    + coalesce(sbm.cash_sales_amount, 0)
    + coalesce(mt.manual_income_amount, 0)
    - coalesce(mt.manual_expense_amount, 0)
  )::numeric(12,2) as expected_cash_amount,
  cs.counted_cash_amount,
  case
    when cs.counted_cash_amount is null then null
    else (
      cs.counted_cash_amount
      - (
        cs.opening_cash_amount
        + cs.opening_reserve_amount
        + coalesce(sbm.cash_sales_amount, 0)
        + coalesce(mt.manual_income_amount, 0)
        - coalesce(mt.manual_expense_amount, 0)
      )
    )::numeric(12,2)
  end as difference_amount,
  coalesce(mt.movements_count, 0)::bigint as movements_count,
  cs.opened_by,
  cs.closed_by,
  cs.opened_at,
  cs.closed_at,
  cs.close_note,
  cs.closed_controlled_by_name,
  cs.close_confirmed,
  cs.created_at,
  cs.updated_at
from public.cash_sessions cs
left join sales_by_method sbm on sbm.session_id = cs.id
left join movement_totals mt on mt.session_id = cs.id;

create or replace function public.rpc_get_cash_session_summary(
  p_org_id uuid,
  p_session_id uuid
)
returns table (
  session_id uuid,
  branch_id uuid,
  status text,
  period_type text,
  session_label text,
  opening_cash_amount numeric,
  opening_reserve_amount numeric,
  closing_drawer_amount numeric,
  closing_reserve_amount numeric,
  cash_sales_amount numeric,
  card_sales_amount numeric,
  mercadopago_sales_amount numeric,
  manual_income_amount numeric,
  manual_expense_amount numeric,
  expected_cash_amount numeric,
  counted_cash_amount numeric,
  difference_amount numeric,
  movements_count bigint,
  opened_by uuid,
  closed_by uuid,
  opened_at timestamptz,
  closed_at timestamptz,
  close_note text,
  closed_controlled_by_name text,
  close_confirmed boolean
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_session record;
  v_cashbox_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = v_session.branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  return query
  select
    v.session_id,
    v.branch_id,
    v.status,
    v.period_type,
    v.session_label,
    v.opening_cash_amount,
    v.opening_reserve_amount,
    v.closing_drawer_amount,
    v.closing_reserve_amount,
    v.cash_sales_amount,
    v.card_sales_amount,
    v.mercadopago_sales_amount,
    v.manual_income_amount,
    v.manual_expense_amount,
    v.expected_cash_amount,
    v.counted_cash_amount,
    v.difference_amount,
    v.movements_count,
    v.opened_by,
    v.closed_by,
    v.opened_at,
    v.closed_at,
    v.close_note,
    v.closed_controlled_by_name,
    v.close_confirmed
  from public.v_cashbox_session_current v
  where v.session_id = p_session_id
    and v.org_id = p_org_id;
end;
$$;

grant execute on function public.rpc_get_cash_session_summary(uuid, uuid) to authenticated;

create or replace function public.rpc_register_supplier_payment(
  p_org_id uuid,
  p_payable_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method,
  p_paid_at timestamptz default now(),
  p_transfer_account_id uuid default null,
  p_reference text default null,
  p_note text default null
)
returns table (payment_id uuid, payable_status text, outstanding_amount numeric)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_payable record;
  v_payment_id uuid;
  v_open_session_id uuid;
  v_supplier_name text;
  v_cash_movement_note text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid payment amount';
  end if;

  if p_payment_method not in ('cash', 'transfer') then
    raise exception 'invalid payment method';
  end if;

  select * into v_payable
  from public.supplier_payables sp
  where sp.id = p_payable_id
    and sp.org_id = p_org_id
  for update;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  if v_payable.status = 'paid' then
    raise exception 'payable already paid';
  end if;

  if p_amount > v_payable.outstanding_amount and v_payable.outstanding_amount > 0 then
    raise exception 'payment amount exceeds outstanding amount';
  end if;

  if p_payment_method = 'transfer' and p_transfer_account_id is not null then
    if not exists (
      select 1
      from public.supplier_payment_accounts spa
      where spa.id = p_transfer_account_id
        and spa.org_id = p_org_id
        and spa.supplier_id = v_payable.supplier_id
    ) then
      raise exception 'transfer account not found for supplier';
    end if;
  end if;

  insert into public.supplier_payments (
    org_id,
    branch_id,
    supplier_id,
    payable_id,
    order_id,
    payment_method,
    transfer_account_id,
    amount,
    paid_at,
    reference,
    note,
    created_by,
    created_at
  ) values (
    p_org_id,
    v_payable.branch_id,
    v_payable.supplier_id,
    p_payable_id,
    v_payable.order_id,
    p_payment_method,
    p_transfer_account_id,
    round(p_amount, 2),
    coalesce(p_paid_at, now()),
    nullif(trim(coalesce(p_reference, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid(),
    now()
  )
  returning id into v_payment_id;

  if p_payment_method = 'cash' then
    select cs.id
    into v_open_session_id
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = v_payable.branch_id
      and cs.status = 'open'
      and coalesce(p_paid_at, now()) >= cs.opened_at
    order by cs.opened_at desc
    limit 1;

    if v_open_session_id is not null then
      select s.name
      into v_supplier_name
      from public.suppliers s
      where s.id = v_payable.supplier_id
        and s.org_id = p_org_id;

      v_cash_movement_note := trim(
        both ' '
        from concat(
          'Pago proveedor ',
          coalesce(v_supplier_name, 'Proveedor'),
          ' · pedido ',
          v_payable.order_id::text,
          case
            when nullif(trim(coalesce(p_note, '')), '') is null then ''
            else concat(' · ', nullif(trim(coalesce(p_note, '')), ''))
          end
        )
      );

      insert into public.cash_session_movements (
        org_id,
        branch_id,
        session_id,
        movement_type,
        category_key,
        amount,
        note,
        movement_at,
        created_by,
        created_at,
        supplier_payment_id
      ) values (
        p_org_id,
        v_payable.branch_id,
        v_open_session_id,
        'expense',
        'supplier_payment_cash',
        round(p_amount, 2),
        nullif(v_cash_movement_note, ''),
        coalesce(p_paid_at, now()),
        auth.uid(),
        now(),
        v_payment_id
      );
    end if;
  end if;

  update public.supplier_payables
  set
    selected_payment_method = p_payment_method,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payable_id;

  perform public.fn_recompute_supplier_payable(p_payable_id, auth.uid());

  select * into v_payable
  from public.supplier_payables
  where id = p_payable_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_registered',
    'supplier_payment',
    v_payment_id,
    v_payable.branch_id,
    jsonb_build_object(
      'payable_id', p_payable_id,
      'order_id', v_payable.order_id,
      'amount', round(p_amount, 2),
      'payment_method', p_payment_method,
      'transfer_account_id', p_transfer_account_id,
      'reference', nullif(trim(coalesce(p_reference, '')), ''),
      'status', v_payable.status,
      'outstanding_amount', v_payable.outstanding_amount
    ),
    auth.uid()
  );

  return query
  select v_payment_id, v_payable.status, v_payable.outstanding_amount;
end;
$$;

grant execute on function public.rpc_register_supplier_payment(uuid, uuid, numeric, public.payment_method, timestamptz, uuid, text, text) to authenticated;

drop function if exists public.rpc_create_sale(
  uuid,
  uuid,
  public.payment_method,
  jsonb,
  uuid,
  boolean,
  boolean,
  numeric,
  jsonb
);

create or replace function public.rpc_create_sale(
  p_org_id uuid,
  p_branch_id uuid,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_special_order_id uuid default null,
  p_close_special_order boolean default false,
  p_apply_cash_discount boolean default false,
  p_cash_discount_pct numeric default null,
  p_payments jsonb default null,
  p_payment_device_id uuid default null
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
  v_subtotal numeric(12,2) := 0;
  v_discount_amount numeric(12,2) := 0;
  v_discount_pct numeric(5,2) := 0;
  v_created_at timestamptz := now();
  v_allow_negative boolean := true;
  v_cash_discount_enabled boolean := true;
  v_cash_discount_default_pct numeric(5,2) := 10;
  v_pos_enabled boolean := false;
  v_cash_discount_applied boolean := false;
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
  v_payment jsonb;
  v_payment_method public.payment_method;
  v_payment_amount numeric(12,2);
  v_payments_sum numeric(12,2) := 0;
  v_payments_count int := 0;
  v_has_cash_payment boolean := false;
  v_single_payment_method public.payment_method := null;
  v_summary_payment_method public.payment_method := null;
  v_payment_rows jsonb := '[]'::jsonb;
  v_payment_device_id uuid;
  v_single_payment_device_id uuid := null;
  v_effective_payment_method public.payment_method;
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

  v_effective_payment_method := p_payment_method;

  if v_effective_payment_method::text = 'mixed' and (p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0) then
    raise exception 'mixed payment requires payments detail';
  end if;

  if p_cash_discount_pct is not null and not coalesce(p_apply_cash_discount, false) then
    raise exception 'cash discount pct requires apply_cash_discount';
  end if;

  if p_payments is null then
    if v_effective_payment_method::text in ('card', 'mercadopago') and p_payment_device_id is null then
      raise exception 'payment_device_id required for card and mercadopago';
    end if;

    if p_payment_device_id is not null and v_effective_payment_method::text not in ('card', 'mercadopago') then
      raise exception 'payment_device_id only allowed for card and mercadopago';
    end if;

    if p_payment_device_id is not null and not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = p_branch_id
        and ppd.is_active = true
    ) then
      raise exception 'invalid payment device';
    end if;

    v_single_payment_device_id := p_payment_device_id;
  end if;

  select
    allow_negative_stock,
    cash_discount_enabled,
    cash_discount_default_pct
  into
    v_allow_negative,
    v_cash_discount_enabled,
    v_cash_discount_default_pct
  from public.org_preferences
  where org_id = p_org_id;

  if v_allow_negative is null then
    v_allow_negative := true;
  end if;

  if v_cash_discount_enabled is null then
    v_cash_discount_enabled := true;
  end if;

  if v_cash_discount_default_pct is null then
    v_cash_discount_default_pct := 10;
  end if;

  insert into public.sales (
    id,
    org_id,
    branch_id,
    created_by,
    payment_method,
    subtotal_amount,
    discount_amount,
    discount_pct,
    total_amount,
    created_at
  )
  values (
    v_sale_id,
    p_org_id,
    p_branch_id,
    auth.uid(),
    case when v_effective_payment_method::text = 'mixed' then 'other'::public.payment_method else v_effective_payment_method end,
    0,
    0,
    0,
    0,
    v_created_at
  );

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
    v_subtotal := v_subtotal + v_line_total;

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

  v_total := v_subtotal;

  if p_payments is null then
    if v_effective_payment_method::text = 'mixed' then
      raise exception 'mixed payment requires payments detail';
    end if;

    v_payments_count := 1;
    v_single_payment_method := v_effective_payment_method;
    v_has_cash_payment := v_effective_payment_method = 'cash';
  else
    if jsonb_typeof(p_payments) <> 'array' then
      raise exception 'payments must be an array';
    end if;

    if jsonb_array_length(p_payments) = 0 then
      raise exception 'payments cannot be empty';
    end if;

    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      if coalesce(v_payment->>'payment_method', '') = '' then
        raise exception 'payment_method required in payments';
      end if;

      v_payment_method := (v_payment->>'payment_method')::public.payment_method;

      if v_payment_method::text = 'mixed' then
        raise exception 'mixed is not allowed inside payments detail';
      end if;

      v_payment_amount := round(coalesce((v_payment->>'amount')::numeric, 0), 2);
      if v_payment_amount <= 0 then
        raise exception 'payment amount must be greater than 0';
      end if;

      v_payment_device_id := nullif(v_payment->>'payment_device_id', '')::uuid;

      if v_payment_method::text in ('card', 'mercadopago') and v_payment_device_id is null then
        raise exception 'payment_device_id required for card and mercadopago';
      end if;

      if v_payment_method::text not in ('card', 'mercadopago') and v_payment_device_id is not null then
        raise exception 'payment_device_id only allowed for card and mercadopago';
      end if;

      if v_payment_device_id is not null and not exists (
        select 1
        from public.pos_payment_devices ppd
        where ppd.id = v_payment_device_id
          and ppd.org_id = p_org_id
          and ppd.branch_id = p_branch_id
          and ppd.is_active = true
      ) then
        raise exception 'invalid payment device';
      end if;

      v_payments_sum := v_payments_sum + v_payment_amount;
      v_payments_count := v_payments_count + 1;
      v_has_cash_payment := v_has_cash_payment or v_payment_method = 'cash';

      if v_payments_count = 1 then
        v_single_payment_method := v_payment_method;
        v_single_payment_device_id := v_payment_device_id;
      end if;

      v_payment_rows := v_payment_rows || jsonb_build_object(
        'payment_method', v_payment_method,
        'amount', v_payment_amount,
        'payment_device_id', v_payment_device_id
      );
    end loop;
  end if;

  if coalesce(p_apply_cash_discount, false) then
    if not v_cash_discount_enabled then
      raise exception 'cash discount disabled';
    end if;

    if not (v_payments_count = 1 and v_single_payment_method = 'cash') then
      raise exception 'cash discount only allowed for full cash payment';
    end if;

    v_cash_discount_applied := true;
    v_discount_pct := coalesce(p_cash_discount_pct, v_cash_discount_default_pct, 0);

    if v_discount_pct < 0 or v_discount_pct > 100 then
      raise exception 'invalid cash discount pct';
    end if;

    v_discount_amount := round((v_subtotal * v_discount_pct) / 100.0, 2);
    v_total := greatest(v_subtotal - v_discount_amount, 0);
  end if;

  if p_payments is null then
    v_payment_rows := jsonb_build_array(
      jsonb_build_object(
        'payment_method', v_effective_payment_method,
        'amount', v_total,
        'payment_device_id', v_single_payment_device_id
      )
    );
    v_payments_sum := v_total;
  end if;

  if round(v_payments_sum, 2) <> round(v_total, 2) then
    raise exception 'payments total must equal sale total';
  end if;

  if v_payments_count > 1 then
    v_summary_payment_method := 'mixed';
  else
    v_summary_payment_method := v_single_payment_method;
  end if;

  for v_payment in select * from jsonb_array_elements(v_payment_rows)
  loop
    insert into public.sale_payments (
      org_id,
      sale_id,
      payment_method,
      amount,
      payment_device_id,
      created_at
    ) values (
      p_org_id,
      v_sale_id,
      (v_payment->>'payment_method')::public.payment_method,
      (v_payment->>'amount')::numeric,
      nullif(v_payment->>'payment_device_id', '')::uuid,
      v_created_at
    );
  end loop;

  update public.sales
  set
    payment_method = v_summary_payment_method,
    subtotal_amount = v_subtotal,
    discount_amount = v_discount_amount,
    discount_pct = v_discount_pct,
    total_amount = v_total
  where id = v_sale_id;

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
      'subtotal_amount', v_subtotal,
      'discount_amount', v_discount_amount,
      'discount_pct', v_discount_pct,
      'cash_discount_applied', v_cash_discount_applied,
      'payment_method', v_summary_payment_method,
      'has_cash_component', v_has_cash_payment,
      'payments', v_payment_rows,
      'items_count', v_items_count,
      'total', v_total
    ),
    null
  );

  return query select v_sale_id, v_total, v_created_at;
end;
$$;

grant execute on function public.rpc_create_sale(uuid, uuid, public.payment_method, jsonb, uuid, boolean, boolean, numeric, jsonb, uuid) to authenticated;
