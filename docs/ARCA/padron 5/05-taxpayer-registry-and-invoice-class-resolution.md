05 — Taxpayer Registry and Invoice Class Resolution

Estado: Draft operativo
Ámbito: Fiscal / POS / Sales API / ARCA Integration
Objetivo: permitir que, cuando el operador del POS necesite emitir Factura A, pueda ingresar el CUIT del receptor, autocompletar los datos fiscales relevantes, resolver el tipo de comprobante aplicable y disparar la emisión fiscal con la menor fricción posible.

1. Objetivo funcional

NODUX debe ofrecer en el POS un flujo simple:

el operador selecciona “Factura fiscal”

elige o solicita Factura A

ingresa el CUIT del receptor

NODUX consulta padrón fiscal

NODUX autocompleta datos del receptor

NODUX resuelve si corresponde A / B / C / M

el operador confirma

NODUX emite el comprobante vía WSFE

Este diseño se apoya en tres piezas oficiales:

WSAA para obtener Token y Sign

WSFEv1 para la emisión del comprobante

un servicio de Padrón / Constancia de Inscripción para consultar datos fiscales del receptor por CUIT. El servicio de Constancia de Inscripción indica que recibe una CUIT y devuelve los datos de la constancia de inscripción del contribuyente.

Además, el manual de Facturación Electrónica v4.0 incorporó CondicionIVAReceptorId y el método FEParamGetCondicionIvaReceptor, justamente para recuperar los valores de referencia de condición de IVA del receptor y validar la emisión según la reglamentación vigente.

2. Principios de diseño
   2.1 Separación de responsabilidades

El servicio de padrón no emite comprobantes.
Su responsabilidad es:

identificar al receptor

recuperar datos fiscales

sugerir la clase de comprobante

reducir errores de tipeo

mejorar UX del POS

El servicio de facturación sí emite comprobantes.
Su responsabilidad es:

autenticar contra WSAA

validar datos de emisión

llamar WSFE

persistir CAE, XML y estado

2.2 No consultar ARCA directamente desde el frontend

El POS no debe hablar directamente con ARCA.
Toda consulta de CUIT debe pasar por backend propio para poder:

cachear resultados

normalizar respuestas

auditar consultas

desacoplar la UI de SOAP/XML

manejar timeouts y fallback

2.3 Snapshot fiscal en el momento de emitir

Al emitir un comprobante, NODUX debe guardar un snapshot del receptor fiscal en ese momento.
No debe depender solo del CUIT.
Si el padrón cambia después, el comprobante debe seguir siendo auditable con los datos usados al emitir.

3. Servicios ARCA involucrados
   3.1 WSAA

Todos los servicios SOAP protegidos requieren Ticket de Acceso emitido por WSAA.
En WSFE, el manual indica que para consumir cualquiera de los métodos es necesario un TA y que el service a usar en el login es wsfe; además, el TA dura 12 horas.

3.2 WSFEv1

WSFEv1 es el servicio de emisión de comprobantes electrónicos.
El manual oficial de FE v4.0 documenta FECAESolicitar, FECompUltimoAutorizado, FEDummy y FEParamGetCondicionIvaReceptor, entre otros. También confirma los endpoints de homologación y producción de WSFEv1.

3.3 Padrón / Constancia de Inscripción

Para consulta por CUIT, NODUX debe integrar uno de estos servicios:

Consulta a Padrón Alcance 5 (ws_sr_padron_a5)

Consulta de Constancia de Inscripción

La documentación oficial de ws_sr_padron_a5 indica que el id del servicio es ws_sr_padron_a5 y que ese nombre debe usarse al solicitar el TA en WSAA. La documentación de Constancia de Inscripción indica que la consulta recibe como parámetro una CUIT y responde con los datos de la constancia de inscripción del contribuyente.

4. Recomendación de arquitectura para NODUX
   4.1 Servicio nuevo

Crear un bounded context separado:

src/modules/fiscal-taxpayer-registry/

Responsabilidades:

consultar padrón por CUIT

normalizar respuesta

cachear respuesta

resolver tipo de comprobante sugerido

exponer API interna para POS / Sales API / Admin

4.2 Relación con el motor fiscal

Arquitectura objetivo:

POS
↓
Sales API
↓
Taxpayer Registry Service
↓
Invoice Class Resolver
↓
Fiscal Service
↓
WSAA
↓
WSFE
4.3 Reglas de ownership

TaxpayerRegistryService: identificación del receptor

InvoiceClassResolver: decisión sugerida A/B/C/M

FiscalService: emisión final

POS UI: captura mínima + confirmación del operador

5. Flujo UX objetivo en POS
   5.1 Flujo principal
   [Operador]
   → selecciona "Factura fiscal"

[POS]
→ muestra selector de tipo deseado:

- Consumidor final
- Factura B
- Factura A
- Otro

[Operador]
→ elige "Factura A"

[POS]
→ pide CUIT

[Operador]
→ ingresa CUIT

[POS]
→ llama backend: GET /api/fiscal/taxpayer/:cuit

[Backend]
→ consulta cache
→ si no hay cache fresca, consulta ARCA
→ normaliza respuesta
→ resuelve condición fiscal
→ resuelve clase de comprobante sugerida
→ devuelve DTO listo para UI

[POS]
→ autocompleta:

- razón social
- condición IVA
- estado registral
- clase sugerida
- advertencias

[Operador]
→ confirma

[Sales API]
→ crea fiscal job

[Fiscal Worker]
→ emite vía WSFE
5.2 UX deseada

La UX debe sentirse “sin complicaciones”:

ingresar CUIT

ver datos autocompletados

ver sugerencia de tipo de comprobante

permitir override solo si política de negocio lo permite

mostrar advertencia clara si no corresponde Factura A

6. Datos mínimos a recuperar por CUIT

Respuesta normalizada sugerida:

export type TaxpayerSnapshot = {
cuit: string
razonSocial: string | null
nombreFantasia?: string | null
estadoRegistral: 'ACTIVO' | 'INACTIVO' | 'NO_ENCONTRADO' | 'ERROR'
condicionIVA: string | null
condicionIVAReceptorId?: number | null
impuestos?: string[]
actividades?: string[]
domicilioFiscal?: {
direccion?: string | null
localidad?: string | null
provincia?: string | null
}
claseComprobanteSugerida?: 'A' | 'B' | 'C' | 'M' | null
observaciones?: string[]
source: 'padron_a5' | 'constancia_inscripcion'
fetchedAt: string
expiresAt: string
}
6.1 Campos críticos para el POS

Los más valiosos para la experiencia de facturación son:

CUIT

razón social

condición frente al IVA

estado registral

clase de comprobante sugerida

timestamp de actualización

6.2 Campos críticos para emisión

Los más valiosos para el motor fiscal son:

cuit

condicionIVA

condicionIVAReceptorId

claseComprobanteSugerida

El manual v4.0 de FE documenta explícitamente CondicionIVAReceptorId y el método FEParamGetCondicionIvaReceptor, que debe usarse como referencia oficial para los valores válidos.

7. Estrategia de resolución del tipo de comprobante
   7.1 Regla general

NODUX no debe decidir solo con una heurística local.
Debe usar:

datos del padrón por CUIT

valores oficiales de FEParamGetCondicionIvaReceptor

política de negocio interna para sugerencia/override

validación final de WSFE al emitir

7.2 Algoritmo sugerido
input:

- requestedDocumentClass
- taxpayerSnapshot
- feParamCondicionIvaReceptorMap

steps:

1. obtener condicionIVA del receptor
2. mapear a condicionIVAReceptorId
3. consultar mapa oficial FEParamGetCondicionIvaReceptor
4. resolver clase permitida/sugerida
5. comparar con lo pedido por el operador
6. si coincide:
   continuar
   si no coincide:
   mostrar advertencia o bloquear, según política
7. enviar FECAESolicitar con CondicionIVAReceptorId
   7.3 Política de negocio recomendada

Para POS retail, recomendación:

si el operador pide Factura A

y el padrón/condición fiscal no la soporta

bloquear emisión A

ofrecer alternativa sugerida automáticamente

Ejemplo de mensaje:

El CUIT ingresado no corresponde a un receptor habilitado para Factura A.
NODUX sugiere emitir Factura B.

Esto reduce errores y reintentos operativos.

8. Diseño de persistencia
   8.1 Cache fiscal del receptor
   create table fiscal_taxpayer_cache (
   cuit text primary key,
   razon_social text,
   nombre_fantasia text,
   estado_registral text not null,
   condicion_iva text,
   condicion_iva_receptor_id int,
   impuestos jsonb,
   actividades jsonb,
   domicilio_fiscal jsonb,
   clase_comprobante_sugerida text,
   observaciones jsonb,
   source text not null,
   raw_response jsonb not null,
   fetched_at timestamptz not null default now(),
   expires_at timestamptz not null
   );
   8.2 Snapshot en documento fiscal
   alter table fiscal_documents
   add column receptor_cuit text,
   add column receptor_razon_social_snapshot text,
   add column receptor_condicion_iva_snapshot text,
   add column receptor_condicion_iva_receptor_id_snapshot int,
   add column receptor_domicilio_snapshot jsonb,
   add column receptor_padron_raw_snapshot jsonb;
   8.3 Auditoría de consultas
   create table fiscal_taxpayer_lookup_log (
   id uuid primary key default gen_random_uuid(),
   tenant_id uuid not null,
   org_id uuid not null,
   requested_by_user_id uuid,
   cuit text not null,
   source text not null,
   result_status text not null,
   fetched_at timestamptz not null default now(),
   request_id uuid
   );
9. APIs internas recomendadas
   9.1 Lookup por CUIT
   GET /api/fiscal/taxpayer/:cuit

Response:

{
"cuit": "30712345678",
"razonSocial": "EMPRESA DEMO SA",
"estadoRegistral": "ACTIVO",
"condicionIVA": "IVA RESPONSABLE INSCRIPTO",
"condicionIVAReceptorId": 1,
"claseComprobanteSugerida": "A",
"observaciones": [],
"fetchedAt": "2026-03-09T12:00:00Z",
"expiresAt": "2026-03-10T12:00:00Z"
}
9.2 Resolución previa de clase
POST /api/fiscal/resolve-document-class

Request:

{
"requestedClass": "A",
"receiverCuit": "30712345678"
}

Response:

{
"requestedClass": "A",
"resolvedClass": "A",
"allowed": true,
"warnings": []
}

Ejemplo bloqueado:

{
"requestedClass": "A",
"resolvedClass": "B",
"allowed": false,
"warnings": [
"El CUIT ingresado no corresponde a un receptor habilitado para Factura A."
]
} 10. Integración con WSAA
10.1 Servicio WSAA para padrón

Cada servicio ARCA protegido requiere su propio service al pedir TA.
La documentación de ws_sr_padron_a5 especifica que el id del servicio es ws_sr_padron_a5 y ese nombre es el que debe enviarse a WSAA.

10.2 Recomendación de implementación

No reutilizar ciegamente el TA de wsfe para padrón.
Modelar cache de TA por:

(environment, cuit_emisora, service_name, certificate_fingerprint)

Ejemplo:

type WsaaCacheKey = {
environment: 'homo' | 'prod'
service: 'wsfe' | 'ws_sr_padron_a5'
cuit: string
certificateFingerprint: string
}
10.3 Componente compartido
src/modules/fiscal-shared/wsaa/

Debe servir tanto para wsfe como para ws_sr_padron_a5.

11. Cache y performance
    11.1 Estrategia recomendada

Para POS, conviene priorizar velocidad percibida.
Regla sugerida:

usar cache de 24 horas por CUIT

refrescar en background si está por vencer

refrescar obligatoriamente si la emisión falla por inconsistencia fiscal

11.2 Política de expiración
default TTL: 24h
stale-while-revalidate: 6h
force refresh: on demand
11.3 Política de fallback

Si padrón falla temporalmente:

usar último cache fresco disponible

marcar resultado como degraded

permitir continuar solo según política de riesgo del negocio

Para Factura A, recomendación:

si no hay datos confiables del receptor

no emitir A automáticamente

pedir validación manual o degradar a flujo controlado

12. Validaciones de UI
    12.1 Campo CUIT

Validar localmente antes del lookup:

11 dígitos

solo numérico

dígito verificador válido

12.2 Estados posibles de UI

idle

searching

found

not_found

invalid_cuit

registry_error

resolved

blocked

12.3 Layout sugerido
[Tipo de comprobante solicitado]
[A / B / C / M]

[CUIT receptor]
[___________] [Consultar]

[Resultado lookup]

- Razón social
- Condición IVA
- Estado registral
- Clase sugerida
- Advertencias

[Emitir comprobante]
12.4 Reglas UX

autocompletar sin recargar la pantalla

no obligar al operador a interpretar categorías fiscales complejas

traducir validaciones a lenguaje operativo

13. Reglas de emisión para Factura A
    13.1 Precondición de producto

Para emitir Factura A en el POS, NODUX debe exigir lookup exitoso de CUIT.

13.2 Precondición fiscal

NODUX debe contar con:

receptor identificado por CUIT

datos fiscales frescos o cache confiable

CondicionIVAReceptorId resuelta

tipo de comprobante resuelto

validaciones básicas superadas

13.3 Emisión final

FECAESolicitar debe enviarse con:

Auth.Token

Auth.Sign

Auth.Cuit

FeCabReq

FeDetReq

CondicionIVAReceptorId cuando corresponda

El manual v4.0 documenta CondicionIVAReceptorId en FECAESolicitar y el método FEParamGetCondicionIvaReceptor para recuperar sus valores de referencia.

14. Módulos sugeridos en código
    src/modules/fiscal-taxpayer-registry/
    application/
    lookup-taxpayer.use-case.ts
    resolve-document-class.use-case.ts
    domain/
    taxpayer-snapshot.ts
    taxpayer-registry-service.ts
    invoice-class-resolver.ts
    infrastructure/
    arca-padron-a5-client.ts
    arca-constancia-client.ts
    taxpayer-cache-repository.ts
    fe-condicion-iva-receptor-client.ts
    taxpayer-normalizer.ts
    presentation/
    taxpayer.controller.ts
    14.1 Cliente padrón
    export interface TaxpayerRegistryGateway {
    getByCuit(params: {
    environment: 'homo' | 'prod'
    emisorCuit: string
    receiverCuit: string
    }): Promise<TaxpayerSnapshot>
    }
    14.2 Resolver de clase
    export interface InvoiceClassResolver {
    resolve(input: {
    requestedClass: 'A' | 'B' | 'C' | 'M'
    taxpayer: TaxpayerSnapshot
    }): {
    allowed: boolean
    resolvedClass: 'A' | 'B' | 'C' | 'M'
    warnings: string[]
    }
    }
15. Logs y observabilidad
    15.1 Log estructurado por lookup
    {
    "event": "taxpayer_lookup_completed",
    "tenantId": "…",
    "orgId": "…",
    "receiverCuit": "30712345678",
    "source": "padron_a5",
    "cacheHit": false,
    "resolvedClass": "A",
    "durationMs": 420
    }
    15.2 Métricas mínimas

lookup success rate

lookup latency p50/p95

cache hit ratio

blocked invoice attempts by class

mismatch between requested vs resolved class

WS failures by service (wsfe, padron_a5)

16. Casos de borde
    16.1 CUIT no encontrado

Resultado:

no autocompletar

bloquear Factura A

mostrar mensaje claro

16.2 Contribuyente inactivo o inconsistente

Resultado:

no emitir A automáticamente

exigir revisión

16.3 Padrón caído

Resultado:

usar cache si existe

si no existe y el operador pide A, bloquear y explicar causa

16.4 Override manual

Recomendación inicial:

permitir override solo a perfiles manager/admin

registrar auditoría completa

mostrar justificación obligatoria

17. Seguridad

nunca exponer credenciales ARCA al frontend

mantener certificados y claves en secret manager

no guardar private keys en tablas sin cifrado fuerte

loggear solo datos necesarios

ofuscar XML sensibles en observabilidad si aplica

18. Plan de implementación
    Fase 1 — Base técnica

integrar WSAA reusable

integrar cliente padrón

diseñar DTO normalizado

crear tablas de cache y logs

Fase 2 — UX POS

campo CUIT

botón consultar

panel autocompletado

sugerencia de clase de comprobante

Fase 3 — Resolución fiscal

integrar FEParamGetCondicionIvaReceptor

resolver CondicionIVAReceptorId

bloquear emisiones inconsistentes

Fase 4 — Emisión integrada

pasar snapshot fiscal al fiscal job

emitir FECAESolicitar

persistir snapshot en documento

Fase 5 — Hardening

métricas

alertas

retry/backoff

cache policy

auditoría de overrides

19. Criterios de aceptación
    CA-01

Dado un CUIT válido, el POS autocompleta razón social y condición fiscal.

CA-02

Dado un CUIT apto para Factura A, el sistema sugiere y permite emitir Factura A.

CA-03

Dado un CUIT no apto para Factura A, el sistema bloquea o redirige según política.

CA-04

Cada emisión guarda snapshot fiscal completo del receptor.

CA-05

Las consultas de padrón usan cache y no degradan la velocidad del POS.

CA-06

Los errores de padrón y de WSFE quedan desacoplados y trazables.

20. Decisión recomendada

Para NODUX, la implementación recomendada es:

usar Padrón/Constancia de Inscripción para autocompletar receptor por CUIT

usar FEParamGetCondicionIvaReceptor para resolver la referencia oficial de condición IVA del receptor

usar WSFE solo para emisión final

guardar snapshot fiscal del receptor en cada comprobante

Esto permite una UX de POS simple, rápida y operativamente segura para emisión de Factura A.

21. Anexo — Resumen ejecutivo de producto

La experiencia objetivo en POS debe sentirse así:

1. Elegir "Factura A"
2. Escribir CUIT
3. Ver razón social autocompletada
4. Confirmar
5. Emitir

Toda la complejidad SOAP, WSAA, padrón, condición IVA y validación fiscal debe quedar encapsulada en backend.
