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

  if p_payment_method in ('card', 'debit', 'credit') then
    if p_payment_device_id is null then
      raise exception 'payment_device_id required for debit/credit';
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
  elsif p_payment_method = 'mercadopago' then
    if p_payment_device_id is not null and not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = v_sale.branch_id
    ) then
      raise exception 'invalid payment device';
    end if;
  elsif p_payment_device_id is not null then
    raise exception 'payment_device_id only allowed for debit/credit and mercadopago';
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

grant execute on function public.rpc_correct_sale_payment_method(uuid, uuid, public.payment_method, uuid, text) to authenticated;
grant execute on function public.rpc_correct_sale_payment_method(uuid, uuid, public.payment_method, uuid, text) to service_role;
