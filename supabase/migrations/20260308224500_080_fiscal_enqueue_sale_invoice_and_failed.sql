begin;

create or replace function public.fn_fiscal_mark_job_failed(
  p_invoice_job_id uuid,
  p_last_error_code text default null,
  p_last_error_message text default null,
  p_response_payload_json jsonb default null
)
returns public.invoice_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.invoice_jobs;
begin
  select *
  into v_job
  from public.invoice_jobs
  where id = p_invoice_job_id
  for update;

  if not found then
    raise exception 'invoice_job not found: %', p_invoice_job_id;
  end if;

  if v_job.job_status not in ('pending', 'reserved', 'authorizing', 'pending_reconcile') then
    raise exception 'invoice_job % has invalid status for failed: %', v_job.id, v_job.job_status;
  end if;

  update public.invoice_jobs
  set
    job_status = 'failed',
    last_error_code = coalesce(p_last_error_code, last_error_code),
    last_error_message = coalesce(p_last_error_message, last_error_message),
    response_payload_json = coalesce(p_response_payload_json, response_payload_json),
    updated_at = now()
  where id = v_job.id
  returning * into v_job;

  update public.sale_documents
  set
    status = 'failed',
    updated_at = now()
  where id = v_job.sale_document_id;

  perform public.fn_fiscal_append_event(
    v_job.tenant_id,
    v_job.id,
    'job_failed',
    jsonb_build_object(
      'last_error_code', p_last_error_code,
      'last_error_message', p_last_error_message
    )
  );

  return v_job;
end;
$$;

comment on function public.fn_fiscal_mark_job_failed(uuid, text, text, jsonb) is
'Marca invoice_job como failed y deja trazabilidad del error terminal.';

create or replace function public.rpc_enqueue_sale_fiscal_invoice(
  p_org_id uuid,
  p_sale_id uuid,
  p_environment text default 'homo',
  p_cbte_tipo integer default 11,
  p_doc_tipo integer default 99,
  p_doc_nro bigint default 0,
  p_source text default 'manual'
)
returns table (
  sale_document_id uuid,
  invoice_job_id uuid,
  job_status text,
  already_existed boolean
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_sale public.sales%rowtype;
  v_pos public.points_of_sale%rowtype;
  v_existing record;
  v_pos_enabled boolean := false;
  v_environment text := lower(trim(coalesce(p_environment, 'homo')));
  v_source text := nullif(trim(coalesce(p_source, '')), '');
  v_sale_document_id uuid;
  v_invoice_job_id uuid;
  v_requested_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if v_environment not in ('homo', 'prod') then
    raise exception 'invalid fiscal environment: %', p_environment;
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
    and org_id = p_org_id;

  if v_sale.id is null then
    raise exception 'sale not found';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    if not exists (
      select 1
      from public.org_users ou
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.is_active = true
        and ou.role = 'staff'
    ) then
      raise exception 'not authorized';
    end if;

    if not exists (
      select 1
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.branch_id = v_sale.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (
        select sma.is_enabled
        from public.staff_module_access sma
        where sma.org_id = p_org_id
          and sma.branch_id = v_sale.branch_id
          and sma.role = 'staff'
          and sma.module_key = 'pos'
        limit 1
      ),
      (
        select sma.is_enabled
        from public.staff_module_access sma
        where sma.org_id = p_org_id
          and sma.branch_id is null
          and sma.role = 'staff'
          and sma.module_key = 'pos'
        limit 1
      ),
      false
    )
    into v_pos_enabled;

    if not v_pos_enabled then
      raise exception 'pos module disabled';
    end if;
  end if;

  select sd.id as sale_document_id, ij.id as invoice_job_id, ij.job_status
  into v_existing
  from public.sale_documents sd
  join public.invoice_jobs ij
    on ij.sale_document_id = sd.id
  where sd.tenant_id = p_org_id
    and sd.sale_id = p_sale_id
    and sd.document_kind = 'fiscal_invoice'
    and ij.environment = v_environment
    and ij.job_status in ('pending', 'reserved', 'authorizing', 'authorized', 'pending_reconcile', 'render_pending', 'completed')
  order by sd.created_at desc
  limit 1;

  if v_existing.invoice_job_id is not null then
    return query
    select
      v_existing.sale_document_id,
      v_existing.invoice_job_id,
      v_existing.job_status,
      true;
    return;
  end if;

  select *
  into v_pos
  from public.points_of_sale
  where tenant_id = p_org_id
    and environment = v_environment
    and location_id = v_sale.branch_id
    and status = 'active'
  order by created_at asc
  limit 1;

  if v_pos.id is null then
    raise exception 'active point_of_sale not found for org=% branch=% environment=%',
      p_org_id, v_sale.branch_id, v_environment;
  end if;

  v_requested_payload := jsonb_build_object(
    'cbteTipo', p_cbte_tipo,
    'ptoVta', v_pos.pto_vta,
    'cbteFch', to_char(coalesce(v_sale.invoiced_at, v_sale.created_at)::date, 'YYYY-MM-DD'),
    'concept', 1,
    'currency', 'PES',
    'currencyRate', 1,
    'recipient', jsonb_build_object(
      'docTipo', p_doc_tipo,
      'docNro', p_doc_nro
    ),
    'amounts', jsonb_build_object(
      'impTotal', v_sale.total_amount,
      'impNeto', v_sale.total_amount,
      'impIva', 0,
      'impTrib', 0,
      'impOpEx', 0,
      'impTotConc', 0
    ),
    'ivaItems', '[]'::jsonb,
    'tributes', '[]'::jsonb,
    'saleContext', jsonb_build_object(
      'saleId', v_sale.id,
      'branchId', v_sale.branch_id,
      'source', coalesce(v_source, 'manual')
    )
  );

  insert into public.sale_documents (
    tenant_id,
    sale_id,
    document_kind,
    status,
    requested_by_user_id
  )
  values (
    p_org_id,
    p_sale_id,
    'fiscal_invoice',
    'requested',
    auth.uid()
  )
  returning id into v_sale_document_id;

  insert into public.invoice_jobs (
    tenant_id,
    sale_id,
    sale_document_id,
    environment,
    point_of_sale_id,
    pto_vta,
    cbte_tipo,
    job_status,
    requested_payload_json
  )
  values (
    p_org_id,
    p_sale_id,
    v_sale_document_id,
    v_environment,
    v_pos.id,
    v_pos.pto_vta,
    p_cbte_tipo,
    'pending',
    v_requested_payload
  )
  returning id into v_invoice_job_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_invoice_job_enqueued',
    'sale',
    p_sale_id,
    v_sale.branch_id,
    jsonb_build_object(
      'sale_document_id', v_sale_document_id,
      'invoice_job_id', v_invoice_job_id,
      'environment', v_environment,
      'pto_vta', v_pos.pto_vta,
      'cbte_tipo', p_cbte_tipo,
      'source', coalesce(v_source, 'manual')
    ),
    null
  );

  return query
  select
    v_sale_document_id,
    v_invoice_job_id,
    'pending'::text,
    false;
end;
$$;

comment on function public.rpc_enqueue_sale_fiscal_invoice(uuid, uuid, text, integer, integer, bigint, text) is
'Encola una solicitud fiscal para una venta existente y persiste requested_payload_json.';

revoke all on function public.fn_fiscal_mark_job_failed(uuid, text, text, jsonb) from public;
grant execute on function public.fn_fiscal_mark_job_failed(uuid, text, text, jsonb) to service_role;

revoke all on function public.rpc_enqueue_sale_fiscal_invoice(uuid, uuid, text, integer, integer, bigint, text) from public;
grant execute on function public.rpc_enqueue_sale_fiscal_invoice(uuid, uuid, text, integer, integer, bigint, text) to authenticated;
grant execute on function public.rpc_enqueue_sale_fiscal_invoice(uuid, uuid, text, integer, integer, bigint, text) to service_role;

commit;
