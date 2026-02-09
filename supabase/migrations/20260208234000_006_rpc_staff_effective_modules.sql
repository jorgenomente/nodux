-- Staff effective modules resolver (security definer)

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
  module_keys as (
    select sma.org_id, sma.branch_id, sma.module_key, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
  ),
  resolved as (
    select
      m.org_id,
      m.branch_id,
      mk.module_key,
      case
        when bo.module_key is not null then bo.is_enabled
        when od.module_key is not null then od.is_enabled
        else false
      end as is_enabled,
      case
        when bo.module_key is not null then 'branch_override'
        when od.module_key is not null then 'org_default'
        else 'none'
      end as source_scope
    from memberships m
    join (
      select distinct org_id, module_key
      from module_keys
    ) mk on mk.org_id = m.org_id
    left join module_keys od
      on od.org_id = m.org_id
      and od.branch_id is null
      and od.module_key = mk.module_key
    left join module_keys bo
      on bo.org_id = m.org_id
      and bo.branch_id = m.branch_id
      and bo.module_key = mk.module_key
  )
  select * from resolved;
$$;

grant execute on function public.rpc_get_staff_effective_modules() to authenticated;
