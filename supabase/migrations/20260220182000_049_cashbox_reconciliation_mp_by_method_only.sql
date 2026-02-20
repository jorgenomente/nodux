-- Cashbox reconciliation: classify MercadoPago totals by payment method only.
-- Card charges must remain in card rows even if device provider is MercadoPago.

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
  with expected_cash_row as (
    select
      'cash_expected_total'::text as row_key,
      'cash_expected_total'::text as row_group,
      'cash'::public.payment_method as payment_method,
      null::uuid as payment_device_id,
      'Efectivo esperado total (caja + reserva)'::text as payment_device_name,
      null::text as payment_device_provider,
      0::bigint as payments_count,
      coalesce(vcs.expected_cash_amount, 0)::numeric(12,2) as system_amount
    from public.v_cashbox_session_current vcs
    where vcs.org_id = p_org_id
      and vcs.session_id = p_session_id
    limit 1
  ),
  payment_rows as (
    select
      sp.payment_method,
      sp.payment_device_id,
      ppd.device_name as payment_device_name,
      ppd.provider as payment_device_provider,
      case when sp.payment_method = 'mercadopago' then true else false end as is_mercadopago,
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
      coalesce(sum(pr.amount), 0)::numeric(12,2) as system_amount
    from payment_rows pr
    where pr.is_mercadopago = true
  ),
  grouped as (
    select ec.* from expected_cash_row ec
    union all
    select gnm.* from grouped_non_mp gnm
    union all
    select gm.* from grouped_mp gm
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
    case
      when g.row_group = 'cash_expected_total' then 0
      when g.row_group = 'device' then 1
      when g.row_group = 'mercadopago_total' then 2
      else 3
    end,
    g.payment_method::text,
    g.payment_device_name;
end;
$$;
