create type public.sale_delivery_document_kind as enum (
  'sale_ticket',
  'sale_invoice'
);

create type public.sale_delivery_link_status as enum (
  'active',
  'revoked',
  'expired'
);

create table if not exists public.sale_delivery_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  document_kind public.sale_delivery_document_kind not null,
  token text not null,
  status public.sale_delivery_link_status not null default 'active',
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (token)
);

create unique index if not exists sale_delivery_links_active_by_sale_kind_uq
  on public.sale_delivery_links (sale_id, document_kind)
  where status = 'active';

create index if not exists sale_delivery_links_org_status_created_at_idx
  on public.sale_delivery_links (org_id, status, created_at desc);

alter table public.sale_delivery_links enable row level security;

drop policy if exists sale_delivery_links_select on public.sale_delivery_links;
create policy sale_delivery_links_select
on public.sale_delivery_links
for select
using (public.is_org_member(org_id));

drop policy if exists sale_delivery_links_write on public.sale_delivery_links;
create policy sale_delivery_links_write
on public.sale_delivery_links
for insert
with check (public.is_org_member(org_id));

drop policy if exists sale_delivery_links_update on public.sale_delivery_links;
create policy sale_delivery_links_update
on public.sale_delivery_links
for update
using (public.is_org_member(org_id));

drop function if exists public.rpc_get_or_create_sale_delivery_link(
  uuid,
  public.sale_delivery_document_kind,
  timestamptz
);

create or replace function public.rpc_get_or_create_sale_delivery_link(
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
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
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
    where fi.sale_id = p_sale_id
      and fi.tenant_id = v_org_id
  ) then
    raise exception 'invoice_not_ready'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set status = 'expired'
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active'
    and sdl.expires_at is not null
    and sdl.expires_at <= now();

  select *
    into v_link
  from public.sale_delivery_links sdl
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now())
  order by sdl.created_at desc
  limit 1;

  if v_link.id is null then
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
  end if;

  return query
  select
    v_link.id,
    v_link.sale_id,
    v_link.document_kind,
    v_link.token,
    v_link.status,
    v_link.expires_at,
    v_link.created_at;
end;
$$;

drop function if exists public.rpc_get_sale_ticket_delivery(text);

create or replace function public.rpc_get_sale_ticket_delivery(
  p_token text
)
returns table (
  sale_id uuid,
  org_name text,
  branch_name text,
  created_at timestamptz,
  created_by_name text,
  subtotal_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  is_invoiced boolean,
  client_name text,
  client_phone text,
  items jsonb,
  ticket_header_text text,
  ticket_footer_text text,
  fiscal_ticket_note_text text,
  ticket_paper_width_mm numeric,
  ticket_margin_top_mm numeric,
  ticket_margin_right_mm numeric,
  ticket_margin_bottom_mm numeric,
  ticket_margin_left_mm numeric,
  ticket_font_size_px integer,
  ticket_line_height numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_org_id uuid;
begin
  select sdl.sale_id, sdl.org_id
    into v_sale_id, v_org_id
  from public.sale_delivery_links sdl
  where sdl.token = p_token
    and sdl.document_kind = 'sale_ticket'
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now())
  limit 1;

  if v_sale_id is null then
    return;
  end if;

  return query
  with items_by_sale as (
    select
      si.sale_id,
      jsonb_agg(
        jsonb_build_object(
          'sale_item_id', si.id,
          'product_name', si.product_name_snapshot,
          'unit_price', si.unit_price_snapshot,
          'quantity', si.quantity,
          'line_total', si.line_total
        )
        order by si.product_name_snapshot
      ) as items
    from public.sale_items si
    where si.sale_id = v_sale_id
    group by si.sale_id
  ),
  creator_names as (
    select
      ou.org_id,
      ou.user_id,
      coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as creator_name
    from public.org_users ou
    where ou.org_id = v_org_id
  )
  select
    s.id,
    o.name,
    b.name,
    s.created_at,
    coalesce(cn.creator_name, s.created_by::text),
    s.subtotal_amount,
    s.discount_amount,
    s.total_amount,
    s.is_invoiced,
    c.name,
    c.phone,
    coalesce(ibs.items, '[]'::jsonb),
    b.ticket_header_text,
    b.ticket_footer_text,
    b.fiscal_ticket_note_text,
    b.ticket_paper_width_mm,
    b.ticket_margin_top_mm,
    b.ticket_margin_right_mm,
    b.ticket_margin_bottom_mm,
    b.ticket_margin_left_mm,
    b.ticket_font_size_px,
    b.ticket_line_height
  from public.sales s
  join public.orgs o
    on o.id = s.org_id
  join public.branches b
    on b.id = s.branch_id
   and b.org_id = s.org_id
  left join public.clients c
    on c.id = s.client_id
   and c.org_id = s.org_id
  left join items_by_sale ibs
    on ibs.sale_id = s.id
  left join creator_names cn
    on cn.org_id = s.org_id
   and cn.user_id = s.created_by
  where s.id = v_sale_id
    and s.org_id = v_org_id;
end;
$$;

grant select on public.sale_delivery_links to authenticated;
grant select on public.sale_delivery_links to service_role;

grant execute on function public.rpc_get_or_create_sale_delivery_link(
  uuid,
  public.sale_delivery_document_kind,
  timestamptz
) to authenticated;

grant execute on function public.rpc_get_sale_ticket_delivery(text) to anon;
grant execute on function public.rpc_get_sale_ticket_delivery(text) to authenticated;

drop function if exists public.rpc_get_sale_invoice_delivery(text);

create or replace function public.rpc_get_sale_invoice_delivery(
  p_token text
)
returns table (
  sale_id uuid,
  org_id uuid,
  org_name text,
  branch_id uuid,
  branch_name text,
  created_at timestamptz,
  created_by uuid,
  created_by_name text,
  subtotal_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  items jsonb,
  invoice_id uuid,
  invoice_job_id uuid,
  environment text,
  pto_vta integer,
  cbte_tipo integer,
  cbte_nro bigint,
  doc_tipo integer,
  doc_nro bigint,
  currency varchar(3),
  currency_rate numeric,
  imp_total numeric,
  cae varchar,
  cae_expires_at date,
  result_status text,
  qr_payload_json jsonb,
  pdf_storage_path text,
  ticket_storage_path text,
  render_status text,
  updated_at timestamptz,
  ticket_header_text text,
  ticket_footer_text text,
  fiscal_ticket_note_text text,
  ticket_paper_width_mm numeric,
  ticket_margin_top_mm numeric,
  ticket_margin_right_mm numeric,
  ticket_margin_bottom_mm numeric,
  ticket_margin_left_mm numeric,
  ticket_font_size_px integer,
  ticket_line_height numeric,
  issuer_display_name text,
  issuer_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
begin
  select sdl.sale_id
    into v_sale_id
  from public.sale_delivery_links sdl
  where sdl.token = p_token
    and sdl.document_kind = 'sale_invoice'
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now())
  limit 1;

  if v_sale_id is null then
    return;
  end if;

  return query
  with items_by_sale as (
    select
      si.sale_id,
      jsonb_agg(
        jsonb_build_object(
          'sale_item_id', si.id,
          'product_name', si.product_name_snapshot,
          'unit_price', si.unit_price_snapshot,
          'quantity', si.quantity,
          'line_total', si.line_total
        )
        order by si.product_name_snapshot
      ) as items
    from public.sale_items si
    where si.sale_id = v_sale_id
    group by si.sale_id
  )
  select
    s.id,
    s.org_id,
    o.name,
    s.branch_id,
    b.name,
    s.created_at,
    s.created_by,
    coalesce(nullif(trim(ou.display_name), ''), s.created_by::text),
    s.subtotal_amount,
    s.discount_amount,
    s.total_amount,
    coalesce(ibs.items, '[]'::jsonb),
    i.id,
    i.invoice_job_id,
    i.environment,
    i.pto_vta,
    i.cbte_tipo,
    i.cbte_nro,
    i.doc_tipo,
    i.doc_nro,
    i.currency,
    i.currency_rate,
    i.imp_total,
    i.cae,
    i.cae_expires_at,
    i.result_status,
    i.qr_payload_json,
    i.pdf_storage_path,
    i.ticket_storage_path,
    ij.job_status,
    i.updated_at,
    b.ticket_header_text,
    b.ticket_footer_text,
    b.fiscal_ticket_note_text,
    b.ticket_paper_width_mm,
    b.ticket_margin_top_mm,
    b.ticket_margin_right_mm,
    b.ticket_margin_bottom_mm,
    b.ticket_margin_left_mm,
    b.ticket_font_size_px,
    b.ticket_line_height,
    ou.display_name,
    ou.role::text
  from public.sales s
  join public.orgs o
    on o.id = s.org_id
  join public.branches b
    on b.id = s.branch_id
   and b.org_id = s.org_id
  join public.invoices i
    on i.sale_id = s.id
   and i.tenant_id = s.org_id
   and i.result_status = 'authorized'
  join public.invoice_jobs ij
    on ij.id = i.invoice_job_id
   and ij.job_status = 'completed'
  left join items_by_sale ibs
    on ibs.sale_id = s.id
  left join public.org_users ou
    on ou.org_id = s.org_id
   and ou.user_id = s.created_by
  where s.id = v_sale_id
  limit 1;
end;
$$;

grant execute on function public.rpc_get_sale_invoice_delivery(text) to anon;
grant execute on function public.rpc_get_sale_invoice_delivery(text) to authenticated;
