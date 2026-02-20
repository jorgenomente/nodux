-- Sales history contracts + cashbox reconciliation helpers.

create or replace view public.v_sales_admin
with (security_invoker = true) as
with payment_totals as (
  select
    sp.sale_id,
    coalesce(sum(sp.amount) filter (where sp.payment_method = 'cash'), 0)::numeric(12,2) as cash_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text in ('card', 'debit', 'credit')), 0)::numeric(12,2) as card_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text = 'mercadopago'), 0)::numeric(12,2) as mercadopago_amount,
    coalesce(sum(sp.amount) filter (where sp.payment_method::text not in ('cash', 'card', 'debit', 'credit', 'mercadopago')), 0)::numeric(12,2) as other_amount,
    array_agg(distinct sp.payment_method::text order by sp.payment_method::text) as payment_methods
  from public.sale_payments sp
  group by sp.sale_id
),
item_totals as (
  select
    si.sale_id,
    count(*)::int as items_count,
    coalesce(sum(si.quantity), 0)::numeric(14,3) as items_qty_total,
    string_agg(distinct si.product_name_snapshot, ', ' order by si.product_name_snapshot) as item_names_summary,
    lower(string_agg(distinct si.product_name_snapshot, ' ' order by si.product_name_snapshot)) as item_names_search
  from public.sale_items si
  group by si.sale_id
),
creator_names as (
  select
    ou.org_id,
    ou.user_id,
    coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as creator_name
  from public.org_users ou
)
select
  s.id as sale_id,
  s.org_id,
  s.branch_id,
  b.name as branch_name,
  s.created_at,
  s.created_by,
  coalesce(cn.creator_name, s.created_by::text) as created_by_name,
  s.payment_method as payment_method_summary,
  s.subtotal_amount,
  s.discount_amount,
  s.discount_pct,
  s.total_amount,
  coalesce(it.items_count, 0) as items_count,
  coalesce(it.items_qty_total, 0)::numeric(14,3) as items_qty_total,
  coalesce(it.item_names_summary, '') as item_names_summary,
  coalesce(it.item_names_search, '') as item_names_search,
  coalesce(pt.payment_methods, array[]::text[]) as payment_methods,
  coalesce(pt.cash_amount, 0)::numeric(12,2) as cash_amount,
  coalesce(pt.card_amount, 0)::numeric(12,2) as card_amount,
  coalesce(pt.mercadopago_amount, 0)::numeric(12,2) as mercadopago_amount,
  coalesce(pt.other_amount, 0)::numeric(12,2) as other_amount
from public.sales s
join public.branches b
  on b.id = s.branch_id
 and b.org_id = s.org_id
left join payment_totals pt on pt.sale_id = s.id
left join item_totals it on it.sale_id = s.id
left join creator_names cn
  on cn.org_id = s.org_id
 and cn.user_id = s.created_by;

create or replace view public.v_sale_detail_admin
with (security_invoker = true) as
with items_by_sale as (
  select
    si.sale_id,
    jsonb_agg(
      jsonb_build_object(
        'sale_item_id', si.id,
        'product_id', si.product_id,
        'product_name', si.product_name_snapshot,
        'unit_price', si.unit_price_snapshot,
        'quantity', si.quantity,
        'line_total', si.line_total
      )
      order by si.product_name_snapshot
    ) as items
  from public.sale_items si
  group by si.sale_id
),
payments_by_sale as (
  select
    sp.sale_id,
    jsonb_agg(
      jsonb_build_object(
        'sale_payment_id', sp.id,
        'payment_method', sp.payment_method,
        'amount', sp.amount,
        'payment_device_id', sp.payment_device_id,
        'payment_device_name', ppd.device_name,
        'payment_device_provider', ppd.provider,
        'created_at', sp.created_at
      )
      order by sp.created_at, sp.id
    ) as payments
  from public.sale_payments sp
  left join public.pos_payment_devices ppd
    on ppd.id = sp.payment_device_id
   and ppd.org_id = sp.org_id
  group by sp.sale_id
),
creator_names as (
  select
    ou.org_id,
    ou.user_id,
    coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as creator_name
  from public.org_users ou
)
select
  s.id as sale_id,
  s.org_id,
  s.branch_id,
  b.name as branch_name,
  s.created_at,
  s.created_by,
  coalesce(cn.creator_name, s.created_by::text) as created_by_name,
  s.payment_method as payment_method_summary,
  s.subtotal_amount,
  s.discount_amount,
  s.discount_pct,
  s.total_amount,
  coalesce(ibs.items, '[]'::jsonb) as items,
  coalesce(pbs.payments, '[]'::jsonb) as payments
from public.sales s
join public.branches b
  on b.id = s.branch_id
 and b.org_id = s.org_id
left join items_by_sale ibs on ibs.sale_id = s.id
left join payments_by_sale pbs on pbs.sale_id = s.id
left join creator_names cn
  on cn.org_id = s.org_id
 and cn.user_id = s.created_by;

create or replace function public.rpc_get_cash_session_payment_breakdown(
  p_org_id uuid,
  p_session_id uuid
)
returns table (
  payment_method public.payment_method,
  payment_device_id uuid,
  payment_device_name text,
  payment_device_provider text,
  total_amount numeric,
  payments_count bigint
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
  select
    sp.payment_method,
    sp.payment_device_id,
    case
      when sp.payment_method = 'cash' then 'Efectivo'
      when ppd.device_name is null then 'Sin dispositivo'
      else ppd.device_name
    end as payment_device_name,
    ppd.provider as payment_device_provider,
    coalesce(sum(sp.amount), 0)::numeric(12,2) as total_amount,
    count(*)::bigint as payments_count
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
  group by
    sp.payment_method,
    sp.payment_device_id,
    case
      when sp.payment_method = 'cash' then 'Efectivo'
      when ppd.device_name is null then 'Sin dispositivo'
      else ppd.device_name
    end,
    ppd.provider
  order by sp.payment_method::text, payment_device_name;
end;
$$;

create or replace function public.rpc_correct_sale_payment_method(
  p_org_id uuid,
  p_sale_payment_id uuid,
  p_payment_method public.payment_method,
  p_payment_device_id uuid default null,
  p_reason text default null
)
returns table (
  sale_id uuid,
  sale_payment_id uuid,
  previous_payment_method public.payment_method,
  payment_method public.payment_method
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_payment record;
  v_sale record;
  v_distinct_methods integer := 0;
  v_summary_method public.payment_method;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_payment_method = 'mixed' then
    raise exception 'invalid payment method';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'reason is required';
  end if;

  select sp.*
  into v_payment
  from public.sale_payments sp
  where sp.id = p_sale_payment_id
    and sp.org_id = p_org_id
  for update;

  if not found then
    raise exception 'sale payment not found';
  end if;

  select s.*
  into v_sale
  from public.sales s
  where s.id = v_payment.sale_id
    and s.org_id = p_org_id
  for update;

  if not found then
    raise exception 'sale not found';
  end if;

  if exists (
    select 1
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = v_sale.branch_id
      and cs.status = 'closed'
      and v_sale.created_at >= cs.opened_at
      and v_sale.created_at <= cs.closed_at
  ) then
    raise exception 'sale belongs to a closed cash session';
  end if;

  if p_payment_method in ('card', 'mercadopago') then
    if p_payment_device_id is null then
      raise exception 'payment_device_id required for card and mercadopago';
    end if;

    if not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = v_sale.branch_id
    ) then
      raise exception 'invalid payment device';
    end if;
  elsif p_payment_device_id is not null then
    raise exception 'payment_device_id only allowed for card and mercadopago';
  end if;

  update public.sale_payments
  set
    payment_method = p_payment_method,
    payment_device_id = p_payment_device_id
  where id = p_sale_payment_id
    and org_id = p_org_id;

  select count(distinct sp.payment_method)
  into v_distinct_methods
  from public.sale_payments sp
  where sp.sale_id = v_sale.id
    and sp.org_id = p_org_id;

  if v_distinct_methods > 1 then
    v_summary_method := 'mixed';
  else
    select sp.payment_method
    into v_summary_method
    from public.sale_payments sp
    where sp.sale_id = v_sale.id
      and sp.org_id = p_org_id
    order by sp.created_at, sp.id
    limit 1;
  end if;

  update public.sales
  set payment_method = coalesce(v_summary_method, p_payment_method)
  where id = v_sale.id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_payment_method_corrected',
    'sale_payment',
    p_sale_payment_id,
    v_sale.branch_id,
    jsonb_build_object(
      'sale_id', v_sale.id,
      'previous_payment_method', v_payment.payment_method,
      'new_payment_method', p_payment_method,
      'previous_payment_device_id', v_payment.payment_device_id,
      'new_payment_device_id', p_payment_device_id,
      'reason', v_reason
    ),
    auth.uid()
  );

  return query
  select v_sale.id, p_sale_payment_id, v_payment.payment_method, p_payment_method;
end;
$$;

grant select on public.v_sales_admin to authenticated;
grant select on public.v_sales_admin to service_role;
grant select on public.v_sale_detail_admin to authenticated;
grant select on public.v_sale_detail_admin to service_role;
grant execute on function public.rpc_get_cash_session_payment_breakdown(uuid, uuid) to authenticated;
grant execute on function public.rpc_get_cash_session_payment_breakdown(uuid, uuid) to service_role;
grant execute on function public.rpc_correct_sale_payment_method(uuid, uuid, public.payment_method, uuid, text) to authenticated;
grant execute on function public.rpc_correct_sale_payment_method(uuid, uuid, public.payment_method, uuid, text) to service_role;
