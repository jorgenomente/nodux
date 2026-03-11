


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'NODUX public schema with fiscal core base for AFIP / ARCA integration.';



CREATE TYPE "public"."online_order_status" AS ENUM (
    'pending',
    'confirmed',
    'ready_for_pickup',
    'delivered',
    'cancelled'
);


ALTER TYPE "public"."online_order_status" OWNER TO "postgres";


CREATE TYPE "public"."online_payment_intent" AS ENUM (
    'pay_on_pickup',
    'transfer',
    'qr'
);


ALTER TYPE "public"."online_payment_intent" OWNER TO "postgres";


CREATE TYPE "public"."online_proof_review_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."online_proof_review_status" OWNER TO "postgres";


CREATE TYPE "public"."order_frequency" AS ENUM (
    'weekly',
    'biweekly',
    'every_3_weeks',
    'monthly'
);


ALTER TYPE "public"."order_frequency" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'debit',
    'credit',
    'transfer',
    'other',
    'mixed',
    'card',
    'mercadopago'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."sale_delivery_document_kind" AS ENUM (
    'sale_ticket',
    'sale_invoice'
);


ALTER TYPE "public"."sale_delivery_document_kind" OWNER TO "postgres";


CREATE TYPE "public"."sale_delivery_link_status" AS ENUM (
    'active',
    'revoked',
    'expired'
);


ALTER TYPE "public"."sale_delivery_link_status" OWNER TO "postgres";


CREATE TYPE "public"."sell_unit_type" AS ENUM (
    'unit',
    'weight',
    'bulk'
);


ALTER TYPE "public"."sell_unit_type" OWNER TO "postgres";


CREATE TYPE "public"."special_order_status" AS ENUM (
    'pending',
    'ordered',
    'received',
    'delivered',
    'partial',
    'cancelled'
);


ALTER TYPE "public"."special_order_status" OWNER TO "postgres";


CREATE TYPE "public"."stock_movement_type" AS ENUM (
    'sale',
    'purchase',
    'manual_adjustment',
    'expiration_adjustment',
    'branch_transfer'
);


ALTER TYPE "public"."stock_movement_type" OWNER TO "postgres";


CREATE TYPE "public"."supplier_order_status" AS ENUM (
    'draft',
    'sent',
    'received',
    'reconciled'
);


ALTER TYPE "public"."supplier_order_status" OWNER TO "postgres";


CREATE TYPE "public"."supplier_product_relation_type" AS ENUM (
    'primary',
    'secondary'
);


ALTER TYPE "public"."supplier_product_relation_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'superadmin',
    'org_admin',
    'staff'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."weekday" AS ENUM (
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun'
);


ALTER TYPE "public"."weekday" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_fiscal_append_event"("p_tenant_id" "uuid", "p_invoice_job_id" "uuid", "p_event_type" "text", "p_event_payload_json" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_append_event"("p_tenant_id" "uuid", "p_invoice_job_id" "uuid", "p_event_type" "text", "p_event_payload_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_append_event"("p_tenant_id" "uuid", "p_invoice_job_id" "uuid", "p_event_type" "text", "p_event_payload_json" "jsonb") IS 'Agrega un evento al historial del invoice_job.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."invoice_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "sale_document_id" "uuid" NOT NULL,
    "environment" "text" NOT NULL,
    "point_of_sale_id" "uuid",
    "pto_vta" integer NOT NULL,
    "cbte_tipo" integer NOT NULL,
    "cbte_nro" bigint,
    "job_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error_code" "text",
    "last_error_message" "text",
    "requested_payload_json" "jsonb",
    "response_payload_json" "jsonb",
    "correlation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "authorized_at" timestamp with time zone,
    CONSTRAINT "invoice_jobs_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "invoice_jobs_cbte_nro_check" CHECK ((("cbte_nro" IS NULL) OR ("cbte_nro" > 0))),
    CONSTRAINT "invoice_jobs_cbte_tipo_check" CHECK (("cbte_tipo" > 0)),
    CONSTRAINT "invoice_jobs_environment_check" CHECK (("environment" = ANY (ARRAY['homo'::"text", 'prod'::"text"]))),
    CONSTRAINT "invoice_jobs_job_status_check" CHECK (("job_status" = ANY (ARRAY['pending'::"text", 'reserved'::"text", 'authorizing'::"text", 'authorized'::"text", 'rejected'::"text", 'pending_reconcile'::"text", 'render_pending'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "invoice_jobs_pto_vta_check" CHECK (("pto_vta" > 0))
);


ALTER TABLE "public"."invoice_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoice_jobs" IS 'Job operativo de autorización fiscal AFIP / ARCA.';



COMMENT ON COLUMN "public"."invoice_jobs"."cbte_nro" IS 'Número de comprobante reservado o confirmado. No reutilizar si el estado es incierto.';



COMMENT ON COLUMN "public"."invoice_jobs"."requested_payload_json" IS 'Payload interno normalizado previo a request SOAP.';



COMMENT ON COLUMN "public"."invoice_jobs"."response_payload_json" IS 'Respuesta cruda o normalizada del proveedor fiscal.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_assert_job_exists"("p_invoice_job_id" "uuid") RETURNS "public"."invoice_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_assert_job_exists"("p_invoice_job_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_assert_job_exists"("p_invoice_job_id" "uuid") IS 'Devuelve invoice_job o lanza excepción si no existe.';



CREATE TABLE IF NOT EXISTS "public"."fiscal_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "environment" "text" NOT NULL,
    "pto_vta" integer NOT NULL,
    "cbte_tipo" integer NOT NULL,
    "last_local_reserved" bigint DEFAULT 0 NOT NULL,
    "last_arca_confirmed" bigint DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'healthy'::"text" NOT NULL,
    "last_reconciled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fiscal_sequences_arca_confirmed_nonnegative_check" CHECK (("last_arca_confirmed" >= 0)),
    CONSTRAINT "fiscal_sequences_cbte_tipo_check" CHECK (("cbte_tipo" > 0)),
    CONSTRAINT "fiscal_sequences_environment_check" CHECK (("environment" = ANY (ARRAY['homo'::"text", 'prod'::"text"]))),
    CONSTRAINT "fiscal_sequences_local_reserved_nonnegative_check" CHECK (("last_local_reserved" >= 0)),
    CONSTRAINT "fiscal_sequences_pto_vta_check" CHECK (("pto_vta" > 0)),
    CONSTRAINT "fiscal_sequences_status_check" CHECK (("status" = ANY (ARRAY['healthy'::"text", 'pending_reconcile'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."fiscal_sequences" OWNER TO "postgres";


COMMENT ON TABLE "public"."fiscal_sequences" IS 'Secuencias fiscales por tenant/ambiente/punto de venta/tipo de comprobante.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_block_sequence"("p_tenant_id" "uuid", "p_environment" "text", "p_pto_vta" integer, "p_cbte_tipo" integer, "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."fiscal_sequences"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_block_sequence"("p_tenant_id" "uuid", "p_environment" "text", "p_pto_vta" integer, "p_cbte_tipo" integer, "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_block_sequence"("p_tenant_id" "uuid", "p_environment" "text", "p_pto_vta" integer, "p_cbte_tipo" integer, "p_reason" "text") IS 'Bloquea una secuencia fiscal para impedir nuevas reservas.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_mark_job_authorized"("p_invoice_job_id" "uuid", "p_doc_tipo" integer, "p_doc_nro" bigint, "p_currency" character varying, "p_currency_rate" numeric, "p_imp_total" numeric, "p_imp_neto" numeric, "p_imp_iva" numeric, "p_imp_trib" numeric, "p_imp_op_ex" numeric, "p_imp_tot_conc" numeric, "p_cae" character varying, "p_cae_expires_at" "date", "p_afip_observations_json" "jsonb" DEFAULT NULL::"jsonb", "p_afip_events_json" "jsonb" DEFAULT NULL::"jsonb", "p_raw_request_json" "jsonb" DEFAULT NULL::"jsonb", "p_raw_response_json" "jsonb" DEFAULT NULL::"jsonb", "p_response_payload_json" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_mark_job_authorized"("p_invoice_job_id" "uuid", "p_doc_tipo" integer, "p_doc_nro" bigint, "p_currency" character varying, "p_currency_rate" numeric, "p_imp_total" numeric, "p_imp_neto" numeric, "p_imp_iva" numeric, "p_imp_trib" numeric, "p_imp_op_ex" numeric, "p_imp_tot_conc" numeric, "p_cae" character varying, "p_cae_expires_at" "date", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb", "p_raw_request_json" "jsonb", "p_raw_response_json" "jsonb", "p_response_payload_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_mark_job_authorized"("p_invoice_job_id" "uuid", "p_doc_tipo" integer, "p_doc_nro" bigint, "p_currency" character varying, "p_currency_rate" numeric, "p_imp_total" numeric, "p_imp_neto" numeric, "p_imp_iva" numeric, "p_imp_trib" numeric, "p_imp_op_ex" numeric, "p_imp_tot_conc" numeric, "p_cae" character varying, "p_cae_expires_at" "date", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb", "p_raw_request_json" "jsonb", "p_raw_response_json" "jsonb", "p_response_payload_json" "jsonb") IS 'Cierra invoice_job como autorizado, crea/actualiza invoice y avanza a render_pending.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_mark_job_authorizing"("p_invoice_job_id" "uuid", "p_attempt_count" integer DEFAULT NULL::integer, "p_requested_payload_json" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."invoice_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_mark_job_authorizing"("p_invoice_job_id" "uuid", "p_attempt_count" integer, "p_requested_payload_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_mark_job_authorizing"("p_invoice_job_id" "uuid", "p_attempt_count" integer, "p_requested_payload_json" "jsonb") IS 'Marca invoice_job como authorizing.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_mark_job_failed"("p_invoice_job_id" "uuid", "p_last_error_code" "text" DEFAULT NULL::"text", "p_last_error_message" "text" DEFAULT NULL::"text", "p_response_payload_json" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."invoice_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_mark_job_failed"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_mark_job_failed"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") IS 'Marca invoice_job como failed y deja trazabilidad del error terminal.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_mark_job_pending_reconcile"("p_invoice_job_id" "uuid", "p_last_error_code" "text" DEFAULT NULL::"text", "p_last_error_message" "text" DEFAULT NULL::"text", "p_response_payload_json" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."invoice_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_mark_job_pending_reconcile"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_mark_job_pending_reconcile"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") IS 'Marca invoice_job como pending_reconcile y señaliza la secuencia.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_mark_job_rejected"("p_invoice_job_id" "uuid", "p_last_error_code" "text" DEFAULT NULL::"text", "p_last_error_message" "text" DEFAULT NULL::"text", "p_response_payload_json" "jsonb" DEFAULT NULL::"jsonb", "p_afip_observations_json" "jsonb" DEFAULT NULL::"jsonb", "p_afip_events_json" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."invoice_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_mark_job_rejected"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_mark_job_rejected"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb") IS 'Marca invoice_job como rejected.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_mark_render_completed"("p_invoice_job_id" "uuid", "p_invoice_id" "uuid", "p_pdf_storage_path" "text" DEFAULT NULL::"text", "p_ticket_storage_path" "text" DEFAULT NULL::"text", "p_qr_payload_json" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."invoice_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_mark_render_completed"("p_invoice_job_id" "uuid", "p_invoice_id" "uuid", "p_pdf_storage_path" "text", "p_ticket_storage_path" "text", "p_qr_payload_json" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_mark_render_completed"("p_invoice_job_id" "uuid", "p_invoice_id" "uuid", "p_pdf_storage_path" "text", "p_ticket_storage_path" "text", "p_qr_payload_json" "jsonb") IS 'Marca invoice_job como completed luego del render de PDF/ticket.';



CREATE OR REPLACE FUNCTION "public"."fn_fiscal_reserve_sequence"("p_invoice_job_id" "uuid") RETURNS TABLE("invoice_job_id" "uuid", "tenant_id" "uuid", "environment" "text", "pto_vta" integer, "cbte_tipo" integer, "cbte_nro" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fn_fiscal_reserve_sequence"("p_invoice_job_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fiscal_reserve_sequence"("p_invoice_job_id" "uuid") IS 'Reserva secuencia fiscal y marca el invoice_job como reserved.';



CREATE OR REPLACE FUNCTION "public"."fn_next_branch_storefront_slug"("p_org_id" "uuid", "p_slug_base" "text", "p_exclude_branch_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_base text := coalesce(public.slugify_text(p_slug_base), 'sucursal');
  v_try text;
  v_n int := 1;
begin
  loop
    v_try := case when v_n = 1 then v_base else v_base || '-' || v_n::text end;
    exit when not exists (
      select 1
      from public.branches b
      where b.org_id = p_org_id
        and b.storefront_slug = v_try
        and (p_exclude_branch_id is null or b.id <> p_exclude_branch_id)
    );
    v_n := v_n + 1;
  end loop;

  return v_try;
end;
$$;


ALTER FUNCTION "public"."fn_next_branch_storefront_slug"("p_org_id" "uuid", "p_slug_base" "text", "p_exclude_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_next_org_storefront_slug"("p_slug_base" "text", "p_exclude_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_base text := coalesce(public.slugify_text(p_slug_base), 'tienda');
  v_try text;
  v_n int := 1;
begin
  loop
    v_try := case when v_n = 1 then v_base else v_base || '-' || v_n::text end;
    exit when not exists (
      select 1
      from public.orgs o
      where o.storefront_slug = v_try
        and (p_exclude_org_id is null or o.id <> p_exclude_org_id)
    );
    v_n := v_n + 1;
  end loop;

  return v_try;
end;
$$;


ALTER FUNCTION "public"."fn_next_org_storefront_slug"("p_slug_base" "text", "p_exclude_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payable record;
  v_paid_amount numeric(12,2) := 0;
  v_base_amount numeric(12,2) := 0;
  v_outstanding numeric(12,2) := 0;
  v_status text := 'pending';
  v_last_paid_at timestamptz := null;
begin
  select * into v_payable
  from public.supplier_payables sp
  where sp.id = p_payable_id
  for update;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  select coalesce(sum(spm.amount), 0), max(spm.paid_at)
    into v_paid_amount, v_last_paid_at
  from public.supplier_payments spm
  where spm.payable_id = p_payable_id;

  v_base_amount := coalesce(v_payable.invoice_amount, v_payable.estimated_amount, 0);
  v_outstanding := greatest(v_base_amount - v_paid_amount, 0);

  if v_outstanding = 0 then
    v_status := 'paid';
  elsif v_paid_amount > 0 then
    v_status := 'partial';
  else
    v_status := 'pending';
  end if;

  update public.supplier_payables
  set
    paid_amount = round(v_paid_amount, 2),
    outstanding_amount = round(v_outstanding, 2),
    status = v_status,
    paid_at = case when v_status = 'paid' then v_last_paid_at else null end,
    updated_by = p_actor_user_id,
    updated_at = now()
  where id = p_payable_id;
end;
$$;


ALTER FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_platform_admin_memberships_for_org"("p_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  insert into public.org_users (
    org_id,
    user_id,
    role,
    display_name,
    is_active
  )
  select
    p_org_id,
    pa.user_id,
    'org_admin'::public.user_role,
    coalesce(
      nullif(trim(ou.display_name), ''),
      nullif(trim((au.raw_user_meta_data ->> 'display_name')), ''),
      nullif(trim((au.raw_user_meta_data ->> 'full_name')), ''),
      nullif(trim(split_part(coalesce(au.email, ''), '@', 1)), '')
    ),
    true
  from public.platform_admins pa
  left join public.org_users ou
    on ou.org_id = p_org_id
   and ou.user_id = pa.user_id
  left join auth.users au
    on au.id = pa.user_id
  on conflict on constraint org_users_org_id_user_id_key
  do update set
    role = 'org_admin',
    is_active = true,
    display_name = coalesce(public.org_users.display_name, excluded.display_name),
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."fn_sync_platform_admin_memberships_for_org"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_order record;
  v_estimated_amount numeric(12,2) := 0;
  v_due_on date := null;
  v_payable_id uuid;
begin
  select so.id,
         so.org_id,
         so.branch_id,
         so.supplier_id,
         so.status,
         so.sent_at,
         so.received_at,
         so.reconciled_at,
         s.payment_terms_days,
         s.preferred_payment_method
    into v_order
  from public.supplier_orders so
  join public.suppliers s
    on s.id = so.supplier_id
   and s.org_id = so.org_id
  where so.id = p_order_id
    and so.org_id = p_org_id;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status not in ('sent', 'received', 'reconciled') then
    return null;
  end if;

  select coalesce(
    sum(
      soi.ordered_qty * coalesce(nullif(soi.unit_cost, 0), p.unit_price, 0)
    ),
    0
  ) into v_estimated_amount
  from public.supplier_order_items soi
  left join public.products p
    on p.id = soi.product_id
   and p.org_id = soi.org_id
  where soi.org_id = p_org_id
    and soi.order_id = p_order_id;

  if v_order.payment_terms_days is not null then
    v_due_on := (
      coalesce(
        v_order.reconciled_at,
        v_order.received_at,
        v_order.sent_at,
        now()
      )::date
      + v_order.payment_terms_days
    );
  end if;

  insert into public.supplier_payables (
    org_id,
    branch_id,
    supplier_id,
    order_id,
    status,
    estimated_amount,
    invoice_amount,
    paid_amount,
    outstanding_amount,
    due_on,
    payment_terms_days_snapshot,
    preferred_payment_method,
    selected_payment_method,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    p_org_id,
    v_order.branch_id,
    v_order.supplier_id,
    p_order_id,
    'pending',
    round(v_estimated_amount, 2),
    null,
    0,
    round(v_estimated_amount, 2),
    v_due_on,
    v_order.payment_terms_days,
    v_order.preferred_payment_method,
    null,
    p_actor_user_id,
    p_actor_user_id,
    now(),
    now()
  )
  on conflict (order_id) do update set
    branch_id = excluded.branch_id,
    supplier_id = excluded.supplier_id,
    estimated_amount = excluded.estimated_amount,
    due_on = coalesce(public.supplier_payables.due_on, excluded.due_on),
    payment_terms_days_snapshot = excluded.payment_terms_days_snapshot,
    preferred_payment_method = excluded.preferred_payment_method,
    updated_by = p_actor_user_id,
    updated_at = now()
  returning id into v_payable_id;

  perform public.fn_recompute_supplier_payable(v_payable_id, p_actor_user_id);

  return v_payable_id;
end;
$$;


ALTER FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
      and ou.role = 'org_admin'
  );
$$;


ALTER FUNCTION "public"."is_org_admin"("check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select public.is_platform_admin() or exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
      and ou.role in ('org_admin', 'superadmin')
  );
$$;


ALTER FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists(
    select 1
    from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_org_member"("check_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists(
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_product_catalog_text"("p_value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
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


ALTER FUNCTION "public"."normalize_product_catalog_text"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text" DEFAULT NULL::"text", "p_movement_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("movement_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_movement_id uuid := gen_random_uuid();
  v_created_at timestamptz := now();
  v_session record;
  v_cashbox_enabled boolean := false;
  v_movement_type text;
  v_category text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid movement amount';
  end if;

  v_movement_type := lower(trim(coalesce(p_movement_type, '')));
  if v_movement_type not in ('expense', 'income') then
    raise exception 'invalid movement type';
  end if;

  v_category := nullif(trim(coalesce(p_category_key, '')), '');
  if v_category is null then
    raise exception 'movement category required';
  end if;

  select *
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
  end if;

  if v_session.status <> 'open' then
    raise exception 'cash session closed';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = v_session.branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  insert into public.cash_session_movements (
    id,
    org_id,
    branch_id,
    session_id,
    movement_type,
    category_key,
    amount,
    note,
    movement_at,
    created_by,
    created_at
  ) values (
    v_movement_id,
    p_org_id,
    v_session.branch_id,
    p_session_id,
    v_movement_type,
    v_category,
    round(p_amount::numeric, 2),
    nullif(trim(coalesce(p_note, '')), ''),
    coalesce(p_movement_at, v_created_at),
    auth.uid(),
    v_created_at
  );

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_movement_added',
    'cash_session_movement',
    v_movement_id,
    v_session.branch_id,
    jsonb_build_object(
      'session_id', p_session_id,
      'movement_type', v_movement_type,
      'category_key', v_category,
      'amount', round(p_amount::numeric, 2),
      'movement_at', coalesce(p_movement_at, v_created_at),
      'note', nullif(trim(coalesce(p_note, '')), '')
    )
  );

  return query
  select v_movement_id, v_created_at;
end;
$$;


ALTER FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text", "p_movement_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.expiration_batches
    set quantity = p_new_quantity
  where id = p_batch_id and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'expiration_batch_adjusted',
    'expiration_batch',
    p_batch_id,
    null,
    jsonb_build_object('new_quantity', p_new_quantity),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") RETURNS TABLE("movement_id" "uuid", "resulting_quantity_on_hand" numeric)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_current numeric(14,3);
  v_delta numeric(14,3);
  v_movement_id uuid;
begin
  select quantity_on_hand
    into v_current
  from public.stock_items
  where org_id = p_org_id
    and branch_id = p_branch_id
    and product_id = p_product_id
  for update;

  if v_current is null then
    v_current := 0;
    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values (p_org_id, p_branch_id, p_product_id, p_new_quantity_on_hand);
  else
    update public.stock_items
      set quantity_on_hand = p_new_quantity_on_hand
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = p_product_id;
  end if;

  v_delta := p_new_quantity_on_hand - v_current;

  insert into public.stock_movements (
    org_id, branch_id, product_id, movement_type, quantity_delta, reason, source_type
  ) values (
    p_org_id, p_branch_id, p_product_id, 'manual_adjustment', v_delta, p_reason, 'manual_adjustment'
  ) returning id into v_movement_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'stock_manual_adjust',
    'stock_item',
    p_product_id,
    p_branch_id,
    jsonb_build_object(
      'new_quantity_on_hand', p_new_quantity_on_hand,
      'delta', v_delta,
      'reason', p_reason
    ),
    null
  );

  return query select v_movement_id, p_new_quantity_on_hand;
end;
$$;


ALTER FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_append_sale_delivery_event"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_event_kind" "text", "p_channel" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_org_id uuid;
  v_link_id uuid;
  v_event_id uuid;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  if p_event_kind not in ('shared', 'revoked', 'regenerated', 'opened') then
    raise exception 'invalid_event_kind'
      using errcode = 'P0001';
  end if;

  if p_channel is not null and p_channel not in ('whatsapp', 'public_link') then
    raise exception 'invalid_channel'
      using errcode = 'P0001';
  end if;

  select sdl.id
    into v_link_id
  from public.sale_delivery_links sdl
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
  order by sdl.created_at desc, sdl.id desc
  limit 1;

  insert into public.sale_delivery_events (
    org_id,
    sale_id,
    sale_delivery_link_id,
    document_kind,
    event_kind,
    channel,
    actor_user_id,
    metadata
  )
  values (
    v_org_id,
    p_sale_id,
    v_link_id,
    p_document_kind,
    p_event_kind,
    p_channel,
    auth.uid(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id
    into v_event_id;

  return v_event_id;
end;
$$;


ALTER FUNCTION "public"."rpc_append_sale_delivery_event"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_event_kind" "text", "p_channel" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_append_sale_delivery_event"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_event_kind" "text", "p_channel" "text", "p_metadata" "jsonb") IS 'Registra un evento operativo de delivery para ticket/factura de una venta.';



CREATE OR REPLACE FUNCTION "public"."rpc_apply_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid", "p_apply_mode" "text" DEFAULT 'valid_only'::"text") RETURNS TABLE("applied_rows" integer, "skipped_rows" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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


ALTER FUNCTION "public"."rpc_apply_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid", "p_apply_mode" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_bootstrap_platform_admin"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.platform_admins where user_id = auth.uid()) then
    return;
  end if;

  if exists (select 1 from public.platform_admins) then
    raise exception 'not authorized';
  end if;

  insert into public.platform_admins (user_id, created_by)
  values (auth.uid(), auth.uid());
end;
$$;


ALTER FUNCTION "public"."rpc_bootstrap_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text" DEFAULT NULL::"text", "p_closed_controlled_by_name" "text" DEFAULT NULL::"text", "p_close_confirmed" boolean DEFAULT true, "p_closing_drawer_count_lines" "jsonb" DEFAULT NULL::"jsonb", "p_closing_reserve_count_lines" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("session_id" "uuid", "expected_cash_amount" numeric, "counted_cash_amount" numeric, "difference_amount" numeric, "closed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session record;
  v_summary record;
  v_closed_at timestamptz := now();
  v_cashbox_enabled boolean := false;
  v_controlled_by_name text;
  v_confirmed boolean;
  v_drawer_line jsonb;
  v_reserve_line jsonb;
  v_denom numeric(12,2);
  v_qty integer;
  v_closing_drawer_amount numeric(12,2) := 0;
  v_closing_reserve_amount numeric(12,2) := 0;
  v_counted_total numeric(12,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_controlled_by_name := nullif(trim(coalesce(p_closed_controlled_by_name, '')), '');
  if v_controlled_by_name is null then
    raise exception 'controlled by name required';
  end if;

  v_confirmed := coalesce(p_close_confirmed, false);
  if not v_confirmed then
    raise exception 'close confirmation required';
  end if;

  if p_closing_drawer_count_lines is null or jsonb_typeof(p_closing_drawer_count_lines) <> 'array' then
    raise exception 'closing drawer count lines required';
  end if;
  if p_closing_reserve_count_lines is null or jsonb_typeof(p_closing_reserve_count_lines) <> 'array' then
    raise exception 'closing reserve count lines required';
  end if;

  for v_drawer_line in select * from jsonb_array_elements(p_closing_drawer_count_lines)
  loop
    v_denom := (v_drawer_line ->> 'denomination_value')::numeric;
    v_qty := (v_drawer_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid closing drawer denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid closing drawer denomination quantity';
    end if;

    v_closing_drawer_amount := v_closing_drawer_amount + (v_denom * v_qty);
  end loop;

  for v_reserve_line in select * from jsonb_array_elements(p_closing_reserve_count_lines)
  loop
    v_denom := (v_reserve_line ->> 'denomination_value')::numeric;
    v_qty := (v_reserve_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid closing reserve denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid closing reserve denomination quantity';
    end if;

    v_closing_reserve_amount := v_closing_reserve_amount + (v_denom * v_qty);
  end loop;

  v_counted_total := v_closing_drawer_amount + v_closing_reserve_amount;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
  end if;

  if v_session.status <> 'open' then
    raise exception 'cash session already closed';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = v_session.branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  select *
  into v_summary
  from public.v_cashbox_session_current v
  where v.session_id = p_session_id
    and v.org_id = p_org_id;

  if not found then
    raise exception 'cash session summary unavailable';
  end if;

  update public.cash_sessions
  set
    status = 'closed',
    closed_by = auth.uid(),
    closed_at = v_closed_at,
    expected_cash_amount = v_summary.expected_cash_amount,
    closing_drawer_amount = round(v_closing_drawer_amount, 2),
    closing_reserve_amount = round(v_closing_reserve_amount, 2),
    counted_cash_amount = round(v_counted_total, 2),
    difference_amount = round(v_counted_total, 2) - v_summary.expected_cash_amount,
    close_note = nullif(trim(coalesce(p_close_note, '')), ''),
    closed_controlled_by_name = v_controlled_by_name,
    close_confirmed = v_confirmed,
    updated_at = v_closed_at
  where id = p_session_id;

  delete from public.cash_session_count_lines ccl
  where ccl.session_id = p_session_id
    and ccl.count_scope in ('closing_drawer', 'closing_reserve');

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    v_session.branch_id,
    p_session_id,
    'closing_drawer',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_closed_at
  from jsonb_array_elements(p_closing_drawer_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    v_session.branch_id,
    p_session_id,
    'closing_reserve',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_closed_at
  from jsonb_array_elements(p_closing_reserve_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_session_closed',
    'cash_session',
    p_session_id,
    v_session.branch_id,
    jsonb_build_object(
      'expected_cash_amount', v_summary.expected_cash_amount,
      'closing_drawer_amount', round(v_closing_drawer_amount, 2),
      'closing_reserve_amount', round(v_closing_reserve_amount, 2),
      'counted_cash_amount', round(v_counted_total, 2),
      'difference_amount', round(v_counted_total, 2) - v_summary.expected_cash_amount,
      'close_note', nullif(trim(coalesce(p_close_note, '')), ''),
      'closed_controlled_by_name', v_controlled_by_name,
      'close_confirmed', v_confirmed,
      'closing_drawer_count_lines', p_closing_drawer_count_lines,
      'closing_reserve_count_lines', p_closing_reserve_count_lines,
      'period_type', v_session.period_type,
      'session_label', v_session.session_label,
      'opened_by', v_session.opened_by
    )
  );

  return query
  select
    p_session_id,
    v_summary.expected_cash_amount,
    round(v_counted_total, 2),
    round(v_counted_total, 2) - v_summary.expected_cash_amount,
    v_closed_at;
end;
$$;


ALTER FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text", "p_closed_controlled_by_name" "text", "p_close_confirmed" boolean, "p_closing_drawer_count_lines" "jsonb", "p_closing_reserve_count_lines" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("sale_id" "uuid", "sale_payment_id" "uuid", "previous_payment_method" "public"."payment_method", "payment_method" "public"."payment_method")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payment record;
  v_sale record;
  v_distinct_methods integer := 0;
  v_summary_method public.payment_method;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_payment_method = 'mixed' then
    raise exception 'invalid payment method';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'reason is required';
  end if;

  select sp.*
  into v_payment
  from public.sale_payments sp
  where sp.id = p_sale_payment_id
    and sp.org_id = p_org_id
  for update;

  if not found then
    raise exception 'sale payment not found';
  end if;

  select s.*
  into v_sale
  from public.sales s
  where s.id = v_payment.sale_id
    and s.org_id = p_org_id
  for update;

  if not found then
    raise exception 'sale not found';
  end if;

  if exists (
    select 1
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = v_sale.branch_id
      and cs.status = 'closed'
      and v_sale.created_at >= cs.opened_at
      and v_sale.created_at <= cs.closed_at
  ) then
    raise exception 'sale belongs to a closed cash session';
  end if;

  if p_payment_method in ('card', 'debit', 'credit') then
    if p_payment_device_id is null then
      raise exception 'payment_device_id required for debit/credit';
    end if;

    if not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = v_sale.branch_id
    ) then
      raise exception 'invalid payment device';
    end if;
  elsif p_payment_method = 'mercadopago' then
    if p_payment_device_id is not null and not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = v_sale.branch_id
    ) then
      raise exception 'invalid payment device';
    end if;
  elsif p_payment_device_id is not null then
    raise exception 'payment_device_id only allowed for debit/credit and mercadopago';
  end if;

  update public.sale_payments
  set
    payment_method = p_payment_method,
    payment_device_id = p_payment_device_id
  where id = p_sale_payment_id
    and org_id = p_org_id;

  select count(distinct sp.payment_method)
  into v_distinct_methods
  from public.sale_payments sp
  where sp.sale_id = v_sale.id
    and sp.org_id = p_org_id;

  if v_distinct_methods > 1 then
    v_summary_method := 'mixed';
  else
    select sp.payment_method
    into v_summary_method
    from public.sale_payments sp
    where sp.sale_id = v_sale.id
      and sp.org_id = p_org_id
    order by sp.created_at, sp.id
    limit 1;
  end if;

  update public.sales
  set payment_method = coalesce(v_summary_method, p_payment_method)
  where id = v_sale.id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_payment_method_corrected',
    'sale_payment',
    p_sale_payment_id,
    v_sale.branch_id,
    jsonb_build_object(
      'sale_id', v_sale.id,
      'previous_payment_method', v_payment.payment_method,
      'new_payment_method', p_payment_method,
      'previous_payment_device_id', v_payment.payment_device_id,
      'new_payment_device_id', p_payment_device_id,
      'reason', v_reason
    ),
    auth.uid()
  );

  return query
  select v_sale.id, p_sale_payment_id, v_payment.payment_method, p_payment_method;
end;
$$;


ALTER FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_data_import_job"("p_org_id" "uuid", "p_template_key" "text", "p_source_file_name" "text", "p_source_file_path" "text" DEFAULT NULL::"text") RETURNS TABLE("job_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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


ALTER FUNCTION "public"."rpc_create_data_import_job"("p_org_id" "uuid", "p_template_key" "text", "p_source_file_name" "text", "p_source_file_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") RETURNS TABLE("batch_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with inserted as (
    insert into public.expiration_batches (
      org_id, branch_id, product_id, expires_on, quantity, source_type, source_ref_id
    ) values (
      p_org_id, p_branch_id, p_product_id, p_expires_on, p_quantity, 'manual', p_source_ref_id
    )
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'expiration_batch_created',
      'expiration_batch',
      (select id from inserted),
      p_branch_id,
      jsonb_build_object(
        'product_id', p_product_id,
        'expires_on', p_expires_on,
        'quantity', p_quantity
      ),
      null
    )
  )
  select id from inserted;
$$;


ALTER FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_online_order"("p_org_slug" "text", "p_branch_slug" "text", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_customer_notes" "text" DEFAULT NULL::"text") RETURNS TABLE("online_order_id" "uuid", "order_code" "text", "tracking_token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org_id uuid;
  v_branch_id uuid;
  v_allow_out_of_stock_order boolean;
  v_order_id uuid := gen_random_uuid();
  v_order_code text := upper('ONL-' || substr(replace(v_order_id::text, '-', ''), 1, 10));
  v_tracking_token text := replace(gen_random_uuid()::text, '-', '');
  v_actor uuid := auth.uid();
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric(14,3);
  v_product_name text;
  v_unit_price numeric(12,2);
  v_stock numeric(14,3);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items are required';
  end if;

  select o.id, b.id, ss.allow_out_of_stock_order
    into v_org_id, v_branch_id, v_allow_out_of_stock_order
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  where o.is_active = true
    and o.storefront_slug = p_org_slug
    and b.storefront_slug = p_branch_slug;

  if v_org_id is null or v_branch_id is null then
    raise exception 'storefront not found or disabled';
  end if;

  if coalesce(btrim(p_customer_name), '') = '' then
    raise exception 'customer_name is required';
  end if;

  if coalesce(btrim(p_customer_phone), '') = '' then
    raise exception 'customer_phone is required';
  end if;

  if coalesce(btrim(p_customer_address), '') = '' then
    raise exception 'customer_address is required';
  end if;

  insert into public.online_orders (
    id,
    org_id,
    branch_id,
    order_code,
    status,
    customer_name,
    customer_phone,
    customer_address,
    customer_notes,
    payment_intent,
    subtotal_amount,
    total_amount,
    created_by_user_id
  ) values (
    v_order_id,
    v_org_id,
    v_branch_id,
    v_order_code,
    'pending',
    btrim(p_customer_name),
    btrim(p_customer_phone),
    btrim(p_customer_address),
    p_customer_notes,
    'pay_on_pickup',
    0,
    0,
    v_actor
  );

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := nullif(v_item->>'quantity', '')::numeric;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid item payload';
    end if;

    select p.name, p.unit_price, coalesce(si.quantity_on_hand, 0)
      into v_product_name, v_unit_price, v_stock
    from public.products p
    left join public.stock_items si
      on si.org_id = p.org_id
     and si.product_id = p.id
     and si.branch_id = v_branch_id
    where p.org_id = v_org_id
      and p.id = v_product_id
      and p.is_active = true;

    if v_product_name is null then
      raise exception 'product not found or inactive: %', v_product_id;
    end if;

    if not v_allow_out_of_stock_order and v_quantity > coalesce(v_stock, 0) then
      raise exception 'insufficient stock for product %', v_product_name;
    end if;

    insert into public.online_order_items (
      org_id,
      online_order_id,
      product_id,
      product_name_snapshot,
      unit_price_snapshot,
      quantity,
      line_total
    ) values (
      v_org_id,
      v_order_id,
      v_product_id,
      v_product_name,
      v_unit_price,
      v_quantity,
      round((v_unit_price * v_quantity)::numeric, 2)
    );

    v_total := v_total + round((v_unit_price * v_quantity)::numeric, 2);
  end loop;

  update public.online_orders
  set subtotal_amount = v_total,
      total_amount = v_total
  where id = v_order_id;

  insert into public.online_order_status_history (
    org_id,
    online_order_id,
    old_status,
    new_status,
    changed_by_user_id,
    customer_note
  ) values (
    v_org_id,
    v_order_id,
    null,
    'pending',
    v_actor,
    p_customer_notes
  );

  insert into public.online_order_tracking_tokens (
    org_id,
    online_order_id,
    token,
    is_active
  ) values (
    v_org_id,
    v_order_id,
    v_tracking_token,
    true
  );

  online_order_id := v_order_id;
  order_code := v_order_code;
  tracking_token := v_tracking_token;
  return next;
end;
$$;


ALTER FUNCTION "public"."rpc_create_online_order"("p_org_slug" "text", "p_branch_slug" "text", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_customer_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid" DEFAULT NULL::"uuid", "p_close_special_order" boolean DEFAULT false, "p_apply_cash_discount" boolean DEFAULT false, "p_cash_discount_pct" numeric DEFAULT NULL::numeric, "p_payments" "jsonb" DEFAULT NULL::"jsonb", "p_payment_device_id" "uuid" DEFAULT NULL::"uuid", "p_apply_employee_discount" boolean DEFAULT false, "p_employee_discount_pct" numeric DEFAULT NULL::numeric, "p_employee_account_id" "uuid" DEFAULT NULL::"uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("sale_id" "uuid", "total" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_sale_id uuid := gen_random_uuid();
  v_total numeric(12,2) := 0;
  v_subtotal numeric(12,2) := 0;
  v_discount_amount numeric(12,2) := 0;
  v_discount_pct numeric(5,2) := 0;
  v_created_at timestamptz := now();
  v_allow_negative boolean := true;
  v_cash_discount_enabled boolean := true;
  v_cash_discount_default_pct numeric(5,2) := 10;
  v_employee_discount_enabled boolean := true;
  v_employee_discount_default_pct numeric(5,2) := 10;
  v_employee_discount_combinable boolean := false;
  v_pos_enabled boolean := false;
  v_cash_discount_applied boolean := false;
  v_employee_discount_applied boolean := false;
  v_cash_discount_amount numeric(12,2) := 0;
  v_cash_discount_pct numeric(5,2) := 0;
  v_employee_discount_amount numeric(12,2) := 0;
  v_employee_discount_pct numeric(5,2) := 0;
  v_employee_name_snapshot text := null;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_price numeric(12,2);
  v_name text;
  v_line_total numeric(12,2);
  v_current numeric(14,3);
  v_remaining numeric(14,3);
  v_batch record;
  v_items_count int := 0;
  v_remaining_items bigint;
  v_item_rows record;
  v_to_apply numeric(14,3);
  v_order_status public.special_order_status;
  v_payment jsonb;
  v_payment_method public.payment_method;
  v_payment_amount numeric(12,2);
  v_payments_sum numeric(12,2) := 0;
  v_payments_count int := 0;
  v_has_cash_payment boolean := false;
  v_single_payment_method public.payment_method := null;
  v_summary_payment_method public.payment_method := null;
  v_payment_rows jsonb := '[]'::jsonb;
  v_payment_device_id uuid;
  v_single_payment_device_id uuid := null;
  v_effective_payment_method public.payment_method;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
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
        and bm.branch_id = p_branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id = p_branch_id
         and sma.role = 'staff'
         and sma.module_key = 'pos'
       limit 1),
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id is null
         and sma.role = 'staff'
         and sma.module_key = 'pos'
       limit 1),
      false
    ) into v_pos_enabled;

    if not v_pos_enabled then
      raise exception 'pos module disabled';
    end if;
  end if;

  if p_client_id is not null and not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.org_id = p_org_id
      and c.is_active = true
  ) then
    raise exception 'invalid client';
  end if;

  v_effective_payment_method := p_payment_method;

  if v_effective_payment_method::text = 'mixed' and (p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0) then
    raise exception 'mixed payment requires payments detail';
  end if;

  if p_cash_discount_pct is not null and not coalesce(p_apply_cash_discount, false) then
    raise exception 'cash discount pct requires apply_cash_discount';
  end if;

  if p_employee_discount_pct is not null and not coalesce(p_apply_employee_discount, false) then
    raise exception 'employee discount pct requires apply_employee_discount';
  end if;

  if p_employee_account_id is not null and not coalesce(p_apply_employee_discount, false) then
    raise exception 'employee account requires apply_employee_discount';
  end if;

  if p_payments is null then
    if v_effective_payment_method::text in ('card', 'mercadopago') and p_payment_device_id is null then
      raise exception 'payment_device_id required for card and mercadopago';
    end if;

    if p_payment_device_id is not null and v_effective_payment_method::text not in ('card', 'mercadopago') then
      raise exception 'payment_device_id only allowed for card and mercadopago';
    end if;

    if p_payment_device_id is not null and not exists (
      select 1
      from public.pos_payment_devices ppd
      where ppd.id = p_payment_device_id
        and ppd.org_id = p_org_id
        and ppd.branch_id = p_branch_id
        and ppd.is_active = true
    ) then
      raise exception 'invalid payment device';
    end if;

    v_single_payment_device_id := p_payment_device_id;
  end if;

  select
    allow_negative_stock,
    cash_discount_enabled,
    cash_discount_default_pct,
    employee_discount_enabled,
    employee_discount_default_pct,
    employee_discount_combinable_with_cash_discount
  into
    v_allow_negative,
    v_cash_discount_enabled,
    v_cash_discount_default_pct,
    v_employee_discount_enabled,
    v_employee_discount_default_pct,
    v_employee_discount_combinable
  from public.org_preferences
  where org_id = p_org_id;

  if v_allow_negative is null then
    v_allow_negative := true;
  end if;

  if v_cash_discount_enabled is null then
    v_cash_discount_enabled := true;
  end if;

  if v_cash_discount_default_pct is null then
    v_cash_discount_default_pct := 10;
  end if;

  if v_employee_discount_enabled is null then
    v_employee_discount_enabled := true;
  end if;

  if v_employee_discount_default_pct is null then
    v_employee_discount_default_pct := 10;
  end if;

  if v_employee_discount_combinable is null then
    v_employee_discount_combinable := false;
  end if;

  if coalesce(p_apply_cash_discount, false) then
    if not v_cash_discount_enabled then
      raise exception 'cash discount disabled';
    end if;

    if v_effective_payment_method::text = 'mixed' then
      if not exists (
        select 1
        from jsonb_array_elements(p_payments) elem
        where elem ->> 'payment_method' = 'cash'
      ) then
        raise exception 'cash discount requires cash payment';
      end if;
    elsif v_effective_payment_method::text <> 'cash' then
      raise exception 'cash discount requires cash payment';
    end if;

    v_cash_discount_pct := coalesce(p_cash_discount_pct, v_cash_discount_default_pct);
    if v_cash_discount_pct < 0 or v_cash_discount_pct > 100 then
      raise exception 'cash discount pct out of range';
    end if;
  end if;

  if coalesce(p_apply_employee_discount, false) then
    if not v_employee_discount_enabled then
      raise exception 'employee discount disabled';
    end if;

    if p_employee_account_id is null then
      raise exception 'employee account required';
    end if;

    if not exists (
      select 1
      from public.employee_accounts ea
      where ea.id = p_employee_account_id
        and ea.org_id = p_org_id
        and ea.branch_id = p_branch_id
        and ea.is_active = true
    ) then
      raise exception 'invalid employee account';
    end if;

    if coalesce(p_apply_cash_discount, false) and not v_employee_discount_combinable then
      raise exception 'employee discount cannot be combined with cash discount';
    end if;

    select ea.name
      into v_employee_name_snapshot
    from public.employee_accounts ea
    where ea.id = p_employee_account_id;

    v_employee_discount_pct := coalesce(
      p_employee_discount_pct,
      v_employee_discount_default_pct
    );
    if v_employee_discount_pct < 0 or v_employee_discount_pct > 100 then
      raise exception 'employee discount pct out of range';
    end if;
  end if;

  insert into public.sales (
    id,
    org_id,
    branch_id,
    client_id,
    created_by,
    payment_method,
    subtotal_amount,
    discount_amount,
    discount_pct,
    total_amount,
    employee_account_id,
    employee_name_snapshot,
    cash_discount_amount,
    cash_discount_pct,
    employee_discount_applied,
    employee_discount_amount,
    employee_discount_pct,
    created_at
  )
  values (
    v_sale_id,
    p_org_id,
    p_branch_id,
    p_client_id,
    auth.uid(),
    case when v_effective_payment_method::text = 'mixed' then 'other'::public.payment_method else v_effective_payment_method end,
    0,
    0,
    0,
    0,
    p_employee_account_id,
    v_employee_name_snapshot,
    0,
    0,
    coalesce(p_apply_employee_discount, false),
    0,
    0,
    v_created_at
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_items_count := v_items_count + 1;
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := (v_item ->> 'quantity')::numeric;

    select p.unit_price, p.name
      into v_price, v_name
    from public.products p
    where p.id = v_product_id
      and p.org_id = p_org_id;

    if v_price is null then
      raise exception 'product not found %', v_product_id;
    end if;

    select quantity_on_hand
      into v_current
    from public.stock_items
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = v_product_id
    for update;

    if v_current is null then
      v_current := 0;
    end if;

    if not v_allow_negative and v_current < v_qty then
      raise exception 'insufficient stock for product %', v_product_id;
    end if;

    v_line_total := round((v_price * v_qty)::numeric, 2);
    v_subtotal := v_subtotal + v_line_total;

    insert into public.sale_items (
      org_id,
      sale_id,
      product_id,
      product_name_snapshot,
      unit_price_snapshot,
      quantity,
      line_total
    )
    values (
      p_org_id,
      v_sale_id,
      v_product_id,
      v_name,
      v_price,
      v_qty,
      v_line_total
    );

    v_remaining := v_qty;

    for v_batch in
      select
        eb.id,
        eb.quantity
      from public.expiration_batches eb
      where eb.org_id = p_org_id
        and eb.branch_id = p_branch_id
        and eb.product_id = v_product_id
        and eb.quantity > 0
      order by eb.expires_on asc, eb.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      v_to_apply := least(v_batch.quantity, v_remaining);

      update public.expiration_batches
      set quantity = quantity - v_to_apply
      where id = v_batch.id;

      v_remaining := v_remaining - v_to_apply;
    end loop;

    update public.stock_items
    set quantity_on_hand = quantity_on_hand - v_qty,
        updated_at = now()
    where org_id = p_org_id
      and branch_id = p_branch_id
      and product_id = v_product_id;

    if not found then
      insert into public.stock_items (
        org_id,
        branch_id,
        product_id,
        quantity_on_hand,
        updated_at
      )
      values (
        p_org_id,
        p_branch_id,
        v_product_id,
        -v_qty,
        now()
      );
    end if;

    insert into public.stock_movements (
      org_id,
      branch_id,
      product_id,
      movement_type,
      quantity_delta,
      source_type,
      source_id
    )
    values (
      p_org_id,
      p_branch_id,
      v_product_id,
      'sale',
      -v_qty,
      'sale',
      v_sale_id
    );
  end loop;

  if v_items_count = 0 then
    raise exception 'sale requires at least one item';
  end if;

  v_discount_amount := 0;
  v_discount_pct := 0;

  if coalesce(p_apply_cash_discount, false) then
    v_cash_discount_amount := round((v_subtotal * (v_cash_discount_pct / 100))::numeric, 2);
    v_cash_discount_applied := v_cash_discount_amount > 0;
  end if;

  if coalesce(p_apply_employee_discount, false) then
    v_employee_discount_amount := round((((v_subtotal - v_cash_discount_amount) * (v_employee_discount_pct / 100)))::numeric, 2);
    v_employee_discount_applied := v_employee_discount_amount > 0;
  end if;

  v_discount_amount := v_cash_discount_amount + v_employee_discount_amount;
  if v_subtotal > 0 and v_discount_amount > 0 then
    v_discount_pct := round(((v_discount_amount / v_subtotal) * 100)::numeric, 2);
  end if;
  v_total := greatest(round((v_subtotal - v_discount_amount)::numeric, 2), 0);

  if p_payments is not null then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      v_payment_method := (v_payment ->> 'payment_method')::public.payment_method;
      v_payment_amount := round(((v_payment ->> 'amount')::numeric)::numeric, 2);
      v_payment_device_id := nullif(v_payment ->> 'payment_device_id', '')::uuid;

      if v_payment_method::text = 'mixed' then
        raise exception 'payments entries cannot use mixed method';
      end if;

      if v_payment_amount is null or v_payment_amount <= 0 then
        raise exception 'payment amount must be greater than zero';
      end if;

      if v_payment_method::text in ('card', 'mercadopago') then
        if v_payment_device_id is null then
          raise exception 'payment_device_id required for card and mercadopago';
        end if;

        if not exists (
          select 1
          from public.pos_payment_devices ppd
          where ppd.id = v_payment_device_id
            and ppd.org_id = p_org_id
            and ppd.branch_id = p_branch_id
            and ppd.is_active = true
        ) then
          raise exception 'invalid payment device';
        end if;
      elsif v_payment_device_id is not null then
        raise exception 'payment_device_id only allowed for card and mercadopago';
      end if;

      v_payments_sum := v_payments_sum + v_payment_amount;
      v_payments_count := v_payments_count + 1;
      if v_payment_method::text = 'cash' then
        v_has_cash_payment := true;
      end if;
      if v_payments_count = 1 then
        v_single_payment_method := v_payment_method;
      elsif v_single_payment_method is distinct from v_payment_method then
        v_single_payment_method := null;
      end if;

      v_payment_rows := v_payment_rows || jsonb_build_array(
        jsonb_build_object(
          'payment_method', v_payment_method,
          'amount', v_payment_amount,
          'payment_device_id', v_payment_device_id
        )
      );
    end loop;

    if round(v_payments_sum::numeric, 2) <> v_total then
      raise exception 'payments total must equal sale total';
    end if;

    if coalesce(p_apply_cash_discount, false) and not v_has_cash_payment then
      raise exception 'cash discount requires cash payment';
    end if;

    if v_payments_count = 1 and v_single_payment_method is not null then
      v_summary_payment_method := v_single_payment_method;
    else
      v_summary_payment_method := 'mixed'::public.payment_method;
    end if;
  else
    v_summary_payment_method := v_effective_payment_method;
    v_payment_rows := jsonb_build_array(
      jsonb_build_object(
        'payment_method', v_effective_payment_method,
        'amount', v_total,
        'payment_device_id', v_single_payment_device_id
      )
    );
  end if;

  update public.sales
  set
    payment_method = case when v_summary_payment_method::text = 'mixed' then 'other'::public.payment_method else v_summary_payment_method end,
    subtotal_amount = v_subtotal,
    discount_amount = v_discount_amount,
    discount_pct = v_discount_pct,
    total_amount = v_total,
    cash_discount_amount = v_cash_discount_amount,
    cash_discount_pct = v_cash_discount_pct,
    employee_discount_applied = v_employee_discount_applied,
    employee_discount_amount = v_employee_discount_amount,
    employee_discount_pct = v_employee_discount_pct,
    employee_account_id = case when v_employee_discount_applied then p_employee_account_id else null end,
    employee_name_snapshot = case when v_employee_discount_applied then v_employee_name_snapshot else null end
  where id = v_sale_id;

  insert into public.sale_payments (
    org_id,
    sale_id,
    payment_method,
    amount,
    payment_device_id
  )
  select
    p_org_id,
    v_sale_id,
    (value ->> 'payment_method')::public.payment_method,
    ((value ->> 'amount')::numeric(12,2)),
    nullif(value ->> 'payment_device_id', '')::uuid
  from jsonb_array_elements(v_payment_rows);

  if p_special_order_id is not null then
    select status
      into v_order_status
    from public.client_special_orders
    where id = p_special_order_id
      and org_id = p_org_id;

    if v_order_status is null then
      raise exception 'special order not found';
    end if;

    update public.client_special_orders
    set status = case
      when coalesce(p_close_special_order, false) then 'delivered'::public.special_order_status
      else 'partial'::public.special_order_status
    end,
    updated_at = now()
    where id = p_special_order_id
      and org_id = p_org_id;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_created',
    'sales',
    v_sale_id,
    p_branch_id,
    jsonb_build_object(
      'branch_id', p_branch_id,
      'client_id', p_client_id,
      'payment_method', v_summary_payment_method,
      'special_order_id', p_special_order_id,
      'items_count', v_items_count,
      'total', v_total
    ),
    null
  );

  return query select v_sale_id, v_total, v_created_at;
end;
$$;


ALTER FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid", "p_close_special_order" boolean, "p_apply_cash_discount" boolean, "p_cash_discount_pct" numeric, "p_payments" "jsonb", "p_payment_device_id" "uuid", "p_apply_employee_discount" boolean, "p_employee_discount_pct" numeric, "p_employee_account_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") RETURNS TABLE("special_order_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_requested_qty numeric(14,3);
  v_supplier_id uuid;
  v_notes text;
  v_description text;
begin
  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  v_description := coalesce(v_notes, 'Pedido especial');

  insert into public.client_special_orders (
    org_id,
    branch_id,
    client_id,
    description,
    quantity,
    status,
    created_by,
    notes
  ) values (
    p_org_id,
    p_branch_id,
    p_client_id,
    v_description,
    null,
    'pending',
    auth.uid(),
    v_notes
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_requested_qty := (v_item ->> 'requested_qty')::numeric;
    v_supplier_id := nullif((v_item ->> 'supplier_id')::text, '')::uuid;

    if v_product_id is null or v_requested_qty is null or v_requested_qty <= 0 then
      raise exception 'invalid special order item';
    end if;

    insert into public.client_special_order_items (
      org_id,
      special_order_id,
      product_id,
      supplier_id,
      requested_qty,
      fulfilled_qty
    ) values (
      p_org_id,
      v_order_id,
      v_product_id,
      v_supplier_id,
      v_requested_qty,
      0
    );
  end loop;

  perform public.rpc_log_audit_event(
    p_org_id,
    'special_order_created',
    'special_order',
    v_order_id,
    p_branch_id,
    jsonb_build_object(
      'client_id', p_client_id,
      'items_count', jsonb_array_length(coalesce(p_items, '[]'::jsonb))
    ),
    null
  );

  return query select v_order_id;
end;
$$;


ALTER FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") RETURNS TABLE("order_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with inserted as (
    insert into public.supplier_orders (
      org_id, branch_id, supplier_id, status, notes, created_by
    ) values (
      p_org_id, p_branch_id, p_supplier_id, 'draft', p_notes, auth.uid()
    )
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_created',
      'supplier_order',
      (select id from inserted),
      p_branch_id,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'status', 'draft',
        'notes', p_notes
      ),
      null
    )
  )
  select id from inserted;
$$;


ALTER FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_enqueue_sale_fiscal_invoice"("p_org_id" "uuid", "p_sale_id" "uuid", "p_environment" "text" DEFAULT 'homo'::"text", "p_cbte_tipo" integer DEFAULT 11, "p_doc_tipo" integer DEFAULT 99, "p_doc_nro" bigint DEFAULT 0, "p_source" "text" DEFAULT 'manual'::"text") RETURNS TABLE("sale_document_id" "uuid", "invoice_job_id" "uuid", "job_status" "text", "already_existed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
  v_fiscal_prod_enqueue_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if v_environment not in ('homo', 'prod') then
    raise exception 'invalid fiscal environment: %', p_environment;
  end if;

  if v_environment = 'prod' then
    select coalesce(op.fiscal_prod_enqueue_enabled, false)
    into v_fiscal_prod_enqueue_enabled
    from public.org_preferences op
    where op.org_id = p_org_id;

    if not v_fiscal_prod_enqueue_enabled then
      raise exception 'fiscal prod enqueue disabled for org %', p_org_id;
    end if;
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
      'source', coalesce(v_source, 'manual'),
      'fiscalEnvironment', v_environment
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

  perform public.fn_fiscal_append_event(
    p_org_id,
    v_invoice_job_id,
    'job_enqueued',
    jsonb_build_object(
      'sale_document_id', v_sale_document_id,
      'invoice_job_id', v_invoice_job_id,
      'environment', v_environment,
      'pto_vta', v_pos.pto_vta,
      'cbte_tipo', p_cbte_tipo,
      'source', coalesce(v_source, 'manual')
    )
  );

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_invoice_job_enqueued',
    'invoice_job',
    v_invoice_job_id,
    v_sale.branch_id,
    jsonb_build_object(
      'sale_id', p_sale_id,
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


ALTER FUNCTION "public"."rpc_enqueue_sale_fiscal_invoice"("p_org_id" "uuid", "p_sale_id" "uuid", "p_environment" "text", "p_cbte_tipo" integer, "p_doc_tipo" integer, "p_doc_nro" bigint, "p_source" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_enqueue_sale_fiscal_invoice"("p_org_id" "uuid", "p_sale_id" "uuid", "p_environment" "text", "p_cbte_tipo" integer, "p_doc_tipo" integer, "p_doc_nro" bigint, "p_source" "text") IS 'Encola una solicitud fiscal para una venta existente. Para ambiente prod requiere org_preferences.fiscal_prod_enqueue_enabled=true.';



CREATE OR REPLACE FUNCTION "public"."rpc_get_active_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select case
    when public.is_platform_admin() then (
      select uao.active_org_id
      from public.user_active_orgs uao
      where uao.user_id = auth.uid()
      limit 1
    )
    else (
      select ou.org_id
      from public.org_users ou
      where ou.user_id = auth.uid()
        and ou.is_active = true
      order by ou.updated_at desc nulls last, ou.created_at desc
      limit 1
    )
  end;
$$;


ALTER FUNCTION "public"."rpc_get_active_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") RETURNS TABLE("payment_method" "public"."payment_method", "payment_device_id" "uuid", "payment_device_name" "text", "payment_device_provider" "text", "total_amount" numeric, "payments_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session record;
  v_cashbox_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (sma.branch_id = v_session.branch_id or sma.branch_id is null)
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  return query
  select
    sp.payment_method,
    sp.payment_device_id,
    case
      when sp.payment_method = 'cash' then 'Efectivo'
      when ppd.device_name is null then 'Sin dispositivo'
      else ppd.device_name
    end as payment_device_name,
    ppd.provider as payment_device_provider,
    coalesce(sum(sp.amount), 0)::numeric(12,2) as total_amount,
    count(*)::bigint as payments_count
  from public.sales s
  join public.sale_payments sp
    on sp.sale_id = s.id
   and sp.org_id = s.org_id
  left join public.pos_payment_devices ppd
    on ppd.id = sp.payment_device_id
   and ppd.org_id = sp.org_id
  where s.org_id = p_org_id
    and s.branch_id = v_session.branch_id
    and s.created_at >= v_session.opened_at
    and s.created_at <= coalesce(v_session.closed_at, now())
  group by
    sp.payment_method,
    sp.payment_device_id,
    case
      when sp.payment_method = 'cash' then 'Efectivo'
      when ppd.device_name is null then 'Sin dispositivo'
      else ppd.device_name
    end,
    ppd.provider
  order by sp.payment_method::text, payment_device_name;
end;
$$;


ALTER FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cash_session_reconciliation_rows"("p_org_id" "uuid", "p_session_id" "uuid") RETURNS TABLE("row_key" "text", "row_group" "text", "payment_method" "public"."payment_method", "payment_device_id" "uuid", "payment_device_name" "text", "payment_device_provider" "text", "payments_count" bigint, "system_amount" numeric, "reported_amount" numeric, "difference_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session record;
  v_cashbox_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (sma.branch_id = v_session.branch_id or sma.branch_id is null)
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  return query
  with expected_cash_row as (
    select
      'cash_expected_total'::text as row_key,
      'cash_expected_total'::text as row_group,
      'cash'::public.payment_method as payment_method,
      null::uuid as payment_device_id,
      'Efectivo esperado total (caja + reserva)'::text as payment_device_name,
      null::text as payment_device_provider,
      0::bigint as payments_count,
      coalesce(vcs.expected_cash_amount, 0)::numeric(12,2) as system_amount
    from public.v_cashbox_session_current vcs
    where vcs.org_id = p_org_id
      and vcs.session_id = p_session_id
    limit 1
  ),
  payment_rows as (
    select
      sp.payment_method,
      sp.payment_device_id,
      ppd.device_name as payment_device_name,
      ppd.provider as payment_device_provider,
      case when sp.payment_method = 'mercadopago' then true else false end as is_mercadopago,
      sp.amount
    from public.sales s
    join public.sale_payments sp
      on sp.sale_id = s.id
     and sp.org_id = s.org_id
    left join public.pos_payment_devices ppd
      on ppd.id = sp.payment_device_id
     and ppd.org_id = sp.org_id
    where s.org_id = p_org_id
      and s.branch_id = v_session.branch_id
      and s.created_at >= v_session.opened_at
      and s.created_at <= coalesce(v_session.closed_at, now())
      and sp.payment_method <> 'cash'
  ),
  grouped_non_mp as (
    select
      concat('device:', coalesce(pr.payment_device_id::text, 'none'), ':method:', pr.payment_method::text) as row_key,
      'device'::text as row_group,
      pr.payment_method,
      pr.payment_device_id,
      coalesce(pr.payment_device_name, 'Sin dispositivo') as payment_device_name,
      pr.payment_device_provider,
      count(*)::bigint as payments_count,
      coalesce(sum(pr.amount), 0)::numeric(12,2) as system_amount
    from payment_rows pr
    where pr.is_mercadopago = false
    group by
      pr.payment_method,
      pr.payment_device_id,
      coalesce(pr.payment_device_name, 'Sin dispositivo'),
      pr.payment_device_provider
  ),
  grouped_mp as (
    select
      'mercadopago_total'::text as row_key,
      'mercadopago_total'::text as row_group,
      'mercadopago'::public.payment_method as payment_method,
      null::uuid as payment_device_id,
      'MercadoPago (total)'::text as payment_device_name,
      'mercadopago'::text as payment_device_provider,
      count(*)::bigint as payments_count,
      coalesce(sum(pr.amount), 0)::numeric(12,2) as system_amount
    from payment_rows pr
    where pr.is_mercadopago = true
  ),
  grouped as (
    select ec.* from expected_cash_row ec
    union all
    select gnm.* from grouped_non_mp gnm
    union all
    select gm.* from grouped_mp gm
    where gm.payments_count > 0
  )
  select
    g.row_key,
    g.row_group,
    g.payment_method,
    g.payment_device_id,
    g.payment_device_name,
    g.payment_device_provider,
    g.payments_count,
    g.system_amount,
    i.reported_amount,
    case
      when i.reported_amount is null then null
      else round((i.reported_amount - g.system_amount)::numeric, 2)
    end as difference_amount
  from grouped g
  left join public.cash_session_reconciliation_inputs i
    on i.org_id = p_org_id
   and i.session_id = p_session_id
   and i.row_key = g.row_key
  order by
    case
      when g.row_group = 'cash_expected_total' then 0
      when g.row_group = 'device' then 1
      when g.row_group = 'mercadopago_total' then 2
      else 3
    end,
    g.payment_method::text,
    g.payment_device_name;
end;
$$;


ALTER FUNCTION "public"."rpc_get_cash_session_reconciliation_rows"("p_org_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") RETURNS TABLE("session_id" "uuid", "branch_id" "uuid", "status" "text", "period_type" "text", "session_label" "text", "opening_cash_amount" numeric, "opening_reserve_amount" numeric, "closing_drawer_amount" numeric, "closing_reserve_amount" numeric, "cash_sales_amount" numeric, "card_sales_amount" numeric, "mercadopago_sales_amount" numeric, "manual_income_amount" numeric, "manual_expense_amount" numeric, "expected_cash_amount" numeric, "counted_cash_amount" numeric, "difference_amount" numeric, "movements_count" bigint, "opened_by" "uuid", "opened_controlled_by_name" "text", "closed_by" "uuid", "opened_at" timestamp with time zone, "closed_at" timestamp with time zone, "close_note" "text", "closed_controlled_by_name" "text", "close_confirmed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session record;
  v_cashbox_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = v_session.branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  return query
  select
    v.session_id,
    v.branch_id,
    v.status,
    v.period_type,
    v.session_label,
    v.opening_cash_amount,
    v.opening_reserve_amount,
    v.closing_drawer_amount,
    v.closing_reserve_amount,
    v.cash_sales_amount,
    v.card_sales_amount,
    v.mercadopago_sales_amount,
    v.manual_income_amount,
    v.manual_expense_amount,
    v.expected_cash_amount,
    v.counted_cash_amount,
    v.difference_amount,
    v.movements_count,
    v.opened_by,
    v.opened_controlled_by_name,
    v.closed_by,
    v.opened_at,
    v.closed_at,
    v.close_note,
    v.closed_controlled_by_name,
    v.close_confirmed
  from public.v_cashbox_session_current v
  where v.session_id = p_session_id
    and v.org_id = p_org_id;
end;
$$;


ALTER FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "email" "text", "notes" "text", "is_active" boolean, "special_order_id" "uuid", "special_order_status" "public"."special_order_status", "special_order_notes" "text", "special_order_branch_id" "uuid", "special_order_created_at" timestamp with time zone, "item_id" "uuid", "product_id" "uuid", "product_name" "text", "requested_qty" numeric, "fulfilled_qty" numeric, "supplier_id" "uuid", "supplier_name" "text")
    LANGUAGE "sql"
    AS $$
  select
    c.id as client_id,
    c.name,
    c.phone,
    c.email,
    c.notes,
    c.is_active,
    so.id as special_order_id,
    so.status as special_order_status,
    so.notes as special_order_notes,
    so.branch_id as special_order_branch_id,
    so.created_at as special_order_created_at,
    soi.id as item_id,
    soi.product_id,
    p.name as product_name,
    soi.requested_qty,
    soi.fulfilled_qty,
    soi.supplier_id,
    s.name as supplier_name
  from public.clients c
  left join public.client_special_orders so
    on so.client_id = c.id
    and so.org_id = c.org_id
  left join public.client_special_order_items soi
    on soi.special_order_id = so.id
    and soi.org_id = so.org_id
  left join public.products p
    on p.id = soi.product_id
    and p.org_id = so.org_id
  left join public.suppliers s
    on s.id = soi.supplier_id
    and s.org_id = so.org_id
  where c.org_id = p_org_id
    and c.id = p_client_id
  order by so.created_at desc nulls last, p.name;
$$;


ALTER FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_client_sales_history"("p_org_id" "uuid", "p_client_id" "uuid", "p_branch_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("sale_id" "uuid", "branch_id" "uuid", "branch_name" "text", "created_at" timestamp with time zone, "payment_method_summary" "public"."payment_method", "total_amount" numeric, "is_invoiced" boolean, "invoiced_at" timestamp with time zone, "client_phone" "text", "invoice_result_status" "text", "invoice_render_status" "text", "invoice_ready" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_clients_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.org_id = p_org_id
      and c.id = p_client_id
  ) then
    raise exception 'client not found';
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

    select exists (
      select 1
      from public.rpc_get_staff_effective_modules() m
      where m.module_key = 'clients'
        and m.is_enabled = true
    )
    into v_clients_enabled;

    if not v_clients_enabled then
      raise exception 'clients module disabled';
    end if;
  end if;

  return query
  select
    s.id as sale_id,
    s.branch_id,
    b.name as branch_name,
    s.created_at,
    s.payment_method as payment_method_summary,
    s.total_amount,
    s.is_invoiced,
    s.invoiced_at,
    c.phone as client_phone,
    inv.result_status as invoice_result_status,
    inv.render_status as invoice_render_status,
    coalesce(
      inv.result_status = 'authorized'
      and inv.render_status = 'completed',
      false
    ) as invoice_ready
  from public.sales s
  join public.branches b
    on b.org_id = s.org_id
   and b.id = s.branch_id
  join public.clients c
    on c.org_id = s.org_id
   and c.id = s.client_id
  left join public.v_sale_fiscal_invoice_admin inv
    on inv.org_id = s.org_id
   and inv.sale_id = s.id
  where s.org_id = p_org_id
    and s.client_id = p_client_id
    and (p_branch_id is null or s.branch_id = p_branch_id)
    and (
      public.is_org_admin_or_superadmin(p_org_id)
      or exists (
        select 1
        from public.branch_memberships bm
        where bm.org_id = s.org_id
          and bm.branch_id = s.branch_id
          and bm.user_id = auth.uid()
          and bm.is_active = true
      )
    )
  order by s.created_at desc, s.id desc
  limit greatest(coalesce(p_limit, 10), 1);
end;
$$;


ALTER FUNCTION "public"."rpc_get_client_sales_history"("p_org_id" "uuid", "p_client_id" "uuid", "p_branch_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_get_client_sales_history"("p_org_id" "uuid", "p_client_id" "uuid", "p_branch_id" "uuid", "p_limit" integer) IS 'Historial reciente de ventas de un cliente para /clients, con control explícito de módulo clients y branch membership para staff.';



CREATE OR REPLACE FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") RETURNS TABLE("org_id" "uuid", "branch_id" "uuid", "sales_today_total" numeric, "sales_today_count" bigint, "sales_week_total" numeric, "sales_month_total" numeric, "cash_sales_today_total" numeric, "cash_sales_today_count" bigint, "cash_discount_today_total" numeric, "cash_discounted_sales_today_count" bigint, "expirations_critical_count" bigint, "expirations_warning_count" bigint, "supplier_orders_pending_count" bigint, "client_orders_pending_count" bigint, "invoiced_sales_today_total" numeric, "invoiced_sales_today_count" bigint, "non_invoiced_sales_today_total" numeric, "non_invoiced_sales_today_count" bigint)
    LANGUAGE "sql"
    AS $$
  select
    org_id,
    branch_id,
    sales_today_total,
    sales_today_count,
    sales_week_total,
    sales_month_total,
    cash_sales_today_total,
    cash_sales_today_count,
    cash_discount_today_total,
    cash_discounted_sales_today_count,
    expirations_critical_count,
    expirations_warning_count,
    supplier_orders_pending_count,
    client_orders_pending_count,
    invoiced_sales_today_total,
    invoiced_sales_today_count,
    non_invoiced_sales_today_total,
    non_invoiced_sales_today_count
  from public.v_dashboard_admin
  where org_id = p_org_id
    and (
      p_branch_id is null and branch_id is null
      or p_branch_id is not null and branch_id = p_branch_id
    );
$$;


ALTER FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_online_order_tracking"("p_tracking_token" "text") RETURNS TABLE("order_code" "text", "store_name" "text", "branch_name" "text", "status" "public"."online_order_status", "created_at" timestamp with time zone, "last_status_at" timestamp with time zone, "customer_name" "text", "customer_phone" "text", "customer_address" "text", "customer_notes" "text", "payment_intent" "public"."online_payment_intent", "total_amount" numeric, "items" "jsonb", "timeline" "jsonb", "whatsapp_phone" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_org_id uuid;
begin
  select ott.online_order_id, ott.org_id
    into v_order_id, v_org_id
  from public.online_order_tracking_tokens ott
  where ott.token = p_tracking_token
    and ott.is_active = true
    and (ott.expires_at is null or ott.expires_at > now())
  limit 1;

  if v_order_id is null then
    return;
  end if;

  return query
  with status_history as (
    select jsonb_agg(
      jsonb_build_object(
        'old_status', h.old_status,
        'new_status', h.new_status,
        'changed_at', h.changed_at,
        'customer_note', h.customer_note
      ) order by h.changed_at asc
    ) as history,
    max(h.changed_at) as last_changed_at
    from public.online_order_status_history h
    where h.online_order_id = v_order_id
  ),
  order_items as (
    select jsonb_agg(
      jsonb_build_object(
        'product_name', oi.product_name_snapshot,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price_snapshot,
        'line_total', oi.line_total
      ) order by oi.created_at asc
    ) as items_json
    from public.online_order_items oi
    where oi.online_order_id = v_order_id
  )
  select
    oo.order_code,
    o.name,
    b.name,
    oo.status,
    oo.created_at,
    coalesce(sh.last_changed_at, oo.updated_at),
    oo.customer_name,
    oo.customer_phone,
    oo.customer_address,
    oo.customer_notes,
    oo.payment_intent,
    oo.total_amount,
    coalesce(oi.items_json, '[]'::jsonb),
    coalesce(sh.history, '[]'::jsonb),
    coalesce(
      nullif(btrim(b.storefront_whatsapp_phone), ''),
      nullif(btrim(ss.whatsapp_phone), '')
    )
  from public.online_orders oo
  join public.orgs o
    on o.id = oo.org_id
  join public.branches b
    on b.id = oo.branch_id
  left join public.storefront_settings ss
    on ss.org_id = oo.org_id
  left join status_history sh
    on true
  left join order_items oi
    on true
  where oo.id = v_order_id
    and oo.org_id = v_org_id;
end;
$$;


ALTER FUNCTION "public"."rpc_get_online_order_tracking"("p_tracking_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_or_create_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind" DEFAULT 'sale_ticket'::"public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("sale_delivery_link_id" "uuid", "sale_id" "uuid", "document_kind" "public"."sale_delivery_document_kind", "token" "text", "status" "public"."sale_delivery_link_status", "expires_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org_id uuid;
  v_actor_user_id uuid := auth.uid();
  v_link public.sale_delivery_links%rowtype;
  v_token text;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  if p_document_kind = 'sale_invoice' and not exists (
    select 1
    from public.invoices fi
    where fi.sale_id = p_sale_id
      and fi.tenant_id = v_org_id
  ) then
    raise exception 'invoice_not_ready'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set status = 'expired'
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active'
    and sdl.expires_at is not null
    and sdl.expires_at <= now();

  select *
    into v_link
  from public.sale_delivery_links sdl
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now())
  order by sdl.created_at desc
  limit 1;

  if v_link.id is null then
    v_token := replace(gen_random_uuid()::text, '-', '');

    insert into public.sale_delivery_links (
      org_id,
      sale_id,
      document_kind,
      token,
      status,
      created_by_user_id,
      expires_at
    )
    values (
      v_org_id,
      p_sale_id,
      p_document_kind,
      v_token,
      'active',
      v_actor_user_id,
      p_expires_at
    )
    returning *
      into v_link;
  end if;

  return query
  select
    v_link.id,
    v_link.sale_id,
    v_link.document_kind,
    v_link.token,
    v_link.status,
    v_link.expires_at,
    v_link.created_at;
end;
$$;


ALTER FUNCTION "public"."rpc_get_or_create_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_public_storefront_branches"("p_org_slug" "text") RETURNS TABLE("org_name" "text", "org_slug" "text", "branch_name" "text", "branch_slug" "text", "is_active" boolean, "is_enabled" boolean, "whatsapp_phone" "text", "pickup_instructions" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select
    o.name,
    o.storefront_slug,
    b.name,
    b.storefront_slug,
    b.is_active,
    ss.is_enabled,
    coalesce(
      nullif(btrim(b.storefront_whatsapp_phone), ''),
      nullif(btrim(ss.whatsapp_phone), '')
    ) as whatsapp_phone,
    ss.pickup_instructions
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  where o.is_active = true
    and o.storefront_slug = p_org_slug
  order by b.name;
end;
$$;


ALTER FUNCTION "public"."rpc_get_public_storefront_branches"("p_org_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_public_storefront_products"("p_org_slug" "text", "p_branch_slug" "text") RETURNS TABLE("org_name" "text", "org_slug" "text", "branch_name" "text", "branch_slug" "text", "product_id" "uuid", "product_name" "text", "unit_price" numeric, "stock_on_hand" numeric, "image_url" "text", "is_available" boolean, "whatsapp_phone" "text", "pickup_instructions" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select
    o.name,
    o.storefront_slug,
    b.name,
    b.storefront_slug,
    p.id,
    p.name,
    p.unit_price,
    coalesce(si.quantity_on_hand, 0::numeric) as stock_on_hand,
    p.image_url,
    (p.is_active and coalesce(si.quantity_on_hand, 0::numeric) > 0::numeric),
    coalesce(
      nullif(btrim(b.storefront_whatsapp_phone), ''),
      nullif(btrim(ss.whatsapp_phone), '')
    ) as whatsapp_phone,
    ss.pickup_instructions
  from public.orgs o
  join public.storefront_settings ss
    on ss.org_id = o.id
   and ss.is_enabled = true
  join public.branches b
    on b.org_id = o.id
   and b.is_active = true
  join public.products p
    on p.org_id = o.id
   and p.is_active = true
  left join public.stock_items si
    on si.org_id = o.id
   and si.branch_id = b.id
   and si.product_id = p.id
  where o.is_active = true
    and o.storefront_slug = p_org_slug
    and b.storefront_slug = p_branch_slug
  order by p.name;
end;
$$;


ALTER FUNCTION "public"."rpc_get_public_storefront_products"("p_org_slug" "text", "p_branch_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_sale_invoice_delivery"("p_token" "text") RETURNS TABLE("sale_id" "uuid", "org_id" "uuid", "org_name" "text", "branch_id" "uuid", "branch_name" "text", "created_at" timestamp with time zone, "created_by" "uuid", "created_by_name" "text", "subtotal_amount" numeric, "discount_amount" numeric, "total_amount" numeric, "items" "jsonb", "invoice_id" "uuid", "invoice_job_id" "uuid", "environment" "text", "pto_vta" integer, "cbte_tipo" integer, "cbte_nro" bigint, "doc_tipo" integer, "doc_nro" bigint, "currency" character varying, "currency_rate" numeric, "imp_total" numeric, "cae" character varying, "cae_expires_at" "date", "result_status" "text", "qr_payload_json" "jsonb", "pdf_storage_path" "text", "ticket_storage_path" "text", "render_status" "text", "updated_at" timestamp with time zone, "ticket_header_text" "text", "ticket_footer_text" "text", "fiscal_ticket_note_text" "text", "ticket_paper_width_mm" numeric, "ticket_margin_top_mm" numeric, "ticket_margin_right_mm" numeric, "ticket_margin_bottom_mm" numeric, "ticket_margin_left_mm" numeric, "ticket_font_size_px" integer, "ticket_line_height" numeric, "issuer_display_name" "text", "issuer_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_sale_id uuid;
begin
  select sdl.sale_id
    into v_sale_id
  from public.sale_delivery_links sdl
  where sdl.token = p_token
    and sdl.document_kind = 'sale_invoice'
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now())
  limit 1;

  if v_sale_id is null then
    return;
  end if;

  return query
  with items_by_sale as (
    select
      si.sale_id,
      jsonb_agg(
        jsonb_build_object(
          'sale_item_id', si.id,
          'product_name', si.product_name_snapshot,
          'unit_price', si.unit_price_snapshot,
          'quantity', si.quantity,
          'line_total', si.line_total
        )
        order by si.product_name_snapshot
      ) as items
    from public.sale_items si
    where si.sale_id = v_sale_id
    group by si.sale_id
  )
  select
    s.id,
    s.org_id,
    o.name,
    s.branch_id,
    b.name,
    s.created_at,
    s.created_by,
    coalesce(nullif(trim(ou.display_name), ''), s.created_by::text),
    s.subtotal_amount,
    s.discount_amount,
    s.total_amount,
    coalesce(ibs.items, '[]'::jsonb),
    i.id,
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
    ij.job_status,
    i.updated_at,
    b.ticket_header_text,
    b.ticket_footer_text,
    b.fiscal_ticket_note_text,
    b.ticket_paper_width_mm,
    b.ticket_margin_top_mm,
    b.ticket_margin_right_mm,
    b.ticket_margin_bottom_mm,
    b.ticket_margin_left_mm,
    b.ticket_font_size_px,
    b.ticket_line_height,
    ou.display_name,
    ou.role::text
  from public.sales s
  join public.orgs o
    on o.id = s.org_id
  join public.branches b
    on b.id = s.branch_id
   and b.org_id = s.org_id
  join public.invoices i
    on i.sale_id = s.id
   and i.tenant_id = s.org_id
   and i.result_status = 'authorized'
  join public.invoice_jobs ij
    on ij.id = i.invoice_job_id
   and ij.job_status = 'completed'
  left join items_by_sale ibs
    on ibs.sale_id = s.id
  left join public.org_users ou
    on ou.org_id = s.org_id
   and ou.user_id = s.created_by
  where s.id = v_sale_id
  limit 1;
end;
$$;


ALTER FUNCTION "public"."rpc_get_sale_invoice_delivery"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_sale_ticket_delivery"("p_token" "text") RETURNS TABLE("sale_id" "uuid", "org_name" "text", "branch_name" "text", "created_at" timestamp with time zone, "created_by_name" "text", "subtotal_amount" numeric, "discount_amount" numeric, "total_amount" numeric, "is_invoiced" boolean, "client_name" "text", "client_phone" "text", "items" "jsonb", "ticket_header_text" "text", "ticket_footer_text" "text", "fiscal_ticket_note_text" "text", "ticket_paper_width_mm" numeric, "ticket_margin_top_mm" numeric, "ticket_margin_right_mm" numeric, "ticket_margin_bottom_mm" numeric, "ticket_margin_left_mm" numeric, "ticket_font_size_px" integer, "ticket_line_height" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_sale_id uuid;
  v_org_id uuid;
begin
  select sdl.sale_id, sdl.org_id
    into v_sale_id, v_org_id
  from public.sale_delivery_links sdl
  where sdl.token = p_token
    and sdl.document_kind = 'sale_ticket'
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now())
  limit 1;

  if v_sale_id is null then
    return;
  end if;

  return query
  with items_by_sale as (
    select
      si.sale_id,
      jsonb_agg(
        jsonb_build_object(
          'sale_item_id', si.id,
          'product_name', si.product_name_snapshot,
          'unit_price', si.unit_price_snapshot,
          'quantity', si.quantity,
          'line_total', si.line_total
        )
        order by si.product_name_snapshot
      ) as items
    from public.sale_items si
    where si.sale_id = v_sale_id
    group by si.sale_id
  ),
  creator_names as (
    select
      ou.org_id,
      ou.user_id,
      coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as creator_name
    from public.org_users ou
    where ou.org_id = v_org_id
  )
  select
    s.id,
    o.name,
    b.name,
    s.created_at,
    coalesce(cn.creator_name, s.created_by::text),
    s.subtotal_amount,
    s.discount_amount,
    s.total_amount,
    s.is_invoiced,
    c.name,
    c.phone,
    coalesce(ibs.items, '[]'::jsonb),
    b.ticket_header_text,
    b.ticket_footer_text,
    b.fiscal_ticket_note_text,
    b.ticket_paper_width_mm,
    b.ticket_margin_top_mm,
    b.ticket_margin_right_mm,
    b.ticket_margin_bottom_mm,
    b.ticket_margin_left_mm,
    b.ticket_font_size_px,
    b.ticket_line_height
  from public.sales s
  join public.orgs o
    on o.id = s.org_id
  join public.branches b
    on b.id = s.branch_id
   and b.org_id = s.org_id
  left join public.clients c
    on c.id = s.client_id
   and c.org_id = s.org_id
  left join items_by_sale ibs
    on ibs.sale_id = s.id
  left join creator_names cn
    on cn.org_id = s.org_id
   and cn.user_id = s.created_by
  where s.id = v_sale_id
    and s.org_id = v_org_id;
end;
$$;


ALTER FUNCTION "public"."rpc_get_sale_ticket_delivery"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") RETURNS TABLE("special_order_id" "uuid", "client_id" "uuid", "client_name" "text", "branch_id" "uuid", "product_id" "uuid", "product_name" "text", "sell_unit_type" "public"."sell_unit_type", "uom" "text", "unit_price" numeric, "remaining_qty" numeric)
    LANGUAGE "sql"
    AS $$
  select
    so.id as special_order_id,
    c.id as client_id,
    c.name as client_name,
    so.branch_id,
    soi.product_id,
    p.name as product_name,
    p.sell_unit_type,
    p.uom,
    p.unit_price,
    (soi.requested_qty - soi.fulfilled_qty) as remaining_qty
  from public.client_special_orders so
  join public.clients c
    on c.id = so.client_id
    and c.org_id = so.org_id
  join public.client_special_order_items soi
    on soi.special_order_id = so.id
    and soi.org_id = so.org_id
  join public.products p
    on p.id = soi.product_id
    and p.org_id = so.org_id
  where so.org_id = p_org_id
    and so.id = p_special_order_id
    and (soi.requested_qty - soi.fulfilled_qty) > 0
  order by p.name;
$$;


ALTER FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_staff_effective_modules"() RETURNS TABLE("org_id" "uuid", "branch_id" "uuid", "module_key" "text", "is_enabled" boolean, "source_scope" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  with memberships as (
    select bm.org_id, bm.branch_id
    from public.branch_memberships bm
    where bm.user_id = auth.uid()
      and bm.is_active = true
  ),
  supported_modules as (
    select module_key
    from (
      values
        ('dashboard'::text),
        ('pos'::text),
        ('sales'::text),
        ('sales_statistics'::text),
        ('cashbox'::text),
        ('products'::text),
        ('products_lookup'::text),
        ('suppliers'::text),
        ('orders'::text),
        ('orders_calendar'::text),
        ('payments'::text),
        ('clients'::text),
        ('expirations'::text),
        ('onboarding'::text),
        ('online_orders'::text),
        ('settings'::text)
    ) as m(module_key)
  ),
  org_default as (
    select sma.org_id, sma.module_key, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
      and sma.branch_id is null
      and sma.module_key in (select module_key from supported_modules)
  ),
  branch_override as (
    select sma.org_id, sma.branch_id, sma.module_key, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
      and sma.branch_id is not null
      and sma.module_key in (select module_key from supported_modules)
  ),
  full_access_org as (
    select sma.org_id, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
      and sma.branch_id is null
      and sma.module_key = '__full_access__'
  ),
  full_access_branch as (
    select sma.org_id, sma.branch_id, sma.is_enabled
    from public.staff_module_access sma
    where sma.role = 'staff'
      and sma.branch_id is not null
      and sma.module_key = '__full_access__'
  )
  select
    m.org_id,
    m.branch_id,
    sm.module_key,
    case
      when bo.module_key is not null then bo.is_enabled
      when od.module_key is not null then od.is_enabled
      when fab.branch_id is not null then fab.is_enabled
      when fao.org_id is not null then fao.is_enabled
      else false
    end as is_enabled,
    case
      when bo.module_key is not null then 'branch_override'
      when od.module_key is not null then 'org_default'
      when fab.branch_id is not null then 'branch_full_access'
      when fao.org_id is not null then 'org_full_access'
      else 'none'
    end as source_scope
  from memberships m
  cross join supported_modules sm
  left join org_default od
    on od.org_id = m.org_id
    and od.module_key = sm.module_key
  left join branch_override bo
    on bo.org_id = m.org_id
    and bo.branch_id = m.branch_id
    and bo.module_key = sm.module_key
  left join full_access_org fao
    on fao.org_id = m.org_id
  left join full_access_branch fab
    on fab.org_id = m.org_id
    and fab.branch_id = m.branch_id;
$$;


ALTER FUNCTION "public"."rpc_get_staff_effective_modules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") RETURNS TABLE("module_key" "text", "is_enabled" boolean, "source_scope" "text")
    LANGUAGE "sql"
    AS $$
  with module_keys as (
    select distinct module_key
    from public.staff_module_access
    where org_id = p_org_id
      and role = 'staff'
  ),
  org_default as (
    select module_key, is_enabled
    from public.staff_module_access
    where org_id = p_org_id
      and branch_id is null
      and role = 'staff'
  ),
  branch_override as (
    select module_key, is_enabled
    from public.staff_module_access
    where org_id = p_org_id
      and branch_id = p_branch_id
      and role = 'staff'
  )
  select
    mk.module_key,
    coalesce(bo.is_enabled, od.is_enabled, false) as is_enabled,
    case
      when bo.module_key is not null then 'branch_override'
      when od.module_key is not null then 'org_default'
      else 'none'
    end as source_scope
  from module_keys mk
  left join org_default od on od.module_key = mk.module_key
  left join branch_override bo on bo.module_key = mk.module_key;
$$;


ALTER FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) RETURNS TABLE("invited_user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_user_id uuid;
  v_branch_id uuid;
  v_invalid_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_role not in ('org_admin', 'staff') then
    raise exception 'invalid role %', p_role;
  end if;

  if p_role = 'staff' and coalesce(array_length(p_branch_ids, 1), 0) = 0 then
    raise exception 'staff requires at least one branch';
  end if;

  if p_role = 'staff' then
    select branch_id
    into v_invalid_branch_id
    from unnest(p_branch_ids) as branch_id
    left join public.branches b on b.id = branch_id
    where b.id is null
      or b.org_id <> p_org_id
      or b.is_active is false
    limit 1;

    if v_invalid_branch_id is not null then
      raise exception 'invalid branch % for org %', v_invalid_branch_id, p_org_id;
    end if;
  end if;

  select au.id
  into v_user_id
  from auth.users au
  where lower(au.email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    raise exception 'user not found for email %', p_email;
  end if;

  insert into public.org_users (org_id, user_id, role, is_active)
  values (p_org_id, v_user_id, p_role, true)
  on conflict on constraint org_users_org_id_user_id_key
  do update set
    role = excluded.role,
    is_active = true;

  delete from public.branch_memberships bm
  where bm.org_id = p_org_id
    and bm.user_id = v_user_id;

  if p_role = 'staff' then
    foreach v_branch_id in array p_branch_ids loop
      insert into public.branch_memberships (org_id, branch_id, user_id, is_active)
      values (p_org_id, v_branch_id, v_user_id, true)
      on conflict on constraint branch_memberships_org_id_branch_id_user_id_key
      do update set
        is_active = true;
    end loop;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'user_invited',
    'org_user',
    v_user_id,
    null,
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'branch_ids', coalesce(p_branch_ids, array[]::uuid[])
    ),
    auth.uid()
  );

  return query
  select v_user_id as invited_user_id;
end;
$$;


ALTER FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) RETURNS TABLE("client_id" "uuid", "name" "text", "phone" "text", "email" "text", "active_special_orders_count" bigint)
    LANGUAGE "sql"
    AS $$
  select
    c.id as client_id,
    c.name,
    c.phone,
    c.email,
    coalesce(count(co.id) filter (
      where co.status in ('pending', 'ordered', 'received')
        and (p_branch_id is null or co.branch_id = p_branch_id)
    ), 0) as active_special_orders_count
  from public.clients c
  left join public.client_special_orders co
    on co.client_id = c.id
    and co.org_id = c.org_id
  where c.org_id = p_org_id
    and (
      p_search is null
      or c.name ilike '%' || p_search || '%'
      or c.phone ilike '%' || p_search || '%'
      or c.email ilike '%' || p_search || '%'
    )
  group by c.id
  order by c.name
  limit coalesce(p_limit, 50)
  offset coalesce(p_offset, 0);
$$;


ALTER FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_list_sale_delivery_events"("p_sale_id" "uuid", "p_limit" integer DEFAULT 20) RETURNS TABLE("sale_delivery_event_id" "uuid", "sale_delivery_link_id" "uuid", "sale_id" "uuid", "document_kind" "public"."sale_delivery_document_kind", "event_kind" "text", "channel" "text", "actor_user_id" "uuid", "actor_display_name" "text", "metadata" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_org_id uuid;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  return query
  select
    sde.id,
    sde.sale_delivery_link_id,
    sde.sale_id,
    sde.document_kind,
    sde.event_kind,
    sde.channel,
    sde.actor_user_id,
    coalesce(nullif(trim(ou.display_name), ''), ou.user_id::text) as actor_display_name,
    sde.metadata,
    sde.created_at
  from public.sale_delivery_events sde
  left join public.org_users ou
    on ou.org_id = sde.org_id
   and ou.user_id = sde.actor_user_id
  where sde.sale_id = p_sale_id
  order by sde.created_at desc, sde.id desc
  limit greatest(coalesce(p_limit, 20), 1);
end;
$$;


ALTER FUNCTION "public"."rpc_list_sale_delivery_events"("p_sale_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_list_sale_delivery_events"("p_sale_id" "uuid", "p_limit" integer) IS 'Devuelve historial reciente de eventos de delivery de ticket/factura para una venta.';



CREATE OR REPLACE FUNCTION "public"."rpc_list_sale_delivery_links"("p_sale_id" "uuid") RETURNS TABLE("sale_delivery_link_id" "uuid", "sale_id" "uuid", "document_kind" "public"."sale_delivery_document_kind", "token" "text", "status" "public"."sale_delivery_link_status", "created_at" timestamp with time zone, "expires_at" timestamp with time zone, "last_shared_at" timestamp with time zone, "last_shared_channel" "text", "share_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_org_id uuid;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set status = 'expired'
  where sdl.sale_id = p_sale_id
    and sdl.status = 'active'
    and sdl.expires_at is not null
    and sdl.expires_at <= now();

  return query
  with ranked_links as (
    select
      sdl.*,
      row_number() over (
        partition by sdl.document_kind
        order by sdl.created_at desc, sdl.id desc
      ) as row_rank
    from public.sale_delivery_links sdl
    where sdl.sale_id = p_sale_id
  )
  select
    rl.id,
    rl.sale_id,
    rl.document_kind,
    rl.token,
    rl.status,
    rl.created_at,
    rl.expires_at,
    rl.last_shared_at,
    rl.last_shared_channel,
    rl.share_count
  from ranked_links rl
  where rl.row_rank = 1
  order by rl.document_kind;
end;
$$;


ALTER FUNCTION "public"."rpc_list_sale_delivery_links"("p_sale_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_list_sale_delivery_links"("p_sale_id" "uuid") IS 'Devuelve el último estado conocido por documento compartible de una venta para gestión operativa en UI.';



CREATE OR REPLACE FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  insert into public.audit_log (
    org_id,
    actor_user_id,
    branch_id,
    action_key,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_org_id,
    coalesce(p_actor_user_id, auth.uid()),
    p_branch_id,
    p_action_key,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
end;
$$;


ALTER FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_mark_sale_delivery_link_shared"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_channel" "text" DEFAULT 'whatsapp'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_org_id uuid;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  if p_channel not in ('whatsapp') then
    raise exception 'invalid_channel'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set last_shared_at = now(),
      last_shared_channel = p_channel,
      share_count = sdl.share_count + 1
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now());
end;
$$;


ALTER FUNCTION "public"."rpc_mark_sale_delivery_link_shared"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_channel" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_mark_sale_delivery_link_shared"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_channel" "text") IS 'Registra metadata mínima del último compartido asistido por canal sobre el link activo de ticket o factura.';



CREATE OR REPLACE FUNCTION "public"."rpc_mark_sale_invoiced"("p_org_id" "uuid", "p_sale_id" "uuid", "p_source" "text" DEFAULT 'manual'::"text") RETURNS TABLE("sale_id" "uuid", "is_invoiced" boolean, "invoiced_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_sale public.sales%rowtype;
  v_pos_enabled boolean := false;
  v_source text := nullif(trim(coalesce(p_source, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
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

  update public.sales s
  set
    is_invoiced = true,
    invoiced_at = coalesce(s.invoiced_at, now())
  where s.id = p_sale_id
    and s.org_id = p_org_id;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'sale_marked_invoiced',
    'sale',
    p_sale_id,
    v_sale.branch_id,
    jsonb_build_object(
      'source', coalesce(v_source, 'manual'),
      'invoiced_at', v_sale.invoiced_at
    ),
    null
  );

  return query
  select v_sale.id, v_sale.is_invoiced, v_sale.invoiced_at;
end;
$$;


ALTER FUNCTION "public"."rpc_mark_sale_invoiced"("p_org_id" "uuid", "p_sale_id" "uuid", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.client_special_order_items
    set is_ordered = true,
        ordered_at = now(),
        supplier_order_id = p_supplier_order_id
  where org_id = p_org_id
    and id = any(p_item_ids);

  update public.client_special_orders so
    set status = 'ordered'
  where so.org_id = p_org_id
    and so.id in (
      select distinct special_order_id
      from public.client_special_order_items
      where org_id = p_org_id and id = any(p_item_ids)
    )
    and so.status = 'pending';
end;
$$;


ALTER FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) RETURNS TABLE("waste_id" "uuid", "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_batch record;
  v_unit_price numeric(12,2);
  v_total numeric(12,2);
  v_waste_id uuid;
  v_current numeric(14,3);
  v_exp_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select
    eb.id as batch_id,
    eb.branch_id,
    eb.product_id,
    eb.quantity,
    eb.expires_on
  into v_batch
  from public.expiration_batches eb
  where eb.org_id = p_org_id
    and eb.id = p_batch_id
  for update;

  if v_batch.batch_id is null then
    raise exception 'batch not found';
  end if;

  if v_batch.expires_on >= current_date then
    raise exception 'batch not expired';
  end if;

  if v_batch.quantity <= 0 then
    raise exception 'batch empty';
  end if;

  if p_expected_qty is not null and p_expected_qty <> v_batch.quantity then
    raise exception 'quantity mismatch';
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
        and bm.branch_id = v_batch.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select coalesce(
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id = v_batch.branch_id
         and sma.role = 'staff'
         and sma.module_key = 'expirations'
       limit 1),
      (select sma.is_enabled
       from public.staff_module_access sma
       where sma.org_id = p_org_id
         and sma.branch_id is null
         and sma.role = 'staff'
         and sma.module_key = 'expirations'
       limit 1),
      false
    ) into v_exp_enabled;

    if not v_exp_enabled then
      raise exception 'expirations module disabled';
    end if;
  end if;

  select unit_price
    into v_unit_price
  from public.products
  where id = v_batch.product_id
    and org_id = p_org_id;

  if v_unit_price is null then
    v_unit_price := 0;
  end if;

  v_total := v_unit_price * v_batch.quantity;

  insert into public.expiration_waste (
    org_id,
    branch_id,
    product_id,
    batch_id,
    quantity,
    unit_price_snapshot,
    total_amount,
    created_by
  ) values (
    p_org_id,
    v_batch.branch_id,
    v_batch.product_id,
    v_batch.batch_id,
    v_batch.quantity,
    v_unit_price,
    v_total,
    auth.uid()
  ) returning id into v_waste_id;

  update public.expiration_batches
    set quantity = 0,
        updated_at = now()
  where id = v_batch.batch_id;

  select quantity_on_hand
    into v_current
  from public.stock_items
  where org_id = p_org_id
    and branch_id = v_batch.branch_id
    and product_id = v_batch.product_id
  for update;

  if v_current is null then
    insert into public.stock_items (
      org_id, branch_id, product_id, quantity_on_hand
    ) values (
      p_org_id, v_batch.branch_id, v_batch.product_id, 0 - v_batch.quantity
    )
    on conflict (org_id, branch_id, product_id)
    do update set quantity_on_hand = public.stock_items.quantity_on_hand - v_batch.quantity;
  else
    update public.stock_items
      set quantity_on_hand = quantity_on_hand - v_batch.quantity
    where org_id = p_org_id
      and branch_id = v_batch.branch_id
      and product_id = v_batch.product_id;
  end if;

  insert into public.stock_movements (
    org_id,
    branch_id,
    product_id,
    movement_type,
    quantity_delta,
    reason,
    source_type,
    source_id,
    expiration_batch_id
  ) values (
    p_org_id,
    v_batch.branch_id,
    v_batch.product_id,
    'expiration_adjustment',
    0 - v_batch.quantity,
    'waste',
    'expiration_waste',
    v_waste_id,
    v_batch.batch_id
  );

  perform public.rpc_log_audit_event(
    p_org_id,
    'expiration_waste_recorded',
    'expiration_waste',
    v_waste_id,
    v_batch.branch_id,
    jsonb_build_object(
      'batch_id', v_batch.batch_id,
      'product_id', v_batch.product_id,
      'quantity', v_batch.quantity,
      'total_amount', v_total
    ),
    null
  );

  return query select v_waste_id, v_total;
end;
$$;


ALTER FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text" DEFAULT 'shift'::"text", "p_session_label" "text" DEFAULT NULL::"text", "p_opened_controlled_by_name" "text" DEFAULT NULL::"text", "p_opening_drawer_count_lines" "jsonb" DEFAULT NULL::"jsonb", "p_opening_reserve_count_lines" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("session_id" "uuid", "opened_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session_id uuid := gen_random_uuid();
  v_opened_at timestamptz := now();
  v_cashbox_enabled boolean := false;
  v_drawer_line jsonb;
  v_reserve_line jsonb;
  v_denom numeric(12,2);
  v_qty integer;
  v_opening_drawer_amount numeric(12,2) := 0;
  v_opening_reserve_amount numeric(12,2) := 0;
  v_opened_controlled_by_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if coalesce(p_period_type, '') not in ('shift', 'day') then
    raise exception 'invalid period type';
  end if;

  v_opened_controlled_by_name := nullif(trim(coalesce(p_opened_controlled_by_name, '')), '');
  if v_opened_controlled_by_name is null then
    raise exception 'opened controlled by name required';
  end if;

  if p_opening_drawer_count_lines is null or jsonb_typeof(p_opening_drawer_count_lines) <> 'array' then
    raise exception 'opening drawer count lines required';
  end if;
  if p_opening_reserve_count_lines is null or jsonb_typeof(p_opening_reserve_count_lines) <> 'array' then
    raise exception 'opening reserve count lines required';
  end if;

  for v_drawer_line in select * from jsonb_array_elements(p_opening_drawer_count_lines)
  loop
    v_denom := (v_drawer_line ->> 'denomination_value')::numeric;
    v_qty := (v_drawer_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid drawer denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid drawer denomination quantity';
    end if;

    v_opening_drawer_amount := v_opening_drawer_amount + (v_denom * v_qty);
  end loop;

  for v_reserve_line in select * from jsonb_array_elements(p_opening_reserve_count_lines)
  loop
    v_denom := (v_reserve_line ->> 'denomination_value')::numeric;
    v_qty := (v_reserve_line ->> 'quantity')::integer;

    if v_denom is null or v_denom <= 0 then
      raise exception 'invalid reserve denomination value';
    end if;
    if v_qty is null or v_qty < 0 then
      raise exception 'invalid reserve denomination quantity';
    end if;

    v_opening_reserve_amount := v_opening_reserve_amount + (v_denom * v_qty);
  end loop;

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
        and bm.branch_id = p_branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (
          sma.branch_id = p_branch_id
          or sma.branch_id is null
        )
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  if exists (
    select 1
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = p_branch_id
      and cs.status = 'open'
  ) then
    raise exception 'cash session already open for branch';
  end if;

  insert into public.cash_sessions (
    id,
    org_id,
    branch_id,
    opened_by,
    opened_controlled_by_name,
    period_type,
    session_label,
    opening_cash_amount,
    opening_reserve_amount,
    status,
    opened_at,
    created_at,
    updated_at
  ) values (
    v_session_id,
    p_org_id,
    p_branch_id,
    auth.uid(),
    v_opened_controlled_by_name,
    p_period_type,
    nullif(trim(coalesce(p_session_label, '')), ''),
    round(v_opening_drawer_amount, 2),
    round(v_opening_reserve_amount, 2),
    'open',
    v_opened_at,
    v_opened_at,
    v_opened_at
  );

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    p_branch_id,
    v_session_id,
    'opening_drawer',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_opened_at
  from jsonb_array_elements(p_opening_drawer_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  insert into public.cash_session_count_lines (
    org_id,
    branch_id,
    session_id,
    count_scope,
    denomination_value,
    quantity,
    created_at
  )
  select
    p_org_id,
    p_branch_id,
    v_session_id,
    'opening_reserve',
    (line ->> 'denomination_value')::numeric,
    (line ->> 'quantity')::integer,
    v_opened_at
  from jsonb_array_elements(p_opening_reserve_count_lines) line
  where (line ->> 'quantity')::integer > 0;

  perform public.rpc_log_audit_event(
    p_org_id,
    'cash_session_opened',
    'cash_session',
    v_session_id,
    p_branch_id,
    jsonb_build_object(
      'period_type', p_period_type,
      'session_label', nullif(trim(coalesce(p_session_label, '')), ''),
      'opened_controlled_by_name', v_opened_controlled_by_name,
      'opening_drawer_amount', round(v_opening_drawer_amount, 2),
      'opening_reserve_amount', round(v_opening_reserve_amount, 2),
      'opening_drawer_count_lines', p_opening_drawer_count_lines,
      'opening_reserve_count_lines', p_opening_reserve_count_lines
    )
  );

  return query
  select v_session_id, v_opened_at;
end;
$$;


ALTER FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text", "p_session_label" "text", "p_opened_controlled_by_name" "text", "p_opening_drawer_count_lines" "jsonb", "p_opening_reserve_count_lines" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_item jsonb;
  v_order record;
  v_item_id uuid;
  v_received_qty numeric(14,3);
  v_product_id uuid;
  v_shelf_life_days integer;
  v_expires_on date;
begin
  select * into v_order
  from public.supplier_orders
  where id = p_order_id and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status <> 'sent' then
    raise exception 'order must be sent before received';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'order_item_id')::uuid;
    v_received_qty := (v_item ->> 'received_qty')::numeric;

    update public.supplier_order_items
      set received_qty = v_received_qty
    where id = v_item_id
      and order_id = p_order_id
      and org_id = p_org_id
    returning product_id into v_product_id;

    if v_product_id is null then
      raise exception 'order item not found %', v_item_id;
    end if;

    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values (p_org_id, v_order.branch_id, v_product_id, v_received_qty)
    on conflict (org_id, branch_id, product_id)
    do update set quantity_on_hand = public.stock_items.quantity_on_hand + v_received_qty;

    insert into public.stock_movements (
      org_id, branch_id, product_id, movement_type, quantity_delta, source_type, source_id
    ) values (
      p_org_id, v_order.branch_id, v_product_id, 'purchase', v_received_qty, 'purchase', p_order_id
    );

    if v_received_qty > 0 then
      select shelf_life_days into v_shelf_life_days
      from public.products
      where id = v_product_id and org_id = p_org_id;

      if v_shelf_life_days is not null and v_shelf_life_days > 0 then
        v_expires_on := current_date + v_shelf_life_days;
        insert into public.expiration_batches (
          org_id,
          branch_id,
          product_id,
          expires_on,
          quantity,
          source_type,
          source_ref_id,
          created_at,
          updated_at
        ) values (
          p_org_id,
          v_order.branch_id,
          v_product_id,
          v_expires_on,
          v_received_qty,
          'purchase',
          p_order_id,
          now(),
          now()
        );
      end if;
    end if;
  end loop;

  update public.supplier_orders
    set status = 'received',
        received_at = now()
  where id = p_order_id and org_id = p_org_id;
end;
$$;


ALTER FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_controlled_by_user_id" "uuid" DEFAULT NULL::"uuid", "p_controlled_by_name" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
declare
  v_item jsonb;
  v_order record;
  v_item_id uuid;
  v_received_qty numeric(14,3);
  v_product_id uuid;
  v_shelf_life_days integer;
  v_expires_on date;
  v_received_ts timestamptz;
  v_received_date date;
  v_supplier_name text;
  v_supplier_code text;
  v_seq int;
  v_batch_code text;
begin
  select * into v_order
  from public.supplier_orders
  where id = p_order_id and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status <> 'sent' then
    raise exception 'order must be sent before received';
  end if;

  v_received_ts := coalesce(p_received_at, now());
  v_received_date := v_received_ts::date;

  select name into v_supplier_name
  from public.suppliers
  where id = v_order.supplier_id and org_id = p_org_id;

  v_supplier_code := upper(left(
    regexp_replace(
      translate(coalesce(v_supplier_name, ''), 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'),
      '[^A-Za-z]',
      '',
      'g'
    ),
    3
  ));

  if v_supplier_code is null or length(v_supplier_code) < 3 then
    v_supplier_code := 'SUP';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'order_item_id')::uuid;
    v_received_qty := (v_item ->> 'received_qty')::numeric;

    update public.supplier_order_items
      set received_qty = v_received_qty
    where id = v_item_id
      and order_id = p_order_id
      and org_id = p_org_id
    returning product_id into v_product_id;

    if v_product_id is null then
      raise exception 'order item not found %', v_item_id;
    end if;

    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values (p_org_id, v_order.branch_id, v_product_id, v_received_qty)
    on conflict (org_id, branch_id, product_id)
    do update set quantity_on_hand = public.stock_items.quantity_on_hand + v_received_qty;

    insert into public.stock_movements (
      org_id, branch_id, product_id, movement_type, quantity_delta, source_type, source_id
    ) values (
      p_org_id, v_order.branch_id, v_product_id, 'purchase', v_received_qty, 'purchase', p_order_id
    );

    if v_received_qty > 0 then
      select shelf_life_days into v_shelf_life_days
      from public.products
      where id = v_product_id and org_id = p_org_id;

      if v_shelf_life_days is not null and v_shelf_life_days > 0 then
        v_expires_on := v_received_date + v_shelf_life_days;

        select coalesce(
          max((regexp_match(batch_code, '-(\\d{3})$'))[1]::int),
          0
        ) + 1
        into v_seq
        from public.expiration_batches
        where org_id = p_org_id
          and branch_id = v_order.branch_id
          and batch_code like (v_supplier_code || '-' || to_char(v_received_date, 'YYYYMMDD') || '-%');

        v_batch_code := v_supplier_code || '-' || to_char(v_received_date, 'YYYYMMDD') || '-' || lpad(v_seq::text, 3, '0');

        insert into public.expiration_batches (
          org_id,
          branch_id,
          product_id,
          expires_on,
          quantity,
          source_type,
          source_ref_id,
          batch_code,
          created_at,
          updated_at
        ) values (
          p_org_id,
          v_order.branch_id,
          v_product_id,
          v_expires_on,
          v_received_qty,
          'purchase',
          p_order_id,
          v_batch_code,
          now(),
          now()
        );
      end if;
    end if;
  end loop;

  update public.supplier_orders
    set status = 'reconciled',
        received_at = v_received_ts,
        reconciled_at = now(),
        controlled_by_user_id = p_controlled_by_user_id,
        controlled_by_name = nullif(p_controlled_by_name, '')
  where id = p_order_id and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_received',
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object(
      'status', 'reconciled',
      'received_at', v_received_ts,
      'controlled_by_user_id', p_controlled_by_user_id,
      'controlled_by_name', nullif(p_controlled_by_name, ''),
      'items_count', jsonb_array_length(p_items)
    ),
    p_controlled_by_user_id
  );
end;
$_$;


ALTER FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone, "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.supplier_orders
    set status = 'reconciled',
        reconciled_at = now()
  where id = p_order_id
    and org_id = p_org_id
    and status = 'received';

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_reconciled',
    'supplier_order',
    p_order_id,
    null,
    null,
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid" DEFAULT NULL::"uuid", "p_controlled_by_name" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.supplier_orders
    set status = 'reconciled',
        reconciled_at = now(),
        controlled_by_user_id = p_controlled_by_user_id,
        controlled_by_name = nullif(p_controlled_by_name, '')
  where id = p_order_id
    and org_id = p_org_id
    and status = 'received';
end;
$$;


ALTER FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_regenerate_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind" DEFAULT 'sale_ticket'::"public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("sale_delivery_link_id" "uuid", "sale_id" "uuid", "document_kind" "public"."sale_delivery_document_kind", "token" "text", "status" "public"."sale_delivery_link_status", "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "last_shared_at" timestamp with time zone, "last_shared_channel" "text", "share_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_org_id uuid;
  v_actor_user_id uuid := auth.uid();
  v_link public.sale_delivery_links%rowtype;
  v_token text;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  if p_document_kind = 'sale_invoice' and not exists (
    select 1
    from public.invoices fi
    join public.invoice_jobs ij
      on ij.id = fi.invoice_job_id
    where fi.sale_id = p_sale_id
      and fi.tenant_id = v_org_id
      and fi.result_status = 'authorized'
      and ij.job_status = 'completed'
  ) then
    raise exception 'invoice_not_ready'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set status = case
    when sdl.expires_at is not null and sdl.expires_at <= now() then 'expired'::public.sale_delivery_link_status
    else 'revoked'::public.sale_delivery_link_status
  end
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active';

  v_token := replace(gen_random_uuid()::text, '-', '');

  insert into public.sale_delivery_links (
    org_id,
    sale_id,
    document_kind,
    token,
    status,
    created_by_user_id,
    expires_at
  )
  values (
    v_org_id,
    p_sale_id,
    p_document_kind,
    v_token,
    'active',
    v_actor_user_id,
    p_expires_at
  )
  returning *
    into v_link;

  return query
  select
    v_link.id,
    v_link.sale_id,
    v_link.document_kind,
    v_link.token,
    v_link.status,
    v_link.expires_at,
    v_link.created_at,
    v_link.last_shared_at,
    v_link.last_shared_channel,
    v_link.share_count;
end;
$$;


ALTER FUNCTION "public"."rpc_regenerate_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_regenerate_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) IS 'Revoca cualquier link activo vigente y crea un nuevo token compartible para ticket o factura.';



CREATE OR REPLACE FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone DEFAULT "now"(), "p_transfer_account_id" "uuid" DEFAULT NULL::"uuid", "p_reference" "text" DEFAULT NULL::"text", "p_note" "text" DEFAULT NULL::"text") RETURNS TABLE("payment_id" "uuid", "payable_status" "text", "outstanding_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payable record;
  v_payment_id uuid;
  v_open_session_id uuid;
  v_supplier_name text;
  v_cash_movement_note text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid payment amount';
  end if;

  if p_payment_method not in ('cash', 'transfer') then
    raise exception 'invalid payment method';
  end if;

  select * into v_payable
  from public.supplier_payables sp
  where sp.id = p_payable_id
    and sp.org_id = p_org_id
  for update;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  if v_payable.status = 'paid' then
    raise exception 'payable already paid';
  end if;

  if p_amount > v_payable.outstanding_amount and v_payable.outstanding_amount > 0 then
    raise exception 'payment amount exceeds outstanding amount';
  end if;

  if p_payment_method = 'transfer' and p_transfer_account_id is not null then
    if not exists (
      select 1
      from public.supplier_payment_accounts spa
      where spa.id = p_transfer_account_id
        and spa.org_id = p_org_id
        and spa.supplier_id = v_payable.supplier_id
    ) then
      raise exception 'transfer account not found for supplier';
    end if;
  end if;

  insert into public.supplier_payments (
    org_id,
    branch_id,
    supplier_id,
    payable_id,
    order_id,
    payment_method,
    transfer_account_id,
    amount,
    paid_at,
    reference,
    note,
    created_by,
    created_at
  ) values (
    p_org_id,
    v_payable.branch_id,
    v_payable.supplier_id,
    p_payable_id,
    v_payable.order_id,
    p_payment_method,
    p_transfer_account_id,
    round(p_amount, 2),
    coalesce(p_paid_at, now()),
    nullif(trim(coalesce(p_reference, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid(),
    now()
  )
  returning id into v_payment_id;

  if p_payment_method = 'cash' then
    select cs.id
    into v_open_session_id
    from public.cash_sessions cs
    where cs.org_id = p_org_id
      and cs.branch_id = v_payable.branch_id
      and cs.status = 'open'
      and coalesce(p_paid_at, now()) >= cs.opened_at
    order by cs.opened_at desc
    limit 1;

    if v_open_session_id is not null then
      select s.name
      into v_supplier_name
      from public.suppliers s
      where s.id = v_payable.supplier_id
        and s.org_id = p_org_id;

      v_cash_movement_note := trim(
        both ' '
        from concat(
          'Pago proveedor ',
          coalesce(v_supplier_name, 'Proveedor'),
          ' · pedido ',
          v_payable.order_id::text,
          case
            when nullif(trim(coalesce(p_note, '')), '') is null then ''
            else concat(' · ', nullif(trim(coalesce(p_note, '')), ''))
          end
        )
      );

      insert into public.cash_session_movements (
        org_id,
        branch_id,
        session_id,
        movement_type,
        category_key,
        amount,
        note,
        movement_at,
        created_by,
        created_at,
        supplier_payment_id
      ) values (
        p_org_id,
        v_payable.branch_id,
        v_open_session_id,
        'expense',
        'supplier_payment_cash',
        round(p_amount, 2),
        nullif(v_cash_movement_note, ''),
        coalesce(p_paid_at, now()),
        auth.uid(),
        now(),
        v_payment_id
      );
    end if;
  end if;

  update public.supplier_payables
  set
    selected_payment_method = p_payment_method,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payable_id;

  perform public.fn_recompute_supplier_payable(p_payable_id, auth.uid());

  select * into v_payable
  from public.supplier_payables
  where id = p_payable_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_registered',
    'supplier_payment',
    v_payment_id,
    v_payable.branch_id,
    jsonb_build_object(
      'payable_id', p_payable_id,
      'order_id', v_payable.order_id,
      'amount', round(p_amount, 2),
      'payment_method', p_payment_method,
      'transfer_account_id', p_transfer_account_id,
      'reference', nullif(trim(coalesce(p_reference, '')), ''),
      'status', v_payable.status,
      'outstanding_amount', v_payable.outstanding_amount
    ),
    auth.uid()
  );

  return query
  select v_payment_id, v_payable.status, v_payable.outstanding_amount;
end;
$$;


ALTER FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone, "p_transfer_account_id" "uuid", "p_reference" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_order_items
  where org_id = p_org_id
    and order_id = p_order_id
    and product_id = p_product_id;

  delete from public.supplier_order_items
  where org_id = p_org_id
    and order_id = p_order_id
    and product_id = p_product_id;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_item_removed',
      'supplier_order_item',
      v_id,
      null,
      jsonb_build_object(
        'order_id', p_order_id,
        'product_id', p_product_id
      ),
      null
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_products
  where org_id = p_org_id
    and supplier_id = p_supplier_id
    and product_id = p_product_id;

  delete from public.supplier_products
  where org_id = p_org_id
    and supplier_id = p_supplier_id
    and product_id = p_product_id;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_removed',
      'supplier_product',
      v_id,
      null,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'product_id', p_product_id
      ),
      null
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.supplier_products
  where org_id = p_org_id
    and product_id = p_product_id
    and relation_type = p_relation_type;

  delete from public.supplier_products
  where org_id = p_org_id
    and product_id = p_product_id
    and relation_type = p_relation_type;

  if v_id is not null then
    perform public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_removed',
      'supplier_product',
      v_id,
      null,
      jsonb_build_object(
        'product_id', p_product_id,
        'relation_type', p_relation_type
      ),
      null
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_revoke_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_org_id uuid;
  v_revoked_count integer := 0;
begin
  select s.org_id
    into v_org_id
  from public.sales s
  where s.id = p_sale_id
  limit 1;

  if v_org_id is null then
    raise exception 'sale_not_found'
      using errcode = 'P0001';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'not authorized'
      using errcode = 'P0001';
  end if;

  update public.sale_delivery_links as sdl
  set status = 'revoked'
  where sdl.sale_id = p_sale_id
    and sdl.document_kind = p_document_kind
    and sdl.status = 'active'
    and (sdl.expires_at is null or sdl.expires_at > now());

  get diagnostics v_revoked_count = row_count;

  return v_revoked_count;
end;
$$;


ALTER FUNCTION "public"."rpc_revoke_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_revoke_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind") IS 'Revoca el link activo vigente de ticket o factura para una venta.';



CREATE OR REPLACE FUNCTION "public"."rpc_set_online_order_status"("p_online_order_id" "uuid", "p_new_status" "public"."online_order_status", "p_internal_note" "text" DEFAULT NULL::"text", "p_customer_note" "text" DEFAULT NULL::"text") RETURNS TABLE("online_order_id" "uuid", "old_status" "public"."online_order_status", "new_status" "public"."online_order_status", "changed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org_id uuid;
  v_old_status public.online_order_status;
  v_branch_id uuid;
  v_now timestamptz := now();
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  select oo.org_id, oo.status, oo.branch_id
    into v_org_id, v_old_status, v_branch_id
  from public.online_orders oo
  where oo.id = p_online_order_id;

  if v_org_id is null then
    raise exception 'online order not found';
  end if;

  if not public.is_org_member(v_org_id) then
    raise exception 'permission denied';
  end if;

  if v_old_status = p_new_status then
    online_order_id := p_online_order_id;
    old_status := v_old_status;
    new_status := p_new_status;
    changed_at := v_now;
    return next;
    return;
  end if;

  if v_old_status = 'pending' and p_new_status not in ('confirmed', 'cancelled') then
    raise exception 'invalid status transition';
  end if;

  if v_old_status = 'confirmed' and p_new_status not in ('ready_for_pickup', 'cancelled') then
    raise exception 'invalid status transition';
  end if;

  if v_old_status = 'ready_for_pickup' and p_new_status not in ('delivered', 'cancelled') then
    raise exception 'invalid status transition';
  end if;

  if v_old_status in ('delivered', 'cancelled') then
    raise exception 'cannot transition from final state';
  end if;

  update public.online_orders oo
  set status = p_new_status,
      staff_notes = coalesce(p_internal_note, oo.staff_notes),
      confirmed_at = case when p_new_status = 'confirmed' then v_now else oo.confirmed_at end,
      ready_for_pickup_at = case when p_new_status = 'ready_for_pickup' then v_now else oo.ready_for_pickup_at end,
      delivered_at = case when p_new_status = 'delivered' then v_now else oo.delivered_at end,
      cancelled_at = case when p_new_status = 'cancelled' then v_now else oo.cancelled_at end
  where oo.id = p_online_order_id;

  insert into public.online_order_status_history (
    org_id,
    online_order_id,
    old_status,
    new_status,
    internal_note,
    customer_note,
    changed_by_user_id,
    changed_at
  ) values (
    v_org_id,
    p_online_order_id,
    v_old_status,
    p_new_status,
    p_internal_note,
    p_customer_note,
    v_actor,
    v_now
  );

  perform public.rpc_log_audit_event(
    v_org_id,
    'online_order_status_set',
    'online_orders',
    p_online_order_id,
    v_branch_id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_new_status,
      'internal_note', p_internal_note,
      'customer_note', p_customer_note
    ),
    v_actor
  );

  online_order_id := p_online_order_id;
  old_status := v_old_status;
  new_status := p_new_status;
  changed_at := v_now;
  return next;
end;
$$;


ALTER FUNCTION "public"."rpc_set_online_order_status"("p_online_order_id" "uuid", "p_new_status" "public"."online_order_status", "p_internal_note" "text", "p_customer_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.stock_items (
    org_id,
    branch_id,
    product_id,
    quantity_on_hand,
    safety_stock
  ) values (
    p_org_id,
    p_branch_id,
    p_product_id,
    0,
    p_safety_stock
  )
  on conflict (org_id, branch_id, product_id) do update set
    safety_stock = excluded.safety_stock;

  perform public.rpc_log_audit_event(
    p_org_id,
    'stock_safety_set',
    'stock_item',
    null,
    p_branch_id,
    jsonb_build_object(
      'product_id', p_product_id,
      'safety_stock', p_safety_stock
    ),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.client_special_orders
    set status = p_status
  where id = p_special_order_id and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'special_order_status_set',
    'special_order',
    p_special_order_id,
    null,
    jsonb_build_object('status', p_status),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.staff_module_access (org_id, branch_id, role, module_key, is_enabled)
    values (p_org_id, p_branch_id, coalesce(p_role, 'staff'), p_module_key, p_is_enabled)
    on conflict (org_id, branch_id, role, module_key) do update set
      is_enabled = excluded.is_enabled
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'staff_module_access_set',
      'staff_module_access',
      (select id from upserted),
      p_branch_id,
      jsonb_build_object(
        'module_key', p_module_key,
        'is_enabled', p_is_enabled,
        'role', coalesce(p_role, 'staff')
      ),
      null
    )
  )
  select null;
$$;


ALTER FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_supplier_order_archived"("p_org_id" "uuid", "p_order_id" "uuid", "p_is_archived" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order record;
  v_next_is_archived boolean := coalesce(p_is_archived, false);
begin
  select id, branch_id, status, is_archived
    into v_order
  from public.supplier_orders
  where id = p_order_id
    and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'only draft orders can be archived';
  end if;

  if v_order.is_archived = v_next_is_archived then
    return;
  end if;

  update public.supplier_orders
    set is_archived = v_next_is_archived
  where id = p_order_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    case
      when v_next_is_archived then 'supplier_order_archived'
      else 'supplier_order_restored'
    end,
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object(
      'status', v_order.status,
      'previous_is_archived', v_order.is_archived,
      'next_is_archived', v_next_is_archived
    ),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_supplier_order_archived"("p_org_id" "uuid", "p_order_id" "uuid", "p_is_archived" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order record;
begin
  select id, branch_id, status, expected_receive_on
    into v_order
  from public.supplier_orders
  where id = p_order_id
    and org_id = p_org_id
  for update;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status not in ('sent', 'received') then
    raise exception 'expected receive date can be set only for sent/received orders';
  end if;

  update public.supplier_orders
    set expected_receive_on = p_expected_receive_on
  where id = p_order_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_expected_receive_on_set',
    'supplier_order',
    p_order_id,
    v_order.branch_id,
    jsonb_build_object(
      'old_expected_receive_on', v_order.expected_receive_on,
      'new_expected_receive_on', p_expected_receive_on,
      'status', v_order.status
    ),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_status = 'sent' then
    update public.supplier_orders
      set status = p_status,
          is_archived = false,
          sent_at = now()
    where id = p_order_id and org_id = p_org_id;
  elsif p_status = 'reconciled' then
    update public.supplier_orders
      set status = p_status,
          is_archived = false,
          reconciled_at = now()
    where id = p_order_id and org_id = p_org_id;
  else
    update public.supplier_orders
      set status = p_status,
          is_archived = case when p_status = 'draft' then is_archived else false end
    where id = p_order_id and org_id = p_org_id;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_order_status_set',
    'supplier_order',
    p_order_id,
    null,
    jsonb_build_object('status', p_status),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_account record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  update public.supplier_payment_accounts
  set
    is_active = coalesce(p_is_active, false),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_account_id
    and org_id = p_org_id
  returning * into v_account;

  if v_account is null then
    raise exception 'account not found';
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_account_status_set',
    'supplier_payment_account',
    p_account_id,
    null,
    jsonb_build_object(
      'supplier_id', v_account.supplier_id,
      'is_active', coalesce(p_is_active, false)
    ),
    auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text" DEFAULT 'UTC'::"text", "p_initial_branch_name" "text" DEFAULT 'Casa Central'::"text", "p_initial_branch_address" "text" DEFAULT NULL::"text", "p_owner_user_id" "uuid" DEFAULT NULL::"uuid", "p_owner_display_name" "text" DEFAULT NULL::"text") RETURNS TABLE("org_id" "uuid", "branch_id" "uuid", "owner_user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_org_id uuid;
  v_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_org_name), '') = '' then
    raise exception 'org name required';
  end if;

  if coalesce(trim(p_initial_branch_name), '') = '' then
    raise exception 'initial branch name required';
  end if;

  if p_owner_user_id is null then
    raise exception 'owner user required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_owner_user_id) then
    raise exception 'owner user not found';
  end if;

  insert into public.orgs (name, timezone)
  values (trim(p_org_name), coalesce(nullif(trim(p_timezone), ''), 'UTC'))
  returning id into v_org_id;

  insert into public.branches (org_id, name, address)
  values (v_org_id, trim(p_initial_branch_name), nullif(trim(p_initial_branch_address), ''))
  returning id into v_branch_id;

  insert into public.org_preferences (org_id)
  values (v_org_id)
  on conflict on constraint org_preferences_pkey do nothing;

  insert into public.org_users (org_id, user_id, role, display_name, is_active)
  values (
    v_org_id,
    p_owner_user_id,
    'org_admin',
    nullif(trim(p_owner_display_name), ''),
    true
  )
  on conflict on constraint org_users_org_id_user_id_key
  do update set
    role = 'org_admin',
    is_active = true,
    display_name = coalesce(excluded.display_name, public.org_users.display_name);

  insert into public.branch_memberships (org_id, branch_id, user_id, is_active)
  values (v_org_id, v_branch_id, p_owner_user_id, true)
  on conflict on constraint branch_memberships_org_id_branch_id_user_id_key
  do update set is_active = true;

  return query
  select v_org_id, v_branch_id, p_owner_user_id;
end;
$$;


ALTER FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text", "p_initial_branch_name" "text", "p_initial_branch_address" "text", "p_owner_user_id" "uuid", "p_owner_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.orgs where id = p_org_id) then
    raise exception 'org not found';
  end if;

  insert into public.user_active_orgs (user_id, active_org_id, updated_at)
  values (auth.uid(), p_org_id, now())
  on conflict (user_id)
  do update set active_org_id = excluded.active_org_id, updated_at = now();
end;
$$;


ALTER FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT true) RETURNS TABLE("branch_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if p_org_id is null then
    raise exception 'org required';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'branch name required';
  end if;

  if p_branch_id is null then
    insert into public.branches (org_id, name, address, is_active)
    values (p_org_id, trim(p_name), nullif(trim(p_address), ''), coalesce(p_is_active, true))
    returning id into v_branch_id;
  else
    update public.branches
    set
      name = trim(p_name),
      address = nullif(trim(p_address), ''),
      is_active = coalesce(p_is_active, is_active),
      updated_at = now()
    where id = p_branch_id
      and org_id = p_org_id
    returning id into v_branch_id;

    if v_branch_id is null then
      raise exception 'branch not found';
    end if;
  end if;

  return query select v_branch_id;
end;
$$;


ALTER FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") RETURNS TABLE("payable_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payable_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  v_payable_id := public.fn_sync_supplier_payable_from_order(
    p_org_id,
    p_order_id,
    auth.uid()
  );

  return query select v_payable_id;
end;
$$;


ALTER FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_transfer_stock_between_branches"("p_org_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_items" "jsonb", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("transfer_id" "uuid", "moved_items_count" integer, "total_quantity_moved" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_transfer_id uuid := gen_random_uuid();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_actor_is_admin boolean := false;
  v_products_enabled boolean := false;
  v_items_count integer := 0;
  v_total_quantity numeric(14,3) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_source_qty numeric(14,3);
  v_target_qty numeric(14,3);
  v_product_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_from_branch_id is null or p_to_branch_id is null then
    raise exception 'source and destination branches are required';
  end if;

  if p_from_branch_id = p_to_branch_id then
    raise exception 'source and destination branches must differ';
  end if;

  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one transfer item is required';
  end if;

  if not exists (
    select 1
    from public.branches b
    where b.org_id = p_org_id
      and b.id = p_from_branch_id
      and b.is_active = true
  ) then
    raise exception 'source branch not found';
  end if;

  if not exists (
    select 1
    from public.branches b
    where b.org_id = p_org_id
      and b.id = p_to_branch_id
      and b.is_active = true
  ) then
    raise exception 'destination branch not found';
  end if;

  v_actor_is_admin := public.is_org_admin_or_superadmin(p_org_id);

  if not v_actor_is_admin then
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

    if (
      select count(distinct bm.branch_id)
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.is_active = true
    ) < 2 then
      raise exception 'staff requires at least two assigned branches';
    end if;

    if not exists (
      select 1
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.branch_id = p_from_branch_id
        and bm.is_active = true
    ) then
      raise exception 'source branch not allowed';
    end if;

    if not exists (
      select 1
      from public.branch_memberships bm
      where bm.org_id = p_org_id
        and bm.user_id = auth.uid()
        and bm.branch_id = p_to_branch_id
        and bm.is_active = true
    ) then
      raise exception 'destination branch not allowed';
    end if;

    select bool_and(m.is_enabled)
      into v_products_enabled
    from public.rpc_get_staff_effective_modules() m
    where m.org_id = p_org_id
      and m.module_key = 'products'
      and m.branch_id in (p_from_branch_id, p_to_branch_id);

    if coalesce(v_products_enabled, false) is not true then
      raise exception 'products module disabled';
    end if;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_qty := nullif(v_item ->> 'quantity', '')::numeric;

    if v_product_id is null or v_qty is null then
      raise exception 'invalid transfer item';
    end if;

    if v_qty <= 0 then
      raise exception 'transfer quantity must be greater than 0';
    end if;

    select p.name
      into v_product_name
    from public.products p
    where p.org_id = p_org_id
      and p.id = v_product_id;

    if v_product_name is null then
      raise exception 'product not found %', v_product_id;
    end if;

    insert into public.stock_items (org_id, branch_id, product_id, quantity_on_hand)
    values
      (p_org_id, p_from_branch_id, v_product_id, 0),
      (p_org_id, p_to_branch_id, v_product_id, 0)
    on conflict (org_id, branch_id, product_id) do nothing;

    with locked_rows as (
      select si.branch_id, si.quantity_on_hand
      from public.stock_items si
      where si.org_id = p_org_id
        and si.product_id = v_product_id
        and si.branch_id in (p_from_branch_id, p_to_branch_id)
      order by si.branch_id
      for update
    )
    select
      coalesce(
        max(case when lr.branch_id = p_from_branch_id then lr.quantity_on_hand end),
        0
      ),
      coalesce(
        max(case when lr.branch_id = p_to_branch_id then lr.quantity_on_hand end),
        0
      )
      into v_source_qty, v_target_qty
    from locked_rows lr;

    if v_source_qty < v_qty then
      raise exception 'insufficient stock for product %', v_product_name;
    end if;

    update public.stock_items
      set quantity_on_hand = v_source_qty - v_qty
    where org_id = p_org_id
      and branch_id = p_from_branch_id
      and product_id = v_product_id;

    update public.stock_items
      set quantity_on_hand = v_target_qty + v_qty
    where org_id = p_org_id
      and branch_id = p_to_branch_id
      and product_id = v_product_id;

    insert into public.stock_movements (
      org_id,
      branch_id,
      product_id,
      movement_type,
      quantity_delta,
      reason,
      source_type,
      source_id
    )
    values
      (
        p_org_id,
        p_from_branch_id,
        v_product_id,
        'branch_transfer',
        -v_qty,
        coalesce(v_reason, 'transferencia entre sucursales'),
        'branch_transfer',
        v_transfer_id
      ),
      (
        p_org_id,
        p_to_branch_id,
        v_product_id,
        'branch_transfer',
        v_qty,
        coalesce(v_reason, 'transferencia entre sucursales'),
        'branch_transfer',
        v_transfer_id
      );

    v_items_count := v_items_count + 1;
    v_total_quantity := v_total_quantity + v_qty;
  end loop;

  perform public.rpc_log_audit_event(
    p_org_id,
    'stock_branch_transfer',
    'stock_transfer',
    v_transfer_id,
    null,
    jsonb_build_object(
      'from_branch_id', p_from_branch_id,
      'to_branch_id', p_to_branch_id,
      'items', p_items,
      'moved_items_count', v_items_count,
      'total_quantity_moved', v_total_quantity,
      'reason', coalesce(v_reason, 'transferencia entre sucursales')
    ),
    null
  );

  return query
  select v_transfer_id, v_items_count, v_total_quantity;
end;
$$;


ALTER FUNCTION "public"."rpc_transfer_stock_between_branches"("p_org_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_items" "jsonb", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.expiration_batches
    set expires_on = p_new_expires_on
  where id = p_batch_id
    and org_id = p_org_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'expiration_batch_date_corrected',
    'expiration_batch',
    p_batch_id,
    null,
    jsonb_build_object(
      'new_expires_on', p_new_expires_on,
      'reason', coalesce(p_reason, '')
    ),
    null
  );
end;
$$;


ALTER FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric DEFAULT NULL::numeric, "p_due_on" "date" DEFAULT NULL::"date", "p_invoice_reference" "text" DEFAULT NULL::"text", "p_invoice_photo_url" "text" DEFAULT NULL::"text", "p_invoice_note" "text" DEFAULT NULL::"text", "p_selected_payment_method" "public"."payment_method" DEFAULT NULL::"public"."payment_method") RETURNS TABLE("payable_id" "uuid", "status" "text", "outstanding_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_payable record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_invoice_amount is not null and p_invoice_amount < 0 then
    raise exception 'invoice amount must be >= 0';
  end if;

  if p_selected_payment_method is not null
    and p_selected_payment_method not in ('cash', 'transfer') then
    raise exception 'invalid selected payment method';
  end if;

  update public.supplier_payables
  set
    invoice_amount = p_invoice_amount,
    due_on = p_due_on,
    invoice_reference = nullif(trim(coalesce(p_invoice_reference, '')), ''),
    invoice_photo_url = nullif(trim(coalesce(p_invoice_photo_url, '')), ''),
    invoice_note = nullif(trim(coalesce(p_invoice_note, '')), ''),
    selected_payment_method = p_selected_payment_method,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_payable_id
    and org_id = p_org_id
  returning * into v_payable;

  if v_payable is null then
    raise exception 'payable not found';
  end if;

  perform public.fn_recompute_supplier_payable(p_payable_id, auth.uid());

  select * into v_payable
  from public.supplier_payables
  where id = p_payable_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payable_updated',
    'supplier_payable',
    p_payable_id,
    v_payable.branch_id,
    jsonb_build_object(
      'invoice_amount', v_payable.invoice_amount,
      'due_on', v_payable.due_on,
      'invoice_reference', v_payable.invoice_reference,
      'invoice_photo_url', v_payable.invoice_photo_url,
      'selected_payment_method', v_payable.selected_payment_method,
      'status', v_payable.status,
      'outstanding_amount', v_payable.outstanding_amount
    ),
    auth.uid()
  );

  return query
  select v_payable.id, v_payable.status, v_payable.outstanding_amount;
end;
$$;


ALTER FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric, "p_due_on" "date", "p_invoice_reference" "text", "p_invoice_photo_url" "text", "p_invoice_note" "text", "p_selected_payment_method" "public"."payment_method") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_branch_id uuid;
  v_invalid_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if p_role not in ('org_admin', 'staff') then
    raise exception 'invalid role %', p_role;
  end if;

  if p_role = 'staff' and coalesce(array_length(p_branch_ids, 1), 0) = 0 then
    raise exception 'staff requires at least one branch';
  end if;

  if p_role = 'staff' then
    select branch_id
    into v_invalid_branch_id
    from unnest(p_branch_ids) as branch_id
    left join public.branches b on b.id = branch_id
    where b.id is null
       or b.org_id <> p_org_id
       or b.is_active is false
    limit 1;

    if v_invalid_branch_id is not null then
      raise exception 'invalid branch % for org %', v_invalid_branch_id, p_org_id;
    end if;
  end if;

  update public.org_users
    set role = p_role,
        is_active = coalesce(p_is_active, true),
        display_name = p_display_name
  where org_id = p_org_id
    and user_id = p_user_id;

  if not found then
    raise exception 'membership not found for user % in org %', p_user_id, p_org_id;
  end if;

  delete from public.branch_memberships
  where org_id = p_org_id
    and user_id = p_user_id;

  if p_role = 'staff' then
    foreach v_branch_id in array p_branch_ids loop
      insert into public.branch_memberships (org_id, branch_id, user_id, is_active)
      values (p_org_id, v_branch_id, p_user_id, true)
      on conflict (org_id, branch_id, user_id) do update
        set is_active = true;
    end loop;
  end if;

  perform public.rpc_log_audit_event(
    p_org_id,
    'user_membership_updated',
    'org_user',
    p_user_id,
    null,
    jsonb_build_object(
      'role', p_role,
      'is_active', coalesce(p_is_active, true),
      'display_name', p_display_name,
      'branch_ids', coalesce(p_branch_ids, array[]::uuid[])
    ),
    auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) RETURNS TABLE("branch_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.branches (id, org_id, name, address, is_active)
    values (coalesce(p_branch_id, gen_random_uuid()), p_org_id, p_name, p_address, coalesce(p_is_active, true))
    on conflict (id) do update set
      name = excluded.name,
      address = excluded.address,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'branch_upsert',
      'branch',
      (select id from upserted),
      (select id from upserted),
      jsonb_build_object(
        'name', p_name,
        'address', p_address,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_cash_session_reconciliation_inputs"("p_org_id" "uuid", "p_session_id" "uuid", "p_entries" "jsonb") RETURNS TABLE("updated_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_session record;
  v_cashbox_enabled boolean := false;
  v_updated_count integer := 0;
  v_entry jsonb;
  v_row_key text;
  v_reported_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select cs.*
  into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
    and cs.org_id = p_org_id;

  if not found then
    raise exception 'cash session not found';
  end if;

  if v_session.status <> 'open' then
    raise exception 'cash session is closed';
  end if;

  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid entries';
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
        and bm.branch_id = v_session.branch_id
        and bm.is_active = true
    ) then
      raise exception 'branch not allowed';
    end if;

    select exists (
      select 1
      from public.staff_module_access sma
      where sma.org_id = p_org_id
        and sma.role = 'staff'
        and sma.module_key = 'cashbox'
        and sma.is_enabled = true
        and (sma.branch_id = v_session.branch_id or sma.branch_id is null)
      order by case when sma.branch_id is null then 0 else 1 end desc
      limit 1
    ) into v_cashbox_enabled;

    if not v_cashbox_enabled then
      raise exception 'cashbox module disabled';
    end if;
  end if;

  for v_entry in
    select value
    from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) as t(value)
  loop
    v_row_key := nullif(trim(coalesce(v_entry->>'row_key', '')), '');
    if v_row_key is null then
      continue;
    end if;

    begin
      v_reported_amount := round((v_entry->>'reported_amount')::numeric, 2);
    exception
      when others then
        raise exception 'invalid reported amount';
    end;

    if v_reported_amount < 0 then
      raise exception 'reported amount must be >= 0';
    end if;

    insert into public.cash_session_reconciliation_inputs (
      org_id,
      branch_id,
      session_id,
      row_key,
      reported_amount,
      created_by,
      updated_by
    ) values (
      p_org_id,
      v_session.branch_id,
      p_session_id,
      v_row_key,
      v_reported_amount,
      auth.uid(),
      auth.uid()
    )
    on conflict (session_id, row_key)
    do update
      set reported_amount = excluded.reported_amount,
          updated_by = auth.uid(),
          updated_at = now();

    v_updated_count := v_updated_count + 1;
  end loop;

  return query select v_updated_count;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_cash_session_reconciliation_inputs"("p_org_id" "uuid", "p_session_id" "uuid", "p_entries" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) RETURNS TABLE("client_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.clients (
      id, org_id, name, phone, email, notes, is_active
    ) values (
      coalesce(p_client_id, gen_random_uuid()),
      p_org_id,
      p_name,
      p_phone,
      p_email,
      p_notes,
      coalesce(p_is_active, true)
    )
    on conflict (id) do update set
      name = excluded.name,
      phone = excluded.phone,
      email = excluded.email,
      notes = excluded.notes,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'client_upsert',
      'client',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'phone', p_phone,
        'email', p_email,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_data_import_row"("p_org_id" "uuid", "p_job_id" "uuid", "p_row_number" integer, "p_raw_payload" "jsonb", "p_normalized_payload" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("row_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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


ALTER FUNCTION "public"."rpc_upsert_data_import_row"("p_org_id" "uuid", "p_job_id" "uuid", "p_row_number" integer, "p_raw_payload" "jsonb", "p_normalized_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) RETURNS TABLE("product_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.products (
      id,
      org_id,
      name,
      internal_code,
      barcode,
      sell_unit_type,
      uom,
      unit_price,
      is_active
    )
    values (
      coalesce(p_product_id, gen_random_uuid()),
      p_org_id,
      trim(p_name),
      nullif(trim(coalesce(p_internal_code, '')), ''),
      nullif(trim(coalesce(p_barcode, '')), ''),
      p_sell_unit_type,
      p_uom,
      p_unit_price,
      coalesce(p_is_active, true)
    )
    on conflict (id) do update set
      name = excluded.name,
      internal_code = excluded.internal_code,
      barcode = excluded.barcode,
      sell_unit_type = excluded.sell_unit_type,
      uom = excluded.uom,
      unit_price = excluded.unit_price,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'product_upsert',
      'product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', trim(p_name),
        'internal_code', nullif(trim(coalesce(p_internal_code, '')), ''),
        'barcode', nullif(trim(coalesce(p_barcode, '')), ''),
        'sell_unit_type', p_sell_unit_type,
        'uom', p_uom,
        'unit_price', p_unit_price,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer DEFAULT NULL::integer) RETURNS TABLE("product_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.products (
      id,
      org_id,
      name,
      internal_code,
      barcode,
      sell_unit_type,
      uom,
      unit_price,
      is_active,
      shelf_life_days
    )
    values (
      coalesce(p_product_id, gen_random_uuid()),
      p_org_id,
      trim(p_name),
      nullif(trim(coalesce(p_internal_code, '')), ''),
      nullif(trim(coalesce(p_barcode, '')), ''),
      p_sell_unit_type,
      p_uom,
      p_unit_price,
      coalesce(p_is_active, true),
      p_shelf_life_days
    )
    on conflict (id) do update set
      name = excluded.name,
      internal_code = excluded.internal_code,
      barcode = excluded.barcode,
      sell_unit_type = excluded.sell_unit_type,
      uom = excluded.uom,
      unit_price = excluded.unit_price,
      is_active = excluded.is_active,
      shelf_life_days = excluded.shelf_life_days
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'product_upsert',
      'product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', trim(p_name),
        'internal_code', nullif(trim(coalesce(p_internal_code, '')), ''),
        'barcode', nullif(trim(coalesce(p_barcode, '')), ''),
        'sell_unit_type', p_sell_unit_type,
        'uom', p_uom,
        'unit_price', p_unit_price,
        'is_active', p_is_active,
        'shelf_life_days', p_shelf_life_days
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) RETURNS TABLE("supplier_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.suppliers (
      id, org_id, name, contact_name, phone, email, notes, is_active
    ) values (
      coalesce(p_supplier_id, gen_random_uuid()),
      p_org_id,
      p_name,
      p_contact_name,
      p_phone,
      p_email,
      p_notes,
      coalesce(p_is_active, true)
    )
    on conflict (id) do update set
      name = excluded.name,
      contact_name = excluded.contact_name,
      phone = excluded.phone,
      email = excluded.email,
      notes = excluded.notes,
      is_active = excluded.is_active
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_upsert',
      'supplier',
      (select id from upserted),
      null,
      jsonb_build_object(
        'name', p_name,
        'contact_name', p_contact_name,
        'phone', p_phone,
        'email', p_email,
        'is_active', coalesce(p_is_active, true)
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency" DEFAULT NULL::"public"."order_frequency", "p_order_day" "public"."weekday" DEFAULT NULL::"public"."weekday", "p_receive_day" "public"."weekday" DEFAULT NULL::"public"."weekday") RETURNS TABLE("supplier_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_supplier_id uuid;
begin
  insert into public.suppliers (
    id,
    org_id,
    name,
    contact_name,
    phone,
    email,
    notes,
    is_active,
    order_frequency,
    order_day,
    receive_day
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    p_name,
    p_contact_name,
    p_phone,
    p_email,
    p_notes,
    coalesce(p_is_active, true),
    p_order_frequency,
    p_order_day,
    p_receive_day
  )
  on conflict (id) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active,
    order_frequency = excluded.order_frequency,
    order_day = excluded.order_day,
    receive_day = excluded.receive_day
  returning id into v_supplier_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_upsert',
    'supplier',
    v_supplier_id,
    null,
    jsonb_build_object(
      'name', p_name,
      'contact_name', p_contact_name,
      'phone', p_phone,
      'email', p_email,
      'is_active', coalesce(p_is_active, true),
      'order_frequency', p_order_frequency,
      'order_day', p_order_day,
      'receive_day', p_receive_day
    ),
    null
  );

  return query select v_supplier_id;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency" DEFAULT NULL::"public"."order_frequency", "p_order_day" "public"."weekday" DEFAULT NULL::"public"."weekday", "p_receive_day" "public"."weekday" DEFAULT NULL::"public"."weekday", "p_payment_terms_days" integer DEFAULT NULL::integer, "p_preferred_payment_method" "public"."payment_method" DEFAULT NULL::"public"."payment_method", "p_accepts_cash" boolean DEFAULT true, "p_accepts_transfer" boolean DEFAULT true, "p_payment_note" "text" DEFAULT NULL::"text") RETURNS TABLE("supplier_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_supplier_id uuid;
  v_accepts_cash boolean := coalesce(p_accepts_cash, true);
  v_accepts_transfer boolean := coalesce(p_accepts_transfer, true);
  v_preferred public.payment_method := p_preferred_payment_method;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'supplier name required';
  end if;

  if p_payment_terms_days is not null and p_payment_terms_days < 0 then
    raise exception 'payment terms must be >= 0';
  end if;

  if not (v_accepts_cash or v_accepts_transfer) then
    raise exception 'supplier must accept at least one payment method';
  end if;

  if v_preferred is not null and v_preferred not in ('cash', 'transfer') then
    raise exception 'preferred payment method must be cash or transfer';
  end if;

  if v_preferred = 'cash' and not v_accepts_cash then
    raise exception 'preferred payment method cash must be enabled in accepts_cash';
  end if;

  if v_preferred = 'transfer' and not v_accepts_transfer then
    raise exception 'preferred payment method transfer must be enabled in accepts_transfer';
  end if;

  insert into public.suppliers (
    id,
    org_id,
    name,
    contact_name,
    phone,
    email,
    notes,
    is_active,
    order_frequency,
    order_day,
    receive_day,
    payment_terms_days,
    preferred_payment_method,
    accepts_cash,
    accepts_transfer,
    payment_note
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    trim(p_name),
    nullif(trim(coalesce(p_contact_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_is_active, true),
    p_order_frequency,
    p_order_day,
    p_receive_day,
    p_payment_terms_days,
    v_preferred,
    v_accepts_cash,
    v_accepts_transfer,
    nullif(trim(coalesce(p_payment_note, '')), '')
  )
  on conflict (id) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active,
    order_frequency = excluded.order_frequency,
    order_day = excluded.order_day,
    receive_day = excluded.receive_day,
    payment_terms_days = excluded.payment_terms_days,
    preferred_payment_method = excluded.preferred_payment_method,
    accepts_cash = excluded.accepts_cash,
    accepts_transfer = excluded.accepts_transfer,
    payment_note = excluded.payment_note
  returning id into v_supplier_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_upsert',
    'supplier',
    v_supplier_id,
    null,
    jsonb_build_object(
      'name', trim(p_name),
      'contact_name', nullif(trim(coalesce(p_contact_name, '')), ''),
      'phone', nullif(trim(coalesce(p_phone, '')), ''),
      'email', nullif(trim(coalesce(p_email, '')), ''),
      'is_active', coalesce(p_is_active, true),
      'order_frequency', p_order_frequency,
      'order_day', p_order_day,
      'receive_day', p_receive_day,
      'payment_terms_days', p_payment_terms_days,
      'preferred_payment_method', v_preferred,
      'accepts_cash', v_accepts_cash,
      'accepts_transfer', v_accepts_transfer,
      'payment_note', nullif(trim(coalesce(p_payment_note, '')), '')
    ),
    auth.uid()
  );

  return query select v_supplier_id;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency" DEFAULT NULL::"public"."order_frequency", "p_order_day" "public"."weekday" DEFAULT NULL::"public"."weekday", "p_receive_day" "public"."weekday" DEFAULT NULL::"public"."weekday", "p_payment_terms_days" integer DEFAULT NULL::integer, "p_preferred_payment_method" "public"."payment_method" DEFAULT NULL::"public"."payment_method", "p_accepts_cash" boolean DEFAULT true, "p_accepts_transfer" boolean DEFAULT true, "p_payment_note" "text" DEFAULT NULL::"text", "p_default_markup_pct" numeric DEFAULT 40) RETURNS TABLE("supplier_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_supplier_id uuid;
  v_accepts_cash boolean := coalesce(p_accepts_cash, true);
  v_accepts_transfer boolean := coalesce(p_accepts_transfer, true);
  v_preferred public.payment_method := p_preferred_payment_method;
  v_default_markup_pct numeric := coalesce(p_default_markup_pct, 40);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'supplier name required';
  end if;

  if p_payment_terms_days is not null and p_payment_terms_days < 0 then
    raise exception 'payment terms must be >= 0';
  end if;

  if v_default_markup_pct < 0 or v_default_markup_pct > 1000 then
    raise exception 'default markup pct must be between 0 and 1000';
  end if;

  if not (v_accepts_cash or v_accepts_transfer) then
    raise exception 'supplier must accept at least one payment method';
  end if;

  if v_preferred is not null and v_preferred not in ('cash', 'transfer') then
    raise exception 'preferred payment method must be cash or transfer';
  end if;

  if v_preferred = 'cash' and not v_accepts_cash then
    raise exception 'preferred payment method cash must be enabled in accepts_cash';
  end if;

  if v_preferred = 'transfer' and not v_accepts_transfer then
    raise exception 'preferred payment method transfer must be enabled in accepts_transfer';
  end if;

  insert into public.suppliers (
    id,
    org_id,
    name,
    contact_name,
    phone,
    email,
    notes,
    is_active,
    order_frequency,
    order_day,
    receive_day,
    payment_terms_days,
    preferred_payment_method,
    accepts_cash,
    accepts_transfer,
    payment_note,
    default_markup_pct
  ) values (
    coalesce(p_supplier_id, gen_random_uuid()),
    p_org_id,
    trim(p_name),
    nullif(trim(coalesce(p_contact_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_is_active, true),
    p_order_frequency,
    p_order_day,
    p_receive_day,
    p_payment_terms_days,
    v_preferred,
    v_accepts_cash,
    v_accepts_transfer,
    nullif(trim(coalesce(p_payment_note, '')), ''),
    v_default_markup_pct
  )
  on conflict (id) do update set
    name = excluded.name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    is_active = excluded.is_active,
    order_frequency = excluded.order_frequency,
    order_day = excluded.order_day,
    receive_day = excluded.receive_day,
    payment_terms_days = excluded.payment_terms_days,
    preferred_payment_method = excluded.preferred_payment_method,
    accepts_cash = excluded.accepts_cash,
    accepts_transfer = excluded.accepts_transfer,
    payment_note = excluded.payment_note,
    default_markup_pct = excluded.default_markup_pct
  returning id into v_supplier_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_upsert',
    'supplier',
    v_supplier_id,
    null,
    jsonb_build_object(
      'name', trim(p_name),
      'contact_name', nullif(trim(coalesce(p_contact_name, '')), ''),
      'phone', nullif(trim(coalesce(p_phone, '')), ''),
      'email', nullif(trim(coalesce(p_email, '')), ''),
      'is_active', coalesce(p_is_active, true),
      'order_frequency', p_order_frequency,
      'order_day', p_order_day,
      'receive_day', p_receive_day,
      'payment_terms_days', p_payment_terms_days,
      'preferred_payment_method', v_preferred,
      'accepts_cash', v_accepts_cash,
      'accepts_transfer', v_accepts_transfer,
      'payment_note', nullif(trim(coalesce(p_payment_note, '')), ''),
      'default_markup_pct', v_default_markup_pct
    ),
    auth.uid()
  );

  return query select v_supplier_id;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text", "p_default_markup_pct" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) RETURNS TABLE("order_item_id" "uuid")
    LANGUAGE "sql"
    AS $$
  with upserted as (
    insert into public.supplier_order_items (
      org_id, order_id, product_id, ordered_qty, unit_cost
    ) values (
      p_org_id, p_order_id, p_product_id, p_ordered_qty, p_unit_cost
    )
    on conflict (order_id, product_id) do update set
      ordered_qty = excluded.ordered_qty,
      unit_cost = excluded.unit_cost
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_order_item_upsert',
      'supplier_order_item',
      (select id from upserted),
      null,
      jsonb_build_object(
        'order_id', p_order_id,
        'product_id', p_product_id,
        'ordered_qty', p_ordered_qty,
        'unit_cost', p_unit_cost
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid" DEFAULT NULL::"uuid", "p_account_label" "text" DEFAULT NULL::"text", "p_bank_name" "text" DEFAULT NULL::"text", "p_account_holder_name" "text" DEFAULT NULL::"text", "p_account_identifier" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT true) RETURNS TABLE("account_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_account_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_org_admin_or_superadmin(p_org_id) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1
    from public.suppliers s
    where s.id = p_supplier_id
      and s.org_id = p_org_id
  ) then
    raise exception 'supplier not found';
  end if;

  insert into public.supplier_payment_accounts (
    id,
    org_id,
    supplier_id,
    account_label,
    bank_name,
    account_holder_name,
    account_identifier,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) values (
    coalesce(p_account_id, gen_random_uuid()),
    p_org_id,
    p_supplier_id,
    nullif(trim(coalesce(p_account_label, '')), ''),
    nullif(trim(coalesce(p_bank_name, '')), ''),
    nullif(trim(coalesce(p_account_holder_name, '')), ''),
    nullif(trim(coalesce(p_account_identifier, '')), ''),
    coalesce(p_is_active, true),
    auth.uid(),
    auth.uid(),
    now(),
    now()
  )
  on conflict (id) do update set
    account_label = excluded.account_label,
    bank_name = excluded.bank_name,
    account_holder_name = excluded.account_holder_name,
    account_identifier = excluded.account_identifier,
    is_active = excluded.is_active,
    updated_by = auth.uid(),
    updated_at = now()
  returning id into v_account_id;

  perform public.rpc_log_audit_event(
    p_org_id,
    'supplier_payment_account_upsert',
    'supplier_payment_account',
    v_account_id,
    null,
    jsonb_build_object(
      'supplier_id', p_supplier_id,
      'account_label', nullif(trim(coalesce(p_account_label, '')), ''),
      'bank_name', nullif(trim(coalesce(p_bank_name, '')), ''),
      'account_identifier', nullif(trim(coalesce(p_account_identifier, '')), ''),
      'is_active', coalesce(p_is_active, true)
    ),
    auth.uid()
  );

  return query select v_account_id;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid", "p_account_label" "text", "p_bank_name" "text", "p_account_holder_name" "text", "p_account_identifier" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type" DEFAULT 'primary'::"public"."supplier_product_relation_type", "p_supplier_price" numeric DEFAULT NULL::numeric) RETURNS TABLE("id" "uuid")
    LANGUAGE "sql"
    AS $$
  with cleared_same_supplier as (
    delete from public.supplier_products sp
    where sp.org_id = p_org_id
      and sp.product_id = p_product_id
      and sp.supplier_id = p_supplier_id
      and sp.relation_type <> p_relation_type
    returning sp.id
  ),
  upserted as (
    insert into public.supplier_products (
      org_id,
      supplier_id,
      product_id,
      supplier_price,
      supplier_sku,
      supplier_product_name,
      relation_type
    ) values (
      p_org_id,
      p_supplier_id,
      p_product_id,
      p_supplier_price,
      p_supplier_sku,
      p_supplier_product_name,
      p_relation_type
    )
    on conflict (org_id, product_id, relation_type) do update set
      supplier_id = excluded.supplier_id,
      supplier_price = excluded.supplier_price,
      supplier_sku = excluded.supplier_sku,
      supplier_product_name = excluded.supplier_product_name,
      relation_type = excluded.relation_type
    returning id
  ), logged as (
    select public.rpc_log_audit_event(
      p_org_id,
      'supplier_product_upsert',
      'supplier_product',
      (select id from upserted),
      null,
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'product_id', p_product_id,
        'supplier_price', p_supplier_price,
        'supplier_sku', p_supplier_sku,
        'supplier_product_name', p_supplier_product_name,
        'relation_type', p_relation_type
      ),
      null
    )
  )
  select id from upserted;
$$;


ALTER FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type", "p_supplier_price" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_validate_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid") RETURNS TABLE("total_rows" integer, "valid_rows" integer, "invalid_rows" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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


ALTER FUNCTION "public"."rpc_validate_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify_text"("p_input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(trim(both '-' from regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]+', '-', 'g')), '');
$$;


ALTER FUNCTION "public"."slugify_text"("p_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_orgs_sync_platform_admin_memberships"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  perform public.fn_sync_platform_admin_memberships_for_org(new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_orgs_sync_platform_admin_memberships"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.pos_payment_devices (
    org_id,
    branch_id,
    device_name,
    provider,
    is_active
  ) values
    (new.org_id, new.id, 'Posnet principal', 'posnet', true),
    (new.org_id, new.id, 'MercadoPago principal', 'mercadopago', true)
  on conflict (org_id, branch_id, device_name) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_branch_storefront_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_base text;
begin
  v_base := coalesce(public.slugify_text(new.storefront_slug), public.slugify_text(new.name), 'sucursal');
  new.storefront_slug := public.fn_next_branch_storefront_slug(new.org_id, v_base, new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_set_branch_storefront_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_org_storefront_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_base text;
begin
  v_base := coalesce(public.slugify_text(new.storefront_slug), public.slugify_text(new.name), 'tienda');
  new.storefront_slug := public.fn_next_org_storefront_slug(v_base, new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_set_org_storefront_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_sync_supplier_payable_from_order"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if new.status in ('sent', 'received', 'reconciled') then
    perform public.fn_sync_supplier_payable_from_order(
      new.org_id,
      new.id,
      coalesce(new.created_by, auth.uid())
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_sync_supplier_payable_from_order"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "action_key" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branch_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."branch_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ticket_header_text" "text",
    "ticket_footer_text" "text",
    "fiscal_ticket_note_text" "text",
    "ticket_paper_width_mm" numeric(5,2) DEFAULT 80 NOT NULL,
    "ticket_margin_top_mm" numeric(5,2) DEFAULT 2 NOT NULL,
    "ticket_margin_right_mm" numeric(5,2) DEFAULT 2 NOT NULL,
    "ticket_margin_bottom_mm" numeric(5,2) DEFAULT 2 NOT NULL,
    "ticket_margin_left_mm" numeric(5,2) DEFAULT 2 NOT NULL,
    "ticket_font_size_px" integer DEFAULT 12 NOT NULL,
    "ticket_line_height" numeric(4,2) DEFAULT 1.35 NOT NULL,
    "storefront_slug" "text",
    "storefront_whatsapp_phone" "text",
    CONSTRAINT "branches_ticket_font_size_px_chk" CHECK ((("ticket_font_size_px" >= 8) AND ("ticket_font_size_px" <= 24))),
    CONSTRAINT "branches_ticket_line_height_chk" CHECK ((("ticket_line_height" >= (1)::numeric) AND ("ticket_line_height" <= 2.5))),
    CONSTRAINT "branches_ticket_margin_bottom_mm_chk" CHECK ((("ticket_margin_bottom_mm" >= (0)::numeric) AND ("ticket_margin_bottom_mm" <= (20)::numeric))),
    CONSTRAINT "branches_ticket_margin_left_mm_chk" CHECK ((("ticket_margin_left_mm" >= (0)::numeric) AND ("ticket_margin_left_mm" <= (20)::numeric))),
    CONSTRAINT "branches_ticket_margin_right_mm_chk" CHECK ((("ticket_margin_right_mm" >= (0)::numeric) AND ("ticket_margin_right_mm" <= (20)::numeric))),
    CONSTRAINT "branches_ticket_margin_top_mm_chk" CHECK ((("ticket_margin_top_mm" >= (0)::numeric) AND ("ticket_margin_top_mm" <= (20)::numeric))),
    CONSTRAINT "branches_ticket_paper_width_mm_chk" CHECK ((("ticket_paper_width_mm" >= (48)::numeric) AND ("ticket_paper_width_mm" <= (80)::numeric)))
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_session_count_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "denomination_value" numeric(12,2) NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "count_scope" "text" DEFAULT 'closing_drawer'::"text" NOT NULL,
    CONSTRAINT "cash_session_count_lines_denom_positive_ck" CHECK (("denomination_value" > (0)::numeric)),
    CONSTRAINT "cash_session_count_lines_quantity_non_negative_ck" CHECK (("quantity" >= 0)),
    CONSTRAINT "cash_session_count_lines_scope_ck" CHECK (("count_scope" = ANY (ARRAY['opening_drawer'::"text", 'opening_reserve'::"text", 'closing_drawer'::"text", 'closing_reserve'::"text"])))
);


ALTER TABLE "public"."cash_session_count_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_session_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "movement_type" "text" NOT NULL,
    "category_key" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "note" "text",
    "movement_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_payment_id" "uuid",
    CONSTRAINT "cash_session_movements_amount_positive_ck" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "cash_session_movements_movement_type_ck" CHECK (("movement_type" = ANY (ARRAY['expense'::"text", 'income'::"text"])))
);


ALTER TABLE "public"."cash_session_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_session_reconciliation_inputs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "row_key" "text" NOT NULL,
    "reported_amount" numeric(12,2) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cash_session_reconciliation_inputs_reported_amount_non_negative" CHECK (("reported_amount" >= (0)::numeric)),
    CONSTRAINT "cash_session_reconciliation_inputs_row_key_not_blank_ck" CHECK (("length"(TRIM(BOTH FROM "row_key")) > 0))
);


ALTER TABLE "public"."cash_session_reconciliation_inputs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "opened_by" "uuid" NOT NULL,
    "closed_by" "uuid",
    "period_type" "text" DEFAULT 'shift'::"text" NOT NULL,
    "session_label" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "opening_cash_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "expected_cash_amount" numeric(12,2),
    "counted_cash_amount" numeric(12,2),
    "difference_amount" numeric(12,2),
    "close_note" "text",
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_controlled_by_name" "text",
    "close_confirmed" boolean DEFAULT false NOT NULL,
    "opening_reserve_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "closing_drawer_amount" numeric(12,2),
    "closing_reserve_amount" numeric(12,2),
    "opened_controlled_by_name" "text",
    CONSTRAINT "cash_sessions_closing_drawer_amount_ck" CHECK ((("closing_drawer_amount" IS NULL) OR ("closing_drawer_amount" >= (0)::numeric))),
    CONSTRAINT "cash_sessions_closing_reserve_amount_ck" CHECK ((("closing_reserve_amount" IS NULL) OR ("closing_reserve_amount" >= (0)::numeric))),
    CONSTRAINT "cash_sessions_counted_cash_amount_ck" CHECK ((("counted_cash_amount" IS NULL) OR ("counted_cash_amount" >= (0)::numeric))),
    CONSTRAINT "cash_sessions_expected_cash_amount_ck" CHECK ((("expected_cash_amount" IS NULL) OR ("expected_cash_amount" >= (0)::numeric))),
    CONSTRAINT "cash_sessions_opening_cash_amount_ck" CHECK (("opening_cash_amount" >= (0)::numeric)),
    CONSTRAINT "cash_sessions_opening_reserve_amount_ck" CHECK (("opening_reserve_amount" >= (0)::numeric)),
    CONSTRAINT "cash_sessions_period_type_ck" CHECK (("period_type" = ANY (ARRAY['shift'::"text", 'day'::"text"]))),
    CONSTRAINT "cash_sessions_status_ck" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."cash_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_special_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "special_order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "supplier_id" "uuid",
    "supplier_order_id" "uuid",
    "requested_qty" numeric(14,3) NOT NULL,
    "fulfilled_qty" numeric(14,3) DEFAULT 0 NOT NULL,
    "is_ordered" boolean DEFAULT false NOT NULL,
    "ordered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_special_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_special_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "description" "text",
    "quantity" numeric(14,3),
    "status" "public"."special_order_status" DEFAULT 'pending'::"public"."special_order_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."client_special_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_import_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "template_key" "text" NOT NULL,
    "source_file_name" "text" NOT NULL,
    "source_file_path" "text",
    "status" "text" DEFAULT 'uploaded'::"text" NOT NULL,
    "total_rows" integer DEFAULT 0 NOT NULL,
    "valid_rows" integer DEFAULT 0 NOT NULL,
    "invalid_rows" integer DEFAULT 0 NOT NULL,
    "applied_rows" integer DEFAULT 0 NOT NULL,
    "errors_summary" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "data_import_jobs_counts_non_negative_ck" CHECK ((("total_rows" >= 0) AND ("valid_rows" >= 0) AND ("invalid_rows" >= 0) AND ("applied_rows" >= 0))),
    CONSTRAINT "data_import_jobs_source_file_name_not_blank_ck" CHECK (("length"(TRIM(BOTH FROM "source_file_name")) > 0)),
    CONSTRAINT "data_import_jobs_status_ck" CHECK (("status" = ANY (ARRAY['uploaded'::"text", 'validated'::"text", 'applied'::"text", 'failed'::"text"]))),
    CONSTRAINT "data_import_jobs_template_key_ck" CHECK (("template_key" = ANY (ARRAY['products'::"text", 'suppliers'::"text", 'products_suppliers'::"text"])))
);


ALTER TABLE "public"."data_import_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_import_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "row_number" integer NOT NULL,
    "raw_payload" "jsonb" NOT NULL,
    "normalized_payload" "jsonb",
    "validation_errors" "jsonb",
    "is_valid" boolean DEFAULT false NOT NULL,
    "applied_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "data_import_rows_raw_payload_object_ck" CHECK (("jsonb_typeof"("raw_payload") = 'object'::"text")),
    CONSTRAINT "data_import_rows_row_number_positive_ck" CHECK (("row_number" > 0))
);


ALTER TABLE "public"."data_import_rows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employee_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expiration_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "expires_on" "date" NOT NULL,
    "quantity" numeric(14,3) NOT NULL,
    "source_type" "text" NOT NULL,
    "source_ref_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "batch_code" "text"
);


ALTER TABLE "public"."expiration_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expiration_waste" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "batch_id" "uuid",
    "quantity" numeric(14,3) NOT NULL,
    "unit_price_snapshot" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."expiration_waste" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fiscal_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "environment" "text" NOT NULL,
    "taxpayer_cuit" character varying(11) NOT NULL,
    "alias" "text",
    "certificate_pem" "text" NOT NULL,
    "encrypted_private_key" "text" NOT NULL,
    "encryption_key_reference" "text" NOT NULL,
    "wsaa_service_name" "text" DEFAULT 'wsfe'::"text" NOT NULL,
    "wsfe_service_name" "text" DEFAULT 'wsfe'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "last_ta_obtained_at" timestamp with time zone,
    "ta_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fiscal_credentials_environment_check" CHECK (("environment" = ANY (ARRAY['homo'::"text", 'prod'::"text"]))),
    CONSTRAINT "fiscal_credentials_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'inactive'::"text", 'revoked'::"text"]))),
    CONSTRAINT "fiscal_credentials_taxpayer_cuit_check" CHECK ((("taxpayer_cuit")::"text" ~ '^[0-9]{11}$'::"text"))
);


ALTER TABLE "public"."fiscal_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."fiscal_credentials" IS 'Credenciales fiscales por tenant y ambiente para WSAA/WSFEv1.';



COMMENT ON COLUMN "public"."fiscal_credentials"."encrypted_private_key" IS 'Private key cifrada. Nunca guardar en texto plano.';



CREATE TABLE IF NOT EXISTS "public"."invoice_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "invoice_job_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_payload_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoice_events" IS 'Eventos auditables del pipeline fiscal.';



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "invoice_job_id" "uuid" NOT NULL,
    "environment" "text" NOT NULL,
    "point_of_sale_id" "uuid",
    "pto_vta" integer NOT NULL,
    "cbte_tipo" integer NOT NULL,
    "cbte_nro" bigint NOT NULL,
    "doc_tipo" integer NOT NULL,
    "doc_nro" bigint DEFAULT 0 NOT NULL,
    "currency" character varying(3) DEFAULT 'PES'::character varying NOT NULL,
    "currency_rate" numeric(18,6) DEFAULT 1 NOT NULL,
    "imp_total" numeric(18,2) NOT NULL,
    "imp_neto" numeric(18,2) DEFAULT 0 NOT NULL,
    "imp_iva" numeric(18,2) DEFAULT 0 NOT NULL,
    "imp_trib" numeric(18,2) DEFAULT 0 NOT NULL,
    "imp_op_ex" numeric(18,2) DEFAULT 0 NOT NULL,
    "imp_tot_conc" numeric(18,2) DEFAULT 0 NOT NULL,
    "cae" character varying(32),
    "cae_expires_at" "date",
    "result_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "afip_observations_json" "jsonb",
    "afip_events_json" "jsonb",
    "qr_payload_json" "jsonb",
    "pdf_storage_path" "text",
    "ticket_storage_path" "text",
    "raw_request_json" "jsonb",
    "raw_response_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invoices_cbte_nro_check" CHECK (("cbte_nro" > 0)),
    CONSTRAINT "invoices_cbte_tipo_check" CHECK (("cbte_tipo" > 0)),
    CONSTRAINT "invoices_currency_check" CHECK ((("currency")::"text" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "invoices_currency_rate_check" CHECK (("currency_rate" > (0)::numeric)),
    CONSTRAINT "invoices_doc_nro_check" CHECK (("doc_nro" >= 0)),
    CONSTRAINT "invoices_doc_tipo_check" CHECK (("doc_tipo" >= 0)),
    CONSTRAINT "invoices_environment_check" CHECK (("environment" = ANY (ARRAY['homo'::"text", 'prod'::"text"]))),
    CONSTRAINT "invoices_imp_iva_nonnegative_check" CHECK (("imp_iva" >= (0)::numeric)),
    CONSTRAINT "invoices_imp_neto_nonnegative_check" CHECK (("imp_neto" >= (0)::numeric)),
    CONSTRAINT "invoices_imp_op_ex_nonnegative_check" CHECK (("imp_op_ex" >= (0)::numeric)),
    CONSTRAINT "invoices_imp_tot_conc_nonnegative_check" CHECK (("imp_tot_conc" >= (0)::numeric)),
    CONSTRAINT "invoices_imp_total_nonnegative_check" CHECK (("imp_total" >= (0)::numeric)),
    CONSTRAINT "invoices_imp_trib_nonnegative_check" CHECK (("imp_trib" >= (0)::numeric)),
    CONSTRAINT "invoices_pto_vta_check" CHECK (("pto_vta" > 0)),
    CONSTRAINT "invoices_result_status_check" CHECK (("result_status" = ANY (ARRAY['authorized'::"text", 'rejected'::"text", 'void'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoices" IS 'Comprobantes fiscales autorizados o persistidos con estado final.';



COMMENT ON COLUMN "public"."invoices"."raw_request_json" IS 'Request fiscal persistido para auditoría técnica.';



COMMENT ON COLUMN "public"."invoices"."raw_response_json" IS 'Response fiscal persistido para auditoría técnica.';



CREATE TABLE IF NOT EXISTS "public"."online_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "online_order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name_snapshot" "text" NOT NULL,
    "unit_price_snapshot" numeric(12,2) NOT NULL,
    "quantity" numeric(14,3) NOT NULL,
    "line_total" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "online_order_items_quantity_check" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."online_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."online_order_payment_proofs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "online_order_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "review_status" "public"."online_proof_review_status" DEFAULT 'pending'::"public"."online_proof_review_status" NOT NULL,
    "review_note" "text",
    "reviewed_by_user_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."online_order_payment_proofs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."online_order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "online_order_id" "uuid" NOT NULL,
    "old_status" "public"."online_order_status",
    "new_status" "public"."online_order_status" NOT NULL,
    "internal_note" "text",
    "customer_note" "text",
    "changed_by_user_id" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."online_order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."online_order_tracking_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "online_order_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."online_order_tracking_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."online_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "order_code" "text" NOT NULL,
    "status" "public"."online_order_status" DEFAULT 'pending'::"public"."online_order_status" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "customer_notes" "text",
    "staff_notes" "text",
    "payment_intent" "public"."online_payment_intent" DEFAULT 'pay_on_pickup'::"public"."online_payment_intent" NOT NULL,
    "subtotal_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_by_user_id" "uuid",
    "confirmed_at" timestamp with time zone,
    "ready_for_pickup_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_address" "text"
);


ALTER TABLE "public"."online_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_preferences" (
    "org_id" "uuid" NOT NULL,
    "critical_days" integer DEFAULT 3 NOT NULL,
    "warning_days" integer DEFAULT 7 NOT NULL,
    "allow_negative_stock" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cash_discount_enabled" boolean DEFAULT true NOT NULL,
    "cash_discount_default_pct" numeric(5,2) DEFAULT 10 NOT NULL,
    "cash_denominations" "jsonb" DEFAULT '[100, 200, 500, 1000, 2000, 10000, 20000]'::"jsonb" NOT NULL,
    "employee_discount_enabled" boolean DEFAULT true NOT NULL,
    "employee_discount_default_pct" numeric(5,2) DEFAULT 10 NOT NULL,
    "employee_discount_combinable_with_cash_discount" boolean DEFAULT false NOT NULL,
    "default_supplier_markup_pct" numeric(6,2) DEFAULT 40 NOT NULL,
    "fiscal_prod_enqueue_enabled" boolean DEFAULT false NOT NULL,
    "fiscal_prod_live_enabled" boolean DEFAULT false NOT NULL,
    CONSTRAINT "org_preferences_cash_denominations_array_ck" CHECK (("jsonb_typeof"("cash_denominations") = 'array'::"text")),
    CONSTRAINT "org_preferences_cash_discount_default_pct_ck" CHECK ((("cash_discount_default_pct" >= (0)::numeric) AND ("cash_discount_default_pct" <= (100)::numeric))),
    CONSTRAINT "org_preferences_default_supplier_markup_pct_ck" CHECK ((("default_supplier_markup_pct" >= (0)::numeric) AND ("default_supplier_markup_pct" <= (1000)::numeric))),
    CONSTRAINT "org_preferences_employee_discount_default_pct_ck" CHECK ((("employee_discount_default_pct" >= (0)::numeric) AND ("employee_discount_default_pct" <= (100)::numeric)))
);


ALTER TABLE "public"."org_preferences" OWNER TO "postgres";


COMMENT ON COLUMN "public"."org_preferences"."fiscal_prod_enqueue_enabled" IS 'Gate operativo org-wide para permitir encolar jobs fiscales en ambiente prod. No habilita emisión real por sí solo.';



COMMENT ON COLUMN "public"."org_preferences"."fiscal_prod_live_enabled" IS 'Gate org-wide para permitir FECAESolicitar real en ambiente prod desde el worker fiscal.';



CREATE TABLE IF NOT EXISTS "public"."org_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "display_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orgs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storefront_slug" "text"
);


ALTER TABLE "public"."orgs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_of_sale" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "environment" "text" NOT NULL,
    "pto_vta" integer NOT NULL,
    "description" "text",
    "invoice_mode" "text" DEFAULT 'sync'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "points_of_sale_environment_check" CHECK (("environment" = ANY (ARRAY['homo'::"text", 'prod'::"text"]))),
    CONSTRAINT "points_of_sale_invoice_mode_check" CHECK (("invoice_mode" = ANY (ARRAY['sync'::"text", 'async'::"text"]))),
    CONSTRAINT "points_of_sale_pto_vta_check" CHECK (("pto_vta" > 0)),
    CONSTRAINT "points_of_sale_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."points_of_sale" OWNER TO "postgres";


COMMENT ON TABLE "public"."points_of_sale" IS 'Puntos de venta fiscales habilitados por tenant / sucursal / ambiente.';



CREATE TABLE IF NOT EXISTS "public"."pos_payment_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "device_name" "text" NOT NULL,
    "provider" "text" DEFAULT 'posnet'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pos_payment_devices_device_name_not_blank_ck" CHECK (("length"(TRIM(BOTH FROM "device_name")) > 0)),
    CONSTRAINT "pos_payment_devices_provider_ck" CHECK (("provider" = ANY (ARRAY['posnet'::"text", 'mercadopago'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."pos_payment_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."print_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "printer_target" "text",
    "format" "text" DEFAULT 'escpos'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "print_jobs_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "print_jobs_format_check" CHECK (("format" = ANY (ARRAY['escpos'::"text", 'pdf'::"text", 'image'::"text"]))),
    CONSTRAINT "print_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'dispatched'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."print_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."print_jobs" IS 'Cola de impresión y reimpresión de comprobantes.';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "internal_code" "text",
    "barcode" "text",
    "sell_unit_type" "public"."sell_unit_type" NOT NULL,
    "uom" "text" NOT NULL,
    "unit_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shelf_life_days" integer,
    "brand" "text",
    "image_url" "text",
    "name_normalized" "text" GENERATED ALWAYS AS ("public"."normalize_product_catalog_text"("name")) STORED,
    "barcode_normalized" "text" GENERATED ALWAYS AS (NULLIF("regexp_replace"(COALESCE("barcode", ''::"text"), '[^0-9]'::"text", ''::"text", 'g'::"text"), ''::"text")) STORED,
    "purchase_by_pack" boolean DEFAULT false NOT NULL,
    "units_per_pack" integer,
    CONSTRAINT "products_purchase_pack_consistency_ck" CHECK (((("purchase_by_pack" = false) AND ("units_per_pack" IS NULL)) OR (("purchase_by_pack" = true) AND ("units_per_pack" IS NOT NULL) AND ("units_per_pack" > 1)))),
    CONSTRAINT "products_shelf_life_days_nonnegative" CHECK ((("shelf_life_days" IS NULL) OR ("shelf_life_days" >= 0)))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_delivery_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "sale_delivery_link_id" "uuid",
    "document_kind" "public"."sale_delivery_document_kind" NOT NULL,
    "event_kind" "text" NOT NULL,
    "channel" "text",
    "actor_user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sale_delivery_events_channel_ck" CHECK ((("channel" IS NULL) OR ("channel" = ANY (ARRAY['whatsapp'::"text", 'public_link'::"text"])))),
    CONSTRAINT "sale_delivery_events_event_kind_ck" CHECK (("event_kind" = ANY (ARRAY['shared'::"text", 'revoked'::"text", 'regenerated'::"text", 'opened'::"text"])))
);


ALTER TABLE "public"."sale_delivery_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."sale_delivery_events" IS 'Historial operativo de compartidos y aperturas de links de ticket/factura por venta.';



CREATE TABLE IF NOT EXISTS "public"."sale_delivery_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "document_kind" "public"."sale_delivery_document_kind" NOT NULL,
    "token" "text" NOT NULL,
    "status" "public"."sale_delivery_link_status" DEFAULT 'active'::"public"."sale_delivery_link_status" NOT NULL,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "last_shared_at" timestamp with time zone,
    "last_shared_channel" "text",
    "share_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "sale_delivery_links_last_shared_channel_ck" CHECK ((("last_shared_channel" IS NULL) OR ("last_shared_channel" = 'whatsapp'::"text"))),
    CONSTRAINT "sale_delivery_links_share_count_non_negative_ck" CHECK (("share_count" >= 0))
);


ALTER TABLE "public"."sale_delivery_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "document_kind" "text" NOT NULL,
    "status" "text" DEFAULT 'requested'::"text" NOT NULL,
    "requested_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sale_documents_document_kind_check" CHECK (("document_kind" = ANY (ARRAY['fiscal_invoice'::"text", 'receipt'::"text", 'internal_ticket'::"text"]))),
    CONSTRAINT "sale_documents_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."sale_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."sale_documents" IS 'Solicitudes de documentos derivados de una venta.';



CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name_snapshot" "text" NOT NULL,
    "unit_price_snapshot" numeric(12,2) NOT NULL,
    "quantity" numeric(14,3) NOT NULL,
    "line_total" numeric(12,2) NOT NULL
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_device_id" "uuid",
    CONSTRAINT "sale_payments_amount_positive_ck" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "sale_payments_method_not_mixed_ck" CHECK ((("payment_method")::"text" <> 'mixed'::"text"))
);


ALTER TABLE "public"."sale_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "total_amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subtotal_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_pct" numeric(5,2) DEFAULT 0 NOT NULL,
    "employee_account_id" "uuid",
    "employee_name_snapshot" "text",
    "cash_discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "cash_discount_pct" numeric(5,2) DEFAULT 0 NOT NULL,
    "employee_discount_applied" boolean DEFAULT false NOT NULL,
    "employee_discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "employee_discount_pct" numeric(5,2) DEFAULT 0 NOT NULL,
    "is_invoiced" boolean DEFAULT false NOT NULL,
    "invoiced_at" timestamp with time zone,
    "client_id" "uuid",
    CONSTRAINT "sales_cash_discount_amount_range_ck" CHECK ((("cash_discount_amount" >= (0)::numeric) AND ("cash_discount_amount" <= "subtotal_amount"))),
    CONSTRAINT "sales_cash_discount_pct_range_ck" CHECK ((("cash_discount_pct" >= (0)::numeric) AND ("cash_discount_pct" <= (100)::numeric))),
    CONSTRAINT "sales_discount_amount_range_ck" CHECK ((("discount_amount" >= (0)::numeric) AND ("discount_amount" <= "subtotal_amount"))),
    CONSTRAINT "sales_discount_pct_range_ck" CHECK ((("discount_pct" >= (0)::numeric) AND ("discount_pct" <= (100)::numeric))),
    CONSTRAINT "sales_employee_discount_amount_range_ck" CHECK ((("employee_discount_amount" >= (0)::numeric) AND ("employee_discount_amount" <= "subtotal_amount"))),
    CONSTRAINT "sales_employee_discount_pct_range_ck" CHECK ((("employee_discount_pct" >= (0)::numeric) AND ("employee_discount_pct" <= (100)::numeric))),
    CONSTRAINT "sales_invoiced_at_required_ck" CHECK (((NOT "is_invoiced") OR ("invoiced_at" IS NOT NULL)))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_module_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "role" "public"."user_role" DEFAULT 'staff'::"public"."user_role" NOT NULL,
    "module_key" "text" NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_module_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity_on_hand" numeric(14,3) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "safety_stock" numeric(14,3) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."stock_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "movement_type" "public"."stock_movement_type" NOT NULL,
    "quantity_delta" numeric(14,3) NOT NULL,
    "reason" "text",
    "source_type" "text",
    "source_id" "uuid",
    "expiration_batch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storefront_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hostname" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."storefront_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storefront_settings" (
    "org_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "allow_out_of_stock_order" boolean DEFAULT false NOT NULL,
    "whatsapp_phone" "text",
    "pickup_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."storefront_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "ordered_qty" numeric(14,3) NOT NULL,
    "received_qty" numeric(14,3) DEFAULT 0 NOT NULL,
    "unit_cost" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."supplier_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "status" "public"."supplier_order_status" DEFAULT 'draft'::"public"."supplier_order_status" NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "reconciled_at" timestamp with time zone,
    "controlled_by_user_id" "uuid",
    "controlled_by_name" "text",
    "expected_receive_on" "date",
    "is_archived" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."supplier_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_payables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "estimated_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "invoice_amount" numeric(12,2),
    "paid_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "outstanding_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "due_on" "date",
    "payment_terms_days_snapshot" integer,
    "preferred_payment_method" "public"."payment_method",
    "selected_payment_method" "public"."payment_method",
    "invoice_photo_url" "text",
    "invoice_note" "text",
    "paid_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_reference" "text",
    CONSTRAINT "supplier_payables_estimated_amount_ck" CHECK (("estimated_amount" >= (0)::numeric)),
    CONSTRAINT "supplier_payables_invoice_amount_ck" CHECK ((("invoice_amount" IS NULL) OR ("invoice_amount" >= (0)::numeric))),
    CONSTRAINT "supplier_payables_outstanding_amount_ck" CHECK (("outstanding_amount" >= (0)::numeric)),
    CONSTRAINT "supplier_payables_paid_amount_ck" CHECK (("paid_amount" >= (0)::numeric)),
    CONSTRAINT "supplier_payables_payment_terms_snapshot_ck" CHECK ((("payment_terms_days_snapshot" IS NULL) OR ("payment_terms_days_snapshot" >= 0))),
    CONSTRAINT "supplier_payables_preferred_payment_method_ck" CHECK ((("preferred_payment_method" IS NULL) OR ("preferred_payment_method" = ANY (ARRAY['cash'::"public"."payment_method", 'transfer'::"public"."payment_method"])))),
    CONSTRAINT "supplier_payables_selected_payment_method_ck" CHECK ((("selected_payment_method" IS NULL) OR ("selected_payment_method" = ANY (ARRAY['cash'::"public"."payment_method", 'transfer'::"public"."payment_method"])))),
    CONSTRAINT "supplier_payables_status_ck" CHECK (("status" = ANY (ARRAY['pending'::"text", 'partial'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."supplier_payables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_payment_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "account_label" "text",
    "bank_name" "text",
    "account_holder_name" "text",
    "account_identifier" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."supplier_payment_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "payable_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "transfer_account_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference" "text",
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "supplier_payments_amount_positive_ck" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "supplier_payments_method_ck" CHECK (("payment_method" = ANY (ARRAY['cash'::"public"."payment_method", 'transfer'::"public"."payment_method"])))
);


ALTER TABLE "public"."supplier_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "supplier_sku" "text",
    "supplier_product_name" "text",
    "default_purchase_uom" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "relation_type" "public"."supplier_product_relation_type" DEFAULT 'primary'::"public"."supplier_product_relation_type" NOT NULL,
    "supplier_price" numeric(14,2),
    CONSTRAINT "supplier_products_supplier_price_nonnegative_ck" CHECK ((("supplier_price" IS NULL) OR ("supplier_price" >= (0)::numeric)))
);


ALTER TABLE "public"."supplier_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "phone" "text",
    "email" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_frequency" "public"."order_frequency",
    "order_day" "public"."weekday",
    "receive_day" "public"."weekday",
    "payment_terms_days" integer,
    "preferred_payment_method" "public"."payment_method",
    "accepts_cash" boolean DEFAULT true NOT NULL,
    "accepts_transfer" boolean DEFAULT true NOT NULL,
    "payment_note" "text",
    "default_markup_pct" numeric(6,2) DEFAULT 40 NOT NULL,
    CONSTRAINT "suppliers_accepts_any_payment_method_ck" CHECK (("accepts_cash" OR "accepts_transfer")),
    CONSTRAINT "suppliers_default_markup_pct_range_ck" CHECK ((("default_markup_pct" >= (0)::numeric) AND ("default_markup_pct" <= (1000)::numeric))),
    CONSTRAINT "suppliers_payment_terms_days_nonnegative_ck" CHECK ((("payment_terms_days" IS NULL) OR ("payment_terms_days" >= 0))),
    CONSTRAINT "suppliers_preferred_payment_method_ck" CHECK ((("preferred_payment_method" IS NULL) OR ("preferred_payment_method" = ANY (ARRAY['cash'::"public"."payment_method", 'transfer'::"public"."payment_method"]))))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_active_orgs" (
    "user_id" "uuid" NOT NULL,
    "active_org_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_active_orgs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_audit_log_admin" WITH ("security_invoker"='true') AS
 SELECT "al"."id",
    "al"."org_id",
    "al"."branch_id",
    "b"."name" AS "branch_name",
    "al"."created_at",
    "al"."action_key",
    "al"."entity_type",
    "al"."entity_id",
    "al"."actor_user_id",
    "ou"."display_name" AS "actor_display_name",
    "ou"."role" AS "actor_role",
    "al"."metadata"
   FROM (("public"."audit_log" "al"
     LEFT JOIN "public"."org_users" "ou" ON ((("ou"."org_id" = "al"."org_id") AND ("ou"."user_id" = "al"."actor_user_id"))))
     LEFT JOIN "public"."branches" "b" ON (("b"."id" = "al"."branch_id")));


ALTER VIEW "public"."v_audit_log_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_branches_admin" AS
 SELECT "b"."id" AS "branch_id",
    "b"."org_id",
    "b"."name",
    "b"."address",
    "b"."is_active",
    "b"."created_at",
    "b"."updated_at",
    COALESCE("m"."members_count", (0)::bigint) AS "members_count",
    "b"."ticket_header_text",
    "b"."ticket_footer_text",
    "b"."fiscal_ticket_note_text",
    "b"."ticket_paper_width_mm",
    "b"."ticket_margin_top_mm",
    "b"."ticket_margin_right_mm",
    "b"."ticket_margin_bottom_mm",
    "b"."ticket_margin_left_mm",
    "b"."ticket_font_size_px",
    "b"."ticket_line_height",
    "b"."storefront_slug",
    "b"."storefront_whatsapp_phone"
   FROM ("public"."branches" "b"
     LEFT JOIN ( SELECT "branch_memberships"."branch_id",
            "count"(*) AS "members_count"
           FROM "public"."branch_memberships"
          WHERE ("branch_memberships"."is_active" = true)
          GROUP BY "branch_memberships"."branch_id") "m" ON (("m"."branch_id" = "b"."id")));


ALTER VIEW "public"."v_branches_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cashbox_session_current" AS
 WITH "sales_by_method" AS (
         SELECT "cs_1"."id" AS "session_id",
            COALESCE("sum"("sp"."amount") FILTER (WHERE ("sp"."payment_method" = 'cash'::"public"."payment_method")), (0)::numeric) AS "cash_sales_amount",
            COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" = ANY (ARRAY['card'::"text", 'debit'::"text", 'credit'::"text"]))), (0)::numeric) AS "card_sales_amount",
            COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" = 'mercadopago'::"text")), (0)::numeric) AS "mercadopago_sales_amount"
           FROM (("public"."cash_sessions" "cs_1"
             LEFT JOIN "public"."sales" "s" ON ((("s"."org_id" = "cs_1"."org_id") AND ("s"."branch_id" = "cs_1"."branch_id") AND ("s"."created_at" >= "cs_1"."opened_at") AND ("s"."created_at" <= COALESCE("cs_1"."closed_at", "now"())))))
             LEFT JOIN "public"."sale_payments" "sp" ON (("sp"."sale_id" = "s"."id")))
          GROUP BY "cs_1"."id"
        ), "movement_totals" AS (
         SELECT "csm"."session_id",
            COALESCE("sum"(
                CASE
                    WHEN ("csm"."movement_type" = 'income'::"text") THEN "csm"."amount"
                    ELSE (0)::numeric
                END), (0)::numeric) AS "manual_income_amount",
            COALESCE("sum"(
                CASE
                    WHEN ("csm"."movement_type" = 'expense'::"text") THEN "csm"."amount"
                    ELSE (0)::numeric
                END), (0)::numeric) AS "manual_expense_amount",
            "count"(*) AS "movements_count"
           FROM "public"."cash_session_movements" "csm"
          GROUP BY "csm"."session_id"
        )
 SELECT "cs"."id" AS "session_id",
    "cs"."org_id",
    "cs"."branch_id",
    "cs"."status",
    "cs"."period_type",
    "cs"."session_label",
    "cs"."opening_cash_amount",
    "cs"."opening_reserve_amount",
    "cs"."closing_drawer_amount",
    "cs"."closing_reserve_amount",
    COALESCE("sbm"."cash_sales_amount", (0)::numeric) AS "cash_sales_amount",
    COALESCE("sbm"."card_sales_amount", (0)::numeric) AS "card_sales_amount",
    COALESCE("sbm"."mercadopago_sales_amount", (0)::numeric) AS "mercadopago_sales_amount",
    COALESCE("mt"."manual_income_amount", (0)::numeric) AS "manual_income_amount",
    COALESCE("mt"."manual_expense_amount", (0)::numeric) AS "manual_expense_amount",
    ((((("cs"."opening_cash_amount" + "cs"."opening_reserve_amount") + COALESCE("sbm"."cash_sales_amount", (0)::numeric)) + COALESCE("mt"."manual_income_amount", (0)::numeric)) - COALESCE("mt"."manual_expense_amount", (0)::numeric)))::numeric(12,2) AS "expected_cash_amount",
    "cs"."counted_cash_amount",
        CASE
            WHEN ("cs"."counted_cash_amount" IS NULL) THEN NULL::numeric
            ELSE (("cs"."counted_cash_amount" - (((("cs"."opening_cash_amount" + "cs"."opening_reserve_amount") + COALESCE("sbm"."cash_sales_amount", (0)::numeric)) + COALESCE("mt"."manual_income_amount", (0)::numeric)) - COALESCE("mt"."manual_expense_amount", (0)::numeric))))::numeric(12,2)
        END AS "difference_amount",
    COALESCE("mt"."movements_count", (0)::bigint) AS "movements_count",
    "cs"."opened_by",
    "cs"."closed_by",
    "cs"."opened_at",
    "cs"."closed_at",
    "cs"."close_note",
    "cs"."closed_controlled_by_name",
    "cs"."close_confirmed",
    "cs"."created_at",
    "cs"."updated_at",
    "cs"."opened_controlled_by_name"
   FROM (("public"."cash_sessions" "cs"
     LEFT JOIN "sales_by_method" "sbm" ON (("sbm"."session_id" = "cs"."id")))
     LEFT JOIN "movement_totals" "mt" ON (("mt"."session_id" = "cs"."id")));


ALTER VIEW "public"."v_cashbox_session_current" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_dashboard_admin" AS
 WITH "scopes" AS (
         SELECT "o_1"."id" AS "org_id",
            NULL::"uuid" AS "branch_id"
           FROM "public"."orgs" "o_1"
        UNION ALL
         SELECT "b"."org_id",
            "b"."id" AS "branch_id"
           FROM "public"."branches" "b"
        ), "sales_agg" AS (
         SELECT "s"."id" AS "sale_id",
            "s"."org_id",
            "s"."branch_id",
            "s"."created_at",
            "s"."total_amount",
            "s"."cash_discount_amount",
            "s"."is_invoiced",
            COALESCE("sum"("sp"."amount") FILTER (WHERE ("sp"."payment_method" = 'cash'::"public"."payment_method")), (0)::numeric) AS "cash_collected_amount",
            ("count"(*) FILTER (WHERE ("sp"."payment_method" = 'cash'::"public"."payment_method")) > 0) AS "has_cash_component"
           FROM ("public"."sales" "s"
             LEFT JOIN "public"."sale_payments" "sp" ON (("sp"."sale_id" = "s"."id")))
          GROUP BY "s"."id", "s"."org_id", "s"."branch_id", "s"."created_at", "s"."total_amount", "s"."cash_discount_amount", "s"."is_invoiced"
        ), "metrics" AS (
         SELECT "s"."org_id",
            "s"."branch_id",
            COALESCE("sum"("s"."total_amount") FILTER (WHERE (("s"."created_at")::"date" = CURRENT_DATE)), (0)::numeric) AS "sales_today_total",
            COALESCE("count"(*) FILTER (WHERE (("s"."created_at")::"date" = CURRENT_DATE)), (0)::bigint) AS "sales_today_count",
            COALESCE("sum"("s"."total_amount") FILTER (WHERE ("s"."created_at" >= "date_trunc"('week'::"text", "now"()))), (0)::numeric) AS "sales_week_total",
            COALESCE("sum"("s"."total_amount") FILTER (WHERE ("s"."created_at" >= "date_trunc"('month'::"text", "now"()))), (0)::numeric) AS "sales_month_total",
            COALESCE("sum"("s"."cash_collected_amount") FILTER (WHERE (("s"."created_at")::"date" = CURRENT_DATE)), (0)::numeric) AS "cash_sales_today_total",
            COALESCE("count"(*) FILTER (WHERE ((("s"."created_at")::"date" = CURRENT_DATE) AND "s"."has_cash_component")), (0)::bigint) AS "cash_sales_today_count",
            COALESCE("sum"("s"."cash_discount_amount") FILTER (WHERE (("s"."created_at")::"date" = CURRENT_DATE)), (0)::numeric) AS "cash_discount_today_total",
            COALESCE("count"(*) FILTER (WHERE ((("s"."created_at")::"date" = CURRENT_DATE) AND ("s"."cash_discount_amount" > (0)::numeric))), (0)::bigint) AS "cash_discounted_sales_today_count",
            COALESCE("sum"("s"."total_amount") FILTER (WHERE ((("s"."created_at")::"date" = CURRENT_DATE) AND "s"."is_invoiced")), (0)::numeric) AS "invoiced_sales_today_total",
            COALESCE("count"(*) FILTER (WHERE ((("s"."created_at")::"date" = CURRENT_DATE) AND "s"."is_invoiced")), (0)::bigint) AS "invoiced_sales_today_count",
            COALESCE("sum"("s"."total_amount") FILTER (WHERE ((("s"."created_at")::"date" = CURRENT_DATE) AND (NOT "s"."is_invoiced"))), (0)::numeric) AS "non_invoiced_sales_today_total",
            COALESCE("count"(*) FILTER (WHERE ((("s"."created_at")::"date" = CURRENT_DATE) AND (NOT "s"."is_invoiced"))), (0)::bigint) AS "non_invoiced_sales_today_count"
           FROM "sales_agg" "s"
          GROUP BY "s"."org_id", "s"."branch_id"
        ), "expiration_counts" AS (
         SELECT "eb"."org_id",
            "eb"."branch_id",
            "count"(*) FILTER (WHERE (("eb"."expires_on" - CURRENT_DATE) <= "op"."critical_days")) AS "expirations_critical_count",
            "count"(*) FILTER (WHERE ((("eb"."expires_on" - CURRENT_DATE) > "op"."critical_days") AND (("eb"."expires_on" - CURRENT_DATE) <= "op"."warning_days"))) AS "expirations_warning_count"
           FROM ("public"."expiration_batches" "eb"
             LEFT JOIN "public"."org_preferences" "op" ON (("op"."org_id" = "eb"."org_id")))
          GROUP BY "eb"."org_id", "eb"."branch_id"
        ), "order_counts" AS (
         SELECT "so"."org_id",
            "so"."branch_id",
            "count"(*) FILTER (WHERE ("so"."status" = ANY (ARRAY['sent'::"public"."supplier_order_status", 'received'::"public"."supplier_order_status"]))) AS "supplier_orders_pending_count"
           FROM "public"."supplier_orders" "so"
          GROUP BY "so"."org_id", "so"."branch_id"
        ), "client_order_counts" AS (
         SELECT "co"."org_id",
            "co"."branch_id",
            "count"(*) FILTER (WHERE ("co"."status" = ANY (ARRAY['pending'::"public"."special_order_status", 'ordered'::"public"."special_order_status", 'received'::"public"."special_order_status"]))) AS "client_orders_pending_count"
           FROM "public"."client_special_orders" "co"
          GROUP BY "co"."org_id", "co"."branch_id"
        )
 SELECT "sc"."org_id",
    "sc"."branch_id",
    COALESCE("m"."sales_today_total", (0)::numeric) AS "sales_today_total",
    COALESCE("m"."sales_today_count", (0)::bigint) AS "sales_today_count",
    COALESCE("m"."sales_week_total", (0)::numeric) AS "sales_week_total",
    COALESCE("m"."sales_month_total", (0)::numeric) AS "sales_month_total",
    COALESCE("m"."cash_sales_today_total", (0)::numeric) AS "cash_sales_today_total",
    COALESCE("m"."cash_sales_today_count", (0)::bigint) AS "cash_sales_today_count",
    COALESCE("m"."cash_discount_today_total", (0)::numeric) AS "cash_discount_today_total",
    COALESCE("m"."cash_discounted_sales_today_count", (0)::bigint) AS "cash_discounted_sales_today_count",
    COALESCE("e"."expirations_critical_count", (0)::bigint) AS "expirations_critical_count",
    COALESCE("e"."expirations_warning_count", (0)::bigint) AS "expirations_warning_count",
    COALESCE("o"."supplier_orders_pending_count", (0)::bigint) AS "supplier_orders_pending_count",
    COALESCE("c"."client_orders_pending_count", (0)::bigint) AS "client_orders_pending_count",
    COALESCE("m"."invoiced_sales_today_total", (0)::numeric) AS "invoiced_sales_today_total",
    COALESCE("m"."invoiced_sales_today_count", (0)::bigint) AS "invoiced_sales_today_count",
    COALESCE("m"."non_invoiced_sales_today_total", (0)::numeric) AS "non_invoiced_sales_today_total",
    COALESCE("m"."non_invoiced_sales_today_count", (0)::bigint) AS "non_invoiced_sales_today_count"
   FROM (((("scopes" "sc"
     LEFT JOIN "metrics" "m" ON ((("m"."org_id" = "sc"."org_id") AND (("m"."branch_id" = "sc"."branch_id") OR (("m"."branch_id" IS NULL) AND ("sc"."branch_id" IS NULL))))))
     LEFT JOIN "expiration_counts" "e" ON ((("e"."org_id" = "sc"."org_id") AND (("e"."branch_id" = "sc"."branch_id") OR (("e"."branch_id" IS NULL) AND ("sc"."branch_id" IS NULL))))))
     LEFT JOIN "order_counts" "o" ON ((("o"."org_id" = "sc"."org_id") AND (("o"."branch_id" = "sc"."branch_id") OR (("o"."branch_id" IS NULL) AND ("sc"."branch_id" IS NULL))))))
     LEFT JOIN "client_order_counts" "c" ON ((("c"."org_id" = "sc"."org_id") AND (("c"."branch_id" = "sc"."branch_id") OR (("c"."branch_id" IS NULL) AND ("sc"."branch_id" IS NULL))))));


ALTER VIEW "public"."v_dashboard_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_data_onboarding_tasks" WITH ("security_invoker"='true') AS
 WITH "product_primary" AS (
         SELECT DISTINCT "sp"."org_id",
            "sp"."product_id"
           FROM "public"."supplier_products" "sp"
          WHERE ("sp"."relation_type" = 'primary'::"public"."supplier_product_relation_type")
        ), "tasks" AS (
         SELECT "p"."org_id",
            'products_without_primary_supplier'::"text" AS "task_key",
            'Productos sin proveedor primario'::"text" AS "task_label",
            "count"(*) AS "pending_count"
           FROM ("public"."products" "p"
             LEFT JOIN "product_primary" "pp" ON ((("pp"."org_id" = "p"."org_id") AND ("pp"."product_id" = "p"."id"))))
          WHERE (("p"."is_active" = true) AND ("pp"."product_id" IS NULL))
          GROUP BY "p"."org_id"
        UNION ALL
         SELECT "p"."org_id",
            'products_without_shelf_life'::"text" AS "task_key",
            'Productos sin vencimiento aproximado (dias)'::"text" AS "task_label",
            "count"(*) AS "pending_count"
           FROM "public"."products" "p"
          WHERE (("p"."is_active" = true) AND ("p"."shelf_life_days" IS NULL))
          GROUP BY "p"."org_id"
        UNION ALL
         SELECT "p"."org_id",
            'products_without_identifier'::"text" AS "task_key",
            'Productos sin barcode ni codigo interno'::"text" AS "task_label",
            "count"(*) AS "pending_count"
           FROM "public"."products" "p"
          WHERE (("p"."is_active" = true) AND (NULLIF(TRIM(BOTH FROM COALESCE("p"."barcode", ''::"text")), ''::"text") IS NULL) AND (NULLIF(TRIM(BOTH FROM COALESCE("p"."internal_code", ''::"text")), ''::"text") IS NULL))
          GROUP BY "p"."org_id"
        UNION ALL
         SELECT "s"."org_id",
            'suppliers_without_payment_terms'::"text" AS "task_key",
            'Proveedores sin plazo de pago'::"text" AS "task_label",
            "count"(*) AS "pending_count"
           FROM "public"."suppliers" "s"
          WHERE (("s"."is_active" = true) AND ("s"."payment_terms_days" IS NULL))
          GROUP BY "s"."org_id"
        UNION ALL
         SELECT "s"."org_id",
            'suppliers_without_preferred_payment_method'::"text" AS "task_key",
            'Proveedores sin metodo de pago preferido'::"text" AS "task_label",
            "count"(*) AS "pending_count"
           FROM "public"."suppliers" "s"
          WHERE (("s"."is_active" = true) AND ("s"."preferred_payment_method" IS NULL))
          GROUP BY "s"."org_id"
        )
 SELECT "org_id",
    "task_key",
    "task_label",
    "pending_count",
    "now"() AS "last_calculated_at"
   FROM "tasks" "t";


ALTER VIEW "public"."v_data_onboarding_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expiration_batch_detail" AS
 SELECT "eb"."id" AS "batch_id",
    "eb"."org_id",
    "eb"."branch_id",
    "b"."name" AS "branch_name",
    "eb"."product_id",
    "p"."name" AS "product_name",
    "eb"."expires_on",
    ("eb"."expires_on" - CURRENT_DATE) AS "days_left",
    "eb"."quantity",
    "eb"."batch_code",
    "eb"."source_type",
    "eb"."source_ref_id",
    "eb"."created_at"
   FROM (("public"."expiration_batches" "eb"
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "eb"."product_id") AND ("p"."org_id" = "eb"."org_id"))))
     LEFT JOIN "public"."branches" "b" ON ((("b"."id" = "eb"."branch_id") AND ("b"."org_id" = "eb"."org_id"))));


ALTER VIEW "public"."v_expiration_batch_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expiration_waste_detail" AS
 SELECT "ew"."id" AS "waste_id",
    "ew"."org_id",
    "ew"."branch_id",
    "b"."name" AS "branch_name",
    "ew"."product_id",
    "p"."name" AS "product_name",
    "ew"."quantity",
    "ew"."unit_price_snapshot",
    "ew"."total_amount",
    "ew"."created_at"
   FROM (("public"."expiration_waste" "ew"
     JOIN "public"."products" "p" ON ((("p"."id" = "ew"."product_id") AND ("p"."org_id" = "ew"."org_id"))))
     JOIN "public"."branches" "b" ON ((("b"."id" = "ew"."branch_id") AND ("b"."org_id" = "ew"."org_id"))));


ALTER VIEW "public"."v_expiration_waste_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expiration_waste_summary" AS
 SELECT "org_id",
    "branch_id",
    "sum"("total_amount") AS "total_amount",
    "sum"("quantity") AS "total_quantity",
    "max"("created_at") AS "last_created_at"
   FROM "public"."expiration_waste"
  GROUP BY "org_id", "branch_id";


ALTER VIEW "public"."v_expiration_waste_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expirations_due" AS
 SELECT "eb"."id" AS "batch_id",
    "eb"."org_id",
    "eb"."branch_id",
    "b"."name" AS "branch_name",
    "eb"."product_id",
    "p"."name" AS "product_name",
    "eb"."expires_on",
    ("eb"."expires_on" - CURRENT_DATE) AS "days_left",
    "eb"."quantity",
    "eb"."batch_code",
    "p"."unit_price",
    ("eb"."quantity" * COALESCE("p"."unit_price", (0)::numeric)) AS "total_value",
    "op"."critical_days",
    "op"."warning_days",
        CASE
            WHEN (("eb"."expires_on" - CURRENT_DATE) <= "op"."critical_days") THEN 'critical'::"text"
            WHEN (("eb"."expires_on" - CURRENT_DATE) <= "op"."warning_days") THEN 'warning'::"text"
            ELSE 'info'::"text"
        END AS "severity"
   FROM ((("public"."expiration_batches" "eb"
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "eb"."product_id") AND ("p"."org_id" = "eb"."org_id"))))
     LEFT JOIN "public"."branches" "b" ON ((("b"."id" = "eb"."branch_id") AND ("b"."org_id" = "eb"."org_id"))))
     LEFT JOIN "public"."org_preferences" "op" ON (("op"."org_id" = "eb"."org_id")))
  WHERE ("eb"."quantity" > (0)::numeric);


ALTER VIEW "public"."v_expirations_due" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_expirations_expired" AS
 SELECT "eb"."id" AS "batch_id",
    "eb"."org_id",
    "eb"."branch_id",
    "b"."name" AS "branch_name",
    "eb"."product_id",
    "p"."name" AS "product_name",
    "eb"."expires_on",
    (CURRENT_DATE - "eb"."expires_on") AS "days_expired",
    "eb"."quantity",
    "eb"."batch_code",
    "p"."unit_price",
    ("eb"."quantity" * COALESCE("p"."unit_price", (0)::numeric)) AS "total_value"
   FROM (("public"."expiration_batches" "eb"
     JOIN "public"."products" "p" ON ((("p"."id" = "eb"."product_id") AND ("p"."org_id" = "eb"."org_id"))))
     JOIN "public"."branches" "b" ON ((("b"."id" = "eb"."branch_id") AND ("b"."org_id" = "eb"."org_id"))))
  WHERE (("eb"."quantity" > (0)::numeric) AND ("eb"."expires_on" < CURRENT_DATE));


ALTER VIEW "public"."v_expirations_expired" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_online_orders_admin" AS
 SELECT "oo"."id" AS "online_order_id",
    "oo"."org_id",
    "oo"."branch_id",
    "b"."name" AS "branch_name",
    "oo"."order_code",
    "oo"."status",
    "oo"."customer_name",
    "oo"."customer_phone",
    "oo"."customer_notes",
    "oo"."staff_notes",
    "oo"."payment_intent",
    "oo"."subtotal_amount",
    "oo"."total_amount",
    "oo"."confirmed_at",
    "oo"."ready_for_pickup_at",
    "oo"."delivered_at",
    "oo"."cancelled_at",
    "oo"."created_at",
    "oo"."updated_at",
    ( SELECT "ott"."token"
           FROM "public"."online_order_tracking_tokens" "ott"
          WHERE (("ott"."online_order_id" = "oo"."id") AND ("ott"."is_active" = true))
          ORDER BY "ott"."created_at" DESC
         LIMIT 1) AS "tracking_token",
    (EXISTS ( SELECT 1
           FROM "public"."online_order_payment_proofs" "opp"
          WHERE ("opp"."online_order_id" = "oo"."id"))) AS "has_payment_proof",
    ( SELECT "opp"."review_status"
           FROM "public"."online_order_payment_proofs" "opp"
          WHERE ("opp"."online_order_id" = "oo"."id")
          ORDER BY "opp"."uploaded_at" DESC
         LIMIT 1) AS "payment_proof_review_status",
    "oo"."customer_address"
   FROM ("public"."online_orders" "oo"
     JOIN "public"."branches" "b" ON (("b"."id" = "oo"."branch_id")));


ALTER VIEW "public"."v_online_orders_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_order_detail_admin" AS
 SELECT "so"."id" AS "order_id",
    "so"."org_id",
    "so"."status",
    "so"."notes",
    "so"."supplier_id",
    "s"."name" AS "supplier_name",
    "so"."branch_id",
    "b"."name" AS "branch_name",
    "so"."created_at",
    "so"."sent_at",
    "so"."received_at",
    "so"."reconciled_at",
    "so"."expected_receive_on",
    "so"."controlled_by_user_id",
    "so"."controlled_by_name",
    "ou"."display_name" AS "controlled_by_user_name",
    "soi"."id" AS "order_item_id",
    "soi"."product_id",
    "p"."name" AS "product_name",
    "p"."purchase_by_pack",
    "p"."units_per_pack",
    "soi"."ordered_qty",
    "soi"."received_qty",
    "soi"."unit_cost",
    ("soi"."received_qty" - "soi"."ordered_qty") AS "diff_qty"
   FROM ((((("public"."supplier_orders" "so"
     LEFT JOIN "public"."suppliers" "s" ON ((("s"."id" = "so"."supplier_id") AND ("s"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."branches" "b" ON ((("b"."id" = "so"."branch_id") AND ("b"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."org_users" "ou" ON ((("ou"."user_id" = "so"."controlled_by_user_id") AND ("ou"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."supplier_order_items" "soi" ON ((("soi"."order_id" = "so"."id") AND ("soi"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "soi"."product_id") AND ("p"."org_id" = "so"."org_id"))));


ALTER VIEW "public"."v_order_detail_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_orders_admin" AS
 SELECT "so"."id" AS "order_id",
    "so"."org_id",
    "so"."branch_id",
    "b"."name" AS "branch_name",
    "so"."supplier_id",
    "s"."name" AS "supplier_name",
    "so"."status",
    "so"."created_at",
    "so"."sent_at",
    "so"."received_at",
    "so"."reconciled_at",
    "so"."expected_receive_on",
    COALESCE("items"."items_count", (0)::bigint) AS "items_count",
    "sp"."id" AS "payable_id",
    "sp"."status" AS "payable_status",
        CASE
            WHEN ("sp"."id" IS NULL) THEN 'not_created'::"text"
            WHEN (("sp"."status" <> 'paid'::"text") AND ("sp"."due_on" IS NOT NULL) AND ("sp"."due_on" < CURRENT_DATE)) THEN 'overdue'::"text"
            ELSE "sp"."status"
        END AS "payment_state",
    "sp"."due_on" AS "payable_due_on",
    "sp"."outstanding_amount" AS "payable_outstanding_amount",
    "so"."is_archived"
   FROM (((("public"."supplier_orders" "so"
     LEFT JOIN "public"."suppliers" "s" ON ((("s"."id" = "so"."supplier_id") AND ("s"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."branches" "b" ON ((("b"."id" = "so"."branch_id") AND ("b"."org_id" = "so"."org_id"))))
     LEFT JOIN ( SELECT "supplier_order_items"."order_id",
            "count"(*) AS "items_count"
           FROM "public"."supplier_order_items"
          GROUP BY "supplier_order_items"."order_id") "items" ON (("items"."order_id" = "so"."id")))
     LEFT JOIN "public"."supplier_payables" "sp" ON ((("sp"."order_id" = "so"."id") AND ("sp"."org_id" = "so"."org_id"))));


ALTER VIEW "public"."v_orders_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_pos_product_catalog" AS
 SELECT "p"."id" AS "product_id",
    "p"."org_id",
    "p"."name",
    "p"."internal_code",
    "p"."barcode",
    "p"."sell_unit_type",
    "p"."uom",
    "p"."unit_price",
    "p"."is_active",
    "b"."id" AS "branch_id",
    COALESCE("si"."quantity_on_hand", (0)::numeric) AS "stock_on_hand"
   FROM (("public"."products" "p"
     JOIN "public"."branches" "b" ON ((("b"."org_id" = "p"."org_id") AND ("b"."is_active" = true))))
     LEFT JOIN "public"."stock_items" "si" ON ((("si"."product_id" = "p"."id") AND ("si"."org_id" = "p"."org_id") AND ("si"."branch_id" = "b"."id"))));


ALTER VIEW "public"."v_pos_product_catalog" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_products_admin" AS
SELECT
    NULL::"uuid" AS "product_id",
    NULL::"uuid" AS "org_id",
    NULL::"text" AS "name",
    NULL::"text" AS "brand",
    NULL::"text" AS "internal_code",
    NULL::"text" AS "barcode",
    NULL::boolean AS "purchase_by_pack",
    NULL::integer AS "units_per_pack",
    NULL::"public"."sell_unit_type" AS "sell_unit_type",
    NULL::"text" AS "uom",
    NULL::numeric(12,2) AS "unit_price",
    NULL::"text" AS "image_url",
    NULL::boolean AS "is_active",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::numeric AS "stock_total",
    NULL::"jsonb" AS "stock_by_branch",
    NULL::integer AS "shelf_life_days";


ALTER VIEW "public"."v_products_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_products_incomplete_admin" WITH ("security_invoker"='true') AS
 WITH "primary_relation" AS (
         SELECT "sp"."org_id",
            "sp"."product_id",
            "bool_or"(("sp"."relation_type" = 'primary'::"public"."supplier_product_relation_type")) AS "has_primary_supplier"
           FROM "public"."supplier_products" "sp"
          GROUP BY "sp"."org_id", "sp"."product_id"
        )
 SELECT "p"."org_id",
    "p"."id",
    "p"."name",
    "p"."brand",
    "p"."internal_code",
    "p"."barcode",
    "p"."purchase_by_pack",
    "p"."units_per_pack",
    "p"."sell_unit_type",
    "p"."uom",
    "p"."unit_price",
    "p"."shelf_life_days",
    COALESCE("pr"."has_primary_supplier", false) AS "has_primary_supplier",
    (COALESCE("pr"."has_primary_supplier", false) = false) AS "missing_primary_supplier",
    ("p"."shelf_life_days" IS NULL) AS "missing_shelf_life",
    ((NULLIF(TRIM(BOTH FROM COALESCE("p"."barcode", ''::"text")), ''::"text") IS NULL) AND (NULLIF(TRIM(BOTH FROM COALESCE("p"."internal_code", ''::"text")), ''::"text") IS NULL)) AS "missing_identifier"
   FROM ("public"."products" "p"
     LEFT JOIN "primary_relation" "pr" ON ((("pr"."org_id" = "p"."org_id") AND ("pr"."product_id" = "p"."id"))))
  WHERE (("p"."is_active" = true) AND ((COALESCE("pr"."has_primary_supplier", false) = false) OR ("p"."shelf_life_days" IS NULL) OR ((NULLIF(TRIM(BOTH FROM COALESCE("p"."barcode", ''::"text")), ''::"text") IS NULL) AND (NULLIF(TRIM(BOTH FROM COALESCE("p"."internal_code", ''::"text")), ''::"text") IS NULL))));


ALTER VIEW "public"."v_products_incomplete_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_products_typeahead_admin" AS
 SELECT "id" AS "product_id",
    "org_id",
    "name",
    "is_active"
   FROM "public"."products" "p";


ALTER VIEW "public"."v_products_typeahead_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sale_detail_admin" WITH ("security_invoker"='true') AS
 WITH "items_by_sale" AS (
         SELECT "si"."sale_id",
            "jsonb_agg"("jsonb_build_object"('sale_item_id', "si"."id", 'product_id', "si"."product_id", 'product_name', "si"."product_name_snapshot", 'unit_price', "si"."unit_price_snapshot", 'quantity', "si"."quantity", 'line_total', "si"."line_total") ORDER BY "si"."product_name_snapshot") AS "items"
           FROM "public"."sale_items" "si"
          GROUP BY "si"."sale_id"
        ), "payments_by_sale" AS (
         SELECT "sp"."sale_id",
            "jsonb_agg"("jsonb_build_object"('sale_payment_id', "sp"."id", 'payment_method', "sp"."payment_method", 'amount', "sp"."amount", 'payment_device_id', "sp"."payment_device_id", 'payment_device_name', "ppd"."device_name", 'payment_device_provider', "ppd"."provider", 'created_at', "sp"."created_at") ORDER BY "sp"."created_at", "sp"."id") AS "payments"
           FROM ("public"."sale_payments" "sp"
             LEFT JOIN "public"."pos_payment_devices" "ppd" ON ((("ppd"."id" = "sp"."payment_device_id") AND ("ppd"."org_id" = "sp"."org_id"))))
          GROUP BY "sp"."sale_id"
        ), "creator_names" AS (
         SELECT "ou"."org_id",
            "ou"."user_id",
            COALESCE(NULLIF(TRIM(BOTH FROM "ou"."display_name"), ''::"text"), ("ou"."user_id")::"text") AS "creator_name"
           FROM "public"."org_users" "ou"
        )
 SELECT "s"."id" AS "sale_id",
    "s"."org_id",
    "s"."branch_id",
    "b"."name" AS "branch_name",
    "s"."created_at",
    "s"."created_by",
    COALESCE("cn"."creator_name", ("s"."created_by")::"text") AS "created_by_name",
    "s"."payment_method" AS "payment_method_summary",
    "s"."subtotal_amount",
    "s"."discount_amount",
    "s"."discount_pct",
    "s"."total_amount",
    COALESCE("ibs"."items", '[]'::"jsonb") AS "items",
    COALESCE("pbs"."payments", '[]'::"jsonb") AS "payments",
    "s"."employee_account_id",
    "s"."employee_name_snapshot",
    "s"."cash_discount_amount",
    "s"."cash_discount_pct",
    "s"."employee_discount_applied",
    "s"."employee_discount_amount",
    "s"."employee_discount_pct",
    "s"."is_invoiced",
    "s"."invoiced_at",
    "s"."client_id",
    "c"."name" AS "client_name",
    "c"."phone" AS "client_phone"
   FROM ((((("public"."sales" "s"
     JOIN "public"."branches" "b" ON ((("b"."id" = "s"."branch_id") AND ("b"."org_id" = "s"."org_id"))))
     LEFT JOIN "public"."clients" "c" ON ((("c"."id" = "s"."client_id") AND ("c"."org_id" = "s"."org_id"))))
     LEFT JOIN "items_by_sale" "ibs" ON (("ibs"."sale_id" = "s"."id")))
     LEFT JOIN "payments_by_sale" "pbs" ON (("pbs"."sale_id" = "s"."id")))
     LEFT JOIN "creator_names" "cn" ON ((("cn"."org_id" = "s"."org_id") AND ("cn"."user_id" = "s"."created_by"))));


ALTER VIEW "public"."v_sale_detail_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sale_fiscal_invoice_admin" WITH ("security_invoker"='true') AS
 SELECT "i"."sale_id",
    "i"."tenant_id" AS "org_id",
    "i"."id" AS "invoice_id",
    "i"."invoice_job_id",
    "i"."environment",
    "i"."pto_vta",
    "i"."cbte_tipo",
    "i"."cbte_nro",
    "i"."doc_tipo",
    "i"."doc_nro",
    "i"."currency",
    "i"."currency_rate",
    "i"."imp_total",
    "i"."cae",
    "i"."cae_expires_at",
    "i"."result_status",
    "i"."qr_payload_json",
    "i"."pdf_storage_path",
    "i"."ticket_storage_path",
    "ij"."job_status" AS "render_status",
    "i"."created_at",
    "i"."updated_at"
   FROM ("public"."invoices" "i"
     JOIN "public"."invoice_jobs" "ij" ON (("ij"."id" = "i"."invoice_job_id")));


ALTER VIEW "public"."v_sale_fiscal_invoice_admin" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_sale_fiscal_invoice_admin" IS 'Lectura admin de la factura fiscal vinculada a una venta, incluyendo estado de render y rutas derivadas.';



CREATE OR REPLACE VIEW "public"."v_sales_admin" WITH ("security_invoker"='true') AS
 WITH "payment_totals" AS (
         SELECT "sp"."sale_id",
            (COALESCE("sum"("sp"."amount") FILTER (WHERE ("sp"."payment_method" = 'cash'::"public"."payment_method")), (0)::numeric))::numeric(12,2) AS "cash_amount",
            (COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" = ANY (ARRAY['card'::"text", 'debit'::"text", 'credit'::"text"]))), (0)::numeric))::numeric(12,2) AS "card_amount",
            (COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" = 'mercadopago'::"text")), (0)::numeric))::numeric(12,2) AS "mercadopago_amount",
            (COALESCE("sum"("sp"."amount") FILTER (WHERE (("sp"."payment_method")::"text" <> ALL (ARRAY['cash'::"text", 'card'::"text", 'debit'::"text", 'credit'::"text", 'mercadopago'::"text"]))), (0)::numeric))::numeric(12,2) AS "other_amount",
            "array_agg"(DISTINCT ("sp"."payment_method")::"text" ORDER BY ("sp"."payment_method")::"text") AS "payment_methods"
           FROM "public"."sale_payments" "sp"
          GROUP BY "sp"."sale_id"
        ), "item_totals" AS (
         SELECT "si"."sale_id",
            ("count"(*))::integer AS "items_count",
            (COALESCE("sum"("si"."quantity"), (0)::numeric))::numeric(14,3) AS "items_qty_total",
            "string_agg"(DISTINCT "si"."product_name_snapshot", ', '::"text" ORDER BY "si"."product_name_snapshot") AS "item_names_summary",
            "lower"("string_agg"(DISTINCT "si"."product_name_snapshot", ' '::"text" ORDER BY "si"."product_name_snapshot")) AS "item_names_search"
           FROM "public"."sale_items" "si"
          GROUP BY "si"."sale_id"
        ), "creator_names" AS (
         SELECT "ou"."org_id",
            "ou"."user_id",
            COALESCE(NULLIF(TRIM(BOTH FROM "ou"."display_name"), ''::"text"), ("ou"."user_id")::"text") AS "creator_name"
           FROM "public"."org_users" "ou"
        )
 SELECT "s"."id" AS "sale_id",
    "s"."org_id",
    "s"."branch_id",
    "b"."name" AS "branch_name",
    "s"."created_at",
    "s"."created_by",
    COALESCE("cn"."creator_name", ("s"."created_by")::"text") AS "created_by_name",
    "s"."payment_method" AS "payment_method_summary",
    "s"."subtotal_amount",
    "s"."discount_amount",
    "s"."discount_pct",
    "s"."total_amount",
    COALESCE("it"."items_count", 0) AS "items_count",
    (COALESCE("it"."items_qty_total", (0)::numeric))::numeric(14,3) AS "items_qty_total",
    COALESCE("it"."item_names_summary", ''::"text") AS "item_names_summary",
    COALESCE("it"."item_names_search", ''::"text") AS "item_names_search",
    COALESCE("pt"."payment_methods", ARRAY[]::"text"[]) AS "payment_methods",
    (COALESCE("pt"."cash_amount", (0)::numeric))::numeric(12,2) AS "cash_amount",
    (COALESCE("pt"."card_amount", (0)::numeric))::numeric(12,2) AS "card_amount",
    (COALESCE("pt"."mercadopago_amount", (0)::numeric))::numeric(12,2) AS "mercadopago_amount",
    (COALESCE("pt"."other_amount", (0)::numeric))::numeric(12,2) AS "other_amount",
    "s"."employee_account_id",
    "s"."employee_name_snapshot",
    "s"."cash_discount_amount",
    "s"."cash_discount_pct",
    "s"."employee_discount_applied",
    "s"."employee_discount_amount",
    "s"."employee_discount_pct",
    "s"."is_invoiced",
    "s"."invoiced_at",
    "s"."client_id",
    "c"."name" AS "client_name",
    "c"."phone" AS "client_phone"
   FROM ((((("public"."sales" "s"
     JOIN "public"."branches" "b" ON ((("b"."id" = "s"."branch_id") AND ("b"."org_id" = "s"."org_id"))))
     LEFT JOIN "public"."clients" "c" ON ((("c"."id" = "s"."client_id") AND ("c"."org_id" = "s"."org_id"))))
     LEFT JOIN "payment_totals" "pt" ON (("pt"."sale_id" = "s"."id")))
     LEFT JOIN "item_totals" "it" ON (("it"."sale_id" = "s"."id")))
     LEFT JOIN "creator_names" "cn" ON ((("cn"."org_id" = "s"."org_id") AND ("cn"."user_id" = "s"."created_by"))));


ALTER VIEW "public"."v_sales_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sales_statistics_items" WITH ("security_invoker"='true') AS
 SELECT "s"."id" AS "sale_id",
    "s"."org_id",
    "s"."branch_id",
    "b"."name" AS "branch_name",
    "s"."created_at",
    "si"."product_id",
    "si"."product_name_snapshot" AS "product_name",
    "si"."quantity",
    "si"."unit_price_snapshot" AS "unit_price",
    "si"."line_total",
    "sp"."supplier_id",
    "sup"."name" AS "supplier_name"
   FROM (((("public"."sales" "s"
     JOIN "public"."branches" "b" ON ((("b"."id" = "s"."branch_id") AND ("b"."org_id" = "s"."org_id"))))
     JOIN "public"."sale_items" "si" ON ((("si"."sale_id" = "s"."id") AND ("si"."org_id" = "s"."org_id"))))
     LEFT JOIN "public"."supplier_products" "sp" ON ((("sp"."org_id" = "s"."org_id") AND ("sp"."product_id" = "si"."product_id") AND ("sp"."relation_type" = 'primary'::"public"."supplier_product_relation_type"))))
     LEFT JOIN "public"."suppliers" "sup" ON ((("sup"."id" = "sp"."supplier_id") AND ("sup"."org_id" = "s"."org_id"))));


ALTER VIEW "public"."v_sales_statistics_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_settings_users_admin" AS
 SELECT "ou"."org_id",
    "ou"."user_id",
    "au"."email",
    "ou"."display_name",
    "ou"."role",
    "ou"."is_active",
    "ou"."created_at",
    "array_remove"("array_agg"("bm"."branch_id"), NULL::"uuid") AS "branch_ids"
   FROM (("public"."org_users" "ou"
     LEFT JOIN "auth"."users" "au" ON (("au"."id" = "ou"."user_id")))
     LEFT JOIN "public"."branch_memberships" "bm" ON ((("bm"."user_id" = "ou"."user_id") AND ("bm"."org_id" = "ou"."org_id") AND ("bm"."is_active" = true))))
  GROUP BY "ou"."org_id", "ou"."user_id", "au"."email", "ou"."display_name", "ou"."role", "ou"."is_active", "ou"."created_at";


ALTER VIEW "public"."v_settings_users_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_special_order_items_pending" AS
 SELECT "soi"."id" AS "item_id",
    "soi"."org_id",
    "so"."id" AS "special_order_id",
    "so"."status" AS "special_order_status",
    "so"."branch_id",
    "c"."id" AS "client_id",
    "c"."name" AS "client_name",
    "soi"."product_id",
    "p"."name" AS "product_name",
    COALESCE("soi"."supplier_id", "sp"."supplier_id") AS "supplier_id",
    "sup"."name" AS "supplier_name",
    "soi"."requested_qty",
    "soi"."fulfilled_qty",
    ("soi"."requested_qty" - "soi"."fulfilled_qty") AS "remaining_qty",
    "soi"."is_ordered",
    "soi"."ordered_at"
   FROM ((((("public"."client_special_order_items" "soi"
     LEFT JOIN "public"."client_special_orders" "so" ON ((("so"."id" = "soi"."special_order_id") AND ("so"."org_id" = "soi"."org_id"))))
     LEFT JOIN "public"."clients" "c" ON ((("c"."id" = "so"."client_id") AND ("c"."org_id" = "so"."org_id"))))
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "soi"."product_id") AND ("p"."org_id" = "soi"."org_id"))))
     LEFT JOIN "public"."supplier_products" "sp" ON ((("sp"."product_id" = "soi"."product_id") AND ("sp"."org_id" = "soi"."org_id") AND ("sp"."relation_type" = 'primary'::"public"."supplier_product_relation_type"))))
     LEFT JOIN "public"."suppliers" "sup" ON ((("sup"."id" = COALESCE("soi"."supplier_id", "sp"."supplier_id")) AND ("sup"."org_id" = "soi"."org_id"))))
  WHERE (("so"."status" = ANY (ARRAY['pending'::"public"."special_order_status", 'ordered'::"public"."special_order_status", 'partial'::"public"."special_order_status"])) AND (("soi"."requested_qty" - "soi"."fulfilled_qty") > (0)::numeric));


ALTER VIEW "public"."v_special_order_items_pending" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_staff_effective_modules" AS
 WITH "memberships" AS (
         SELECT "bm"."org_id",
            "bm"."branch_id"
           FROM "public"."branch_memberships" "bm"
          WHERE (("bm"."user_id" = "auth"."uid"()) AND ("bm"."is_active" = true))
        ), "module_keys" AS (
         SELECT "sma"."org_id",
            "sma"."branch_id",
            "sma"."module_key",
            "sma"."is_enabled"
           FROM "public"."staff_module_access" "sma"
          WHERE ("sma"."role" = 'staff'::"public"."user_role")
        ), "resolved" AS (
         SELECT "m"."org_id",
            "m"."branch_id",
            "mk"."module_key",
                CASE
                    WHEN ("bo"."module_key" IS NOT NULL) THEN "bo"."is_enabled"
                    WHEN ("od"."module_key" IS NOT NULL) THEN "od"."is_enabled"
                    ELSE false
                END AS "is_enabled",
                CASE
                    WHEN ("bo"."module_key" IS NOT NULL) THEN 'branch_override'::"text"
                    WHEN ("od"."module_key" IS NOT NULL) THEN 'org_default'::"text"
                    ELSE 'none'::"text"
                END AS "source_scope"
           FROM ((("memberships" "m"
             JOIN ( SELECT DISTINCT "module_keys"."org_id",
                    "module_keys"."module_key"
                   FROM "module_keys") "mk" ON (("mk"."org_id" = "m"."org_id")))
             LEFT JOIN "module_keys" "od" ON ((("od"."org_id" = "m"."org_id") AND ("od"."branch_id" IS NULL) AND ("od"."module_key" = "mk"."module_key"))))
             LEFT JOIN "module_keys" "bo" ON ((("bo"."org_id" = "m"."org_id") AND ("bo"."branch_id" = "m"."branch_id") AND ("bo"."module_key" = "mk"."module_key"))))
        )
 SELECT "org_id",
    "branch_id",
    "module_key",
    "is_enabled",
    "source_scope"
   FROM "resolved";


ALTER VIEW "public"."v_staff_effective_modules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_stock_by_branch" AS
 SELECT "org_id",
    "branch_id",
    "product_id",
    "quantity_on_hand",
    "updated_at"
   FROM "public"."stock_items" "si";


ALTER VIEW "public"."v_stock_by_branch" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_superadmin_org_detail" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "org_id",
    "o"."name" AS "org_name",
    "o"."timezone",
    "o"."is_active" AS "org_is_active",
    "b"."id" AS "branch_id",
    "b"."name" AS "branch_name",
    "b"."address" AS "branch_address",
    "b"."is_active" AS "branch_is_active",
    "b"."created_at" AS "branch_created_at",
    "ou"."user_id",
    "ou"."display_name",
    "ou"."role",
    "ou"."is_active" AS "user_is_active",
    "ou"."created_at" AS "user_created_at"
   FROM (("public"."orgs" "o"
     LEFT JOIN "public"."branches" "b" ON (("b"."org_id" = "o"."id")))
     LEFT JOIN "public"."org_users" "ou" ON (("ou"."org_id" = "o"."id")));


ALTER VIEW "public"."v_superadmin_org_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_superadmin_orgs" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "org_id",
    "o"."name" AS "org_name",
    "o"."timezone",
    "o"."is_active",
    "o"."created_at",
    "count"(DISTINCT "b"."id") FILTER (WHERE "b"."is_active") AS "branches_count",
    "count"(DISTINCT "ou"."user_id") FILTER (WHERE "ou"."is_active") AS "users_count"
   FROM (("public"."orgs" "o"
     LEFT JOIN "public"."branches" "b" ON (("b"."org_id" = "o"."id")))
     LEFT JOIN "public"."org_users" "ou" ON (("ou"."org_id" = "o"."id")))
  GROUP BY "o"."id", "o"."name", "o"."timezone", "o"."is_active", "o"."created_at";


ALTER VIEW "public"."v_superadmin_orgs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_supplier_detail_admin" AS
 SELECT "s"."id" AS "supplier_id",
    "s"."org_id",
    "s"."name",
    "s"."contact_name",
    "s"."phone",
    "s"."email",
    "s"."notes",
    "s"."is_active",
    "s"."created_at",
    "s"."updated_at",
    "sp"."product_id",
    "p"."name" AS "product_name",
    "p"."is_active" AS "product_is_active",
    "p"."barcode",
    "p"."internal_code",
    "sp"."supplier_price",
    "sp"."supplier_sku",
    "sp"."supplier_product_name",
    "sp"."relation_type",
    "s"."order_frequency",
    "s"."order_day",
    "s"."receive_day",
    "s"."payment_terms_days",
    "s"."preferred_payment_method",
    "s"."accepts_cash",
    "s"."accepts_transfer",
    "s"."payment_note",
    "s"."default_markup_pct"
   FROM (("public"."suppliers" "s"
     LEFT JOIN "public"."supplier_products" "sp" ON ((("sp"."supplier_id" = "s"."id") AND ("sp"."org_id" = "s"."org_id"))))
     LEFT JOIN "public"."products" "p" ON ((("p"."id" = "sp"."product_id") AND ("p"."org_id" = "s"."org_id"))));


ALTER VIEW "public"."v_supplier_detail_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_supplier_payables_admin" AS
 SELECT "sp"."id" AS "payable_id",
    "sp"."org_id",
    "sp"."branch_id",
    "b"."name" AS "branch_name",
    "sp"."supplier_id",
    "s"."name" AS "supplier_name",
    "sp"."order_id",
    "so"."status" AS "order_status",
    "sp"."status" AS "payable_status",
        CASE
            WHEN (("sp"."status" <> 'paid'::"text") AND ("sp"."due_on" IS NOT NULL) AND ("sp"."due_on" < CURRENT_DATE)) THEN 'overdue'::"text"
            ELSE "sp"."status"
        END AS "payment_state",
    "sp"."estimated_amount",
    "sp"."invoice_amount",
    "sp"."paid_amount",
    "sp"."outstanding_amount",
    "sp"."due_on",
        CASE
            WHEN ("sp"."due_on" IS NULL) THEN NULL::integer
            ELSE ("sp"."due_on" - CURRENT_DATE)
        END AS "due_in_days",
    (("sp"."status" <> 'paid'::"text") AND ("sp"."due_on" IS NOT NULL) AND ("sp"."due_on" < CURRENT_DATE)) AS "is_overdue",
    "sp"."payment_terms_days_snapshot",
    "sp"."preferred_payment_method",
    "sp"."selected_payment_method",
    "sp"."invoice_reference",
    "sp"."invoice_photo_url",
    "sp"."invoice_note",
    "sp"."paid_at",
    "sp"."created_at",
    "sp"."updated_at"
   FROM ((("public"."supplier_payables" "sp"
     JOIN "public"."supplier_orders" "so" ON ((("so"."id" = "sp"."order_id") AND ("so"."org_id" = "sp"."org_id"))))
     JOIN "public"."suppliers" "s" ON ((("s"."id" = "sp"."supplier_id") AND ("s"."org_id" = "sp"."org_id"))))
     JOIN "public"."branches" "b" ON ((("b"."id" = "sp"."branch_id") AND ("b"."org_id" = "sp"."org_id"))));


ALTER VIEW "public"."v_supplier_payables_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_supplier_product_suggestions" AS
 WITH "sales_30d" AS (
         SELECT "si_1"."org_id",
            "s_1"."branch_id",
            "si_1"."product_id",
            "sum"("si_1"."quantity") AS "total_qty"
           FROM ("public"."sale_items" "si_1"
             JOIN "public"."sales" "s_1" ON ((("s_1"."id" = "si_1"."sale_id") AND ("s_1"."org_id" = "si_1"."org_id"))))
          WHERE ("s_1"."created_at" >= ("now"() - '30 days'::interval))
          GROUP BY "si_1"."org_id", "s_1"."branch_id", "si_1"."product_id"
        ), "cycle_days" AS (
         SELECT "s_1"."id" AS "supplier_id",
                CASE "s_1"."order_frequency"
                    WHEN 'weekly'::"public"."order_frequency" THEN 7
                    WHEN 'biweekly'::"public"."order_frequency" THEN 14
                    WHEN 'every_3_weeks'::"public"."order_frequency" THEN 21
                    WHEN 'monthly'::"public"."order_frequency" THEN 30
                    ELSE 30
                END AS "days"
           FROM "public"."suppliers" "s_1"
        )
 SELECT "sp"."org_id",
    "sp"."supplier_id",
    "b"."id" AS "branch_id",
    "sp"."product_id",
    "p"."name" AS "product_name",
    "p"."purchase_by_pack",
    "p"."units_per_pack",
    "sp"."relation_type",
    COALESCE("si"."quantity_on_hand", (0)::numeric) AS "stock_on_hand",
    COALESCE("si"."safety_stock", (0)::numeric) AS "safety_stock",
    (COALESCE("s30"."total_qty", (0)::numeric) / 30.0) AS "avg_daily_sales_30d",
    "cd"."days" AS "cycle_days",
    GREATEST((0)::numeric, ((((COALESCE("s30"."total_qty", (0)::numeric) / 30.0) * ("cd"."days")::numeric) + COALESCE("si"."safety_stock", (0)::numeric)) - COALESCE("si"."quantity_on_hand", (0)::numeric))) AS "suggested_qty"
   FROM (((((("public"."supplier_products" "sp"
     JOIN "public"."products" "p" ON ((("p"."id" = "sp"."product_id") AND ("p"."org_id" = "sp"."org_id"))))
     JOIN "public"."suppliers" "s" ON ((("s"."id" = "sp"."supplier_id") AND ("s"."org_id" = "sp"."org_id"))))
     JOIN "public"."branches" "b" ON ((("b"."org_id" = "sp"."org_id") AND ("b"."is_active" = true))))
     LEFT JOIN "public"."stock_items" "si" ON ((("si"."org_id" = "sp"."org_id") AND ("si"."product_id" = "sp"."product_id") AND ("si"."branch_id" = "b"."id"))))
     LEFT JOIN "sales_30d" "s30" ON ((("s30"."org_id" = "sp"."org_id") AND ("s30"."product_id" = "sp"."product_id") AND ("s30"."branch_id" = "b"."id"))))
     LEFT JOIN "cycle_days" "cd" ON (("cd"."supplier_id" = "sp"."supplier_id")))
  WHERE ("p"."is_active" = true);


ALTER VIEW "public"."v_supplier_product_suggestions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_suppliers_admin" AS
 SELECT "s"."id" AS "supplier_id",
    "s"."org_id",
    "s"."name",
    "s"."contact_name",
    "s"."phone",
    "s"."email",
    "s"."notes",
    "s"."is_active",
    "s"."created_at",
    "s"."updated_at",
    COALESCE("sp_count"."products_count", (0)::bigint) AS "products_count",
    "s"."order_frequency",
    "s"."order_day",
    "s"."receive_day",
    "s"."payment_terms_days",
    "s"."preferred_payment_method",
    "s"."accepts_cash",
    "s"."accepts_transfer",
    "s"."payment_note",
    COALESCE("accounts_count"."accounts_count", (0)::bigint) AS "payment_accounts_count",
    "s"."default_markup_pct"
   FROM (("public"."suppliers" "s"
     LEFT JOIN ( SELECT "supplier_products"."supplier_id",
            "count"(*) AS "products_count"
           FROM "public"."supplier_products"
          GROUP BY "supplier_products"."supplier_id") "sp_count" ON (("sp_count"."supplier_id" = "s"."id")))
     LEFT JOIN ( SELECT "spa"."supplier_id",
            "count"(*) FILTER (WHERE ("spa"."is_active" = true)) AS "accounts_count"
           FROM "public"."supplier_payment_accounts" "spa"
          GROUP BY "spa"."supplier_id") "accounts_count" ON (("accounts_count"."supplier_id" = "s"."id")));


ALTER VIEW "public"."v_suppliers_admin" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_org_id_branch_id_user_id_key" UNIQUE ("org_id", "branch_id", "user_id");



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_org_id_name_key" UNIQUE ("org_id", "name");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_unique_session_scope_denom" UNIQUE ("session_id", "count_scope", "denomination_value");



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_session_reconciliation_inputs"
    ADD CONSTRAINT "cash_session_reconciliation_inputs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_session_reconciliation_inputs"
    ADD CONSTRAINT "cash_session_reconciliation_inputs_unique_session_row_key" UNIQUE ("session_id", "row_key");



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_org_id_special_order_id_product__key" UNIQUE ("org_id", "special_order_id", "product_id");



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_import_jobs"
    ADD CONSTRAINT "data_import_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_import_rows"
    ADD CONSTRAINT "data_import_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_accounts"
    ADD CONSTRAINT "employee_accounts_org_id_branch_id_name_key" UNIQUE ("org_id", "branch_id", "name");



ALTER TABLE ONLY "public"."employee_accounts"
    ADD CONSTRAINT "employee_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expiration_batches"
    ADD CONSTRAINT "expiration_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fiscal_credentials"
    ADD CONSTRAINT "fiscal_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fiscal_sequences"
    ADD CONSTRAINT "fiscal_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_events"
    ADD CONSTRAINT "invoice_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_jobs"
    ADD CONSTRAINT "invoice_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."online_order_items"
    ADD CONSTRAINT "online_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."online_order_payment_proofs"
    ADD CONSTRAINT "online_order_payment_proofs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."online_order_status_history"
    ADD CONSTRAINT "online_order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."online_order_tracking_tokens"
    ADD CONSTRAINT "online_order_tracking_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."online_order_tracking_tokens"
    ADD CONSTRAINT "online_order_tracking_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."online_orders"
    ADD CONSTRAINT "online_orders_org_id_order_code_key" UNIQUE ("org_id", "order_code");



ALTER TABLE ONLY "public"."online_orders"
    ADD CONSTRAINT "online_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_preferences"
    ADD CONSTRAINT "org_preferences_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_org_id_user_id_key" UNIQUE ("org_id", "user_id");



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."points_of_sale"
    ADD CONSTRAINT "points_of_sale_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_unique_org_branch_name" UNIQUE ("org_id", "branch_id", "device_name");



ALTER TABLE ONLY "public"."print_jobs"
    ADD CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_delivery_events"
    ADD CONSTRAINT "sale_delivery_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_delivery_links"
    ADD CONSTRAINT "sale_delivery_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_delivery_links"
    ADD CONSTRAINT "sale_delivery_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."sale_documents"
    ADD CONSTRAINT "sale_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_module_access"
    ADD CONSTRAINT "staff_module_access_org_id_branch_id_role_module_key_key" UNIQUE ("org_id", "branch_id", "role", "module_key");



ALTER TABLE ONLY "public"."staff_module_access"
    ADD CONSTRAINT "staff_module_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_org_id_branch_id_product_id_key" UNIQUE ("org_id", "branch_id", "product_id");



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storefront_domains"
    ADD CONSTRAINT "storefront_domains_hostname_key" UNIQUE ("hostname");



ALTER TABLE ONLY "public"."storefront_domains"
    ADD CONSTRAINT "storefront_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storefront_settings"
    ADD CONSTRAINT "storefront_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_order_id_product_id_key" UNIQUE ("order_id", "product_id");



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_org_id_supplier_id_product_id_key" UNIQUE ("org_id", "supplier_id", "product_id");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_org_product_relation_key" UNIQUE ("org_id", "product_id", "relation_type");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_active_orgs"
    ADD CONSTRAINT "user_active_orgs_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "audit_log_org_action_idx" ON "public"."audit_log" USING "btree" ("org_id", "action_key");



CREATE INDEX "audit_log_org_actor_idx" ON "public"."audit_log" USING "btree" ("org_id", "actor_user_id");



CREATE INDEX "audit_log_org_created_at_idx" ON "public"."audit_log" USING "btree" ("org_id", "created_at" DESC);



CREATE UNIQUE INDEX "branches_org_storefront_slug_uq" ON "public"."branches" USING "btree" ("org_id", "storefront_slug") WHERE ("storefront_slug" IS NOT NULL);



CREATE INDEX "cash_session_count_lines_org_branch_idx" ON "public"."cash_session_count_lines" USING "btree" ("org_id", "branch_id", "created_at" DESC);



CREATE INDEX "cash_session_count_lines_session_idx" ON "public"."cash_session_count_lines" USING "btree" ("session_id", "denomination_value" DESC);



CREATE INDEX "cash_session_count_lines_session_scope_idx" ON "public"."cash_session_count_lines" USING "btree" ("session_id", "count_scope", "denomination_value" DESC);



CREATE INDEX "cash_session_movements_org_branch_idx" ON "public"."cash_session_movements" USING "btree" ("org_id", "branch_id", "created_at" DESC);



CREATE INDEX "cash_session_movements_session_idx" ON "public"."cash_session_movements" USING "btree" ("session_id", "created_at" DESC);



CREATE UNIQUE INDEX "cash_session_movements_supplier_payment_uniq_idx" ON "public"."cash_session_movements" USING "btree" ("supplier_payment_id") WHERE ("supplier_payment_id" IS NOT NULL);



CREATE INDEX "cash_session_reconciliation_inputs_org_branch_idx" ON "public"."cash_session_reconciliation_inputs" USING "btree" ("org_id", "branch_id", "created_at" DESC);



CREATE INDEX "cash_session_reconciliation_inputs_session_idx" ON "public"."cash_session_reconciliation_inputs" USING "btree" ("session_id", "row_key");



CREATE UNIQUE INDEX "cash_sessions_open_unique" ON "public"."cash_sessions" USING "btree" ("org_id", "branch_id") WHERE ("status" = 'open'::"text");



CREATE INDEX "cash_sessions_org_branch_status_idx" ON "public"."cash_sessions" USING "btree" ("org_id", "branch_id", "status", "opened_at" DESC);



CREATE INDEX "cash_sessions_org_created_idx" ON "public"."cash_sessions" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "data_import_jobs_org_created_idx" ON "public"."data_import_jobs" USING "btree" ("org_id", "created_at" DESC);



CREATE UNIQUE INDEX "data_import_rows_job_row_unique" ON "public"."data_import_rows" USING "btree" ("job_id", "row_number");



CREATE INDEX "data_import_rows_org_job_idx" ON "public"."data_import_rows" USING "btree" ("org_id", "job_id", "row_number");



CREATE INDEX "employee_accounts_org_branch_idx" ON "public"."employee_accounts" USING "btree" ("org_id", "branch_id");



CREATE INDEX "expiration_waste_org_branch_idx" ON "public"."expiration_waste" USING "btree" ("org_id", "branch_id", "created_at" DESC);



CREATE INDEX "fiscal_credentials_env_status_idx" ON "public"."fiscal_credentials" USING "btree" ("environment", "status");



CREATE UNIQUE INDEX "fiscal_credentials_tenant_env_cuit_uidx" ON "public"."fiscal_credentials" USING "btree" ("tenant_id", "environment", "taxpayer_cuit");



CREATE INDEX "fiscal_credentials_tenant_idx" ON "public"."fiscal_credentials" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "fiscal_sequences_domain_uidx" ON "public"."fiscal_sequences" USING "btree" ("tenant_id", "environment", "pto_vta", "cbte_tipo");



CREATE INDEX "fiscal_sequences_status_idx" ON "public"."fiscal_sequences" USING "btree" ("tenant_id", "environment", "status");



CREATE INDEX "invoice_events_job_idx" ON "public"."invoice_events" USING "btree" ("invoice_job_id", "created_at");



CREATE INDEX "invoice_events_tenant_type_idx" ON "public"."invoice_events" USING "btree" ("tenant_id", "event_type", "created_at");



CREATE INDEX "invoice_jobs_correlation_idx" ON "public"."invoice_jobs" USING "btree" ("correlation_id");



CREATE INDEX "invoice_jobs_sale_idx" ON "public"."invoice_jobs" USING "btree" ("tenant_id", "sale_id");



CREATE INDEX "invoice_jobs_status_idx" ON "public"."invoice_jobs" USING "btree" ("tenant_id", "environment", "job_status");



CREATE UNIQUE INDEX "invoice_jobs_tenant_env_pto_tipo_nro_uidx" ON "public"."invoice_jobs" USING "btree" ("tenant_id", "environment", "pto_vta", "cbte_tipo", "cbte_nro") WHERE ("cbte_nro" IS NOT NULL);



CREATE INDEX "invoices_cae_idx" ON "public"."invoices" USING "btree" ("cae");



CREATE UNIQUE INDEX "invoices_invoice_job_uidx" ON "public"."invoices" USING "btree" ("invoice_job_id");



CREATE INDEX "invoices_result_status_idx" ON "public"."invoices" USING "btree" ("tenant_id", "environment", "result_status");



CREATE INDEX "invoices_sale_idx" ON "public"."invoices" USING "btree" ("tenant_id", "sale_id");



CREATE UNIQUE INDEX "invoices_tenant_env_pto_tipo_nro_uidx" ON "public"."invoices" USING "btree" ("tenant_id", "environment", "pto_vta", "cbte_tipo", "cbte_nro");



CREATE INDEX "online_order_items_order_idx" ON "public"."online_order_items" USING "btree" ("online_order_id");



CREATE INDEX "online_order_payment_proofs_order_idx" ON "public"."online_order_payment_proofs" USING "btree" ("online_order_id", "uploaded_at" DESC);



CREATE INDEX "online_order_status_history_order_idx" ON "public"."online_order_status_history" USING "btree" ("online_order_id", "changed_at");



CREATE UNIQUE INDEX "online_order_tracking_tokens_active_by_order_uq" ON "public"."online_order_tracking_tokens" USING "btree" ("online_order_id") WHERE ("is_active" = true);



CREATE INDEX "online_orders_org_branch_status_idx" ON "public"."online_orders" USING "btree" ("org_id", "branch_id", "status", "created_at" DESC);



CREATE INDEX "online_orders_org_created_at_idx" ON "public"."online_orders" USING "btree" ("org_id", "created_at" DESC);



CREATE UNIQUE INDEX "orgs_storefront_slug_uq" ON "public"."orgs" USING "btree" ("storefront_slug") WHERE ("storefront_slug" IS NOT NULL);



CREATE UNIQUE INDEX "points_of_sale_tenant_env_pto_vta_uidx" ON "public"."points_of_sale" USING "btree" ("tenant_id", "environment", "pto_vta");



CREATE INDEX "points_of_sale_tenant_location_idx" ON "public"."points_of_sale" USING "btree" ("tenant_id", "location_id");



CREATE INDEX "pos_payment_devices_org_branch_active_idx" ON "public"."pos_payment_devices" USING "btree" ("org_id", "branch_id", "is_active", "device_name");



CREATE INDEX "print_jobs_invoice_idx" ON "public"."print_jobs" USING "btree" ("invoice_id");



CREATE INDEX "print_jobs_tenant_status_idx" ON "public"."print_jobs" USING "btree" ("tenant_id", "status");



CREATE UNIQUE INDEX "products_org_barcode_normalized_uq" ON "public"."products" USING "btree" ("org_id", "barcode_normalized") WHERE ("barcode_normalized" IS NOT NULL);



CREATE UNIQUE INDEX "products_org_barcode_uq" ON "public"."products" USING "btree" ("org_id", "barcode") WHERE ("barcode" IS NOT NULL);



CREATE UNIQUE INDEX "products_org_internal_code_uq" ON "public"."products" USING "btree" ("org_id", "internal_code") WHERE ("internal_code" IS NOT NULL);



CREATE UNIQUE INDEX "products_org_name_normalized_uq" ON "public"."products" USING "btree" ("org_id", "name_normalized") WHERE ("name_normalized" IS NOT NULL);



CREATE INDEX "sale_delivery_events_org_kind_created_at_idx" ON "public"."sale_delivery_events" USING "btree" ("org_id", "document_kind", "event_kind", "created_at" DESC);



CREATE INDEX "sale_delivery_events_sale_created_at_idx" ON "public"."sale_delivery_events" USING "btree" ("sale_id", "created_at" DESC);



CREATE UNIQUE INDEX "sale_delivery_links_active_by_sale_kind_uq" ON "public"."sale_delivery_links" USING "btree" ("sale_id", "document_kind") WHERE ("status" = 'active'::"public"."sale_delivery_link_status");



CREATE INDEX "sale_delivery_links_org_status_created_at_idx" ON "public"."sale_delivery_links" USING "btree" ("org_id", "status", "created_at" DESC);



CREATE INDEX "sale_documents_status_idx" ON "public"."sale_documents" USING "btree" ("tenant_id", "status");



CREATE INDEX "sale_documents_tenant_sale_idx" ON "public"."sale_documents" USING "btree" ("tenant_id", "sale_id");



CREATE INDEX "sale_payments_org_id_idx" ON "public"."sale_payments" USING "btree" ("org_id");



CREATE INDEX "sale_payments_payment_device_id_idx" ON "public"."sale_payments" USING "btree" ("payment_device_id");



CREATE INDEX "sale_payments_payment_method_idx" ON "public"."sale_payments" USING "btree" ("payment_method");



CREATE INDEX "sale_payments_sale_id_idx" ON "public"."sale_payments" USING "btree" ("sale_id");



CREATE INDEX "sales_org_id_client_id_created_at_idx" ON "public"."sales" USING "btree" ("org_id", "client_id", "created_at" DESC) WHERE ("client_id" IS NOT NULL);



CREATE INDEX "supplier_orders_expected_receive_on_idx" ON "public"."supplier_orders" USING "btree" ("org_id", "branch_id", "expected_receive_on") WHERE ("expected_receive_on" IS NOT NULL);



CREATE INDEX "supplier_orders_org_branch_archived_idx" ON "public"."supplier_orders" USING "btree" ("org_id", "branch_id", "is_archived", "created_at" DESC);



CREATE INDEX "supplier_payables_org_branch_status_due_idx" ON "public"."supplier_payables" USING "btree" ("org_id", "branch_id", "status", "due_on", "created_at" DESC);



CREATE INDEX "supplier_payables_org_supplier_status_idx" ON "public"."supplier_payables" USING "btree" ("org_id", "supplier_id", "status", "created_at" DESC);



CREATE UNIQUE INDEX "supplier_payment_accounts_org_supplier_identifier_uk" ON "public"."supplier_payment_accounts" USING "btree" ("org_id", "supplier_id", "account_identifier") WHERE (("account_identifier" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "account_identifier")) > 0));



CREATE INDEX "supplier_payment_accounts_org_supplier_idx" ON "public"."supplier_payment_accounts" USING "btree" ("org_id", "supplier_id", "is_active", "created_at" DESC);



CREATE INDEX "supplier_payments_org_branch_idx" ON "public"."supplier_payments" USING "btree" ("org_id", "branch_id", "paid_at" DESC);



CREATE INDEX "supplier_payments_payable_paid_at_idx" ON "public"."supplier_payments" USING "btree" ("payable_id", "paid_at" DESC);



CREATE OR REPLACE VIEW "public"."v_products_admin" AS
 SELECT "p"."id" AS "product_id",
    "p"."org_id",
    "p"."name",
    "p"."brand",
    "p"."internal_code",
    "p"."barcode",
    "p"."purchase_by_pack",
    "p"."units_per_pack",
    "p"."sell_unit_type",
    "p"."uom",
    "p"."unit_price",
    "p"."image_url",
    "p"."is_active",
    "p"."created_at",
    "p"."updated_at",
    COALESCE("sum"(COALESCE("si"."quantity_on_hand", (0)::numeric)), (0)::numeric) AS "stock_total",
    "jsonb_agg"("jsonb_build_object"('branch_id', "b"."id", 'branch_name', "b"."name", 'quantity_on_hand', COALESCE("si"."quantity_on_hand", (0)::numeric)) ORDER BY "b"."name") AS "stock_by_branch",
    "p"."shelf_life_days"
   FROM (("public"."products" "p"
     JOIN "public"."branches" "b" ON (("b"."org_id" = "p"."org_id")))
     LEFT JOIN "public"."stock_items" "si" ON ((("si"."product_id" = "p"."id") AND ("si"."branch_id" = "b"."id") AND ("si"."org_id" = "p"."org_id"))))
  GROUP BY "p"."id";



CREATE OR REPLACE TRIGGER "set_branch_memberships_updated_at" BEFORE UPDATE ON "public"."branch_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_branches_updated_at" BEFORE UPDATE ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_client_special_order_items_updated_at" BEFORE UPDATE ON "public"."client_special_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_client_special_orders_updated_at" BEFORE UPDATE ON "public"."client_special_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_employee_accounts_updated_at" BEFORE UPDATE ON "public"."employee_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_expiration_batches_updated_at" BEFORE UPDATE ON "public"."expiration_batches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_online_orders_updated_at" BEFORE UPDATE ON "public"."online_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_org_preferences_updated_at" BEFORE UPDATE ON "public"."org_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_org_users_updated_at" BEFORE UPDATE ON "public"."org_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_orgs_updated_at" BEFORE UPDATE ON "public"."orgs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_module_access_updated_at" BEFORE UPDATE ON "public"."staff_module_access" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_stock_items_updated_at" BEFORE UPDATE ON "public"."stock_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_storefront_domains_updated_at" BEFORE UPDATE ON "public"."storefront_domains" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_storefront_settings_updated_at" BEFORE UPDATE ON "public"."storefront_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_supplier_orders_updated_at" BEFORE UPDATE ON "public"."supplier_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_branches_seed_pos_payment_devices" AFTER INSERT ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"();



CREATE OR REPLACE TRIGGER "trg_branches_set_storefront_slug" BEFORE INSERT OR UPDATE OF "name", "storefront_slug" ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_branch_storefront_slug"();



CREATE OR REPLACE TRIGGER "trg_cash_session_reconciliation_inputs_set_updated_at" BEFORE UPDATE ON "public"."cash_session_reconciliation_inputs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_data_import_jobs_set_updated_at" BEFORE UPDATE ON "public"."data_import_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_data_import_rows_set_updated_at" BEFORE UPDATE ON "public"."data_import_rows" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_fiscal_credentials_set_updated_at" BEFORE UPDATE ON "public"."fiscal_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_fiscal_sequences_set_updated_at" BEFORE UPDATE ON "public"."fiscal_sequences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_invoice_jobs_set_updated_at" BEFORE UPDATE ON "public"."invoice_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_invoices_set_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_orgs_set_storefront_slug" BEFORE INSERT OR UPDATE OF "name", "storefront_slug" ON "public"."orgs" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_org_storefront_slug"();



CREATE OR REPLACE TRIGGER "trg_orgs_sync_platform_admin_memberships" AFTER INSERT ON "public"."orgs" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orgs_sync_platform_admin_memberships"();



CREATE OR REPLACE TRIGGER "trg_points_of_sale_set_updated_at" BEFORE UPDATE ON "public"."points_of_sale" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_print_jobs_set_updated_at" BEFORE UPDATE ON "public"."print_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sale_documents_set_updated_at" BEFORE UPDATE ON "public"."sale_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_supplier_orders_sync_payable" AFTER INSERT OR UPDATE OF "status", "supplier_id", "branch_id", "received_at", "reconciled_at" ON "public"."supplier_orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_sync_supplier_payable_from_order"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branch_memberships"
    ADD CONSTRAINT "branch_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_count_lines"
    ADD CONSTRAINT "cash_session_count_lines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_movements"
    ADD CONSTRAINT "cash_session_movements_supplier_payment_id_fkey" FOREIGN KEY ("supplier_payment_id") REFERENCES "public"."supplier_payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_session_reconciliation_inputs"
    ADD CONSTRAINT "cash_session_reconciliation_inputs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_reconciliation_inputs"
    ADD CONSTRAINT "cash_session_reconciliation_inputs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_session_reconciliation_inputs"
    ADD CONSTRAINT "cash_session_reconciliation_inputs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_reconciliation_inputs"
    ADD CONSTRAINT "cash_session_reconciliation_inputs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_session_reconciliation_inputs"
    ADD CONSTRAINT "cash_session_reconciliation_inputs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cash_sessions"
    ADD CONSTRAINT "cash_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_special_order_id_fkey" FOREIGN KEY ("special_order_id") REFERENCES "public"."client_special_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_special_order_items"
    ADD CONSTRAINT "client_special_order_items_supplier_order_id_fkey" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_special_orders"
    ADD CONSTRAINT "client_special_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_import_jobs"
    ADD CONSTRAINT "data_import_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."data_import_jobs"
    ADD CONSTRAINT "data_import_jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_import_rows"
    ADD CONSTRAINT "data_import_rows_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."data_import_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_import_rows"
    ADD CONSTRAINT "data_import_rows_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_accounts"
    ADD CONSTRAINT "employee_accounts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_accounts"
    ADD CONSTRAINT "employee_accounts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_batches"
    ADD CONSTRAINT "expiration_batches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_batches"
    ADD CONSTRAINT "expiration_batches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_batches"
    ADD CONSTRAINT "expiration_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."expiration_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expiration_waste"
    ADD CONSTRAINT "expiration_waste_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoice_events"
    ADD CONSTRAINT "invoice_events_invoice_job_id_fkey" FOREIGN KEY ("invoice_job_id") REFERENCES "public"."invoice_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_jobs"
    ADD CONSTRAINT "invoice_jobs_point_of_sale_id_fkey" FOREIGN KEY ("point_of_sale_id") REFERENCES "public"."points_of_sale"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoice_jobs"
    ADD CONSTRAINT "invoice_jobs_sale_document_id_fkey" FOREIGN KEY ("sale_document_id") REFERENCES "public"."sale_documents"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_job_id_fkey" FOREIGN KEY ("invoice_job_id") REFERENCES "public"."invoice_jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_point_of_sale_id_fkey" FOREIGN KEY ("point_of_sale_id") REFERENCES "public"."points_of_sale"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."online_order_items"
    ADD CONSTRAINT "online_order_items_online_order_id_fkey" FOREIGN KEY ("online_order_id") REFERENCES "public"."online_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_order_items"
    ADD CONSTRAINT "online_order_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_order_items"
    ADD CONSTRAINT "online_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."online_order_payment_proofs"
    ADD CONSTRAINT "online_order_payment_proofs_online_order_id_fkey" FOREIGN KEY ("online_order_id") REFERENCES "public"."online_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_order_payment_proofs"
    ADD CONSTRAINT "online_order_payment_proofs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_order_payment_proofs"
    ADD CONSTRAINT "online_order_payment_proofs_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."online_order_status_history"
    ADD CONSTRAINT "online_order_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."online_order_status_history"
    ADD CONSTRAINT "online_order_status_history_online_order_id_fkey" FOREIGN KEY ("online_order_id") REFERENCES "public"."online_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_order_status_history"
    ADD CONSTRAINT "online_order_status_history_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_order_tracking_tokens"
    ADD CONSTRAINT "online_order_tracking_tokens_online_order_id_fkey" FOREIGN KEY ("online_order_id") REFERENCES "public"."online_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_order_tracking_tokens"
    ADD CONSTRAINT "online_order_tracking_tokens_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."online_orders"
    ADD CONSTRAINT "online_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."online_orders"
    ADD CONSTRAINT "online_orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."online_orders"
    ADD CONSTRAINT "online_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_preferences"
    ADD CONSTRAINT "org_preferences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_payment_devices"
    ADD CONSTRAINT "pos_payment_devices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."print_jobs"
    ADD CONSTRAINT "print_jobs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_delivery_events"
    ADD CONSTRAINT "sale_delivery_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_delivery_events"
    ADD CONSTRAINT "sale_delivery_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_delivery_events"
    ADD CONSTRAINT "sale_delivery_events_sale_delivery_link_id_fkey" FOREIGN KEY ("sale_delivery_link_id") REFERENCES "public"."sale_delivery_links"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_delivery_events"
    ADD CONSTRAINT "sale_delivery_events_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_delivery_links"
    ADD CONSTRAINT "sale_delivery_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_delivery_links"
    ADD CONSTRAINT "sale_delivery_links_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_delivery_links"
    ADD CONSTRAINT "sale_delivery_links_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_payment_device_id_fkey" FOREIGN KEY ("payment_device_id") REFERENCES "public"."pos_payment_devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_employee_account_id_fkey" FOREIGN KEY ("employee_account_id") REFERENCES "public"."employee_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_module_access"
    ADD CONSTRAINT "staff_module_access_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_module_access"
    ADD CONSTRAINT "staff_module_access_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_items"
    ADD CONSTRAINT "stock_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storefront_domains"
    ADD CONSTRAINT "storefront_domains_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storefront_settings"
    ADD CONSTRAINT "storefront_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_controlled_by_user_id_fkey" FOREIGN KEY ("controlled_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_payables"
    ADD CONSTRAINT "supplier_payables_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payment_accounts"
    ADD CONSTRAINT "supplier_payment_accounts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "public"."supplier_payables"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."supplier_payments"
    ADD CONSTRAINT "supplier_payments_transfer_account_id_fkey" FOREIGN KEY ("transfer_account_id") REFERENCES "public"."supplier_payment_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_active_orgs"
    ADD CONSTRAINT "user_active_orgs_active_org_id_fkey" FOREIGN KEY ("active_org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_active_orgs"
    ADD CONSTRAINT "user_active_orgs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_select" ON "public"."audit_log" FOR SELECT USING ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."branch_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "branch_memberships_select" ON "public"."branch_memberships" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_org_admin"("org_id")));



CREATE POLICY "branch_memberships_update" ON "public"."branch_memberships" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "branch_memberships_write" ON "public"."branch_memberships" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "branches_select" ON "public"."branches" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "branches_select_platform_admin" ON "public"."branches" FOR SELECT USING ("public"."is_platform_admin"());



CREATE POLICY "branches_update" ON "public"."branches" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "branches_write" ON "public"."branches" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."cash_session_count_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_session_count_lines_select" ON "public"."cash_session_count_lines" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_session_count_lines_write" ON "public"."cash_session_count_lines" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."cash_session_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_session_movements_select" ON "public"."cash_session_movements" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_session_movements_write" ON "public"."cash_session_movements" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."cash_session_reconciliation_inputs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_session_reconciliation_inputs_select" ON "public"."cash_session_reconciliation_inputs" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_session_reconciliation_inputs_update" ON "public"."cash_session_reconciliation_inputs" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_session_reconciliation_inputs_write" ON "public"."cash_session_reconciliation_inputs" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."cash_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_sessions_select" ON "public"."cash_sessions" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_sessions_update" ON "public"."cash_sessions" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "cash_sessions_write" ON "public"."cash_sessions" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."client_special_order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_special_order_items_select" ON "public"."client_special_order_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "client_special_order_items_update" ON "public"."client_special_order_items" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "client_special_order_items_write" ON "public"."client_special_order_items" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."client_special_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_special_orders_select" ON "public"."client_special_orders" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "client_special_orders_update" ON "public"."client_special_orders" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "client_special_orders_write" ON "public"."client_special_orders" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "clients_write" ON "public"."clients" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."data_import_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "data_import_jobs_select" ON "public"."data_import_jobs" FOR SELECT USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "data_import_jobs_update" ON "public"."data_import_jobs" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "data_import_jobs_write" ON "public"."data_import_jobs" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."data_import_rows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "data_import_rows_select" ON "public"."data_import_rows" FOR SELECT USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "data_import_rows_update" ON "public"."data_import_rows" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "data_import_rows_write" ON "public"."data_import_rows" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."employee_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_accounts_select" ON "public"."employee_accounts" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "employee_accounts_update" ON "public"."employee_accounts" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "employee_accounts_write" ON "public"."employee_accounts" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."expiration_batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expiration_batches_select" ON "public"."expiration_batches" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "expiration_batches_update" ON "public"."expiration_batches" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "expiration_batches_write" ON "public"."expiration_batches" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."expiration_waste" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expiration_waste_select" ON "public"."expiration_waste" FOR SELECT USING ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."fiscal_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fiscal_credentials_service_role_all" ON "public"."fiscal_credentials" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."fiscal_sequences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fiscal_sequences_service_role_all" ON "public"."fiscal_sequences" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."invoice_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_events_service_role_all" ON "public"."invoice_events" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."invoice_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_jobs_select_org_admin" ON "public"."invoice_jobs" FOR SELECT TO "authenticated" USING ("public"."is_org_admin"("tenant_id"));



CREATE POLICY "invoice_jobs_select_platform_admin" ON "public"."invoice_jobs" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "invoice_jobs_service_role_all" ON "public"."invoice_jobs" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_select_org_admin" ON "public"."invoices" FOR SELECT TO "authenticated" USING ("public"."is_org_admin"("tenant_id"));



CREATE POLICY "invoices_select_platform_admin" ON "public"."invoices" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"());



CREATE POLICY "invoices_service_role_all" ON "public"."invoices" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."online_order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "online_order_items_select" ON "public"."online_order_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_order_items_update" ON "public"."online_order_items" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_order_items_write" ON "public"."online_order_items" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."online_order_payment_proofs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "online_order_payment_proofs_select" ON "public"."online_order_payment_proofs" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_order_payment_proofs_update" ON "public"."online_order_payment_proofs" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_order_payment_proofs_write" ON "public"."online_order_payment_proofs" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."online_order_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "online_order_status_history_select" ON "public"."online_order_status_history" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_order_status_history_write" ON "public"."online_order_status_history" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."online_order_tracking_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "online_order_tracking_tokens_select" ON "public"."online_order_tracking_tokens" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_order_tracking_tokens_update" ON "public"."online_order_tracking_tokens" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_order_tracking_tokens_write" ON "public"."online_order_tracking_tokens" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."online_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "online_orders_select" ON "public"."online_orders" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_orders_update" ON "public"."online_orders" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "online_orders_write" ON "public"."online_orders" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."org_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_preferences_select" ON "public"."org_preferences" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "org_preferences_update" ON "public"."org_preferences" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "org_preferences_write" ON "public"."org_preferences" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."org_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_users_select" ON "public"."org_users" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_org_admin"("org_id")));



CREATE POLICY "org_users_select_platform_admin" ON "public"."org_users" FOR SELECT USING ("public"."is_platform_admin"());



CREATE POLICY "org_users_update" ON "public"."org_users" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "org_users_write" ON "public"."org_users" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."orgs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs_select" ON "public"."orgs" FOR SELECT USING ("public"."is_org_member"("id"));



CREATE POLICY "orgs_select_platform_admin" ON "public"."orgs" FOR SELECT USING ("public"."is_platform_admin"());



CREATE POLICY "orgs_update" ON "public"."orgs" FOR UPDATE USING ("public"."is_org_admin"("id"));



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_admins_delete" ON "public"."platform_admins" FOR DELETE USING ("public"."is_platform_admin"());



CREATE POLICY "platform_admins_select" ON "public"."platform_admins" FOR SELECT USING ("public"."is_platform_admin"());



CREATE POLICY "platform_admins_update" ON "public"."platform_admins" FOR UPDATE USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "platform_admins_write" ON "public"."platform_admins" FOR INSERT WITH CHECK ("public"."is_platform_admin"());



ALTER TABLE "public"."points_of_sale" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "points_of_sale_service_role_all" ON "public"."points_of_sale" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pos_payment_devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pos_payment_devices_select" ON "public"."pos_payment_devices" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "pos_payment_devices_update" ON "public"."pos_payment_devices" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "pos_payment_devices_write" ON "public"."pos_payment_devices" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."print_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "print_jobs_service_role_all" ON "public"."print_jobs" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "products_update" ON "public"."products" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "products_write" ON "public"."products" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."sale_delivery_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_delivery_events_select" ON "public"."sale_delivery_events" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sale_delivery_events_write" ON "public"."sale_delivery_events" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."sale_delivery_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_delivery_links_select" ON "public"."sale_delivery_links" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sale_delivery_links_update" ON "public"."sale_delivery_links" FOR UPDATE USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sale_delivery_links_write" ON "public"."sale_delivery_links" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."sale_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_documents_service_role_all" ON "public"."sale_documents" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_items_select" ON "public"."sale_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sale_items_write" ON "public"."sale_items" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."sale_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_payments_select" ON "public"."sale_payments" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sale_payments_write" ON "public"."sale_payments" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_select" ON "public"."sales" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "sales_write" ON "public"."sales" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."staff_module_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_module_access_select" ON "public"."staff_module_access" FOR SELECT USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "staff_module_access_update" ON "public"."staff_module_access" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "staff_module_access_write" ON "public"."staff_module_access" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."stock_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_items_select" ON "public"."stock_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "stock_items_update" ON "public"."stock_items" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "stock_items_write" ON "public"."stock_items" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_movements_select" ON "public"."stock_movements" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "stock_movements_write" ON "public"."stock_movements" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));



ALTER TABLE "public"."storefront_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "storefront_domains_select" ON "public"."storefront_domains" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "storefront_domains_update" ON "public"."storefront_domains" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "storefront_domains_write" ON "public"."storefront_domains" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."storefront_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "storefront_settings_select" ON "public"."storefront_settings" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "storefront_settings_update" ON "public"."storefront_settings" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "storefront_settings_write" ON "public"."storefront_settings" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."supplier_order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_order_items_select" ON "public"."supplier_order_items" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_order_items_update" ON "public"."supplier_order_items" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "supplier_order_items_write" ON "public"."supplier_order_items" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."supplier_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_orders_select" ON "public"."supplier_orders" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_orders_update" ON "public"."supplier_orders" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "supplier_orders_write" ON "public"."supplier_orders" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."supplier_payables" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_payables_select" ON "public"."supplier_payables" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_payables_update" ON "public"."supplier_payables" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "supplier_payables_write" ON "public"."supplier_payables" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."supplier_payment_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_payment_accounts_select" ON "public"."supplier_payment_accounts" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_payment_accounts_update" ON "public"."supplier_payment_accounts" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "supplier_payment_accounts_write" ON "public"."supplier_payment_accounts" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."supplier_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_payments_select" ON "public"."supplier_payments" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_payments_update" ON "public"."supplier_payments" FOR UPDATE USING ("public"."is_org_admin_or_superadmin"("org_id"));



CREATE POLICY "supplier_payments_write" ON "public"."supplier_payments" FOR INSERT WITH CHECK ("public"."is_org_admin_or_superadmin"("org_id"));



ALTER TABLE "public"."supplier_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplier_products_select" ON "public"."supplier_products" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "supplier_products_update" ON "public"."supplier_products" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "supplier_products_write" ON "public"."supplier_products" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_select" ON "public"."suppliers" FOR SELECT USING ("public"."is_org_member"("org_id"));



CREATE POLICY "suppliers_update" ON "public"."suppliers" FOR UPDATE USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "suppliers_write" ON "public"."suppliers" FOR INSERT WITH CHECK ("public"."is_org_admin"("org_id"));



ALTER TABLE "public"."user_active_orgs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_active_orgs_select" ON "public"."user_active_orgs" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



CREATE POLICY "user_active_orgs_update" ON "public"."user_active_orgs" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



CREATE POLICY "user_active_orgs_write" ON "public"."user_active_orgs" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_platform_admin"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_append_event"("p_tenant_id" "uuid", "p_invoice_job_id" "uuid", "p_event_type" "text", "p_event_payload_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_append_event"("p_tenant_id" "uuid", "p_invoice_job_id" "uuid", "p_event_type" "text", "p_event_payload_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_append_event"("p_tenant_id" "uuid", "p_invoice_job_id" "uuid", "p_event_type" "text", "p_event_payload_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_append_event"("p_tenant_id" "uuid", "p_invoice_job_id" "uuid", "p_event_type" "text", "p_event_payload_json" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."invoice_jobs" TO "anon";
GRANT ALL ON TABLE "public"."invoice_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_jobs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_assert_job_exists"("p_invoice_job_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_assert_job_exists"("p_invoice_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_assert_job_exists"("p_invoice_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_assert_job_exists"("p_invoice_job_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_sequences" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_sequences" TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_block_sequence"("p_tenant_id" "uuid", "p_environment" "text", "p_pto_vta" integer, "p_cbte_tipo" integer, "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_block_sequence"("p_tenant_id" "uuid", "p_environment" "text", "p_pto_vta" integer, "p_cbte_tipo" integer, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_block_sequence"("p_tenant_id" "uuid", "p_environment" "text", "p_pto_vta" integer, "p_cbte_tipo" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_block_sequence"("p_tenant_id" "uuid", "p_environment" "text", "p_pto_vta" integer, "p_cbte_tipo" integer, "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_mark_job_authorized"("p_invoice_job_id" "uuid", "p_doc_tipo" integer, "p_doc_nro" bigint, "p_currency" character varying, "p_currency_rate" numeric, "p_imp_total" numeric, "p_imp_neto" numeric, "p_imp_iva" numeric, "p_imp_trib" numeric, "p_imp_op_ex" numeric, "p_imp_tot_conc" numeric, "p_cae" character varying, "p_cae_expires_at" "date", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb", "p_raw_request_json" "jsonb", "p_raw_response_json" "jsonb", "p_response_payload_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_authorized"("p_invoice_job_id" "uuid", "p_doc_tipo" integer, "p_doc_nro" bigint, "p_currency" character varying, "p_currency_rate" numeric, "p_imp_total" numeric, "p_imp_neto" numeric, "p_imp_iva" numeric, "p_imp_trib" numeric, "p_imp_op_ex" numeric, "p_imp_tot_conc" numeric, "p_cae" character varying, "p_cae_expires_at" "date", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb", "p_raw_request_json" "jsonb", "p_raw_response_json" "jsonb", "p_response_payload_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_authorized"("p_invoice_job_id" "uuid", "p_doc_tipo" integer, "p_doc_nro" bigint, "p_currency" character varying, "p_currency_rate" numeric, "p_imp_total" numeric, "p_imp_neto" numeric, "p_imp_iva" numeric, "p_imp_trib" numeric, "p_imp_op_ex" numeric, "p_imp_tot_conc" numeric, "p_cae" character varying, "p_cae_expires_at" "date", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb", "p_raw_request_json" "jsonb", "p_raw_response_json" "jsonb", "p_response_payload_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_authorized"("p_invoice_job_id" "uuid", "p_doc_tipo" integer, "p_doc_nro" bigint, "p_currency" character varying, "p_currency_rate" numeric, "p_imp_total" numeric, "p_imp_neto" numeric, "p_imp_iva" numeric, "p_imp_trib" numeric, "p_imp_op_ex" numeric, "p_imp_tot_conc" numeric, "p_cae" character varying, "p_cae_expires_at" "date", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb", "p_raw_request_json" "jsonb", "p_raw_response_json" "jsonb", "p_response_payload_json" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_mark_job_authorizing"("p_invoice_job_id" "uuid", "p_attempt_count" integer, "p_requested_payload_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_authorizing"("p_invoice_job_id" "uuid", "p_attempt_count" integer, "p_requested_payload_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_authorizing"("p_invoice_job_id" "uuid", "p_attempt_count" integer, "p_requested_payload_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_authorizing"("p_invoice_job_id" "uuid", "p_attempt_count" integer, "p_requested_payload_json" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_mark_job_failed"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_failed"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_failed"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_failed"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_mark_job_pending_reconcile"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_pending_reconcile"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_pending_reconcile"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_pending_reconcile"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_mark_job_rejected"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_rejected"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_rejected"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_job_rejected"("p_invoice_job_id" "uuid", "p_last_error_code" "text", "p_last_error_message" "text", "p_response_payload_json" "jsonb", "p_afip_observations_json" "jsonb", "p_afip_events_json" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_mark_render_completed"("p_invoice_job_id" "uuid", "p_invoice_id" "uuid", "p_pdf_storage_path" "text", "p_ticket_storage_path" "text", "p_qr_payload_json" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_render_completed"("p_invoice_job_id" "uuid", "p_invoice_id" "uuid", "p_pdf_storage_path" "text", "p_ticket_storage_path" "text", "p_qr_payload_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_render_completed"("p_invoice_job_id" "uuid", "p_invoice_id" "uuid", "p_pdf_storage_path" "text", "p_ticket_storage_path" "text", "p_qr_payload_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_mark_render_completed"("p_invoice_job_id" "uuid", "p_invoice_id" "uuid", "p_pdf_storage_path" "text", "p_ticket_storage_path" "text", "p_qr_payload_json" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_fiscal_reserve_sequence"("p_invoice_job_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_fiscal_reserve_sequence"("p_invoice_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fiscal_reserve_sequence"("p_invoice_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fiscal_reserve_sequence"("p_invoice_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_next_branch_storefront_slug"("p_org_id" "uuid", "p_slug_base" "text", "p_exclude_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_next_branch_storefront_slug"("p_org_id" "uuid", "p_slug_base" "text", "p_exclude_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_next_branch_storefront_slug"("p_org_id" "uuid", "p_slug_base" "text", "p_exclude_branch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_next_org_storefront_slug"("p_slug_base" "text", "p_exclude_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_next_org_storefront_slug"("p_slug_base" "text", "p_exclude_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_next_org_storefront_slug"("p_slug_base" "text", "p_exclude_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_recompute_supplier_payable"("p_payable_id" "uuid", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_platform_admin_memberships_for_org"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_platform_admin_memberships_for_org"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_platform_admin_memberships_for_org"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("check_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin_or_superadmin"("check_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("check_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_product_catalog_text"("p_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_product_catalog_text"("p_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_product_catalog_text"("p_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text", "p_movement_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text", "p_movement_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_add_cash_session_movement"("p_org_id" "uuid", "p_session_id" "uuid", "p_movement_type" "text", "p_category_key" "text", "p_amount" numeric, "p_note" "text", "p_movement_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_adjust_expiration_batch"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_adjust_stock_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_new_quantity_on_hand" numeric, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_append_sale_delivery_event"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_event_kind" "text", "p_channel" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_append_sale_delivery_event"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_event_kind" "text", "p_channel" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_append_sale_delivery_event"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_event_kind" "text", "p_channel" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_apply_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid", "p_apply_mode" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_apply_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid", "p_apply_mode" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_apply_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid", "p_apply_mode" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_bootstrap_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_bootstrap_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_bootstrap_platform_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text", "p_closed_controlled_by_name" "text", "p_close_confirmed" boolean, "p_closing_drawer_count_lines" "jsonb", "p_closing_reserve_count_lines" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text", "p_closed_controlled_by_name" "text", "p_close_confirmed" boolean, "p_closing_drawer_count_lines" "jsonb", "p_closing_reserve_count_lines" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_close_cash_session"("p_org_id" "uuid", "p_session_id" "uuid", "p_close_note" "text", "p_closed_controlled_by_name" "text", "p_close_confirmed" boolean, "p_closing_drawer_count_lines" "jsonb", "p_closing_reserve_count_lines" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_correct_sale_payment_method"("p_org_id" "uuid", "p_sale_payment_id" "uuid", "p_payment_method" "public"."payment_method", "p_payment_device_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_data_import_job"("p_org_id" "uuid", "p_template_key" "text", "p_source_file_name" "text", "p_source_file_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_data_import_job"("p_org_id" "uuid", "p_template_key" "text", "p_source_file_name" "text", "p_source_file_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_data_import_job"("p_org_id" "uuid", "p_template_key" "text", "p_source_file_name" "text", "p_source_file_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_expiration_batch_manual"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_expires_on" "date", "p_quantity" numeric, "p_source_ref_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_online_order"("p_org_slug" "text", "p_branch_slug" "text", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_customer_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_online_order"("p_org_slug" "text", "p_branch_slug" "text", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_customer_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_online_order"("p_org_slug" "text", "p_branch_slug" "text", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_address" "text", "p_items" "jsonb", "p_customer_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid", "p_close_special_order" boolean, "p_apply_cash_discount" boolean, "p_cash_discount_pct" numeric, "p_payments" "jsonb", "p_payment_device_id" "uuid", "p_apply_employee_discount" boolean, "p_employee_discount_pct" numeric, "p_employee_account_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid", "p_close_special_order" boolean, "p_apply_cash_discount" boolean, "p_cash_discount_pct" numeric, "p_payments" "jsonb", "p_payment_device_id" "uuid", "p_apply_employee_discount" boolean, "p_employee_discount_pct" numeric, "p_employee_account_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_sale"("p_org_id" "uuid", "p_branch_id" "uuid", "p_payment_method" "public"."payment_method", "p_items" "jsonb", "p_special_order_id" "uuid", "p_close_special_order" boolean, "p_apply_cash_discount" boolean, "p_cash_discount_pct" numeric, "p_payments" "jsonb", "p_payment_device_id" "uuid", "p_apply_employee_discount" boolean, "p_employee_discount_pct" numeric, "p_employee_account_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_special_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_client_id" "uuid", "p_items" "jsonb", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_create_supplier_order"("p_org_id" "uuid", "p_branch_id" "uuid", "p_supplier_id" "uuid", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_enqueue_sale_fiscal_invoice"("p_org_id" "uuid", "p_sale_id" "uuid", "p_environment" "text", "p_cbte_tipo" integer, "p_doc_tipo" integer, "p_doc_nro" bigint, "p_source" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_enqueue_sale_fiscal_invoice"("p_org_id" "uuid", "p_sale_id" "uuid", "p_environment" "text", "p_cbte_tipo" integer, "p_doc_tipo" integer, "p_doc_nro" bigint, "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_enqueue_sale_fiscal_invoice"("p_org_id" "uuid", "p_sale_id" "uuid", "p_environment" "text", "p_cbte_tipo" integer, "p_doc_tipo" integer, "p_doc_nro" bigint, "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_enqueue_sale_fiscal_invoice"("p_org_id" "uuid", "p_sale_id" "uuid", "p_environment" "text", "p_cbte_tipo" integer, "p_doc_tipo" integer, "p_doc_nro" bigint, "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_active_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_active_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_active_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_payment_breakdown"("p_org_id" "uuid", "p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_reconciliation_rows"("p_org_id" "uuid", "p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_reconciliation_rows"("p_org_id" "uuid", "p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_reconciliation_rows"("p_org_id" "uuid", "p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_session_summary"("p_org_id" "uuid", "p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_client_detail"("p_org_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_client_sales_history"("p_org_id" "uuid", "p_client_id" "uuid", "p_branch_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_client_sales_history"("p_org_id" "uuid", "p_client_id" "uuid", "p_branch_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_client_sales_history"("p_org_id" "uuid", "p_client_id" "uuid", "p_branch_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_admin"("p_org_id" "uuid", "p_branch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_online_order_tracking"("p_tracking_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_online_order_tracking"("p_tracking_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_online_order_tracking"("p_tracking_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_or_create_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_or_create_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_or_create_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_public_storefront_branches"("p_org_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_public_storefront_branches"("p_org_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_public_storefront_branches"("p_org_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_public_storefront_products"("p_org_slug" "text", "p_branch_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_public_storefront_products"("p_org_slug" "text", "p_branch_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_public_storefront_products"("p_org_slug" "text", "p_branch_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_sale_invoice_delivery"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_sale_invoice_delivery"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_sale_invoice_delivery"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_sale_ticket_delivery"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_sale_ticket_delivery"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_sale_ticket_delivery"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_special_order_for_pos"("p_org_id" "uuid", "p_special_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_staff_effective_modules"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_staff_effective_modules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_staff_effective_modules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_invite_user_to_org"("p_org_id" "uuid", "p_email" "text", "p_role" "public"."user_role", "p_branch_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_clients"("p_org_id" "uuid", "p_branch_id" "uuid", "p_search" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_sale_delivery_events"("p_sale_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_sale_delivery_events"("p_sale_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_sale_delivery_events"("p_sale_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_list_sale_delivery_links"("p_sale_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_list_sale_delivery_links"("p_sale_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_list_sale_delivery_links"("p_sale_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_log_audit_event"("p_org_id" "uuid", "p_action_key" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_branch_id" "uuid", "p_metadata" "jsonb", "p_actor_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_mark_sale_delivery_link_shared"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_channel" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_mark_sale_delivery_link_shared"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_mark_sale_delivery_link_shared"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_channel" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_mark_sale_invoiced"("p_org_id" "uuid", "p_sale_id" "uuid", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_mark_sale_invoiced"("p_org_id" "uuid", "p_sale_id" "uuid", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_mark_sale_invoiced"("p_org_id" "uuid", "p_sale_id" "uuid", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_mark_special_order_items_ordered"("p_org_id" "uuid", "p_item_ids" "uuid"[], "p_supplier_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_move_expiration_batch_to_waste"("p_org_id" "uuid", "p_batch_id" "uuid", "p_expected_qty" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text", "p_session_label" "text", "p_opened_controlled_by_name" "text", "p_opening_drawer_count_lines" "jsonb", "p_opening_reserve_count_lines" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text", "p_session_label" "text", "p_opened_controlled_by_name" "text", "p_opening_drawer_count_lines" "jsonb", "p_opening_reserve_count_lines" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_open_cash_session"("p_org_id" "uuid", "p_branch_id" "uuid", "p_period_type" "text", "p_session_label" "text", "p_opened_controlled_by_name" "text", "p_opening_drawer_count_lines" "jsonb", "p_opening_reserve_count_lines" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone, "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone, "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_receive_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_items" "jsonb", "p_received_at" timestamp with time zone, "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reconcile_supplier_order"("p_org_id" "uuid", "p_order_id" "uuid", "p_controlled_by_user_id" "uuid", "p_controlled_by_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_regenerate_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_regenerate_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_regenerate_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone, "p_transfer_account_id" "uuid", "p_reference" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone, "p_transfer_account_id" "uuid", "p_reference" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_register_supplier_payment"("p_org_id" "uuid", "p_payable_id" "uuid", "p_amount" numeric, "p_payment_method" "public"."payment_method", "p_paid_at" timestamp with time zone, "p_transfer_account_id" "uuid", "p_reference" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_remove_supplier_product_relation"("p_org_id" "uuid", "p_product_id" "uuid", "p_relation_type" "public"."supplier_product_relation_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_revoke_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_revoke_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_revoke_sale_delivery_link"("p_sale_id" "uuid", "p_document_kind" "public"."sale_delivery_document_kind") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_online_order_status"("p_online_order_id" "uuid", "p_new_status" "public"."online_order_status", "p_internal_note" "text", "p_customer_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_online_order_status"("p_online_order_id" "uuid", "p_new_status" "public"."online_order_status", "p_internal_note" "text", "p_customer_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_online_order_status"("p_online_order_id" "uuid", "p_new_status" "public"."online_order_status", "p_internal_note" "text", "p_customer_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_safety_stock"("p_org_id" "uuid", "p_branch_id" "uuid", "p_product_id" "uuid", "p_safety_stock" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_special_order_status"("p_org_id" "uuid", "p_special_order_id" "uuid", "p_status" "public"."special_order_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_staff_module_access"("p_org_id" "uuid", "p_branch_id" "uuid", "p_module_key" "text", "p_is_enabled" boolean, "p_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_archived"("p_org_id" "uuid", "p_order_id" "uuid", "p_is_archived" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_archived"("p_org_id" "uuid", "p_order_id" "uuid", "p_is_archived" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_archived"("p_org_id" "uuid", "p_order_id" "uuid", "p_is_archived" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_expected_receive_on"("p_org_id" "uuid", "p_order_id" "uuid", "p_expected_receive_on" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_order_status"("p_org_id" "uuid", "p_order_id" "uuid", "p_status" "public"."supplier_order_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_supplier_payment_account_active"("p_org_id" "uuid", "p_account_id" "uuid", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text", "p_initial_branch_name" "text", "p_initial_branch_address" "text", "p_owner_user_id" "uuid", "p_owner_display_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text", "p_initial_branch_name" "text", "p_initial_branch_address" "text", "p_owner_user_id" "uuid", "p_owner_display_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_create_org"("p_org_name" "text", "p_timezone" "text", "p_initial_branch_name" "text", "p_initial_branch_address" "text", "p_owner_user_id" "uuid", "p_owner_display_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_set_active_org"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_superadmin_upsert_branch"("p_org_id" "uuid", "p_branch_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_sync_supplier_payable_from_order"("p_org_id" "uuid", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_transfer_stock_between_branches"("p_org_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_items" "jsonb", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_transfer_stock_between_branches"("p_org_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_items" "jsonb", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_transfer_stock_between_branches"("p_org_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_items" "jsonb", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_expiration_batch_date"("p_org_id" "uuid", "p_batch_id" "uuid", "p_new_expires_on" "date", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric, "p_due_on" "date", "p_invoice_reference" "text", "p_invoice_photo_url" "text", "p_invoice_note" "text", "p_selected_payment_method" "public"."payment_method") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric, "p_due_on" "date", "p_invoice_reference" "text", "p_invoice_photo_url" "text", "p_invoice_note" "text", "p_selected_payment_method" "public"."payment_method") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_supplier_payable"("p_org_id" "uuid", "p_payable_id" "uuid", "p_invoice_amount" numeric, "p_due_on" "date", "p_invoice_reference" "text", "p_invoice_photo_url" "text", "p_invoice_note" "text", "p_selected_payment_method" "public"."payment_method") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_user_membership"("p_org_id" "uuid", "p_user_id" "uuid", "p_role" "public"."user_role", "p_is_active" boolean, "p_display_name" "text", "p_branch_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_branch"("p_branch_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_address" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_cash_session_reconciliation_inputs"("p_org_id" "uuid", "p_session_id" "uuid", "p_entries" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_cash_session_reconciliation_inputs"("p_org_id" "uuid", "p_session_id" "uuid", "p_entries" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_cash_session_reconciliation_inputs"("p_org_id" "uuid", "p_session_id" "uuid", "p_entries" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_data_import_row"("p_org_id" "uuid", "p_job_id" "uuid", "p_row_number" integer, "p_raw_payload" "jsonb", "p_normalized_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_data_import_row"("p_org_id" "uuid", "p_job_id" "uuid", "p_row_number" integer, "p_raw_payload" "jsonb", "p_normalized_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_data_import_row"("p_org_id" "uuid", "p_job_id" "uuid", "p_row_number" integer, "p_raw_payload" "jsonb", "p_normalized_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_product"("p_product_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_internal_code" "text", "p_barcode" "text", "p_sell_unit_type" "public"."sell_unit_type", "p_uom" "text", "p_unit_price" numeric, "p_is_active" boolean, "p_shelf_life_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text", "p_default_markup_pct" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text", "p_default_markup_pct" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier"("p_supplier_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_contact_name" "text", "p_phone" "text", "p_email" "text", "p_notes" "text", "p_is_active" boolean, "p_order_frequency" "public"."order_frequency", "p_order_day" "public"."weekday", "p_receive_day" "public"."weekday", "p_payment_terms_days" integer, "p_preferred_payment_method" "public"."payment_method", "p_accepts_cash" boolean, "p_accepts_transfer" boolean, "p_payment_note" "text", "p_default_markup_pct" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_order_item"("p_org_id" "uuid", "p_order_id" "uuid", "p_product_id" "uuid", "p_ordered_qty" numeric, "p_unit_cost" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid", "p_account_label" "text", "p_bank_name" "text", "p_account_holder_name" "text", "p_account_identifier" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid", "p_account_label" "text", "p_bank_name" "text", "p_account_holder_name" "text", "p_account_identifier" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_payment_account"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_account_id" "uuid", "p_account_label" "text", "p_bank_name" "text", "p_account_holder_name" "text", "p_account_identifier" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type", "p_supplier_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type", "p_supplier_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_supplier_product"("p_org_id" "uuid", "p_supplier_id" "uuid", "p_product_id" "uuid", "p_supplier_sku" "text", "p_supplier_product_name" "text", "p_relation_type" "public"."supplier_product_relation_type", "p_supplier_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_validate_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_validate_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_validate_data_import_job"("p_org_id" "uuid", "p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify_text"("p_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify_text"("p_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify_text"("p_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_orgs_sync_platform_admin_memberships"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_orgs_sync_platform_admin_memberships"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_orgs_sync_platform_admin_memberships"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_seed_pos_payment_devices_for_branch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_branch_storefront_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_branch_storefront_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_branch_storefront_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_org_storefront_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_org_storefront_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_org_storefront_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_sync_supplier_payable_from_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_sync_supplier_payable_from_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_sync_supplier_payable_from_order"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."branch_memberships" TO "anon";
GRANT ALL ON TABLE "public"."branch_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."branch_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."cash_session_count_lines" TO "anon";
GRANT ALL ON TABLE "public"."cash_session_count_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_session_count_lines" TO "service_role";



GRANT ALL ON TABLE "public"."cash_session_movements" TO "anon";
GRANT ALL ON TABLE "public"."cash_session_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_session_movements" TO "service_role";



GRANT ALL ON TABLE "public"."cash_session_reconciliation_inputs" TO "anon";
GRANT ALL ON TABLE "public"."cash_session_reconciliation_inputs" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_session_reconciliation_inputs" TO "service_role";



GRANT ALL ON TABLE "public"."cash_sessions" TO "anon";
GRANT ALL ON TABLE "public"."cash_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."client_special_order_items" TO "anon";
GRANT ALL ON TABLE "public"."client_special_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."client_special_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."client_special_orders" TO "anon";
GRANT ALL ON TABLE "public"."client_special_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."client_special_orders" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."data_import_jobs" TO "anon";
GRANT ALL ON TABLE "public"."data_import_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."data_import_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."data_import_rows" TO "anon";
GRANT ALL ON TABLE "public"."data_import_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."data_import_rows" TO "service_role";



GRANT ALL ON TABLE "public"."employee_accounts" TO "anon";
GRANT ALL ON TABLE "public"."employee_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."expiration_batches" TO "anon";
GRANT ALL ON TABLE "public"."expiration_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."expiration_batches" TO "service_role";



GRANT ALL ON TABLE "public"."expiration_waste" TO "anon";
GRANT ALL ON TABLE "public"."expiration_waste" TO "authenticated";
GRANT ALL ON TABLE "public"."expiration_waste" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_credentials" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_events" TO "anon";
GRANT ALL ON TABLE "public"."invoice_events" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_events" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."online_order_items" TO "anon";
GRANT ALL ON TABLE "public"."online_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."online_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."online_order_payment_proofs" TO "anon";
GRANT ALL ON TABLE "public"."online_order_payment_proofs" TO "authenticated";
GRANT ALL ON TABLE "public"."online_order_payment_proofs" TO "service_role";



GRANT ALL ON TABLE "public"."online_order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."online_order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."online_order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."online_order_tracking_tokens" TO "anon";
GRANT ALL ON TABLE "public"."online_order_tracking_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."online_order_tracking_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."online_orders" TO "anon";
GRANT ALL ON TABLE "public"."online_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."online_orders" TO "service_role";



GRANT ALL ON TABLE "public"."org_preferences" TO "anon";
GRANT ALL ON TABLE "public"."org_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."org_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."org_users" TO "anon";
GRANT ALL ON TABLE "public"."org_users" TO "authenticated";
GRANT ALL ON TABLE "public"."org_users" TO "service_role";



GRANT ALL ON TABLE "public"."orgs" TO "anon";
GRANT ALL ON TABLE "public"."orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."orgs" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admins" TO "anon";
GRANT ALL ON TABLE "public"."platform_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";



GRANT ALL ON TABLE "public"."points_of_sale" TO "anon";
GRANT ALL ON TABLE "public"."points_of_sale" TO "authenticated";
GRANT ALL ON TABLE "public"."points_of_sale" TO "service_role";



GRANT ALL ON TABLE "public"."pos_payment_devices" TO "anon";
GRANT ALL ON TABLE "public"."pos_payment_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_payment_devices" TO "service_role";



GRANT ALL ON TABLE "public"."print_jobs" TO "anon";
GRANT ALL ON TABLE "public"."print_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."print_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."sale_delivery_events" TO "anon";
GRANT ALL ON TABLE "public"."sale_delivery_events" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_delivery_events" TO "service_role";



GRANT ALL ON TABLE "public"."sale_delivery_links" TO "anon";
GRANT ALL ON TABLE "public"."sale_delivery_links" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_delivery_links" TO "service_role";



GRANT ALL ON TABLE "public"."sale_documents" TO "anon";
GRANT ALL ON TABLE "public"."sale_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_documents" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sale_payments" TO "anon";
GRANT ALL ON TABLE "public"."sale_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_payments" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."staff_module_access" TO "anon";
GRANT ALL ON TABLE "public"."staff_module_access" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_module_access" TO "service_role";



GRANT ALL ON TABLE "public"."stock_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."storefront_domains" TO "anon";
GRANT ALL ON TABLE "public"."storefront_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."storefront_domains" TO "service_role";



GRANT ALL ON TABLE "public"."storefront_settings" TO "anon";
GRANT ALL ON TABLE "public"."storefront_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."storefront_settings" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_order_items" TO "anon";
GRANT ALL ON TABLE "public"."supplier_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_orders" TO "anon";
GRANT ALL ON TABLE "public"."supplier_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_orders" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_payables" TO "anon";
GRANT ALL ON TABLE "public"."supplier_payables" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_payables" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_payment_accounts" TO "anon";
GRANT ALL ON TABLE "public"."supplier_payment_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_payment_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_payments" TO "anon";
GRANT ALL ON TABLE "public"."supplier_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_payments" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_products" TO "anon";
GRANT ALL ON TABLE "public"."supplier_products" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_products" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."user_active_orgs" TO "anon";
GRANT ALL ON TABLE "public"."user_active_orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_active_orgs" TO "service_role";



GRANT ALL ON TABLE "public"."v_audit_log_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_audit_log_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_audit_log_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_branches_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_branches_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_branches_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_cashbox_session_current" TO "anon";
GRANT ALL ON TABLE "public"."v_cashbox_session_current" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cashbox_session_current" TO "service_role";



GRANT ALL ON TABLE "public"."v_dashboard_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_dashboard_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dashboard_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_data_onboarding_tasks" TO "anon";
GRANT ALL ON TABLE "public"."v_data_onboarding_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."v_data_onboarding_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."v_expiration_batch_detail" TO "anon";
GRANT ALL ON TABLE "public"."v_expiration_batch_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expiration_batch_detail" TO "service_role";



GRANT ALL ON TABLE "public"."v_expiration_waste_detail" TO "anon";
GRANT ALL ON TABLE "public"."v_expiration_waste_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expiration_waste_detail" TO "service_role";



GRANT ALL ON TABLE "public"."v_expiration_waste_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_expiration_waste_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expiration_waste_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_expirations_due" TO "anon";
GRANT ALL ON TABLE "public"."v_expirations_due" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expirations_due" TO "service_role";



GRANT ALL ON TABLE "public"."v_expirations_expired" TO "anon";
GRANT ALL ON TABLE "public"."v_expirations_expired" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expirations_expired" TO "service_role";



GRANT ALL ON TABLE "public"."v_online_orders_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_online_orders_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_online_orders_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_order_detail_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_order_detail_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_order_detail_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_orders_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_orders_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_pos_product_catalog" TO "anon";
GRANT ALL ON TABLE "public"."v_pos_product_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."v_pos_product_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."v_products_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_products_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_products_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_products_incomplete_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_products_incomplete_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_products_incomplete_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_products_typeahead_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_products_typeahead_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_products_typeahead_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_sale_detail_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_sale_detail_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sale_detail_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_sale_fiscal_invoice_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_sale_fiscal_invoice_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sale_fiscal_invoice_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_sales_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_sales_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sales_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_sales_statistics_items" TO "anon";
GRANT ALL ON TABLE "public"."v_sales_statistics_items" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sales_statistics_items" TO "service_role";



GRANT ALL ON TABLE "public"."v_settings_users_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_settings_users_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_settings_users_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_special_order_items_pending" TO "anon";
GRANT ALL ON TABLE "public"."v_special_order_items_pending" TO "authenticated";
GRANT ALL ON TABLE "public"."v_special_order_items_pending" TO "service_role";



GRANT ALL ON TABLE "public"."v_staff_effective_modules" TO "anon";
GRANT ALL ON TABLE "public"."v_staff_effective_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."v_staff_effective_modules" TO "service_role";



GRANT ALL ON TABLE "public"."v_stock_by_branch" TO "anon";
GRANT ALL ON TABLE "public"."v_stock_by_branch" TO "authenticated";
GRANT ALL ON TABLE "public"."v_stock_by_branch" TO "service_role";



GRANT ALL ON TABLE "public"."v_superadmin_org_detail" TO "anon";
GRANT ALL ON TABLE "public"."v_superadmin_org_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."v_superadmin_org_detail" TO "service_role";



GRANT ALL ON TABLE "public"."v_superadmin_orgs" TO "anon";
GRANT ALL ON TABLE "public"."v_superadmin_orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."v_superadmin_orgs" TO "service_role";



GRANT ALL ON TABLE "public"."v_supplier_detail_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_supplier_detail_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_supplier_detail_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_supplier_payables_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_supplier_payables_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_supplier_payables_admin" TO "service_role";



GRANT ALL ON TABLE "public"."v_supplier_product_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."v_supplier_product_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_supplier_product_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."v_suppliers_admin" TO "anon";
GRANT ALL ON TABLE "public"."v_suppliers_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."v_suppliers_admin" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







