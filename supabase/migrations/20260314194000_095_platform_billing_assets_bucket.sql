-- Private bucket for platform billing assets (for example Mercado Pago QR images).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'platform-billing-assets',
  'platform-billing-assets',
  false,
  3145728,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
