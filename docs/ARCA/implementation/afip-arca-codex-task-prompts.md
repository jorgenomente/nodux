# AFIP / ARCA Codex Task Prompts
**Proyecto:** NODUX  
**Versión:** v0.1  
**Estado:** Draft operativo  
**Última actualización:** 2026-03-08

---

## 1. Propósito

Este documento define prompts de trabajo para ejecutar la implementación fiscal AFIP / ARCA en NODUX usando Codex CLI de forma ordenada, incremental y alineada con la arquitectura definida.

El objetivo es dividir el trabajo en tareas pequeñas, verificables y compatibles con el enfoque:

- DB-first
- RLS-first
- docs-first
- multi-tenant
- Zero Trust
- secuencia fiscal segura
- reconciliación obligatoria

---

## 2. Reglas para Codex

Antes de cada tarea, Codex debe respetar estas reglas:

1. no inventar features fuera del alcance del lote
2. no romper el esquema multi-tenant
3. no mover lógica crítica de secuencia fuera de DB
4. no exponer secretos al frontend
5. no simplificar eliminando `pending_reconcile`
6. no mezclar venta interna con factura fiscal
7. no cambiar nombres de tablas/funciones sin documentarlo
8. no introducir dependencias innecesarias
9. dejar código listo para revisión
10. documentar decisiones no triviales

---

## 3. Convención de ejecución

Cada tarea debe pedir a Codex:

- leer docs relevantes
- proponer plan corto
- implementar
- explicar archivos tocados
- listar riesgos o pendientes
- no avanzar a la siguiente tarea automáticamente

---

## 4. Prompt base reusable

```text
Lee primero estos documentos antes de tocar código:

- docs/ARCA/architecture/afip-arca-fiscal-service.md
- docs/ARCA/architecture/afip-arca-data-model.md
- docs/ARCA/architecture/afip-arca-state-machine.md
- docs/ARCA/architecture/afip-arca-security-and-secrets.md
- docs/ARCA/architecture/afip-arca-wsaa-wsfev1-integration-contracts.md
- docs/ARCA/implementation/afip-arca-worker-runtime.md
- docs/ARCA/implementation/afip-arca-worker-error-catalog.md
- docs/ARCA/implementation/afip-arca-render-pipeline.md
- docs/ARCA/implementation/afip-arca-reconciliation-playbook.md
- docs/ARCA/implementation/afip-arca-testing-strategy.md

Respeta estrictamente la arquitectura definida.
No simplifiques eliminando estados o flujos críticos.
No cambies el modelo de datos sin justificarlo.

Primero:
1. resume el plan en pasos concretos
2. lista archivos que piensas crear o modificar
3. implementa sólo el alcance pedido
4. al final explica exactamente qué hiciste, qué falta y qué riesgos ves
```

## 5. Tareas por lote
Tarea 1 — crear tipos y contratos compartidos
Usa el prompt base.

Objetivo:
Crear la base de tipos TypeScript para el módulo fiscal.

Alcance:
- crear `src/server/fiscal/shared/fiscal-types.ts`
- definir tipos para:
  - FiscalEnvironment
  - FiscalJobStatus
  - FiscalNormalizedResult
  - FiscalErrorClassification
  - RenderInput
  - RenderOutput
  - WsaaContext
  - ReconcileResult

Restricciones:
- no implementar lógica todavía
- no tocar frontend
- no tocar DB
- mantener naming consistente con docs

Entrega:
- archivo creado
- breve explicación del contrato
Tarea 2 — crear logger y redaction helpers
Usa el prompt base.

Objetivo:
Crear utilidades de logging y redacción de secretos para el worker fiscal.

Alcance:
- crear:
  - `src/server/fiscal/shared/fiscal-logger.ts`
  - `src/server/fiscal/shared/redact-secrets.ts`
- soportar redacción de:
  - token
  - sign
  - private key
  - certificate
  - xml firmado
- logger debe aceptar contexto estructurado:
  - invoice_job_id
  - tenant_id
  - environment
  - pto_vta
  - cbte_tipo
  - cbte_nro
  - correlation_id

Restricciones:
- no meter dependencia pesada si no hace falta
- no loggear secretos completos nunca
Tarea 3 — wrappers RPC fiscales
Usa el prompt base.

Objetivo:
Implementar wrappers server-side para las RPC fiscales ya definidas en Postgres.

Alcance:
Crear:
- `src/server/fiscal/rpc/reserve-sequence.ts`
- `src/server/fiscal/rpc/mark-authorizing.ts`
- `src/server/fiscal/rpc/mark-authorized.ts`
- `src/server/fiscal/rpc/mark-rejected.ts`
- `src/server/fiscal/rpc/mark-pending-reconcile.ts`
- `src/server/fiscal/rpc/mark-render-completed.ts`

Requisitos:
- usar service role
- tipar inputs/outputs
- mapear errores a fiscal error catalog cuando corresponda
- no tocar lógica SQL
Tarea 4 — loader de jobs pendientes
Usa el prompt base.

Objetivo:
Implementar carga de invoice_jobs pendientes y pending_reconcile para el worker.

Alcance:
Crear:
- `src/server/fiscal/worker/poll-pending-jobs.ts`
- `src/server/fiscal/worker/poll-reconcile-jobs.ts`

Requisitos:
- traer sólo campos necesarios
- ordenar por created_at asc
- permitir batch size configurable
- separar pending y pending_reconcile
- no procesar todavía, solo cargar y devolver contexto
Tarea 5 — credential resolver
Usa el prompt base.

Objetivo:
Implementar resolución de credenciales y punto de venta.

Alcance:
Crear:
- `src/server/fiscal/worker/resolve-credentials.ts`

Debe:
- buscar fiscal_credentials activas por tenant/environment
- buscar points_of_sale activos
- validar contexto
- devolver contrato tipado
- lanzar errores del catálogo si faltan credenciales o POS
Tarea 6 — TRA builder y signing contracts
Usa el prompt base.

Objetivo:
Implementar build del TRA y contrato de firma para WSAA.

Alcance:
Crear:
- `src/server/fiscal/auth/build-tra.ts`
- `src/server/fiscal/auth/sign-tra.ts`

Requisitos:
- build-tra debe generar estructura consistente para WSAA
- sign-tra puede dejar adapter o stub claro si la firma final depende de librería
- documentar qué dependencia real se espera usar
- no resolver todavía el cliente WSAA completo si no es necesario
Tarea 7 — WSAA cache + auth manager
Usa el prompt base.

Objetivo:
Implementar cache y manager de autenticación WSAA.

Alcance:
Crear:
- `src/server/fiscal/auth/wsaa-cache.ts`
- `src/server/fiscal/auth/wsaa-client.ts`

Requisitos:
- primero intentar TA vigente desde DB/contexto seguro
- si venció, renovar
- devolver `WsaaContext`
- no loggear token/sign
- timeouts configurables
Tarea 8 — builder de request FECAESolicitar
Usa el prompt base.

Objetivo:
Construir payload normalizado para FECAESolicitar.

Alcance:
Crear:
- `src/server/fiscal/wsfe/build-fecae-request.ts`

Requisitos:
- input tipado
- output estable
- validar importes
- respetar cbte tipo, pto vta, cbte nro
- no enviar todavía
Tarea 9 — normalizador de respuesta WSFE
Usa el prompt base.

Objetivo:
Normalizar respuestas de WSFEv1 a contrato interno.

Alcance:
Crear:
- `src/server/fiscal/wsfe/normalize-wsfe-response.ts`
- `src/server/fiscal/wsfe/map-afip-errors.ts`

Requisitos:
- soportar approved
- soportar rejected
- soportar malformed
- soportar uncertain
- mapear al catálogo de errores interno
Tarea 10 — cliente WSFEv1
Usa el prompt base.

Objetivo:
Implementar cliente WSFEv1 para FECAESolicitar.

Alcance:
Crear:
- `src/server/fiscal/wsfe/wsfe-client.ts`

Requisitos:
- aceptar auth context
- aceptar payload normalizado
- timeout configurable
- no mezclar con render
- devolver raw response + normalized result
- clasificar correctamente timeouts inciertos
Tarea 11 — build QR payload
Usa el prompt base.

Objetivo:
Implementar generación del payload QR fiscal desde invoice autorizada.

Alcance:
Crear:
- `src/server/fiscal/render/build-qr-payload.ts`

Requisitos:
- input tipado
- output JSON serializable
- no depender del frontend
Tarea 12 — render PDF y thermal ticket
Usa el prompt base.

Objetivo:
Implementar render básico de PDF A4 y ticket térmico.

Alcance:
Crear:
- `src/server/fiscal/render/render-invoice-pdf.ts`
- `src/server/fiscal/render/render-thermal-ticket.ts`

Requisitos:
- versión MVP simple
- determinístico
- sin diseño complejo
- usar sólo datos persistidos/autorizados
Tarea 13 — upload artifacts
Usa el prompt base.

Objetivo:
Implementar subida de artefactos fiscales a storage.

Alcance:
Crear:
- `src/server/fiscal/render/upload-artifacts.ts`

Requisitos:
- separar homo/prod
- paths determinísticos
- devolver pdfStoragePath y ticketStoragePath
Tarea 14 — render pipeline
Usa el prompt base.

Objetivo:
Implementar pipeline completo de render post-autorización.

Alcance:
Crear:
- `src/server/fiscal/render/run-render-pipeline.ts`

Debe:
- build QR payload
- render PDF
- render thermal ticket
- upload artifacts
- devolver RenderOutput
- no cambiar estados DB directamente; usar RPC wrapper desde caller
Tarea 15 — processInvoiceJob
Usa el prompt base.

Objetivo:
Implementar el flujo principal del worker para un invoice_job pending.

Alcance:
Crear:
- `src/server/fiscal/worker/process-invoice-job.ts`

Debe:
- cargar contexto
- resolver credenciales
- reservar secuencia
- marcar authorizing
- obtener WSAA
- construir request
- llamar WSFE
- normalizar respuesta
- cerrar por authorized / rejected / pending_reconcile
- si authorized: ejecutar render pipeline y markRenderCompleted
- usar catálogo de errores
Tarea 16 — processReconcileJob
Usa el prompt base.

Objetivo:
Implementar flujo de reconciliación para invoice_jobs pending_reconcile.

Alcance:
Crear:
- `src/server/fiscal/worker/process-reconcile-job.ts`

Requisitos:
- cargar contexto
- resolver estrategia de reconciliación
- cerrar como authorized o rejected cuando haya evidencia
- mantener pending_reconcile si sigue incierto
- bloquear secuencia si detecta inconsistencia fuerte
Tarea 17 — run worker
Usa el prompt base.

Objetivo:
Implementar entrypoint del worker fiscal.

Alcance:
Crear:
- `src/server/fiscal/worker/run-worker.ts`

Debe:
- correr polling de pending
- correr polling de pending_reconcile
- batch size configurable
- logs estructurados
- no procesar infinito sin control
Tarea 18 — unit tests base
Usa el prompt base.

Objetivo:
Crear unit tests base para el módulo fiscal.

Alcance:
Agregar tests para:
- build-tra
- normalize-wsfe-response
- classify fiscal errors
- build-qr-payload
- build-fecae-request

Requisitos:
- tests claros
- sin depender de homologación real
Tarea 19 — integration tests RPC
Usa el prompt base.

Objetivo:
Crear integration tests para las RPC fiscales.

Alcance:
Probar:
- reserve sequence
- mark authorizing
- mark authorized
- mark rejected
- mark render completed

Requisitos:
- validar estados y persistencia
- validar no colisión básica
Tarea 20 — documento de pendientes y gaps
Usa el prompt base.

Objetivo:
Crear documento final de gaps de implementación fiscal.

Alcance:
Crear:
- `docs/ARCA/implementation/afip-arca-implementation-gaps.md`

Debe resumir:
- qué quedó listo
- qué sigue faltando
- riesgos de pasar a homologación
- supuestos técnicos

## 6. Prompt de revisión técnica
Revisa la implementación fiscal actual contra estos documentos:

- docs/ARCA/architecture/afip-arca-fiscal-service.md
- docs/ARCA/implementation/afip-arca-worker-runtime.md
- docs/ARCA/implementation/afip-arca-worker-error-catalog.md
- docs/ARCA/implementation/afip-arca-render-pipeline.md
- docs/ARCA/implementation/afip-arca-reconciliation-playbook.md
- docs/ARCA/implementation/afip-arca-testing-strategy.md

Objetivo:
hacer auditoría técnica de consistencia.

Entrega:
1. desvíos contra arquitectura
2. riesgos de secuencia/estado
3. riesgos de secretos/seguridad
4. riesgos de retry/reconcile
5. propuestas concretas de corrección
No reescribas todo; enfócate en gaps reales.

## 7. Prompt de hardening antes de homologación
Revisa el módulo fiscal de NODUX antes de homologación AFIP / ARCA.

Quiero una evaluación de readiness estricta.

Evalúa:
- DB / RPC
- worker runtime
- WSAA auth
- WSFE client
- render pipeline
- reconcile
- logs
- métricas
- secretos
- testing

Entrega:
- blockers
- riesgos altos
- mejoras recomendadas
- checklist final de homologación
No seas complaciente.

## 8. Prompt de refactor controlado
Necesito refactorizar el módulo fiscal sin cambiar comportamiento funcional.

Reglas:
- no cambiar tablas ni RPC salvo necesidad muy justificada
- no romper contratos existentes
- no tocar frontend
- no simplificar pending_reconcile
- no mover secuencia fuera de DB

Objetivo:
mejorar legibilidad, separar responsabilidades y reducir duplicación.

Entrega:
1. plan de refactor
2. archivos afectados
3. implementación
4. riesgos

## 9. Orden recomendado de ejecución

tipos compartidos

logger + redaction

RPC wrappers

loaders de jobs

credential resolver

TRA builder + sign contract

WSAA client/cache

FECAE request builder

response normalizer + error map

WSFE client

QR payload

PDF/ticket render

upload artifacts

render pipeline

processInvoiceJob

processReconcileJob

run-worker

tests unit

tests integration

gaps doc


## 10. Conclusión

Estos prompts convierten la arquitectura fiscal de NODUX en una secuencia de ejecución concreta para Codex CLI, minimizando improvisación y manteniendo alineación con los principios críticos del sistema:

secuencia segura

DB como fuente de verdad

worker desacoplado

reconciliación obligatoria

render post-autorización

testing orientado a riesgo