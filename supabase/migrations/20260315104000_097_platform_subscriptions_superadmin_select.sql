-- Allow platform admins to read subscription billing objects cross-org.

drop policy if exists org_subscriptions_select on public.org_subscriptions;

create policy org_subscriptions_select
  on public.org_subscriptions
  for select
  using (
    public.is_org_member(org_id)
    or public.is_platform_admin()
  );

drop policy if exists org_subscription_cycles_select on public.org_subscription_cycles;

create policy org_subscription_cycles_select
  on public.org_subscription_cycles
  for select
  using (
    exists (
      select 1
      from public.org_subscriptions os
      where os.id = org_subscription_cycles.org_subscription_id
        and (
          public.is_org_member(os.org_id)
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists org_subscription_payments_select on public.org_subscription_payments;

create policy org_subscription_payments_select
  on public.org_subscription_payments
  for select
  using (
    public.is_org_member(org_id)
    or public.is_platform_admin()
  );
