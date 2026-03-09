# AFIP / ARCA Reconciliation Playbook
**Proyecto:** NODUX  
**Versión:** v0.1  
**Estado:** Draft operativo  
**Última actualización:** 2026-03-08

---

## 1. Propósito

Este documento define el playbook operativo de reconciliación para jobs fiscales que quedaron en estado incierto dentro de NODUX.

La reconciliación existe para resolver una pregunta crítica:

**¿AFIP / ARCA autorizó o no autorizó realmente este comprobante?**

---

## 2. Cuándo se usa

Este playbook aplica cuando un `invoice_job` entra en:

- `pending_reconcile`

Casos típicos:

- timeout luego del envío a WSFEv1
- error de red durante el request
- respuesta truncada o inválida
- crash del worker entre request y persistencia
- conflicto de persistencia local luego de aprobación externa

---

## 3. Principio central

### Nunca asumir rechazo en estado incierto

Si no hay certeza, no se puede:

- reutilizar `cbte_nro`
- volver a reservar otro número como si nada
- cerrar el job como rechazado sin evidencia

---

## 4. Objetivos de reconciliación

- determinar el estado real del comprobante
- proteger correlatividad fiscal
- resolver secuencias pendientes
- cerrar jobs colgados
- minimizar intervención manual

---

## 5. Resultados posibles

Un job en reconciliación debe terminar en uno de estos resultados:

### 5.1 `authorized`
Se confirma que AFIP autorizó.

### 5.2 `rejected`
Se confirma que AFIP rechazó.

### 5.3 `still_unknown`
No se pudo determinar todavía.

### 5.4 `blocked_for_manual_resolution`
Se detectó inconsistencia fuerte y requiere soporte manual.

---

## 6. Señales de entrada

Cada job en reconciliación debe tener, idealmente:

- `invoice_job_id`
- `tenant_id`
- `environment`
- `pto_vta`
- `cbte_tipo`
- `cbte_nro`
- `sale_id`
- `correlation_id`
- `last_error_code`
- `response_payload_json`
- request original o suficiente metadata reconstruible

---

## 7. Estrategia general

```text
job pending_reconcile
  ↓
reconstruir contexto
  ↓
consultar / verificar estado externo
  ↓
clasificar resultado
  ├─ authorized
  ├─ rejected
  ├─ still_unknown
  └─ manual_resolution
```

## 8. Reglas de seguridad operativa

### 8.1 No avanzar numeración si la actual está incierta

La secuencia queda “contaminada” hasta resolverla.

### 8.2 No ejecutar reconciliación desde frontend

Sólo worker o herramientas internas.

### 8.3 Registrar cada intento

Toda reconciliación debe emitir evento y log.


## 9. Flujo operativo sugerido
Paso 1 — cargar job

Validar que:

exista

siga en pending_reconcile

tenga datos mínimos de contexto

Paso 2 — cargar secuencia

Verificar:

fiscal_sequences

estado actual

last_local_reserved

last_arca_confirmed

Paso 3 — reconstruir request lógico

Armar contexto suficiente de comprobante:

punto de venta

tipo

número

importes

fecha

CUIT

Paso 4 — consultar estado

Usar estrategia de consulta o verificación disponible.

Paso 5 — decidir resultado

si autorizado → cerrar como autorizado

si rechazado → cerrar como rechazado

si incierto → mantener pendiente

si inconsistente → bloquear secuencia y escalar


## 10. Estrategias de resolución
10.1 Estrategia A — confirmación positiva

Si se logra evidencia suficiente de autorización:

llamar fn_fiscal_mark_job_authorized(...)

ejecutar render si falta

llamar fn_fiscal_mark_render_completed(...) si aplica

10.2 Estrategia B — confirmación negativa

Si se logra evidencia suficiente de rechazo:

llamar fn_fiscal_mark_job_rejected(...)

10.3 Estrategia C — sigue incierto

Si no hay evidencia concluyente:

mantener pending_reconcile

registrar intento

programar nuevo intento

10.4 Estrategia D — inconsistencia fuerte

Si hay mismatch grave:

bloquear secuencia

registrar incidente crítico

escalar a resolución manual


## 11. Señales de inconsistencia fuerte

Ejemplos:

AFIP confirma un número distinto al reservado

cbte_nro local ya existe autorizado con otro contenido

conflicto entre invoice_job y invoices

secuencia local adelantada o atrasada de forma no explicable

aprobación externa sin persistencia local consistente


## 12. Acciones automáticas permitidas

Se puede automatizar:

reintento de reconciliación

recolección de contexto

cierre automático a authorized

cierre automático a rejected

regeneración de render posterior

No se debe automatizar ciegamente:

desbloqueo de secuencias conflictivas

reseteo de correlatividad

reutilización de números


## 13. Frecuencias sugeridas
Primer reintento

rápido, pocos segundos o minutos después

Reintentos posteriores

backoff progresivo

Escalado manual

si supera umbral temporal definido por operación


## 14. Política sugerida

reintento 1: inmediato o a pocos segundos

reintento 2: 1 minuto

reintento 3: 5 minutos

reintento 4: 15 minutos

luego: alerta + revisión manual si sigue incierto


## 15. Eventos de auditoría sugeridos

reconcile_started

reconcile_context_loaded

reconcile_confirmed_authorized

reconcile_confirmed_rejected

reconcile_still_unknown

reconcile_sequence_blocked

reconcile_manual_resolution_required


## 16. Contrato interno sugerido

```ts
type ReconcileInput = {
  invoiceJobId: string
  tenantId: string
  environment: 'homo' | 'prod'
  ptoVta: number
  cbteTipo: number
  cbteNro: number
  correlationId: string
}
type ReconcileResult =
  | { outcome: 'authorized'; normalizedResult: Record<string, unknown> }
  | { outcome: 'rejected'; normalizedResult: Record<string, unknown> }
  | { outcome: 'still_unknown'; reason: string }
  | { outcome: 'manual_resolution'; reason: string }
```

## 17. Pseudocódigo

```ts
async function processReconcileJob(jobId: string) {
  const job = await loadPendingReconcileJob(jobId)
  const context = await buildReconcileContext(job)

  const result = await queryOrVerifyExternalState(context)

  if (result.outcome === 'authorized') {
    const invoiceId = await rpc.markAuthorized(job.id, result.normalizedResult)

    const renderNeeded = await shouldRender(invoiceId)
    if (renderNeeded) {
      const renderResult = await runRenderPipeline(...)
      await rpc.markRenderCompleted(job.id, invoiceId, renderResult)
    }

    return
  }

  if (result.outcome === 'rejected') {
    await rpc.markRejected(job.id, result.normalizedResult)
    return
  }

  if (result.outcome === 'still_unknown') {
    await appendReconcileEvent(job.id, result)
    return
  }

  await blockSequenceAndEscalate(job, result)
}
```

## 18. Criterios para bloqueo de secuencia

Bloquear secuencia si:

hay conflicto de correlatividad

el estado externo contradice el local

no puede garantizarse integridad de próximos comprobantes

se detecta duplicación o colisión seria


## 19. Resolución manual

La resolución manual debe contar con:

invoice_job completo

eventos

payloads

secuencia actual

invoice relacionada si existe

logs técnicos

estado del worker

Resultado esperado:

decidir cierre correcto

documentar incidente

dejar secuencia segura


## 20. Métricas operativas

Medir:

jobs en pending_reconcile

antigüedad promedio

tiempo medio de resolución

porcentaje resuelto automáticamente

porcentaje escalado manualmente

secuencias bloqueadas


## 21. Dashboard sugerido

Vista mínima:

tenant

ambiente

punto de venta

tipo

número

edad del incidente

último error

último intento

resultado provisional

acción sugerida


## 22. Errores comunes a evitar
22.1 Reemitir comprobante con otro número sin resolver el anterior

Incorrecto.

22.2 Marcar rejected por intuición

Incorrecto.

22.3 Ignorar jobs viejos en reconcile

Genera deuda operativa y riesgo de inconsistencia.

22.4 Desbloquear secuencia sin trazabilidad

Incorrecto.


## 23. Checklist

 polling de jobs pending_reconcile

 carga de contexto de reconciliación

 estrategia de consulta/verificación

 clasificación de resultados

 cierre automático authorized/rejected

 bloqueo de secuencia si aplica

 eventos de auditoría

 métricas y alertas


## 24. Conclusión

La reconciliación no es un extra opcional: es una capacidad obligatoria para cualquier POS serio que facture con AFIP / ARCA.

Su función es proteger lo más delicado del sistema fiscal:

correlatividad

certeza del estado

integridad de secuencias

auditabilidad del incidente
