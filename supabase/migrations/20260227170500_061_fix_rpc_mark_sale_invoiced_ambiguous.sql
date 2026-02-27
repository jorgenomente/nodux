-- Fix ambiguous column reference in rpc_mark_sale_invoiced.

create or replace function public.rpc_mark_sale_invoiced(
  p_org_id uuid,
  p_sale_id uuid,
  p_source text default 'manual'
)
returns table (
  sale_id uuid,
  is_invoiced boolean,
  invoiced_at timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_sale public.sales%rowtype;
  v_pos_enabled boolean := false;
  v_source text := nullif(trim(coalesce(p_source, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
    and org_id = p_org_id;

  if v_sale.id is null then
    raise exception 'sale not found';
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
        and bm.branch_id = v_sale.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (
        select sma.is_enabled
        from public.staff_module_access sma
        where sma.org_id = p_org_id
          and sma.branch_id = v_sale.branch_id
          and sma.role = 'staff'
          and sma.module_key = 'pos'
        limit 1
      ),
      (
        select sma.is_enabled
        from public.staff_module_access sma
        where sma.org_id = p_org_id
          and sma.branch_id is null
          and sma.role = 'staff'
          and sma.module_key = 'pos'
        limit 1
      ),
      false
    )
    into v_pos_enabled;

    if not v_pos_enabled then
      raise exception 'pos module disabled';
    end if;
  end if;

  update public.sales s
  set
    is_invoiced = true,
    invoiced_at = coalesce(s.invoiced_at, now())
  where s.id = p_sale_id
    and s.org_id = p_org_id;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_marked_invoiced',
    'sale',
    p_sale_id,
    v_sale.branch_id,
    jsonb_build_object(
      'source', coalesce(v_source, 'manual'),
      'invoiced_at', v_sale.invoiced_at
    ),
    null
  );

  return query
  select v_sale.id, v_sale.is_invoiced, v_sale.invoiced_at;
end;
$$;
