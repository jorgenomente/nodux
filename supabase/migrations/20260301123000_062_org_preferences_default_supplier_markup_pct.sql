-- Org-level default markup percent used as fallback for supplier pricing suggestions.

alter table public.org_preferences
  add column if not exists default_supplier_markup_pct numeric(6,2);

update public.org_preferences
set default_supplier_markup_pct = 40
where default_supplier_markup_pct is null;

alter table public.org_preferences
  alter column default_supplier_markup_pct set default 40,
  alter column default_supplier_markup_pct set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'org_preferences_default_supplier_markup_pct_ck'
  ) then
    alter table public.org_preferences
      add constraint org_preferences_default_supplier_markup_pct_ck
      check (
        default_supplier_markup_pct >= 0
        and default_supplier_markup_pct <= 1000
      );
  end if;
end
$$;
