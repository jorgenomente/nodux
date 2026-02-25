-- Onboarding import apply: match existing products only by barcode/internal_code.

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
