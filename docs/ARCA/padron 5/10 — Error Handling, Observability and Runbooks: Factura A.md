Estado: Ready for implementation
Ámbito: POS / Sales API / Fiscal Worker / Soporte / Operación
Dependencias previas:

05-taxpayer-registry-and-invoice-class-resolution.md

06-implementation-plan-taxpayer-registry-and-factura-a-pos.md

07-sql-and-api-contracts-taxpayer-registry.md

08-application-services-and-sequence-diagrams-taxpayer-registry.md

09-pos-ui-and-state-machine-factura-a.md

Objetivo: definir cómo manejar errores funcionales y técnicos del flujo de Factura A, cómo observar el sistema en producción y qué runbooks necesita el equipo para operar y diagnosticar problemas sin frenar la caja.

1. Objetivo operativo

El flujo de Factura A debe ser:

simple para el cajero

auditable para soporte

observable para ingeniería

resiliente ante fallos parciales

explícito en sus bloqueos

La regla principal es:

un error fiscal no debe dejar al operador adivinando qué pasó.

2. Principios de manejo de errores
   2.1 Separar error técnico de error funcional

Ejemplos:

funcional: el receptor no califica para Factura A

técnico: padrón no responde

integración: WSFE rechazó el comprobante

infraestructura: timeout, red, XML inválido, TA vencido

2.2 No exponer jerga técnica al cajero

Nunca mostrar directamente:

SOAP faults

XML crudo

códigos internos de librerías

stack traces

La UI debe traducirlo a mensajes operativos.

2.3 Persistir contexto suficiente

Cada error relevante debe quedar con:

tenant/org

usuario

CUIT receptor

tipo solicitado

tipo resuelto

fiscal job id

request/response si aplica

código interno y mensaje normalizado

2.4 Distinguir entre bloqueo y warning

bloqueo: no se puede emitir

warning: se puede seguir, pero se informa riesgo o degradación

3. Taxonomía de errores
   3.1 Errores de entrada

Errores detectados antes de consultar ARCA.

Códigos sugeridos

INVALID_CUIT

EMPTY_CUIT

INVALID_DOCUMENT_CLASS_REQUEST

Ejemplos

CUIT con menos de 11 dígitos

CUIT con dígito verificador inválido

tipo de comprobante no soportado

Acción UI

bloquear

mostrar mensaje inmediato

no llamar backend innecesariamente

3.2 Errores de lookup fiscal

Errores al consultar padrón o recuperar datos del receptor.

Códigos sugeridos

TAXPAYER_NOT_FOUND

REGISTRY_UNAVAILABLE

REGISTRY_TIMEOUT

REGISTRY_INVALID_RESPONSE

DEGRADED_CACHE_USED

Acción UI

NOT_FOUND → bloquear A

UNAVAILABLE/TIMEOUT con cache → warning

UNAVAILABLE/TIMEOUT sin cache → bloquear A

3.3 Errores de resolución de clase

Errores donde sí hay datos, pero no se puede emitir la clase pedida.

Códigos sugeridos

DOCUMENT_CLASS_NOT_ALLOWED

MISSING_CONDICION_IVA_RECEPTOR_ID

MISSING_REFERENCE_DATA

RESOLUTION_INCONSISTENT

Acción UI

bloquear la clase pedida

sugerir clase alternativa si existe

permitir corrección rápida en pantalla

3.4 Errores de autenticación fiscal

Errores en WSAA o TA.

Códigos sugeridos

WSAA_AUTH_FAILED

WSAA_TA_EXPIRED

WSAA_CERTIFICATE_INVALID

WSAA_SERVICE_UNAVAILABLE

Acción backend

retry si es transitorio

no retry si es certificado/configuración

alerta a soporte si impacta producción

Acción UI

no mostrar detalle técnico

mostrar: “No se pudo autenticar el servicio fiscal.”

3.5 Errores de emisión WSFE

Errores al emitir el comprobante.

Códigos sugeridos

WSFE_REJECTED

WSFE_OBSERVED

WSFE_TIMEOUT

WSFE_INVALID_REQUEST

WSFE_SERVICE_UNAVAILABLE

Acción

REJECTED → terminal

OBSERVED → depende de política

TIMEOUT/SERVICE_UNAVAILABLE → retryable

INVALID_REQUEST → bug/configuración

3.6 Errores de persistencia / secuencia
Códigos sugeridos

FISCAL_SEQUENCE_RESERVATION_FAILED

FISCAL_DOCUMENT_PERSIST_FAILED

FISCAL_JOB_NOT_FOUND

FISCAL_JOB_STATE_INVALID

Acción

bloquear reproceso incorrecto

alertar a ingeniería si afecta consistencia

nunca perder trazabilidad del número reservado

4. Catálogo de errores normalizados
   export type FiscalErrorCode =
   | 'EMPTY_CUIT'
   | 'INVALID_CUIT'
   | 'INVALID_DOCUMENT_CLASS_REQUEST'
   | 'TAXPAYER_NOT_FOUND'
   | 'REGISTRY_UNAVAILABLE'
   | 'REGISTRY_TIMEOUT'
   | 'REGISTRY_INVALID_RESPONSE'
   | 'DEGRADED_CACHE_USED'
   | 'DOCUMENT_CLASS_NOT_ALLOWED'
   | 'MISSING_CONDICION_IVA_RECEPTOR_ID'
   | 'MISSING_REFERENCE_DATA'
   | 'RESOLUTION_INCONSISTENT'
   | 'WSAA_AUTH_FAILED'
   | 'WSAA_TA_EXPIRED'
   | 'WSAA_CERTIFICATE_INVALID'
   | 'WSAA_SERVICE_UNAVAILABLE'
   | 'WSFE_REJECTED'
   | 'WSFE_OBSERVED'
   | 'WSFE_TIMEOUT'
   | 'WSFE_INVALID_REQUEST'
   | 'WSFE_SERVICE_UNAVAILABLE'
   | 'FISCAL_SEQUENCE_RESERVATION_FAILED'
   | 'FISCAL_DOCUMENT_PERSIST_FAILED'
   | 'FISCAL_JOB_NOT_FOUND'
   | 'FISCAL_JOB_STATE_INVALID'
5. Mensajes operativos para UI
   5.1 Input
   export const fiscalUiMessages = {
   EMPTY_CUIT: 'Ingresá un CUIT para continuar.',
   INVALID_CUIT: 'El CUIT ingresado no es válido.',
   INVALID_DOCUMENT_CLASS_REQUEST: 'El tipo de comprobante solicitado no es válido.'
   }
   5.2 Lookup
   export const fiscalLookupMessages = {
   TAXPAYER_NOT_FOUND: 'No se encontró información fiscal para ese CUIT.',
   REGISTRY_UNAVAILABLE: 'No se pudo consultar ARCA en este momento.',
   REGISTRY_TIMEOUT: 'La consulta fiscal tardó demasiado. Intentá nuevamente.',
   REGISTRY_INVALID_RESPONSE: 'La respuesta del padrón no pudo procesarse.',
   DEGRADED_CACHE_USED: 'Se usará la última información fiscal disponible.'
   }
   5.3 Resolución
   export const fiscalResolutionMessages = {
   DOCUMENT_CLASS_NOT_ALLOWED: 'El receptor no está habilitado para ese tipo de comprobante.',
   MISSING_CONDICION_IVA_RECEPTOR_ID: 'Falta información fiscal del receptor para emitir.',
   MISSING_REFERENCE_DATA: 'No se pudo validar la condición fiscal del receptor.',
   RESOLUTION_INCONSISTENT: 'No se pudo resolver correctamente el tipo de comprobante.'
   }
   5.4 Emisión
   export const fiscalEmissionMessages = {
   WSAA_AUTH_FAILED: 'No se pudo autenticar el servicio fiscal.',
   WSAA_TA_EXPIRED: 'La autenticación fiscal venció y debe renovarse.',
   WSAA_CERTIFICATE_INVALID: 'La configuración del certificado fiscal no es válida.',
   WSAA_SERVICE_UNAVAILABLE: 'El servicio de autenticación fiscal no está disponible.',
   WSFE_REJECTED: 'ARCA rechazó la emisión del comprobante.',
   WSFE_OBSERVED: 'ARCA emitió el comprobante con observaciones.',
   WSFE_TIMEOUT: 'La emisión fiscal tardó demasiado. Se reintentará.',
   WSFE_INVALID_REQUEST: 'La solicitud fiscal generada no es válida.',
   WSFE_SERVICE_UNAVAILABLE: 'El servicio de facturación no está disponible.'
   }
6. Severidad de eventos
   6.1 INFO

Casos normales o esperables:

lookup exitoso

resolución permitida

uso de cache fresca

emisión autorizada

6.2 WARN

Casos degradados o recuperables:

cache degradada

observaciones WSFE

fallback a cache

mismatch solicitado vs resuelto

6.3 ERROR

Casos que bloquean el flujo:

CUIT inválido

receptor no encontrado

clase no permitida

rechazo fiscal

falla de persistencia

6.4 CRITICAL

Casos con riesgo sistémico:

secuencia fiscal inconsistente

TA o certificados rotos en producción

caída sostenida de WSAA/WSFE

imposibilidad masiva de emitir

7. Logging estructurado
   7.1 Principio

Todos los logs relevantes del flujo deben ser estructurados, con claves estables y sin texto libre como única fuente de diagnóstico.

7.2 Campos base
type FiscalLogContext = {
tenantId?: string
orgId?: string
userId?: string
saleId?: string
fiscalJobId?: string
fiscalDocumentId?: string
environment?: 'homo' | 'prod'
receiverCuit?: string
requestedClass?: 'A' | 'B' | 'C' | 'M'
resolvedClass?: 'A' | 'B' | 'C' | 'M' | null
errorCode?: string
}
7.3 Evento de lookup exitoso
{
"level": "info",
"event": "taxpayer_lookup_completed",
"tenantId": "uuid",
"orgId": "uuid",
"receiverCuit": "30712345678",
"environment": "prod",
"fromCache": false,
"degraded": false,
"durationMs": 410
}
7.4 Evento de resolución bloqueada
{
"level": "warn",
"event": "document_class_resolution_blocked",
"tenantId": "uuid",
"orgId": "uuid",
"receiverCuit": "30712345678",
"requestedClass": "A",
"resolvedClass": "B",
"errorCode": "DOCUMENT_CLASS_NOT_ALLOWED"
}
7.5 Evento de emisión autorizada
{
"level": "info",
"event": "fiscal_document_authorized",
"tenantId": "uuid",
"orgId": "uuid",
"saleId": "uuid",
"fiscalJobId": "uuid",
"environment": "prod",
"receiverCuit": "30712345678",
"requestedClass": "A",
"resolvedClass": "A",
"cae": "12345678901234",
"cbteTipo": 1,
"ptoVta": 2,
"cbteNro": 18
}
7.6 Evento de rechazo fiscal
{
"level": "error",
"event": "fiscal_document_rejected",
"tenantId": "uuid",
"orgId": "uuid",
"saleId": "uuid",
"fiscalJobId": "uuid",
"receiverCuit": "30712345678",
"requestedClass": "A",
"resolvedClass": "A",
"errorCode": "WSFE_REJECTED",
"arcaErrorCode": "10000",
"arcaErrorMessage": "mensaje normalizado"
} 8. Métricas recomendadas
8.1 Lookup

taxpayer_lookup_total

taxpayer_lookup_success_total

taxpayer_lookup_not_found_total

taxpayer_lookup_error_total

taxpayer_lookup_cache_hit_total

taxpayer_lookup_degraded_total

taxpayer_lookup_duration_ms

8.2 Resolución

document_class_resolution_total

document_class_resolution_allowed_total

document_class_resolution_blocked_total

document_class_resolution_requested_vs_resolved_mismatch_total

8.3 Emisión

fiscal_emission_total

fiscal_emission_authorized_total

fiscal_emission_rejected_total

fiscal_emission_observed_total

fiscal_emission_retryable_error_total

fiscal_emission_duration_ms

8.4 Infraestructura fiscal

wsaa_request_total

wsaa_error_total

wsfe_request_total

wsfe_error_total

fiscal_sequence_reservation_error_total

9. Alertas recomendadas
   9.1 Lookup degradado alto

Disparar alerta si:

taxpayer_lookup_degraded_total / taxpayer_lookup_total > 20%
durante 15 minutos
9.2 Bloqueos anómalos de Factura A

Disparar alerta si:

document_class_resolution_blocked_total
sube abruptamente respecto a baseline
9.3 WSAA caído

Disparar alerta si:

wsaa_error_total > threshold
durante 5 minutos
9.4 WSFE caído

Disparar alerta si:

wsfe_error_total > threshold
durante 5 minutos
9.5 Rechazos fiscales anómalos

Disparar alerta si:

fiscal_emission_rejected_total
crece por encima del baseline por tenant/org 10. Correlation IDs

Todo el flujo debe compartir IDs trazables.

10.1 IDs mínimos

requestId

saleId

fiscalJobId

fiscalDocumentId

10.2 Regla

Cada log y error debe incluir al menos uno de esos identificadores.

11. Persistencia de errores
    11.1 En lookup log

Persistir:

código interno

mensaje técnico resumido

warnings

fromCache

degraded

11.2 En fiscal job / document

Persistir:

request XML

response XML

error code normalizado

error code ARCA si existe

estado final del job

cantidad de retries

12. Política de retries
    12.1 Lookup padrón
    Reintentar

timeout

5xx

errores transitorios de red

No reintentar

CUIT inválido

no encontrado

respuesta funcionalmente inconsistente no recuperable

Política sugerida

2 retries

backoff exponencial corto

timeout agresivo

12.2 Emisión WSFE
Reintentar

timeout

servicio no disponible

errores de red transitorios

No reintentar

rechazo funcional de ARCA

request inválido

datos inconsistentes del receptor

13. Clasificación retryable / non-retryable
    export function isRetryableFiscalError(code: FiscalErrorCode): boolean {
    return [
    'REGISTRY_UNAVAILABLE',
    'REGISTRY_TIMEOUT',
    'WSAA_SERVICE_UNAVAILABLE',
    'WSFE_TIMEOUT',
    'WSFE_SERVICE_UNAVAILABLE'
    ].includes(code)
    }
14. Runbook — Cajero POS
    14.1 Caso: CUIT inválido
    Síntoma

La pantalla muestra:

El CUIT ingresado no es válido.
Acción

corregir el número

volver a consultar

No hacer

no intentar emitir A igual

no inventar razón social manualmente

14.2 Caso: receptor no encontrado
Síntoma
No se encontró información fiscal para ese CUIT.
Acción

pedir al cliente confirmar CUIT

reintentar

si sigue igual, no emitir Factura A

Resultado esperado

usar otro tipo de comprobante según política del negocio

o derivar a supervisor

14.3 Caso: A bloqueada y B sugerida
Síntoma
No corresponde Factura A para este receptor.
NODUX sugiere Factura B.
Acción

confirmar con el cliente

cambiar a Factura B desde el CTA rápido

continuar emisión

14.4 Caso: datos desde cache
Síntoma
Se usará la última información fiscal disponible.
Acción

si el sistema permite continuar y el negocio acepta riesgo, seguir

si hay duda, pedir asistencia al supervisor

15. Runbook — Supervisor / Soporte de tienda
    15.1 Caso: no se puede emitir ninguna Factura A
    Verificar

si el error es de lookup o de emisión

si ocurre con un solo CUIT o con todos

si la sugerencia cambia a B o no hay lookup

si existe aviso de cache degradada

Escalar a soporte técnico si

falla con múltiples CUIT válidos

no hay lookup ni cache

todos los casos terminan en error técnico

15.2 Caso: ARCA rechaza emisión
Verificar

número de comprobante

tipo solicitado y resuelto

CUIT receptor

datos fiscales visibles

mensaje mostrado por sistema

Escalar con

saleId

fiscalJobId

hora aproximada

captura del mensaje

16. Runbook — Soporte técnico L1/L2
    16.1 Caso: lookup falla
    Revisar

logs taxpayer_lookup_completed / ...failed

si hubo cache hit

si el gateway padrón respondió

si el error fue timeout o respuesta inválida

Decisión

si hay cache vigente, habilitar política degradada si corresponde

si no hay cache, incidente operativo parcial

16.2 Caso: bloqueo de clase inesperado
Revisar

requestedClass

resolvedClass

condicionIVAReceptorId

referencias cargadas en fiscal_reference_condicion_iva_receptor

Posibles causas

catálogo desactualizado

normalización incorrecta

cambio regulatorio

bug en InvoiceClassResolver

16.3 Caso: WSFE rechaza emisión
Revisar

request XML

response XML

snapshot del receptor

secuencia fiscal reservada

error code ARCA

mapping del cbteTipo

Acciones

clasificar rechazo como funcional o bug

si es funcional, cerrar con causa

si es bug, abrir incidente de ingeniería

17. Runbook — Ingeniería
    17.1 Caso: aumento de REGISTRY_UNAVAILABLE
    Revisar

métricas de latencia

timeouts

errores del gateway padrón

conectividad saliente

proveedor/ARCA

Acciones

aumentar resiliencia

revisar backoff

revisar timeouts

evaluar modo degradado

17.2 Caso: aumento de DOCUMENT_CLASS_NOT_ALLOWED
Revisar

cambios recientes de lógica

datos de catálogo CondicionIVAReceptorId

normalización de padrón

regresiones de frontend/backend

17.3 Caso: aumento de WSFE_INVALID_REQUEST
Revisar

builder XML

cambios recientes de request

CondicionIVAReceptorId

importes

docTipo/docNro

tipo de comprobante enviado

18. Dashboards recomendados
    18.1 Dashboard POS fiscal

Widgets:

lookup success %

bloqueos de A

tiempo promedio de lookup

tiempo promedio de emisión

errores por tienda/org

18.2 Dashboard técnico fiscal

Widgets:

WSAA success/error

WSFE success/error

retries

cache hit ratio

top error codes

emisiones autorizadas/rechazadas

19. Política de masking

Nunca loggear en texto plano si no es necesario:

token WSAA

sign WSAA

private keys

secretos de certificados

XML request/response puede guardarse para auditoría, pero con política clara de acceso.

20. Checklist operativo
    [ ] Todos los errores tienen código normalizado
    [ ] Todos los errores tienen mensaje UI claro
    [ ] Existe logging estructurado en lookup/resolución/emisión
    [ ] Existen métricas para lookup/resolución/emisión
    [ ] Existen alertas mínimas configuradas
    [ ] Existe runbook para cajero
    [ ] Existe runbook para soporte
    [ ] Existe runbook para ingeniería
    [ ] Se clasifican errores retryable vs terminal
    [ ] Se persiste contexto suficiente para auditoría
21. Criterio de éxito

Este módulo queda bien operado cuando:

el cajero sabe qué hacer ante cada mensaje

soporte puede clasificar incidentes sin abrir código

ingeniería puede diagnosticar fallas con logs y métricas

un rechazo fiscal puede reconstruirse end-to-end

la caja no queda bloqueada por errores ambiguos
