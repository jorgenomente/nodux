Estado: Ready for implementation
Ámbito: POS / Sales API / Fiscal Service / ARCA
Dependencia previa: 05-taxpayer-registry-and-invoice-class-resolution.md
Objetivo: convertir el lookup por CUIT, la resolución de clase de comprobante y la emisión de Factura A en un flujo implementable, incremental y seguro para NODUX.

1. Objetivo de implementación

Construir un flujo de POS donde el operador pueda:

seleccionar emisión fiscal

ingresar CUIT del receptor

obtener autocompletado fiscal

ver sugerencia de tipo de comprobante

emitir Factura A cuando corresponda

bloquear o degradar el flujo cuando no corresponda

El resultado esperado es una experiencia operativa simple:

Elegir comprobante
→ ingresar CUIT
→ autocompletar datos
→ confirmar
→ emitir 2. Alcance de esta fase

Esta fase incluye:

lookup por CUIT desde backend

cache local de datos fiscales del receptor

resolución de clase de comprobante sugerida

integración de CondicionIVAReceptorId

integración con POS

snapshot fiscal en documento emitido

observabilidad mínima

Esta fase no incluye:

override avanzado multi-rol con workflow

sincronización batch masiva de padrones

scoring de riesgo fiscal

soporte de todos los casos especiales de regímenes opcionales

3. Resultado funcional esperado
   3.1 Caso feliz
   Operador pide Factura A
   → ingresa CUIT
   → sistema encuentra receptor
   → autocompleta razón social
   → sistema resuelve que corresponde A
   → operador confirma
   → sistema emite por WSFE
   → ticket/PDF sale con CAE
   3.2 Caso bloqueado
   Operador pide Factura A
   → ingresa CUIT
   → sistema encuentra receptor
   → sistema determina que no corresponde A
   → POS bloquea emisión A
   → sugiere B
   3.3 Caso degradado
   Operador pide Factura A
   → padrón no responde
   → existe cache fresca
   → usar cache y continuar según política
4. Diseño por capas
   4.1 Frontend POS

Responsabilidades:

capturar tipo solicitado

capturar CUIT

consultar backend

mostrar resultado

bloquear o habilitar CTA de emisión

4.2 Sales API

Responsabilidades:

exponer endpoints REST para lookup y resolución

validar request

orquestar caso de uso

no hablar SOAP directamente desde controller

4.3 Taxpayer Registry Module

Responsabilidades:

consultar ARCA

cachear

normalizar

resolver condicionIVAReceptorId

resolver clase sugerida

4.4 Fiscal Service

Responsabilidades:

recibir venta lista para emisión

reservar secuencia fiscal

construir request WSFE

incluir CondicionIVAReceptorId

persistir snapshot + XML + CAE

5. Estructura de carpetas sugerida
   src/modules/fiscal-taxpayer-registry/
   application/
   lookup-taxpayer.use-case.ts
   resolve-document-class.use-case.ts
   refresh-taxpayer-cache.use-case.ts
   domain/
   taxpayer-snapshot.ts
   taxpayer-registry.gateway.ts
   invoice-class-resolver.ts
   taxpayer-cache.repository.ts
   infrastructure/
   arca-padron-a5.client.ts
   arca-constancia.client.ts
   fe-condicion-iva-receptor.client.ts
   taxpayer-normalizer.ts
   taxpayer-cache.sql-repository.ts
   presentation/
   taxpayer.controller.ts
   taxpayer.schemas.ts

Y en fiscal:

src/modules/fiscal/
application/
domain/
infrastructure/
wsaa/
wsfe/ 6. Contratos de dominio
6.1 TaxpayerSnapshot
export type TaxpayerSnapshot = {
cuit: string
razonSocial: string | null
estadoRegistral: 'ACTIVO' | 'INACTIVO' | 'NO_ENCONTRADO' | 'ERROR'
condicionIVA: string | null
condicionIVAReceptorId: number | null
claseComprobanteSugerida: 'A' | 'B' | 'C' | 'M' | null
domicilioFiscal: {
direccion: string | null
localidad: string | null
provincia: string | null
} | null
observaciones: string[]
source: 'padron_a5' | 'constancia_inscripcion'
fetchedAt: string
expiresAt: string
raw: unknown
}
6.2 TaxpayerLookupResult
export type TaxpayerLookupResult = {
found: boolean
taxpayer: TaxpayerSnapshot | null
fromCache: boolean
degraded: boolean
warnings: string[]
}
6.3 DocumentClassResolution
export type DocumentClassResolution = {
requestedClass: 'A' | 'B' | 'C' | 'M'
resolvedClass: 'A' | 'B' | 'C' | 'M' | null
allowed: boolean
warnings: string[]
blockingReason: string | null
} 7. Endpoints internos
7.1 Lookup por CUIT
GET /api/fiscal/taxpayer/:cuit
Response 200
{
"found": true,
"fromCache": false,
"degraded": false,
"warnings": [],
"taxpayer": {
"cuit": "30712345678",
"razonSocial": "EMPRESA DEMO SA",
"estadoRegistral": "ACTIVO",
"condicionIVA": "IVA RESPONSABLE INSCRIPTO",
"condicionIVAReceptorId": 1,
"claseComprobanteSugerida": "A",
"domicilioFiscal": {
"direccion": "CALLE DEMO 123",
"localidad": "CABA",
"provincia": "BUENOS AIRES"
},
"observaciones": [],
"source": "padron_a5",
"fetchedAt": "2026-03-09T12:00:00Z",
"expiresAt": "2026-03-10T12:00:00Z"
}
}
7.2 Resolver clase
POST /api/fiscal/resolve-document-class
Request
{
"receiverCuit": "30712345678",
"requestedClass": "A"
}
Response
{
"requestedClass": "A",
"resolvedClass": "A",
"allowed": true,
"warnings": [],
"blockingReason": null
}
7.3 Crear venta fiscalizable

El contrato de venta debe aceptar snapshot ya resuelto:

{
"saleId": "uuid",
"requestedFiscalDocumentClass": "A",
"receiver": {
"cuit": "30712345678",
"razonSocial": "EMPRESA DEMO SA",
"condicionIVAReceptorId": 1
}
} 8. Esquema de base de datos
8.1 Cache de contribuyente
create table fiscal_taxpayer_cache (
cuit text primary key,
razon_social text,
estado_registral text not null,
condicion_iva text,
condicion_iva_receptor_id int,
clase_comprobante_sugerida text,
domicilio_fiscal jsonb,
observaciones jsonb not null default '[]'::jsonb,
source text not null,
raw_response jsonb not null,
fetched_at timestamptz not null default now(),
expires_at timestamptz not null
);
8.2 Log de consultas
create table fiscal_taxpayer_lookup_log (
id uuid primary key default gen_random_uuid(),
tenant_id uuid not null,
org_id uuid not null,
requested_by_user_id uuid,
cuit text not null,
source text,
result_status text not null,
from_cache boolean not null default false,
degraded boolean not null default false,
warnings jsonb not null default '[]'::jsonb,
created_at timestamptz not null default now()
);
8.3 Snapshot en documento fiscal
alter table fiscal_documents
add column if not exists receiver_cuit text,
add column if not exists receiver_razon_social_snapshot text,
add column if not exists receiver_condicion_iva_snapshot text,
add column if not exists receiver_condicion_iva_receptor_id_snapshot int,
add column if not exists receiver_document_class_snapshot text,
add column if not exists receiver_domicilio_snapshot jsonb,
add column if not exists receiver_padron_source_snapshot text,
add column if not exists receiver_padron_raw_snapshot jsonb; 9. Reglas de cache
9.1 TTL
TTL normal: 24 horas
9.2 Refresh

cache inexistente → consultar ARCA

cache vencida → consultar ARCA

cache fresca → responder cache

cache fresca pero emisión falla por inconsistencia → invalidar y refrescar

9.3 Política de degrade

Si ARCA falla:

si existe cache fresca: devolver cache con degraded=true

si no existe cache: devolver error operativo para A

10. Resolver de clase de comprobante
    10.1 Inputs

requestedClass

taxpayerSnapshot

condicionIVAReceptorId

mapa oficial de FEParamGetCondicionIvaReceptor

10.2 Salida esperada
allowed = true/false
resolvedClass = A/B/C/M/null
warnings = []
blockingReason = null | string
10.3 Política inicial recomendada
Si el operador pide A:

permitir solo si la resolución fiscal devuelve A

si devuelve otra clase, bloquear A

Si el operador pide B:

permitir B si el receptor no califica para A

si el receptor califica para A, permitir según política comercial

Si no hay lookup confiable:

bloquear A

no bloquear B/C según política

11. Casos de uso
    11.1 lookup-taxpayer.use-case.ts

Responsabilidad:

validar CUIT

buscar cache

consultar ARCA si hace falta

normalizar

persistir cache

devolver DTO

Firma sugerida:

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
11.2 resolve-document-class.use-case.ts

Responsabilidad:

asegurar que hay taxpayer lookup

resolver clase sugerida

devolver allowed/bloqueo

11.3 refresh-taxpayer-cache.use-case.ts

Responsabilidad:

fuerza refresh por CUIT

pensado para admin o reintento tras rechazo fiscal

12. Integración con FEParamGetCondicionIvaReceptor
    12.1 Objetivo

No hardcodear de entrada el mapa completo en frontend.
Consumir y cachear la referencia oficial desde WSFE.

12.2 Cache de referencia

Tabla sugerida:

create table fiscal_reference_condicion_iva_receptor (
id int primary key,
descripcion text not null,
cmp_clase text,
active boolean not null default true,
raw_response jsonb not null,
fetched_at timestamptz not null default now()
);
12.3 Job de refresco

refresh diario

refresh on-demand desde admin

ambiente por separado (homo/prod)

13. UI POS — especificación
    13.1 Componentes
    FiscalDocumentPanel
    ├── DocumentClassSelector
    ├── ReceiverCuitInput
    ├── TaxpayerLookupCard
    ├── DocumentResolutionBanner
    └── EmitFiscalDocumentButton
    13.2 Estados del input CUIT

vacío

inválido

consultando

encontrado

no encontrado

error

degradado

13.3 Comportamiento
On blur o botón consultar:

validar formato CUIT

consultar backend

renderizar skeleton corto

mostrar autocompletado

13.4 Mensajes UX
Caso válido para A
CUIT validado. Razón social autocompletada. Se puede emitir Factura A.
Caso inválido para A
El receptor no califica para Factura A. NODUX sugiere Factura B.
Caso degradado
No se pudo consultar ARCA en este momento. Se usará la última información disponible. 14. Integración con flujo de venta
14.1 En checkout

Antes de confirmar venta fiscal A:

sale draft
→ taxpayer lookup
→ class resolution
→ confirm
→ create fiscal job
14.2 Payload al fiscal job
{
"saleId": "uuid",
"tenantId": "uuid",
"orgId": "uuid",
"environment": "prod",
"requestedDocumentClass": "A",
"resolvedDocumentClass": "A",
"receiverSnapshot": {
"cuit": "30712345678",
"razonSocial": "EMPRESA DEMO SA",
"condicionIVA": "IVA RESPONSABLE INSCRIPTO",
"condicionIVAReceptorId": 1,
"documentClass": "A"
}
}
14.3 Regla

El fiscal worker no vuelve a consultar UI state.
Consume snapshot cerrado.

15. Adaptación del request WSFE
    15.1 Builder fiscal

Agregar al builder de FECAESolicitar:

CondicionIVAReceptorId?: number
15.2 Fuente del valor

Debe salir de:

receiverSnapshot.condicionIVAReceptorId

no de un input libre del frontend.

15.3 Validaciones previas

Antes de construir XML:

receiverSnapshot.cuit existe

receiverSnapshot.razonSocial existe si política lo exige

receiverSnapshot.condicionIVAReceptorId existe para A/B cuando aplique

16. Lotes de implementación
    Lote 1 — Persistencia y contratos
    Entregables

migraciones SQL

tipos TS de dominio

repositorio de cache

repositorio de lookup log

Done when

tablas creadas

repositorios testeados

DTOs estabilizados

Lote 2 — Lookup fiscal backend
Entregables

LookupTaxpayerUseCase

cliente ARCA padrón/constancia

normalizador

endpoint GET /api/fiscal/taxpayer/:cuit

Done when

dado un CUIT válido, devuelve DTO normalizado

usa cache correctamente

loggea cada consulta

Lote 3 — Resolución de clase
Entregables

ResolveDocumentClassUseCase

cliente FEParamGetCondicionIvaReceptor

tabla de referencia local

endpoint POST /api/fiscal/resolve-document-class

Done when

el sistema decide allowed/resolvedClass

el POS puede bloquear A

Lote 4 — Integración POS
Entregables

input CUIT

lookup card

banner de resolución

botón emitir condicionado

Done when

el operador puede emitir A en un flujo corto

el operador no puede forzar A incorrecta

Lote 5 — Integración fiscal end-to-end
Entregables

fiscal job incluye snapshot

WSFE builder incluye CondicionIVAReceptorId

snapshot guardado en fiscal_documents

Done when

venta POS → job → emisión → persistencia completa

Lote 6 — Hardening
Entregables

métricas

logs estructurados

invalidación de cache

feature flags

fallback/degrade policy

Done when

el flujo es observable

errores de ARCA se pueden diagnosticar rápido

17. Testing plan
    17.1 Unit tests

validador CUIT

normalizador de respuesta padrón

resolver de clase

cache policy

17.2 Integration tests

lookup cache miss

lookup cache hit

ARCA fail + cache hit

ARCA fail + no cache

resolve A válido

resolve A inválido

17.3 E2E tests POS

ingresar CUIT y autocompletar

bloquear A incorrecta

emitir A correcta

fallback con cache

18. Errores y códigos internos sugeridos
    type FiscalTaxpayerErrorCode =
    | 'INVALID_CUIT'
    | 'TAXPAYER_NOT_FOUND'
    | 'REGISTRY_UNAVAILABLE'
    | 'DOCUMENT_CLASS_NOT_ALLOWED'
    | 'MISSING_CONDICION_IVA_RECEPTOR_ID'
    | 'STALE_REGISTRY_DATA'

Mensajes traducidos para operación:

INVALID_CUIT → “El CUIT ingresado no es válido.”

TAXPAYER_NOT_FOUND → “No se encontró información fiscal para ese CUIT.”

REGISTRY_UNAVAILABLE → “No se pudo consultar ARCA en este momento.”

DOCUMENT_CLASS_NOT_ALLOWED → “El receptor no está habilitado para ese tipo de comprobante.”

19. Seguridad y secretos

el frontend nunca accede a certificados

el módulo de padrón usa WSAA desde backend

TA cacheado por servicio y ambiente

claves privadas sólo en secret manager

logs sin exponer token/sign

raw SOAP guardado sólo donde tenga valor de auditoría

20. Feature flags recomendadas
    fiscal.taxpayerLookup.enabled
    fiscal.taxpayerLookup.requireForFacturaA
    fiscal.documentClassResolution.enabled
    fiscal.documentClassResolution.blockInvalidA
    fiscal.taxpayerLookup.allowDegradedCache

Esto permite rollout progresivo sin romper el POS actual.

21. Plan de rollout
    Etapa 1

solo admin/backoffice

lookup manual por CUIT

Etapa 2

POS con consulta visual

sin bloqueo automático

Etapa 3

POS con bloqueo automático de A inválida

Etapa 4

hardening + métricas + reglas finales

22. Decisiones de producto recomendadas

Factura A requiere lookup exitoso o cache confiable.

No permitir Factura A “a ciegas”.

Guardar snapshot siempre.

Resolver CondicionIVAReceptorId en backend.

Bloquear override al staff común.

23. Checklist de implementación
    [ ] Crear tablas SQL
    [ ] Implementar repositorio de cache
    [ ] Implementar lookup por CUIT
    [ ] Implementar normalizador
    [ ] Implementar consulta de condición IVA receptor
    [ ] Implementar resolver de clase
    [ ] Exponer endpoints internos
    [ ] Integrar UI POS
    [ ] Pasar snapshot al fiscal job
    [ ] Incluir CondicionIVAReceptorId en WSFE
    [ ] Guardar snapshot en fiscal_documents
    [ ] Crear tests unit e integration
    [ ] Activar feature flags
24. Criterio final de éxito

El módulo estará correctamente implementado cuando un cajero pueda hacer esto en menos de 10 segundos:

1. Elegir Factura A
2. Escribir CUIT
3. Ver razón social cargada
4. Confirmar
5. Emitir

sin entender nada de WSAA, padrón, SOAP, CondicionIVAReceptorId o clases fiscales
