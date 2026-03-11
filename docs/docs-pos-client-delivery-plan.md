# Plan — POS cliente identificado y entrega digital de comprobantes

## Objetivo

Definir una evolución segura del flujo de `/pos` para:

- capturar cliente opcional al momento de cobrar
- reutilizar y autocompletar clientes ya conocidos
- vincular la venta a un cliente real
- habilitar entrega asistida del ticket o factura por WhatsApp
- preparar una base futura para email, marketing e historial

Este documento es de planificación. No habilita implementación automática de mensajería ni cambia el alcance MVP por sí solo.

## Estado de avance

- Fase 1 implementada: cliente opcional en `/pos` + persistencia `sales.client_id`.
- Fase 2 implementada: CTA operativa `Compartir ticket por WhatsApp` en POS post-cobro y en `/sales/[saleId]`.
- Fase 3 implementada: `sale_delivery_links`, RPC pública de ticket `/share/t/:token` y factura `/share/i/:token`.
- Extensión fiscal implementada: CTA `Compartir factura por WhatsApp` cuando la factura ya está `authorized + completed`.
- Fase 5 implementada: `/clients` ya muestra compras recientes y permite reenvío de ticket/factura desde el cliente.
- Fase 6 implementada: `/sales/[saleId]` ya administra revocación/regeneración y metadata mínima del link compartible.
- Fase 7 implementada: historial operativo de delivery por evento/canal en `/sales/[saleId]`.
- Smoke implementado: POS share ticket, POS share invoice y demo pública readonly.
- Pendiente real para siguiente lote: decidir si `/clients` también necesita acciones de lifecycle y si vale sumar más filtros/exportes para soporte.

### Estado auditado del repo (2026-03-10)

#### Confirmado en código y docs

- `/pos` ya muestra bloque `Cliente` con búsqueda, selección y carga rápida de `nombre + WhatsApp + email opcional`.
- `POST /api/pos/checkout` ya resuelve/upserta cliente server-side y envía `p_client_id` a `rpc_create_sale`.
- `rpc_create_sale(...)` ya acepta `p_client_id uuid default null` y valida que el cliente pertenezca a la org activa.
- `sales.client_id` ya existe y las lecturas de ventas exponen `client_name` y `client_phone`.
- La base pública para ticket compartible ya existe: `sale_delivery_links`, `rpc_get_or_create_sale_delivery_link(...)`, `rpc_get_sale_ticket_delivery(...)` y `/share/t/:token`.
- El render del ticket ya fue unificado en `SaleTicketDocument` para ticket interno y ticket compartido.

#### Confirmado como pendiente

- `/clients` todavía no muestra compras históricas ni accesos directos a tickets/facturas compartibles.
- No existe todavía una réplica del lifecycle dentro de `/clients`.
- La revocación/regeneración hoy vive en detalle de venta, no todavía en `/clients`.
- Sigue fuera de alcance email transaccional y automatización de WhatsApp.

#### Lectura operativa

El cuello actual ya no es POS ni el link público del comprobante. El siguiente lote debe concentrarse en explotar la venta ya vinculada al cliente dentro de `/clients` y habilitar reenvío/historial operativo, no en reabrir la base de ticket/factura compartible.

---

## Estado actual del repo

### Ya existe

- Módulo `clients` con tabla `clients`, búsqueda y detalle.
- RPC `rpc_upsert_client(...)` para alta y edición de clientes.
- `sales.client_id` ya existe en el modelo.
- `/pos` ya separa `Cobrar` de `Cobrar y facturar`.
- `/sales/[saleId]/ticket` y `/sales/[saleId]/invoice` ya existen como salidas operativas.
- La app ya usa WhatsApp asistido en storefront público, no envío automático.

### Todavía no existe

- revocación/regeneración desde `/clients` si se considera necesaria
- filtros/exportes de historial de delivery si soporte los necesita
- envío de email
- automatización de WhatsApp

### Restricción actual clave

La primera iteración operativa ya quedó cerrada en POS y detalle de venta. La limitación ahora es aguas abajo: la identificación del cliente todavía no se convierte en un historial accionable dentro de `/clients`.

---

## Principios de diseño

### P1) Cliente no bloqueante

El POS no debe exigir nombre ni WhatsApp para cobrar. La caja debe poder operar igual de rápido que hoy.

### P2) WhatsApp asistido primero

La primera versión debe abrir un link prearmado (`wa.me` o WhatsApp Web) para que el cajero confirme el envío manualmente. No debe haber envío automático ni backend emisor en esta etapa.

### P3) Venta primero, entrega después

El momento correcto para ofrecer `Compartir por WhatsApp` es después de que exista el comprobante relevante:

- ticket no fiscal si el flujo fue `Cobrar`
- factura si el flujo fue `Cobrar y facturar` y el comprobante ya está listo

### P4) Reusar `clients`

No se debe crear una entidad paralela tipo “destinatarios de ticket”. El dato vive en `clients` y la venta debe vincularse a ese registro.

### P5) Compartir link antes que adjunto

La primera versión no debe depender de PDF adjunto ni de binarios enviados por backend. El camino más simple y robusto es compartir un link seguro al comprobante.

---

## Fase 1 — Cliente en POS y vínculo con la venta

### Resultado esperado

Antes de cobrar, `/pos` permite opcionalmente identificar al cliente con:

- nombre
- WhatsApp
- email opcional

La UI debe permitir:

- buscar cliente existente por nombre o WhatsApp
- seleccionar uno existente
- crear o actualizar un cliente mínimo en el momento
- si el cliente es nuevo, exigir WhatsApp y permitir email opcional
- si el cliente ya existe, permitir corregir WhatsApp/email sin salir de caja
- seguir cobrando sin cliente si el cajero no quiere cargarlo

### Persistencia esperada

- Si se selecciona cliente existente: usar su `client_id`.
- Si se carga nombre o WhatsApp no existente: crear o upsert con `rpc_upsert_client(...)`.
- La venta queda persistida con `sales.client_id`.

### Impacto de contrato

#### POS

- agregar bloque opcional `Cliente`
- autocompletar contra `clients`
- mantener interacción táctil y rápida

#### API checkout

- extender `POST /api/pos/checkout` para aceptar payload opcional de cliente
- resolver `client_id` server-side antes de `rpc_create_sale`

#### DB / RPC

- extender `rpc_create_sale` para aceptar `p_client_id uuid default null`
- persistir `client_id` en la venta creada

### Fuera de Fase 1

- compartir por WhatsApp
- email transaccional
- PDF adjunto
- métricas de envíos

---

## Fase 2 — Entrega asistida del comprobante por WhatsApp

### Resultado esperado

Después del cobro exitoso, POS ofrece acciones operativas según el caso:

- `Imprimir resumen`
- `Compartir por WhatsApp`
- si hubo `Cobrar y facturar` y la factura está lista: `Compartir factura por WhatsApp`

Si la factura todavía no terminó de autorizar o renderizar:

- mostrar `Factura en proceso`
- no habilitar compartir factura hasta tener artefacto o link válido

### UX propuesta

#### En `Cobrar`

- cierre exitoso
- mostrar resumen de venta
- si el cliente tiene WhatsApp: habilitar `Compartir ticket por WhatsApp`

#### En `Cobrar y facturar`

- si la factura termina dentro del request: habilitar `Compartir factura por WhatsApp`
- si cae en fallback asíncrono: mostrar estado `En proceso` y dejar impresión ticket si corresponde

### Estrategia técnica recomendada

No enviar archivos por WhatsApp desde NODUX en esta fase.

Sí hacer:

- construir un mensaje corto prearmado
- abrir WhatsApp con el número del cliente
- incluir link al comprobante

### Beneficios

- no requiere proveedor de WhatsApp
- no requiere plantillas
- reduce riesgo de bloqueo por spam
- evita colas de envío, estados y reintentos en backend

### Estado actual auditado

- Implementada en POS post-cobro para ticket.
- Implementada en POS post-cobro para factura cuando `invoiceReady=true`.
- Implementada en `/sales/[saleId]` para ticket y factura.
- Mensaje asistido sigue siendo manual con `window.open(...)` a WhatsApp.

---

## Fase 3 — Documento compartible por link seguro

### Problema a resolver

Las rutas actuales de ticket y factura son internas y autenticadas. Un cliente final no debería depender de sesión NODUX para abrir su comprobante.

### Propuesta

Crear un mecanismo de entrega pública por token firmado o aleatorio, similar al tracking público de pedidos online, con reglas estrictas.

### Requerimientos mínimos

- token no adivinable
- alcance por documento individual
- posibilidad de revocar o regenerar
- sin exponer datos de otras ventas
- TTL configurable o permanente según decisión operativa

### Modelo sugerido

Nueva tabla o read-model específico de delivery, por ejemplo:

- `sale_delivery_links`

Campos sugeridos:

- `id`
- `org_id`
- `sale_id`
- `document_kind` (`sale_ticket`, `sale_invoice`)
- `token`
- `status` (`active`, `revoked`, `expired`)
- `last_shared_at`
- `created_by`
- `created_at`
- `expires_at` nullable

### Rutas sugeridas

- `/share/t/:token` para ticket
- `/share/i/:token` para factura

### Estrategia de render

Primera iteración:

- HTML responsive imprimible
- sin PDF binario obligatorio

Iteración posterior:

- PDF real almacenado y compartible si el documento fiscal ya tiene artefacto binario estable

### Estado actual auditado

- `sale_delivery_links` implementada con `document_kind = sale_ticket | sale_invoice`.
- RPC autenticada `rpc_get_or_create_sale_delivery_link(...)` implementada.
- RPC pública `rpc_get_sale_ticket_delivery(...)` implementada.
- RPC pública `rpc_get_sale_invoice_delivery(...)` implementada.
- Rutas públicas `/share/t/:token` y `/share/i/:token` implementadas.
- Smoke E2E cubre apertura pública de ticket y factura.

---

## Fase 4 — Historial real del cliente

### Resultado esperado

Cuando una venta sale identificada con cliente:

- `/clients` refleja compras históricas
- el detalle del cliente muestra ventas recientes y comprobantes relacionados
- el POS puede reenviar un comprobante viejo buscando por cliente

### Estado actual auditado

- Aún no implementada.
- Hoy `clients` conserva identidad y pedidos especiales, pero no expone ventas históricas vinculadas vía `sales.client_id`.
- Este es el siguiente gap funcional real del plan.

### Impacto esperado

#### `/clients`

- compras recientes
- monto histórico
- último WhatsApp usado
- accesos rápidos a ticket o factura compartible

#### `/sales/[saleId]`

- mostrar cliente vinculado
- permitir compartir ticket o factura por WhatsApp desde el detalle

---

## Fase 5 — Email y automatización controlada

### Email

Esto requiere infraestructura nueva:

- proveedor de email transaccional
- plantilla de correo
- eventos de entrega o fallo
- configuración por organización

No debe entrar en la primera iteración.

### WhatsApp automático

Esto también debe quedar fuera de la primera iteración porque requiere:

- BSP o API oficial
- plantillas aprobadas
- rate limiting real
- consentimiento y política comercial
- auditoría de envíos

---

## Diseño funcional recomendado para `/pos`

## Antes de cobrar

Agregar bloque opcional `Cliente`:

- campo de búsqueda único: nombre o WhatsApp
- resultados rápidos
- acción `Usar cliente`
- acción `Crear cliente rápido`

### Datos mínimos del cliente rápido

- `name`
- `phone` (WhatsApp)

No exigir email ni notas en POS.

### Reglas UX

- si el usuario escribe WhatsApp y no existe, permitir crear cliente con ese dato
- si el número ya existe, sugerir el cliente existente para evitar duplicados
- si solo se carga nombre, permitir continuar, pero advertir que no se podrá compartir por WhatsApp

## Después de cobrar

Mostrar acciones según estado:

- `Nueva venta`
- `Imprimir resumen`
- `Compartir por WhatsApp`
- `Ver venta`

Y si corresponde:

- `Compartir factura por WhatsApp`

---

## Normalización y calidad de datos

### WhatsApp como identificador operativo preferido

Para deduplicación operativa, el dato más útil es `phone`.

### Reglas sugeridas

- guardar phone normalizado
- permitir mostrar formato amigable en UI
- deduplicar por `org_id + normalized_phone`
- no deduplicar solo por nombre

### Riesgo actual

`clients.phone` existe, pero si no se normaliza antes de upsert puede generar duplicados por formato.

### Recomendación

Agregar una función utilitaria compartida de normalización antes de implementar la fase 1.

---

## Riesgos y mitigaciones

### R1) Duplicados de clientes

Mitigación:

- normalizar teléfono
- buscar por phone antes de crear
- preferir upsert sobre insert ciego

### R2) Compartir factura antes de estar lista

Mitigación:

- separar claramente ticket no fiscal de factura
- mostrar `Factura en proceso` cuando aplique

### R3) Exposición indebida por links públicos

Mitigación:

- tokens fuertes
- scope por documento
- revocación
- no listar nada sin token exacto

### R4) Riesgo de spam o bloqueo de WhatsApp

Mitigación:

- fase inicial solo asistida y manual
- nada de envíos automáticos

### R5) Fricción en caja

Mitigación:

- cliente siempre opcional
- creación rápida
- autocompletar usable con pocos toques

---

## Decisiones recomendadas

### DR1

Implementar primero `cliente opcional + vínculo venta-cliente`.

### DR2

La primera entrega digital debe ser `WhatsApp asistido con link`, no PDF adjunto ni mensaje automático.

### DR3

Mantener `Imprimir` y `Compartir por WhatsApp` como acciones alternativas, no excluyentes.

### DR4

Para `Cobrar y facturar`, sólo compartir factura si el comprobante fiscal ya está listo; si no, usar ticket o esperar.

### DR5

Email queda documentado como fase posterior.

---

## Orden recomendado de implementación futura

1. Extender POS para capturar o seleccionar cliente opcional.
2. Extender backend checkout y `rpc_create_sale` para persistir `client_id`.
3. Mostrar cliente vinculado en `/sales` y `/sales/[saleId]`.
4. Crear mecanismo de link público seguro para ticket y factura.
5. Agregar CTA `Compartir por WhatsApp` en POS y detalle de venta.
6. Recién después evaluar PDF binario, email y automatización.

---

## Plan de continuación recomendado

### Lote implementado

`pos-client-delivery-phase-5-client-history`

### Objetivo del lote

Convertir la identificación del cliente en una herramienta operativa real:

- mostrar compras históricas en `/clients`
- exponer accesos rápidos a ticket/factura desde el cliente
- permitir reenvío de comprobantes viejos sin volver a buscar la venta por separado

### Estado

- implementado el bloque `Compras recientes` en `/clients`
- implementados accesos `Ver venta`, `Compartir ticket por WhatsApp` y `Compartir factura por WhatsApp` cuando aplica
- implementado contrato repo-aware `rpc_get_client_sales_history(...)`
- smoke extendido para validar visibilidad del historial y CTAs desde cliente

### Siguiente lote recomendado

`pos-client-delivery-phase-8-clients-lifecycle-actions`

### Objetivo del siguiente lote

Extender el flujo al contexto del cliente sin perder centralización operativa:

- decidir si `/clients` debe poder revocar/regenerar links sin entrar a la venta
- mantener un único contrato claro para no duplicar lógica de lifecycle
- reducir fricción cuando soporte busca por cliente y no por venta

### Scope exacto del siguiente lote

- evaluar si basta linkear siempre a `/sales/[saleId]` o si conviene acciones inline en `/clients`
- si se implementa inline, reutilizar los mismos endpoints/RPCs ya existentes
- mantener visible desde cliente el estado mínimo del link compartible
- cubrir el caso con smoke o test de integración acotado

### Scope explícitamente fuera de este lote

- email transaccional
- WhatsApp automático
- campañas, marketing o cupones

### Dependencias y riesgos del siguiente lote

- hoy el centro operativo está correctamente en `/sales/[saleId]`; replicar acciones en `/clients` puede introducir duplicación UX
- cualquier acción inline en `/clients` debe seguir sin romper el contrato `One Screen = One Data Contract`
- conviene evitar dos fuentes de verdad visual distintas para el estado del mismo link

### Definition of Done del siguiente lote

- si se decide, `/clients` expone las acciones críticas sin duplicar lógica ni inconsistencias.
- si no se decide, el flujo a detalle de venta queda claramente reforzado desde `/clients`.
- `npm run lint` OK.
- `npm run build` OK.
- Smoke o test de integración del flujo desde cliente OK.

---

## Qué NO hacer en la primera implementación

- no enviar mensajes automáticos desde servidores NODUX
- no depender de un proveedor de WhatsApp
- no bloquear el cobro por falta de datos del cliente
- no introducir marketing o cupones en el mismo lote
- no meter email transaccional todavía
- no exigir PDF adjunto para considerar resuelto el problema operativo

---

## Criterio de éxito de la primera iteración

La iteración inicial se considera exitosa si:

- el cajero puede cobrar sin fricción
- opcionalmente puede identificar al cliente
- la venta queda vinculada al cliente correcto
- puede compartir el comprobante por WhatsApp en pocos toques
- el cliente puede abrir el comprobante sin tener cuenta ni sesión
