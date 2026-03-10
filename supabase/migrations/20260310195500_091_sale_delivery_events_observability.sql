create table if not exists public.sale_delivery_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  sale_delivery_link_id uuid references public.sale_delivery_links(id) on delete set null,
  document_kind public.sale_delivery_document_kind not null,
  event_kind text not null,
  channel text,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sale_delivery_events_event_kind_ck
    check (event_kind in ('shared', 'revoked', 'regenerated', 'opened')),
  constraint sale_delivery_events_channel_ck
    check (channel is null or channel in ('whatsapp', 'public_link'))
);

create index if not exists sale_delivery_events_sale_created_at_idx
  on public.sale_delivery_events (sale_id, created_at desc);

create index if not exists sale_delivery_events_org_kind_created_at_idx
  on public.sale_delivery_events (org_id, document_kind, event_kind, created_at desc);

alter table public.sale_delivery_events enable row level security;

drop policy if exists sale_delivery_events_select on public.sale_delivery_events;
create policy sale_delivery_events_select
on public.sale_delivery_events
for select
using (public.is_org_member(org_id));

drop policy if exists sale_delivery_events_write on public.sale_delivery_events;
create policy sale_delivery_events_write
on public.sale_delivery_events
for insert
with check (public.is_org_member(org_id));

drop function if exists public.rpc_append_sale_delivery_event(
  uuid,
  public.sale_delivery_document_kind,
  text,
  text,
  jsonb
);

create or replace function public.rpc_append_sale_delivery_event(
  p_sale_id uuid,
  p_document_kind public.sale_delivery_document_kind,
  p_event_kind text,
  p_channel text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org_id uuid;
  v_link_id uuid;
  v_event_id uuid;
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

  if p_event_kind not in ('shared', 'revoked', 'regenerated', 'opened') then
    raise exception 'invalid_event_kind'
      using errcode = 'P0001';
  end if;

  if p_channel is not null and p_channel not in ('whatsapp', 'public_link') then
    raise exception 'invalid_channel'
      using errcode = 'P0001';
  end if;

  select sdl.id
    into v_link_id
  from public.sale_delivery_links sdl
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
  order by sdl.created_at desc, sdl.id desc
  limit 1;

  insert into public.sale_delivery_events (
    org_id,
    sale_id,
    sale_delivery_link_id,
    document_kind,
    event_kind,
    channel,
    actor_user_id,
    metadata
  )
  values (
    v_org_id,
    p_sale_id,
    v_link_id,
    p_document_kind,
    p_event_kind,
    p_channel,
    auth.uid(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id
    into v_event_id;

  return v_event_id;
end;
$$;

drop function if exists public.rpc_list_sale_delivery_events(uuid, int);

create or replace function public.rpc_list_sale_delivery_events(
  p_sale_id uuid,
  p_limit int default 20
)
returns table (
  sale_delivery_event_id uuid,
  sale_delivery_link_id uuid,
  sale_id uuid,
  document_kind public.sale_delivery_document_kind,
  event_kind text,
  channel text,
  actor_user_id uuid,
  actor_display_name text,
  metadata jsonb,
  created_at timestamptz
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

  return query
  select
    sde.id,
    sde.sale_delivery_link_id,
    sde.sale_id,
    sde.document_kind,
    sde.event_kind,
    sde.channel,
    sde.actor_user_id,
    coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as actor_display_name,
    sde.metadata,
    sde.created_at
  from public.sale_delivery_events sde
  left join public.org_users ou
    on ou.org_id = sde.org_id
   and ou.user_id = sde.actor_user_id
  where sde.sale_id = p_sale_id
  order by sde.created_at desc, sde.id desc
  limit greatest(coalesce(p_limit, 20), 1);
end;
$$;

grant select on public.sale_delivery_events to authenticated;
grant select on public.sale_delivery_events to service_role;

grant execute on function public.rpc_append_sale_delivery_event(
  uuid,
  public.sale_delivery_document_kind,
  text,
  text,
  jsonb
) to authenticated;
grant execute on function public.rpc_append_sale_delivery_event(
  uuid,
  public.sale_delivery_document_kind,
  text,
  text,
  jsonb
) to service_role;

grant execute on function public.rpc_list_sale_delivery_events(uuid, int) to authenticated;
grant execute on function public.rpc_list_sale_delivery_events(uuid, int) to service_role;

comment on table public.sale_delivery_events is
'Historial operativo de compartidos y aperturas de links de ticket/factura por venta.';

comment on function public.rpc_append_sale_delivery_event(uuid, public.sale_delivery_document_kind, text, text, jsonb) is
'Registra un evento operativo de delivery para ticket/factura de una venta.';

comment on function public.rpc_list_sale_delivery_events(uuid, int) is
'Devuelve historial reciente de eventos de delivery de ticket/factura para una venta.';
