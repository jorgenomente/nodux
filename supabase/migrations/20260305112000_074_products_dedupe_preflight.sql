-- Preflight para entornos remotos con catalogo historico duplicado.
-- Objetivo: evitar fallo al crear indices unicos de name/barcode normalizados en migracion 075.

create or replace function public.normalize_product_catalog_text(p_value text)
returns text
language sql
immutable
strict
as $$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          translate(
            lower(trim(p_value)),
            'áàäâãéèëêíìïîóòöôõúùüûñç',
            'aaaaaeeeeiiiiooooouuuunc'
          ),
          '[^a-z0-9]+',
          ' ',
          'g'
        ),
        '[[:space:]]+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

-- Si hay nombres duplicados por organizacion (normalizados),
-- conserva el primero y renombra el resto para preservar historial sin perder filas.
with ranked_name as (
  select
    id,
    row_number() over (
      partition by org_id, public.normalize_product_catalog_text(name)
      order by created_at asc nulls last, id asc
    ) as rn
  from public.products
  where public.normalize_product_catalog_text(name) is not null
)
update public.products p
set name = trim(p.name) || ' (dup ' || substr(p.id::text, 1, 8) || ')'
from ranked_name r
where p.id = r.id
  and r.rn > 1;

-- Si hay barcodes duplicados por organizacion (normalizados),
-- conserva el primero y limpia barcode en el resto para pasar restriccion unica.
with ranked_barcode as (
  select
    id,
    row_number() over (
      partition by org_id, nullif(regexp_replace(coalesce(barcode, ''), '[^0-9]', '', 'g'), '')
      order by created_at asc nulls last, id asc
    ) as rn
  from public.products
  where nullif(regexp_replace(coalesce(barcode, ''), '[^0-9]', '', 'g'), '') is not null
)
update public.products p
set barcode = null
from ranked_barcode r
where p.id = r.id
  and r.rn > 1;
