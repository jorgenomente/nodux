do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_discount_mode'
  ) then
    create type public.subscription_discount_mode as enum ('none', 'percent', 'fixed_amount');
  end if;
end $$;

alter table public.org_subscriptions
  add column if not exists discount_mode public.subscription_discount_mode not null default 'none',
  add column if not exists discount_percent numeric(5,2),
  add column if not exists discount_amount numeric(12,2),
  add column if not exists discount_label text;

alter table public.org_subscriptions
  drop constraint if exists org_subscriptions_discount_percent_range_ck,
  add constraint org_subscriptions_discount_percent_range_ck
    check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  drop constraint if exists org_subscriptions_discount_amount_nonnegative_ck,
  add constraint org_subscriptions_discount_amount_nonnegative_ck
    check (discount_amount is null or discount_amount >= 0),
  drop constraint if exists org_subscriptions_discount_mode_value_ck,
  add constraint org_subscriptions_discount_mode_value_ck
    check (
      (discount_mode = 'none' and discount_percent is null and discount_amount is null)
      or (discount_mode = 'percent' and discount_percent is not null and discount_amount is null)
      or (discount_mode = 'fixed_amount' and discount_amount is not null and discount_percent is null)
    );

alter table public.org_subscription_cycles
  add column if not exists list_price_amount numeric(12,2) not null default 0,
  add column if not exists discount_amount_applied numeric(12,2) not null default 0,
  add column if not exists final_amount numeric(12,2) not null default 0,
  add column if not exists discount_mode_snapshot public.subscription_discount_mode not null default 'none',
  add column if not exists discount_percent_snapshot numeric(5,2),
  add column if not exists discount_amount_snapshot numeric(12,2),
  add column if not exists discount_label_snapshot text;

alter table public.org_subscription_cycles
  drop constraint if exists org_subscription_cycles_list_price_amount_nonnegative_ck,
  add constraint org_subscription_cycles_list_price_amount_nonnegative_ck
    check (list_price_amount >= 0),
  drop constraint if exists org_subscription_cycles_discount_amount_applied_nonnegative_ck,
  add constraint org_subscription_cycles_discount_amount_applied_nonnegative_ck
    check (discount_amount_applied >= 0),
  drop constraint if exists org_subscription_cycles_final_amount_nonnegative_ck,
  add constraint org_subscription_cycles_final_amount_nonnegative_ck
    check (final_amount >= 0),
  drop constraint if exists org_subscription_cycles_discount_percent_snapshot_range_ck,
  add constraint org_subscription_cycles_discount_percent_snapshot_range_ck
    check (
      discount_percent_snapshot is null
      or (discount_percent_snapshot >= 0 and discount_percent_snapshot <= 100)
    ),
  drop constraint if exists org_subscription_cycles_discount_amount_snapshot_nonnegative_ck,
  add constraint org_subscription_cycles_discount_amount_snapshot_nonnegative_ck
    check (discount_amount_snapshot is null or discount_amount_snapshot >= 0);

create or replace function public.fn_calculate_org_subscription_amount(
  p_org_id uuid,
  p_pricing_mode public.subscription_pricing_mode,
  p_base_price_monthly numeric,
  p_included_branches integer,
  p_additional_branch_price_monthly numeric,
  p_custom_monthly_price numeric default null,
  p_discount_mode public.subscription_discount_mode default 'none',
  p_discount_percent numeric default null,
  p_discount_amount numeric default null
)
returns table(
  active_branch_count integer,
  billable_additional_branch_count integer,
  list_price_monthly numeric,
  discount_amount_applied numeric,
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
  ),
  base_price as (
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
      ) as list_price_monthly
    from branch_counts bc
  )
  select
    bp.active_branch_count,
    bp.billable_additional_branch_count,
    bp.list_price_monthly,
    round(
      least(
        bp.list_price_monthly,
        case
          when p_discount_mode = 'percent' then
            bp.list_price_monthly * coalesce(p_discount_percent, 0) / 100
          when p_discount_mode = 'fixed_amount' then
            coalesce(p_discount_amount, 0)
          else 0
        end
      ),
      2
    ) as discount_amount_applied,
    round(
      bp.list_price_monthly
      - least(
          bp.list_price_monthly,
          case
            when p_discount_mode = 'percent' then
              bp.list_price_monthly * coalesce(p_discount_percent, 0) / 100
            when p_discount_mode = 'fixed_amount' then
              coalesce(p_discount_amount, 0)
            else 0
          end
        ),
      2
    ) as effective_monthly_price
  from base_price bp;
$$;

grant execute on function public.fn_calculate_org_subscription_amount(
  uuid,
  public.subscription_pricing_mode,
  numeric,
  integer,
  numeric,
  numeric,
  public.subscription_discount_mode,
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
  v_list_price_amount numeric(12,2) := 0;
  v_discount_amount_applied numeric(12,2) := 0;
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
         calc.list_price_monthly,
         calc.discount_amount_applied,
         calc.effective_monthly_price
    into v_active_branch_count, v_billable_branch_count, v_list_price_amount, v_discount_amount_applied, v_expected_amount
  from public.fn_calculate_org_subscription_amount(
    v_subscription.org_id,
    v_subscription.pricing_mode,
    v_subscription.base_price_monthly_snapshot,
    v_subscription.included_branches_snapshot,
    v_subscription.additional_branch_price_monthly_snapshot,
    v_subscription.custom_monthly_price,
    v_subscription.discount_mode,
    v_subscription.discount_percent,
    v_subscription.discount_amount
  ) calc;

  update public.org_subscription_cycles
  set
    active_branch_count_snapshot = v_active_branch_count,
    billable_additional_branch_count_snapshot = v_billable_branch_count,
    list_price_amount = round(v_list_price_amount, 2),
    discount_amount_applied = round(v_discount_amount_applied, 2),
    final_amount = round(v_expected_amount, 2),
    expected_amount = round(v_expected_amount, 2),
    discount_mode_snapshot = v_subscription.discount_mode,
    discount_percent_snapshot = v_subscription.discount_percent,
    discount_amount_snapshot = v_subscription.discount_amount,
    discount_label_snapshot = nullif(trim(v_subscription.discount_label), ''),
    updated_by = p_actor_user_id,
    updated_at = now()
  where id = v_cycle.id;

  return v_cycle.id;
end;
$$;

grant execute on function public.fn_recompute_org_subscription_cycle(uuid, uuid, uuid) to authenticated;

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
  p_discount_mode public.subscription_discount_mode default 'none',
  p_discount_percent numeric default null,
  p_discount_amount numeric default null,
  p_discount_label text default null,
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
    discount_mode,
    discount_percent,
    discount_amount,
    discount_label,
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
    coalesce(p_discount_mode, 'none'),
    p_discount_percent,
    p_discount_amount,
    nullif(trim(p_discount_label), ''),
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
    discount_mode = excluded.discount_mode,
    discount_percent = excluded.discount_percent,
    discount_amount = excluded.discount_amount,
    discount_label = excluded.discount_label,
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
      'discount_mode', coalesce(p_discount_mode, 'none'),
      'discount_percent', p_discount_percent,
      'discount_amount', p_discount_amount,
      'discount_label', nullif(trim(p_discount_label), ''),
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
  public.subscription_discount_mode,
  numeric,
  numeric,
  text,
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

drop view if exists public.v_superadmin_subscription_detail;
drop view if exists public.v_org_membership_payments;
drop view if exists public.v_org_membership;
drop view if exists public.v_superadmin_subscriptions;

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
  os.discount_mode,
  os.discount_percent,
  os.discount_amount,
  os.discount_label,
  calc.active_branch_count,
  calc.billable_additional_branch_count,
  calc.list_price_monthly as calculated_monthly_price,
  calc.list_price_monthly,
  calc.discount_amount_applied,
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
  osc.list_price_amount as current_cycle_list_price_amount,
  osc.discount_amount_applied as current_cycle_discount_amount_applied,
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
  os.custom_monthly_price,
  os.discount_mode,
  os.discount_percent,
  os.discount_amount
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
  os.additional_branch_price_monthly_snapshot as additional_branch_price_monthly,
  os.discount_mode,
  os.discount_percent,
  os.discount_amount,
  os.discount_label,
  calc.active_branch_count,
  calc.billable_additional_branch_count,
  calc.list_price_monthly,
  calc.discount_amount_applied,
  calc.effective_monthly_price as effective_monthly_price,
  osc.id as current_cycle_id,
  osc.cycle_start_on as current_cycle_start_on,
  osc.cycle_end_on as current_cycle_end_on,
  osc.due_on as current_cycle_due_on,
  osc.list_price_amount as current_cycle_list_price_amount,
  osc.discount_amount_applied as current_cycle_discount_amount_applied,
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
  os.custom_monthly_price,
  os.discount_mode,
  os.discount_percent,
  os.discount_amount
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
