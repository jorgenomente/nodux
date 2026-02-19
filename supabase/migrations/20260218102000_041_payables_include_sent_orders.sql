-- Include sent supplier orders in payable sync and backfill historical rows.

create or replace function public.fn_sync_supplier_payable_from_order(
  p_org_id uuid,
  p_order_id uuid,
  p_actor_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_order record;
  v_estimated_amount numeric(12,2) := 0;
  v_due_on date := null;
  v_payable_id uuid;
begin
  select so.id,
         so.org_id,
         so.branch_id,
         so.supplier_id,
         so.status,
         so.sent_at,
         so.received_at,
         so.reconciled_at,
         s.payment_terms_days,
         s.preferred_payment_method
    into v_order
  from public.supplier_orders so
  join public.suppliers s
    on s.id = so.supplier_id
   and s.org_id = so.org_id
  where so.id = p_order_id
    and so.org_id = p_org_id;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status not in ('sent', 'received', 'reconciled') then
    return null;
  end if;

  select coalesce(
    sum(
      soi.ordered_qty * coalesce(nullif(soi.unit_cost, 0), p.unit_price, 0)
    ),
    0
  ) into v_estimated_amount
  from public.supplier_order_items soi
  left join public.products p
    on p.id = soi.product_id
   and p.org_id = soi.org_id
  where soi.org_id = p_org_id
    and soi.order_id = p_order_id;

  if v_order.payment_terms_days is not null then
    v_due_on := (
      coalesce(
        v_order.reconciled_at,
        v_order.received_at,
        v_order.sent_at,
        now()
      )::date
      + v_order.payment_terms_days
    );
  end if;

  insert into public.supplier_payables (
    org_id,
    branch_id,
    supplier_id,
    order_id,
    status,
    estimated_amount,
    invoice_amount,
    paid_amount,
    outstanding_amount,
    due_on,
    payment_terms_days_snapshot,
    preferred_payment_method,
    selected_payment_method,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    p_org_id,
    v_order.branch_id,
    v_order.supplier_id,
    p_order_id,
    'pending',
    round(v_estimated_amount, 2),
    null,
    0,
    round(v_estimated_amount, 2),
    v_due_on,
    v_order.payment_terms_days,
    v_order.preferred_payment_method,
    null,
    p_actor_user_id,
    p_actor_user_id,
    now(),
    now()
  )
  on conflict (order_id) do update set
    branch_id = excluded.branch_id,
    supplier_id = excluded.supplier_id,
    estimated_amount = excluded.estimated_amount,
    due_on = coalesce(public.supplier_payables.due_on, excluded.due_on),
    payment_terms_days_snapshot = excluded.payment_terms_days_snapshot,
    preferred_payment_method = excluded.preferred_payment_method,
    updated_by = p_actor_user_id,
    updated_at = now()
  returning id into v_payable_id;

  perform public.fn_recompute_supplier_payable(v_payable_id, p_actor_user_id);

  return v_payable_id;
end;
$$;

create or replace function public.trg_sync_supplier_payable_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.status in ('sent', 'received', 'reconciled') then
    perform public.fn_sync_supplier_payable_from_order(
      new.org_id,
      new.id,
      coalesce(new.created_by, auth.uid())
    );
  end if;

  return new;
end;
$$;

do $$
declare
  v_order record;
begin
  for v_order in
    select so.id, so.org_id
    from public.supplier_orders so
    where so.status in ('sent', 'received', 'reconciled')
  loop
    perform public.fn_sync_supplier_payable_from_order(
      v_order.org_id,
      v_order.id,
      null
    );
  end loop;
end $$;
