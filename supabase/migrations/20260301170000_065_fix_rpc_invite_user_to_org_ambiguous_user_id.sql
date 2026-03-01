-- Hotfix: avoid ambiguity between OUT param `user_id` and table columns
-- in rpc_invite_user_to_org.

create or replace function public.rpc_invite_user_to_org(
  p_org_id uuid,
  p_email text,
  p_role public.user_role,
  p_branch_ids uuid[]
)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user_id uuid;
  v_branch_id uuid;
  v_invalid_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_role not in ('org_admin', 'staff') then
    raise exception 'invalid role %', p_role;
  end if;

  if p_role = 'staff' and coalesce(array_length(p_branch_ids, 1), 0) = 0 then
    raise exception 'staff requires at least one branch';
  end if;

  if p_role = 'staff' then
    select branch_id
    into v_invalid_branch_id
    from unnest(p_branch_ids) as branch_id
    left join public.branches b on b.id = branch_id
    where b.id is null
       or b.org_id <> p_org_id
       or b.is_active is false
    limit 1;

    if v_invalid_branch_id is not null then
      raise exception 'invalid branch % for org %', v_invalid_branch_id, p_org_id;
    end if;
  end if;

  select au.id
  into v_user_id
  from auth.users au
  where lower(au.email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    raise exception 'user not found for email %', p_email;
  end if;

  insert into public.org_users (org_id, user_id, role, is_active)
  values (p_org_id, v_user_id, p_role, true)
  on conflict (org_id, user_id) do update
    set role = excluded.role,
        is_active = true;

  delete from public.branch_memberships bm
  where bm.org_id = p_org_id
    and bm.user_id = v_user_id;

  if p_role = 'staff' then
    foreach v_branch_id in array p_branch_ids loop
      insert into public.branch_memberships (org_id, branch_id, user_id, is_active)
      values (p_org_id, v_branch_id, v_user_id, true)
      on conflict (org_id, branch_id, user_id) do update
        set is_active = true;
    end loop;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'user_invited',
    'org_user',
    v_user_id,
    null,
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'branch_ids', coalesce(p_branch_ids, array[]::uuid[])
    ),
    auth.uid()
  );

  return query select v_user_id;
end;
$$;
