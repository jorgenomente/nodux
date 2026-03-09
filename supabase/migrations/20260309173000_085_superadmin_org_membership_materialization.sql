-- Materialize all platform admins as org_admin members in every org.
-- This avoids auth-context drift in RPCs that still rely on org_users checks.

create or replace function public.fn_sync_platform_admin_memberships_for_org(
  p_org_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.org_users (
    org_id,
    user_id,
    role,
    display_name,
    is_active
  )
  select
    p_org_id,
    pa.user_id,
    'org_admin'::public.user_role,
    coalesce(
      nullif(trim(ou.display_name), ''),
      nullif(trim((au.raw_user_meta_data ->> 'display_name')), ''),
      nullif(trim((au.raw_user_meta_data ->> 'full_name')), ''),
      nullif(trim(split_part(coalesce(au.email, ''), '@', 1)), '')
    ),
    true
  from public.platform_admins pa
  left join public.org_users ou
    on ou.org_id = p_org_id
   and ou.user_id = pa.user_id
  left join auth.users au
    on au.id = pa.user_id
  on conflict on constraint org_users_org_id_user_id_key
  do update set
    role = 'org_admin',
    is_active = true,
    display_name = coalesce(public.org_users.display_name, excluded.display_name),
    updated_at = now();
end;
$$;

grant execute on function public.fn_sync_platform_admin_memberships_for_org(uuid) to authenticated;
grant execute on function public.fn_sync_platform_admin_memberships_for_org(uuid) to service_role;

create or replace function public.trg_orgs_sync_platform_admin_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  perform public.fn_sync_platform_admin_memberships_for_org(new.id);
  return new;
end;
$$;

drop trigger if exists trg_orgs_sync_platform_admin_memberships on public.orgs;
create trigger trg_orgs_sync_platform_admin_memberships
after insert on public.orgs
for each row
execute function public.trg_orgs_sync_platform_admin_memberships();

-- Backfill existing orgs so current platform admins are also materialized in org_users.
do $$
declare
  v_org record;
begin
  for v_org in
    select o.id
    from public.orgs o
  loop
    perform public.fn_sync_platform_admin_memberships_for_org(v_org.id);
  end loop;
end;
$$;
