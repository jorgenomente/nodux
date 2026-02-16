-- Hardening: superadmin org creation must include initial org_admin membership.

create or replace function public.rpc_superadmin_create_org(
  p_org_name text,
  p_timezone text default 'UTC',
  p_initial_branch_name text default 'Casa Central',
  p_initial_branch_address text default null,
  p_owner_user_id uuid default null,
  p_owner_display_name text default null
)
returns table(org_id uuid, branch_id uuid, owner_user_id uuid)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
  v_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_org_name), '') = '' then
    raise exception 'org name required';
  end if;

  if coalesce(trim(p_initial_branch_name), '') = '' then
    raise exception 'initial branch name required';
  end if;

  if p_owner_user_id is null then
    raise exception 'owner user required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_owner_user_id) then
    raise exception 'owner user not found';
  end if;

  insert into public.orgs (name, timezone)
  values (trim(p_org_name), coalesce(nullif(trim(p_timezone), ''), 'UTC'))
  returning id into v_org_id;

  insert into public.branches (org_id, name, address)
  values (v_org_id, trim(p_initial_branch_name), nullif(trim(p_initial_branch_address), ''))
  returning id into v_branch_id;

  insert into public.org_preferences (org_id)
  values (v_org_id)
  on conflict on constraint org_preferences_pkey do nothing;

  insert into public.org_users (org_id, user_id, role, display_name, is_active)
  values (
    v_org_id,
    p_owner_user_id,
    'org_admin',
    nullif(trim(p_owner_display_name), ''),
    true
  )
  on conflict on constraint org_users_org_id_user_id_key
  do update set
    role = 'org_admin',
    is_active = true,
    display_name = coalesce(excluded.display_name, public.org_users.display_name);

  insert into public.branch_memberships (org_id, branch_id, user_id, is_active)
  values (v_org_id, v_branch_id, p_owner_user_id, true)
  on conflict on constraint branch_memberships_org_id_branch_id_user_id_key
  do update set is_active = true;

  return query
  select v_org_id, v_branch_id, p_owner_user_id;
end;
$$;

grant execute on function public.rpc_superadmin_create_org(text, text, text, text, uuid, text) to authenticated;
