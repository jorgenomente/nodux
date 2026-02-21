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

  delete from public.cash_session_count_lines ccl
  where ccl.session_id = p_session_id
    and ccl.count_scope in ('closing_drawer', 'closing_reserve');

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

