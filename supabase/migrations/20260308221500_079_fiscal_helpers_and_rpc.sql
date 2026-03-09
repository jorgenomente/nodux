-- ============================================================================
-- NODUX - Fiscal Helpers and RPC
-- File: supabase/migrations/20260308134500_fiscal_helpers_and_rpc.sql
-- Version: v0.1
-- Depends on:
--   - 20260308133000_fiscal_core.sql
-- ============================================================================
--
-- Objetivo:
--   Helpers y funciones RPC para flujo fiscal AFIP / ARCA.
--
-- Incluye:
--   - append de eventos
--   - reserva transaccional de secuencia
--   - cambio controlado de estados
--   - cierre de job como authorized
--   - cierre de job como rejected
--   - paso a pending_reconcile
--
-- Notas:
--   - Estas funciones están pensadas para ejecutarse desde service_role.
--   - La orquestación externa (worker fiscal) sigue siendo responsable de:
--       * WSAA
--       * WSFEv1
--       * render PDF/ticket
--       * impresión
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- fn_fiscal_append_event
-- ----------------------------------------------------------------------------

create or replace function public.fn_fiscal_append_event(
  p_tenant_id uuid,
  p_invoice_job_id uuid,
  p_event_type text,
  p_event_payload_json jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  insert into public.invoice_events (
    tenant_id,
    invoice_job_id,
    event_type,
    event_payload_json
  )
  values (
    p_tenant_id,
    p_invoice_job_id,
    p_event_type,
    coalesce(p_event_payload_json, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

comment on function public.fn_fiscal_append_event(uuid, uuid, text, jsonb) is
'Agrega un evento al historial del invoice_job.';

-- ----------------------------------------------------------------------------
-- fn_fiscal_assert_job_exists
-- Helper interno de validación
-- ----------------------------------------------------------------------------

create or replace function public.fn_fiscal_assert_job_exists(
  p_invoice_job_id uuid
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
  where id = p_invoice_job_id;

  if not found then
    raise exception 'invoice_job not found: %', p_invoice_job_id;
  end if;

  return v_job;
end;
$$;

comment on function public.fn_fiscal_assert_job_exists(uuid) is
'Devuelve invoice_job o lanza excepción si no existe.';

-- ----------------------------------------------------------------------------
-- fn_fiscal_reserve_sequence
-- ----------------------------------------------------------------------------
-- Reserva numeración fiscal para un invoice_job:
--   1. lockea fiscal_sequences
--   2. incrementa last_local_reserved
--   3. marca job como reserved
--   4. persiste cbte_nro en job
--   5. agrega evento
--
-- Si no existe fila en fiscal_sequences, la crea con base 0.
-- La sincronización con ARCA debe ocurrir fuera o en proceso posterior.
-- ----------------------------------------------------------------------------

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

comment on function public.fn_fiscal_reserve_sequence(uuid) is
'Reserva secuencia fiscal y marca el invoice_job como reserved.';

-- ----------------------------------------------------------------------------
-- fn_fiscal_mark_job_authorizing
-- ----------------------------------------------------------------------------

create or replace function public.fn_fiscal_mark_job_authorizing(
  p_invoice_job_id uuid,
  p_attempt_count integer default null,
  p_requested_payload_json jsonb default null
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

  if v_job.job_status not in ('reserved', 'pending_reconcile') then
    raise exception 'invoice_job % has invalid status for authorizing: %', v_job.id, v_job.job_status;
  end if;

  update public.invoice_jobs
  set
    job_status = 'authorizing',
    attempt_count = coalesce(p_attempt_count, v_job.attempt_count + 1),
    requested_payload_json = coalesce(p_requested_payload_json, requested_payload_json),
    updated_at = now()
  where id = v_job.id
  returning * into v_job;

  perform public.fn_fiscal_append_event(
    v_job.tenant_id,
    v_job.id,
    'authorization_requested',
    jsonb_build_object(
      'attempt_count', v_job.attempt_count,
      'cbte_nro', v_job.cbte_nro
    )
  );

  return v_job;
end;
$$;

comment on function public.fn_fiscal_mark_job_authorizing(uuid, integer, jsonb) is
'Marca invoice_job como authorizing.';

-- ----------------------------------------------------------------------------
-- fn_fiscal_mark_job_authorized
-- ----------------------------------------------------------------------------
-- Crea o reemplaza la invoice asociada al job y deja job en render_pending.
-- ----------------------------------------------------------------------------

create or replace function public.fn_fiscal_mark_job_authorized(
  p_invoice_job_id uuid,
  p_doc_tipo integer,
  p_doc_nro bigint,
  p_currency varchar(3),
  p_currency_rate numeric,
  p_imp_total numeric,
  p_imp_neto numeric,
  p_imp_iva numeric,
  p_imp_trib numeric,
  p_imp_op_ex numeric,
  p_imp_tot_conc numeric,
  p_cae varchar(32),
  p_cae_expires_at date,
  p_afip_observations_json jsonb default null,
  p_afip_events_json jsonb default null,
  p_raw_request_json jsonb default null,
  p_raw_response_json jsonb default null,
  p_response_payload_json jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.invoice_jobs;
  v_invoice_id uuid;
begin
  select *
  into v_job
  from public.invoice_jobs
  where id = p_invoice_job_id
  for update;

  if not found then
    raise exception 'invoice_job not found: %', p_invoice_job_id;
  end if;

  if v_job.job_status not in ('authorizing', 'pending_reconcile') then
    raise exception 'invoice_job % has invalid status for authorized: %', v_job.id, v_job.job_status;
  end if;

  if v_job.cbte_nro is null then
    raise exception 'invoice_job % has null cbte_nro', v_job.id;
  end if;

  insert into public.invoices (
    tenant_id,
    sale_id,
    invoice_job_id,
    environment,
    point_of_sale_id,
    pto_vta,
    cbte_tipo,
    cbte_nro,
    doc_tipo,
    doc_nro,
    currency,
    currency_rate,
    imp_total,
    imp_neto,
    imp_iva,
    imp_trib,
    imp_op_ex,
    imp_tot_conc,
    cae,
    cae_expires_at,
    result_status,
    afip_observations_json,
    afip_events_json,
    raw_request_json,
    raw_response_json
  )
  values (
    v_job.tenant_id,
    v_job.sale_id,
    v_job.id,
    v_job.environment,
    v_job.point_of_sale_id,
    v_job.pto_vta,
    v_job.cbte_tipo,
    v_job.cbte_nro,
    p_doc_tipo,
    p_doc_nro,
    p_currency,
    p_currency_rate,
    p_imp_total,
    p_imp_neto,
    p_imp_iva,
    p_imp_trib,
    p_imp_op_ex,
    p_imp_tot_conc,
    p_cae,
    p_cae_expires_at,
    'authorized',
    p_afip_observations_json,
    p_afip_events_json,
    p_raw_request_json,
    p_raw_response_json
  )
  on conflict (invoice_job_id)
  do update set
    doc_tipo = excluded.doc_tipo,
    doc_nro = excluded.doc_nro,
    currency = excluded.currency,
    currency_rate = excluded.currency_rate,
    imp_total = excluded.imp_total,
    imp_neto = excluded.imp_neto,
    imp_iva = excluded.imp_iva,
    imp_trib = excluded.imp_trib,
    imp_op_ex = excluded.imp_op_ex,
    imp_tot_conc = excluded.imp_tot_conc,
    cae = excluded.cae,
    cae_expires_at = excluded.cae_expires_at,
    result_status = 'authorized',
    afip_observations_json = excluded.afip_observations_json,
    afip_events_json = excluded.afip_events_json,
    raw_request_json = excluded.raw_request_json,
    raw_response_json = excluded.raw_response_json,
    updated_at = now()
  returning id into v_invoice_id;

  update public.invoice_jobs
  set
    job_status = 'render_pending',
    response_payload_json = coalesce(p_response_payload_json, response_payload_json),
    authorized_at = now(),
    updated_at = now(),
    last_error_code = null,
    last_error_message = null
  where id = v_job.id;

  update public.sale_documents
  set
    status = 'processing',
    updated_at = now()
  where id = v_job.sale_document_id;

  update public.fiscal_sequences
  set
    last_arca_confirmed = greatest(last_arca_confirmed, v_job.cbte_nro),
    status = case
      when status = 'blocked' then status
      else 'healthy'
    end,
    last_reconciled_at = now(),
    updated_at = now()
  where tenant_id = v_job.tenant_id
    and environment = v_job.environment
    and pto_vta = v_job.pto_vta
    and cbte_tipo = v_job.cbte_tipo;

  perform public.fn_fiscal_append_event(
    v_job.tenant_id,
    v_job.id,
    'authorization_approved',
    jsonb_build_object(
      'invoice_id', v_invoice_id,
      'cae', p_cae,
      'cae_expires_at', p_cae_expires_at,
      'cbte_nro', v_job.cbte_nro
    )
  );

  return v_invoice_id;
end;
$$;

comment on function public.fn_fiscal_mark_job_authorized(
  uuid, integer, bigint, varchar, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  varchar, date, jsonb, jsonb, jsonb, jsonb, jsonb
) is
'Cierra invoice_job como autorizado, crea/actualiza invoice y avanza a render_pending.';

-- ----------------------------------------------------------------------------
-- fn_fiscal_mark_job_rejected
-- ----------------------------------------------------------------------------

create or replace function public.fn_fiscal_mark_job_rejected(
  p_invoice_job_id uuid,
  p_last_error_code text default null,
  p_last_error_message text default null,
  p_response_payload_json jsonb default null,
  p_afip_observations_json jsonb default null,
  p_afip_events_json jsonb default null
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

  if v_job.job_status not in ('authorizing', 'pending_reconcile') then
    raise exception 'invoice_job % has invalid status for rejected: %', v_job.id, v_job.job_status;
  end if;

  update public.invoice_jobs
  set
    job_status = 'rejected',
    last_error_code = p_last_error_code,
    last_error_message = p_last_error_message,
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
    'authorization_rejected',
    jsonb_build_object(
      'last_error_code', p_last_error_code,
      'last_error_message', p_last_error_message,
      'afip_observations', coalesce(p_afip_observations_json, 'null'::jsonb),
      'afip_events', coalesce(p_afip_events_json, 'null'::jsonb)
    )
  );

  return v_job;
end;
$$;

comment on function public.fn_fiscal_mark_job_rejected(uuid, text, text, jsonb, jsonb, jsonb) is
'Marca invoice_job como rejected.';

-- ----------------------------------------------------------------------------
-- fn_fiscal_mark_job_pending_reconcile
-- ----------------------------------------------------------------------------

create or replace function public.fn_fiscal_mark_job_pending_reconcile(
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

  if v_job.job_status not in ('authorizing', 'reserved') then
    raise exception 'invoice_job % has invalid status for pending_reconcile: %', v_job.id, v_job.job_status;
  end if;

  update public.invoice_jobs
  set
    job_status = 'pending_reconcile',
    last_error_code = p_last_error_code,
    last_error_message = p_last_error_message,
    response_payload_json = coalesce(p_response_payload_json, response_payload_json),
    updated_at = now()
  where id = v_job.id
  returning * into v_job;

  update public.fiscal_sequences
  set
    status = 'pending_reconcile',
    updated_at = now()
  where tenant_id = v_job.tenant_id
    and environment = v_job.environment
    and pto_vta = v_job.pto_vta
    and cbte_tipo = v_job.cbte_tipo;

  perform public.fn_fiscal_append_event(
    v_job.tenant_id,
    v_job.id,
    'reconcile_required',
    jsonb_build_object(
      'last_error_code', p_last_error_code,
      'last_error_message', p_last_error_message,
      'cbte_nro', v_job.cbte_nro
    )
  );

  return v_job;
end;
$$;

comment on function public.fn_fiscal_mark_job_pending_reconcile(uuid, text, text, jsonb) is
'Marca invoice_job como pending_reconcile y señaliza la secuencia.';

-- ----------------------------------------------------------------------------
-- fn_fiscal_mark_render_completed
-- ----------------------------------------------------------------------------

create or replace function public.fn_fiscal_mark_render_completed(
  p_invoice_job_id uuid,
  p_invoice_id uuid,
  p_pdf_storage_path text default null,
  p_ticket_storage_path text default null,
  p_qr_payload_json jsonb default null
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

  if v_job.job_status not in ('render_pending', 'authorized') then
    raise exception 'invoice_job % has invalid status for render completed: %', v_job.id, v_job.job_status;
  end if;

  update public.invoices
  set
    pdf_storage_path = coalesce(p_pdf_storage_path, pdf_storage_path),
    ticket_storage_path = coalesce(p_ticket_storage_path, ticket_storage_path),
    qr_payload_json = coalesce(p_qr_payload_json, qr_payload_json),
    updated_at = now()
  where id = p_invoice_id;

  update public.invoice_jobs
  set
    job_status = 'completed',
    updated_at = now()
  where id = v_job.id
  returning * into v_job;

  update public.sale_documents
  set
    status = 'completed',
    updated_at = now()
  where id = v_job.sale_document_id;

  perform public.fn_fiscal_append_event(
    v_job.tenant_id,
    v_job.id,
    'render_completed',
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'pdf_storage_path', p_pdf_storage_path,
      'ticket_storage_path', p_ticket_storage_path
    )
  );

  return v_job;
end;
$$;

comment on function public.fn_fiscal_mark_render_completed(uuid, uuid, text, text, jsonb) is
'Marca invoice_job como completed luego del render de PDF/ticket.';

-- ----------------------------------------------------------------------------
-- fn_fiscal_block_sequence
-- ----------------------------------------------------------------------------

create or replace function public.fn_fiscal_block_sequence(
  p_tenant_id uuid,
  p_environment text,
  p_pto_vta integer,
  p_cbte_tipo integer,
  p_reason text default null
)
returns public.fiscal_sequences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq public.fiscal_sequences;
begin
  update public.fiscal_sequences
  set
    status = 'blocked',
    updated_at = now()
  where tenant_id = p_tenant_id
    and environment = p_environment
    and pto_vta = p_pto_vta
    and cbte_tipo = p_cbte_tipo
  returning * into v_seq;

  if not found then
    raise exception 'fiscal_sequence not found for tenant=% environment=% pto_vta=% cbte_tipo=%',
      p_tenant_id, p_environment, p_pto_vta, p_cbte_tipo;
  end if;

  return v_seq;
end;
$$;

comment on function public.fn_fiscal_block_sequence(uuid, text, integer, integer, text) is
'Bloquea una secuencia fiscal para impedir nuevas reservas.';

-- ----------------------------------------------------------------------------
-- Permissions
-- ----------------------------------------------------------------------------

revoke all on function public.fn_fiscal_append_event(uuid, uuid, text, jsonb) from public;
revoke all on function public.fn_fiscal_assert_job_exists(uuid) from public;
revoke all on function public.fn_fiscal_reserve_sequence(uuid) from public;
revoke all on function public.fn_fiscal_mark_job_authorizing(uuid, integer, jsonb) from public;
revoke all on function public.fn_fiscal_mark_job_authorized(
  uuid, integer, bigint, varchar, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  varchar, date, jsonb, jsonb, jsonb, jsonb, jsonb
) from public;
revoke all on function public.fn_fiscal_mark_job_rejected(uuid, text, text, jsonb, jsonb, jsonb) from public;
revoke all on function public.fn_fiscal_mark_job_pending_reconcile(uuid, text, text, jsonb) from public;
revoke all on function public.fn_fiscal_mark_render_completed(uuid, uuid, text, text, jsonb) from public;
revoke all on function public.fn_fiscal_block_sequence(uuid, text, integer, integer, text) from public;

grant execute on function public.fn_fiscal_append_event(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.fn_fiscal_assert_job_exists(uuid) to service_role;
grant execute on function public.fn_fiscal_reserve_sequence(uuid) to service_role;
grant execute on function public.fn_fiscal_mark_job_authorizing(uuid, integer, jsonb) to service_role;
grant execute on function public.fn_fiscal_mark_job_authorized(
  uuid, integer, bigint, varchar, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  varchar, date, jsonb, jsonb, jsonb, jsonb, jsonb
) to service_role;
grant execute on function public.fn_fiscal_mark_job_rejected(uuid, text, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.fn_fiscal_mark_job_pending_reconcile(uuid, text, text, jsonb) to service_role;
grant execute on function public.fn_fiscal_mark_render_completed(uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.fn_fiscal_block_sequence(uuid, text, integer, integer, text) to service_role;

commit;
