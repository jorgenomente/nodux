-- Fix RLS helper functions recursion by bypassing RLS inside helpers

create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
  );
$$;

create or replace function public.is_org_admin(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
      and ou.role = 'org_admin'
  );
$$;

-- Ensure authenticated can execute helpers if needed
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
