-- Platform subscriptions and org membership billing foundation.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_pricing_mode'
  ) then
    create type public.subscription_pricing_mode as enum ('standard', 'custom');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_service_status'
  ) then
    create type public.subscription_service_status as enum ('active', 'grace', 'suspended', 'cancelled');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_payment_status'
  ) then
    create type public.subscription_payment_status as enum ('pending', 'proof_submitted', 'paid', 'rejected', 'waived');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_payment_method'
  ) then
    create type public.subscription_payment_method as enum ('bank_transfer', 'mercadopago_qr', 'cash', 'other');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_review_status'
  ) then
    create type public.subscription_review_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  base_price_monthly numeric(12,2) not null,
  included_branches integer not null default 1,
  additional_branch_price_monthly numeric(12,2) not null default 0,
  currency_code text not null default 'ARS',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_base_price_nonnegative_ck
    check (base_price_monthly >= 0),
  constraint subscription_plans_included_branches_nonnegative_ck
    check (included_branches >= 0),
  constraint subscription_plans_additional_branch_price_nonnegative_ck
    check (additional_branch_price_monthly >= 0)
);

create table if not exists public.platform_billing_settings (
  id boolean primary key default true,
  bank_account_holder text,
  bank_name text,
  bank_account_type text,
  bank_cbu text,
  bank_alias text,
  bank_cuit text,
  mercadopago_qr_image_path text,
  payment_instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint platform_billing_settings_singleton_ck
    check (id = true)
);

create table if not exists public.org_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.orgs(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  pricing_mode public.subscription_pricing_mode not null default 'standard',
  plan_name_snapshot text not null,
  currency_code text not null default 'ARS',
  base_price_monthly_snapshot numeric(12,2) not null,
  included_branches_snapshot integer not null default 1,
  additional_branch_price_monthly_snapshot numeric(12,2) not null default 0,
  custom_monthly_price numeric(12,2),
  started_on date not null,
  renews_on date not null,
  service_status public.subscription_service_status not null default 'active',
  grace_until date,
  billing_notes_internal text,
  customer_note_visible text,
  is_auto_branch_pricing_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint org_subscriptions_base_price_nonnegative_ck
    check (base_price_monthly_snapshot >= 0),
  constraint org_subscriptions_included_branches_nonnegative_ck
    check (included_branches_snapshot >= 0),
  constraint org_subscriptions_additional_branch_price_nonnegative_ck
    check (additional_branch_price_monthly_snapshot >= 0),
  constraint org_subscriptions_custom_monthly_price_nonnegative_ck
    check (custom_monthly_price is null or custom_monthly_price >= 0),
  constraint org_subscriptions_custom_pricing_required_ck
    check (
      (pricing_mode = 'standard' and custom_monthly_price is null)
      or (pricing_mode = 'custom' and custom_monthly_price is not null)
    ),
  constraint org_subscriptions_grace_until_service_ck
    check (
      grace_until is null
      or service_status in ('grace', 'active')
    )
);

create table if not exists public.org_subscription_cycles (
  id uuid primary key default gen_random_uuid(),
  org_subscription_id uuid not null references public.org_subscriptions(id) on delete cascade,
  cycle_start_on date not null,
  cycle_end_on date not null,
  due_on date not null,
  active_branch_count_snapshot integer not null default 0,
  billable_additional_branch_count_snapshot integer not null default 0,
  expected_amount numeric(12,2) not null default 0,
  payment_status public.subscription_payment_status not null default 'pending',
  paid_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_confirmed_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint org_subscription_cycles_date_order_ck
    check (cycle_end_on >= cycle_start_on),
  constraint org_subscription_cycles_due_on_ck
    check (due_on >= cycle_start_on),
  constraint org_subscription_cycles_active_branch_count_nonnegative_ck
    check (active_branch_count_snapshot >= 0),
  constraint org_subscription_cycles_billable_branch_count_nonnegative_ck
    check (billable_additional_branch_count_snapshot >= 0),
  constraint org_subscription_cycles_expected_amount_nonnegative_ck
    check (expected_amount >= 0),
  constraint org_subscription_cycles_unique_period_uk
    unique (org_subscription_id, cycle_start_on, cycle_end_on)
);

create table if not exists public.org_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  org_subscription_cycle_id uuid not null references public.org_subscription_cycles(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  payment_method public.subscription_payment_method not null,
  amount_reported numeric(12,2) not null,
  reference_text text,
  proof_storage_path text,
  proof_uploaded_by uuid references auth.users(id) on delete set null,
  proof_uploaded_at timestamptz not null default now(),
  review_status public.subscription_review_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  constraint org_subscription_payments_amount_positive_ck
    check (amount_reported > 0)
);

create index if not exists subscription_plans_active_idx
  on public.subscription_plans (is_active, created_at desc);

create index if not exists org_subscriptions_service_status_idx
  on public.org_subscriptions (service_status, pricing_mode, updated_at desc);

create index if not exists org_subscription_cycles_subscription_due_idx
  on public.org_subscription_cycles (org_subscription_id, due_on desc, created_at desc);

create index if not exists org_subscription_payments_cycle_created_idx
  on public.org_subscription_payments (org_subscription_cycle_id, created_at desc);

create index if not exists org_subscription_payments_org_review_idx
  on public.org_subscription_payments (org_id, review_status, proof_uploaded_at desc);

drop trigger if exists trg_subscription_plans_set_updated_at on public.subscription_plans;
create trigger trg_subscription_plans_set_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

drop trigger if exists trg_platform_billing_settings_set_updated_at on public.platform_billing_settings;
create trigger trg_platform_billing_settings_set_updated_at
before update on public.platform_billing_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_org_subscriptions_set_updated_at on public.org_subscriptions;
create trigger trg_org_subscriptions_set_updated_at
before update on public.org_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_org_subscription_cycles_set_updated_at on public.org_subscription_cycles;
create trigger trg_org_subscription_cycles_set_updated_at
before update on public.org_subscription_cycles
for each row execute function public.set_updated_at();

alter table public.subscription_plans enable row level security;
alter table public.platform_billing_settings enable row level security;
alter table public.org_subscriptions enable row level security;
alter table public.org_subscription_cycles enable row level security;
alter table public.org_subscription_payments enable row level security;

drop policy if exists subscription_plans_select on public.subscription_plans;
drop policy if exists subscription_plans_write on public.subscription_plans;
drop policy if exists subscription_plans_update on public.subscription_plans;
drop policy if exists subscription_plans_delete on public.subscription_plans;

create policy subscription_plans_select
  on public.subscription_plans
  for select
  using (
    public.is_platform_admin()
    or public.is_org_admin_or_superadmin(public.rpc_get_active_org_id())
  );

create policy subscription_plans_write
  on public.subscription_plans
  for insert
  with check (public.is_platform_admin());

create policy subscription_plans_update
  on public.subscription_plans
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy subscription_plans_delete
  on public.subscription_plans
  for delete
  using (public.is_platform_admin());

drop policy if exists platform_billing_settings_select on public.platform_billing_settings;
drop policy if exists platform_billing_settings_write on public.platform_billing_settings;
drop policy if exists platform_billing_settings_update on public.platform_billing_settings;

create policy platform_billing_settings_select
  on public.platform_billing_settings
  for select
  using (
    public.is_platform_admin()
    or public.is_org_admin_or_superadmin(public.rpc_get_active_org_id())
  );

create policy platform_billing_settings_write
  on public.platform_billing_settings
  for insert
  with check (public.is_platform_admin());

create policy platform_billing_settings_update
  on public.platform_billing_settings
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists org_subscriptions_select on public.org_subscriptions;
drop policy if exists org_subscriptions_write on public.org_subscriptions;
drop policy if exists org_subscriptions_update on public.org_subscriptions;

create policy org_subscriptions_select
  on public.org_subscriptions
  for select
  using (public.is_org_member(org_id));

create policy org_subscriptions_write
  on public.org_subscriptions
  for insert
  with check (public.is_platform_admin());

create policy org_subscriptions_update
  on public.org_subscriptions
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists org_subscription_cycles_select on public.org_subscription_cycles;
drop policy if exists org_subscription_cycles_write on public.org_subscription_cycles;
drop policy if exists org_subscription_cycles_update on public.org_subscription_cycles;

create policy org_subscription_cycles_select
  on public.org_subscription_cycles
  for select
  using (
    exists (
      select 1
      from public.org_subscriptions os
      where os.id = org_subscription_cycles.org_subscription_id
        and public.is_org_member(os.org_id)
    )
  );

create policy org_subscription_cycles_write
  on public.org_subscription_cycles
  for insert
  with check (
    exists (
      select 1
      from public.org_subscriptions os
      where os.id = org_subscription_cycles.org_subscription_id
        and public.is_platform_admin()
    )
  );

create policy org_subscription_cycles_update
  on public.org_subscription_cycles
  for update
  using (
    exists (
      select 1
      from public.org_subscriptions os
      where os.id = org_subscription_cycles.org_subscription_id
        and public.is_platform_admin()
    )
  )
  with check (
    exists (
      select 1
      from public.org_subscriptions os
      where os.id = org_subscription_cycles.org_subscription_id
        and public.is_platform_admin()
    )
  );

drop policy if exists org_subscription_payments_select on public.org_subscription_payments;
drop policy if exists org_subscription_payments_write on public.org_subscription_payments;
drop policy if exists org_subscription_payments_update on public.org_subscription_payments;

create policy org_subscription_payments_select
  on public.org_subscription_payments
  for select
  using (public.is_org_member(org_id));

create policy org_subscription_payments_write
  on public.org_subscription_payments
  for insert
  with check (public.is_org_admin_or_superadmin(org_id));

create policy org_subscription_payments_update
  on public.org_subscription_payments
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

insert into public.subscription_plans (
  code,
  name,
  description,
  base_price_monthly,
  included_branches,
  additional_branch_price_monthly,
  currency_code,
  is_active
)
values (
  'base_1_branch',
  'Plan Base',
  'Plan base con 1 sucursal incluida y cargo mensual por sucursal activa adicional.',
  100000,
  1,
  80000,
  'ARS',
  true
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  base_price_monthly = excluded.base_price_monthly,
  included_branches = excluded.included_branches,
  additional_branch_price_monthly = excluded.additional_branch_price_monthly,
  currency_code = excluded.currency_code,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.platform_billing_settings (
  id,
  payment_instructions,
  is_active
)
values (
  true,
  'Transferí al CBU/alias informado o escaneá el QR habilitado y luego adjuntá el comprobante desde Membresía.',
  true
)
on conflict (id) do update set
  payment_instructions = coalesce(public.platform_billing_settings.payment_instructions, excluded.payment_instructions),
  is_active = excluded.is_active,
  updated_at = now();

create or replace function public.fn_calculate_org_subscription_amount(
  p_org_id uuid,
  p_pricing_mode public.subscription_pricing_mode,
  p_base_price_monthly numeric,
  p_included_branches integer,
  p_additional_branch_price_monthly numeric,
  p_custom_monthly_price numeric default null
)
returns table(
  active_branch_count integer,
  billable_additional_branch_count integer,
  effective_monthly_price numeric
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with branch_counts as (
    select count(*)::integer as active_branch_count
    from public.branches b
    where b.org_id = p_org_id
      and b.is_active = true
  )
  select
    bc.active_branch_count,
    greatest(bc.active_branch_count - greatest(p_included_branches, 0), 0)::integer as billable_additional_branch_count,
    round(
      case
        when p_pricing_mode = 'custom' then coalesce(p_custom_monthly_price, 0)
        else
          coalesce(p_base_price_monthly, 0)
          + (
            greatest(bc.active_branch_count - greatest(p_included_branches, 0), 0)
            * coalesce(p_additional_branch_price_monthly, 0)
          )
      end,
      2
    ) as effective_monthly_price
  from branch_counts bc;
$$;

grant execute on function public.fn_calculate_org_subscription_amount(
  uuid,
  public.subscription_pricing_mode,
  numeric,
  integer,
  numeric,
  numeric
) to authenticated;

create or replace function public.fn_recompute_org_subscription_cycle(
  p_org_subscription_id uuid,
  p_cycle_id uuid default null,
  p_actor_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_subscription public.org_subscriptions%rowtype;
  v_cycle public.org_subscription_cycles%rowtype;
  v_active_branch_count integer := 0;
  v_billable_branch_count integer := 0;
  v_expected_amount numeric(12,2) := 0;
begin
  select *
    into v_subscription
  from public.org_subscriptions os
  where os.id = p_org_subscription_id;

  if v_subscription.id is null then
    raise exception 'subscription not found';
  end if;

  if p_cycle_id is not null then
    select *
      into v_cycle
    from public.org_subscription_cycles osc
    where osc.id = p_cycle_id
      and osc.org_subscription_id = p_org_subscription_id
    for update;
  else
    select *
      into v_cycle
    from public.org_subscription_cycles osc
    where osc.org_subscription_id = p_org_subscription_id
    order by osc.cycle_start_on desc, osc.created_at desc
    limit 1
    for update;
  end if;

  if v_cycle.id is null then
    raise exception 'subscription cycle not found';
  end if;

  select calc.active_branch_count,
         calc.billable_additional_branch_count,
         calc.effective_monthly_price
    into v_active_branch_count, v_billable_branch_count, v_expected_amount
  from public.fn_calculate_org_subscription_amount(
    v_subscription.org_id,
    v_subscription.pricing_mode,
    v_subscription.base_price_monthly_snapshot,
    v_subscription.included_branches_snapshot,
    v_subscription.additional_branch_price_monthly_snapshot,
    v_subscription.custom_monthly_price
  ) calc;

  update public.org_subscription_cycles
  set
    active_branch_count_snapshot = v_active_branch_count,
    billable_additional_branch_count_snapshot = v_billable_branch_count,
    expected_amount = round(v_expected_amount, 2),
    updated_by = p_actor_user_id,
    updated_at = now()
  where id = v_cycle.id;

  return v_cycle.id;
end;
$$;

grant execute on function public.fn_recompute_org_subscription_cycle(uuid, uuid, uuid) to authenticated;

create or replace function public.rpc_upsert_platform_billing_settings(
  p_bank_account_holder text default null,
  p_bank_name text default null,
  p_bank_account_type text default null,
  p_bank_cbu text default null,
  p_bank_alias text default null,
  p_bank_cuit text default null,
  p_mercadopago_qr_image_path text default null,
  p_payment_instructions text default null,
  p_is_active boolean default true
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

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  insert into public.platform_billing_settings (
    id,
    bank_account_holder,
    bank_name,
    bank_account_type,
    bank_cbu,
    bank_alias,
    bank_cuit,
    mercadopago_qr_image_path,
    payment_instructions,
    is_active,
    updated_by
  )
  values (
    true,
    nullif(trim(p_bank_account_holder), ''),
    nullif(trim(p_bank_name), ''),
    nullif(trim(p_bank_account_type), ''),
    nullif(trim(p_bank_cbu), ''),
    nullif(trim(p_bank_alias), ''),
    nullif(trim(p_bank_cuit), ''),
    nullif(trim(p_mercadopago_qr_image_path), ''),
    nullif(trim(p_payment_instructions), ''),
    coalesce(p_is_active, true),
    auth.uid()
  )
  on conflict (id) do update set
    bank_account_holder = excluded.bank_account_holder,
    bank_name = excluded.bank_name,
    bank_account_type = excluded.bank_account_type,
    bank_cbu = excluded.bank_cbu,
    bank_alias = excluded.bank_alias,
    bank_cuit = excluded.bank_cuit,
    mercadopago_qr_image_path = excluded.mercadopago_qr_image_path,
    payment_instructions = excluded.payment_instructions,
    is_active = excluded.is_active,
    updated_by = auth.uid(),
    updated_at = now();
end;
$$;

grant execute on function public.rpc_upsert_platform_billing_settings(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) to authenticated;

create or replace function public.rpc_upsert_org_subscription(
  p_org_id uuid,
  p_plan_id uuid default null,
  p_plan_name_snapshot text default null,
  p_pricing_mode public.subscription_pricing_mode default 'standard',
  p_currency_code text default 'ARS',
  p_base_price_monthly_snapshot numeric default 100000,
  p_included_branches_snapshot integer default 1,
  p_additional_branch_price_monthly_snapshot numeric default 80000,
  p_custom_monthly_price numeric default null,
  p_started_on date default null,
  p_renews_on date default null,
  p_service_status public.subscription_service_status default 'active',
  p_grace_until date default null,
  p_billing_notes_internal text default null,
  p_customer_note_visible text default null,
  p_is_auto_branch_pricing_enabled boolean default true,
  p_cycle_start_on date default null,
  p_cycle_end_on date default null,
  p_cycle_due_on date default null
)
returns table(subscription_id uuid, cycle_id uuid)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan public.subscription_plans%rowtype;
  v_subscription_id uuid;
  v_cycle_id uuid;
  v_effective_plan_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.orgs where id = p_org_id
  ) then
    raise exception 'org not found';
  end if;

  if p_plan_id is not null then
    select *
      into v_plan
    from public.subscription_plans sp
    where sp.id = p_plan_id;

    if v_plan.id is null then
      raise exception 'plan not found';
    end if;
  end if;

  v_effective_plan_name := coalesce(
    nullif(trim(p_plan_name_snapshot), ''),
    v_plan.name,
    'Plan Base'
  );

  insert into public.org_subscriptions (
    org_id,
    plan_id,
    pricing_mode,
    plan_name_snapshot,
    currency_code,
    base_price_monthly_snapshot,
    included_branches_snapshot,
    additional_branch_price_monthly_snapshot,
    custom_monthly_price,
    started_on,
    renews_on,
    service_status,
    grace_until,
    billing_notes_internal,
    customer_note_visible,
    is_auto_branch_pricing_enabled,
    created_by,
    updated_by
  )
  values (
    p_org_id,
    p_plan_id,
    coalesce(p_pricing_mode, 'standard'),
    v_effective_plan_name,
    coalesce(nullif(trim(p_currency_code), ''), coalesce(v_plan.currency_code, 'ARS')),
    coalesce(p_base_price_monthly_snapshot, v_plan.base_price_monthly, 100000),
    coalesce(p_included_branches_snapshot, v_plan.included_branches, 1),
    coalesce(p_additional_branch_price_monthly_snapshot, v_plan.additional_branch_price_monthly, 80000),
    p_custom_monthly_price,
    coalesce(p_started_on, current_date),
    coalesce(p_renews_on, current_date + 30),
    coalesce(p_service_status, 'active'),
    p_grace_until,
    nullif(trim(p_billing_notes_internal), ''),
    nullif(trim(p_customer_note_visible), ''),
    coalesce(p_is_auto_branch_pricing_enabled, true),
    auth.uid(),
    auth.uid()
  )
  on conflict (org_id) do update set
    plan_id = excluded.plan_id,
    pricing_mode = excluded.pricing_mode,
    plan_name_snapshot = excluded.plan_name_snapshot,
    currency_code = excluded.currency_code,
    base_price_monthly_snapshot = excluded.base_price_monthly_snapshot,
    included_branches_snapshot = excluded.included_branches_snapshot,
    additional_branch_price_monthly_snapshot = excluded.additional_branch_price_monthly_snapshot,
    custom_monthly_price = excluded.custom_monthly_price,
    started_on = excluded.started_on,
    renews_on = excluded.renews_on,
    service_status = excluded.service_status,
    grace_until = excluded.grace_until,
    billing_notes_internal = excluded.billing_notes_internal,
    customer_note_visible = excluded.customer_note_visible,
    is_auto_branch_pricing_enabled = excluded.is_auto_branch_pricing_enabled,
    updated_by = auth.uid(),
    updated_at = now()
  returning id into v_subscription_id;

  if p_cycle_start_on is not null and p_cycle_end_on is not null and p_cycle_due_on is not null then
    insert into public.org_subscription_cycles (
      org_subscription_id,
      cycle_start_on,
      cycle_end_on,
      due_on,
      created_by,
      updated_by
    )
    values (
      v_subscription_id,
      p_cycle_start_on,
      p_cycle_end_on,
      p_cycle_due_on,
      auth.uid(),
      auth.uid()
    )
    on conflict (org_subscription_id, cycle_start_on, cycle_end_on) do update set
      due_on = excluded.due_on,
      updated_by = auth.uid(),
      updated_at = now()
    returning id into v_cycle_id;

    v_cycle_id := public.fn_recompute_org_subscription_cycle(v_subscription_id, v_cycle_id, auth.uid());
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'org_subscription_upserted',
    'org_subscription',
    v_subscription_id,
    null,
    jsonb_build_object(
      'pricing_mode', coalesce(p_pricing_mode, 'standard'),
      'plan_id', p_plan_id,
      'plan_name_snapshot', v_effective_plan_name,
      'base_price_monthly_snapshot', coalesce(p_base_price_monthly_snapshot, v_plan.base_price_monthly, 100000),
      'included_branches_snapshot', coalesce(p_included_branches_snapshot, v_plan.included_branches, 1),
      'additional_branch_price_monthly_snapshot', coalesce(p_additional_branch_price_monthly_snapshot, v_plan.additional_branch_price_monthly, 80000),
      'custom_monthly_price', p_custom_monthly_price,
      'started_on', coalesce(p_started_on, current_date),
      'renews_on', coalesce(p_renews_on, current_date + 30),
      'service_status', coalesce(p_service_status, 'active'),
      'cycle_id', v_cycle_id
    ),
    auth.uid()
  );

  return query select v_subscription_id, v_cycle_id;
end;
$$;

grant execute on function public.rpc_upsert_org_subscription(
  uuid,
  uuid,
  text,
  public.subscription_pricing_mode,
  text,
  numeric,
  integer,
  numeric,
  numeric,
  date,
  date,
  public.subscription_service_status,
  date,
  text,
  text,
  boolean,
  date,
  date,
  date
) to authenticated;

create or replace function public.rpc_set_org_subscription_service_status(
  p_org_id uuid,
  p_service_status public.subscription_service_status,
  p_grace_until date default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_subscription_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  update public.org_subscriptions
  set
    service_status = p_service_status,
    grace_until = p_grace_until,
    updated_by = auth.uid(),
    updated_at = now()
  where org_id = p_org_id
  returning id into v_subscription_id;

  if v_subscription_id is null then
    raise exception 'subscription not found';
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'org_subscription_service_status_set',
    'org_subscription',
    v_subscription_id,
    null,
    jsonb_build_object(
      'service_status', p_service_status,
      'grace_until', p_grace_until,
      'reason', nullif(trim(p_reason), '')
    ),
    auth.uid()
  );

  return v_subscription_id;
end;
$$;

grant execute on function public.rpc_set_org_subscription_service_status(
  uuid,
  public.subscription_service_status,
  date,
  text
) to authenticated;

create or replace function public.rpc_set_org_subscription_cycle_payment_status(
  p_cycle_id uuid,
  p_payment_status public.subscription_payment_status,
  p_review_note text default null,
  p_payment_id uuid default null,
  p_paid_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_cycle public.org_subscription_cycles%rowtype;
  v_subscription public.org_subscriptions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  select *
    into v_cycle
  from public.org_subscription_cycles osc
  where osc.id = p_cycle_id
  for update;

  if v_cycle.id is null then
    raise exception 'subscription cycle not found';
  end if;

  select *
    into v_subscription
  from public.org_subscriptions os
  where os.id = v_cycle.org_subscription_id;

  if v_subscription.id is null then
    raise exception 'subscription not found';
  end if;

  update public.org_subscription_cycles
  set
    payment_status = p_payment_status,
    paid_at = case when p_payment_status = 'paid' then coalesce(p_paid_at, now()) else null end,
    payment_confirmed_at = case when p_payment_status in ('paid', 'waived', 'rejected') then now() else null end,
    payment_confirmed_by = case when p_payment_status in ('paid', 'waived', 'rejected') then auth.uid() else null end,
    rejection_reason = case when p_payment_status = 'rejected' then nullif(trim(p_review_note), '') else null end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_cycle_id;

  if p_payment_id is not null then
    update public.org_subscription_payments
    set
      review_status = case
        when p_payment_status = 'paid' then 'approved'
        when p_payment_status = 'rejected' then 'rejected'
        else review_status
      end,
      reviewed_by = case when p_payment_status in ('paid', 'rejected') then auth.uid() else reviewed_by end,
      reviewed_at = case when p_payment_status in ('paid', 'rejected') then now() else reviewed_at end,
      review_note = nullif(trim(p_review_note), '')
    where id = p_payment_id
      and org_subscription_cycle_id = p_cycle_id;
  end if;

  perform public.rpc_log_audit_event(
    v_subscription.org_id,
    'org_subscription_cycle_payment_status_set',
    'org_subscription_cycle',
    p_cycle_id,
    null,
    jsonb_build_object(
      'payment_status', p_payment_status,
      'payment_id', p_payment_id,
      'review_note', nullif(trim(p_review_note), '')
    ),
    auth.uid()
  );

  return p_cycle_id;
end;
$$;

grant execute on function public.rpc_set_org_subscription_cycle_payment_status(
  uuid,
  public.subscription_payment_status,
  text,
  uuid,
  timestamptz
) to authenticated;

create or replace function public.rpc_set_org_active_status(
  p_org_id uuid,
  p_is_active boolean,
  p_reason text default null
)
returns uuid
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

  update public.orgs
  set
    is_active = coalesce(p_is_active, true),
    updated_at = now()
  where id = p_org_id;

  if not found then
    raise exception 'org not found';
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'org_active_status_set',
    'org',
    p_org_id,
    null,
    jsonb_build_object(
      'is_active', coalesce(p_is_active, true),
      'reason', nullif(trim(p_reason), '')
    ),
    auth.uid()
  );

  return p_org_id;
end;
$$;

grant execute on function public.rpc_set_org_active_status(uuid, boolean, text) to authenticated;

create or replace function public.rpc_set_branch_active_status(
  p_branch_id uuid,
  p_is_active boolean,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_branch public.branches%rowtype;
  v_subscription_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  select *
    into v_branch
  from public.branches b
  where b.id = p_branch_id
  for update;

  if v_branch.id is null then
    raise exception 'branch not found';
  end if;

  update public.branches
  set
    is_active = coalesce(p_is_active, true),
    updated_at = now()
  where id = p_branch_id;

  select os.id
    into v_subscription_id
  from public.org_subscriptions os
  where os.org_id = v_branch.org_id;

  if v_subscription_id is not null then
    perform public.fn_recompute_org_subscription_cycle(v_subscription_id, null, auth.uid());
  end if;

  perform public.rpc_log_audit_event(
    v_branch.org_id,
    'branch_active_status_set',
    'branch',
    p_branch_id,
    p_branch_id,
    jsonb_build_object(
      'is_active', coalesce(p_is_active, true),
      'reason', nullif(trim(p_reason), '')
    ),
    auth.uid()
  );

  return p_branch_id;
end;
$$;

grant execute on function public.rpc_set_branch_active_status(uuid, boolean, text) to authenticated;

create or replace function public.rpc_create_org_subscription_payment_submission(
  p_cycle_id uuid,
  p_payment_method public.subscription_payment_method,
  p_amount_reported numeric,
  p_reference_text text default null,
  p_proof_storage_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_cycle public.org_subscription_cycles%rowtype;
  v_subscription public.org_subscriptions%rowtype;
  v_payment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select *
    into v_cycle
  from public.org_subscription_cycles osc
  where osc.id = p_cycle_id;

  if v_cycle.id is null then
    raise exception 'subscription cycle not found';
  end if;

  select *
    into v_subscription
  from public.org_subscriptions os
  where os.id = v_cycle.org_subscription_id;

  if v_subscription.id is null then
    raise exception 'subscription not found';
  end if;

  if not public.is_org_admin_or_superadmin(v_subscription.org_id) then
    raise exception 'not authorized';
  end if;

  insert into public.org_subscription_payments (
    org_subscription_cycle_id,
    org_id,
    payment_method,
    amount_reported,
    reference_text,
    proof_storage_path,
    proof_uploaded_by
  )
  values (
    p_cycle_id,
    v_subscription.org_id,
    p_payment_method,
    p_amount_reported,
    nullif(trim(p_reference_text), ''),
    nullif(trim(p_proof_storage_path), ''),
    auth.uid()
  )
  returning id into v_payment_id;

  update public.org_subscription_cycles
  set
    payment_status = 'proof_submitted',
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_cycle_id
    and payment_status in ('pending', 'rejected');

  perform public.rpc_log_audit_event(
    v_subscription.org_id,
    'org_subscription_payment_submitted',
    'org_subscription_payment',
    v_payment_id,
    null,
    jsonb_build_object(
      'cycle_id', p_cycle_id,
      'payment_method', p_payment_method,
      'amount_reported', p_amount_reported,
      'proof_storage_path', nullif(trim(p_proof_storage_path), '')
    ),
    auth.uid()
  );

  return v_payment_id;
end;
$$;

grant execute on function public.rpc_create_org_subscription_payment_submission(
  uuid,
  public.subscription_payment_method,
  numeric,
  text,
  text
) to authenticated;

create or replace view public.v_superadmin_subscriptions
with (security_invoker = true) as
select
  os.id as subscription_id,
  o.id as org_id,
  o.name as org_name,
  o.is_active as org_is_active,
  o.timezone,
  os.plan_id,
  os.plan_name_snapshot as plan_name,
  os.pricing_mode,
  os.currency_code,
  os.base_price_monthly_snapshot as base_price_monthly,
  os.included_branches_snapshot as included_branches,
  os.additional_branch_price_monthly_snapshot as additional_branch_price_monthly,
  calc.active_branch_count,
  calc.billable_additional_branch_count,
  calc.effective_monthly_price as calculated_monthly_price,
  os.custom_monthly_price,
  calc.effective_monthly_price as effective_monthly_price,
  os.started_on,
  os.renews_on,
  os.service_status,
  os.grace_until,
  osc.id as current_cycle_id,
  osc.cycle_start_on as current_cycle_start_on,
  osc.cycle_end_on as current_cycle_end_on,
  osc.due_on as current_cycle_due_on,
  osc.expected_amount as current_cycle_expected_amount,
  osc.payment_status as current_cycle_payment_status,
  osc.paid_at as current_cycle_paid_at,
  osc.payment_confirmed_at as current_cycle_payment_confirmed_at
from public.org_subscriptions os
join public.orgs o on o.id = os.org_id
cross join lateral public.fn_calculate_org_subscription_amount(
  os.org_id,
  os.pricing_mode,
  os.base_price_monthly_snapshot,
  os.included_branches_snapshot,
  os.additional_branch_price_monthly_snapshot,
  os.custom_monthly_price
) calc
left join lateral (
  select *
  from public.org_subscription_cycles osc
  where osc.org_subscription_id = os.id
  order by osc.cycle_start_on desc, osc.created_at desc
  limit 1
) osc on true;

grant select on public.v_superadmin_subscriptions to authenticated;

create or replace view public.v_superadmin_subscription_detail
with (security_invoker = true) as
select
  vss.*,
  b.id as branch_id,
  b.name as branch_name,
  b.is_active as branch_is_active,
  osp.id as payment_id,
  osp.payment_method,
  osp.amount_reported,
  osp.reference_text,
  osp.proof_storage_path,
  osp.proof_uploaded_by,
  osp.proof_uploaded_at,
  osp.review_status,
  osp.reviewed_by,
  osp.reviewed_at,
  osp.review_note,
  pbs.bank_account_holder,
  pbs.bank_name,
  pbs.bank_account_type,
  pbs.bank_cbu,
  pbs.bank_alias,
  pbs.bank_cuit,
  pbs.mercadopago_qr_image_path,
  pbs.payment_instructions,
  pbs.is_active as billing_settings_is_active
from public.v_superadmin_subscriptions vss
left join public.branches b on b.org_id = vss.org_id
left join public.org_subscription_payments osp on osp.org_subscription_cycle_id = vss.current_cycle_id
left join public.platform_billing_settings pbs on pbs.id = true;

grant select on public.v_superadmin_subscription_detail to authenticated;

create or replace view public.v_org_membership
with (security_invoker = true) as
select
  os.id as subscription_id,
  o.id as org_id,
  o.name as org_name,
  os.plan_name_snapshot as plan_name,
  os.pricing_mode,
  os.currency_code,
  os.service_status,
  os.started_on,
  os.renews_on,
  os.base_price_monthly_snapshot as base_price_monthly,
  os.included_branches_snapshot as included_branches,
  calc.active_branch_count,
  calc.billable_additional_branch_count,
  os.additional_branch_price_monthly_snapshot as additional_branch_price_monthly,
  calc.effective_monthly_price as effective_monthly_price,
  osc.id as current_cycle_id,
  osc.cycle_start_on as current_cycle_start_on,
  osc.cycle_end_on as current_cycle_end_on,
  osc.due_on as current_cycle_due_on,
  osc.expected_amount as current_cycle_expected_amount,
  osc.payment_status as current_cycle_payment_status,
  osc.rejection_reason as current_cycle_review_note,
  pbs.bank_account_holder,
  pbs.bank_name,
  pbs.bank_account_type,
  pbs.bank_cbu,
  pbs.bank_alias,
  pbs.bank_cuit,
  pbs.mercadopago_qr_image_path,
  pbs.payment_instructions
from public.org_subscriptions os
join public.orgs o on o.id = os.org_id
cross join lateral public.fn_calculate_org_subscription_amount(
  os.org_id,
  os.pricing_mode,
  os.base_price_monthly_snapshot,
  os.included_branches_snapshot,
  os.additional_branch_price_monthly_snapshot,
  os.custom_monthly_price
) calc
left join lateral (
  select *
  from public.org_subscription_cycles osc
  where osc.org_subscription_id = os.id
  order by osc.cycle_start_on desc, osc.created_at desc
  limit 1
) osc on true
left join public.platform_billing_settings pbs on pbs.id = true;

grant select on public.v_org_membership to authenticated;

create or replace view public.v_org_membership_payments
with (security_invoker = true) as
select
  osp.id as payment_id,
  osp.org_id,
  os.id as subscription_id,
  osc.id as cycle_id,
  osc.cycle_start_on,
  osc.cycle_end_on,
  osc.due_on,
  osp.payment_method,
  osp.amount_reported,
  osp.reference_text,
  osp.proof_storage_path,
  osp.proof_uploaded_at as submitted_at,
  osp.review_status,
  osp.review_note,
  osp.reviewed_at
from public.org_subscription_payments osp
join public.org_subscription_cycles osc on osc.id = osp.org_subscription_cycle_id
join public.org_subscriptions os on os.id = osc.org_subscription_id;

grant select on public.v_org_membership_payments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'subscription-payment-proofs',
  'subscription-payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists subscription_payment_proofs_select on storage.objects;
drop policy if exists subscription_payment_proofs_insert on storage.objects;
drop policy if exists subscription_payment_proofs_update on storage.objects;
drop policy if exists subscription_payment_proofs_delete on storage.objects;

create policy subscription_payment_proofs_select
  on storage.objects
  for select
  using (
    bucket_id = 'subscription-payment-proofs'
    and public.is_org_member((split_part(name, '/', 1))::uuid)
  );

create policy subscription_payment_proofs_insert
  on storage.objects
  for insert
  with check (
    bucket_id = 'subscription-payment-proofs'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

create policy subscription_payment_proofs_update
  on storage.objects
  for update
  using (
    bucket_id = 'subscription-payment-proofs'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

create policy subscription_payment_proofs_delete
  on storage.objects
  for delete
  using (
    bucket_id = 'subscription-payment-proofs'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );
