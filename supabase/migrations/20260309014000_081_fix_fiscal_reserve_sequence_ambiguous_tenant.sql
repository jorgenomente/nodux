begin;

create or replace function public.fn_fiscal_reserve_sequence(
  p_invoice_job_id uuid
)
returns table (
  invoice_job_id uuid,
  tenant_id uuid,
  environment text,
  pto_vta integer,
  cbte_tipo integer,
  cbte_nro bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.invoice_jobs;
  v_seq public.fiscal_sequences;
  v_next_nro bigint;
begin
  select *
  into v_job
  from public.invoice_jobs
  where id = p_invoice_job_id
  for update;

  if not found then
    raise exception 'invoice_job not found: %', p_invoice_job_id;
  end if;

  if v_job.job_status not in ('pending') then
    raise exception 'invoice_job % has invalid status for reserve: %', v_job.id, v_job.job_status;
  end if;

  select *
  into v_seq
  from public.fiscal_sequences fs
  where fs.tenant_id = v_job.tenant_id
    and fs.environment = v_job.environment
    and fs.pto_vta = v_job.pto_vta
    and fs.cbte_tipo = v_job.cbte_tipo
  for update;

  if not found then
    insert into public.fiscal_sequences (
      tenant_id,
      environment,
      pto_vta,
      cbte_tipo,
      last_local_reserved,
      last_arca_confirmed,
      status
    )
    values (
      v_job.tenant_id,
      v_job.environment,
      v_job.pto_vta,
      v_job.cbte_tipo,
      0,
      0,
      'healthy'
    )
    returning * into v_seq;
  end if;

  if v_seq.status = 'blocked' then
    raise exception 'fiscal_sequence is blocked for tenant=% pto_vta=% cbte_tipo=%',
      v_job.tenant_id, v_job.pto_vta, v_job.cbte_tipo;
  end if;

  v_next_nro := v_seq.last_local_reserved + 1;

  update public.fiscal_sequences
  set
    last_local_reserved = v_next_nro,
    updated_at = now()
  where id = v_seq.id;

  update public.invoice_jobs
  set
    cbte_nro = v_next_nro,
    job_status = 'reserved',
    updated_at = now()
  where id = v_job.id;

  perform public.fn_fiscal_append_event(
    v_job.tenant_id,
    v_job.id,
    'sequence_reserved',
    jsonb_build_object(
      'environment', v_job.environment,
      'pto_vta', v_job.pto_vta,
      'cbte_tipo', v_job.cbte_tipo,
      'cbte_nro', v_next_nro
    )
  );

  return query
  select
    v_job.id,
    v_job.tenant_id,
    v_job.environment,
    v_job.pto_vta,
    v_job.cbte_tipo,
    v_next_nro;
end;
$$;

commit;
