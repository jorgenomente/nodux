-- Allow platform admins to append audit events for cross-org superadmin actions.

create or replace function public.rpc_log_audit_event(
  p_org_id uuid,
  p_action_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_branch_id uuid,
  p_metadata jsonb,
  p_actor_user_id uuid default null
)
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

  if not (public.is_org_member(p_org_id) or public.is_platform_admin()) then
    raise exception 'not authorized';
  end if;

  insert into public.audit_log (
    org_id,
    actor_user_id,
    branch_id,
    action_key,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_org_id,
    coalesce(p_actor_user_id, auth.uid()),
    p_branch_id,
    p_action_key,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
end;
$$;

grant execute on function public.rpc_log_audit_event(uuid, text, text, uuid, uuid, jsonb, uuid) to authenticated;
