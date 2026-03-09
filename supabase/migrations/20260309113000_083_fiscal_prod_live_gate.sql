alter table public.org_preferences
  add column if not exists fiscal_prod_live_enabled boolean;

update public.org_preferences
set fiscal_prod_live_enabled = false
where fiscal_prod_live_enabled is null;

alter table public.org_preferences
  alter column fiscal_prod_live_enabled set default false,
  alter column fiscal_prod_live_enabled set not null;

comment on column public.org_preferences.fiscal_prod_live_enabled is
'Gate org-wide para permitir FECAESolicitar real en ambiente prod desde el worker fiscal.';
