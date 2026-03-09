# AFIP / ARCA Worker Runtime
**Proyecto:** NODUX  
**Versión:** v0.1  
**Estado:** Draft operativo  
**Última actualización:** 2026-03-08

---

## 1. Propósito

Este documento define el runtime operativo del **Fiscal Worker** de NODUX para integrar facturación electrónica AFIP / ARCA de forma segura, desacoplada y compatible con una arquitectura multi-tenant.

El worker es responsable de ejecutar el flujo técnico de facturación, mientras que el POS y la API de ventas sólo disparan solicitudes fiscales.

---

## 2. Objetivos

El Fiscal Worker debe:

- consumir `invoice_jobs` pendientes
- asegurar autenticación WSAA vigente
- reservar numeración fiscal vía RPC
- invocar WSFEv1
- persistir resultados vía RPC
- resolver errores y estados inciertos
- generar PDF / ticket / QR fuera del camino crítico
- dejar trazabilidad completa
- operar por tenant / ambiente / punto de venta sin mezclar contextos

---

## 3. Alcance

Este documento cubre:

- responsabilidades del worker
- arquitectura runtime
- contratos internos
- ciclo de ejecución
- estrategia de retries
- reconciliación
- observabilidad
- manejo de secretos
- separación por ambiente
- estructura sugerida de código

No cubre:

- implementación exacta SOAP de librería
- UI administrativa
- diseño visual final de PDFs
- impresoras fiscales legacy
- regímenes fiscales especiales fuera del MVP

---

## 4. Principios del runtime

### 4.1 Un worker fiscal no es un endpoint HTTP

El worker es un proceso de backend con permisos altos y acceso a secretos.

No debe exponerse como handler público.

---

### 4.2 El worker opera sobre jobs

La unidad operativa es `invoice_job`.

No opera directamente sobre ventas sueltas ni sobre clicks de UI.

---

### 4.3 El worker nunca inventa numeración

Toda numeración fiscal se reserva vía función DB:

- `fn_fiscal_reserve_sequence(...)`

El worker no calcula `cbte_nro` en memoria.

---

### 4.4 La DB define el estado fuente

El estado verdadero del pipeline vive en:

- `invoice_jobs`
- `invoices`
- `invoice_events`
- `fiscal_sequences`

El worker es ejecutor, no fuente de verdad.

---

### 4.5 Los secretos quedan fuera del frontend

El worker es el único actor operativo que puede desencriptar private keys y usar tokens WSAA.

---

## 5. Arquitectura lógica

```text
POS / Caja
  ↓
Sales API
  ↓
invoice_jobs (pending)
  ↓
Fiscal Worker
  ├─ Job Loader
  ├─ Credential Resolver
  ├─ WSAA Auth Manager
  ├─ Sequence Reservation Client
  ├─ WSFEv1 Client
  ├─ Response Normalizer
  ├─ Render Pipeline
  ├─ Reconciliation Processor
  └─ Metrics / Logging
  ↓
Postgres / Supabase
  ↓
Storage / Print Queue
````

---

## 6. Responsabilidades del worker

### 6.1 Job Loader

Responsable de:

* buscar jobs pendientes
* tomar jobs de forma segura
* evitar doble procesamiento
* priorizar por tenant / ambiente / antigüedad si aplica

---

### 6.2 Credential Resolver

Responsable de:

* localizar `fiscal_credentials`
* localizar `points_of_sale`
* resolver CUIT operativo
* validar estado activo
* validar ambiente correcto

---

### 6.3 WSAA Auth Manager

Responsable de:

* verificar si existe TA vigente
* renovar TA si está vencido o próximo a vencer
* devolver:

  * `Token`
  * `Sign`
  * `Cuit`

---

### 6.4 Sequence Reservation Client

Responsable de:

* invocar `fn_fiscal_reserve_sequence(job_id)`
* nunca reservar numeración fuera de DB
* respetar secuencias bloqueadas o en reconciliación

---

### 6.5 WSFEv1 Client

Responsable de:

* construir request SOAP
* mapear payload normalizado a formato AFIP / ARCA
* enviar `FECAESolicitar`
* parsear respuesta cruda
* distinguir:

  * aprobación
  * rechazo
  * timeout
  * error técnico
  * estado incierto

---

### 6.6 Response Normalizer

Responsable de traducir la respuesta SOAP a un payload interno consistente, por ejemplo:

```json
{
  "outcome": "approved",
  "cae": "12345678901234",
  "caeExpiresAt": "2026-03-18",
  "result": "A",
  "observations": [],
  "events": [],
  "raw": {}
}
```

También debe soportar:

* `rejected`
* `pending_reconcile`
* `technical_error`

---

### 6.7 Render Pipeline

Responsable de:

* generar QR fiscal
* generar PDF A4
* generar ticket térmico
* guardar paths en storage
* marcar job como completado

---

### 6.8 Reconciliation Processor

Responsable de:

* tomar jobs en `pending_reconcile`
* consultar comprobante si es posible
* resolver si fue autorizado o no
* cerrar el estado sin reutilizar numeración prematuramente

---

## 7. Modos de ejecución

### 7.1 Polling continuo

Modelo simple para MVP.

```text
cada X segundos:
  buscar invoice_jobs pendientes
  procesar lote
```

Ventajas:

* simple
* predecible
* fácil de debuggear

Desventajas:

* latencia fija
* más consultas a DB

---

### 7.2 Trigger + Queue

Modelo posterior.

```text
venta cierra
→ crea invoice_job
→ emite evento
→ worker consume
```

Ventajas:

* menor latencia
* mejor escala

Desventajas:

* mayor complejidad operativa

---

### 7.3 Recomendación para NODUX

Para Lote 1:

* **polling continuo**
* intervalo bajo
* batch chico
* proceso único o baja concurrencia controlada

---

## 8. Flujo principal del worker

### 8.1 Happy path

```text
1. buscar invoice_job con status = pending
2. cargar credenciales y punto de venta
3. reservar secuencia (RPC)
4. marcar authorizing (RPC)
5. obtener Token / Sign WSAA
6. construir request WSFEv1
7. enviar FECAESolicitar
8. normalizar respuesta
9. si approved:
   - marcar authorized (RPC)
   - generar QR
   - generar PDF/ticket
   - marcar render completed (RPC)
10. fin
```

---

### 8.2 Rechazo fiscal

```text
1. job reservado y authorizing
2. AFIP devuelve rechazo
3. normalizar rechazo
4. fn_fiscal_mark_job_rejected(...)
5. fin
```

---

### 8.3 Timeout / red / estado incierto

```text
1. request enviado
2. timeout o error técnico
3. no hay certeza de autorización
4. fn_fiscal_mark_job_pending_reconcile(...)
5. fin
```

---

## 9. Flujo de reconciliación

### 9.1 Cuándo aplica

Aplicar reconciliación si:

* el request salió pero la respuesta es incierta
* hay timeout luego de reservar numeración
* hay caída de red entre request y respuesta
* hay restart del worker en medio del proceso

---

### 9.2 Regla principal

Mientras un job esté en `pending_reconcile`:

* no reutilizar `cbte_nro`
* no asumir rechazo
* no desbloquear secuencia sin resolución

---

### 9.3 Flujo sugerido

```text
1. buscar jobs pending_reconcile
2. tomar uno
3. reconstruir contexto fiscal
4. consultar comprobante / reconciliar según estrategia
5. si confirmado aprobado:
   - fn_fiscal_mark_job_authorized(...)
   - render
   - fn_fiscal_mark_render_completed(...)
6. si confirmado rechazo:
   - fn_fiscal_mark_job_rejected(...)
7. si sigue incierto:
   - dejar pendiente
   - alertar si supera umbral temporal
```

---

## 10. Estrategia de retries

### 10.1 Qué sí reintentar

Se puede reintentar:

* obtención de TA WSAA por error transitorio
* envío WSFEv1 antes de recibir confirmación concluyente
* render PDF/ticket
* upload a storage
* print dispatch

---

### 10.2 Qué no reintentar ciegamente

No reintentar ciegamente:

* `FECAESolicitar` luego de timeout incierto sin reconciliar
* reserva de secuencia ya consumida
* jobs rechazados fiscalmente
* jobs con configuración inválida permanente

---

### 10.3 Política sugerida

#### WSAA

* 3 intentos
* backoff corto exponencial

#### WSFEv1

* 1 intento directo
* si timeout incierto → `pending_reconcile`
* si error técnico claro previo al envío → 1 retry controlado

#### Render

* hasta 3 intentos

#### Print

* hasta 3 intentos

---

## 11. Concurrencia

### 11.1 Riesgo

Dos workers podrían intentar procesar el mismo `invoice_job`.

---

### 11.2 Recomendación

Usar estrategia de claim explícito.

Opciones:

#### Opción A — status transition con lock

* seleccionar job `pending`
* lock row
* reservar secuencia
* mover a `reserved`

#### Opción B — columna de lease

Agregar más adelante:

* `leased_by`
* `leased_until`

---

### 11.3 MVP recomendado

Para Lote 1:

* un worker principal
* concurrencia baja
* procesamiento serial o por lotes pequeños

---

## 12. Manejo de secretos

### 12.1 Qué secretos usa el worker

* `certificate_pem`
* `encrypted_private_key`
* clave maestra / reference
* `Token`
* `Sign`

---

### 12.2 Regla

La desencriptación ocurre sólo dentro del proceso del worker.

Nunca:

* en frontend
* en Edge pública
* en cliente móvil
* en funciones compartidas sin boundary

---

### 12.3 Memoria

* no loggear secretos
* no persistir private key desencriptada
* limpiar buffers cuando sea posible
* no incluir Token / Sign en logs de error

---

## 13. Contratos internos del worker

### 13.1 Job payload mínimo esperado desde DB

```json
{
  "invoiceJobId": "uuid",
  "tenantId": "uuid",
  "saleId": "uuid",
  "environment": "homo",
  "ptoVta": 1,
  "cbteTipo": 11
}
```

---

### 13.2 WSAA context interno

```json
{
  "token": "string",
  "sign": "string",
  "cuit": "20123456789",
  "expiresAt": "2026-03-08T23:00:00Z"
}
```

---

### 13.3 Normalized fiscal result

```json
{
  "outcome": "approved",
  "cae": "12345678901234",
  "caeExpiresAt": "2026-03-18",
  "docTipo": 99,
  "docNro": 0,
  "currency": "PES",
  "currencyRate": 1,
  "amounts": {
    "total": 1210.00,
    "net": 1000.00,
    "iva": 210.00,
    "trib": 0.00,
    "opEx": 0.00,
    "totConc": 0.00
  },
  "observations": [],
  "events": [],
  "rawRequest": {},
  "rawResponse": {}
}
```

---

## 14. Estructura de código sugerida

```text
src/server/fiscal/
  worker/
    run-worker.ts
    poll-pending-jobs.ts
    poll-reconcile-jobs.ts
    process-invoice-job.ts
    process-reconcile-job.ts

  auth/
    wsaa-client.ts
    wsaa-cache.ts
    build-tra.ts
    sign-tra.ts

  wsfe/
    wsfe-client.ts
    build-fecae-request.ts
    normalize-wsfe-response.ts
    map-afip-errors.ts

  rpc/
    reserve-sequence.ts
    mark-authorizing.ts
    mark-authorized.ts
    mark-rejected.ts
    mark-pending-reconcile.ts
    mark-render-completed.ts

  render/
    build-qr-payload.ts
    render-invoice-pdf.ts
    render-thermal-ticket.ts
    upload-artifacts.ts

  shared/
    fiscal-types.ts
    fiscal-logger.ts
    fiscal-metrics.ts
    fiscal-config.ts
    redact-secrets.ts
```

---

## 15. Funciones clave sugeridas

### `pollPendingJobs()`

Busca jobs pendientes.

### `processInvoiceJob(jobId)`

Orquesta el happy path principal.

### `getOrRefreshWsaaTicket(credentials)`

Devuelve TA vigente.

### `buildFiscalRequest(jobContext)`

Arma request normalizado.

### `submitFiscalRequest(auth, request)`

Llama WSFEv1.

### `normalizeFiscalResponse(response)`

Mapea a contrato interno.

### `renderArtifacts(invoiceId)`

Genera QR + PDF + ticket.

### `processReconcileJob(jobId)`

Resuelve estados inciertos.

---

## 16. Pseudocódigo del flujo principal

```ts
async function processInvoiceJob(jobId: string) {
  const job = await loadJob(jobId)

  const credentials = await resolveCredentials(job)
  const pointOfSale = await resolvePointOfSale(job)

  const reserved = await rpc.reserveSequence(job.id)

  const requestPayload = await buildFiscalRequest({
    job,
    credentials,
    pointOfSale,
    cbteNro: reserved.cbte_nro
  })

  await rpc.markAuthorizing(job.id, requestPayload)

  const auth = await getOrRefreshWsaaTicket(credentials)

  try {
    const response = await wsfe.submitCAERequest({
      auth,
      payload: requestPayload
    })

    const normalized = normalizeFiscalResponse(response)

    if (normalized.outcome === 'approved') {
      const invoiceId = await rpc.markAuthorized(job.id, normalized)

      const renderResult = await renderArtifacts(invoiceId, normalized)

      await rpc.markRenderCompleted(job.id, invoiceId, renderResult)

      return
    }

    if (normalized.outcome === 'rejected') {
      await rpc.markRejected(job.id, normalized)
      return
    }

    await rpc.markPendingReconcile(job.id, normalized)
  } catch (error) {
    const classified = classifyFiscalError(error)

    if (classified.kind === 'uncertain') {
      await rpc.markPendingReconcile(job.id, classified.payload)
      return
    }

    if (classified.kind === 'definitive_rejection') {
      await rpc.markRejected(job.id, classified.payload)
      return
    }

    throw error
  }
}
```

---

## 17. Logging

### 17.1 Campos obligatorios

Todo log del worker debe incluir:

* `invoice_job_id`
* `tenant_id`
* `environment`
* `pto_vta`
* `cbte_tipo`
* `cbte_nro`
* `correlation_id`
* `worker_instance_id`

---

### 17.2 Nunca loggear

Nunca incluir en logs:

* private key
* Token
* Sign
* certificado completo
* request SOAP completo sin redacción

---

### 17.3 Redacción

Aplicar redacción a:

* headers sensibles
* XML firmado
* payloads de autenticación

---

## 18. Métricas

### 18.1 Métricas mínimas

* jobs pendientes
* jobs completados
* jobs rechazados
* jobs pending_reconcile
* tiempo medio WSAA
* tiempo medio WSFEv1
* tiempo medio render
* retries por tipo
* secuencias bloqueadas
* errores por tenant

---

### 18.2 Métricas por fase

#### Captura

* jobs creados por minuto

#### Fiscalización

* autorizaciones por minuto
* tasa de aprobación

#### Render

* PDF success rate
* ticket success rate

#### Reconciliación

* antigüedad media pending_reconcile

---

## 19. Configuración sugerida

```env
FISCAL_WORKER_ENABLED=true
FISCAL_POLL_INTERVAL_MS=3000
FISCAL_RECONCILE_INTERVAL_MS=15000
FISCAL_BATCH_SIZE=10
FISCAL_WSAA_TIMEOUT_MS=10000
FISCAL_WSFE_TIMEOUT_MS=15000
FISCAL_RENDER_TIMEOUT_MS=10000
FISCAL_MAX_RENDER_RETRIES=3
FISCAL_MAX_PRINT_RETRIES=3
FISCAL_HOMO_ENABLED=true
FISCAL_PROD_ENABLED=false
```

---

## 20. Separación por ambiente

El worker debe tratar `homo` y `prod` como universos separados.

Separar:

* endpoints
* certificados
* token cache
* numeración
* storage path
* métricas si es posible

Ejemplo:

```text
storage/fiscal/homo/...
storage/fiscal/prod/...
```

---

## 21. Integración con render

### 21.1 Orden correcto

```text
AFIP autorizado
→ generar QR
→ generar PDF/ticket
→ subir a storage
→ marcar completed
```

---

### 21.2 Si falla render

Si falla render después de autorización:

* la factura sigue existiendo fiscalmente
* el job no debe volver a `authorizing`
* reintentar sólo render
* mantener estado `render_pending` hasta resolver

---

## 22. Integración con impresión

La impresión no debe bloquear el cierre fiscal del documento.

Recomendación:

* `invoice_job` termina en `completed` al finalizar render
* la impresión va por `print_jobs`
* reimpresiones posteriores no reabren el job fiscal

---

## 23. Errores comunes a evitar

### 23.1 Mezclar reserva y request SOAP en una sola función gigante

Hace más difícil reintentos y observabilidad.

### 23.2 Reutilizar `cbte_nro` tras timeout

Incorrecto y peligroso.

### 23.3 Generar PDF antes de saber si hay CAE

Incorrecto.

### 23.4 Usar WSAA en cada venta

Ineficiente.

### 23.5 Dejar lógica de estados sólo en Node

La DB ya tiene RPCs; usarlas.

### 23.6 Loggear XML firmado completo

Riesgoso.

---

## 24. Checklist de implementación del worker

### Base

* [ ] proceso worker creado
* [ ] polling de jobs pending
* [ ] polling de jobs pending_reconcile

### Auth

* [ ] TRA builder
* [ ] signing flow
* [ ] WSAA client
* [ ] cache de TA

### Fiscal

* [ ] builder FECAESolicitar
* [ ] WSFEv1 client
* [ ] normalizador de respuesta
* [ ] clasificación de errores

### DB

* [ ] reserveSequence RPC
* [ ] markAuthorizing RPC
* [ ] markAuthorized RPC
* [ ] markRejected RPC
* [ ] markPendingReconcile RPC
* [ ] markRenderCompleted RPC

### Render

* [ ] QR builder
* [ ] PDF renderer
* [ ] thermal ticket renderer
* [ ] upload storage

### Operación

* [ ] logs estructurados
* [ ] métricas mínimas
* [ ] redacción de secretos
* [ ] alertas básicas

---

## 25. Estrategia recomendada para Lote 1

Para NODUX en homologación, el camino recomendado es:

1. worker único
2. polling simple
3. secuencia por RPC
4. WSAA cacheado
5. WSFEv1 síncrono
6. render simple PDF/ticket
7. reconciliación manual asistida o básica
8. observabilidad mínima desde el día 1

Esto minimiza complejidad sin comprometer la base arquitectónica.

---

## 26. Próximos documentos sugeridos

Después de este documento, crear:

1. `docs/ARCA/implementation/afip-arca-worker-error-catalog.md`
2. `docs/ARCA/implementation/afip-arca-render-pipeline.md`
3. `docs/ARCA/implementation/afip-arca-reconciliation-playbook.md`
4. `docs/ARCA/implementation/afip-arca-testing-strategy.md`
5. `docs/ARCA/implementation/afip-arca-codex-task-prompts.md`

---

## 27. Conclusión

El Fiscal Worker es el núcleo operativo que convierte una solicitud fiscal interna en un comprobante electrónico autorizado y renderizado.

Su diseño correcto depende de:

* DB como fuente de verdad
* secretos aislados
* reserva transaccional de numeración
* WSAA cacheado
* WSFEv1 desacoplado
* render fuera del camino fiscal
* reconciliación obligatoria para estados inciertos

Con esta base, NODUX puede arrancar rápido en homologación sin hipotecar la arquitectura futura.

```

El siguiente mejor paso es crear **`afip-arca-codex-task-prompts.md`** para que puedas ejecutar esto por lotes con Codex CLI de forma ordenada.
```
