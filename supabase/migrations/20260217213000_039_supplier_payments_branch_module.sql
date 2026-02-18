-- Supplier payments module (branch-scoped): supplier payment profile, payables by order, and payment movements.

alter table public.suppliers
  add column if not exists payment_terms_days integer,
  add column if not exists preferred_payment_method public.payment_method,
  add column if not exists accepts_cash boolean not null default true,
  add column if not exists accepts_transfer boolean not null default true,
  add column if not exists payment_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'suppliers_payment_terms_days_nonnegative_ck'
  ) then
    alter table public.suppliers
      add constraint suppliers_payment_terms_days_nonnegative_ck
      check (payment_terms_days is null or payment_terms_days >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'suppliers_preferred_payment_method_ck'
  ) then
    alter table public.suppliers
      add constraint suppliers_preferred_payment_method_ck
      check (
        preferred_payment_method is null
        or preferred_payment_method in ('cash', 'transfer')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'suppliers_accepts_any_payment_method_ck'
  ) then
    alter table public.suppliers
      add constraint suppliers_accepts_any_payment_method_ck
      check (accepts_cash or accepts_transfer);
  end if;
end $$;

create table if not exists public.supplier_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  account_label text,
  bank_name text,
  account_holder_name text,
  account_identifier text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id)
);

create unique index if not exists supplier_payment_accounts_org_supplier_identifier_uk
  on public.supplier_payment_accounts (org_id, supplier_id, account_identifier)
  where account_identifier is not null and length(trim(account_identifier)) > 0;

create index if not exists supplier_payment_accounts_org_supplier_idx
  on public.supplier_payment_accounts (org_id, supplier_id, is_active, created_at desc);

create table if not exists public.supplier_payables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  order_id uuid not null unique references public.supplier_orders(id) on delete cascade,
  status text not null default 'pending',
  estimated_amount numeric(12,2) not null default 0,
  invoice_amount numeric(12,2),
  paid_amount numeric(12,2) not null default 0,
  outstanding_amount numeric(12,2) not null default 0,
  due_on date,
  payment_terms_days_snapshot integer,
  preferred_payment_method public.payment_method,
  selected_payment_method public.payment_method,
  invoice_photo_url text,
  invoice_note text,
  paid_at timestamptz,
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_payables_status_ck
    check (status in ('pending', 'partial', 'paid')),
  constraint supplier_payables_estimated_amount_ck
    check (estimated_amount >= 0),
  constraint supplier_payables_invoice_amount_ck
    check (invoice_amount is null or invoice_amount >= 0),
  constraint supplier_payables_paid_amount_ck
    check (paid_amount >= 0),
  constraint supplier_payables_outstanding_amount_ck
    check (outstanding_amount >= 0),
  constraint supplier_payables_payment_terms_snapshot_ck
    check (payment_terms_days_snapshot is null or payment_terms_days_snapshot >= 0),
  constraint supplier_payables_preferred_payment_method_ck
    check (
      preferred_payment_method is null
      or preferred_payment_method in ('cash', 'transfer')
    ),
  constraint supplier_payables_selected_payment_method_ck
    check (
      selected_payment_method is null
      or selected_payment_method in ('cash', 'transfer')
    )
);

create index if not exists supplier_payables_org_branch_status_due_idx
  on public.supplier_payables (org_id, branch_id, status, due_on, created_at desc);

create index if not exists supplier_payables_org_supplier_status_idx
  on public.supplier_payables (org_id, supplier_id, status, created_at desc);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  payable_id uuid not null references public.supplier_payables(id) on delete cascade,
  order_id uuid not null references public.supplier_orders(id) on delete cascade,
  payment_method public.payment_method not null,
  transfer_account_id uuid null references public.supplier_payment_accounts(id) on delete set null,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  reference text,
  note text,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint supplier_payments_amount_positive_ck
    check (amount > 0),
  constraint supplier_payments_method_ck
    check (payment_method in ('cash', 'transfer'))
);

create index if not exists supplier_payments_payable_paid_at_idx
  on public.supplier_payments (payable_id, paid_at desc);

create index if not exists supplier_payments_org_branch_idx
  on public.supplier_payments (org_id, branch_id, paid_at desc);

alter table public.supplier_payment_accounts enable row level security;
alter table public.supplier_payables enable row level security;
alter table public.supplier_payments enable row level security;

drop policy if exists supplier_payment_accounts_select on public.supplier_payment_accounts;
drop policy if exists supplier_payment_accounts_write on public.supplier_payment_accounts;
drop policy if exists supplier_payment_accounts_update on public.supplier_payment_accounts;

create policy supplier_payment_accounts_select
  on public.supplier_payment_accounts
  for select
  using (public.is_org_member(org_id));

create policy supplier_payment_accounts_write
  on public.supplier_payment_accounts
  for insert
  with check (public.is_org_admin_or_superadmin(org_id));

create policy supplier_payment_accounts_update
  on public.supplier_payment_accounts
  for update
  using (public.is_org_admin_or_superadmin(org_id));

drop policy if exists supplier_payables_select on public.supplier_payables;
drop policy if exists supplier_payables_write on public.supplier_payables;
drop policy if exists supplier_payables_update on public.supplier_payables;

create policy supplier_payables_select
  on public.supplier_payables
  for select
  using (public.is_org_member(org_id));

create policy supplier_payables_write
  on public.supplier_payables
  for insert
  with check (public.is_org_admin_or_superadmin(org_id));

create policy supplier_payables_update
  on public.supplier_payables
  for update
  using (public.is_org_admin_or_superadmin(org_id));

drop policy if exists supplier_payments_select on public.supplier_payments;
drop policy if exists supplier_payments_write on public.supplier_payments;
drop policy if exists supplier_payments_update on public.supplier_payments;

create policy supplier_payments_select
  on public.supplier_payments
  for select
  using (public.is_org_member(org_id));

create policy supplier_payments_write
  on public.supplier_payments
  for insert
  with check (public.is_org_admin_or_superadmin(org_id));

create policy supplier_payments_update
  on public.supplier_payments
  for update
  using (public.is_org_admin_or_superadmin(org_id));

create or replace function public.fn_recompute_supplier_payable(
  p_payable_id uuid,
  p_actor_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_payable record;
  v_paid_amount numeric(12,2) := 0;
  v_base_amount numeric(12,2) := 0;
  v_outstanding numeric(12,2) := 0;
  v_status text := 'pending';
  v_last_paid_at timestamptz := null;
begin
  select * into v_payable
  from public.supplier_payables sp
  where sp.id = p_payable_id
  for update;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  select coalesce(sum(spm.amount), 0), max(spm.paid_at)
    into v_paid_amount, v_last_paid_at
  from public.supplier_payments spm
  where spm.payable_id = p_payable_id;

  v_base_amount := coalesce(v_payable.invoice_amount, v_payable.estimated_amount, 0);
  v_outstanding := greatest(v_base_amount - v_paid_amount, 0);

  if v_outstanding = 0 then
    v_status := 'paid';
  elsif v_paid_amount > 0 then
    v_status := 'partial';
  else
    v_status := 'pending';
  end if;

  update public.supplier_payables
  set
    paid_amount = round(v_paid_amount, 2),
    outstanding_amount = round(v_outstanding, 2),
    status = v_status,
    paid_at = case when v_status = 'paid' then v_last_paid_at else null end,
    updated_by = p_actor_user_id,
    updated_at = now()
  where id = p_payable_id;
end;
$$;

create or replace function public.fn_sync_supplier_payable_from_order(
  p_org_id uuid,
  p_order_id uuid,
  p_actor_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_order record;
  v_estimated_amount numeric(12,2) := 0;
  v_due_on date := null;
  v_payable_id uuid;
begin
  select so.id,
         so.org_id,
         so.branch_id,
         so.supplier_id,
         so.status,
         so.received_at,
         so.reconciled_at,
         s.payment_terms_days,
         s.preferred_payment_method
    into v_order
  from public.supplier_orders so
  join public.suppliers s
    on s.id = so.supplier_id
   and s.org_id = so.org_id
  where so.id = p_order_id
    and so.org_id = p_org_id;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status not in ('received', 'reconciled') then
    return null;
  end if;

  select coalesce(
    sum(
      soi.ordered_qty * coalesce(nullif(soi.unit_cost, 0), p.unit_price, 0)
    ),
    0
  ) into v_estimated_amount
  from public.supplier_order_items soi
  left join public.products p
    on p.id = soi.product_id
   and p.org_id = soi.org_id
  where soi.org_id = p_org_id
    and soi.order_id = p_order_id;

  if v_order.payment_terms_days is not null then
    v_due_on := (
      coalesce(v_order.reconciled_at, v_order.received_at, now())::date
      + v_order.payment_terms_days
    );
  end if;

  insert into public.supplier_payables (
    org_id,
    branch_id,
    supplier_id,
    order_id,
    status,
    estimated_amount,
    invoice_amount,
    paid_amount,
    outstanding_amount,
    due_on,
    payment_terms_days_snapshot,
    preferred_payment_method,
    selected_payment_method,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    p_org_id,
    v_order.branch_id,
    v_order.supplier_id,
    p_order_id,
    'pending',
    round(v_estimated_amount, 2),
    null,
    0,
    round(v_estimated_amount, 2),
    v_due_on,
    v_order.payment_terms_days,
    v_order.preferred_payment_method,
    null,
    p_actor_user_id,
    p_actor_user_id,
    now(),
    now()
  )
  on conflict (order_id) do update set
    branch_id = excluded.branch_id,
    supplier_id = excluded.supplier_id,
    estimated_amount = excluded.estimated_amount,
    due_on = coalesce(public.supplier_payables.due_on, excluded.due_on),
    payment_terms_days_snapshot = excluded.payment_terms_days_snapshot,
    preferred_payment_method = excluded.preferred_payment_method,
    updated_by = p_actor_user_id,
    updated_at = now()
  returning id into v_payable_id;

  perform public.fn_recompute_supplier_payable(v_payable_id, p_actor_user_id);

  return v_payable_id;
end;
$$;

create or replace function public.rpc_sync_supplier_payable_from_order(
  p_org_id uuid,
  p_order_id uuid
)
returns table (payable_id uuid)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_payable_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  v_payable_id := public.fn_sync_supplier_payable_from_order(
    p_org_id,
    p_order_id,
    auth.uid()
  );

  return query select v_payable_id;
end;
$$;

create or replace function public.rpc_update_supplier_payable(
  p_org_id uuid,
  p_payable_id uuid,
  p_invoice_amount numeric default null,
  p_due_on date default null,
  p_invoice_photo_url text default null,
  p_invoice_note text default null,
  p_selected_payment_method public.payment_method default null
)
returns table (
  payable_id uuid,
  status text,
  outstanding_amount numeric
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_payable record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_invoice_amount is not null and p_invoice_amount < 0 then
    raise exception 'invoice amount must be >= 0';
  end if;

  if p_selected_payment_method is not null
    and p_selected_payment_method not in ('cash', 'transfer') then
    raise exception 'invalid selected payment method';
  end if;

  update public.supplier_payables
  set
    invoice_amount = p_invoice_amount,
    due_on = p_due_on,
    invoice_photo_url = nullif(trim(coalesce(p_invoice_photo_url, '')), ''),
    invoice_note = nullif(trim(coalesce(p_invoice_note, '')), ''),
    selected_payment_method = p_selected_payment_method,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payable_id
    and org_id = p_org_id
  returning * into v_payable;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  perform public.fn_recompute_supplier_payable(p_payable_id, auth.uid());

  select * into v_payable
  from public.supplier_payables
  where id = p_payable_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payable_updated',
    'supplier_payable',
    p_payable_id,
    v_payable.branch_id,
    jsonb_build_object(
      'invoice_amount', v_payable.invoice_amount,
      'due_on', v_payable.due_on,
      'invoice_photo_url', v_payable.invoice_photo_url,
      'selected_payment_method', v_payable.selected_payment_method,
      'status', v_payable.status,
      'outstanding_amount', v_payable.outstanding_amount
    ),
    auth.uid()
  );

  return query
  select v_payable.id, v_payable.status, v_payable.outstanding_amount;
end;
$$;

create or replace function public.rpc_register_supplier_payment(
  p_org_id uuid,
  p_payable_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method,
  p_paid_at timestamptz default now(),
  p_transfer_account_id uuid default null,
  p_reference text default null,
  p_note text default null
)
returns table (
  payment_id uuid,
  payable_status text,
  outstanding_amount numeric
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_payable record;
  v_payment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid payment amount';
  end if;

  if p_payment_method not in ('cash', 'transfer') then
    raise exception 'invalid payment method';
  end if;

  select * into v_payable
  from public.supplier_payables sp
  where sp.id = p_payable_id
    and sp.org_id = p_org_id
  for update;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  if v_payable.status = 'paid' then
    raise exception 'payable already paid';
  end if;

  if p_amount > v_payable.outstanding_amount and v_payable.outstanding_amount > 0 then
    raise exception 'payment amount exceeds outstanding amount';
  end if;

  if p_payment_method = 'transfer' and p_transfer_account_id is not null then
    if not exists (
      select 1
      from public.supplier_payment_accounts spa
      where spa.id = p_transfer_account_id
        and spa.org_id = p_org_id
        and spa.supplier_id = v_payable.supplier_id
    ) then
      raise exception 'transfer account not found for supplier';
    end if;
  end if;

  insert into public.supplier_payments (
    org_id,
    branch_id,
    supplier_id,
    payable_id,
    order_id,
    payment_method,
    transfer_account_id,
    amount,
    paid_at,
    reference,
    note,
    created_by,
    created_at
  ) values (
    p_org_id,
    v_payable.branch_id,
    v_payable.supplier_id,
    p_payable_id,
    v_payable.order_id,
    p_payment_method,
    p_transfer_account_id,
    round(p_amount, 2),
    coalesce(p_paid_at, now()),
    nullif(trim(coalesce(p_reference, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid(),
    now()
  )
  returning id into v_payment_id;

  update public.supplier_payables
  set
    selected_payment_method = p_payment_method,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payable_id;

  perform public.fn_recompute_supplier_payable(p_payable_id, auth.uid());

  select * into v_payable
  from public.supplier_payables
  where id = p_payable_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_registered',
    'supplier_payment',
    v_payment_id,
    v_payable.branch_id,
    jsonb_build_object(
      'payable_id', p_payable_id,
      'order_id', v_payable.order_id,
      'amount', round(p_amount, 2),
      'payment_method', p_payment_method,
      'transfer_account_id', p_transfer_account_id,
      'reference', nullif(trim(coalesce(p_reference, '')), ''),
      'status', v_payable.status,
      'outstanding_amount', v_payable.outstanding_amount
    ),
    auth.uid()
  );

  return query
  select v_payment_id, v_payable.status, v_payable.outstanding_amount;
end;
$$;

create or replace function public.rpc_upsert_supplier_payment_account(
  p_org_id uuid,
  p_supplier_id uuid,
  p_account_id uuid default null,
  p_account_label text default null,
  p_bank_name text default null,
  p_account_holder_name text default null,
  p_account_identifier text default null,
  p_is_active boolean default true
)
returns table (account_id uuid)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_account_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1
    from public.suppliers s
    where s.id = p_supplier_id
      and s.org_id = p_org_id
  ) then
    raise exception 'supplier not found';
  end if;

  insert into public.supplier_payment_accounts (
    id,
    org_id,
    supplier_id,
    account_label,
    bank_name,
    account_holder_name,
    account_identifier,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    coalesce(p_account_id, gen_random_uuid()),
    p_org_id,
    p_supplier_id,
    nullif(trim(coalesce(p_account_label, '')), ''),
    nullif(trim(coalesce(p_bank_name, '')), ''),
    nullif(trim(coalesce(p_account_holder_name, '')), ''),
    nullif(trim(coalesce(p_account_identifier, '')), ''),
    coalesce(p_is_active, true),
    auth.uid(),
    auth.uid(),
    now(),
    now()
  )
  on conflict (id) do update set
    account_label = excluded.account_label,
    bank_name = excluded.bank_name,
    account_holder_name = excluded.account_holder_name,
    account_identifier = excluded.account_identifier,
    is_active = excluded.is_active,
    updated_by = auth.uid(),
    updated_at = now()
  returning id into v_account_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_account_upsert',
    'supplier_payment_account',
    v_account_id,
    null,
    jsonb_build_object(
      'supplier_id', p_supplier_id,
      'account_label', nullif(trim(coalesce(p_account_label, '')), ''),
      'bank_name', nullif(trim(coalesce(p_bank_name, '')), ''),
      'account_identifier', nullif(trim(coalesce(p_account_identifier, '')), ''),
      'is_active', coalesce(p_is_active, true)
    ),
    auth.uid()
  );

  return query select v_account_id;
end;
$$;

create or replace function public.rpc_set_supplier_payment_account_active(
  p_org_id uuid,
  p_account_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_account record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  update public.supplier_payment_accounts
  set
    is_active = coalesce(p_is_active, false),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_account_id
    and org_id = p_org_id
  returning * into v_account;

  if v_account is null then
    raise exception 'account not found';
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_account_status_set',
    'supplier_payment_account',
    p_account_id,
    null,
    jsonb_build_object(
      'supplier_id', v_account.supplier_id,
      'is_active', coalesce(p_is_active, false)
    ),
    auth.uid()
  );
end;
$$;

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
  p_payment_note text default null
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
    payment_note
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
    nullif(trim(coalesce(p_payment_note, '')), '')
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
    payment_note = excluded.payment_note
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
      'payment_note', nullif(trim(coalesce(p_payment_note, '')), '')
    ),
    auth.uid()
  );

  return query select v_supplier_id;
end;
$$;

create or replace function public.trg_sync_supplier_payable_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.status in ('received', 'reconciled') then
    perform public.fn_sync_supplier_payable_from_order(new.org_id, new.id, coalesce(new.created_by, auth.uid()));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_supplier_orders_sync_payable on public.supplier_orders;

create trigger trg_supplier_orders_sync_payable
after insert or update of status, supplier_id, branch_id, received_at, reconciled_at
on public.supplier_orders
for each row
execute function public.trg_sync_supplier_payable_from_order();

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
  coalesce(accounts_count.accounts_count, 0)::bigint as payment_accounts_count
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
  s.payment_note
from public.suppliers s
left join public.supplier_products sp
  on sp.supplier_id = s.id
 and sp.org_id = s.org_id
left join public.products p
  on p.id = sp.product_id
 and p.org_id = s.org_id;

create or replace view public.v_supplier_payables_admin as
select
  sp.id as payable_id,
  sp.org_id,
  sp.branch_id,
  b.name as branch_name,
  sp.supplier_id,
  s.name as supplier_name,
  sp.order_id,
  so.status as order_status,
  sp.status as payable_status,
  case
    when sp.status <> 'paid'
      and sp.due_on is not null
      and sp.due_on < current_date
    then 'overdue'
    else sp.status
  end as payment_state,
  sp.estimated_amount,
  sp.invoice_amount,
  sp.paid_amount,
  sp.outstanding_amount,
  sp.due_on,
  case
    when sp.due_on is null then null
    else (sp.due_on - current_date)
  end as due_in_days,
  (
    sp.status <> 'paid'
    and sp.due_on is not null
    and sp.due_on < current_date
  ) as is_overdue,
  sp.payment_terms_days_snapshot,
  sp.preferred_payment_method,
  sp.selected_payment_method,
  sp.invoice_photo_url,
  sp.invoice_note,
  sp.paid_at,
  sp.created_at,
  sp.updated_at
from public.supplier_payables sp
join public.supplier_orders so
  on so.id = sp.order_id
 and so.org_id = sp.org_id
join public.suppliers s
  on s.id = sp.supplier_id
 and s.org_id = sp.org_id
join public.branches b
  on b.id = sp.branch_id
 and b.org_id = sp.org_id;

create or replace view public.v_orders_admin as
select
  so.id as order_id,
  so.org_id,
  so.branch_id,
  b.name as branch_name,
  so.supplier_id,
  s.name as supplier_name,
  so.status,
  so.created_at,
  so.sent_at,
  so.received_at,
  so.reconciled_at,
  so.expected_receive_on,
  coalesce(items.items_count, 0)::bigint as items_count,
  sp.id as payable_id,
  sp.status as payable_status,
  case
    when sp.id is null then 'not_created'
    when sp.status <> 'paid' and sp.due_on is not null and sp.due_on < current_date then 'overdue'
    else sp.status
  end as payment_state,
  sp.due_on as payable_due_on,
  sp.outstanding_amount as payable_outstanding_amount
from public.supplier_orders so
left join public.suppliers s
  on s.id = so.supplier_id
 and s.org_id = so.org_id
left join public.branches b
  on b.id = so.branch_id
 and b.org_id = so.org_id
left join (
  select
    supplier_order_items.order_id,
    count(*) as items_count
  from public.supplier_order_items
  group by supplier_order_items.order_id
) items on items.order_id = so.id
left join public.supplier_payables sp
  on sp.order_id = so.id
 and sp.org_id = so.org_id;

grant execute on function public.rpc_sync_supplier_payable_from_order(uuid, uuid) to authenticated;
grant execute on function public.rpc_update_supplier_payable(uuid, uuid, numeric, date, text, text, public.payment_method) to authenticated;
grant execute on function public.rpc_register_supplier_payment(uuid, uuid, numeric, public.payment_method, timestamptz, uuid, text, text) to authenticated;
grant execute on function public.rpc_upsert_supplier_payment_account(uuid, uuid, uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.rpc_set_supplier_payment_account_active(uuid, uuid, boolean) to authenticated;
grant execute on function public.rpc_upsert_supplier(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  boolean,
  public.order_frequency,
  public.weekday,
  public.weekday,
  integer,
  public.payment_method,
  boolean,
  boolean,
  text
) to authenticated;

do $$
declare
  v_order record;
begin
  for v_order in
    select so.id, so.org_id
    from public.supplier_orders so
    where so.status in ('received', 'reconciled')
  loop
    perform public.fn_sync_supplier_payable_from_order(v_order.org_id, v_order.id, null);
  end loop;
end $$;
