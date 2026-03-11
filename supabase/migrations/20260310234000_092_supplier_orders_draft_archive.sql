alter table public.supplier_orders
  add column if not exists is_archived boolean not null default false;

create index if not exists supplier_orders_org_branch_archived_idx
  on public.supplier_orders (org_id, branch_id, is_archived, created_at desc);

create or replace view public.v_orders_admin as
select
  so.id as order_id,
  so.org_id,
  so.branch_id,
  b.name as branch_name,
  so.supplier_id,
  s.name as supplier_name,
  so.status,
  so.created_at,
  so.sent_at,
  so.received_at,
  so.reconciled_at,
  so.expected_receive_on,
  coalesce(items.items_count, 0::bigint) as items_count,
  sp.id as payable_id,
  sp.status as payable_status,
  case
    when sp.id is null then 'not_created'::text
    when sp.status <> 'paid'::text and sp.due_on is not null and sp.due_on < current_date then 'overdue'::text
    else sp.status
  end as payment_state,
  sp.due_on as payable_due_on,
  sp.outstanding_amount as payable_outstanding_amount,
  so.is_archived
from public.supplier_orders so
left join public.suppliers s
  on s.id = so.supplier_id
 and s.org_id = so.org_id
left join public.branches b
  on b.id = so.branch_id
 and b.org_id = so.org_id
left join (
  select supplier_order_items.order_id, count(*) as items_count
  from public.supplier_order_items
  group by supplier_order_items.order_id
) items on items.order_id = so.id
left join public.supplier_payables sp
  on sp.order_id = so.id
 and sp.org_id = so.org_id;

create or replace function public.rpc_set_supplier_order_status(
  p_org_id uuid,
  p_order_id uuid,
  p_status public.supplier_order_status
)
returns void
language plpgsql
as $$
begin
  if p_status = 'sent' then
    update public.supplier_orders
      set status = p_status,
          is_archived = false,
          sent_at = now()
    where id = p_order_id and org_id = p_org_id;
  elsif p_status = 'reconciled' then
    update public.supplier_orders
      set status = p_status,
          is_archived = false,
          reconciled_at = now()
    where id = p_order_id and org_id = p_org_id;
  else
    update public.supplier_orders
      set status = p_status,
          is_archived = case when p_status = 'draft' then is_archived else false end
    where id = p_order_id and org_id = p_org_id;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_status_set',
    'supplier_order',
    p_order_id,
    null,
    jsonb_build_object('status', p_status),
    null
  );
end;
$$;

grant all on function public.rpc_set_supplier_order_status(uuid, uuid, public.supplier_order_status)
to anon, authenticated, service_role;

create or replace function public.rpc_set_supplier_order_archived(
  p_org_id uuid,
  p_order_id uuid,
  p_is_archived boolean
)
returns void
language plpgsql
as $$
declare
  v_order record;
  v_next_is_archived boolean := coalesce(p_is_archived, false);
begin
  select id, branch_id, status, is_archived
    into v_order
  from public.supplier_orders
  where id = p_order_id
    and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'only draft orders can be archived';
  end if;

  if v_order.is_archived = v_next_is_archived then
    return;
  end if;

  update public.supplier_orders
    set is_archived = v_next_is_archived
  where id = p_order_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    case
      when v_next_is_archived then 'supplier_order_archived'
      else 'supplier_order_restored'
    end,
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object(
      'status', v_order.status,
      'previous_is_archived', v_order.is_archived,
      'next_is_archived', v_next_is_archived
    ),
    null
  );
end;
$$;

grant all on function public.rpc_set_supplier_order_archived(uuid, uuid, boolean)
to anon, authenticated, service_role;
