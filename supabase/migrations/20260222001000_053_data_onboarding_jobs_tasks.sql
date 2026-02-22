-- Data onboarding foundation: import jobs + pending tasks + validation/apply RPCs.

create table if not exists public.data_import_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  template_key text not null,
  source_file_name text not null,
  source_file_path text,
  status text not null default 'uploaded',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  applied_rows integer not null default 0,
  errors_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_import_jobs_template_key_ck check (
    template_key in ('products', 'suppliers', 'products_suppliers')
  ),
  constraint data_import_jobs_status_ck check (
    status in ('uploaded', 'validated', 'applied', 'failed')
  ),
  constraint data_import_jobs_source_file_name_not_blank_ck check (length(trim(source_file_name)) > 0),
  constraint data_import_jobs_counts_non_negative_ck check (
    total_rows >= 0 and valid_rows >= 0 and invalid_rows >= 0 and applied_rows >= 0
  )
);

create index if not exists data_import_jobs_org_created_idx
  on public.data_import_jobs (org_id, created_at desc);

create table if not exists public.data_import_rows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  job_id uuid not null references public.data_import_jobs(id) on delete cascade,
  row_number integer not null,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  validation_errors jsonb,
  is_valid boolean not null default false,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_import_rows_row_number_positive_ck check (row_number > 0),
  constraint data_import_rows_raw_payload_object_ck check (jsonb_typeof(raw_payload) = 'object')
);

create unique index if not exists data_import_rows_job_row_unique
  on public.data_import_rows (job_id, row_number);

create index if not exists data_import_rows_org_job_idx
  on public.data_import_rows (org_id, job_id, row_number);

create trigger trg_data_import_jobs_set_updated_at
before update on public.data_import_jobs
for each row
execute function public.set_updated_at();

create trigger trg_data_import_rows_set_updated_at
before update on public.data_import_rows
for each row
execute function public.set_updated_at();

alter table public.data_import_jobs enable row level security;
alter table public.data_import_rows enable row level security;

drop policy if exists data_import_jobs_select on public.data_import_jobs;
create policy data_import_jobs_select
on public.data_import_jobs
for select
using (public.is_org_admin_or_superadmin(org_id));

drop policy if exists data_import_jobs_write on public.data_import_jobs;
create policy data_import_jobs_write
on public.data_import_jobs
for insert
with check (public.is_org_admin_or_superadmin(org_id));

drop policy if exists data_import_jobs_update on public.data_import_jobs;
create policy data_import_jobs_update
on public.data_import_jobs
for update
using (public.is_org_admin_or_superadmin(org_id));

drop policy if exists data_import_rows_select on public.data_import_rows;
create policy data_import_rows_select
on public.data_import_rows
for select
using (public.is_org_admin_or_superadmin(org_id));

drop policy if exists data_import_rows_write on public.data_import_rows;
create policy data_import_rows_write
on public.data_import_rows
for insert
with check (public.is_org_admin_or_superadmin(org_id));

drop policy if exists data_import_rows_update on public.data_import_rows;
create policy data_import_rows_update
on public.data_import_rows
for update
using (public.is_org_admin_or_superadmin(org_id));

create or replace view public.v_data_onboarding_tasks
with (security_invoker = true) as
with product_primary as (
  select distinct sp.org_id, sp.product_id
  from public.supplier_products sp
  where sp.relation_type = 'primary'
),
tasks as (
  select
    p.org_id,
    'products_without_primary_supplier'::text as task_key,
    'Productos sin proveedor primario'::text as task_label,
    count(*)::bigint as pending_count
  from public.products p
  left join product_primary pp
    on pp.org_id = p.org_id
   and pp.product_id = p.id
  where p.is_active = true
    and pp.product_id is null
  group by p.org_id

  union all

  select
    p.org_id,
    'products_without_shelf_life'::text as task_key,
    'Productos sin vencimiento aproximado (dias)'::text as task_label,
    count(*)::bigint as pending_count
  from public.products p
  where p.is_active = true
    and p.shelf_life_days is null
  group by p.org_id

  union all

  select
    p.org_id,
    'products_without_identifier'::text as task_key,
    'Productos sin barcode ni codigo interno'::text as task_label,
    count(*)::bigint as pending_count
  from public.products p
  where p.is_active = true
    and nullif(trim(coalesce(p.barcode, '')), '') is null
    and nullif(trim(coalesce(p.internal_code, '')), '') is null
  group by p.org_id

  union all

  select
    s.org_id,
    'suppliers_without_payment_terms'::text as task_key,
    'Proveedores sin plazo de pago'::text as task_label,
    count(*)::bigint as pending_count
  from public.suppliers s
  where s.is_active = true
    and s.payment_terms_days is null
  group by s.org_id

  union all

  select
    s.org_id,
    'suppliers_without_preferred_payment_method'::text as task_key,
    'Proveedores sin metodo de pago preferido'::text as task_label,
    count(*)::bigint as pending_count
  from public.suppliers s
  where s.is_active = true
    and s.preferred_payment_method is null
  group by s.org_id
)
select
  t.org_id,
  t.task_key,
  t.task_label,
  t.pending_count,
  now() as last_calculated_at
from tasks t;

create or replace function public.rpc_create_data_import_job(
  p_org_id uuid,
  p_template_key text,
  p_source_file_name text,
  p_source_file_path text default null
)
returns table (
  job_id uuid
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_template_key not in ('products', 'suppliers', 'products_suppliers') then
    raise exception 'invalid template key';
  end if;

  if nullif(trim(coalesce(p_source_file_name, '')), '') is null then
    raise exception 'source file name is required';
  end if;

  return query
  insert into public.data_import_jobs (
    org_id,
    created_by,
    template_key,
    source_file_name,
    source_file_path,
    status
  )
  values (
    p_org_id,
    auth.uid(),
    p_template_key,
    trim(p_source_file_name),
    nullif(trim(coalesce(p_source_file_path, '')), ''),
    'uploaded'
  )
  returning id;
end;
$$;

create or replace function public.rpc_upsert_data_import_row(
  p_org_id uuid,
  p_job_id uuid,
  p_row_number integer,
  p_raw_payload jsonb,
  p_normalized_payload jsonb default null
)
returns table (
  row_id uuid
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_job record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_row_number is null or p_row_number <= 0 then
    raise exception 'invalid row number';
  end if;

  if p_raw_payload is null or jsonb_typeof(p_raw_payload) <> 'object' then
    raise exception 'raw payload must be a json object';
  end if;

  select j.*
  into v_job
  from public.data_import_jobs j
  where j.id = p_job_id
    and j.org_id = p_org_id;

  if not found then
    raise exception 'data import job not found';
  end if;

  return query
  insert into public.data_import_rows (
    org_id,
    job_id,
    row_number,
    raw_payload,
    normalized_payload,
    validation_errors,
    is_valid,
    applied_at
  )
  values (
    p_org_id,
    p_job_id,
    p_row_number,
    p_raw_payload,
    p_normalized_payload,
    null,
    false,
    null
  )
  on conflict (job_id, row_number)
  do update
    set raw_payload = excluded.raw_payload,
        normalized_payload = excluded.normalized_payload,
        validation_errors = null,
        is_valid = false,
        applied_at = null,
        updated_at = now()
  returning id;
end;
$$;

create or replace function public.rpc_validate_data_import_job(
  p_org_id uuid,
  p_job_id uuid
)
returns table (
  total_rows integer,
  valid_rows integer,
  invalid_rows integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_job record;
  v_row record;
  v_payload jsonb;
  v_errors jsonb;
  v_product_name text;
  v_supplier_name text;
  v_price numeric;
  v_total integer := 0;
  v_valid integer := 0;
  v_invalid integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  select j.*
  into v_job
  from public.data_import_jobs j
  where j.id = p_job_id
    and j.org_id = p_org_id;

  if not found then
    raise exception 'data import job not found';
  end if;

  for v_row in
    select r.id, r.raw_payload, r.normalized_payload
    from public.data_import_rows r
    where r.org_id = p_org_id
      and r.job_id = p_job_id
    order by r.row_number
  loop
    v_total := v_total + 1;
    v_payload := coalesce(v_row.normalized_payload, v_row.raw_payload);
    v_errors := '[]'::jsonb;

    if v_job.template_key in ('products', 'products_suppliers') then
      v_product_name := nullif(trim(coalesce(v_payload ->> 'product_name', v_payload ->> 'name', '')), '');
      if v_product_name is null then
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object('field', 'product_name', 'message', 'required')
        );
      end if;

      if nullif(trim(coalesce(v_payload ->> 'unit_price', '')), '') is not null then
        begin
          v_price := (v_payload ->> 'unit_price')::numeric;
          if v_price < 0 then
            v_errors := v_errors || jsonb_build_array(
              jsonb_build_object('field', 'unit_price', 'message', 'must be >= 0')
            );
          end if;
        exception when others then
          v_errors := v_errors || jsonb_build_array(
            jsonb_build_object('field', 'unit_price', 'message', 'must be numeric')
          );
        end;
      end if;
    end if;

    if v_job.template_key in ('suppliers', 'products_suppliers') then
      v_supplier_name := nullif(trim(coalesce(v_payload ->> 'supplier_name', v_payload ->> 'supplier', '')), '');
      if v_supplier_name is null then
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object('field', 'supplier_name', 'message', 'required')
        );
      end if;
    end if;

    update public.data_import_rows
    set
      validation_errors = case when jsonb_array_length(v_errors) = 0 then null else v_errors end,
      is_valid = (jsonb_array_length(v_errors) = 0),
      applied_at = null,
      updated_at = now()
    where id = v_row.id;

    if jsonb_array_length(v_errors) = 0 then
      v_valid := v_valid + 1;
    else
      v_invalid := v_invalid + 1;
    end if;
  end loop;

  update public.data_import_jobs
  set
    status = 'validated',
    total_rows = v_total,
    valid_rows = v_valid,
    invalid_rows = v_invalid,
    errors_summary = jsonb_build_object(
      'invalid_rows', v_invalid,
      'valid_rows', v_valid
    ),
    updated_at = now()
  where id = p_job_id
    and org_id = p_org_id;

  return query
  select v_total, v_valid, v_invalid;
end;
$$;

create or replace function public.rpc_apply_data_import_job(
  p_org_id uuid,
  p_job_id uuid,
  p_apply_mode text default 'valid_only'
)
returns table (
  applied_rows integer,
  skipped_rows integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_job record;
  v_row record;
  v_payload jsonb;
  v_product_id uuid;
  v_supplier_id uuid;
  v_product_name text;
  v_supplier_name text;
  v_internal_code text;
  v_barcode text;
  v_sell_unit_type public.sell_unit_type;
  v_uom text;
  v_unit_price numeric;
  v_shelf_life_days integer;
  v_relation_type public.supplier_product_relation_type;
  v_order_frequency public.order_frequency;
  v_order_day public.weekday;
  v_receive_day public.weekday;
  v_payment_terms_days integer;
  v_preferred_payment_method public.payment_method;
  v_accepts_cash boolean;
  v_accepts_transfer boolean;
  v_is_active boolean;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_errors jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_apply_mode <> 'valid_only' then
    raise exception 'unsupported apply mode';
  end if;

  select j.*
  into v_job
  from public.data_import_jobs j
  where j.id = p_job_id
    and j.org_id = p_org_id;

  if not found then
    raise exception 'data import job not found';
  end if;

  if v_job.status = 'uploaded' then
    perform * from public.rpc_validate_data_import_job(p_org_id, p_job_id);
    select j.*
    into v_job
    from public.data_import_jobs j
    where j.id = p_job_id
      and j.org_id = p_org_id;
  end if;

  for v_row in
    select r.id, r.raw_payload, r.normalized_payload, r.validation_errors
    from public.data_import_rows r
    where r.org_id = p_org_id
      and r.job_id = p_job_id
      and r.is_valid = true
      and r.applied_at is null
    order by r.row_number
  loop
    begin
      v_payload := coalesce(v_row.normalized_payload, v_row.raw_payload);

      v_product_id := null;
      v_supplier_id := null;

      if v_job.template_key in ('products', 'products_suppliers') then
        v_product_name := trim(coalesce(v_payload ->> 'product_name', v_payload ->> 'name', ''));
        v_internal_code := nullif(trim(coalesce(v_payload ->> 'internal_code', '')), '');
        v_barcode := nullif(trim(coalesce(v_payload ->> 'barcode', '')), '');

        v_sell_unit_type := case lower(trim(coalesce(v_payload ->> 'sell_unit_type', 'unit')))
          when 'unit' then 'unit'::public.sell_unit_type
          when 'weight' then 'weight'::public.sell_unit_type
          when 'bulk' then 'bulk'::public.sell_unit_type
          else 'unit'::public.sell_unit_type
        end;

        v_uom := nullif(trim(coalesce(v_payload ->> 'uom', 'unit')), '');
        if v_uom is null then
          v_uom := 'unit';
        end if;

        begin
          v_unit_price := coalesce(nullif(trim(coalesce(v_payload ->> 'unit_price', '')), '')::numeric, 0);
        exception when others then
          v_unit_price := 0;
        end;

        begin
          v_shelf_life_days := nullif(trim(coalesce(v_payload ->> 'shelf_life_days', v_payload ->> 'vencimiento_aproximado_dias', '')), '')::integer;
        exception when others then
          v_shelf_life_days := null;
        end;

        v_is_active := case lower(trim(coalesce(v_payload ->> 'is_active', 'true')))
          when 'false' then false
          when '0' then false
          when 'no' then false
          else true
        end;

        if v_barcode is not null then
          select p.id
          into v_product_id
          from public.products p
          where p.org_id = p_org_id
            and p.barcode = v_barcode
          limit 1;
        end if;

        if v_product_id is null and v_internal_code is not null then
          select p.id
          into v_product_id
          from public.products p
          where p.org_id = p_org_id
            and p.internal_code = v_internal_code
          limit 1;
        end if;

        if v_product_id is null then
          select p.id
          into v_product_id
          from public.products p
          where p.org_id = p_org_id
            and lower(trim(p.name)) = lower(trim(v_product_name))
          limit 1;
        end if;

        select p.product_id
        into v_product_id
        from public.rpc_upsert_product(
          v_product_id,
          p_org_id,
          v_product_name,
          v_internal_code,
          v_barcode,
          v_sell_unit_type,
          v_uom,
          greatest(v_unit_price, 0),
          v_is_active,
          v_shelf_life_days
        ) p;
      end if;

      if v_job.template_key in ('suppliers', 'products_suppliers') then
        v_supplier_name := trim(coalesce(v_payload ->> 'supplier_name', v_payload ->> 'supplier', ''));

        begin
          v_payment_terms_days := nullif(trim(coalesce(v_payload ->> 'payment_terms_days', '')), '')::integer;
        exception when others then
          v_payment_terms_days := null;
        end;

        v_preferred_payment_method := case lower(trim(coalesce(v_payload ->> 'preferred_payment_method', '')))
          when 'cash' then 'cash'::public.payment_method
          when 'transfer' then 'transfer'::public.payment_method
          else null
        end;

        v_accepts_cash := case lower(trim(coalesce(v_payload ->> 'accepts_cash', 'true')))
          when 'false' then false
          when '0' then false
          when 'no' then false
          else true
        end;

        v_accepts_transfer := case lower(trim(coalesce(v_payload ->> 'accepts_transfer', 'true')))
          when 'false' then false
          when '0' then false
          when 'no' then false
          else true
        end;

        v_order_frequency := case lower(trim(coalesce(v_payload ->> 'order_frequency', '')))
          when 'weekly' then 'weekly'::public.order_frequency
          when 'biweekly' then 'biweekly'::public.order_frequency
          when 'every_3_weeks' then 'every_3_weeks'::public.order_frequency
          when 'monthly' then 'monthly'::public.order_frequency
          else null
        end;

        v_order_day := case lower(trim(coalesce(v_payload ->> 'order_day', '')))
          when 'mon' then 'mon'::public.weekday
          when 'tue' then 'tue'::public.weekday
          when 'wed' then 'wed'::public.weekday
          when 'thu' then 'thu'::public.weekday
          when 'fri' then 'fri'::public.weekday
          when 'sat' then 'sat'::public.weekday
          when 'sun' then 'sun'::public.weekday
          else null
        end;

        v_receive_day := case lower(trim(coalesce(v_payload ->> 'receive_day', '')))
          when 'mon' then 'mon'::public.weekday
          when 'tue' then 'tue'::public.weekday
          when 'wed' then 'wed'::public.weekday
          when 'thu' then 'thu'::public.weekday
          when 'fri' then 'fri'::public.weekday
          when 'sat' then 'sat'::public.weekday
          when 'sun' then 'sun'::public.weekday
          else null
        end;

        select s.id
        into v_supplier_id
        from public.suppliers s
        where s.org_id = p_org_id
          and lower(trim(s.name)) = lower(trim(v_supplier_name))
        limit 1;

        select s.supplier_id
        into v_supplier_id
        from public.rpc_upsert_supplier(
          v_supplier_id,
          p_org_id,
          v_supplier_name,
          nullif(trim(coalesce(v_payload ->> 'contact_name', '')), ''),
          nullif(trim(coalesce(v_payload ->> 'phone', '')), ''),
          nullif(trim(coalesce(v_payload ->> 'email', '')), ''),
          nullif(trim(coalesce(v_payload ->> 'notes', '')), ''),
          true,
          v_order_frequency,
          v_order_day,
          v_receive_day,
          v_payment_terms_days,
          v_preferred_payment_method,
          v_accepts_cash,
          v_accepts_transfer,
          nullif(trim(coalesce(v_payload ->> 'payment_note', '')), '')
        ) s;
      end if;

      if v_job.template_key = 'products_suppliers'
         and v_product_id is not null
         and v_supplier_id is not null then
        v_relation_type := case lower(trim(coalesce(v_payload ->> 'relation_type', 'primary')))
          when 'secondary' then 'secondary'::public.supplier_product_relation_type
          else 'primary'::public.supplier_product_relation_type
        end;

        perform 1
        from public.rpc_upsert_supplier_product(
          p_org_id,
          v_supplier_id,
          v_product_id,
          nullif(trim(coalesce(v_payload ->> 'supplier_sku', '')), ''),
          nullif(trim(coalesce(v_payload ->> 'supplier_product_name', '')), ''),
          v_relation_type
        );
      end if;

      update public.data_import_rows
      set
        applied_at = now(),
        updated_at = now()
      where id = v_row.id;

      v_applied := v_applied + 1;
    exception when others then
      v_errors := coalesce(v_row.validation_errors, '[]'::jsonb);
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object('field', 'apply', 'message', sqlerrm)
      );

      update public.data_import_rows
      set
        validation_errors = v_errors,
        is_valid = false,
        applied_at = null,
        updated_at = now()
      where id = v_row.id;

      v_skipped := v_skipped + 1;
    end;
  end loop;

  v_skipped := v_skipped + (
    select count(*)::integer
    from public.data_import_rows r
    where r.org_id = p_org_id
      and r.job_id = p_job_id
      and r.is_valid = false
      and r.applied_at is null
  );

  update public.data_import_jobs as j
  set
    status = case when v_applied > 0 then 'applied' else 'validated' end,
    applied_rows = coalesce(j.applied_rows, 0) + v_applied,
    updated_at = now()
  where j.id = p_job_id
    and j.org_id = p_org_id;

  return query
  select v_applied, v_skipped;
end;
$$;
