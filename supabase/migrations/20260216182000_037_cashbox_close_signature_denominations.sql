-- Cashbox close hardening: signature + denomination count lines.

alter table public.cash_sessions
  add column if not exists closed_controlled_by_name text null,
  add column if not exists close_confirmed boolean not null default false;

create table if not exists public.cash_session_count_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  session_id uuid not null references public.cash_sessions(id) on delete cascade,
  denomination_value numeric(12,2) not null,
  quantity integer not null,
  created_at timestamptz not null default now(),
  constraint cash_session_count_lines_denom_positive_ck check (denomination_value > 0),
  constraint cash_session_count_lines_quantity_non_negative_ck check (quantity >= 0),
  constraint cash_session_count_lines_unique_session_denom unique (session_id, denomination_value)
);

create index if not exists cash_session_count_lines_org_branch_idx
  on public.cash_session_count_lines (org_id, branch_id, created_at desc);

create index if not exists cash_session_count_lines_session_idx
  on public.cash_session_count_lines (session_id, denomination_value desc);

alter table public.cash_session_count_lines enable row level security;

drop policy if exists cash_session_count_lines_select on public.cash_session_count_lines;
create policy cash_session_count_lines_select
on public.cash_session_count_lines
for select
using (public.is_org_member(org_id));

drop policy if exists cash_session_count_lines_write on public.cash_session_count_lines;
create policy cash_session_count_lines_write
on public.cash_session_count_lines
for insert
with check (public.is_org_member(org_id));

-- Replace close RPC to persist close signature + denominations detail.
drop function if exists public.rpc_close_cash_session(uuid, uuid, numeric, text);

create or replace function public.rpc_close_cash_session(
  p_org_id uuid,
  p_session_id uuid,
  p_counted_cash_amount numeric,
  p_close_note text default null,
  p_closed_controlled_by_name text default null,
  p_close_confirmed boolean default true,
  p_count_lines jsonb default null
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
  v_count_line jsonb;
  v_denom numeric(12,2);
  v_qty integer;
  v_lines_total numeric(12,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_counted_cash_amount is null or p_counted_cash_amount < 0 then
    raise exception 'invalid counted cash amount';
  end if;

  v_controlled_by_name := nullif(trim(coalesce(p_closed_controlled_by_name, '')), '');
  if v_controlled_by_name is null then
    raise exception 'controlled by name required';
  end if;

  v_confirmed := coalesce(p_close_confirmed, false);
  if not v_confirmed then
    raise exception 'close confirmation required';
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

  if p_count_lines is not null then
    if jsonb_typeof(p_count_lines) <> 'array' then
      raise exception 'count lines must be an array';
    end if;

    for v_count_line in select * from jsonb_array_elements(p_count_lines)
    loop
      v_denom := (v_count_line ->> 'denomination_value')::numeric;
      v_qty := (v_count_line ->> 'quantity')::integer;

      if v_denom is null or v_denom <= 0 then
        raise exception 'invalid denomination value';
      end if;
      if v_qty is null or v_qty < 0 then
        raise exception 'invalid denomination quantity';
      end if;

      if v_qty > 0 then
        v_lines_total := v_lines_total + (v_denom * v_qty);
      end if;
    end loop;

    if round(v_lines_total, 2) <> round(p_counted_cash_amount, 2) then
      raise exception 'count lines total must match counted cash';
    end if;
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
    closed_controlled_by_name = v_controlled_by_name,
    close_confirmed = v_confirmed,
    updated_at = v_closed_at
  where id = p_session_id;

  if p_count_lines is not null then
    insert into public.cash_session_count_lines (
      org_id,
      branch_id,
      session_id,
      denomination_value,
      quantity,
      created_at
    )
    select
      p_org_id,
      v_session.branch_id,
      p_session_id,
      (line ->> 'denomination_value')::numeric,
      (line ->> 'quantity')::integer,
      v_closed_at
    from jsonb_array_elements(p_count_lines) line
    where (line ->> 'quantity')::integer > 0;
  end if;

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
      'closed_controlled_by_name', v_controlled_by_name,
      'close_confirmed', v_confirmed,
      'count_lines', coalesce(p_count_lines, '[]'::jsonb),
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

grant execute on function public.rpc_close_cash_session(uuid, uuid, numeric, text, text, boolean, jsonb) to authenticated;
