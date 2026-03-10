11 — Codex Implementation Prompts: Factura A Flow

Estado: Ready for execution
Ámbito: Codex / Backend / POS / Fiscal Worker / Tests
Dependencias previas:

05-taxpayer-registry-and-invoice-class-resolution.md

06-implementation-plan-taxpayer-registry-and-factura-a-pos.md

07-sql-and-api-contracts-taxpayer-registry.md

08-application-services-and-sequence-diagrams-taxpayer-registry.md

09-pos-ui-and-state-machine-factura-a.md

10-error-handling-observability-and-runbooks-factura-a.md

Objetivo: definir prompts ejecutables y claros para que Codex implemente el flujo de Factura A en NODUX por lotes, manteniendo coherencia con la arquitectura fiscal existente.

1. Instrucción marco para todos los prompts

Usar esta cabecera en todos los prompts de implementación:

Trabaja sobre el proyecto NODUX siguiendo estas reglas:

- Respetar arquitectura actual del proyecto.
- No romper comportamiento existente del motor fiscal.
- Mantener separación clara entre POS, Sales API, taxpayer registry y fiscal worker.
- No hardcodear lógica fiscal en frontend.
- Todo lookup por CUIT y resolución de clase debe ocurrir en backend.
- El fiscal worker debe consumir snapshots cerrados, no consultar UI state.
- Mantener logs estructurados.
- Mantener tipado fuerte TypeScript.
- Si hace falta agregar tipos, schemas o repositorios, hacerlo de manera consistente con el código existente.
- No inventar endpoints externos no documentados en los docs ARCA del proyecto.
- Si una decisión no está clara, preferir contratos simples, backend-first y DX mantenible.
- Entregar código listo para revisar, con comentarios solo donde realmente aporten claridad.

2. Estrategia de ejecución

Implementar en este orden:

migraciones SQL

tipos y contratos

repositorios

gateway de lookup fiscal

casos de uso

endpoints API

integración POS

integración fiscal worker

tests

observabilidad

Cada lote debe dejar el sistema en estado compilable.

3. Prompt Lote 1 — SQL base
   Implementa la base SQL para taxpayer registry y Factura A según el documento docs/ARCA/07-sql-and-api-contracts-taxpayer-registry.md.

Tareas:

- crear una nueva migración SQL versionada en supabase/migrations/
- agregar tabla fiscal_taxpayer_cache con PK compuesta (cuit, environment)
- agregar tabla fiscal_taxpayer_lookup_log
- agregar tabla fiscal_reference_condicion_iva_receptor
- agregar columnas snapshot de receptor en fiscal_documents
- agregar índices recomendados
- agregar trigger/function fn_set_updated_at si no existe una equivalente reusable en el proyecto
- mantener estilo de migraciones existente del repo

Entregables:

- archivo de migración SQL listo para ejecutar
- breve resumen de qué creó/modificó
- nota si reutilizó utilidades SQL existentes o creó nuevas

4. Prompt Lote 2 — Tipos y contratos TypeScript
   Implementa los tipos y contratos TypeScript para taxpayer registry y resolución de Factura A según docs/ARCA/07-sql-and-api-contracts-taxpayer-registry.md.

Tareas:

- crear tipos de dominio:
  - TaxpayerSnapshot
  - TaxpayerLookupResult
  - DocumentClassResolution
  - FiscalReceiverSnapshot
- crear enums o unions para:
  - DocumentClass
  - TaxpayerLookupUiState
  - ResolutionUiState
  - FiscalErrorCode
- crear schemas Zod para:
  - cuitSchema
  - taxpayerSnapshotSchema
  - taxpayerLookupResultSchema
  - resolveDocumentClassRequestSchema
  - resolveDocumentClassResponseSchema
- ubicar archivos en módulos coherentes con la arquitectura actual

Entregables:

- archivos TS/Zod listos
- exports consolidados si el proyecto usa barrel files
- resumen corto de dónde quedó cada contrato

5. Prompt Lote 3 — Repositorios SQL
   Implementa los repositorios SQL para taxpayer registry según docs/ARCA/07-sql-and-api-contracts-taxpayer-registry.md.

Tareas:

- crear TaxpayerCacheRepository
- crear TaxpayerLookupLogRepository
- crear CondicionIvaReceptorRepository
- implementar métodos mínimos:
  - findByCuit
  - upsert
  - invalidate
  - insert log
  - getAll referencias
  - upsert referencias si hace falta
- respetar el patrón actual del proyecto para acceso DB
- evitar lógica de negocio en repositorios
- usar tipado fuerte en input/output

Entregables:

- implementación de repositorios
- interfaces de dominio si no existen
- resumen corto de métodos creados

6. Prompt Lote 4 — Utilidad de validación CUIT
   Implementa la utilidad de validación de CUIT para el flujo fiscal.

Tareas:

- crear función isValidCuit(cuit: string): boolean
- crear función normalizeCuit(input: string): string
- normalizeCuit debe remover guiones, espacios y caracteres no numéricos esperables de copy/paste
- agregar tests unitarios para CUIT válido, inválido, con guiones, con longitud incorrecta y dígito verificador incorrecto

Entregables:

- util TS
- test unitario completo
- breve nota de dónde quedó integrado

7. Prompt Lote 5 — Gateway de taxpayer registry
   Implementa el gateway backend para consulta de taxpayer registry por CUIT.

Contexto:

- este módulo debe encapsular la integración externa de padrón/constancia
- no debe filtrar lógica de UI
- debe devolver respuesta cruda o una estructura intermedia apta para normalización
- debe integrarse con el mecanismo WSAA existente si el proyecto ya tiene un servicio reusable para access tickets

Tareas:

- crear interface TaxpayerRegistryGateway
- crear implementación inicial en infrastructure
- si todavía no está cerrada la integración remota final, deja el gateway preparado con contrato claro y un adapter boundary limpio
- agregar normalizador separado taxpayer-normalizer.ts
- no acoplar el normalizador a repositorios

Entregables:

- interface gateway
- implementación inicial/adaptador
- normalizador
- breve nota de decisiones tomadas

8. Prompt Lote 6 — LookupTaxpayerUseCase
   Implementa LookupTaxpayerUseCase según docs/ARCA/08-application-services-and-sequence-diagrams-taxpayer-registry.md.

Reglas:

- validar CUIT al inicio
- buscar cache vigente
- usar cache si está vigente
- consultar gateway si no hay cache
- normalizar respuesta
- persistir cache
- registrar log de lookup
- devolver TaxpayerLookupResult
- si falla el remoto y hay cache usable, devolver degraded=true
- si falla el remoto y no hay cache, devolver o lanzar error normalizado según la convención del proyecto

Entregables:

- caso de uso implementado
- tests unitarios del caso de uso
- breve resumen de flujos cubiertos

9. Prompt Lote 7 — ResolveDocumentClassUseCase
   Implementa ResolveDocumentClassUseCase según docs/ARCA/08-application-services-and-sequence-diagrams-taxpayer-registry.md.

Reglas:

- depender de LookupTaxpayerUseCase
- leer referencias de condicion IVA receptor desde repositorio local
- resolver requestedClass vs resolvedClass
- si requestedClass = A y el receptor no califica, devolver allowed=false y resolvedClass alternativo si aplica
- no hardcodear mensajes de UI en este caso de uso, devolver warnings y blockingReason normalizados
- mantener el resolver puro si es posible

Entregables:

- caso de uso
- servicio puro InvoiceClassResolver si hace falta
- tests unitarios cubriendo:
  - A permitida
  - A bloqueada y sugerencia B
  - taxpayer no encontrado
  - falta referencia de condición IVA

10. Prompt Lote 8 — PrepareFiscalSaleUseCase
    Implementa PrepareFiscalSaleUseCase para cerrar el snapshot fiscal antes de emitir.

Reglas:

- recibir requestedDocumentClass y receiverCuit
- ejecutar lookup y resolución
- construir FiscalReceiverSnapshot
- devolver allowed + resolution + snapshot
- no persistir emisión aún
- dejar este caso de uso apto para ser usado desde checkout POS

Entregables:

- caso de uso
- tests unitarios
- resumen corto del contrato final

11. Prompt Lote 9 — Endpoints API internos
    Implementa los endpoints internos para taxpayer registry y resolución de clase.

Endpoints:

- GET /api/fiscal/taxpayer/:cuit
- POST /api/fiscal/resolve-document-class
- si el proyecto ya tiene endpoint de prepare fiscal sale, integrarlo; si no, agregar uno coherente con la arquitectura actual

Reglas:

- validar request con Zod
- usar casos de uso, no lógica inline
- devolver respuestas alineadas con docs/ARCA/07-sql-and-api-contracts-taxpayer-registry.md
- mapear errores a códigos y status HTTP consistentes
- mantener controladores delgados

Entregables:

- controllers/routes
- wiring/inyección de dependencias
- tests de integración HTTP si existe framework de testing ya usado

12. Prompt Lote 10 — UI POS Factura A
    Implementa la UI del flujo Factura A en POS según docs/ARCA/09-pos-ui-and-state-machine-factura-a.md.

Objetivo UX:

- elegir clase solicitada
- ingresar CUIT
- consultar
- ver razón social, condición IVA, estado registral y clase sugerida
- ver resolución allowed/blocked
- habilitar Emitir solo cuando allowed=true

Tareas:

- crear o adaptar componentes:
  - FiscalDocumentPanel
  - DocumentClassSelector
  - ReceiverCuitInput
  - TaxpayerLookupCard
  - DocumentResolutionBanner
  - EmitFiscalDocumentButton
- implementar máquina de estados simple y mantenible
- no duplicar lógica fiscal en frontend
- consumir únicamente endpoints backend
- soportar cambiar A→B sin perder lookup
- soportar invalidación de resolución cuando cambia el CUIT

Entregables:

- componentes UI
- estado/form hooks
- tests de UI si el proyecto ya usa testing frontend
- breve resumen del flujo implementado

13. Prompt Lote 11 — Integración checkout → fiscal job
    Integra el flujo de preparación fiscal con el checkout existente.

Objetivo:

- cuando la venta requiera comprobante fiscal, usar el snapshot fiscal resuelto
- al confirmar la venta, crear el fiscal job con requestedDocumentClass, resolvedDocumentClass y receiverSnapshot
- el worker fiscal debe consumir snapshot cerrado

Tareas:

- adaptar payload interno de checkout
- adaptar CreateFiscalJobUseCase o equivalente existente
- persistir receiverSnapshot en el job o estructura equivalente usada por el worker
- mantener compatibilidad con otros tipos de comprobante ya existentes

Entregables:

- cambios en checkout/backend
- cambios en create fiscal job
- nota sobre compatibilidad hacia atrás

14. Prompt Lote 12 — Integración worker WSFE
    Adapta el fiscal worker para emitir con receiverSnapshot y CondicionIVAReceptorId.

Tareas:

- cargar receiverSnapshot desde el fiscal job
- usar ese snapshot para docTipo/docNro/datos del receptor
- incluir CondicionIVAReceptorId en el builder de FECAESolicitar cuando aplique
- persistir snapshot del receptor en fiscal_documents al autorizar
- no consultar taxpayer registry desde el worker salvo que ya exista una política explícita de refresh por rechazo recuperable

Entregables:

- cambios en worker
- cambios en builder WSFE
- cambios en persistencia de fiscal_documents
- tests de integración del flujo del worker si la base de tests lo permite

15. Prompt Lote 13 — Error handling y mensajes normalizados
    Implementa el catálogo de errores y la capa de mapping de errores para el flujo Factura A según docs/ARCA/10-error-handling-observability-and-runbooks-factura-a.md.

Tareas:

- crear union/type FiscalErrorCode
- crear mensajes normalizados para UI y operación
- mapear errores técnicos a errores de dominio
- asegurar que controladores no expongan stacks ni SOAP faults directos
- clasificar retryable vs terminal
- reutilizar convención de errores del proyecto si existe

Entregables:

- catálogo de errores
- helpers de mapping
- tests unitarios del mapping

16. Prompt Lote 14 — Observabilidad
    Implementa observabilidad mínima del flujo Factura A.

Tareas:

- agregar logs estructurados para:
  - taxpayer_lookup_completed
  - document_class_resolution_blocked
  - fiscal_document_authorized
  - fiscal_document_rejected
- incluir correlation ids si ya existen en el proyecto
- si existe librería de métricas, registrar contadores y timers mínimos
- no loggear token/sign ni secretos

Entregables:

- instrumentation/logging en los puntos clave
- resumen de eventos agregados
- nota de seguridad sobre masking

17. Prompt Lote 15 — Test suite integral
    Construye una suite de tests para el flujo Factura A cubriendo backend y, donde sea razonable, frontend.

Cobertura mínima:

- validación y normalización de CUIT
- lookup con cache hit
- lookup con cache miss
- lookup con fallback degradado
- resolución A permitida
- resolución A bloqueada con sugerencia B
- prepare fiscal sale con snapshot completo
- creación de fiscal job con snapshot
- worker usando CondicionIVAReceptorId
- persistencia de snapshot en fiscal_documents

Entregables:

- tests unitarios
- tests de integración donde aplique
- breve reporte de cobertura funcional

18. Prompt Lote 16 — Refactor final y cleanup
    Haz una pasada final de refactor y cleanup del flujo Factura A implementado.

Tareas:

- revisar naming
- eliminar duplicaciones obvias
- alinear exports
- verificar que no haya lógica fiscal duplicada entre frontend y backend
- verificar que el worker no dependa de estado mutable de UI
- verificar que el proyecto compile y que los tests relevantes pasen
- no introducir cambios funcionales nuevos, solo consolidación

Entregables:

- diff final de cleanup
- resumen corto de mejoras aplicadas

19. Prompt maestro para ejecutar por etapas
    Necesito implementar el flujo de Factura A para NODUX según los documentos en docs/ARCA/05 al 10.

Trabaja en etapas pequeñas y deja el proyecto compilable al final de cada etapa.

Orden de ejecución requerido:

1. SQL base
2. tipos y contratos
3. repositorios
4. validación CUIT
5. gateway taxpayer registry
6. LookupTaxpayerUseCase
7. ResolveDocumentClassUseCase
8. PrepareFiscalSaleUseCase
9. endpoints API
10. POS UI
11. checkout → fiscal job
12. worker WSFE
13. error handling
14. observabilidad
15. tests
16. cleanup final

En cada etapa:

- muestra archivos creados/modificados
- explica decisiones importantes
- no cambies más de lo necesario
- si detectas una dependencia previa faltante, resuélvela antes de seguir
- mantén consistencia con la arquitectura actual del proyecto

20. Prompt corto para implementación incremental diaria
    Implementa únicamente el siguiente lote del flujo Factura A de NODUX, dejando el proyecto compilable y sin tocar más de lo necesario. Usa como fuente de verdad docs/ARCA/05 al 10. Antes de escribir código, enumera archivos a tocar. Luego implementa. Después resume qué quedó listo y qué falta.
21. Prompt de revisión técnica
    Revisa la implementación actual del flujo Factura A contra docs/ARCA/05 al 10 y detecta:

- inconsistencias arquitectónicas
- duplicación de lógica
- huecos de validación
- ausencia de snapshot fiscal
- errores en uso de CondicionIVAReceptorId
- puntos donde el frontend esté resolviendo lógica que debería vivir en backend

Entrega:

- lista priorizada de issues
- propuesta concreta de fixes
- archivos a modificar para cada fix

22. Prompt de hardening previo a producción
    Haz un hardening técnico del flujo Factura A antes de producción.

Revisar:

- manejo de errores
- retries
- logs estructurados
- masking de secretos
- validaciones de inputs
- fallback con cache
- persistencia de snapshots
- consistencia del worker fiscal
- compatibilidad con flujos existentes de facturación

Entrega:

- cambios concretos aplicados
- riesgos que permanecen
- checklist de salida a producción

23. Criterio de uso de estos prompts

Estos prompts están diseñados para:

usarse uno por lote

evitar prompts gigantes ambiguos

permitir revisar cada diff antes de seguir

mantener el proyecto siempre en estado estable

Recomendación práctica

Secuencia ideal de trabajo:

1. correr lote
2. revisar diff
3. corregir si hace falta
4. commit
5. correr siguiente lote
6. Criterio final de éxito

La implementación se considera exitosa cuando Codex deja listo un flujo donde:

el POS autocompleta receptor por CUIT

el sistema resuelve A/B/C/M en backend

Factura A se bloquea cuando no corresponde

el fiscal job transporta snapshot fiscal cerrado

el worker emite usando CondicionIVAReceptorId

el documento emitido guarda snapshot completo

soporte puede diagnosticar problemas sin leer código
