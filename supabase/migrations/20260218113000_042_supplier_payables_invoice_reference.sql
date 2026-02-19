-- Add invoice/remito reference field to supplier payables and expose it in RPC/view.

alter table public.supplier_payables
  add column if not exists invoice_reference text;

create or replace function public.rpc_update_supplier_payable(
  p_org_id uuid,
  p_payable_id uuid,
  p_invoice_amount numeric default null,
  p_due_on date default null,
  p_invoice_reference text default null,
  p_invoice_photo_url text default null,
  p_invoice_note text default null,
  p_selected_payment_method public.payment_method default null
)
returns table (
  payable_id uuid,
  status text,
  outstanding_amount numeric
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_payable record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_invoice_amount is not null and p_invoice_amount < 0 then
    raise exception 'invoice amount must be >= 0';
  end if;

  if p_selected_payment_method is not null
    and p_selected_payment_method not in ('cash', 'transfer') then
    raise exception 'invalid selected payment method';
  end if;

  update public.supplier_payables
  set
    invoice_amount = p_invoice_amount,
    due_on = p_due_on,
    invoice_reference = nullif(trim(coalesce(p_invoice_reference, '')), ''),
    invoice_photo_url = nullif(trim(coalesce(p_invoice_photo_url, '')), ''),
    invoice_note = nullif(trim(coalesce(p_invoice_note, '')), ''),
    selected_payment_method = p_selected_payment_method,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payable_id
    and org_id = p_org_id
  returning * into v_payable;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  perform public.fn_recompute_supplier_payable(p_payable_id, auth.uid());

  select * into v_payable
  from public.supplier_payables
  where id = p_payable_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payable_updated',
    'supplier_payable',
    p_payable_id,
    v_payable.branch_id,
    jsonb_build_object(
      'invoice_amount', v_payable.invoice_amount,
      'due_on', v_payable.due_on,
      'invoice_reference', v_payable.invoice_reference,
      'invoice_photo_url', v_payable.invoice_photo_url,
      'selected_payment_method', v_payable.selected_payment_method,
      'status', v_payable.status,
      'outstanding_amount', v_payable.outstanding_amount
    ),
    auth.uid()
  );

  return query
  select v_payable.id, v_payable.status, v_payable.outstanding_amount;
end;
$$;

drop view if exists public.v_supplier_payables_admin;

create view public.v_supplier_payables_admin as
select
  sp.id as payable_id,
  sp.org_id,
  sp.branch_id,
  b.name as branch_name,
  sp.supplier_id,
  s.name as supplier_name,
  sp.order_id,
  so.status as order_status,
  sp.status as payable_status,
  case
    when sp.status <> 'paid'
      and sp.due_on is not null
      and sp.due_on < current_date
    then 'overdue'
    else sp.status
  end as payment_state,
  sp.estimated_amount,
  sp.invoice_amount,
  sp.paid_amount,
  sp.outstanding_amount,
  sp.due_on,
  case
    when sp.due_on is null then null
    else (sp.due_on - current_date)
  end as due_in_days,
  (
    sp.status <> 'paid'
    and sp.due_on is not null
    and sp.due_on < current_date
  ) as is_overdue,
  sp.payment_terms_days_snapshot,
  sp.preferred_payment_method,
  sp.selected_payment_method,
  sp.invoice_reference,
  sp.invoice_photo_url,
  sp.invoice_note,
  sp.paid_at,
  sp.created_at,
  sp.updated_at
from public.supplier_payables sp
join public.supplier_orders so
  on so.id = sp.order_id
 and so.org_id = sp.org_id
join public.suppliers s
  on s.id = sp.supplier_id
 and s.org_id = sp.org_id
join public.branches b
  on b.id = sp.branch_id
 and b.org_id = sp.org_id;

grant execute on function public.rpc_update_supplier_payable(
  uuid,
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  public.payment_method
) to authenticated;
