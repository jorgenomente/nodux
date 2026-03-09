# AFIP / ARCA Testing Strategy
**Proyecto:** NODUX  
**Versión:** v0.1  
**Estado:** Draft operativo  
**Última actualización:** 2026-03-08

---

## 1. Propósito

Este documento define la estrategia de testing para la integración fiscal AFIP / ARCA de NODUX.

El objetivo es validar no sólo el happy path, sino también los escenarios que más riesgo generan:

- secuencia
- estados inciertos
- rechazos
- reintentos
- render
- persistencia
- reconciliación

---

## 2. Objetivos

La estrategia debe asegurar que:

- la numeración no colisiona
- la máquina de estados se respeta
- la autorización fiscal se persiste correctamente
- los errores se clasifican correctamente
- el render no rompe el flujo fiscal
- la reconciliación resuelve estados inciertos
- el sistema es auditable y repetible

---

## 3. Pirámide de testing

### 3.1 Unit tests
Para funciones puras y normalizadores.

### 3.2 Integration tests
Para DB, RPC, worker y adaptadores.

### 3.3 End-to-end tests
Para flujos completos en homologación o con mocks realistas.

### 3.4 Chaos / failure tests
Para timeouts, network errors, crashes y estados inciertos.

---

## 4. Capas a testear

### 4.1 DB / RPC
- secuencia
- transiciones de estado
- integridad de invoice_jobs/invoices

### 4.2 Worker runtime
- polling
- clasificación de errores
- orchestration

### 4.3 WSAA adapter
- cache
- vencimiento
- renovación

### 4.4 WSFE adapter
- request build
- response normalization
- timeout handling

### 4.5 Render pipeline
- QR
- PDF
- ticket
- storage

### 4.6 Reconciliation
- authorized recovery
- rejected recovery
- still unknown
- sequence block

---

## 5. Casos mínimos obligatorios

### 5.1 Happy path completo
- job `pending`
- reserva secuencia
- autorización aprobada
- render exitoso
- job `completed`

### 5.2 Rechazo fiscal
- AFIP rechaza
- job `rejected`
- no se genera invoice autorizada

### 5.3 Timeout incierto
- request incierto
- job `pending_reconcile`
- secuencia marcada correctamente

### 5.4 Reconciliación positiva
- job `pending_reconcile`
- se confirma autorización
- invoice se crea
- render finaliza

### 5.5 Reconciliación negativa
- job `pending_reconcile`
- se confirma rechazo
- job `rejected`

### 5.6 Render falla
- autorización aprobada
- falla PDF o ticket
- job queda `render_pending`

### 5.7 Re-render exitoso
- job `render_pending`
- reintento exitoso
- job `completed`

### 5.8 Concurrencia secuencia
- dos procesos intentan reservar a la vez
- no hay colisión

### 5.9 Estado inválido
- intento de transición no permitida
- DB rechaza operación

### 5.10 Persistencia fallida tras aprobación
- AFIP aprobó
- falla persistencia local
- sistema cae en `pending_reconcile`

---

## 6. Unit tests recomendados

### 6.1 `build-tra`
- genera XML válido
- incluye servicio correcto
- incluye timestamps correctos

### 6.2 `sign-tra`
- firma output esperado
- falla con cert/key inválidos

### 6.3 `build-fecae-request`
- mapea importes correctamente
- mapea documento correctamente
- respeta cbte tipo / pto vta / cbte nro

### 6.4 `normalize-wsfe-response`
- approved
- rejected
- malformed
- uncertain

### 6.5 `classifyFiscalError`
- mapea cada error al catálogo correcto

### 6.6 `build-qr-payload`
- genera payload consistente con invoice

---

## 7. Integration tests recomendados

### 7.1 `fn_fiscal_reserve_sequence`
Validar:
- crea secuencia si no existe
- incrementa `last_local_reserved`
- actualiza job a `reserved`

### 7.2 `fn_fiscal_mark_job_authorizing`
Validar:
- incrementa intentos
- persiste payload
- agrega evento

### 7.3 `fn_fiscal_mark_job_authorized`
Validar:
- crea `invoice`
- actualiza `last_arca_confirmed`
- deja job en `render_pending`

### 7.4 `fn_fiscal_mark_job_rejected`
Validar:
- deja job en `rejected`
- sale_document en `failed`

### 7.5 `fn_fiscal_mark_render_completed`
Validar:
- persiste paths
- deja job en `completed`

---

## 8. End-to-end tests recomendados

### Escenario E2E 1 — factura homologación simple
- venta
- invoice_job
- worker
- autorización
- render
- complete

### Escenario E2E 2 — rechazo homologación
- payload inválido controlado
- rechazo
- visibilidad del error

### Escenario E2E 3 — timeout incierto
- mock WSFE timeout
- pending_reconcile
- reconcile posterior

### Escenario E2E 4 — render retry
- aprobación
- falla render inicial
- retry exitoso

---

## 9. Failure injection

La estrategia debe incluir inyección de fallos.

### Fallos a simular
- timeout WSAA
- timeout WSFE
- error DNS
- XML inválido
- respuesta malformada
- crash del worker post-request
- falla de upload
- falla de PDF
- conflicto de unicidad

---

## 10. Datos de prueba

Definir fixtures con:

- tenant de homologación
- punto de venta homo
- credenciales de prueba
- tipos de comprobante
- clientes con doc final consumidor
- clientes con CUIT
- ventas con IVA y sin IVA según aplique

---

## 11. Entornos de prueba

### 11.1 Local con mocks
Para alta velocidad y repetibilidad.

### 11.2 Local con DB real
Para probar RPC y locks.

### 11.3 Homologación controlada
Para validar integración real.

---

## 12. Reglas de mocking

Se debe mockear:
- WSAA
- WSFEv1
- storage
- impresión

El mock debe poder devolver:
- approved
- rejected
- timeout uncertain
- malformed response
- connectivity failures

---

## 13. Reglas de homologación

La homologación real debe validar:

- autenticación correcta
- request real compatible
- respuesta real persistida
- trazabilidad completa

Pero no debe usarse como sustituto de testing automatizado local.

---

## 14. Métricas de cobertura

Cobertura prioritaria:

- normalización de respuesta
- clasificación de errores
- RPCs críticas
- reconciliación

No perseguir porcentaje ciego; perseguir cobertura de riesgos.

---

## 15. Matriz de riesgo

| Riesgo | Capa | Prioridad |
|---|---|---|
| colisión de secuencia | DB/RPC | crítica |
| estado incierto mal manejado | worker/reconcile | crítica |
| aprobación no persistida | worker/DB | crítica |
| render rompe flujo fiscal | render | alta |
| retry incorrecto | worker | alta |
| rechazo mal clasificado | wsfe/worker | alta |

---

## 16. Checklist de suite inicial

- [ ] unit: TRA builder
- [ ] unit: response normalizer
- [ ] unit: error classifier
- [ ] unit: QR builder
- [ ] integration: reserve sequence
- [ ] integration: mark authorized
- [ ] integration: mark rejected
- [ ] integration: render completed
- [ ] e2e: approved
- [ ] e2e: rejected
- [ ] e2e: pending_reconcile
- [ ] e2e: reconcile authorized
- [ ] e2e: render retry

---

## 17. Criterios de aceptación para Lote 1

No se considera listo si no se prueba al menos:

- happy path
- rechazo
- timeout incierto
- reconciliación
- render retry
- no colisión de secuencia

---

## 18. Conclusión

La estrategia de testing fiscal de NODUX debe estar orientada a riesgo, no a cobertura cosmética.

El punto crítico no es sólo “que facture”, sino que facture de forma:

- consistente
- auditable
- recuperable ante fallos
- segura para secuencia y correlatividad