-- ============================================================================
-- NODUX - Fiscal Core Base (AFIP / ARCA)
-- File: supabase/migrations/20260308133000_fiscal_core.sql
-- Version: v0.1
-- ============================================================================
--
-- Objetivo:
--   Base estructural para servicio fiscal AFIP / ARCA en NODUX.
--
-- Alcance:
--   - fiscal_credentials
--   - points_of_sale
--   - fiscal_sequences
--   - sale_documents
--   - invoice_jobs
--   - invoices
--   - invoice_events
--   - print_jobs
--
-- Notas:
--   1. Esta migración asume que ya existe extensión pgcrypto.
--   2. tenant_id / location_id / sale_id quedan como uuid sin FK estricta
--      para no acoplar esta base a nombres exactos de tablas preexistentes.
--   3. Luego podés agregar FKs concretas en una migración posterior.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Updated at helper
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Enum-like checks via domains are avoided to keep migration portable.
-- We use text columns + check constraints for flexibility.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- fiscal_credentials
-- ----------------------------------------------------------------------------
-- Credenciales fiscales por tenant y ambiente.
-- Guarda metadata del certificado y private key cifrada.
-- NO guardar private key en texto plano.
-- ----------------------------------------------------------------------------

create table if not exists public.fiscal_credentials (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null,
  environment text not null,
  taxpayer_cuit varchar(11) not null,

  alias text,
  certificate_pem text not null,
  encrypted_private_key text not null,
  encryption_key_reference text not null,

  wsaa_service_name text not null default 'wsfe',
  wsfe_service_name text not null default 'wsfe',

  status text not null default 'pending',

  last_ta_obtained_at timestamptz,
  ta_expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fiscal_credentials_environment_check
    check (environment in ('homo', 'prod')),

  constraint fiscal_credentials_status_check
    check (status in ('pending', 'active', 'inactive', 'revoked')),

  constraint fiscal_credentials_taxpayer_cuit_check
    check (taxpayer_cuit ~ '^[0-9]{11}$')
);

create unique index if not exists fiscal_credentials_tenant_env_cuit_uidx
  on public.fiscal_credentials (tenant_id, environment, taxpayer_cuit);

create index if not exists fiscal_credentials_tenant_idx
  on public.fiscal_credentials (tenant_id);

create index if not exists fiscal_credentials_env_status_idx
  on public.fiscal_credentials (environment, status);

create trigger trg_fiscal_credentials_set_updated_at
before update on public.fiscal_credentials
for each row
execute function public.set_updated_at();

comment on table public.fiscal_credentials is
'Credenciales fiscales por tenant y ambiente para WSAA/WSFEv1.';

comment on column public.fiscal_credentials.encrypted_private_key is
'Private key cifrada. Nunca guardar en texto plano.';

-- ----------------------------------------------------------------------------
-- points_of_sale
-- ----------------------------------------------------------------------------
-- Punto de venta fiscal por tenant / sucursal / ambiente.
-- ----------------------------------------------------------------------------

create table if not exists public.points_of_sale (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null,
  location_id uuid,
  environment text not null,

  pto_vta integer not null,
  description text,
  invoice_mode text not null default 'sync',
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint points_of_sale_environment_check
    check (environment in ('homo', 'prod')),

  constraint points_of_sale_invoice_mode_check
    check (invoice_mode in ('sync', 'async')),

  constraint points_of_sale_status_check
    check (status in ('active', 'inactive')),

  constraint points_of_sale_pto_vta_check
    check (pto_vta > 0)
);

create unique index if not exists points_of_sale_tenant_env_pto_vta_uidx
  on public.points_of_sale (tenant_id, environment, pto_vta);

create index if not exists points_of_sale_tenant_location_idx
  on public.points_of_sale (tenant_id, location_id);

create trigger trg_points_of_sale_set_updated_at
before update on public.points_of_sale
for each row
execute function public.set_updated_at();

comment on table public.points_of_sale is
'Puntos de venta fiscales habilitados por tenant / sucursal / ambiente.';

-- ----------------------------------------------------------------------------
-- fiscal_sequences
-- ----------------------------------------------------------------------------
-- Control de numeración fiscal por tenant + ambiente + punto de venta + tipo.
-- ----------------------------------------------------------------------------

create table if not exists public.fiscal_sequences (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null,
  environment text not null,
  pto_vta integer not null,
  cbte_tipo integer not null,

  last_local_reserved bigint not null default 0,
  last_arca_confirmed bigint not null default 0,

  status text not null default 'healthy',
  last_reconciled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fiscal_sequences_environment_check
    check (environment in ('homo', 'prod')),

  constraint fiscal_sequences_status_check
    check (status in ('healthy', 'pending_reconcile', 'blocked')),

  constraint fiscal_sequences_pto_vta_check
    check (pto_vta > 0),

  constraint fiscal_sequences_cbte_tipo_check
    check (cbte_tipo > 0),

  constraint fiscal_sequences_local_reserved_nonnegative_check
    check (last_local_reserved >= 0),

  constraint fiscal_sequences_arca_confirmed_nonnegative_check
    check (last_arca_confirmed >= 0)
);

create unique index if not exists fiscal_sequences_domain_uidx
  on public.fiscal_sequences (tenant_id, environment, pto_vta, cbte_tipo);

create index if not exists fiscal_sequences_status_idx
  on public.fiscal_sequences (tenant_id, environment, status);

create trigger trg_fiscal_sequences_set_updated_at
before update on public.fiscal_sequences
for each row
execute function public.set_updated_at();

comment on table public.fiscal_sequences is
'Secuencias fiscales por tenant/ambiente/punto de venta/tipo de comprobante.';

-- ----------------------------------------------------------------------------
-- sale_documents
-- ----------------------------------------------------------------------------
-- Solicitud de documento asociada a una venta interna.
-- Una venta puede tener documento fiscal, ticket interno, receipt, etc.
-- ----------------------------------------------------------------------------

create table if not exists public.sale_documents (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null,
  sale_id uuid not null,

  document_kind text not null,
  status text not null default 'requested',

  requested_by_user_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sale_documents_document_kind_check
    check (document_kind in ('fiscal_invoice', 'receipt', 'internal_ticket')),

  constraint sale_documents_status_check
    check (status in ('requested', 'processing', 'completed', 'failed'))
);

create index if not exists sale_documents_tenant_sale_idx
  on public.sale_documents (tenant_id, sale_id);

create index if not exists sale_documents_status_idx
  on public.sale_documents (tenant_id, status);

create trigger trg_sale_documents_set_updated_at
before update on public.sale_documents
for each row
execute function public.set_updated_at();

comment on table public.sale_documents is
'Solicitudes de documentos derivados de una venta.';

-- ----------------------------------------------------------------------------
-- invoice_jobs
-- ----------------------------------------------------------------------------
-- Job técnico de autorización fiscal.
-- Es el agregado operativo del proceso AFIP / ARCA.
-- ----------------------------------------------------------------------------

create table if not exists public.invoice_jobs (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null,
  sale_id uuid not null,
  sale_document_id uuid not null references public.sale_documents(id) on delete restrict,

  environment text not null,
  point_of_sale_id uuid references public.points_of_sale(id) on delete restrict,

  pto_vta integer not null,
  cbte_tipo integer not null,
  cbte_nro bigint,

  job_status text not null default 'pending',
  attempt_count integer not null default 0,

  last_error_code text,
  last_error_message text,

  requested_payload_json jsonb,
  response_payload_json jsonb,

  correlation_id uuid not null default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  authorized_at timestamptz,

  constraint invoice_jobs_environment_check
    check (environment in ('homo', 'prod')),

  constraint invoice_jobs_job_status_check
    check (job_status in (
      'pending',
      'reserved',
      'authorizing',
      'authorized',
      'rejected',
      'pending_reconcile',
      'render_pending',
      'completed',
      'failed'
    )),

  constraint invoice_jobs_attempt_count_check
    check (attempt_count >= 0),

  constraint invoice_jobs_pto_vta_check
    check (pto_vta > 0),

  constraint invoice_jobs_cbte_tipo_check
    check (cbte_tipo > 0),

  constraint invoice_jobs_cbte_nro_check
    check (cbte_nro is null or cbte_nro > 0)
);

create unique index if not exists invoice_jobs_tenant_env_pto_tipo_nro_uidx
  on public.invoice_jobs (tenant_id, environment, pto_vta, cbte_tipo, cbte_nro)
  where cbte_nro is not null;

create index if not exists invoice_jobs_sale_idx
  on public.invoice_jobs (tenant_id, sale_id);

create index if not exists invoice_jobs_status_idx
  on public.invoice_jobs (tenant_id, environment, job_status);

create index if not exists invoice_jobs_correlation_idx
  on public.invoice_jobs (correlation_id);

create trigger trg_invoice_jobs_set_updated_at
before update on public.invoice_jobs
for each row
execute function public.set_updated_at();

comment on table public.invoice_jobs is
'Job operativo de autorización fiscal AFIP / ARCA.';

-- ----------------------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------------------
-- Factura / comprobante fiscal resultante.
-- Debe ser inmutable a nivel de negocio una vez autorizado.
-- ----------------------------------------------------------------------------

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null,
  sale_id uuid not null,
  invoice_job_id uuid not null references public.invoice_jobs(id) on delete restrict,

  environment text not null,
  point_of_sale_id uuid references public.points_of_sale(id) on delete restrict,

  pto_vta integer not null,
  cbte_tipo integer not null,
  cbte_nro bigint not null,

  doc_tipo integer not null,
  doc_nro bigint not null default 0,

  currency varchar(3) not null default 'PES',
  currency_rate numeric(18,6) not null default 1,

  imp_total numeric(18,2) not null,
  imp_neto numeric(18,2) not null default 0,
  imp_iva numeric(18,2) not null default 0,
  imp_trib numeric(18,2) not null default 0,
  imp_op_ex numeric(18,2) not null default 0,
  imp_tot_conc numeric(18,2) not null default 0,

  cae varchar(32),
  cae_expires_at date,

  result_status text not null default 'unknown',

  afip_observations_json jsonb,
  afip_events_json jsonb,
  qr_payload_json jsonb,

  pdf_storage_path text,
  ticket_storage_path text,

  raw_request_json jsonb,
  raw_response_json jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint invoices_environment_check
    check (environment in ('homo', 'prod')),

  constraint invoices_result_status_check
    check (result_status in ('authorized', 'rejected', 'void', 'unknown')),

  constraint invoices_currency_check
    check (currency ~ '^[A-Z]{3}$'),

  constraint invoices_currency_rate_check
    check (currency_rate > 0),

  constraint invoices_pto_vta_check
    check (pto_vta > 0),

  constraint invoices_cbte_tipo_check
    check (cbte_tipo > 0),

  constraint invoices_cbte_nro_check
    check (cbte_nro > 0),

  constraint invoices_doc_tipo_check
    check (doc_tipo >= 0),

  constraint invoices_doc_nro_check
    check (doc_nro >= 0),

  constraint invoices_imp_total_nonnegative_check
    check (imp_total >= 0),

  constraint invoices_imp_neto_nonnegative_check
    check (imp_neto >= 0),

  constraint invoices_imp_iva_nonnegative_check
    check (imp_iva >= 0),

  constraint invoices_imp_trib_nonnegative_check
    check (imp_trib >= 0),

  constraint invoices_imp_op_ex_nonnegative_check
    check (imp_op_ex >= 0),

  constraint invoices_imp_tot_conc_nonnegative_check
    check (imp_tot_conc >= 0)
);

create unique index if not exists invoices_invoice_job_uidx
  on public.invoices (invoice_job_id);

create unique index if not exists invoices_tenant_env_pto_tipo_nro_uidx
  on public.invoices (tenant_id, environment, pto_vta, cbte_tipo, cbte_nro);

create index if not exists invoices_sale_idx
  on public.invoices (tenant_id, sale_id);

create index if not exists invoices_result_status_idx
  on public.invoices (tenant_id, environment, result_status);

create index if not exists invoices_cae_idx
  on public.invoices (cae);

create trigger trg_invoices_set_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

comment on table public.invoices is
'Comprobantes fiscales autorizados o persistidos con estado final.';

-- ----------------------------------------------------------------------------
-- invoice_events
-- ----------------------------------------------------------------------------
-- Historial de eventos del proceso fiscal.
-- ----------------------------------------------------------------------------

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null,
  invoice_job_id uuid not null references public.invoice_jobs(id) on delete cascade,

  event_type text not null,
  event_payload_json jsonb,

  created_at timestamptz not null default now()
);

create index if not exists invoice_events_job_idx
  on public.invoice_events (invoice_job_id, created_at);

create index if not exists invoice_events_tenant_type_idx
  on public.invoice_events (tenant_id, event_type, created_at);

comment on table public.invoice_events is
'Eventos auditables del pipeline fiscal.';

-- ----------------------------------------------------------------------------
-- print_jobs
-- ----------------------------------------------------------------------------
-- Cola de impresión / render físico.
-- ----------------------------------------------------------------------------

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null,
  invoice_id uuid not null references public.invoices(id) on delete cascade,

  printer_target text,
  format text not null default 'escpos',
  status text not null default 'pending',

  attempt_count integer not null default 0,
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint print_jobs_format_check
    check (format in ('escpos', 'pdf', 'image')),

  constraint print_jobs_status_check
    check (status in ('pending', 'dispatched', 'completed', 'failed')),

  constraint print_jobs_attempt_count_check
    check (attempt_count >= 0)
);

create index if not exists print_jobs_invoice_idx
  on public.print_jobs (invoice_id);

create index if not exists print_jobs_tenant_status_idx
  on public.print_jobs (tenant_id, status);

create trigger trg_print_jobs_set_updated_at
before update on public.print_jobs
for each row
execute function public.set_updated_at();

comment on table public.print_jobs is
'Cola de impresión y reimpresión de comprobantes.';

-- ----------------------------------------------------------------------------
-- Useful comments on key operational columns
-- ----------------------------------------------------------------------------

comment on column public.invoice_jobs.cbte_nro is
'Número de comprobante reservado o confirmado. No reutilizar si el estado es incierto.';

comment on column public.invoice_jobs.requested_payload_json is
'Payload interno normalizado previo a request SOAP.';

comment on column public.invoice_jobs.response_payload_json is
'Respuesta cruda o normalizada del proveedor fiscal.';

comment on column public.invoices.raw_request_json is
'Request fiscal persistido para auditoría técnica.';

comment on column public.invoices.raw_response_json is
'Response fiscal persistido para auditoría técnica.';

-- ----------------------------------------------------------------------------
-- RLS enablement
-- ----------------------------------------------------------------------------
-- Se habilita RLS pero las policies quedan para una migración posterior,
-- ya que dependen del modelo exacto de auth / tenant context de NODUX.
-- ----------------------------------------------------------------------------

alter table public.fiscal_credentials enable row level security;
alter table public.points_of_sale enable row level security;
alter table public.fiscal_sequences enable row level security;
alter table public.sale_documents enable row level security;
alter table public.invoice_jobs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_events enable row level security;
alter table public.print_jobs enable row level security;

-- ----------------------------------------------------------------------------
-- Optional stub policies for service role only
-- ----------------------------------------------------------------------------
-- Ajustalas según tu modelo real. Esto evita exposición accidental inmediata.
-- ----------------------------------------------------------------------------

create policy if not exists fiscal_credentials_service_role_all
on public.fiscal_credentials
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists points_of_sale_service_role_all
on public.points_of_sale
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists fiscal_sequences_service_role_all
on public.fiscal_sequences
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists sale_documents_service_role_all
on public.sale_documents
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists invoice_jobs_service_role_all
on public.invoice_jobs
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists invoices_service_role_all
on public.invoices
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists invoice_events_service_role_all
on public.invoice_events
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists print_jobs_service_role_all
on public.print_jobs
as permissive
for all
to service_role
using (true)
with check (true);

-- ----------------------------------------------------------------------------
-- Seed-like comments for future use
-- ----------------------------------------------------------------------------

comment on schema public is
'NODUX public schema with fiscal core base for AFIP / ARCA integration.';

commit;

Qué resuelve esta migración

Con esto ya tenés base para:

guardar certificado y private key cifrada

modelar puntos de venta por tenant

reservar secuencias por tenant + environment + pto_vta + cbte_tipo

crear jobs fiscales

persistir factura autorizada

guardar eventos del proceso

manejar impresión y reimpresión

activar RLS desde el día 0