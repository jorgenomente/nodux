07 — SQL and API Contracts: Taxpayer Registry + Factura A POS

Estado: Ready for implementation
Ámbito: DB / API / POS / Fiscal Worker
Dependencia previa:

05-taxpayer-registry-and-invoice-class-resolution.md

06-implementation-plan-taxpayer-registry-and-factura-a-pos.md

Objetivo: definir las migraciones SQL, contratos API, tipos TS y validaciones para implementar el lookup por CUIT, autocompletado fiscal del receptor y resolución de Factura A en NODUX.

1. Objetivo de este documento

Este documento aterriza la implementación en cuatro capas:

persistencia SQL

contratos REST internos

tipos de dominio TypeScript

reglas de validación y estados operativos

El sistema debe permitir:

consultar un receptor por CUIT

autocompletar razón social y condición fiscal

resolver la clase de comprobante sugerida

bloquear emisión de Factura A cuando no corresponda

persistir snapshot fiscal al emitir

2. Contexto normativo y técnico

La emisión con WSFE requiere autenticación previa mediante WSAA con Token, Sign y Cuit, y el manual FE v4.0 documenta tanto FECAESolicitar como CondicionIVAReceptorId y el método FEParamGetCondicionIvaReceptor para recuperar los valores válidos de condición frente al IVA del receptor.

Además, ARCA expone servicios de padrón/constancia para consultar datos del contribuyente por CUIT, lo que permite autocompletar datos del receptor antes de emitir.

3. Diseño SQL
   3.1 Tabla de cache de receptor fiscal
   create table if not exists fiscal_taxpayer_cache (
   cuit text primary key,
   razon_social text,
   nombre_fantasia text,
   estado_registral text not null,
   condicion_iva text,
   condicion_iva_receptor_id int,
   clase_comprobante_sugerida text,
   domicilio_fiscal jsonb,
   impuestos jsonb not null default '[]'::jsonb,
   actividades jsonb not null default '[]'::jsonb,
   observaciones jsonb not null default '[]'::jsonb,
   source text not null,
   environment text not null check (environment in ('homo', 'prod')),
   raw_response jsonb not null,
   fetched_at timestamptz not null default now(),
   expires_at timestamptz not null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
   );
   Índices sugeridos
   create index if not exists idx_fiscal_taxpayer_cache_expires_at
   on fiscal_taxpayer_cache (expires_at);

create index if not exists idx_fiscal_taxpayer_cache_environment
on fiscal_taxpayer_cache (environment);
3.2 Tabla de log de consultas fiscales
create table if not exists fiscal_taxpayer_lookup_log (
id uuid primary key default gen_random_uuid(),
tenant_id uuid not null,
org_id uuid not null,
requested_by_user_id uuid,
cuit text not null,
source text,
environment text not null check (environment in ('homo', 'prod')),
result_status text not null,
from_cache boolean not null default false,
degraded boolean not null default false,
warnings jsonb not null default '[]'::jsonb,
raw_response jsonb,
error_code text,
error_message text,
created_at timestamptz not null default now()
);
Índices sugeridos
create index if not exists idx_fiscal_taxpayer_lookup_log_cuit
on fiscal_taxpayer_lookup_log (cuit);

create index if not exists idx_fiscal_taxpayer_lookup_log_tenant_org
on fiscal_taxpayer_lookup_log (tenant_id, org_id);

create index if not exists idx_fiscal_taxpayer_lookup_log_created_at
on fiscal_taxpayer_lookup_log (created_at desc);
3.3 Tabla de referencia de condición IVA receptor

Esta tabla cachea el catálogo devuelto por FEParamGetCondicionIvaReceptor. El manual FE v4.0 incorpora ese método precisamente para recuperar los identificadores de condición frente al IVA del receptor.

create table if not exists fiscal_reference_condicion_iva_receptor (
environment text not null check (environment in ('homo', 'prod')),
id int not null,
descripcion text not null,
cmp_clase text,
active boolean not null default true,
raw_response jsonb not null,
fetched_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
primary key (environment, id)
);
Índices sugeridos
create index if not exists idx_fiscal_reference_condicion_iva_receptor_cmp_clase
on fiscal_reference_condicion_iva_receptor (cmp_clase);
3.4 Snapshot fiscal en documento emitido
alter table fiscal_documents
add column if not exists receiver_cuit text,
add column if not exists receiver_razon_social_snapshot text,
add column if not exists receiver_condicion_iva_snapshot text,
add column if not exists receiver_condicion_iva_receptor_id_snapshot int,
add column if not exists receiver_document_class_snapshot text,
add column if not exists receiver_domicilio_snapshot jsonb,
add column if not exists receiver_padron_source_snapshot text,
add column if not exists receiver_padron_raw_snapshot jsonb; 4. Trigger de actualización de updated_at
create or replace function fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
new.updated_at = now();
return new;
end;

$$
;
drop trigger if exists trg_fiscal_taxpayer_cache_updated_at on fiscal_taxpayer_cache;
create trigger trg_fiscal_taxpayer_cache_updated_at
before update on fiscal_taxpayer_cache
for each row execute function fn_set_updated_at();

drop trigger if exists trg_fiscal_reference_condicion_iva_receptor_updated_at on fiscal_reference_condicion_iva_receptor;
create trigger trg_fiscal_reference_condicion_iva_receptor_updated_at
before update on fiscal_reference_condicion_iva_receptor
for each row execute function fn_set_updated_at();
5. Tipos TypeScript de dominio
5.1 TaxpayerSnapshot
export type TaxpayerSnapshot = {
  cuit: string
  razonSocial: string | null
  nombreFantasia?: string | null
  estadoRegistral: 'ACTIVO' | 'INACTIVO' | 'NO_ENCONTRADO' | 'ERROR'
  condicionIVA: string | null
  condicionIVAReceptorId: number | null
  claseComprobanteSugerida: 'A' | 'B' | 'C' | 'M' | null
  domicilioFiscal: {
    direccion: string | null
    localidad: string | null
    provincia: string | null
  } | null
  impuestos: string[]
  actividades: string[]
  observaciones: string[]
  source: 'padron_a5' | 'constancia_inscripcion'
  environment: 'homo' | 'prod'
  fetchedAt: string
  expiresAt: string
  raw: unknown
}
5.2 TaxpayerLookupResult
export type TaxpayerLookupResult = {
  found: boolean
  fromCache: boolean
  degraded: boolean
  warnings: string[]
  taxpayer: TaxpayerSnapshot | null
}
5.3 DocumentClassResolution
export type DocumentClass = 'A' | 'B' | 'C' | 'M'

export type DocumentClassResolution = {
  requestedClass: DocumentClass
  resolvedClass: DocumentClass | null
  allowed: boolean
  warnings: string[]
  blockingReason: string | null
}
6. Zod schemas sugeridos
6.1 CUIT param
import { z } from 'zod'

export const cuitSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$/, 'CUIT must contain exactly 11 digits')
6.2 Lookup response
export const taxpayerSnapshotSchema = z.object({
  cuit: z.string(),
  razonSocial: z.string().nullable(),
  nombreFantasia: z.string().nullable().optional(),
  estadoRegistral: z.enum(['ACTIVO', 'INACTIVO', 'NO_ENCONTRADO', 'ERROR']),
  condicionIVA: z.string().nullable(),
  condicionIVAReceptorId: z.number().int().nullable(),
  claseComprobanteSugerida: z.enum(['A', 'B', 'C', 'M']).nullable(),
  domicilioFiscal: z.object({
    direccion: z.string().nullable(),
    localidad: z.string().nullable(),
    provincia: z.string().nullable()
  }).nullable(),
  impuestos: z.array(z.string()),
  actividades: z.array(z.string()),
  observaciones: z.array(z.string()),
  source: z.enum(['padron_a5', 'constancia_inscripcion']),
  environment: z.enum(['homo', 'prod']),
  fetchedAt: z.string(),
  expiresAt: z.string()
})

export const taxpayerLookupResultSchema = z.object({
  found: z.boolean(),
  fromCache: z.boolean(),
  degraded: z.boolean(),
  warnings: z.array(z.string()),
  taxpayer: taxpayerSnapshotSchema.nullable()
})
6.3 Resolve request/response
export const resolveDocumentClassRequestSchema = z.object({
  receiverCuit: cuitSchema,
  requestedClass: z.enum(['A', 'B', 'C', 'M'])
})

export const resolveDocumentClassResponseSchema = z.object({
  requestedClass: z.enum(['A', 'B', 'C', 'M']),
  resolvedClass: z.enum(['A', 'B', 'C', 'M']).nullable(),
  allowed: z.boolean(),
  warnings: z.array(z.string()),
  blockingReason: z.string().nullable()
})
7. Contratos API internos
7.1 GET /api/fiscal/taxpayer/:cuit
Request params
type GetTaxpayerParams = {
  cuit: string
}
Query params sugeridos
type GetTaxpayerQuery = {
  environment?: 'homo' | 'prod'
}
Response 200
{
  "found": true,
  "fromCache": false,
  "degraded": false,
  "warnings": [],
  "taxpayer": {
    "cuit": "30712345678",
    "razonSocial": "EMPRESA DEMO SA",
    "nombreFantasia": null,
    "estadoRegistral": "ACTIVO",
    "condicionIVA": "IVA RESPONSABLE INSCRIPTO",
    "condicionIVAReceptorId": 1,
    "claseComprobanteSugerida": "A",
    "domicilioFiscal": {
      "direccion": "CALLE DEMO 123",
      "localidad": "CABA",
      "provincia": "BUENOS AIRES"
    },
    "impuestos": ["IVA", "GANANCIAS"],
    "actividades": ["SERVICIOS"],
    "observaciones": [],
    "source": "padron_a5",
    "environment": "prod",
    "fetchedAt": "2026-03-09T12:00:00.000Z",
    "expiresAt": "2026-03-10T12:00:00.000Z"
  }
}
Response 404
{
  "found": false,
  "fromCache": false,
  "degraded": false,
  "warnings": [],
  "taxpayer": null
}
Response 422
{
  "error": {
    "code": "INVALID_CUIT",
    "message": "El CUIT ingresado no es válido."
  }
}
Response 503
{
  "error": {
    "code": "REGISTRY_UNAVAILABLE",
    "message": "No se pudo consultar ARCA en este momento."
  }
}
7.2 POST /api/fiscal/resolve-document-class
Request
{
  "receiverCuit": "30712345678",
  "requestedClass": "A"
}
Response 200 permitido
{
  "requestedClass": "A",
  "resolvedClass": "A",
  "allowed": true,
  "warnings": [],
  "blockingReason": null
}
Response 200 bloqueado
{
  "requestedClass": "A",
  "resolvedClass": "B",
  "allowed": false,
  "warnings": [
    "El CUIT ingresado no corresponde a un receptor habilitado para Factura A."
  ],
  "blockingReason": "DOCUMENT_CLASS_NOT_ALLOWED"
}
7.3 Payload interno para creación de fiscal job
export type CreateFiscalJobInput = {
  saleId: string
  tenantId: string
  orgId: string
  environment: 'homo' | 'prod'
  requestedDocumentClass: 'A' | 'B' | 'C' | 'M'
  resolvedDocumentClass: 'A' | 'B' | 'C' | 'M'
  receiverSnapshot: {
    cuit: string
    razonSocial: string | null
    condicionIVA: string | null
    condicionIVAReceptorId: number | null
    documentClass: 'A' | 'B' | 'C' | 'M'
    domicilioFiscal: {
      direccion: string | null
      localidad: string | null
      provincia: string | null
    } | null
    source: 'padron_a5' | 'constancia_inscripcion'
    raw: unknown
  }
}
8. Contratos de repositorio
8.1 Taxpayer cache repository
export interface TaxpayerCacheRepository {
  findByCuit(params: {
    cuit: string
    environment: 'homo' | 'prod'
  }): Promise<TaxpayerSnapshot | null>

  upsert(snapshot: TaxpayerSnapshot): Promise<void>

  invalidate(params: {
    cuit: string
    environment: 'homo' | 'prod'
  }): Promise<void>
}
8.2 Lookup log repository
export interface TaxpayerLookupLogRepository {
  insert(input: {
    tenantId: string
    orgId: string
    requestedByUserId?: string
    cuit: string
    source?: string
    environment: 'homo' | 'prod'
    resultStatus: string
    fromCache: boolean
    degraded: boolean
    warnings: string[]
    rawResponse?: unknown
    errorCode?: string
    errorMessage?: string
  }): Promise<void>
}
9. Casos de uso
9.1 LookupTaxpayerUseCase
export interface LookupTaxpayerUseCase {
  execute(input: {
    tenantId: string
    orgId: string
    requestedByUserId?: string
    cuit: string
    environment: 'homo' | 'prod'
    emisorCuit: string
  }): Promise<TaxpayerLookupResult>
}
Reglas

validar CUIT

buscar cache vigente

si hay cache vigente → responder cache

si no hay cache → consultar ARCA

normalizar respuesta

persistir cache

loggear lookup

9.2 ResolveDocumentClassUseCase
export interface ResolveDocumentClassUseCase {
  execute(input: {
    tenantId: string
    orgId: string
    receiverCuit: string
    requestedClass: 'A' | 'B' | 'C' | 'M'
    environment: 'homo' | 'prod'
    emisorCuit: string
  }): Promise<DocumentClassResolution>
}
Reglas

ejecutar lookup

obtener condicionIVAReceptorId

leer catálogo local fiscal_reference_condicion_iva_receptor

resolver clase permitida/sugerida

devolver allowed y blockingReason

10. SQL repository sugerido
10.1 Upsert cache
insert into fiscal_taxpayer_cache (
  cuit,
  razon_social,
  nombre_fantasia,
  estado_registral,
  condicion_iva,
  condicion_iva_receptor_id,
  clase_comprobante_sugerida,
  domicilio_fiscal,
  impuestos,
  actividades,
  observaciones,
  source,
  environment,
  raw_response,
  fetched_at,
  expires_at
)
values (
  :cuit,
  :razon_social,
  :nombre_fantasia,
  :estado_registral,
  :condicion_iva,
  :condicion_iva_receptor_id,
  :clase_comprobante_sugerida,
  cast(:domicilio_fiscal as jsonb),
  cast(:impuestos as jsonb),
  cast(:actividades as jsonb),
  cast(:observaciones as jsonb),
  :source,
  :environment,
  cast(:raw_response as jsonb),
  :fetched_at,
  :expires_at
)
on conflict (cuit)
do update set
  razon_social = excluded.razon_social,
  nombre_fantasia = excluded.nombre_fantasia,
  estado_registral = excluded.estado_registral,
  condicion_iva = excluded.condicion_iva,
  condicion_iva_receptor_id = excluded.condicion_iva_receptor_id,
  clase_comprobante_sugerida = excluded.clase_comprobante_sugerida,
  domicilio_fiscal = excluded.domicilio_fiscal,
  impuestos = excluded.impuestos,
  actividades = excluded.actividades,
  observaciones = excluded.observaciones,
  source = excluded.source,
  environment = excluded.environment,
  raw_response = excluded.raw_response,
  fetched_at = excluded.fetched_at,
  expires_at = excluded.expires_at,
  updated_at = now();
Nota importante

Si vas a cachear por ambiente, técnicamente conviene clave compuesta (cuit, environment).
Si querés máxima prolijidad, cambiá el PK así:

alter table fiscal_taxpayer_cache drop constraint fiscal_taxpayer_cache_pkey;
alter table fiscal_taxpayer_cache add primary key (cuit, environment);

Ese diseño es mejor que PK solo por cuit.

11. Recomendación de mejora sobre PK

Versión recomendada de tabla:

create table if not exists fiscal_taxpayer_cache (
  cuit text not null,
  environment text not null check (environment in ('homo', 'prod')),
  razon_social text,
  nombre_fantasia text,
  estado_registral text not null,
  condicion_iva text,
  condicion_iva_receptor_id int,
  clase_comprobante_sugerida text,
  domicilio_fiscal jsonb,
  impuestos jsonb not null default '[]'::jsonb,
  actividades jsonb not null default '[]'::jsonb,
  observaciones jsonb not null default '[]'::jsonb,
  source text not null,
  raw_response jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cuit, environment)
);
12. Utilidad de validación de CUIT
export function isValidCuit(cuit: string): boolean {
  if (!/^\d{11}$/.test(cuit)) return false

  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const nums = cuit.split('').map(Number)
  const check = nums[10]

  const acc = mult.reduce((sum, m, i) => sum + nums[i] * m, 0)
  const mod = 11 - (acc % 11)
  const expected = mod === 11 ? 0 : mod === 10 ? 9 : mod

  return check === expected
}
13. Reglas operativas de Factura A
Factura A permitida si:

CUIT válido

lookup exitoso o cache confiable

estado registral compatible

condicionIVAReceptorId resuelta

clase sugerida/resuelta = A

Factura A bloqueada si:

CUIT inválido

no hay datos fiscales del receptor

resolvedClass !== 'A'

padrón caído y no hay cache confiable

Factura B sugerida si:

el receptor no corresponde para A

existe resolución clara hacia B

14. Estados UI recomendados
export type TaxpayerLookupUiState =
  | 'idle'
  | 'invalid_cuit'
  | 'searching'
  | 'found'
  | 'not_found'
  | 'registry_error'
  | 'degraded'
  | 'blocked'
Ejemplo de DTO UI
export type PosFiscalReceiverState = {
  lookupState: TaxpayerLookupUiState
  cuit: string
  razonSocial: string
  condicionIVA: string
  suggestedClass: 'A' | 'B' | 'C' | 'M' | null
  warnings: string[]
  canEmitRequestedClass: boolean
}
15. Integración con builder WSFE

El request de FECAESolicitar incluye CondicionIVAReceptorId en FE v4.0.

Adaptación sugerida
type BuildFeCAERequestInput = {
  auth: {
    token: string
    sign: string
    cuit: number
  }
  cab: {
    cantReg: number
    ptoVta: number
    cbteTipo: number
  }
  det: {
    concepto: number
    docTipo: number
    docNro: number
    cbteDesde: number
    cbteHasta: number
    cbteFch: string
    impTotal: number
    impTotConc: number
    impNeto: number
    impOpEx: number
    impTrib: number
    impIVA: number
    monId: string
    monCotiz?: number
    condicionIVAReceptorId?: number | null
  }
}
Regla

condicionIVAReceptorId debe venir del snapshot fiscal persistido, no del frontend.

16. Errores internos recomendados
export type FiscalTaxpayerErrorCode =
  | 'INVALID_CUIT'
  | 'TAXPAYER_NOT_FOUND'
  | 'REGISTRY_UNAVAILABLE'
  | 'DOCUMENT_CLASS_NOT_ALLOWED'
  | 'MISSING_CONDICION_IVA_RECEPTOR_ID'
  | 'STALE_REGISTRY_DATA'
Mensajes operativos
export const fiscalTaxpayerMessages = {
  INVALID_CUIT: 'El CUIT ingresado no es válido.',
  TAXPAYER_NOT_FOUND: 'No se encontró información fiscal para ese CUIT.',
  REGISTRY_UNAVAILABLE: 'No se pudo consultar ARCA en este momento.',
  DOCUMENT_CLASS_NOT_ALLOWED: 'El receptor no está habilitado para ese tipo de comprobante.',
  MISSING_CONDICION_IVA_RECEPTOR_ID: 'Falta la condición frente al IVA del receptor.',
  STALE_REGISTRY_DATA: 'La información fiscal disponible está vencida.'
}
17. Feature flags
export type FiscalFeatureFlags = {
  taxpayerLookupEnabled: boolean
  taxpayerLookupRequiredForFacturaA: boolean
  documentClassResolutionEnabled: boolean
  blockInvalidFacturaA: boolean
  allowDegradedCacheForFacturaA: boolean
}

Valores sugeridos para rollout inicial:

export const defaultFiscalFeatureFlags: FiscalFeatureFlags = {
  taxpayerLookupEnabled: true,
  taxpayerLookupRequiredForFacturaA: true,
  documentClassResolutionEnabled: true,
  blockInvalidFacturaA: true,
  allowDegradedCacheForFacturaA: false
}
18. Migración sugerida final

Archivo sugerido:

supabase/migrations/20260309190000_082_fiscal_taxpayer_registry_base.sql

Contenido sugerido:

begin;

create table if not exists fiscal_taxpayer_cache (
  cuit text not null,
  environment text not null check (environment in ('homo', 'prod')),
  razon_social text,
  nombre_fantasia text,
  estado_registral text not null,
  condicion_iva text,
  condicion_iva_receptor_id int,
  clase_comprobante_sugerida text,
  domicilio_fiscal jsonb,
  impuestos jsonb not null default '[]'::jsonb,
  actividades jsonb not null default '[]'::jsonb,
  observaciones jsonb not null default '[]'::jsonb,
  source text not null,
  raw_response jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cuit, environment)
);

create table if not exists fiscal_taxpayer_lookup_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  org_id uuid not null,
  requested_by_user_id uuid,
  cuit text not null,
  source text,
  environment text not null check (environment in ('homo', 'prod')),
  result_status text not null,
  from_cache boolean not null default false,
  degraded boolean not null default false,
  warnings jsonb not null default '[]'::jsonb,
  raw_response jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists fiscal_reference_condicion_iva_receptor (
  environment text not null check (environment in ('homo', 'prod')),
  id int not null,
  descripcion text not null,
  cmp_clase text,
  active boolean not null default true,
  raw_response jsonb not null,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (environment, id)
);

create index if not exists idx_fiscal_taxpayer_cache_expires_at
  on fiscal_taxpayer_cache (expires_at);

create index if not exists idx_fiscal_taxpayer_lookup_log_cuit
  on fiscal_taxpayer_lookup_log (cuit);

create index if not exists idx_fiscal_taxpayer_lookup_log_tenant_org
  on fiscal_taxpayer_lookup_log (tenant_id, org_id);

create index if not exists idx_fiscal_reference_condicion_iva_receptor_cmp_clase
  on fiscal_reference_condicion_iva_receptor (cmp_clase);

alter table fiscal_documents
  add column if not exists receiver_cuit text,
  add column if not exists receiver_razon_social_snapshot text,
  add column if not exists receiver_condicion_iva_snapshot text,
  add column if not exists receiver_condicion_iva_receptor_id_snapshot int,
  add column if not exists receiver_document_class_snapshot text,
  add column if not exists receiver_domicilio_snapshot jsonb,
  add column if not exists receiver_padron_source_snapshot text,
  add column if not exists receiver_padron_raw_snapshot jsonb;

create or replace function fn_set_updated_at()
returns trigger
language plpgsql
as
$$

begin
new.updated_at = now();
return new;
end;

$$
;

drop trigger if exists trg_fiscal_taxpayer_cache_updated_at on fiscal_taxpayer_cache;
create trigger trg_fiscal_taxpayer_cache_updated_at
before update on fiscal_taxpayer_cache
for each row execute function fn_set_updated_at();

drop trigger if exists trg_fiscal_reference_condicion_iva_receptor_updated_at on fiscal_reference_condicion_iva_receptor;
create trigger trg_fiscal_reference_condicion_iva_receptor_updated_at
before update on fiscal_reference_condicion_iva_receptor
for each row execute function fn_set_updated_at();

commit;
19. Criterios de aceptación de este documento

Este contrato queda listo cuando:

existe una migración única ejecutable

existen schemas TS/Zod alineados con SQL

existe endpoint lookup por CUIT

existe endpoint de resolución de clase

existe snapshot persistido en fiscal_documents

el builder fiscal puede tomar CondicionIVAReceptorId
$$
