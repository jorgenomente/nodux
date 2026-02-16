-- Cashbox module (branch-scoped): open/close cash sessions and manual cash movements.
-- Includes audit events for session lifecycle and movement registration.

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  opened_by uuid not null references auth.users(id) on delete restrict,
  closed_by uuid null references auth.users(id) on delete restrict,
  period_type text not null default 'shift',
  session_label text null,
  status text not null default 'open',
  opening_cash_amount numeric(12,2) not null default 0,
  expected_cash_amount numeric(12,2) null,
  counted_cash_amount numeric(12,2) null,
  difference_amount numeric(12,2) null,
  close_note text null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_sessions_period_type_ck check (period_type in ('shift', 'day')),
  constraint cash_sessions_status_ck check (status in ('open', 'closed')),
  constraint cash_sessions_opening_cash_amount_ck check (opening_cash_amount >= 0),
  constraint cash_sessions_expected_cash_amount_ck check (expected_cash_amount is null or expected_cash_amount >= 0),
  constraint cash_sessions_counted_cash_amount_ck check (counted_cash_amount is null or counted_cash_amount >= 0)
);

create unique index if not exists cash_sessions_open_unique
  on public.cash_sessions (org_id, branch_id)
  where status = 'open';

create index if not exists cash_sessions_org_branch_status_idx
  on public.cash_sessions (org_id, branch_id, status, opened_at desc);

create index if not exists cash_sessions_org_created_idx
  on public.cash_sessions (org_id, created_at desc);

create table if not exists public.cash_session_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  session_id uuid not null references public.cash_sessions(id) on delete cascade,
  movement_type text not null,
  category_key text not null,
  amount numeric(12,2) not null,
  note text null,
  movement_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint cash_session_movements_movement_type_ck check (movement_type in ('expense', 'income')),
  constraint cash_session_movements_amount_positive_ck check (amount > 0)
);

create index if not exists cash_session_movements_session_idx
  on public.cash_session_movements (session_id, created_at desc);

create index if not exists cash_session_movements_org_branch_idx
  on public.cash_session_movements (org_id, branch_id, created_at desc);

alter table public.cash_sessions enable row level security;
alter table public.cash_session_movements enable row level security;

drop policy if exists cash_sessions_select on public.cash_sessions;
create policy cash_sessions_select
on public.cash_sessions
for select
using (public.is_org_member(org_id));

drop policy if exists cash_sessions_write on public.cash_sessions;
create policy cash_sessions_write
on public.cash_sessions
for insert
with check (public.is_org_member(org_id));

drop policy if exists cash_sessions_update on public.cash_sessions;
create policy cash_sessions_update
on public.cash_sessions
for update
using (public.is_org_member(org_id));

drop policy if exists cash_session_movements_select on public.cash_session_movements;
create policy cash_session_movements_select
on public.cash_session_movements
for select
using (public.is_org_member(org_id));

drop policy if exists cash_session_movements_write on public.cash_session_movements;
create policy cash_session_movements_write
on public.cash_session_movements
for insert
with check (public.is_org_member(org_id));

create or replace view public.v_cashbox_session_current as
with sales_cash as (
  select
    cs.id as session_id,
    coalesce(sum(sp.amount), 0) as cash_sales_amount
  from public.cash_sessions cs
  left join public.sales s
    on s.org_id = cs.org_id
    and s.branch_id = cs.branch_id
    and s.created_at >= cs.opened_at
    and s.created_at <= coalesce(cs.closed_at, now())
  left join public.sale_payments sp
    on sp.sale_id = s.id
    and sp.payment_method = 'cash'
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
  coalesce(sc.cash_sales_amount, 0) as cash_sales_amount,
  coalesce(mt.manual_income_amount, 0) as manual_income_amount,
  coalesce(mt.manual_expense_amount, 0) as manual_expense_amount,
  (cs.opening_cash_amount + coalesce(sc.cash_sales_amount, 0) + coalesce(mt.manual_income_amount, 0) - coalesce(mt.manual_expense_amount, 0))::numeric(12,2) as expected_cash_amount,
  cs.counted_cash_amount,
  case
    when cs.counted_cash_amount is null then null
    else (cs.counted_cash_amount - (cs.opening_cash_amount + coalesce(sc.cash_sales_amount, 0) + coalesce(mt.manual_income_amount, 0) - coalesce(mt.manual_expense_amount, 0)))::numeric(12,2)
  end as difference_amount,
  coalesce(mt.movements_count, 0)::bigint as movements_count,
  cs.opened_by,
  cs.closed_by,
  cs.opened_at,
  cs.closed_at,
  cs.close_note,
  cs.created_at,
  cs.updated_at
from public.cash_sessions cs
left join sales_cash sc on sc.session_id = cs.id
left join movement_totals mt on mt.session_id = cs.id;

create or replace function public.rpc_open_cash_session(
  p_org_id uuid,
  p_branch_id uuid,
  p_opening_cash_amount numeric,
  p_period_type text default 'shift',
  p_session_label text default null
)
returns table (session_id uuid, opened_at timestamptz)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_session_id uuid := gen_random_uuid();
  v_opened_at timestamptz := now();
  v_cashbox_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_opening_cash_amount is null or p_opening_cash_amount < 0 then
    raise exception 'invalid opening cash amount';
  end if;

  if coalesce(p_period_type, '') not in ('shift', 'day') then
    raise exception 'invalid period type';
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

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = p_branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  if exists (
    select 1
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = p_branch_id
      and cs.status = 'open'
  ) then
    raise exception 'cash session already open for branch';
  end if;

  insert into public.cash_sessions (
    id,
    org_id,
    branch_id,
    opened_by,
    period_type,
    session_label,
    opening_cash_amount,
    status,
    opened_at,
    created_at,
    updated_at
  ) values (
    v_session_id,
    p_org_id,
    p_branch_id,
    auth.uid(),
    p_period_type,
    nullif(trim(coalesce(p_session_label, '')), ''),
    round(p_opening_cash_amount::numeric, 2),
    'open',
    v_opened_at,
    v_opened_at,
    v_opened_at
  );

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_session_opened',
    'cash_session',
    v_session_id,
    p_branch_id,
    jsonb_build_object(
      'period_type', p_period_type,
      'session_label', nullif(trim(coalesce(p_session_label, '')), ''),
      'opening_cash_amount', round(p_opening_cash_amount::numeric, 2)
    )
  );

  return query
  select v_session_id, v_opened_at;
end;
$$;

grant execute on function public.rpc_open_cash_session(uuid, uuid, numeric, text, text) to authenticated;

create or replace function public.rpc_add_cash_session_movement(
  p_org_id uuid,
  p_session_id uuid,
  p_movement_type text,
  p_category_key text,
  p_amount numeric,
  p_note text default null,
  p_movement_at timestamptz default null
)
returns table (movement_id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_movement_id uuid := gen_random_uuid();
  v_created_at timestamptz := now();
  v_session record;
  v_cashbox_enabled boolean := false;
  v_movement_type text;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid movement amount';
  end if;

  v_movement_type := lower(trim(coalesce(p_movement_type, '')));
  if v_movement_type not in ('expense', 'income') then
    raise exception 'invalid movement type';
  end if;

  v_category := nullif(trim(coalesce(p_category_key, '')), '');
  if v_category is null then
    raise exception 'movement category required';
  end if;

  select *
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
  end if;

  if v_session.status <> 'open' then
    raise exception 'cash session closed';
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

  insert into public.cash_session_movements (
    id,
    org_id,
    branch_id,
    session_id,
    movement_type,
    category_key,
    amount,
    note,
    movement_at,
    created_by,
    created_at
  ) values (
    v_movement_id,
    p_org_id,
    v_session.branch_id,
    p_session_id,
    v_movement_type,
    v_category,
    round(p_amount::numeric, 2),
    nullif(trim(coalesce(p_note, '')), ''),
    coalesce(p_movement_at, v_created_at),
    auth.uid(),
    v_created_at
  );

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_movement_added',
    'cash_session_movement',
    v_movement_id,
    v_session.branch_id,
    jsonb_build_object(
      'session_id', p_session_id,
      'movement_type', v_movement_type,
      'category_key', v_category,
      'amount', round(p_amount::numeric, 2),
      'movement_at', coalesce(p_movement_at, v_created_at),
      'note', nullif(trim(coalesce(p_note, '')), '')
    )
  );

  return query
  select v_movement_id, v_created_at;
end;
$$;

grant execute on function public.rpc_add_cash_session_movement(uuid, uuid, text, text, numeric, text, timestamptz) to authenticated;

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
  cash_sales_amount numeric,
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
  close_note text
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
    v.cash_sales_amount,
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
    v.close_note
  from public.v_cashbox_session_current v
  where v.session_id = p_session_id
    and v.org_id = p_org_id;
end;
$$;

grant execute on function public.rpc_get_cash_session_summary(uuid, uuid) to authenticated;

create or replace function public.rpc_close_cash_session(
  p_org_id uuid,
  p_session_id uuid,
  p_counted_cash_amount numeric,
  p_close_note text default null
)
returns table (
  session_id uuid,
  expected_cash_amount numeric,
  counted_cash_amount numeric,
  difference_amount numeric,
  closed_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_session record;
  v_summary record;
  v_closed_at timestamptz := now();
  v_cashbox_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_counted_cash_amount is null or p_counted_cash_amount < 0 then
    raise exception 'invalid counted cash amount';
  end if;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
  end if;

  if v_session.status <> 'open' then
    raise exception 'cash session already closed';
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

  select *
  into v_summary
  from public.v_cashbox_session_current v
  where v.session_id = p_session_id
    and v.org_id = p_org_id;

  if not found then
    raise exception 'cash session summary unavailable';
  end if;

  update public.cash_sessions
  set
    status = 'closed',
    closed_by = auth.uid(),
    closed_at = v_closed_at,
    expected_cash_amount = v_summary.expected_cash_amount,
    counted_cash_amount = round(p_counted_cash_amount::numeric, 2),
    difference_amount = round(p_counted_cash_amount::numeric, 2) - v_summary.expected_cash_amount,
    close_note = nullif(trim(coalesce(p_close_note, '')), ''),
    updated_at = v_closed_at
  where id = p_session_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_session_closed',
    'cash_session',
    p_session_id,
    v_session.branch_id,
    jsonb_build_object(
      'expected_cash_amount', v_summary.expected_cash_amount,
      'counted_cash_amount', round(p_counted_cash_amount::numeric, 2),
      'difference_amount', round(p_counted_cash_amount::numeric, 2) - v_summary.expected_cash_amount,
      'close_note', nullif(trim(coalesce(p_close_note, '')), ''),
      'period_type', v_session.period_type,
      'session_label', v_session.session_label,
      'opened_by', v_session.opened_by
    )
  );

  return query
  select
    p_session_id,
    v_summary.expected_cash_amount,
    round(p_counted_cash_amount::numeric, 2),
    round(p_counted_cash_amount::numeric, 2) - v_summary.expected_cash_amount,
    v_closed_at;
end;
$$;

grant execute on function public.rpc_close_cash_session(uuid, uuid, numeric, text) to authenticated;
