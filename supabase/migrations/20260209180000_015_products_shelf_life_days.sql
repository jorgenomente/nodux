-- Add approximate shelf life days to products

alter table public.products
  add column if not exists shelf_life_days integer;

alter table public.products
  add constraint products_shelf_life_days_nonnegative
  check (shelf_life_days is null or shelf_life_days >= 0);
