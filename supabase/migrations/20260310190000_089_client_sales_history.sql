create or replace function public.rpc_get_client_sales_history(
  p_org_id uuid,
  p_client_id uuid,
  p_branch_id uuid default null,
  p_limit int default 10
)
returns table (
  sale_id uuid,
  branch_id uuid,
  branch_name text,
  created_at timestamptz,
  payment_method_summary public.payment_method,
  total_amount numeric,
  is_invoiced boolean,
  invoiced_at timestamptz,
  client_phone text,
  invoice_result_status text,
  invoice_render_status text,
  invoice_ready boolean
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_clients_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.org_id = p_org_id
      and c.id = p_client_id
  ) then
    raise exception 'client not found';
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

    select exists (
      select 1
      from public.rpc_get_staff_effective_modules() m
      where m.module_key = 'clients'
        and m.is_enabled = true
    )
    into v_clients_enabled;

    if not v_clients_enabled then
      raise exception 'clients module disabled';
    end if;
  end if;

  return query
  select
    s.id as sale_id,
    s.branch_id,
    b.name as branch_name,
    s.created_at,
    s.payment_method as payment_method_summary,
    s.total_amount,
    s.is_invoiced,
    s.invoiced_at,
    c.phone as client_phone,
    inv.result_status as invoice_result_status,
    inv.render_status as invoice_render_status,
    coalesce(
      inv.result_status = 'authorized'
      and inv.render_status = 'completed',
      false
    ) as invoice_ready
  from public.sales s
  join public.branches b
    on b.org_id = s.org_id
   and b.id = s.branch_id
  join public.clients c
    on c.org_id = s.org_id
   and c.id = s.client_id
  left join public.v_sale_fiscal_invoice_admin inv
    on inv.org_id = s.org_id
   and inv.sale_id = s.id
  where s.org_id = p_org_id
    and s.client_id = p_client_id
    and (p_branch_id is null or s.branch_id = p_branch_id)
    and (
      public.is_org_admin_or_superadmin(p_org_id)
      or exists (
        select 1
        from public.branch_memberships bm
        where bm.org_id = s.org_id
          and bm.branch_id = s.branch_id
          and bm.user_id = auth.uid()
          and bm.is_active = true
      )
    )
  order by s.created_at desc, s.id desc
  limit greatest(coalesce(p_limit, 10), 1);
end;
$$;

grant execute on function public.rpc_get_client_sales_history(uuid, uuid, uuid, int) to authenticated;
grant execute on function public.rpc_get_client_sales_history(uuid, uuid, uuid, int) to service_role;

comment on function public.rpc_get_client_sales_history(uuid, uuid, uuid, int) is
'Historial reciente de ventas de un cliente para /clients, con control explícito de módulo clients y branch membership para staff.';
