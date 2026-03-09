# AFIP / ARCA Worker Error Catalog

**Proyecto:** NODUX  
**Versión:** v0.1  
**Estado:** Draft operativo  
**Última actualización:** 2026-03-08

---

## 1. Propósito

Este documento define el catálogo de errores operativos del Fiscal Worker de NODUX para AFIP / ARCA.

Su objetivo es:

- clasificar errores de forma consistente
- separar errores fiscales de errores técnicos
- definir si un error es reintentable o no
- definir la transición de estado correcta del `invoice_job`
- estandarizar logging, métricas y playbooks operativos

---

## 2. Objetivos del catálogo

El catálogo debe permitir responder, para cualquier error:

- qué pasó
- dónde pasó
- si el request fiscal pudo haber salido
- si el estado del comprobante es cierto o incierto
- si corresponde retry
- si corresponde `pending_reconcile`
- si corresponde `rejected`
- si corresponde `failed`
- qué severidad operativa tiene

---

## 3. Principios de clasificación

### 3.1 Error técnico ≠ rechazo fiscal

- **Error técnico**: problema de red, timeout, XML inválido, storage, firma, credenciales, etc.
- **Rechazo fiscal**: AFIP / ARCA respondió y rechazó la solicitud por validación o regla de negocio.

---

### 3.2 Timeout incierto ≠ rechazo

Si no hay certeza de respuesta, no se puede asumir rechazo.

Debe ir a:

- `pending_reconcile`

---

### 3.3 Error definitivo ≠ error reintentable

Ejemplos:

- certificado vencido → no reintentar ciegamente
- punto de venta mal configurado → no reintentar ciegamente
- timeout de red transitorio → sí puede requerir reconciliación o retry controlado

---

### 3.4 El catálogo define semántica interna

Aunque AFIP / ARCA entregue códigos propios, NODUX debe traducirlos a una semántica propia y estable.

---

## 4. Estructura del error normalizado

Formato interno sugerido:

```json
{
  "code": "FISCAL_WSFE_TIMEOUT_UNCERTAIN",
  "category": "technical",
  "severity": "high",
  "retryable": false,
  "reconcileRequired": true,
  "jobTransition": "pending_reconcile",
  "message": "Timeout luego del envío a WSFEv1 con estado incierto",
  "details": {}
}
```

## 5. Categorías principales

5.1 configuration

Errores de configuración del tenant o del ambiente.

5.2 credentials

Errores de certificado, firma, token o autenticación WSAA.

5.3 connectivity

Errores de red, DNS, timeout, TLS, disponibilidad del servicio.

5.4 request_build

Errores al construir XML, payload o mappings.

5.5 fiscal_rejection

Errores de validación fiscal devueltos por AFIP / ARCA.

5.6 state_machine

Errores de transición interna inválida.

5.7 render

Errores al generar QR, PDF o ticket.

5.8 storage

Errores al subir o persistir artefactos.

5.9 printing

Errores de cola o dispatch de impresión.

5.10 reconciliation

Errores durante resolución de estados inciertos.

5.11 database

Errores DB/RPC/locking/consistencia.

## 6. Severidades

low

No impide operación principal; suele requerir observación.

medium

Afecta el job actual pero no amenaza consistencia global.

high

Afecta el job y requiere intervención del worker o reconciliación.

critical

Riesgo de inconsistencia, seguridad o bloqueo sistémico.

## 7. Job transitions permitidas por error

rejected

Cuando AFIP / ARCA rechazó de forma concluyente.

pending_reconcile

Cuando el estado fiscal es incierto.

failed

Cuando hubo error técnico terminal interno no fiscal.

render_pending

Cuando AFIP autorizó pero falló el render posterior.

completed

No aplica a errores, salvo recuperación posterior.

## 8. Catálogo base

8.1 CONFIGURATION
FISCAL_CONFIG_CREDENTIALS_NOT_FOUND

Categoría: configuration

Severidad: high

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: no se encontraron credenciales fiscales activas para el tenant / ambiente.

Acción:

marcar job como failed

alertar configuración faltante

no reintentar automáticamente

FISCAL_CONFIG_POINT_OF_SALE_NOT_FOUND

Categoría: configuration

Severidad: high

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: no existe punto de venta configurado para el contexto fiscal.

FISCAL_CONFIG_POINT_OF_SALE_INACTIVE

Categoría: configuration

Severidad: high

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: el punto de venta existe pero está inactivo.

FISCAL_CONFIG_SEQUENCE_BLOCKED

Categoría: configuration

Severidad: critical

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: la secuencia fiscal está bloqueada y no debe seguir operándose.

8.2 CREDENTIALS / WSAA
FISCAL_WSAA_TRA_BUILD_FAILED

Categoría: credentials

Severidad: high

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: falló la construcción del TRA.

FISCAL_WSAA_SIGNING_FAILED

Categoría: credentials

Severidad: critical

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: no se pudo firmar el TRA con la private key.

FISCAL_WSAA_CERTIFICATE_INVALID

Categoría: credentials

Severidad: critical

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: el certificado es inválido, incompatible o corrupto.

FISCAL_WSAA_CERTIFICATE_EXPIRED

Categoría: credentials

Severidad: critical

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: certificado vencido.

FISCAL_WSAA_AUTH_REJECTED

Categoría: credentials

Severidad: critical

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: WSAA rechazó la autenticación.

FISCAL_WSAA_TIMEOUT

Categoría: connectivity

Severidad: high

Retryable: true

Reconcile required: false

Job transition: failed

Descripción: timeout obteniendo TA WSAA, previo al request fiscal.

Nota:

como todavía no se emitió FECAESolicitar, no corresponde reconciliación

se puede reintentar de forma controlada

8.3 WSFE / REQUEST BUILD
FISCAL_REQUEST_BUILD_FAILED

Categoría: request_build

Severidad: high

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: error interno al construir payload o XML fiscal.

FISCAL_REQUEST_INVALID_INTERNAL_CONTRACT

Categoría: request_build

Severidad: high

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: datos internos insuficientes o inválidos para facturar.

FISCAL_WSFE_CLIENT_INIT_FAILED

Categoría: connectivity

Severidad: medium

Retryable: true

Reconcile required: false

Job transition: failed

Descripción: no se pudo inicializar el cliente SOAP antes del envío.

8.4 WSFE RESPONSE / CONNECTIVITY
FISCAL_WSFE_TIMEOUT_UNCERTAIN

Categoría: connectivity

Severidad: critical

Retryable: false

Reconcile required: true

Job transition: pending_reconcile

Descripción: timeout después de iniciar envío a WSFEv1; no hay certeza de autorización.

FISCAL_WSFE_NETWORK_ERROR_UNCERTAIN

Categoría: connectivity

Severidad: critical

Retryable: false

Reconcile required: true

Job transition: pending_reconcile

Descripción: error de red en punto incierto del request a WSFEv1.

FISCAL_WSFE_DNS_ERROR_PRE_SEND

Categoría: connectivity

Severidad: high

Retryable: true

Reconcile required: false

Job transition: failed

Descripción: fallo de DNS antes del envío efectivo.

FISCAL_WSFE_TLS_ERROR_PRE_SEND

Categoría: connectivity

Severidad: high

Retryable: true

Reconcile required: false

Job transition: failed

Descripción: error TLS antes del envío confirmado.

FISCAL_WSFE_MALFORMED_RESPONSE

Categoría: connectivity

Severidad: high

Retryable: false

Reconcile required: true

Job transition: pending_reconcile

Descripción: llegó respuesta inválida o incompleta y no puede asegurarse el estado fiscal.

8.5 FISCAL REJECTION
FISCAL_REJECTED_BY_ARCA

Categoría: fiscal_rejection

Severidad: high

Retryable: false

Reconcile required: false

Job transition: rejected

Descripción: AFIP / ARCA rechazó formalmente el comprobante.

Detalles esperados:

códigos

mensajes

observaciones

eventos

FISCAL_REJECTED_INVALID_CUSTOMER_DOC

Categoría: fiscal_rejection

Severidad: medium

Retryable: false

Reconcile required: false

Job transition: rejected

Descripción: documento del cliente inválido o incompatible.

FISCAL_REJECTED_INVALID_AMOUNT_BREAKDOWN

Categoría: fiscal_rejection

Severidad: high

Retryable: false

Reconcile required: false

Job transition: rejected

Descripción: inconsistencia entre total, neto, IVA, tributos, etc.

FISCAL_REJECTED_INVALID_POINT_OF_SALE

Categoría: fiscal_rejection

Severidad: critical

Retryable: false

Reconcile required: false

Job transition: rejected

Descripción: punto de venta no habilitado o inválido.

FISCAL_REJECTED_SEQUENCE_CONFLICT

Categoría: fiscal_rejection

Severidad: critical

Retryable: false

Reconcile required: true

Job transition: pending_reconcile

Descripción: conflicto de numeración detectado por AFIP / ARCA.

Nota:

aunque haya rechazo, conviene tratarlo como incidente de reconciliación operativa y bloquear la secuencia si corresponde

8.6 DATABASE / RPC
FISCAL_DB_RPC_RESERVE_SEQUENCE_FAILED

Categoría: database

Severidad: critical

Retryable: true

Reconcile required: false

Job transition: failed

Descripción: falló la reserva de secuencia en DB.

FISCAL_DB_RPC_MARK_AUTHORIZING_FAILED

Categoría: database

Severidad: high

Retryable: true

Reconcile required: false

Job transition: failed

Descripción: no se pudo persistir transición a authorizing.

FISCAL_DB_RPC_MARK_AUTHORIZED_FAILED

Categoría: database

Severidad: critical

Retryable: false

Reconcile required: true

Job transition: pending_reconcile

Descripción: AFIP aprobó pero no se pudo persistir correctamente el resultado.

FISCAL_DB_INVOICE_UNIQUE_CONFLICT

Categoría: database

Severidad: critical

Retryable: false

Reconcile required: true

Job transition: pending_reconcile

Descripción: conflicto de unicidad al guardar invoice.

8.7 STATE MACHINE
FISCAL_STATE_INVALID_TRANSITION

Categoría: state_machine

Severidad: high

Retryable: false

Reconcile required: false

Job transition: failed

Descripción: el worker intentó una transición no válida.

FISCAL_STATE_JOB_ALREADY_PROCESSED

Categoría: state_machine

Severidad: low

Retryable: false

Reconcile required: false

Job transition: none

Descripción: otro worker o corrida previa ya cerró el job.

8.8 RENDER / STORAGE / PRINT
FISCAL_RENDER_QR_FAILED

Categoría: render

Severidad: medium

Retryable: true

Reconcile required: false

Job transition: render_pending

Descripción: falló la generación del QR.

FISCAL_RENDER_PDF_FAILED

Categoría: render

Severidad: medium

Retryable: true

Reconcile required: false

Job transition: render_pending

Descripción: falló la generación del PDF.

FISCAL_RENDER_THERMAL_TICKET_FAILED

Categoría: render

Severidad: medium

Retryable: true

Reconcile required: false

Job transition: render_pending

Descripción: falló la generación del ticket térmico.

FISCAL_STORAGE_UPLOAD_FAILED

Categoría: storage

Severidad: medium

Retryable: true

Reconcile required: false

Job transition: render_pending

Descripción: falló upload de PDF/ticket/QR a storage.

FISCAL_PRINT_DISPATCH_FAILED

Categoría: printing

Severidad: low

Retryable: true

Reconcile required: false

Job transition: none

Descripción: falló el envío a impresión. La factura ya existe.

8.9 RECONCILIATION
FISCAL_RECONCILE_QUERY_FAILED

Categoría: reconciliation

Severidad: high

Retryable: true

Reconcile required: true

Job transition: pending_reconcile

Descripción: falló consulta o resolución de reconciliación.

FISCAL_RECONCILE_RESULT_STILL_UNKNOWN

Categoría: reconciliation

Severidad: medium

Retryable: true

Reconcile required: true

Job transition: pending_reconcile

Descripción: todavía no puede determinarse el estado final.

FISCAL_RECONCILE_SEQUENCE_MISMATCH

Categoría: reconciliation

Severidad: critical

Retryable: false

Reconcile required: true

Job transition: pending_reconcile

Descripción: inconsistencia fuerte entre secuencia local y confirmación externa.

## 9. Matriz de decisión resumida

Code Retry Reconcile Transition
FISCAL_WSAA_TIMEOUT sí no failed
FISCAL_WSFE_TIMEOUT_UNCERTAIN no sí pending_reconcile
FISCAL_REJECTED_BY_ARCA no no rejected
FISCAL_RENDER_PDF_FAILED sí no render_pending
FISCAL_DB_RPC_MARK_AUTHORIZED_FAILED no sí pending_reconcile
FISCAL_PRINT_DISPATCH_FAILED sí no none

## 10. Reglas de implementación

10.1 No usar strings libres

Todos los errores deben mapearse a un code del catálogo.

10.2 Conservar raw details

Se deben persistir detalles técnicos internos sin exponer secretos.

10.3 Separar mensaje técnico de mensaje operativo

mensaje técnico: para logs

mensaje operativo: para dashboard/backoffice

10.4 Nunca ocultar incertidumbre

Si el estado es incierto, debe verse explícitamente como pending_reconcile.

## 11. Helper sugerido de clasificación

Interfaz sugerida:

type FiscalErrorClassification = {
code: string
category: string
severity: 'low' | 'medium' | 'high' | 'critical'
retryable: boolean
reconcileRequired: boolean
jobTransition: 'rejected' | 'pending_reconcile' | 'failed' | 'render_pending' | 'none'
message: string
details?: Record<string, unknown>
}

## 12. Próximos usos del catálogo

Este catálogo debe ser usado por:

worker fiscal

reconciliación

dashboards operativos

alerting

testing

prompts de Codex

playbooks de soporte

## 13. Conclusión

La calidad operativa del servicio fiscal depende menos de “hacer un request SOAP” y más de clasificar correctamente lo que ocurre cuando algo sale mal.

Este catálogo establece el lenguaje operativo estándar para NODUX y evita errores críticos como:

asumir rechazo donde hay incertidumbre

reintentar ciegamente una operación fiscal

reutilizar numeración

mezclar error técnico con validación fiscal
