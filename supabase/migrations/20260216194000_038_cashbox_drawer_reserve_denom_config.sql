-- Cashbox: open/close by denomination counts (drawer + reserve) and org-configurable denominations.

alter table public.org_preferences
  add column if not exists cash_denominations jsonb not null default '[100,200,500,1000,2000,10000,20000]'::jsonb;

update public.org_preferences
set cash_denominations = '[100,200,500,1000,2000,10000,20000]'::jsonb
where cash_denominations is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'org_preferences_cash_denominations_array_ck'
  ) then
    alter table public.org_preferences
      add constraint org_preferences_cash_denominations_array_ck
      check (jsonb_typeof(cash_denominations) = 'array');
  end if;
end $$;

alter table public.cash_sessions
  add column if not exists opening_reserve_amount numeric(12,2) not null default 0,
  add column if not exists closing_drawer_amount numeric(12,2) null,
  add column if not exists closing_reserve_amount numeric(12,2) null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cash_sessions_opening_reserve_amount_ck'
  ) then
    alter table public.cash_sessions
      add constraint cash_sessions_opening_reserve_amount_ck
      check (opening_reserve_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cash_sessions_closing_drawer_amount_ck'
  ) then
    alter table public.cash_sessions
      add constraint cash_sessions_closing_drawer_amount_ck
      check (closing_drawer_amount is null or closing_drawer_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cash_sessions_closing_reserve_amount_ck'
  ) then
    alter table public.cash_sessions
      add constraint cash_sessions_closing_reserve_amount_ck
      check (closing_reserve_amount is null or closing_reserve_amount >= 0);
  end if;
end $$;

alter table public.cash_session_count_lines
  add column if not exists count_scope text not null default 'closing_drawer';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cash_session_count_lines_scope_ck'
  ) then
    alter table public.cash_session_count_lines
      add constraint cash_session_count_lines_scope_ck
      check (count_scope in ('opening_drawer', 'opening_reserve', 'closing_drawer', 'closing_reserve'));
  end if;
end $$;

alter table public.cash_session_count_lines
  drop constraint if exists cash_session_count_lines_unique_session_denom;

alter table public.cash_session_count_lines
  add constraint cash_session_count_lines_unique_session_scope_denom unique (session_id, count_scope, denomination_value);

create index if not exists cash_session_count_lines_session_scope_idx
  on public.cash_session_count_lines (session_id, count_scope, denomination_value desc);

drop function if exists public.rpc_get_cash_session_summary(uuid, uuid);
drop view if exists public.v_cashbox_session_current;

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
  cs.opening_reserve_amount,
  cs.closing_drawer_amount,
  cs.closing_reserve_amount,
  coalesce(sc.cash_sales_amount, 0) as cash_sales_amount,
  coalesce(mt.manual_income_amount, 0) as manual_income_amount,
  coalesce(mt.manual_expense_amount, 0) as manual_expense_amount,
  (
    cs.opening_cash_amount
    + cs.opening_reserve_amount
    + coalesce(sc.cash_sales_amount, 0)
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
        + coalesce(sc.cash_sales_amount, 0)
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
left join sales_cash sc on sc.session_id = cs.id
left join movement_totals mt on mt.session_id = cs.id;

drop function if exists public.rpc_open_cash_session(uuid, uuid, numeric, text, text);

create or replace function public.rpc_open_cash_session(
  p_org_id uuid,
  p_branch_id uuid,
  p_period_type text default 'shift',
  p_session_label text default null,
  p_opening_drawer_count_lines jsonb default null,
  p_opening_reserve_count_lines jsonb default null
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
  v_drawer_line jsonb;
  v_reserve_line jsonb;
  v_denom numeric(12,2);
  v_qty integer;
  v_opening_drawer_amount numeric(12,2) := 0;
  v_opening_reserve_amount numeric(12,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if coalesce(p_period_type, '') not in ('shift', 'day') then
    raise exception 'invalid period type';
  end if;

  if p_opening_drawer_count_lines is null or jsonb_typeof(p_opening_drawer_count_lines) <> 'array' then
    raise exception 'opening drawer count lines required';
  end if;
  if p_opening_reserve_count_lines is null or jsonb_typeof(p_opening_reserve_count_lines) <> 'array' then
    raise exception 'opening reserve count lines required';
  end if;

  for v_drawer_line in select * from jsonb_array_elements(p_opening_drawer_count_lines)
  loop
    v_denom := (v_drawer_line ->> 'denomination_value')::numeric;
    v_qty := (v_drawer_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid drawer denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid drawer denomination quantity';
    end if;

    v_opening_drawer_amount := v_opening_drawer_amount + (v_denom * v_qty);
  end loop;

  for v_reserve_line in select * from jsonb_array_elements(p_opening_reserve_count_lines)
  loop
    v_denom := (v_reserve_line ->> 'denomination_value')::numeric;
    v_qty := (v_reserve_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid reserve denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid reserve denomination quantity';
    end if;

    v_opening_reserve_amount := v_opening_reserve_amount + (v_denom * v_qty);
  end loop;

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
    opening_reserve_amount,
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
    round(v_opening_drawer_amount, 2),
    round(v_opening_reserve_amount, 2),
    'open',
    v_opened_at,
    v_opened_at,
    v_opened_at
  );

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    p_branch_id,
    v_session_id,
    'opening_drawer',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_opened_at
  from jsonb_array_elements(p_opening_drawer_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    p_branch_id,
    v_session_id,
    'opening_reserve',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_opened_at
  from jsonb_array_elements(p_opening_reserve_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_session_opened',
    'cash_session',
    v_session_id,
    p_branch_id,
    jsonb_build_object(
      'period_type', p_period_type,
      'session_label', nullif(trim(coalesce(p_session_label, '')), ''),
      'opening_drawer_amount', round(v_opening_drawer_amount, 2),
      'opening_reserve_amount', round(v_opening_reserve_amount, 2),
      'opening_drawer_count_lines', p_opening_drawer_count_lines,
      'opening_reserve_count_lines', p_opening_reserve_count_lines
    )
  );

  return query
  select v_session_id, v_opened_at;
end;
$$;

grant execute on function public.rpc_open_cash_session(uuid, uuid, text, text, jsonb, jsonb) to authenticated;

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

drop function if exists public.rpc_close_cash_session(uuid, uuid, numeric, text, text, boolean, jsonb);

create or replace function public.rpc_close_cash_session(
  p_org_id uuid,
  p_session_id uuid,
  p_close_note text default null,
  p_closed_controlled_by_name text default null,
  p_close_confirmed boolean default true,
  p_closing_drawer_count_lines jsonb default null,
  p_closing_reserve_count_lines jsonb default null
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
  v_controlled_by_name text;
  v_confirmed boolean;
  v_drawer_line jsonb;
  v_reserve_line jsonb;
  v_denom numeric(12,2);
  v_qty integer;
  v_closing_drawer_amount numeric(12,2) := 0;
  v_closing_reserve_amount numeric(12,2) := 0;
  v_counted_total numeric(12,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_controlled_by_name := nullif(trim(coalesce(p_closed_controlled_by_name, '')), '');
  if v_controlled_by_name is null then
    raise exception 'controlled by name required';
  end if;

  v_confirmed := coalesce(p_close_confirmed, false);
  if not v_confirmed then
    raise exception 'close confirmation required';
  end if;

  if p_closing_drawer_count_lines is null or jsonb_typeof(p_closing_drawer_count_lines) <> 'array' then
    raise exception 'closing drawer count lines required';
  end if;
  if p_closing_reserve_count_lines is null or jsonb_typeof(p_closing_reserve_count_lines) <> 'array' then
    raise exception 'closing reserve count lines required';
  end if;

  for v_drawer_line in select * from jsonb_array_elements(p_closing_drawer_count_lines)
  loop
    v_denom := (v_drawer_line ->> 'denomination_value')::numeric;
    v_qty := (v_drawer_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid closing drawer denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid closing drawer denomination quantity';
    end if;

    v_closing_drawer_amount := v_closing_drawer_amount + (v_denom * v_qty);
  end loop;

  for v_reserve_line in select * from jsonb_array_elements(p_closing_reserve_count_lines)
  loop
    v_denom := (v_reserve_line ->> 'denomination_value')::numeric;
    v_qty := (v_reserve_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid closing reserve denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid closing reserve denomination quantity';
    end if;

    v_closing_reserve_amount := v_closing_reserve_amount + (v_denom * v_qty);
  end loop;

  v_counted_total := v_closing_drawer_amount + v_closing_reserve_amount;

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
    closing_drawer_amount = round(v_closing_drawer_amount, 2),
    closing_reserve_amount = round(v_closing_reserve_amount, 2),
    counted_cash_amount = round(v_counted_total, 2),
    difference_amount = round(v_counted_total, 2) - v_summary.expected_cash_amount,
    close_note = nullif(trim(coalesce(p_close_note, '')), ''),
    closed_controlled_by_name = v_controlled_by_name,
    close_confirmed = v_confirmed,
    updated_at = v_closed_at
  where id = p_session_id;

  delete from public.cash_session_count_lines
  where session_id = p_session_id
    and count_scope in ('closing_drawer', 'closing_reserve');

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    v_session.branch_id,
    p_session_id,
    'closing_drawer',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_closed_at
  from jsonb_array_elements(p_closing_drawer_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    v_session.branch_id,
    p_session_id,
    'closing_reserve',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_closed_at
  from jsonb_array_elements(p_closing_reserve_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_session_closed',
    'cash_session',
    p_session_id,
    v_session.branch_id,
    jsonb_build_object(
      'expected_cash_amount', v_summary.expected_cash_amount,
      'closing_drawer_amount', round(v_closing_drawer_amount, 2),
      'closing_reserve_amount', round(v_closing_reserve_amount, 2),
      'counted_cash_amount', round(v_counted_total, 2),
      'difference_amount', round(v_counted_total, 2) - v_summary.expected_cash_amount,
      'close_note', nullif(trim(coalesce(p_close_note, '')), ''),
      'closed_controlled_by_name', v_controlled_by_name,
      'close_confirmed', v_confirmed,
      'closing_drawer_count_lines', p_closing_drawer_count_lines,
      'closing_reserve_count_lines', p_closing_reserve_count_lines,
      'period_type', v_session.period_type,
      'session_label', v_session.session_label,
      'opened_by', v_session.opened_by
    )
  );

  return query
  select
    p_session_id,
    v_summary.expected_cash_amount,
    round(v_counted_total, 2),
    round(v_counted_total, 2) - v_summary.expected_cash_amount,
    v_closed_at;
end;
$$;

grant execute on function public.rpc_close_cash_session(uuid, uuid, text, text, boolean, jsonb, jsonb) to authenticated;
