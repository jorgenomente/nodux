-- Cashbox reconciliation inputs: operator-reported totals per row + MercadoPago aggregated row.

create table if not exists public.cash_session_reconciliation_inputs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  session_id uuid not null references public.cash_sessions(id) on delete cascade,
  row_key text not null,
  reported_amount numeric(12,2) not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_session_reconciliation_inputs_row_key_not_blank_ck check (length(trim(row_key)) > 0),
  constraint cash_session_reconciliation_inputs_reported_amount_non_negative_ck check (reported_amount >= 0),
  constraint cash_session_reconciliation_inputs_unique_session_row_key unique (session_id, row_key)
);

create index if not exists cash_session_reconciliation_inputs_org_branch_idx
  on public.cash_session_reconciliation_inputs (org_id, branch_id, created_at desc);

create index if not exists cash_session_reconciliation_inputs_session_idx
  on public.cash_session_reconciliation_inputs (session_id, row_key);

create trigger trg_cash_session_reconciliation_inputs_set_updated_at
before update on public.cash_session_reconciliation_inputs
for each row
execute function public.set_updated_at();

alter table public.cash_session_reconciliation_inputs enable row level security;

drop policy if exists cash_session_reconciliation_inputs_select on public.cash_session_reconciliation_inputs;
create policy cash_session_reconciliation_inputs_select
on public.cash_session_reconciliation_inputs
for select
using (public.is_org_member(org_id));

drop policy if exists cash_session_reconciliation_inputs_write on public.cash_session_reconciliation_inputs;
create policy cash_session_reconciliation_inputs_write
on public.cash_session_reconciliation_inputs
for insert
with check (public.is_org_member(org_id));

drop policy if exists cash_session_reconciliation_inputs_update on public.cash_session_reconciliation_inputs;
create policy cash_session_reconciliation_inputs_update
on public.cash_session_reconciliation_inputs
for update
using (public.is_org_member(org_id));

create or replace function public.rpc_get_cash_session_reconciliation_rows(
  p_org_id uuid,
  p_session_id uuid
)
returns table (
  row_key text,
  row_group text,
  payment_method public.payment_method,
  payment_device_id uuid,
  payment_device_name text,
  payment_device_provider text,
  payments_count bigint,
  system_amount numeric,
  reported_amount numeric,
  difference_amount numeric
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
        and (sma.branch_id = v_session.branch_id or sma.branch_id is null)
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  return query
  with payment_rows as (
    select
      sp.payment_method,
      sp.payment_device_id,
      ppd.device_name as payment_device_name,
      ppd.provider as payment_device_provider,
      case
        when sp.payment_method = 'mercadopago' then true
        when coalesce(ppd.provider, '') = 'mercadopago' then true
        else false
      end as is_mercadopago,
      sp.amount
    from public.sales s
    join public.sale_payments sp
      on sp.sale_id = s.id
     and sp.org_id = s.org_id
    left join public.pos_payment_devices ppd
      on ppd.id = sp.payment_device_id
     and ppd.org_id = sp.org_id
    where s.org_id = p_org_id
      and s.branch_id = v_session.branch_id
      and s.created_at >= v_session.opened_at
      and s.created_at <= coalesce(v_session.closed_at, now())
      and sp.payment_method <> 'cash'
  ),
  grouped_non_mp as (
    select
      concat('device:', coalesce(pr.payment_device_id::text, 'none'), ':method:', pr.payment_method::text) as row_key,
      'device'::text as row_group,
      pr.payment_method,
      pr.payment_device_id,
      coalesce(pr.payment_device_name, 'Sin dispositivo') as payment_device_name,
      pr.payment_device_provider,
      count(*)::bigint as payments_count,
      coalesce(sum(pr.amount), 0)::numeric(12,2) as system_amount
    from payment_rows pr
    where pr.is_mercadopago = false
    group by
      pr.payment_method,
      pr.payment_device_id,
      coalesce(pr.payment_device_name, 'Sin dispositivo'),
      pr.payment_device_provider
  ),
  grouped_mp as (
    select
      'mercadopago_total'::text as row_key,
      'mercadopago_total'::text as row_group,
      'mercadopago'::public.payment_method as payment_method,
      null::uuid as payment_device_id,
      'MercadoPago (total)'::text as payment_device_name,
      'mercadopago'::text as payment_device_provider,
      count(*)::bigint as payments_count,
      coalesce(sum(amount), 0)::numeric(12,2) as system_amount
    from payment_rows pr
    where pr.is_mercadopago = true
  ),
  grouped as (
    select * from grouped_non_mp
    union all
    select gm.*
    from grouped_mp gm
    where gm.payments_count > 0
  )
  select
    g.row_key,
    g.row_group,
    g.payment_method,
    g.payment_device_id,
    g.payment_device_name,
    g.payment_device_provider,
    g.payments_count,
    g.system_amount,
    i.reported_amount,
    case
      when i.reported_amount is null then null
      else round((i.reported_amount - g.system_amount)::numeric, 2)
    end as difference_amount
  from grouped g
  left join public.cash_session_reconciliation_inputs i
    on i.org_id = p_org_id
   and i.session_id = p_session_id
   and i.row_key = g.row_key
  order by
    case when g.row_group = 'mercadopago_total' then 1 else 0 end,
    g.payment_method::text,
    g.payment_device_name;
end;
$$;

create or replace function public.rpc_upsert_cash_session_reconciliation_inputs(
  p_org_id uuid,
  p_session_id uuid,
  p_entries jsonb
)
returns table (
  updated_count integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_session record;
  v_cashbox_enabled boolean := false;
  v_updated_count integer := 0;
  v_entry jsonb;
  v_row_key text;
  v_reported_amount numeric;
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

  if v_session.status <> 'open' then
    raise exception 'cash session is closed';
  end if;

  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid entries';
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
        and (sma.branch_id = v_session.branch_id or sma.branch_id is null)
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  for v_entry in
    select value
    from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) as t(value)
  loop
    v_row_key := nullif(trim(coalesce(v_entry->>'row_key', '')), '');
    if v_row_key is null then
      continue;
    end if;

    begin
      v_reported_amount := round((v_entry->>'reported_amount')::numeric, 2);
    exception
      when others then
        raise exception 'invalid reported amount';
    end;

    if v_reported_amount < 0 then
      raise exception 'reported amount must be >= 0';
    end if;

    insert into public.cash_session_reconciliation_inputs (
      org_id,
      branch_id,
      session_id,
      row_key,
      reported_amount,
      created_by,
      updated_by
    ) values (
      p_org_id,
      v_session.branch_id,
      p_session_id,
      v_row_key,
      v_reported_amount,
      auth.uid(),
      auth.uid()
    )
    on conflict (session_id, row_key)
    do update
      set reported_amount = excluded.reported_amount,
          updated_by = auth.uid(),
          updated_at = now();

    v_updated_count := v_updated_count + 1;
  end loop;

  return query select v_updated_count;
end;
$$;

grant execute on function public.rpc_get_cash_session_reconciliation_rows(uuid, uuid) to authenticated;
grant execute on function public.rpc_get_cash_session_reconciliation_rows(uuid, uuid) to service_role;
grant execute on function public.rpc_upsert_cash_session_reconciliation_inputs(uuid, uuid, jsonb) to authenticated;
grant execute on function public.rpc_upsert_cash_session_reconciliation_inputs(uuid, uuid, jsonb) to service_role;
