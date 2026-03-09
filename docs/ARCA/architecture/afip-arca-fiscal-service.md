# AFIP / ARCA Fiscal Service Architecture
**Proyecto:** NODUX  
**Versión:** v0.1  
**Estado:** Draft operativo  
**Última actualización:** 2026-03-08

---

## 1. Propósito

Este documento define la arquitectura recomendada para integrar **facturación electrónica AFIP / ARCA** dentro de NODUX como un servicio fiscal desacoplado del flujo principal de venta.

El objetivo es que NODUX pueda:

- autorizar comprobantes electrónicos en Argentina
- operar de forma segura en un contexto multi-tenant
- soportar homologación y producción
- desacoplar la venta del render de PDF / ticket
- manejar numeración fiscal correctamente
- soportar reintentos y conciliación
- permitir observabilidad y auditoría fiscal

---

## 2. Alcance

Este documento cubre:

- arquitectura lógica del servicio fiscal
- responsabilidades por componente
- modelo de datos mínimo recomendado
- flujo de autenticación con WSAA
- flujo de autorización con WSFEv1
- estrategia de numeración
- manejo de errores y reconciliación
- seguridad y almacenamiento de certificados
- separación homologación / producción
- contratos internos sugeridos
- roadmap de implementación

No cubre en detalle:

- UI de configuración fiscal
- implementación exacta SOAP por librería
- diseño visual de PDF / ticket
- reglas contables avanzadas
- regímenes fiscales especiales no necesarios para MVP

---

## 3. Contexto operativo

En Argentina, la factura electrónica no consiste en generar un PDF localmente.  
El comprobante fiscal existe cuando AFIP / ARCA autoriza la emisión y devuelve un **CAE**.

Para operar por Web Services, el contribuyente necesita:

- CUIT
- clave fiscal
- certificado digital
- habilitación del servicio correspondiente
- punto de venta configurado
- autenticación WSAA para obtener `Token` y `Sign`
- consumo posterior del web service fiscal, típicamente `WSFEv1`

NODUX debe modelar esta integración como una capacidad crítica de infraestructura, no como una función auxiliar del frontend.

---

## 4. Principios arquitectónicos

### 4.1 Venta y fiscalidad son agregados distintos

Una venta interna del POS y un comprobante fiscal no son la misma entidad.

- **Sale** = registro comercial interno, inmutable, auditable
- **Invoice / Fiscal Document** = documento fiscal autorizado o rechazado por AFIP / ARCA

Esto permite:

- no romper ventas por errores de render
- no mezclar reglas internas con reglas fiscales
- reintentar o reconciliar sin duplicar la venta
- soportar varios documentos sobre una misma venta si el negocio lo exige

---

### 4.2 El render no pertenece al camino crítico

AFIP / ARCA no devuelve PDF.  
Devuelve autorización fiscal, incluyendo CAE y vencimiento.

Por lo tanto:

- la autorización fiscal debe ocurrir antes del render final del comprobante
- el PDF y la impresión térmica son derivados
- el render debe ser asíncrono siempre que sea posible

---

### 4.3 One Point of Sale = One Sequence Domain

La numeración fiscal debe aislarse por:

- tenant
- ambiente
- punto de venta
- tipo de comprobante

Nunca debe resolverse con un contador global de aplicación.

---

### 4.4 Secrets fuera del dominio general

La clave privada del certificado no debe tratarse como dato estándar del tenant.

Debe existir una frontera explícita de secretos:

- acceso mínimo
- cifrado fuerte
- rotación
- uso exclusivo desde el worker fiscal

---

### 4.5 Homologación y producción totalmente separadas

Ambos ambientes deben operar como dominios aislados.

No mezclar:

- certificados
- tokens
- puntos de venta
- secuencias
- jobs
- logs
- métricas

---

## 5. Arquitectura lógica recomendada

```text
POS / Caja
  ↓
Sales API
  ↓
Fiscal Orchestrator
  ├─ Fiscal Auth Provider (WSAA)
  ├─ Sequence Manager
  ├─ WSFEv1 Client
  ├─ Reconciliation Engine
  ├─ PDF / Ticket Renderer
  └─ Print Dispatcher
  ↓
Supabase / Postgres
  ├─ sales
  ├─ invoices
  ├─ invoice_jobs
  ├─ invoice_events
  ├─ fiscal_sequences
  ├─ fiscal_credentials
  └─ print_jobs
````

---

## 6. Componentes

### 6.1 POS / Caja

Responsabilidades:

* cerrar venta
* capturar método de pago
* capturar documento del cliente si aplica
* determinar si la operación requiere comprobante fiscal
* invocar API interna de fiscalización

No debe:

* hablar directo con AFIP / ARCA
* manejar certificados
* manejar SOAP
* construir numeración fiscal
* guardar tokens WSAA

---

### 6.2 Sales API

Responsabilidades:

* persistir la venta interna
* validar integridad de totales
* crear `sale_document_request`
* invocar al `Fiscal Orchestrator`

---

### 6.3 Fiscal Orchestrator

Es el núcleo del servicio.

Responsabilidades:

* resolver tenant, location y punto de venta
* resolver ambiente fiscal
* obtener credenciales correctas
* asegurar ticket WSAA vigente
* reservar numeración
* invocar WSFEv1
* persistir respuesta
* emitir eventos de dominio
* disparar render de ticket / PDF
* dejar trazabilidad completa

---

### 6.4 Fiscal Auth Provider (WSAA)

Responsabilidades:

* construir TRA
* firmar TRA con certificado y private key
* llamar WSAA
* obtener `Token` y `Sign`
* cachear ticket de acceso con vencimiento
* renovar antes de expirar

---

### 6.5 Sequence Manager

Responsabilidades:

* administrar numeración por dominio fiscal
* sincronizar con AFIP / ARCA si es necesario
* reservar siguiente número de forma transaccional
* impedir colisiones
* marcar estados inciertos para conciliación

---

### 6.6 WSFEv1 Client

Responsabilidades:

* construir request SOAP
* mapear tipos de comprobante
* enviar `Auth`
* enviar cabecera y detalle
* parsear:

  * resultado
  * CAE
  * fecha de vencimiento
  * errores
  * observaciones
  * eventos

---

### 6.7 Reconciliation Engine

Responsabilidades:

* resolver estados inciertos
* consultar comprobantes cuando hubo timeout o error de red
* cerrar jobs colgados
* impedir reutilización indebida de numeración
* generar alertas operativas

---

### 6.8 PDF / Ticket Renderer

Responsabilidades:

* generar PDF A4
* generar ticket térmico
* incorporar QR fiscal
* aplicar plantilla por tenant si corresponde

---

### 6.9 Print Dispatcher

Responsabilidades:

* enviar ticket a impresora térmica
* manejar cola de impresión
* permitir reimpresión
* registrar resultado de impresión

---

## 7. Modelo de datos recomendado

### 7.1 `fiscal_credentials`

```text
id
tenant_id
environment                 -- homo | prod
taxpayer_cuit
certificate_pem
encrypted_private_key
encryption_key_reference
alias
status                      -- active | inactive | revoked | pending
wsaa_service_name
wsfe_service_name
created_at
updated_at
last_ta_obtained_at
ta_expires_at
```

---

### 7.2 `points_of_sale`

```text
id
tenant_id
location_id                 -- nullable si el tenant centraliza
environment                 -- homo | prod
pto_vta
description
invoice_mode                -- sync | async
status                      -- active | inactive
created_at
updated_at
```

---

### 7.3 `fiscal_sequences`

```text
id
tenant_id
environment
pto_vta
cbte_tipo
last_local_reserved
last_arca_confirmed
last_reconciled_at
status                      -- healthy | pending_reconcile | blocked
created_at
updated_at
```

---

### 7.4 `sales`

```text
id
tenant_id
location_id
pos_session_id
cashier_user_id
currency
subtotal
discount_total
tax_total
grand_total
payment_status
closed_at
created_at
```

---

### 7.5 `sale_documents`

```text
id
sale_id
document_kind               -- fiscal_invoice | receipt | internal_ticket
requested_by_user_id
status                      -- requested | processing | completed | failed
created_at
updated_at
```

---

### 7.6 `invoice_jobs`

```text
id
tenant_id
sale_id
sale_document_id
environment
pto_vta
cbte_tipo
cbte_nro
job_status                  -- pending | reserved | authorizing | authorized | rejected | pending_reconcile | render_pending | completed | failed
attempt_count
last_error_code
last_error_message
requested_payload_json
response_payload_json
created_at
updated_at
authorized_at
```

---

### 7.7 `invoices`

```text
id
tenant_id
sale_id
environment
pto_vta
cbte_tipo
cbte_nro
doc_tipo
doc_nro
currency
currency_rate
imp_total
imp_neto
imp_iva
imp_trib
cae
cae_expires_at
result_status               -- authorized | rejected | void | unknown
afip_observations_json
afip_events_json
qr_payload_json
pdf_storage_path
ticket_storage_path
created_at
updated_at
```

---

### 7.8 `invoice_events`

```text
id
invoice_job_id
event_type
event_payload_json
created_at
```

Ejemplos de `event_type`:

* `job_created`
* `sequence_reserved`
* `wsaa_token_loaded`
* `wsaa_token_renewed`
* `authorization_requested`
* `authorization_approved`
* `authorization_rejected`
* `reconcile_started`
* `reconcile_resolved`
* `render_completed`
* `print_enqueued`
* `print_completed`
* `print_failed`

---

### 7.9 `print_jobs`

```text
id
tenant_id
invoice_id
printer_target
format                      -- escpos | pdf | image
status                      -- pending | dispatched | completed | failed
attempt_count
last_error
created_at
updated_at
```

---

## 8. Flujo de autenticación WSAA

### 8.1 Objetivo

Obtener credenciales temporales:

* `Token`
* `Sign`

para invocar `WSFEv1`.

---

### 8.2 Flujo

```text
1. Buscar fiscal_credentials activas
2. Verificar si TA vigente existe en cache segura
3. Si no existe o venció:
   a. construir TRA
   b. firmar TRA con private key
   c. invocar WSAA
   d. guardar Token / Sign / expiración
4. Retornar Auth context al WSFEv1 client
```

---

### 8.3 Reglas

* no llamar WSAA por cada venta
* renovar con margen preventivo antes del vencimiento
* nunca exponer `Token`, `Sign` o private key al frontend
* cachear por:

  * tenant
  * environment
  * taxpayer_cuit
  * service_name

---

## 9. Flujo de autorización fiscal

### 9.1 Happy path

```text
1. POS cierra venta
2. Sales API persiste sale
3. Sales API crea invoice_job = pending
4. Fiscal Orchestrator carga credenciales
5. Fiscal Auth Provider asegura Token / Sign vigentes
6. Sequence Manager reserva cbte_nro
7. invoice_job -> reserved
8. WSFEv1 Client envía FECAESolicitar
9. AFIP / ARCA responde aprobación
10. Guardar CAE + vencimiento + payload crudo
11. Crear invoice authorized
12. invoice_job -> render_pending
13. Render PDF / ticket
14. Generar QR
15. print_job opcional
16. invoice_job -> completed
```

---

### 9.2 Rechazo fiscal

```text
1. AFIP / ARCA responde rechazo
2. Guardar código / mensaje / observaciones
3. invoice_job -> rejected
4. No marcar venta como fiscalizada
5. Exponer error al operador o backoffice
```

---

### 9.3 Estado incierto

Caso típico:

* request enviado
* timeout local
* no se recibió respuesta
* no se sabe si AFIP autorizó o no

Flujo:

```text
1. invoice_job -> pending_reconcile
2. bloquear reutilización de cbte_nro
3. Reconciliation Engine consulta estado
4. Si AFIP confirma:
   a. crear/actualizar invoice authorized
   b. cerrar job
5. Si AFIP no confirma:
   a. marcar resolución operativa
   b. decidir nueva reserva según regla de negocio
```

---

## 10. Estrategia de numeración

### 10.1 Dominio de secuencia

La secuencia fiscal se define por:

* `tenant_id`
* `environment`
* `pto_vta`
* `cbte_tipo`

---

### 10.2 Regla de reserva

La reserva debe ocurrir dentro de transacción con lock explícito.

Pseudoflujo:

```text
BEGIN;

SELECT ... FOR UPDATE fiscal_sequences
WHERE tenant_id = ?
  AND environment = ?
  AND pto_vta = ?
  AND cbte_tipo = ?;

if no row:
  create row after sync with FECompUltimoAutorizado

next_nro = last_local_reserved + 1

UPDATE fiscal_sequences
SET last_local_reserved = next_nro
WHERE id = ?;

INSERT invoice_jobs (... cbte_nro = next_nro, job_status = 'reserved');

COMMIT;
```

---

### 10.3 Regla de sincronización

Sincronizar con AFIP / ARCA:

* al alta inicial del punto de venta
* ante inconsistencia detectada
* ante estado `pending_reconcile`
* ante recuperación post-incidente
* ante operaciones manuales de soporte

---

### 10.4 Regla anti-colisión

Nunca reutilizar un número reservado hasta resolver formalmente su estado.

---

## 11. Seguridad y secretos

### 11.1 Reglas obligatorias

* no guardar private key en texto plano
* no devolver certificado ni key al frontend
* no permitir acceso desde clientes públicos
* no guardar secretos en tablas expuestas por APIs generales
* no reutilizar la misma key maestra entre ambientes si puede evitarse

---

### 11.2 Estrategia recomendada

* `certificate_pem`: puede persistirse cifrado o claro según política interna
* `encrypted_private_key`: siempre cifrada
* `encryption_key_reference`: referencia a KMS / secret manager / app master key
* desencriptación solo en worker fiscal
* rotación periódica de claves de aplicación

---

### 11.3 Boundary de ejecución

Solo estos componentes pueden tocar secretos:

* Fiscal Orchestrator
* Fiscal Auth Provider
* herramientas internas de administración restringidas

No pueden tocar secretos:

* POS frontend
* mobile clients
* edge public handlers
* dashboards generales
* workers no fiscales

---

## 12. Homologación y producción

### 12.1 Aislamiento

Cada ambiente debe tener:

* credenciales distintas
* certificados distintos
* puntos de venta distintos
* token cache distinto
* secuencias distintas
* logs distintos

---

### 12.2 Convención sugerida

```text
environment = homo | prod
```

Y siempre incluir `environment` en:

* `fiscal_credentials`
* `points_of_sale`
* `fiscal_sequences`
* `invoice_jobs`
* `invoices`

---

### 12.3 Regla operativa

Nunca promover datos fiscales de homologación a producción.

Solo promover:

* configuración funcional
* plantillas
* código
* mappings
* tests

---

## 13. Contratos API internos sugeridos

### 13.1 Crear solicitud fiscal

`POST /internal/fiscal/invoice-jobs`

```json
{
  "tenantId": "ten_123",
  "saleId": "sale_123",
  "environment": "homo",
  "pointOfSaleId": "pos_123",
  "document": {
    "cbteTipo": 11,
    "docTipo": 99,
    "docNro": 0,
    "currency": "PES",
    "currencyRate": 1,
    "amounts": {
      "total": 1210.00,
      "net": 1000.00,
      "iva": 210.00,
      "trib": 0.00
    }
  }
}
```

---

### 13.2 Obtener estado de job

`GET /internal/fiscal/invoice-jobs/:id`

```json
{
  "id": "job_123",
  "status": "authorized",
  "ptoVta": 1,
  "cbteTipo": 11,
  "cbteNro": 152,
  "cae": "12345678901234",
  "caeExpiresAt": "2026-03-18",
  "invoiceId": "inv_123"
}
```

---

### 13.3 Reimpresión

`POST /internal/fiscal/invoices/:id/reprint`

```json
{
  "target": "thermal",
  "printerTarget": "cashier-front"
}
```

---

### 13.4 Reconciliación manual

`POST /internal/fiscal/invoice-jobs/:id/reconcile`

```json
{
  "reason": "manual_support_resolution"
}
```

---

## 14. Estados del invoice job

### 14.1 Máquina de estados

```text
pending
  → reserved
  → authorizing
  → authorized
  → render_pending
  → completed

pending
  → reserved
  → authorizing
  → rejected

pending
  → reserved
  → authorizing
  → pending_reconcile
  → authorized | rejected | failed
```

---

### 14.2 Semántica

* `pending`: job creado, aún no reservado
* `reserved`: numeración reservada
* `authorizing`: request en curso
* `authorized`: AFIP / ARCA aprobó, falta posprocesamiento
* `rejected`: rechazo fiscal confirmado
* `pending_reconcile`: estado incierto, requiere consulta posterior
* `render_pending`: falta PDF / ticket / QR
* `completed`: proceso cerrado exitosamente
* `failed`: error terminal operativo

---

## 15. Observabilidad

### 15.1 Métricas mínimas

* tiempo de autorización fiscal
* tasa de aprobación
* tasa de rechazo
* tasa de jobs en `pending_reconcile`
* tiempo medio de reconciliación
* cantidad de renovaciones WSAA
* cantidad de errores SOAP por tenant
* cantidad de errores de impresión
* tiempo medio de render PDF
* secuencias bloqueadas por inconsistencia

---

### 15.2 Logs estructurados

Incluir siempre:

* tenant_id
* location_id
* environment
* taxpayer_cuit
* pto_vta
* cbte_tipo
* cbte_nro
* invoice_job_id
* correlation_id
* external_request_id si existe

---

### 15.3 Alertas operativas

Alertar cuando:

* WSAA no renueva
* secuencia entra en `blocked`
* hay más de N jobs en `pending_reconcile`
* hay rechazos repetidos por mala configuración
* falla sistemáticamente el render o la impresión
* el certificado está próximo a vencer

---

## 16. Errores comunes a evitar

### 16.1 Mezclar venta y factura en la misma tabla

Incorrecto porque dificulta reintentos, conciliación y auditoría.

### 16.2 Generar PDF antes de tener CAE

Incorrecto porque el documento aún no existe fiscalmente.

### 16.3 Consultar WSAA por cada operación

Ineficiente y propenso a errores.

### 16.4 Reutilizar numeración tras timeout

Muy riesgoso; puede duplicar comprobantes o romper correlatividad.

### 16.5 Guardar private keys sin cifrado

No aceptable para un SaaS multi-tenant serio.

### 16.6 Compartir configuración de homologación y producción

Genera incidentes difíciles de detectar.

### 16.7 Hacer que la caja dependa del render

Agrega latencia innecesaria al cobro.

---

## 17. Roadmap de implementación

### Fase 1 — Base fiscal mínima operativa

Objetivo: primer circuito homologación funcional.

Incluir:

* tabla `fiscal_credentials`
* tabla `points_of_sale`
* tabla `fiscal_sequences`
* tabla `invoice_jobs`
* tabla `invoices`
* WSAA client
* WSFEv1 client
* reserva transaccional de numeración
* autorización síncrona
* almacenamiento de payload crudo
* render de ticket simple
* render PDF básico
* QR fiscal
* reimpresión básica

---

### Fase 2 — Robustez operativa

Objetivo: tolerancia a fallos y soporte multi-tenant serio.

Incluir:

* reconciliation engine
* métricas y alertas
* dashboard de errores fiscales
* cola de render
* cola de impresión
* soporte de reintentos controlados
* vencimiento y rotación operativa de certificados
* auditoría técnica de cambios de configuración

---

### Fase 3 — Escala y self-service

Objetivo: onboarding fiscal por cliente y operación madura.

Incluir:

* portal de configuración fiscal por tenant
* asistente guiado de credenciales
* validaciones previas de punto de venta
* soporte extendido de tipos de comprobante
* herramientas de soporte interno
* observabilidad avanzada por tenant / sucursal

---

## 18. Decisiones recomendadas para NODUX

### 18.1 MVP recomendado

Para NODUX hoy se recomienda:

* `WSFEv1`
* facturación síncrona en homologación
* worker fiscal dedicado
* ticket térmico común
* PDF básico
* QR fiscal
* reconciliación mínima obligatoria
* secuencia aislada por tenant / punto de venta / tipo

---

### 18.2 No recomendado en MVP

* impresora fiscal tradicional como requisito base
* render complejo dentro del flujo de cobro
* múltiples servicios fiscales simultáneos
* automatizaciones fiscales avanzadas sin observabilidad
* guardar secretos en tablas públicas o expuestas por RPC generalista

---

## 19. Checklist de readiness

### Fiscal

* [ ] CUIT operativa
* [ ] clave fiscal disponible
* [ ] certificado generado
* [ ] servicio habilitado
* [ ] punto de venta habilitado
* [ ] ambiente homologación validado

### Arquitectura

* [ ] tablas base creadas
* [ ] cifrado de private key implementado
* [ ] WSAA cacheado
* [ ] secuencia transaccional implementada
* [ ] WSFEv1 client probado
* [ ] estados `pending_reconcile` soportados

### Operación

* [ ] logs estructurados
* [ ] métricas mínimas
* [ ] reimpresión funcional
* [ ] render PDF funcional
* [ ] QR fiscal embebido
* [ ] playbook de soporte inicial

---

## 20. Próximos documentos sugeridos

Después de este documento, crear:

1. `docs/ARCA/architecture/afip-arca-data-model.md`
2. `docs/ARCA/architecture/afip-arca-state-machine.md`
3. `docs/ARCA/architecture/afip-arca-security-and-secrets.md`
4. `docs/ARCA/architecture/afip-arca-wsaa-wsfev1-integration-contracts.md`
5. `docs/ARCA/implementation/afip-arca-lote-1-homologacion-base.md`

---

## 21. Conclusión

Para NODUX, la integración fiscal argentina debe tratarse como una capacidad de infraestructura crítica.

La arquitectura correcta parte de estas premisas:

* una venta interna no es lo mismo que una factura fiscal
* la numeración fiscal es un dominio propio
* los secretos fiscales requieren aislamiento fuerte
* homologación y producción deben vivir separadas
* la reconciliación no es opcional
* el PDF y la impresión son derivados, no la fuente de verdad

Si esta base se implementa bien desde el inicio, NODUX puede evolucionar desde un MVP operativo a un servicio fiscal multi-tenant serio sin rehacer el núcleo.

