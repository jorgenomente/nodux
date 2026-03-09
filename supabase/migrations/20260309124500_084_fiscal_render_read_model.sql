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

  if v_job.job_status not in ('pending', 'reserved', 'authorizing', 'pending_reconcile', 'render_pending') then
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

drop policy if exists invoice_jobs_select_org_admin on public.invoice_jobs;
create policy invoice_jobs_select_org_admin
on public.invoice_jobs
for select
to authenticated
using (public.is_org_admin(tenant_id));

drop policy if exists invoice_jobs_select_platform_admin on public.invoice_jobs;
create policy invoice_jobs_select_platform_admin
on public.invoice_jobs
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists invoices_select_org_admin on public.invoices;
create policy invoices_select_org_admin
on public.invoices
for select
to authenticated
using (public.is_org_admin(tenant_id));

drop policy if exists invoices_select_platform_admin on public.invoices;
create policy invoices_select_platform_admin
on public.invoices
for select
to authenticated
using (public.is_platform_admin());

grant select on public.invoice_jobs to authenticated;
grant select on public.invoices to authenticated;

create or replace view public.v_sale_fiscal_invoice_admin
with (security_invoker = true)
as
select
  i.sale_id,
  i.tenant_id as org_id,
  i.id as invoice_id,
  i.invoice_job_id,
  i.environment,
  i.pto_vta,
  i.cbte_tipo,
  i.cbte_nro,
  i.doc_tipo,
  i.doc_nro,
  i.currency,
  i.currency_rate,
  i.imp_total,
  i.cae,
  i.cae_expires_at,
  i.result_status,
  i.qr_payload_json,
  i.pdf_storage_path,
  i.ticket_storage_path,
  ij.job_status as render_status,
  i.created_at,
  i.updated_at
from public.invoices i
join public.invoice_jobs ij
  on ij.id = i.invoice_job_id;

grant select on public.v_sale_fiscal_invoice_admin to authenticated;
grant select on public.v_sale_fiscal_invoice_admin to service_role;

comment on view public.v_sale_fiscal_invoice_admin is
'Lectura admin de la factura fiscal vinculada a una venta, incluyendo estado de render y rutas derivadas.';

commit;
