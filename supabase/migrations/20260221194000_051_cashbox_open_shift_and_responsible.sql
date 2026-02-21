alter table public.cash_sessions
add column if not exists opened_controlled_by_name text null;

create or replace view public.v_cashbox_session_current as
with sales_by_method as (
  select
    cs.id as session_id,
    coalesce(
      sum(sp.amount) filter (where sp.payment_method = 'cash'),
      0
    ) as cash_sales_amount,
    coalesce(
      sum(sp.amount) filter (
        where sp.payment_method::text = any(array['card', 'debit', 'credit'])
      ),
      0
    ) as card_sales_amount,
    coalesce(
      sum(sp.amount) filter (where sp.payment_method::text = 'mercadopago'),
      0
    ) as mercadopago_sales_amount
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
    coalesce(
      sum(case when csm.movement_type = 'income' then csm.amount else 0 end),
      0
    ) as manual_income_amount,
    coalesce(
      sum(case when csm.movement_type = 'expense' then csm.amount else 0 end),
      0
    ) as manual_expense_amount,
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
    (
      (
        cs.opening_cash_amount +
        cs.opening_reserve_amount +
        coalesce(sbm.cash_sales_amount, 0) +
        coalesce(mt.manual_income_amount, 0)
      ) - coalesce(mt.manual_expense_amount, 0)
    )::numeric(12,2)
  ) as expected_cash_amount,
  cs.counted_cash_amount,
  case
    when cs.counted_cash_amount is null then null
    else (
      cs.counted_cash_amount - (
        (
          cs.opening_cash_amount +
          cs.opening_reserve_amount +
          coalesce(sbm.cash_sales_amount, 0) +
          coalesce(mt.manual_income_amount, 0)
        ) - coalesce(mt.manual_expense_amount, 0)
      )
    )::numeric(12,2)
  end as difference_amount,
  coalesce(mt.movements_count, 0) as movements_count,
  cs.opened_by,
  cs.closed_by,
  cs.opened_at,
  cs.closed_at,
  cs.close_note,
  cs.closed_controlled_by_name,
  cs.close_confirmed,
  cs.created_at,
  cs.updated_at,
  cs.opened_controlled_by_name
from public.cash_sessions cs
left join sales_by_method sbm on sbm.session_id = cs.id
left join movement_totals mt on mt.session_id = cs.id;

drop function if exists public.rpc_open_cash_session(uuid, uuid, text, text, jsonb, jsonb);

create or replace function public.rpc_open_cash_session(
  p_org_id uuid,
  p_branch_id uuid,
  p_period_type text default 'shift',
  p_session_label text default null,
  p_opened_controlled_by_name text default null,
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
  v_opened_controlled_by_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if coalesce(p_period_type, '') not in ('shift', 'day') then
    raise exception 'invalid period type';
  end if;

  v_opened_controlled_by_name := nullif(trim(coalesce(p_opened_controlled_by_name, '')), '');
  if v_opened_controlled_by_name is null then
    raise exception 'opened controlled by name required';
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
    opened_controlled_by_name,
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
    v_opened_controlled_by_name,
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
      'opened_controlled_by_name', v_opened_controlled_by_name,
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

grant execute on function public.rpc_open_cash_session(uuid, uuid, text, text, text, jsonb, jsonb) to authenticated;

drop function if exists public.rpc_get_cash_session_summary(uuid, uuid);

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
  opened_controlled_by_name text,
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
    v.opened_controlled_by_name,
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
