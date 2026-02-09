-- Extend rpc_upsert_supplier with scheduling fields

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
  p_receive_day public.weekday default null
)
returns table (supplier_id uuid)
language sql
as $$
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
    receive_day
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    p_name,
    p_contact_name,
    p_phone,
    p_email,
    p_notes,
    coalesce(p_is_active, true),
    p_order_frequency,
    p_order_day,
    p_receive_day
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
    receive_day = excluded.receive_day
  returning id;
$$;
