-- Extend staff full-access semantics to all modules listed in staff-permissions UI.

create or replace function public.rpc_get_staff_effective_modules()
returns table (
  org_id uuid,
  branch_id uuid,
  module_key text,
  is_enabled boolean,
  source_scope text
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with memberships as (
    select bm.org_id, bm.branch_id
    from public.branch_memberships bm
    where bm.user_id = auth.uid()
      and bm.is_active = true
  ),
  supported_modules as (
    select module_key
    from (
      values
        ('dashboard'::text),
        ('pos'::text),
        ('sales'::text),
        ('sales_statistics'::text),
        ('cashbox'::text),
        ('products'::text),
        ('products_lookup'::text),
        ('suppliers'::text),
        ('orders'::text),
        ('orders_calendar'::text),
        ('payments'::text),
        ('clients'::text),
        ('expirations'::text),
        ('onboarding'::text),
        ('online_orders'::text),
        ('settings'::text)
    ) as m(module_key)
  ),
  org_default as (
    select sma.org_id, sma.module_key, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
      and sma.branch_id is null
      and sma.module_key in (select module_key from supported_modules)
  ),
  branch_override as (
    select sma.org_id, sma.branch_id, sma.module_key, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
      and sma.branch_id is not null
      and sma.module_key in (select module_key from supported_modules)
  ),
  full_access_org as (
    select sma.org_id, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
      and sma.branch_id is null
      and sma.module_key = '__full_access__'
  ),
  full_access_branch as (
    select sma.org_id, sma.branch_id, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
      and sma.branch_id is not null
      and sma.module_key = '__full_access__'
  )
  select
    m.org_id,
    m.branch_id,
    sm.module_key,
    case
      when bo.module_key is not null then bo.is_enabled
      when od.module_key is not null then od.is_enabled
      when fab.branch_id is not null then fab.is_enabled
      when fao.org_id is not null then fao.is_enabled
      else false
    end as is_enabled,
    case
      when bo.module_key is not null then 'branch_override'
      when od.module_key is not null then 'org_default'
      when fab.branch_id is not null then 'branch_full_access'
      when fao.org_id is not null then 'org_full_access'
      else 'none'
    end as source_scope
  from memberships m
  cross join supported_modules sm
  left join org_default od
    on od.org_id = m.org_id
    and od.module_key = sm.module_key
  left join branch_override bo
    on bo.org_id = m.org_id
    and bo.branch_id = m.branch_id
    and bo.module_key = sm.module_key
  left join full_access_org fao
    on fao.org_id = m.org_id
  left join full_access_branch fab
    on fab.org_id = m.org_id
    and fab.branch_id = m.branch_id;
$$;

grant execute on function public.rpc_get_staff_effective_modules() to authenticated;
