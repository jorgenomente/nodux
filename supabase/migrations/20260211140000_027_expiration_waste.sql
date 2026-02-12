-- Track expired waste and allow staff to move expired batches to waste

create table if not exists public.expiration_waste (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  batch_id uuid references public.expiration_batches(id) on delete set null,
  quantity numeric(14,3) not null,
  unit_price_snapshot numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists expiration_waste_org_branch_idx
  on public.expiration_waste (org_id, branch_id, created_at desc);

alter table public.expiration_waste enable row level security;

create policy expiration_waste_select
  on public.expiration_waste
  for select using (public.is_org_member(org_id));

-- View of expired batches pending waste
create or replace view public.v_expirations_expired as
select
  eb.id as batch_id,
  eb.org_id,
  eb.branch_id,
  b.name as branch_name,
  eb.product_id,
  p.name as product_name,
  eb.expires_on,
  (current_date - eb.expires_on) as days_expired,
  eb.quantity,
  eb.batch_code,
  p.unit_price,
  (eb.quantity * coalesce(p.unit_price, 0)) as total_value
from public.expiration_batches eb
join public.products p
  on p.id = eb.product_id
  and p.org_id = eb.org_id
join public.branches b
  on b.id = eb.branch_id
  and b.org_id = eb.org_id
where eb.quantity > 0
  and eb.expires_on < current_date;

-- Waste summary by branch
create or replace view public.v_expiration_waste_summary as
select
  org_id,
  branch_id,
  sum(total_amount) as total_amount,
  sum(quantity) as total_quantity,
  max(created_at) as last_created_at
from public.expiration_waste
group by org_id, branch_id;

create or replace view public.v_expiration_waste_detail as
select
  ew.id as waste_id,
  ew.org_id,
  ew.branch_id,
  b.name as branch_name,
  ew.product_id,
  p.name as product_name,
  ew.quantity,
  ew.unit_price_snapshot,
  ew.total_amount,
  ew.created_at
from public.expiration_waste ew
join public.products p
  on p.id = ew.product_id
  and p.org_id = ew.org_id
join public.branches b
  on b.id = ew.branch_id
  and b.org_id = ew.org_id;

-- RPC: move expired batch to waste, adjust stock and log
create or replace function public.rpc_move_expiration_batch_to_waste(
  p_org_id uuid,
  p_batch_id uuid,
  p_expected_qty numeric
)
returns table (waste_id uuid, total_amount numeric)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_batch record;
  v_unit_price numeric(12,2);
  v_total numeric(12,2);
  v_waste_id uuid;
  v_current numeric(14,3);
  v_exp_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select
    eb.id as batch_id,
    eb.branch_id,
    eb.product_id,
    eb.quantity,
    eb.expires_on
  into v_batch
  from public.expiration_batches eb
  where eb.org_id = p_org_id
    and eb.id = p_batch_id
  for update;

  if v_batch.batch_id is null then
    raise exception 'batch not found';
  end if;

  if v_batch.expires_on >= current_date then
    raise exception 'batch not expired';
  end if;

  if v_batch.quantity <= 0 then
    raise exception 'batch empty';
  end if;

  if p_expected_qty is not null and p_expected_qty <> v_batch.quantity then
    raise exception 'quantity mismatch';
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
        and bm.branch_id = v_batch.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id = v_batch.branch_id
         and sma.role = 'staff'
         and sma.module_key = 'expirations'
       limit 1),
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id is null
         and sma.role = 'staff'
         and sma.module_key = 'expirations'
       limit 1),
      false
    ) into v_exp_enabled;

    if not v_exp_enabled then
      raise exception 'expirations module disabled';
    end if;
  end if;

  select unit_price
    into v_unit_price
  from public.products
  where id = v_batch.product_id
    and org_id = p_org_id;

  if v_unit_price is null then
    v_unit_price := 0;
  end if;

  v_total := v_unit_price * v_batch.quantity;

  insert into public.expiration_waste (
    org_id,
    branch_id,
    product_id,
    batch_id,
    quantity,
    unit_price_snapshot,
    total_amount,
    created_by
  ) values (
    p_org_id,
    v_batch.branch_id,
    v_batch.product_id,
    v_batch.batch_id,
    v_batch.quantity,
    v_unit_price,
    v_total,
    auth.uid()
  ) returning id into v_waste_id;

  update public.expiration_batches
    set quantity = 0,
        updated_at = now()
  where id = v_batch.batch_id;

  select quantity_on_hand
    into v_current
  from public.stock_items
  where org_id = p_org_id
    and branch_id = v_batch.branch_id
    and product_id = v_batch.product_id
  for update;

  if v_current is null then
    insert into public.stock_items (
      org_id, branch_id, product_id, quantity_on_hand
    ) values (
      p_org_id, v_batch.branch_id, v_batch.product_id, 0 - v_batch.quantity
    )
    on conflict (org_id, branch_id, product_id)
    do update set quantity_on_hand = public.stock_items.quantity_on_hand - v_batch.quantity;
  else
    update public.stock_items
      set quantity_on_hand = quantity_on_hand - v_batch.quantity
    where org_id = p_org_id
      and branch_id = v_batch.branch_id
      and product_id = v_batch.product_id;
  end if;

  insert into public.stock_movements (
    org_id,
    branch_id,
    product_id,
    movement_type,
    quantity_delta,
    reason,
    source_type,
    source_id,
    expiration_batch_id
  ) values (
    p_org_id,
    v_batch.branch_id,
    v_batch.product_id,
    'expiration_adjustment',
    0 - v_batch.quantity,
    'waste',
    'expiration_waste',
    v_waste_id,
    v_batch.batch_id
  );

  perform public.rpc_log_audit_event(
    p_org_id,
    'expiration_waste_recorded',
    'expiration_waste',
    v_waste_id,
    v_batch.branch_id,
    jsonb_build_object(
      'batch_id', v_batch.batch_id,
      'product_id', v_batch.product_id,
      'quantity', v_batch.quantity,
      'total_amount', v_total
    ),
    null
  );

  return query select v_waste_id, v_total;
end;
$$;
