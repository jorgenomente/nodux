-- Product images: storage bucket + policies and expose image_url in v_products_admin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  262144,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_insert on storage.objects;
drop policy if exists product_images_update on storage.objects;
drop policy if exists product_images_delete on storage.objects;

create policy product_images_insert
  on storage.objects
  for insert
  with check (
    bucket_id = 'product-images'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

create policy product_images_update
  on storage.objects
  for update
  using (
    bucket_id = 'product-images'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

create policy product_images_delete
  on storage.objects
  for delete
  using (
    bucket_id = 'product-images'
    and public.is_org_admin_or_superadmin((split_part(name, '/', 1))::uuid)
  );

drop view if exists public.v_products_admin;

create view public.v_products_admin as
select
  p.id as product_id,
  p.org_id,
  p.name,
  p.brand,
  p.internal_code,
  p.barcode,
  p.sell_unit_type,
  p.uom,
  p.unit_price,
  p.image_url,
  p.is_active,
  p.created_at,
  p.updated_at,
  coalesce(sum(coalesce(si.quantity_on_hand, 0)), 0) as stock_total,
  jsonb_agg(
    jsonb_build_object(
      'branch_id', b.id,
      'branch_name', b.name,
      'quantity_on_hand', coalesce(si.quantity_on_hand, 0)
    )
    order by b.name
  ) as stock_by_branch,
  p.shelf_life_days
from public.products p
join public.branches b
  on b.org_id = p.org_id
left join public.stock_items si
  on si.product_id = p.id
  and si.branch_id = b.id
  and si.org_id = p.org_id
group by p.id;
