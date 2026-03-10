alter table public.sale_delivery_links
add column if not exists last_shared_at timestamptz,
add column if not exists last_shared_channel text,
add column if not exists share_count integer not null default 0;

alter table public.sale_delivery_links
drop constraint if exists sale_delivery_links_last_shared_channel_ck;

alter table public.sale_delivery_links
add constraint sale_delivery_links_last_shared_channel_ck
check (
  last_shared_channel is null
  or last_shared_channel in ('whatsapp')
);

alter table public.sale_delivery_links
drop constraint if exists sale_delivery_links_share_count_non_negative_ck;

alter table public.sale_delivery_links
add constraint sale_delivery_links_share_count_non_negative_ck
check (share_count >= 0);

drop function if exists public.rpc_list_sale_delivery_links(uuid);

create or replace function public.rpc_list_sale_delivery_links(
  p_sale_id uuid
)
returns table (
  sale_delivery_link_id uuid,
  sale_id uuid,
  document_kind public.sale_delivery_document_kind,
  token text,
  status public.sale_delivery_link_status,
  created_at timestamptz,
  expires_at timestamptz,
  last_shared_at timestamptz,
  last_shared_channel text,
  share_count integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set status = 'expired'
  where sdl.sale_id = p_sale_id
    and sdl.status = 'active'
    and sdl.expires_at is not null
    and sdl.expires_at <= now();

  return query
  with ranked_links as (
    select
      sdl.*,
      row_number() over (
        partition by sdl.document_kind
        order by sdl.created_at desc, sdl.id desc
      ) as row_rank
    from public.sale_delivery_links sdl
    where sdl.sale_id = p_sale_id
  )
  select
    rl.id,
    rl.sale_id,
    rl.document_kind,
    rl.token,
    rl.status,
    rl.created_at,
    rl.expires_at,
    rl.last_shared_at,
    rl.last_shared_channel,
    rl.share_count
  from ranked_links rl
  where rl.row_rank = 1
  order by rl.document_kind;
end;
$$;

drop function if exists public.rpc_revoke_sale_delivery_link(
  uuid,
  public.sale_delivery_document_kind
);

create or replace function public.rpc_revoke_sale_delivery_link(
  p_sale_id uuid,
  p_document_kind public.sale_delivery_document_kind
)
returns integer
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
  v_revoked_count integer := 0;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set status = 'revoked'
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now());

  get diagnostics v_revoked_count = row_count;

  return v_revoked_count;
end;
$$;

drop function if exists public.rpc_regenerate_sale_delivery_link(
  uuid,
  public.sale_delivery_document_kind,
  timestamptz
);

create or replace function public.rpc_regenerate_sale_delivery_link(
  p_sale_id uuid,
  p_document_kind public.sale_delivery_document_kind default 'sale_ticket',
  p_expires_at timestamptz default null
)
returns table (
  sale_delivery_link_id uuid,
  sale_id uuid,
  document_kind public.sale_delivery_document_kind,
  token text,
  status public.sale_delivery_link_status,
  expires_at timestamptz,
  created_at timestamptz,
  last_shared_at timestamptz,
  last_shared_channel text,
  share_count integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
  v_actor_user_id uuid := auth.uid();
  v_link public.sale_delivery_links%rowtype;
  v_token text;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  if p_document_kind = 'sale_invoice' and not exists (
    select 1
    from public.invoices fi
    join public.invoice_jobs ij
      on ij.id = fi.invoice_job_id
    where fi.sale_id = p_sale_id
      and fi.tenant_id = v_org_id
      and fi.result_status = 'authorized'
      and ij.job_status = 'completed'
  ) then
    raise exception 'invoice_not_ready'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set status = case
    when sdl.expires_at is not null and sdl.expires_at <= now() then 'expired'::public.sale_delivery_link_status
    else 'revoked'::public.sale_delivery_link_status
  end
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active';

  v_token := replace(gen_random_uuid()::text, '-', '');

  insert into public.sale_delivery_links (
    org_id,
    sale_id,
    document_kind,
    token,
    status,
    created_by_user_id,
    expires_at
  )
  values (
    v_org_id,
    p_sale_id,
    p_document_kind,
    v_token,
    'active',
    v_actor_user_id,
    p_expires_at
  )
  returning *
    into v_link;

  return query
  select
    v_link.id,
    v_link.sale_id,
    v_link.document_kind,
    v_link.token,
    v_link.status,
    v_link.expires_at,
    v_link.created_at,
    v_link.last_shared_at,
    v_link.last_shared_channel,
    v_link.share_count;
end;
$$;

drop function if exists public.rpc_mark_sale_delivery_link_shared(
  uuid,
  public.sale_delivery_document_kind,
  text
);

create or replace function public.rpc_mark_sale_delivery_link_shared(
  p_sale_id uuid,
  p_document_kind public.sale_delivery_document_kind,
  p_channel text default 'whatsapp'
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  if p_channel not in ('whatsapp') then
    raise exception 'invalid_channel'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set last_shared_at = now(),
      last_shared_channel = p_channel,
      share_count = sdl.share_count + 1
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now());
end;
$$;

grant execute on function public.rpc_list_sale_delivery_links(uuid) to authenticated;
grant execute on function public.rpc_list_sale_delivery_links(uuid) to service_role;

grant execute on function public.rpc_revoke_sale_delivery_link(
  uuid,
  public.sale_delivery_document_kind
) to authenticated;
grant execute on function public.rpc_revoke_sale_delivery_link(
  uuid,
  public.sale_delivery_document_kind
) to service_role;

grant execute on function public.rpc_regenerate_sale_delivery_link(
  uuid,
  public.sale_delivery_document_kind,
  timestamptz
) to authenticated;
grant execute on function public.rpc_regenerate_sale_delivery_link(
  uuid,
  public.sale_delivery_document_kind,
  timestamptz
) to service_role;

grant execute on function public.rpc_mark_sale_delivery_link_shared(
  uuid,
  public.sale_delivery_document_kind,
  text
) to authenticated;
grant execute on function public.rpc_mark_sale_delivery_link_shared(
  uuid,
  public.sale_delivery_document_kind,
  text
) to service_role;

comment on function public.rpc_list_sale_delivery_links(uuid) is
'Devuelve el último estado conocido por documento compartible de una venta para gestión operativa en UI.';

comment on function public.rpc_revoke_sale_delivery_link(uuid, public.sale_delivery_document_kind) is
'Revoca el link activo vigente de ticket o factura para una venta.';

comment on function public.rpc_regenerate_sale_delivery_link(uuid, public.sale_delivery_document_kind, timestamptz) is
'Revoca cualquier link activo vigente y crea un nuevo token compartible para ticket o factura.';

comment on function public.rpc_mark_sale_delivery_link_shared(uuid, public.sale_delivery_document_kind, text) is
'Registra metadata mínima del último compartido asistido por canal sobre el link activo de ticket o factura.';
