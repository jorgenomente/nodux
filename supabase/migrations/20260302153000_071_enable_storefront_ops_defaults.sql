-- Enable storefront operations defaults for all existing orgs/branches.
-- Idempotent data migration for remote rollout.

insert into public.storefront_settings (
  org_id,
  is_enabled,
  allow_out_of_stock_order,
  whatsapp_phone,
  pickup_instructions
)
select
  o.id,
  true,
  false,
  null,
  null
from public.orgs o
on conflict (org_id) do update
set
  is_enabled = true,
  updated_at = now();

update public.storefront_settings ss
set
  is_enabled = true,
  updated_at = now()
where ss.is_enabled is distinct from true;

update public.branches b
set storefront_whatsapp_phone = ss.whatsapp_phone
from public.storefront_settings ss
where ss.org_id = b.org_id
  and b.is_active
  and (b.storefront_whatsapp_phone is null or btrim(b.storefront_whatsapp_phone) = '')
  and ss.whatsapp_phone is not null
  and btrim(ss.whatsapp_phone) <> '';
