-- Storage bucket and policies for online order payment proofs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'online-order-proofs',
  'online-order-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists online_order_proofs_select on storage.objects;
drop policy if exists online_order_proofs_insert on storage.objects;
drop policy if exists online_order_proofs_update on storage.objects;
drop policy if exists online_order_proofs_delete on storage.objects;

create policy online_order_proofs_select
  on storage.objects
  for select
  using (
    bucket_id = 'online-order-proofs'
    and public.is_org_member((split_part(name, '/', 1))::uuid)
  );

create policy online_order_proofs_insert
  on storage.objects
  for insert
  with check (
    bucket_id = 'online-order-proofs'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

create policy online_order_proofs_update
  on storage.objects
  for update
  using (
    bucket_id = 'online-order-proofs'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

create policy online_order_proofs_delete
  on storage.objects
  for delete
  using (
    bucket_id = 'online-order-proofs'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );
