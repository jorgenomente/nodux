-- Superadmin platform foundation: global admins, org management and active org context.

-- Platform admins (global scope outside org membership)
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists platform_admins_select on public.platform_admins;
create policy platform_admins_select
on public.platform_admins
for select
using (public.is_platform_admin());

drop policy if exists platform_admins_write on public.platform_admins;
create policy platform_admins_write
on public.platform_admins
for insert
with check (public.is_platform_admin());

drop policy if exists platform_admins_update on public.platform_admins;
create policy platform_admins_update
on public.platform_admins
for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists platform_admins_delete on public.platform_admins;
create policy platform_admins_delete
on public.platform_admins
for delete
using (public.is_platform_admin());

create or replace function public.rpc_bootstrap_platform_admin()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.platform_admins where user_id = auth.uid()) then
    return;
  end if;

  if exists (select 1 from public.platform_admins) then
    raise exception 'not authorized';
  end if;

  insert into public.platform_admins (user_id, created_by)
  values (auth.uid(), auth.uid());
end;
$$;

grant execute on function public.rpc_bootstrap_platform_admin() to authenticated;

-- Allow platform admins to read all org metadata.
drop policy if exists orgs_select_platform_admin on public.orgs;
create policy orgs_select_platform_admin
on public.orgs
for select
using (public.is_platform_admin());

drop policy if exists branches_select_platform_admin on public.branches;
create policy branches_select_platform_admin
on public.branches
for select
using (public.is_platform_admin());

drop policy if exists org_users_select_platform_admin on public.org_users;
create policy org_users_select_platform_admin
on public.org_users
for select
using (public.is_platform_admin());

-- Extend helper used by current RPCs/audit reads.
create or replace function public.is_org_admin_or_superadmin(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.is_platform_admin() or exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
      and ou.role in ('org_admin', 'superadmin')
  );
$$;

grant execute on function public.is_org_admin_or_superadmin(uuid) to authenticated;

-- Active org context per user (mainly for platform admins impersonating an org).
create table if not exists public.user_active_orgs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_org_id uuid not null references public.orgs(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.user_active_orgs enable row level security;

drop policy if exists user_active_orgs_select on public.user_active_orgs;
create policy user_active_orgs_select
on public.user_active_orgs
for select
using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists user_active_orgs_write on public.user_active_orgs;
create policy user_active_orgs_write
on public.user_active_orgs
for insert
with check (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists user_active_orgs_update on public.user_active_orgs;
create policy user_active_orgs_update
on public.user_active_orgs
for update
using (user_id = auth.uid() or public.is_platform_admin())
with check (user_id = auth.uid() or public.is_platform_admin());

create or replace function public.rpc_superadmin_set_active_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.orgs where id = p_org_id) then
    raise exception 'org not found';
  end if;

  insert into public.user_active_orgs (user_id, active_org_id, updated_at)
  values (auth.uid(), p_org_id, now())
  on conflict (user_id)
  do update set active_org_id = excluded.active_org_id, updated_at = now();
end;
$$;

grant execute on function public.rpc_superadmin_set_active_org(uuid) to authenticated;

create or replace function public.rpc_get_active_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select case
    when public.is_platform_admin() then (
      select uao.active_org_id
      from public.user_active_orgs uao
      where uao.user_id = auth.uid()
      limit 1
    )
    else (
      select ou.org_id
      from public.org_users ou
      where ou.user_id = auth.uid()
        and ou.is_active = true
      order by ou.updated_at desc nulls last, ou.created_at desc
      limit 1
    )
  end;
$$;

grant execute on function public.rpc_get_active_org_id() to authenticated;

-- Superadmin read models.
create or replace view public.v_superadmin_orgs
with (security_invoker = true) as
select
  o.id as org_id,
  o.name as org_name,
  o.timezone,
  o.is_active,
  o.created_at,
  count(distinct b.id) filter (where b.is_active) as branches_count,
  count(distinct ou.user_id) filter (where ou.is_active) as users_count
from public.orgs o
left join public.branches b on b.org_id = o.id
left join public.org_users ou on ou.org_id = o.id
group by o.id, o.name, o.timezone, o.is_active, o.created_at;

grant select on public.v_superadmin_orgs to authenticated;

create or replace view public.v_superadmin_org_detail
with (security_invoker = true) as
select
  o.id as org_id,
  o.name as org_name,
  o.timezone,
  o.is_active as org_is_active,
  b.id as branch_id,
  b.name as branch_name,
  b.address as branch_address,
  b.is_active as branch_is_active,
  b.created_at as branch_created_at,
  ou.user_id,
  ou.display_name,
  ou.role,
  ou.is_active as user_is_active,
  ou.created_at as user_created_at
from public.orgs o
left join public.branches b on b.org_id = o.id
left join public.org_users ou on ou.org_id = o.id;

grant select on public.v_superadmin_org_detail to authenticated;

-- Superadmin write RPCs.
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
  v_owner_user_id uuid;
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

  insert into public.orgs (name, timezone)
  values (trim(p_org_name), coalesce(nullif(trim(p_timezone), ''), 'UTC'))
  returning id into v_org_id;

  insert into public.branches (org_id, name, address)
  values (v_org_id, trim(p_initial_branch_name), nullif(trim(p_initial_branch_address), ''))
  returning id into v_branch_id;

  insert into public.org_preferences (org_id)
  values (v_org_id)
  on conflict on constraint org_preferences_pkey do nothing;

  v_owner_user_id := p_owner_user_id;

  if v_owner_user_id is not null then
    insert into public.org_users (org_id, user_id, role, display_name, is_active)
    values (
      v_org_id,
      v_owner_user_id,
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
    values (v_org_id, v_branch_id, v_owner_user_id, true)
    on conflict on constraint branch_memberships_org_id_branch_id_user_id_key
    do update set is_active = true;
  end if;

  return query
  select v_org_id, v_branch_id, v_owner_user_id;
end;
$$;

grant execute on function public.rpc_superadmin_create_org(text, text, text, text, uuid, text) to authenticated;

create or replace function public.rpc_superadmin_upsert_branch(
  p_org_id uuid,
  p_branch_id uuid,
  p_name text,
  p_address text default null,
  p_is_active boolean default true
)
returns table(branch_id uuid)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if p_org_id is null then
    raise exception 'org required';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'branch name required';
  end if;

  if p_branch_id is null then
    insert into public.branches (org_id, name, address, is_active)
    values (p_org_id, trim(p_name), nullif(trim(p_address), ''), coalesce(p_is_active, true))
    returning id into v_branch_id;
  else
    update public.branches
    set
      name = trim(p_name),
      address = nullif(trim(p_address), ''),
      is_active = coalesce(p_is_active, is_active),
      updated_at = now()
    where id = p_branch_id
      and org_id = p_org_id
    returning id into v_branch_id;

    if v_branch_id is null then
      raise exception 'branch not found';
    end if;
  end if;

  return query select v_branch_id;
end;
$$;

grant execute on function public.rpc_superadmin_upsert_branch(uuid, uuid, text, text, boolean) to authenticated;
