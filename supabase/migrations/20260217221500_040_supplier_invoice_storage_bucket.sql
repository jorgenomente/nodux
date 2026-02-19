-- Storage bucket and policies for compressed supplier invoice images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-invoices',
  'supplier-invoices',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists supplier_invoices_select on storage.objects;
drop policy if exists supplier_invoices_insert on storage.objects;
drop policy if exists supplier_invoices_update on storage.objects;
drop policy if exists supplier_invoices_delete on storage.objects;

create policy supplier_invoices_select
  on storage.objects
  for select
  using (
    bucket_id = 'supplier-invoices'
    and public.is_org_member((split_part(name, '/', 1))::uuid)
  );

create policy supplier_invoices_insert
  on storage.objects
  for insert
  with check (
    bucket_id = 'supplier-invoices'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

create policy supplier_invoices_update
  on storage.objects
  for update
  using (
    bucket_id = 'supplier-invoices'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

create policy supplier_invoices_delete
  on storage.objects
  for delete
  using (
    bucket_id = 'supplier-invoices'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );
