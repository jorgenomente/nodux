-- Supplier default markup percent (used as pricing suggestion baseline in products).

alter table public.suppliers
  add column if not exists default_markup_pct numeric(6,2);

update public.suppliers
set default_markup_pct = 40
where default_markup_pct is null;

alter table public.suppliers
  alter column default_markup_pct set default 40,
  alter column default_markup_pct set not null;

alter table public.suppliers
  drop constraint if exists suppliers_default_markup_pct_range_ck;

alter table public.suppliers
  add constraint suppliers_default_markup_pct_range_ck
  check (default_markup_pct >= 0 and default_markup_pct <= 1000);

create or replace function public.rpc_upsert_supplier(
  p_supplier_id uuid,
  p_org_id uuid,
  p_name text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_is_active boolean,
  p_order_frequency public.order_frequency default null,
  p_order_day public.weekday default null,
  p_receive_day public.weekday default null,
  p_payment_terms_days integer default null,
  p_preferred_payment_method public.payment_method default null,
  p_accepts_cash boolean default true,
  p_accepts_transfer boolean default true,
  p_payment_note text default null,
  p_default_markup_pct numeric default 40
)
returns table (supplier_id uuid)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_supplier_id uuid;
  v_accepts_cash boolean := coalesce(p_accepts_cash, true);
  v_accepts_transfer boolean := coalesce(p_accepts_transfer, true);
  v_preferred public.payment_method := p_preferred_payment_method;
  v_default_markup_pct numeric := coalesce(p_default_markup_pct, 40);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'supplier name required';
  end if;

  if p_payment_terms_days is not null and p_payment_terms_days < 0 then
    raise exception 'payment terms must be >= 0';
  end if;

  if v_default_markup_pct < 0 or v_default_markup_pct > 1000 then
    raise exception 'default markup pct must be between 0 and 1000';
  end if;

  if not (v_accepts_cash or v_accepts_transfer) then
    raise exception 'supplier must accept at least one payment method';
  end if;

  if v_preferred is not null and v_preferred not in ('cash', 'transfer') then
    raise exception 'preferred payment method must be cash or transfer';
  end if;

  if v_preferred = 'cash' and not v_accepts_cash then
    raise exception 'preferred payment method cash must be enabled in accepts_cash';
  end if;

  if v_preferred = 'transfer' and not v_accepts_transfer then
    raise exception 'preferred payment method transfer must be enabled in accepts_transfer';
  end if;

  insert into public.suppliers (
    id,
    org_id,
    name,
    contact_name,
    phone,
    email,
    notes,
    is_active,
    order_frequency,
    order_day,
    receive_day,
    payment_terms_days,
    preferred_payment_method,
    accepts_cash,
    accepts_transfer,
    payment_note,
    default_markup_pct
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    trim(p_name),
    nullif(trim(coalesce(p_contact_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_is_active, true),
    p_order_frequency,
    p_order_day,
    p_receive_day,
    p_payment_terms_days,
    v_preferred,
    v_accepts_cash,
    v_accepts_transfer,
    nullif(trim(coalesce(p_payment_note, '')), ''),
    v_default_markup_pct
  )
  on conflict (id) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active,
    order_frequency = excluded.order_frequency,
    order_day = excluded.order_day,
    receive_day = excluded.receive_day,
    payment_terms_days = excluded.payment_terms_days,
    preferred_payment_method = excluded.preferred_payment_method,
    accepts_cash = excluded.accepts_cash,
    accepts_transfer = excluded.accepts_transfer,
    payment_note = excluded.payment_note,
    default_markup_pct = excluded.default_markup_pct
  returning id into v_supplier_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_upsert',
    'supplier',
    v_supplier_id,
    null,
    jsonb_build_object(
      'name', trim(p_name),
      'contact_name', nullif(trim(coalesce(p_contact_name, '')), ''),
      'phone', nullif(trim(coalesce(p_phone, '')), ''),
      'email', nullif(trim(coalesce(p_email, '')), ''),
      'is_active', coalesce(p_is_active, true),
      'order_frequency', p_order_frequency,
      'order_day', p_order_day,
      'receive_day', p_receive_day,
      'payment_terms_days', p_payment_terms_days,
      'preferred_payment_method', v_preferred,
      'accepts_cash', v_accepts_cash,
      'accepts_transfer', v_accepts_transfer,
      'payment_note', nullif(trim(coalesce(p_payment_note, '')), ''),
      'default_markup_pct', v_default_markup_pct
    ),
    auth.uid()
  );

  return query select v_supplier_id;
end;
$$;

create or replace view public.v_suppliers_admin as
select
  s.id as supplier_id,
  s.org_id,
  s.name,
  s.contact_name,
  s.phone,
  s.email,
  s.notes,
  s.is_active,
  s.created_at,
  s.updated_at,
  coalesce(sp_count.products_count, 0)::bigint as products_count,
  s.order_frequency,
  s.order_day,
  s.receive_day,
  s.payment_terms_days,
  s.preferred_payment_method,
  s.accepts_cash,
  s.accepts_transfer,
  s.payment_note,
  coalesce(accounts_count.accounts_count, 0)::bigint as payment_accounts_count,
  s.default_markup_pct
from public.suppliers s
left join (
  select
    supplier_products.supplier_id,
    count(*) as products_count
  from public.supplier_products
  group by supplier_products.supplier_id
) sp_count on sp_count.supplier_id = s.id
left join (
  select
    spa.supplier_id,
    count(*) filter (where spa.is_active = true) as accounts_count
  from public.supplier_payment_accounts spa
  group by spa.supplier_id
) accounts_count on accounts_count.supplier_id = s.id;

create or replace view public.v_supplier_detail_admin as
select
  s.id as supplier_id,
  s.org_id,
  s.name,
  s.contact_name,
  s.phone,
  s.email,
  s.notes,
  s.is_active,
  s.created_at,
  s.updated_at,
  sp.product_id,
  p.name as product_name,
  p.is_active as product_is_active,
  p.barcode,
  p.internal_code,
  sp.supplier_sku,
  sp.supplier_product_name,
  sp.relation_type,
  s.order_frequency,
  s.order_day,
  s.receive_day,
  s.payment_terms_days,
  s.preferred_payment_method,
  s.accepts_cash,
  s.accepts_transfer,
  s.payment_note,
  s.default_markup_pct
from public.suppliers s
left join public.supplier_products sp
  on sp.supplier_id = s.id
 and sp.org_id = s.org_id
left join public.products p
  on p.id = sp.product_id
 and p.org_id = s.org_id;
