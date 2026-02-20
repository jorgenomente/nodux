# Activity Log

Registro de cambios importantes del proyecto.

Formato sugerido:

## YYYY-MM-DD — <titulo corto>

**Tipo:** decision | feature | refactor | fix | docs | db | rls | ux | tests
**Alcance:** backend | frontend | db | rls | ux | infra

**Resumen**
Breve descripcion de que se hizo y por que.

**Impacto**

- Que habilita
- Que cambia
- Que NO cambia

## 2026-02-18 14:42 -03 — Orders detail: fila de acciones inline para recepción + pago efectivo

**Tipo:** ui
**Lote:** orders-detail-cash-row-inline-button-and-disabled-amount
**Alcance:** frontend, docs, tests

**Resumen**
Se ajustó el layout del bloque de confirmación en `/orders/[orderId]`: el botón “Confirmar recepción/control” ahora queda inline a la derecha del check de pago efectivo y su monto. El input de monto exacto se mantiene siempre visible pero bloqueado/vacío hasta marcar “Pago en efectivo realizado”.

**Archivos**

- app/orders/ReceiveActionsRow.tsx
- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:38 -03 — Orders detail: nota de “estimado aproximado” en monto

**Tipo:** ui
**Lote:** orders-detail-estimate-approx-note
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó anotación/tooltip en `/orders/[orderId]` junto al monto estimado (header y bloque de recepción) aclarando que es aproximado y que el monto real se confirma en remito/factura.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:36 -03 — Orders detail: estimado total visible y estimado por item

**Tipo:** ui
**Lote:** orders-detail-show-estimated-total-and-item-estimates
**Alcance:** frontend, docs, tests

**Resumen**
En `/orders/[orderId]` se agregó visibilidad del monto estimado total del pedido en el header y en el bloque de recepción/control. Además, en la lista de ítems se incorporó costo estimado unitario y subtotal estimado por item para mejorar validación operativa al recibir/controlar.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:30 -03 — Orders: input de cantidad permite vacío temporal al editar

**Tipo:** ui
**Lote:** orders-qty-input-allow-empty-editing
**Alcance:** frontend, tests

**Resumen**
Se mejoró la UX del input “Cantidad a pedir” en sugeridos (`OrderSuggestionsClient`): ahora permite borrar temporalmente el valor (estado vacío) sin forzar `0` en cada tecla, facilitando edición manual de cantidades.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:27 -03 — Orders: bloquear creación de pedido sin ítems válidos

**Tipo:** ui
**Lote:** orders-prevent-empty-order-creation
**Alcance:** frontend, docs, tests

**Resumen**
Se corrigió el flujo de creación en `/orders` para validar primero que exista al menos un ítem con cantidad > 0 antes de invocar `rpc_create_supplier_order`. Con esto se evita crear pedidos vacíos en el listado.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:25 -03 — Orders: preservar contexto de draft en error por ítems vacíos

**Tipo:** ui
**Lote:** orders-draft-context-preserve-on-empty-items-error
**Alcance:** frontend, docs, tests

**Resumen**
Se mejoró UX de `/orders` al crear pedido: cuando falla por ítems en 0, el redirect de error ahora conserva proveedor, sucursal y ajustes del draft (`draft_margin_pct`, `draft_avg_mode`) para que el desplegable siga abierto con el contexto armado y no haya que reconfigurar manualmente.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 13:00 -03 — Orders: fix de hydration mismatch en sugeridos

**Tipo:** ui
**Lote:** orders-hydration-mismatch-view-state-fix
**Alcance:** frontend, tests

**Resumen**
Se resolvió un `hydration mismatch` en `/orders` causado por inicializar la vista (tabla/tarjetas) con branch `typeof window` durante render del Client Component `OrderSuggestionsClient`. La vista ahora arranca estable en `table` para SSR/cliente y evita desalineación de HTML en hidratación.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:57 -03 — Orders: banner de confirmación al guardar/enviar desde armar pedido

**Tipo:** ui
**Lote:** orders-create-send-success-feedback-banner
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó feedback explícito en `/orders` al crear pedidos desde “Armar pedido”. El submit ahora redirige con `result` y muestra banner claro para: pedido enviado, borrador guardado y errores de creación/ítems vacíos.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:54 -03 — Orders detail: visibilidad de pago efectivo sin requerir estado `paid`

**Tipo:** ui
**Lote:** orders-detail-header-cash-paid-visibility-partial
**Alcance:** frontend, tests

**Resumen**
Se ajustó la condición del header de `/orders/[orderId]` para mostrar “Pagado en efectivo” y monto cuando exista pago efectivo registrado (`selected_payment_method='cash'` y `paid_amount>0`), aunque el payable no esté en estado final `paid` (por ejemplo `partial`).

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:51 -03 — Orders detail: header con “Pagado en efectivo” y monto

**Tipo:** ui
**Lote:** orders-detail-header-show-cash-payment-info
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó en la info superior de `/orders/[orderId]` el estado de pago en efectivo cuando aplica, mostrando monto pagado (ARS) y fecha/hora de pago junto a creado/enviado/controlado.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:49 -03 — Orders detail: pago efectivo idempotente sin error confuso

**Tipo:** ui
**Lote:** orders-detail-cash-idempotent-no-confusing-error
**Alcance:** frontend, docs, tests

**Resumen**
Se eliminó el mensaje de error confuso “La cuenta por pagar no requiere un nuevo pago en efectivo” en `/orders/[orderId]` para el flujo de control con check de pago efectivo. Ahora, si el payable ya quedó saldado, la acción no intenta registrar otro pago y la UI ya no muestra el check de pago efectivo para ese pedido; en su lugar informa que el pago ya está registrado.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:46 -03 — Orders detail: check de pago efectivo inline en confirmación

**Tipo:** ui
**Lote:** orders-detail-cash-checkbox-inline-with-confirm
**Alcance:** frontend, docs, tests

**Resumen**
Se iteró la UX en `/orders/[orderId]`: en recepción/control para proveedores de efectivo ahora se usa un check “Pago en efectivo realizado” y el monto exacto aparece inline al marcarlo, en la misma fila del botón “Confirmar recepción/control”. Se removió el input de monto separado de arriba y se mantuvo la regla de seguridad: si el check está marcado sin monto válido, no se procesa ningún cambio.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:38 -03 — Orders detail: separación estricta entre controlar y pagar efectivo

**Tipo:** ui
**Lote:** orders-detail-cash-action-separation-and-guardrails
**Alcance:** frontend, docs, tests

**Resumen**
Se corrigió el flujo en `/orders/[orderId]` para evitar regresión de estado al usar “Pago en efectivo realizado”. Ahora el botón de pago es una acción separada que no cambia estado del pedido. Además, si no se informa monto exacto, no se procesa ningún cambio. Se agregaron guardrails para impedir pago efectivo antes de confirmar control/recepción.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:14 -03 — Payments: método requerido en vivo desde perfil de proveedor

**Tipo:** ui
**Lote:** payments-required-method-live-from-supplier-profile
**Alcance:** frontend, docs, tests

**Resumen**
Se corrigió la visualización de “Método requerido” en `/payments`: ahora toma el método preferido actual del proveedor (`suppliers.preferred_payment_method`) en lugar de depender solo del snapshot de `supplier_payables`. Con esto, cambios recientes en `/suppliers` (por ejemplo transfer -> efectivo) se reflejan inmediatamente en pendientes por pagar.

**Archivos**

- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:08 -03 — Orders detail: acción Guardar y enviar en borrador

**Tipo:** ui
**Lote:** orders-detail-draft-save-and-send-button
**Alcance:** frontend, tests

**Resumen**
En el editor de borrador de `/orders/[orderId]` se agregó el botón `Guardar y enviar` junto a `Guardar borrador`. La acción reutiliza el guardado batch de ítems y, en el mismo submit, cambia el estado del pedido a `sent` para que pase a “Pendiente por recibir”.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:06 -03 — Orders detail: editor batch de borrador con sugeridos + buscador

**Tipo:** ui
**Lote:** orders-detail-draft-full-items-editor
**Alcance:** frontend, docs, tests

**Resumen**
En `/orders/[orderId]` (estado `draft`) se reemplazó el flujo de “Agregar ítem” + edición individual por un editor completo de borrador con lista de artículos sugeridos del proveedor/sucursal, estadísticas operativas, buscador por artículo y guardado batch. Al guardar, se aplica la nueva lista completa de ítems (upsert qty > 0 y remoción de los que quedan en 0/no incluidos).

**Archivos**

- app/orders/[orderId]/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:00 -03 — Suppliers: aplicar cambios de edición sin refresh manual

**Tipo:** ui
**Lote:** suppliers-immediate-refresh-after-save
**Alcance:** frontend, tests

**Resumen**
Se mejoró la UX de edición en `/suppliers` para que los cambios (incluyendo método de pago) se reflejen inmediatamente tras guardar, sin recargar manualmente la página. `SupplierActions` ahora ejecuta la Server Action y luego fuerza `router.refresh()`; además cierra el formulario de edición al completar.

**Archivos**

- app/suppliers/SupplierActions.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 11:57 -03 — Suppliers: fix Server Action closure en Next 16

**Tipo:** ui
**Lote:** suppliers-server-action-closure-fix
**Alcance:** frontend, tests

**Resumen**
Se corrigió el error de runtime en `/suppliers` bajo Next.js 16.1.6 (Turbopack) donde `createSupplier` y `updateSupplier` quedaban enlazadas a una función local (`deriveAccepts`) no serializable al cruzar el boundary Server Component -> Client Component. Se eliminó el closure y se derivaron `accepts_cash`/`accepts_transfer` inline dentro de cada Server Action.

**Archivos**

- app/suppliers/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 11:53 -03 — Suppliers: método de pago preferido como único control UX

**Tipo:** ui
**Lote:** suppliers-payment-preference-ui-simplification
**Alcance:** frontend, docs, tests

**Resumen**
Se simplificó la UX de pagos en proveedores (`/suppliers` y `/suppliers/[supplierId]`): “Método preferido” pasó a “Método de pago preferido”, se removieron los checkboxes visibles de “Acepta efectivo/transferencia”, y “Nota de pago” se renombró a “Datos de pago y notas del proveedor”. Internamente, la aceptación se deriva automáticamente desde el método preferido para mantener compatibilidad con RPC/DB.

**Archivos**

- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/suppliers/SupplierActions.tsx
- docs/docs-app-screens-suppliers.md
- docs/docs-modules-suppliers.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 11:38 -03 — Order detail cash: monto exacto obligatorio y monto real de la orden

**Tipo:** ui
**Lote:** orders-detail-cash-payment-exact-amount
**Alcance:** frontend, docs, tests

**Resumen**
El botón “Pago en efectivo realizado” en `/orders/[orderId]` ahora exige monto exacto pagado. Ese monto se usa para actualizar el `invoice_amount` real del payable de la orden y luego registrar el pago en efectivo en el mismo flujo de control.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 11:35 -03 — Order detail: pago en efectivo al controlar recepción

**Tipo:** ui
**Lote:** orders-detail-cash-payment-at-receive
**Alcance:** frontend, docs, tests

**Resumen**
En `/orders/[orderId]` se agregó botón “Pago en efectivo realizado” junto a la confirmación de recepción/control para proveedores con método preferido `cash`. Esa acción confirma el control del pedido y registra automáticamente un pago en efectivo por el saldo pendiente del payable asociado. Si no se usa, el pedido queda controlado y el pago permanece pendiente/parcial para gestionarse en `/payments`.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:58 -03 — Payments: número factura/remito persistente + defaults de método/fecha

**Tipo:** schema
**Lote:** payments-invoice-reference-and-defaults
**Alcance:** db, ui, docs, tests

**Resumen**
Se agregó `invoice_reference` en `supplier_payables` y se extendió `rpc_update_supplier_payable` para guardar número de factura/remito. En `/payments` el formulario ahora se llama “Editar datos de factura/remito”, incluye ese campo al inicio, precarga método seleccionado con el preferido del proveedor cuando no había selección y usa `due_on` guardado sin conversión de zona horaria.

**Archivos**

- supabase/migrations/20260218113000_042_supplier_payables_invoice_reference.sql
- app/payments/page.tsx
- scripts/seed-demo-data.js
- docs/docs-app-screens-payments.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-18)
- node scripts/seed-demo-data.js OK (2026-02-18)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:53 -03 — Inputs numéricos sin chevrons y sin cambio por scroll (global)

**Tipo:** ui
**Lote:** global-number-input-no-spinner-no-wheel
**Alcance:** frontend, ux, tests

**Resumen**
Se aplicó hardening global para inputs numéricos: se removieron los chevrons (spin buttons) en todos los navegadores y se bloqueó el cambio de valor por rueda del mouse cuando un `input[type=number]` está enfocado.

**Archivos**

- app/globals.css
- app/layout.tsx
- app/components/NumberInputScrollGuard.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:45 -03 — Payments: fecha/hora en registro + bloqueo en pagadas + seed con más transfer pendientes

**Tipo:** ui
**Lote:** payments-flow-paid-at-and-demo-transfer-pending
**Alcance:** frontend, db, docs, tests

**Resumen**
Se agregó `fecha y hora de pago` al formulario de “Registrar pago” en `/payments` y se envía como `p_paid_at` al RPC. Para facturas ya pagadas se oculta la acción de registrar nuevos pagos y se muestra mensaje de estado final con fecha/hora. Además, se amplió el seed con nuevos pedidos y más escenarios `pending` por transferencia para visualización operativa.

**Archivos**

- app/payments/page.tsx
- scripts/seed-demo-data.js
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- node scripts/seed-demo-data.js OK (2026-02-18)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:39 -03 — Payments: pendientes/pagadas + orden por urgencia + buscador flexible

**Tipo:** ui
**Lote:** payments-list-priority-search
**Alcance:** frontend, docs, tests

**Resumen**
En `/payments` el listado se dividió en dos secciones (pendientes arriba, pagadas abajo). Las pendientes se ordenan por prioridad operativa: vencidas primero, luego próximo vencimiento y por último sin vencimiento. Se agregó buscador por nombre debajo de filtros, con coincidencia por palabras en cualquier orden.

**Archivos**

- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:09 -03 — Visibilidad de método de pago requerido en listados

**Tipo:** ui
**Lote:** payment-method-visibility-orders-payments
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó en `/orders` la visualización del método de pago requerido por proveedor (`preferred_payment_method`) y en `/payments` se muestra en cada cuenta por pagar el método requerido + método seleccionado.

**Archivos**

- app/orders/page.tsx
- app/payments/page.tsx
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:02 -03 — Pagos sincronizados con pedidos enviados + estado operativo visible

**Tipo:** schema
**Lote:** payments-sync-sent-orders
**Alcance:** db, ui, docs, tests

**Resumen**
Se extendió la sincronización de `supplier_payables` para incluir pedidos `sent` además de `received/reconciled`, con backfill automático sobre históricos. En `/payments` se expone el estado operativo del pedido para distinguir “pendiente por recibir” vs “controlado”.

**Archivos**

- supabase/migrations/20260218102000_041_payables_include_sent_orders.sql
- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/docs-modules-supplier-payments.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-18)
- node scripts/seed-demo-data.js OK (2026-02-18)
- psql local check `v_supplier_payables_admin` OK (sent=2, received=2, reconciled=2)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 09:47 -03 — Datos demo realistas en orders/payments + UI colapsable

**Tipo:** ui
**Lote:** payments-orders-demo-data-hardening
**Alcance:** frontend, db, docs, tests

**Resumen**
Se ajustaron los datos demo para que `/orders` y `/payments` muestren proveedores/sucursales con nombres reales, perfiles de pago completos y cuentas por pagar con factura, vencimiento y estados pendientes/parciales/pagados. En `/payments` se ocultaron formularios de factura y pago en secciones desplegables para reducir carga visual.

**Archivos**

- scripts/seed-users.js
- scripts/seed-demo-data.js
- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/docs-demo-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- node scripts/seed-demo-data.js OK (2026-02-18)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-17 22:11 -03 — Factura comprimida para pagos proveedor

**Tipo:** ui
**Lote:** supplier-invoice-photo-compression-storage
**Alcance:** db, ui, docs, tests

**Resumen**
Se incorporó carga de foto de factura/remito en `/payments` con conversión y compresión automática a JPG para minimizar peso manteniendo legibilidad. La imagen se sube a Storage en bucket `supplier-invoices` y se guarda el path en `supplier_payables.invoice_photo_url`.

**Archivos**

- supabase/migrations/20260217221500_040_supplier_invoice_storage_bucket.sql
- app/payments/InvoiceImageField.tsx
- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run db:reset OK (2026-02-17)
- npm run db:schema:snapshot OK (2026-02-17)
- npm run types:gen OK (2026-02-17)
- npm run db:seed:all OK (2026-02-17)
- npm run db:rls:smoke OK (2026-02-17)
- npm run lint OK (2026-02-17)
- npm run build OK (2026-02-17)

**Commit:** N/A

## 2026-02-17 22:00 -03 — Pagos proveedor por sucursal + integración con orders

**Tipo:** schema
**Lote:** supplier-payments-branch-module-foundation
**Alcance:** db, ui, docs, tests

**Resumen**
Se implementó la base operativa del módulo `/payments` por sucursal: perfil de pago en proveedor (métodos/plazo), cuentas de transferencia, cuentas por pagar por pedido y registro de pagos. El estado de pago queda integrado en `/orders` para ver pendiente/parcial/pagado/vencido y saldo.

**Impacto**

- Nuevo flujo conectado `suppliers -> orders -> payments`.
- Cada sucursal gestiona sus pedidos y pagos sobre `branch_id`.
- Al recibir/controlar pedido se sincroniza automáticamente `supplier_payables`.
- `/orders` muestra estado de pago y saldo pendiente por pedido.
- `/suppliers` y `/suppliers/[supplierId]` incluyen método/plazo/cuentas de pago.

**Archivos**

- supabase/migrations/20260217213000_039_supplier_payments_branch_module.sql
- app/payments/page.tsx
- app/orders/page.tsx
- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/suppliers/SupplierActions.tsx
- app/components/TopBar.tsx
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-suppliers.md
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-app-screens-payments.md
- docs/docs-modules-suppliers.md
- docs/docs-modules-supplier-orders.md
- docs/docs-modules-supplier-payments.md
- docs/docs-scope-mvp.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-17)
- npm run db:schema:snapshot OK (2026-02-17)
- npm run types:gen OK (2026-02-17)
- npm run db:seed:all OK (2026-02-17)
- npm run db:rls:smoke OK (2026-02-17)
- npm run lint OK (2026-02-17)
- npm run build OK (2026-02-17)

**Commit:** N/A

## 2026-02-13 — Auditoría: hardening operativo en proveedores/pedidos

**Lote:** audit-log-operational-hardening
**Tipo:** db
**Alcance:** db + frontend + docs

**Resumen**
Se auditó la cobertura real de `audit_log` con pruebas autenticadas y se cerraron gaps en acciones críticas: `supplier_upsert`, actualización de `expected_receive_on` y recepción/control de pedidos proveedor. También se actualizaron labels de `/settings/audit-log`.

**Impacto**

- Crear/editar proveedor vuelve a registrar `supplier_upsert`.
- Ajustar fecha estimada de recepción registra `supplier_order_expected_receive_on_set`.
- Confirmar recepción/control registra `supplier_order_received`.
- UI de auditoría muestra labels legibles para acciones de vencimientos/stock safety nuevas.

**Archivos**

- supabase/migrations/20260213125000_030_audit_gaps_supplier_orders.sql
- app/orders/calendar/page.tsx
- app/orders/[orderId]/page.tsx
- app/settings/audit-log/page.tsx
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/docs-modules-supplier-orders.md
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-settings-audit-log.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run db:reset` OK (2026-02-13) · `npm run db:seed:demo` OK (2026-02-13) · `npm run db:schema:snapshot` OK (2026-02-13) · `npm run types:gen` OK (2026-02-13) · `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Verificación DB:** action_keys observados: `supplier_upsert`, `supplier_order_status_set`, `supplier_order_expected_receive_on_set`, `supplier_order_received`, `expiration_batch_date_corrected`, `expiration_waste_recorded`
**Verificación RLS mínima:** OA lectura `v_audit_log_admin` OK (6 filas) · ST lectura `v_audit_log_admin` denegada por política efectiva (0 filas)
**Commit:** N/A

## 2026-02-16 — POS split payments (efectivo + tarjeta) con contrato DB compatible

**Tipo:** schema
**Alcance:** db, ui, docs, tests

**Resumen**
Se habilitó pago dividido en POS con desglose por método (`sale_payments`), manteniendo compatibilidad backward en `rpc_create_sale` y sin romper flujo actual de pago único.

**Impacto**

- POS permite combinar métodos (ej: efectivo + tarjeta) con suma exacta obligatoria.
- `rpc_create_sale` acepta `p_payments` opcional:
  - sin `p_payments` mantiene comportamiento previo.
  - con `p_payments` valida montos/metodos y total exacto.
- `sales.payment_method` pasa a `mixed` cuando hay más de un método.
- Descuento efectivo sigue protegido:
  - solo aplica si el cobro es 100% cash (no split).
- Dashboard de efectivo usa cobros reales desde `sale_payments` (incluye componente cash en ventas mixtas).
- Auditoría de venta registra detalle `payments`.

**Archivos**

- supabase/migrations/20260216163000_034_split_payments_enum.sql
- supabase/migrations/20260216164000_035_split_payments_pos.sql
- app/pos/PosClient.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-admin-dashboard.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run db:reset:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)
- npm run format:check OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — POS: descuento en efectivo fijo por preferencias + métricas dashboard

**Tipo:** schema
**Alcance:** db, ui, docs, tests

**Resumen**
Se implementó descuento por efectivo en POS con porcentaje fijo configurable en `settings/preferences`, validación estricta en DB para que solo aplique con `payment_method='cash'`, auditoría de cambios de preferencias y nuevos KPI de efectivo/descuento en dashboard.

**Impacto**

- Caja: toggle de descuento efectivo sin edición de porcentaje.
- Configuración: porcentaje gestionado solo por OA/SA en preferencias.
- DB: `rpc_create_sale` bloquea intento de descuento en tarjeta/otros medios.
- Auditoría:
  - `sale_created` ahora incluye `subtotal_amount`, `discount_amount`, `discount_pct`, `cash_discount_applied`.
  - nuevo evento `org_preferences_updated` al cambiar preferencias.
- Dashboard: nuevos indicadores de efectivo y descuentos del día.

**Archivos**

- supabase/migrations/20260216150000_033_cash_discount_pos_dashboard_audit.sql
- app/pos/page.tsx
- app/pos/PosClient.tsx
- app/settings/preferences/page.tsx
- app/dashboard/page.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-admin-dashboard.md
- docs/docs-app-screens-settings-preferences.md
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run db:reset:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run format:check OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 14:56 -03 — Hardening Caja: firma operativa + conteo por denominaciones

**Tipo:** schema  
**Lote:** cashbox-close-signature-denominations  
**Alcance:** db, ui, docs, tests

**Resumen**
Se endureció el cierre de caja para exigir firma operativa (`closed_controlled_by_name`) y confirmación explícita. Además, se agregó conteo por denominaciones con validación de suma exacta contra el total contado.

**Impacto**

- Cierre de caja más auditable y trazable por sucursal.
- `rpc_close_cash_session` ahora:
  - exige nombre de quien controla,
  - exige confirmación de cierre,
  - valida `count_lines` y su suma.
- Se almacena el detalle de denominaciones en `cash_session_count_lines`.
- Auditoría de cierre incluye firma/confirmación/denominaciones en metadata.

**Archivos**

- supabase/migrations/20260216182000_037_cashbox_close_signature_denominations.sql
- app/cashbox/page.tsx
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/docs-app-screens-settings-audit-log.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run db:reset OK (2026-02-16)
- npm run db:schema:snapshot OK (2026-02-16)
- npm run types:gen OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Cierre hardening QA: smoke RLS + CI automatizada

**Tipo:** tests
**Alcance:** qa, ci, docs

**Resumen**
Se agregó una suite mínima de smoke RLS ejecutable por script y un workflow de GitHub Actions para validar de forma repetible DB local + seed + lint/build + smoke RLS + smoke Playwright.

**Impacto**

- Validación automática de permisos críticos:
  - staff puede leer catálogo y no puede crear productos.
  - org_admin puede crear productos y no puede ejecutar RPCs de superadmin.
  - superadmin puede operar org activa y leer vistas de plataforma.
- Pipeline CI deja de depender de ejecución manual para smoke.
- Se reduce riesgo de regresiones en auth/RLS/routing multi-org.

**Archivos**

- scripts/rls-smoke-tests.mjs
- package.json
- .github/workflows/ci-hardening.yml
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/docs-rls-matrix.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-13 — Calendario: remover estado “pedido realizado”

**Lote:** orders-calendar-remove-sent-state
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se simplificó el calendario de proveedores para trabajar con solo 3 estados operativos: pendiente por realizar, pendiente por recibir y recibido/controlado. Se removió el estado intermedio “pedido realizado”.

**Impacto**

- Se elimina ambigüedad entre “realizado” y “pendiente por recibir”.
- El filtro de estado ya no muestra “pedido realizado”.
- La copia de cabecera y el contrato de pantalla quedan alineados con 3 estados.

**Archivos**

- app/orders/calendar/page.tsx
- app/orders/calendar/CalendarFiltersClient.tsx
- docs/docs-app-screens-supplier-calendar.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario: deduplicar texto de estado en tarjetas

**Lote:** orders-calendar-dedupe-status-text
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se eliminó la repetición de estado en tarjetas de `/orders/calendar`: cuando existe la línea “Estado de pedido”, ya no se renderiza el texto de estado superior.

**Impacto**

- Mejora claridad visual en eventos con pedido real.
- Mantiene el estado operativo en la línea “Estado de pedido”.
- No altera reglas de negocio ni filtros del calendario.

**Archivos**

- app/orders/calendar/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Normalización de estados en calendario/detalle de pedidos

**Lote:** orders-status-normalization-calendar-detail
**Tipo:** fix
**Alcance:** frontend + docs

**Resumen**
Se corrigió una inconsistencia de estados entre `/orders/calendar` y `/orders/[orderId]`: antes un pedido `received` podía verse como “pendiente por recibir” en calendario pero “controlado” en detalle. Ahora la UI opera con 3 estados claros y consistentes.

**Impacto**

- En calendario, `controlled` solo se construye con `reconciled_at` (ya no con `received_at`).
- En calendario, pedidos `received` legacy sin `reconciled_at` se tratan como pendientes por recibir.
- En detalle, `received` deja de mostrarse como controlado; permite completar control y cerrar en `reconciled` con fecha/firma.

**Archivos**

- app/orders/calendar/page.tsx
- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-supplier-calendar.md
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Comando único db:reset:all

**Lote:** db-reset-all-command
**Tipo:** infra
**Alcance:** backend + docs

**Resumen**
Se agregó el comando `db:reset:all` para ejecutar en una sola orden el reset local de Supabase, seed de usuarios y seed demo operativo MVP.

**Impacto**

- Simplifica la preparación de entorno QA con un único entry point.
- Mantiene `db:reset`, `db:seed:all` y `db:seed:demo` para casos parciales.
- Documenta explícitamente el flujo recomendado de reseteo integral.

**Archivos**

- package.json
- docs/docs-demo-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run db:reset:all` OK (2026-02-13) · `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Seed QA integral para MVP

**Lote:** seed-mvp-full-reusable
**Tipo:** tests
**Alcance:** backend + infra + docs

**Resumen**
Se fortalecio el seed demo para cubrir mas escenarios operativos del MVP (pedidos proveedor en multiples estados, expected receive, vencimientos y pedidos especiales en estados variados), se agrego comando unico `db:seed:all` y se corrigio idempotencia de `seed-users` para el error `email_exists`.

**Impacto**

- Permite poblar datos consistentes para probar `/products`, `/suppliers`, `/orders`, `/orders/calendar`, `/clients`, `/expirations` y POS sin preparar datos manualmente.
- El seed completo se ejecuta con un solo comando (`npm run db:seed:all`).
- Re-ejecuciones no fallan por usuarios ya existentes.

**Archivos**

- scripts/seed-demo-data.js
- scripts/seed-users.js
- package.json
- docs/docs-demo-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run db:seed:all` OK (2026-02-13) · `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Suppliers: buscador bajo título de listado

**Lote:** suppliers-list-search-below-title
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se ajusto el layout en `/suppliers` para ubicar el buscador justo debajo del título “Listado”, manteniendo el filtro en vivo desde 3 letras.

**Impacto**

- Mejora jerarquía visual de la sección de listado.
- No cambia la lógica de búsqueda ni el contrato de datos.
- Mantiene interacción sin botón y actualización automática por query param.

**Archivos**

- app/suppliers/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Suppliers: buscador en vivo dentro de listado

**Lote:** suppliers-list-live-search
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se movio el buscador de proveedores al bloque `Listado` y se cambio a filtro en vivo sin boton: aplica busqueda por nombre/contacto al escribir 3 o mas letras.

**Impacto**

- Reduce pasos para filtrar proveedores en operacion diaria.
- Mantiene el contrato de lectura `v_suppliers_admin` sin cambios estructurales.
- Con 1-2 letras no se filtra; al limpiar input vuelve listado completo.

**Archivos**

- app/suppliers/page.tsx
- app/suppliers/SuppliersSearchInput.tsx
- docs/docs-app-screens-suppliers.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Suppliers: alta en desplegable

**Lote:** suppliers-new-form-collapsible
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se movio la seccion “Nuevo proveedor” de `/suppliers` a un bloque desplegable (`details/summary`) para reducir ruido visual y mantener el formulario disponible en la misma pantalla.

**Impacto**

- Mejora legibilidad del listado de proveedores al entrar a la pantalla.
- Mantiene intacto el contrato de datos (`v_suppliers_admin` + `rpc_upsert_supplier`).
- El desplegable queda abierto por defecto cuando no hay proveedores (empty state).

**Archivos**

- app/suppliers/page.tsx
- docs/docs-app-screens-suppliers.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Orders list: alerta de recepción vencida

**Lote:** orders-list-overdue-expected-receive
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agrego alerta visual en `/orders` para pedidos pendientes cuya fecha estimada de recepción ya venció.

**Impacto**

- Mejora detección rápida de pedidos atrasados.
- No altera lógica de estados ni reglas de negocio.
- Mantiene compatibilidad con `expected_receive_on` editable.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Orders list: mostrar fecha estimada de recepción

**Lote:** orders-list-expected-receive
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agrego `expected_receive_on` en las tarjetas del listado de `/orders` (pendientes y controlados) para visibilidad rápida sin entrar al detalle.

**Impacto**

- Mejora seguimiento operativo de recepciones esperadas desde la lista principal.
- Mantiene sincronia con el valor editable desde calendario y detalle.
- No cambia reglas de negocio ni flujo de estados.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Orders detail: expected receive editable

**Lote:** suppliers-calendar-expected-receive-order-detail
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agrego edicion de `expected_receive_on` en `/orders/[orderId]` para pedidos en estado enviado/received, manteniendo sincronia con calendario.

**Impacto**

- OA puede ajustar fecha estimada desde detalle del pedido, sin volver al calendario.
- Al guardar, la fecha se refleja en `/orders/calendar`.
- No cambia flujo de control de mercaderia ni recepcion.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario: expected receive editable + filtros condicionales

**Lote:** suppliers-calendar-expected-receive
**Tipo:** feature
**Alcance:** db + frontend + docs

**Resumen**
Se agrego `expected_receive_on` en `supplier_orders` y se habilito su edicion desde `/orders/calendar` para pedidos pendientes por recibir. Tambien se ajustaron filtros para flujo `sucursal -> estado -> periodo` y `desde/hasta` solo en rango personalizado (aparece inmediatamente al seleccionar la opcion).

**Impacto**

- OA puede ajustar fecha estimada exacta de recepcion cuando el dia por defecto del proveedor no aplica.
- El calendario mantiene sincronia con estados reales de pedidos en `/orders`.
- Staff conserva visibilidad solo lectura.

**Archivos**

- supabase/migrations/20260213101500_029_supplier_orders_expected_receive_on.sql
- app/orders/calendar/page.tsx
- app/orders/calendar/CalendarFiltersClient.tsx
- docs/schema.sql
- types/supabase.ts
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/docs-app-screens-supplier-calendar.md
- docs/docs-modules-supplier-calendar.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run db:reset` OK (2026-02-13) · `npm run db:schema:snapshot` OK (2026-02-13) · `npm run types:gen` OK (2026-02-13) · `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario de proveedores v2 (filtros + estados operativos)

**Lote:** suppliers-calendar-mvp-ui-v2
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se itero la pantalla de calendario para orientarla a operacion diaria con filtros por periodo/rango y estados operativos sincronizados con pedidos.

**Impacto**

- Filtros: hoy, semana, mes o rango personalizado.
- Estados de tarjeta: pendiente por realizar, pedido realizado, pendiente por recibir, recibido y controlado.
- Acceso directo a pedido para revisar/controlar desde calendario.

**Archivos**

- app/orders/calendar/page.tsx
- docs/docs-app-screens-supplier-calendar.md
- docs/docs-modules-supplier-calendar.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario de proveedores MVP (UI + docs)

**Lote:** suppliers-calendar-mvp-ui
**Tipo:** feature
**Alcance:** frontend + docs

**Resumen**
Se implemento la nueva pantalla `/orders/calendar` con agenda mobile-first de 14 dias que combina envios/recepciones programados desde proveedores y eventos reales de pedidos, con visibilidad para OA y Staff (solo lectura para Staff).

**Impacto**

- OA puede ver agenda de proveedores y entrar rapido a crear/ver pedido.
- Staff puede consultar que se envia/recibe por dia sin acceso de escritura.
- Se actualiza documentacion de sitemap, indice de pantallas y modulo/calendario.

**Archivos**

- app/orders/calendar/page.tsx
- app/components/TopBar.tsx
- docs/docs-modules-supplier-calendar.md
- docs/docs-app-screens-supplier-calendar.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-modules-supplier-orders.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/docs-ux-ui-brief.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario proveedores: discovery y propuesta de arquitectura

**Lote:** suppliers-calendar-discovery
**Tipo:** decision
**Alcance:** docs + arquitectura

**Resumen**
Se realizo analisis repo-aware (docs, schema, RLS, rutas y contratos actuales) para definir la propuesta del nuevo modulo de calendario de proveedores con enfoque mobile-first y visibilidad para OA/ST.

**Impacto**

- Define una propuesta concreta de rutas, contrato de datos, permisos y UX para el calendario.
- Identifica brechas del modelo actual (eventos recurrentes vs eventos reales de pedidos) y una estrategia de implementacion por fases.
- No se aplican cambios de codigo ni migraciones en este lote.

**Archivos**

- docs/docs-scope-mvp.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-suppliers.md
- docs/docs-app-screens-orders.md
- docs/docs-modules-suppliers.md
- docs/docs-modules-supplier-orders.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md
- app/orders/page.tsx
- app/pos/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/components/TopBar.tsx
- supabase/migrations/20260208213000_001_init_schema.sql
- supabase/migrations/20260208221000_003_views.sql
- supabase/migrations/20260208222000_004_rpcs.sql
- supabase/migrations/20260208234000_006_rpc_staff_effective_modules.sql
- supabase/migrations/20260209170000_011_suppliers_frequency_safety_stock.sql
- supabase/migrations/20260209174000_013_rpc_upsert_supplier_schedule.sql
- supabase/migrations/20260209175000_014_view_suppliers_schedule.sql
- docs/schema.sql
- types/supabase.ts

**Tests:** N/A (lote de analisis/documentacion)
**Commit:** N/A

## 2026-02-11 — Expirations: vencidos unificados

**Tipo:** docs
**Alcance:** docs

**Resumen**
Se actualizo la documentacion de vencimientos para reflejar la lista unificada (vencidos primero) y el filtro “Vencidos”.

**Impacto**

- La pantalla /expirations queda documentada con lista unificada y accion de mover a desperdicio.
- El modulo de vencimientos refleja el flujo actualizado.
- No cambia la app ni la base de datos.

**Archivos**

- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/context-summary.md
- docs/prompts.md

**Tests:** N/A
**Commit:** N/A

## 2026-02-11 — Expirations: auto filtro por sucursal

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se actualizo el selector de sucursal para que refresque automaticamente la lista de vencimientos sin boton de filtrar.

**Impacto**

- Cambiar sucursal actualiza la lista al instante.
- No cambia reglas de negocio ni base de datos.
- Se actualiza el contrato de pantalla para reflejar el comportamiento.

**Archivos**

- app/expirations/ExpirationsFiltersClient.tsx
- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/prompts.md

**Tests:** N/A
**Commit:** N/A

## 2026-02-11 — Orders: selector de estado en detalle

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agrego selector de estado (borrador/enviado) en /orders/[orderId] y se documenta que “recibido/controlado” requieren sus flujos dedicados.

**Impacto**

- Permite ajustar el estado del pedido desde el header.
- Mantiene la recepcion y control como acciones dedicadas.
- No cambia RPCs ni modelo de datos.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md

**Tests:** N/A
**Commit:** N/A

## 2026-02-11 — Orders: recibido/controlado unificados en UI

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se unifico el estado “recibido” con “controlado” en la UI de detalle, manteniendo la recepcion/control como un solo paso.

**Impacto**

- El selector de estado solo permite borrador/enviado.
- La recepcion aplica controlado en un solo flujo.
- No cambia RPCs ni modelo de datos.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: refresh estado al enviar

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se fuerza redirect con aviso para que el estado se actualice inmediatamente al enviar pedido.

**Impacto**

- El estado cambia sin refrescar manualmente.
- Se mantiene el flujo actual de estados.
- No cambia DB ni RPCs.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: controlado obligatorio + auto sugeridos

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se obliga a indicar “controlado por” al recibir pedidos, se elimina “recibido” en la UI y se auto cargan sugeridos al elegir proveedor/sucursal.

**Impacto**

- La recepcion exige nombre de control.
- La cabecera muestra solo creado/enviado/controlado.
- El armado de pedido no requiere boton “Ver articulos”.

**Archivos**

- app/orders/[orderId]/page.tsx
- app/orders/OrderDraftFiltersClient.tsx
- app/orders/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — DB: refresco schema y tipos

**Tipo:** db
**Alcance:** db + docs

**Resumen**
Se corrigio la migracion de `v_expirations_due` para recrear el view y se regeneraron snapshot y tipos.

**Impacto**

- El view incluye `unit_price` y `total_value` sin conflicto.
- `types/supabase.ts` queda alineado a la DB local.
- `docs/schema.sql` actualizado.

**Archivos**

- supabase/migrations/20260211150000_028_expirations_due_include_price.sql
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md

**Tests:** `npm run db:reset` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Dashboard: KPIs y alertas basicas

**Tipo:** feature
**Alcance:** frontend + docs

**Resumen**
Se implemento el dashboard operativo con KPIs, alertas y paneles de acceso rapido usando `rpc_get_dashboard_admin`.

**Impacto**

- Visibilidad de ventas hoy/semana/mes y conteos clave.
- Alertas con CTA a vencimientos, pedidos y clientes.
- Filtro por sucursal con vista agregada.

**Archivos**

- app/dashboard/page.tsx
- app/dashboard/DashboardFiltersClient.tsx
- docs/docs-app-screens-admin-dashboard.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Dashboard: filtro por sucursal obligatorio

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se elimino la opcion “todas las sucursales” y el dashboard ahora opera siempre en una sucursal seleccionada.

**Impacto**

- El selector de sucursal es obligatorio.
- La vista siempre muestra datos de una sucursal.
- No cambia DB ni RPCs.

**Archivos**

- app/dashboard/DashboardFiltersClient.tsx
- app/dashboard/page.tsx
- docs/docs-app-screens-admin-dashboard.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Pedidos especiales con items y POS

**Tipo:** db
**Alcance:** db + frontend + docs

**Resumen**
Se extendieron los pedidos especiales para manejar ítems con proveedores, estado partial/cancelled, alertas en /orders y cobro desde POS con cierre opcional. Se actualizaron contratos y documentación viva.

**Impacto**

- Permite registrar pedidos especiales por ítems del catálogo.
- Conecta pedidos especiales con pedidos a proveedor y POS (stock se descuenta al cobrar).
- Se agrega opción de cierre al cobrar y soporte de entrega parcial.

**Archivos**

- supabase/migrations/20260210133000_023_special_order_status_extend.sql
- supabase/migrations/20260210140000_024_clients_special_orders_items.sql
- app/clients/page.tsx
- app/clients/ClientSpecialOrderItemsClient.tsx
- app/orders/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- app/pos/page.tsx
- app/pos/PosClient.tsx
- docs/docs-app-screens-clients.md
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-modules-clients.md
- docs/docs-modules-supplier-orders.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11) · `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Fix POS: RLS en ventas

**Tipo:** fix
**Alcance:** db

**Resumen**
Se ajusto `rpc_create_sale` como security definer con validaciones de acceso para permitir ventas de Staff sin romper RLS.

**Impacto**

- POS funciona para Staff con módulo habilitado y sucursal asignada.
- Se mantiene control de acceso por módulo y sucursal.
- No cambia el flujo de negocio ni UI.

**Archivos**

- supabase/migrations/20260211095500_025_rpc_create_sale_security_definer.sql
- docs/docs-data-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Smoke test POS + seed real

**Tipo:** tests
**Alcance:** tests + infra + data

**Resumen**
Se agrego smoke test de POS (venta rapida + pedido especial) y se extendio seed demo con proveedores, productos y clientes reales para pruebas manuales.

**Impacto**

- Permite validar el flujo POS y pedidos especiales con datos reales.
- Agrega datos smoke sin afectar logica de negocio.
- No cambia UI ni contratos.

**Archivos**

- e2e/smoke-pos.spec.ts
- playwright.config.ts
- scripts/seed-demo-data.js
- docs/prompts.md

**Tests:** `npx playwright test -g "smoke"` FAIL (2026-02-11) — `browserType.launch` permission denied (MachPortRendezvousServer)
**Commit:** N/A

## 2026-02-11 — Debug POS venta

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se agregó salida de error detallada (modo dev) en POS para diagnosticar fallos del RPC de venta.

**Impacto**

- Facilita identificar causa del 400 en `rpc_create_sale`.
- No cambia lógica de negocio ni seguridad.
- Visible solo en entorno no producción.

**Archivos**

- app/pos/PosClient.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Fix POS: created_at ambiguo

**Tipo:** fix
**Alcance:** db

**Resumen**
Se corrigieron referencias ambiguas a `created_at` dentro de `rpc_create_sale` calificando columnas.

**Impacto**

- Evita error 42702 al cobrar en POS.
- Mantiene el mismo comportamiento funcional.
- No cambia UI.

**Archivos**

- supabase/migrations/20260211103000_026_rpc_create_sale_orderby_fix.sql
- docs/docs-data-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-11) · `node scripts/seed-demo-data.js` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Clients: refresh estado pedido especial

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se fuerza redirect al mismo filtro al actualizar estado para reflejar cambios sin recargar manualmente.

**Impacto**

- Estado actualizado se ve inmediatamente.
- No cambia reglas de negocio ni DB.
- Mantiene filtros y cliente seleccionado.

**Archivos**

- app/clients/page.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: ajustes sugeridos debajo

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se movieron los ajustes de margen/promedio para que aparezcan debajo del listado de sugeridos y se apliquen con botón separado.

**Impacto**

- El usuario primero selecciona proveedor/sucursal.
- Los ajustes se aplican como configuración del listado.
- No cambia lógica de negocio ni RPCs.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: label promedio de ventas

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se renombro el selector de promedio a “Promedio de ventas” y se agrego aclaracion de uso.

**Impacto**

- Mejora claridad del ajuste.
- No cambia calculos ni lógica.
- No impacta DB.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: armar pedido colapsable

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se hizo colapsable la sección “Armar pedido” para priorizar el listado.

**Impacto**

- Reduce ruido visual al entrar a /orders.
- Mantiene el flujo actual sin cambios funcionales.
- No impacta DB.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: borrador vs enviado

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agregaron botones para guardar como borrador o enviar pedido, actualizando el estado en el listado.

**Impacto**

- Permite distinguir borradores y pedidos enviados desde la creación.
- No cambia schema ni contratos.
- Mantiene el flujo de sugeridos.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: texto mostrando

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se movio el texto de configuracion actual debajo de “Ajustes de sugeridos” y se prefijo con “Mostrando:”.

**Impacto**

- Mejora claridad de lo que se visualiza en los resultados.
- No cambia lógica de negocio ni datos.
- No afecta DB.

**Archivos**

- app/orders/page.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: mostrar debajo de especiales

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se movio el texto “Mostrando” debajo de la sección de pedidos especiales pendientes.

**Impacto**

- La configuración visible queda junto a las alertas.
- No cambia cálculos ni datos.
- Sin impacto en DB.

**Archivos**

- app/orders/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: mostrar separado

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se movio el texto “Mostrando” fuera de la caja de pedidos especiales a una sección aparte.

**Impacto**

- Evita confusión entre alertas y contexto.
- No cambia cálculos ni datos.
- Sin impacto en DB.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Expirations: vencidos y desperdicio

**Tipo:** feature
**Alcance:** db + frontend + docs

**Resumen**
Se agregó sección de vencidos con acción de mover a desperdicio, cálculo de pérdida monetaria y registro en DB.

**Impacto**

- Permite registrar desperdicio por vencimiento.
- Descuenta stock al mover a desperdicio.
- Muestra total de pérdidas por sucursal.

**Archivos**

- supabase/migrations/20260211140000_027_expiration_waste.sql
- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/prompts.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11) · `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Expirations: desperdicio confirmado

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se separó “Vencidos” de “Desperdicio”; solo aparece en desperdicio cuando se confirma el movimiento.

**Impacto**

- Los vencidos pendientes se mantienen visibles hasta confirmar.
- Desperdicio muestra solo registros confirmados.
- No cambia cálculos ni DB.

**Archivos**

- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/docs-schema-model.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-10 — Modulo vencimientos (UI)

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se implemento la pantalla `/expirations` con filtros por sucursal y severidad, listado de vencimientos y acciones de alta manual y ajuste para OA.

**Impacto**

- Habilita operar vencimientos con batches automaticos y manuales.
- Expone alertas por severidad usando `v_expirations_due`.
- No cambia schema ni RPCs.

**Archivos**

- app/expirations/page.tsx
- app/expirations/loading.tsx
- docs/docs-roadmap.md

**Tests:** `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-10 — Ajustes UX vencimientos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se forzo la seleccion de sucursal, se removio el scope "todas" y se ajustaron los filtros a rangos por dias (critico 0-3, pronto 4-7).

**Impacto**

- El listado es siempre por sucursal seleccionada.
- La alta manual hereda la sucursal seleccionada.
- No cambia schema ni RPCs.

**Archivos**

- app/expirations/page.tsx

**Tests:** `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-10 — Correccion fecha vencimiento

**Tipo:** db
**Alcance:** db + frontend + docs

**Resumen**
Se agrego RPC para corregir la fecha de vencimiento con audit log y se expuso la accion en /expirations. Se actualizaron contratos y docs vivos.

**Impacto**

- Permite ajustar fechas aproximadas a fechas reales.
- Mantiene trazabilidad via audit log.
- No cambia otras reglas de negocio.

**Archivos**

- supabase/migrations/20260210110000_022_expiration_batch_update_date.sql
- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-10) · `npm run db:schema:snapshot` OK (2026-02-10) · `npm run types:gen` OK (2026-02-10) · `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-10 — Batch code por recepcion

**Tipo:** db
**Alcance:** db + frontend + docs

**Resumen**
Se agrego batch_code en expiration_batches, se genera al recibir pedidos con prefijo de proveedor + fecha + secuencia y se muestra en /expirations.

**Impacto**

- Trazabilidad clara de lotes por recepcion.
- Facilita verificacion fisica por sucursal y proveedor.
- No altera consumo FEFO ni calculo de vencimientos.

**Archivos**

- supabase/migrations/20260210113000_023_expiration_batch_code.sql
- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-10) · `npm run db:schema:snapshot` OK (2026-02-10) · `npm run types:gen` OK (2026-02-10) · `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-10 — Auditoria docs vencimientos

**Tipo:** docs
**Alcance:** docs

**Resumen**
Se auditaron y ajustaron los docs de vencimientos para reflejar el estado real (filtros por días, batch_code, corrección de fecha). Se reforzó en AGENTS la obligación de actualizar docs por cada feature.

**Impacto**

- Documentación fiel al comportamiento actual.
- Refuerza disciplina de actualización de docs.
- No cambia runtime ni DB.

**Archivos**

- AGENTS.md
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/context-summary.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-10 — Auditoria docs pantallas MVP

**Tipo:** docs
**Alcance:** docs

**Resumen**
Se auditaron pantallas implementadas y se ajustaron contratos de pantalla para reflejar el estado real (placeholders, filtros, flujos y UI existente).

**Impacto**

- Documentación alineada con la app actual.
- Reduce drift entre UI y contratos.
- No cambia runtime ni DB.

**Archivos**

- docs/docs-app-screens-login.md
- docs/docs-app-screens-logout.md
- docs/docs-app-screens-no-access.md
- docs/docs-app-screens-admin-dashboard.md
- docs/docs-app-screens-superadmin.md
- docs/docs-app-screens-clients.md
- docs/docs-app-screens-products.md
- docs/docs-app-screens-products-lookup.md
- docs/docs-app-screens-suppliers.md
- docs/docs-app-screens-supplier-detail.md
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-audit-log.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-10 — Modulo clientes (UI)

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se implemento `/clients` con listado, detalle inline, alta/edicion de clientes y pedidos especiales por sucursal.

**Impacto**

- Habilita flujo de clientes y pedidos especiales en MVP.
- OA puede filtrar por sucursal; ST opera solo su sucursal activa.
- No cambia schema ni RPCs.

**Archivos**

- app/clients/page.tsx
- docs/docs-app-screens-clients.md
- docs/docs-roadmap.md
- docs/context-summary.md

**Tests:** `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-09 — Inputs proveedor en alta de productos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se ajustaron los formularios de alta de productos para renombrar el campo de nombre y capturar nombre/SKU del proveedor al crear productos desde /products y /suppliers/[supplierId].

**Impacto**

- Habilita guardar nombre y SKU del articulo en proveedor en la asociacion primaria.
- Cambia los formularios de alta en productos y detalle de proveedor.
- No cambia el schema ni las RPCs existentes.

**Archivos**

- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx
- docs/docs-app-screens-products.md
- docs/docs-app-screens-supplier-detail.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Labels opcionales proveedor

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego “(opcional)” a los labels de nombre/SKU en proveedor en los dos entry points de alta de producto.

**Impacto**

- Mejora claridad de formulario sin cambios funcionales.
- Cambia solo textos de UI.
- No cambia schema ni RPCs.

**Archivos**

- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Label codigo de barras

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se renombro el label de “Barcode” a “Codigo de barras” en los formularios de alta de productos.

**Impacto**

- Mejora consistencia de idioma en la UI.
- Cambia solo textos de UI.
- No cambia schema ni RPCs.

**Archivos**

- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Listado solo de productos principales

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se elimino el formulario de asociar productos en /suppliers/[supplierId] y se dejo solo el listado de productos principales con edicion de SKU/nombre en proveedor.

**Impacto**

- Simplifica el flujo: las asociaciones se crean al alta de producto.
- Cambia la UI del detalle de proveedor y su contrato de pantalla.
- No cambia schema ni RPCs.

**Archivos**

- app/suppliers/[supplierId]/page.tsx
- docs/docs-app-screens-supplier-detail.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Pedidos inline con sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se rehizo /orders para armar pedidos en la misma pantalla: seleccionar proveedor/sucursal, ver sugeridos, editar cantidades, cargar notas y crear pedido. Se agrego margen de ganancia para estimar costo.

**Impacto**

- El flujo de pedidos ocurre inline y el listado queda debajo.
- Se calcula costo estimado por articulo y total usando margen.
- No cambia schema ni RPCs; se reutiliza view de sugeridos y RPCs de pedidos.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Control de recepcion de pedidos

**Tipo:** db
**Alcance:** db + frontend

**Resumen**
Se agregaron campos de control en pedidos y se ajusto el flujo de recepcion para capturar fecha/hora real y firma (nombre + usuario). Al recibir se marca como controlado y se ingresa stock.

**Impacto**

- Habilita registrar la hora real de recepcion y quien controla el pedido.
- Cambia el RPC de recepcion y el detalle de pedido para capturar firma/fecha.
- No cambia reglas RLS ni otros modulos.

**Archivos**

- supabase/migrations/20260209141000_021_supplier_orders_controlled_fields.sql
- app/orders/[orderId]/page.tsx
- app/orders/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-data-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-09) · `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Seed demo de compras y ventas

**Tipo:** infra
**Alcance:** db

**Resumen**
Se agrego script para poblar datos demo (3 proveedores, 30 productos, ventas 90 dias, 4 pedidos) y se expuso comando de seed.

**Impacto**

- Habilita probar flujo de pedidos, sugeridos y control de recepcion con datos reales.
- Cambia solo datos locales; no afecta schema ni RPCs.
- Agrega script de seed reutilizable.

**Archivos**

- scripts/seed-demo-data.js
- package.json

**Tests:** `node scripts/seed-demo-data.js` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Promedio por ciclo en pedidos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se ajusto la tabla de sugeridos para mostrar promedio por ciclo (semanal/quincenal/mensual) y forzar cantidades enteras al pedir.

**Impacto**

- El promedio ahora se alinea con la frecuencia del proveedor.
- Las cantidades sugeridas y editables son enteras.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Selector promedio sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego selector para ver promedio semanal/quincenal/mensual en la tabla de sugeridos.

**Impacto**

- Permite comparar el promedio por ciclo del proveedor versus periodos fijos.
- Cambia solo la UI de sugeridos.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Redondeo promedio sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se redondeo el promedio por ciclo a entero (regla de .5 hacia arriba).

**Impacto**

- Mejora consistencia con cantidades enteras en pedidos.
- Cambia solo la visualizacion del promedio.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Total de articulos en pedido

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego la cantidad total de articulos junto al total estimado en la seccion de sugeridos.

**Impacto**

- Permite ver rapidamente el total de unidades a pedir.
- Cambia solo UI en /orders.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Navegacion a detalle de pedidos

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se cambio el listado de pedidos para usar Link y permitir navegar al detalle.

**Impacto**

- El click en el pedido abre `/orders/[orderId]`.
- No cambia datos ni lógica de pedidos.
- Solo afecta la UI del listado.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Fix params en order detail

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se ajusto el acceso a params en /orders/[orderId] para usar await en params Promise.

**Impacto**

- El detalle de pedido vuelve a renderizar sin error.
- No cambia datos ni lógica de negocio.
- Solo afecta el handler de ruta.

**Archivos**

- app/orders/[orderId]/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Tooltip margen en pedidos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego tooltip/ayuda en el input de margen para explicar el costo aproximado.

**Impacto**

- Mejora claridad del calculo de costo en sugeridos.
- Cambia solo UI en /orders.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Vista tarjetas en sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego toggle para ver sugeridos en tabla o tarjetas en /orders.

**Impacto**

- Mejora usabilidad en mobile para revisar sugeridos.
- Cambia solo la UI de sugeridos.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx
- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Persistir vista sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se persiste en localStorage la vista elegida (tabla/tarjetas) en sugeridos.

**Impacto**

- Mantiene la preferencia del usuario entre sesiones.
- Cambia solo UI en /orders.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Separar pedidos controlados

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se dividio el listado de pedidos en pendientes y controlados, mostrando controlados al final.

**Impacto**

- Facilita priorizar pedidos por controlar/enviar.
- Cambia solo la UI del listado en /orders.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Busqueda tokens en POS

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego busqueda por tokens con minimo 3 caracteres en el POS.

**Impacto**

- Mejora relevancia de resultados y evita render masivo.
- La busqueda acepta tokens en cualquier orden.
- No cambia schema ni RPCs.

**Archivos**

- app/pos/PosClient.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Busqueda en vivo POS

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego busqueda en vivo (debounce) al tipear en el POS.

**Impacto**

- El filtrado ocurre automaticamente sin boton.
- Se reduce la friccion en caja.
- No cambia schema ni RPCs.

**Archivos**

- app/pos/PosClient.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Desplegable ajuste stock

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se convirtio el formulario de ajuste manual de stock en un desplegable.

**Impacto**

- Reduce espacio en la pagina de productos.
- Cambia solo UI en /products.
- No cambia schema ni RPCs.

**Archivos**

- app/products/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-08 — Diagnostico docs y baseline de schema

**Tipo:** docs
**Alcance:** db

**Resumen**
Se realizo un diagnostico profundo de consistencia entre docs y se creo un baseline propuesto del modelo de schema DB para el MVP.

**Impacto**

- Habilita iniciar migraciones con una base coherente con contratos y modulos.
- Cambia el estado: ahora hay un documento de schema propuesto como fuente inicial.
- No cambia el runtime ni la DB real (todavia no existe schema implementado).

**Archivos**

- docs/docs-schema-model.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Alineacion docs con baseline

**Tipo:** docs
**Alcance:** db

**Resumen**
Se alineo el indice de pantallas y se completaron los documentos vivos de modelo de datos y matriz RLS usando el baseline propuesto.

**Impacto**

- Deja el set de docs coherente y listo para iniciar migraciones cuando se decida.
- Cambia la fuente de verdad operativa: modelo y RLS dejan de ser placeholders.
- No cambia el runtime ni la DB real.

**Archivos**

- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-logout.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Roadmap vivo

**Tipo:** docs
**Alcance:** decision

**Resumen**
Se creo el roadmap vivo del proyecto y se actualizo AGENTS para exigir su mantenimiento en cada avance.

**Impacto**

- Habilita orden operativo y trazabilidad de fases.
- Cambia el proceso: el roadmap debe actualizarse con cada avance.
- No cambia runtime ni DB.

**Archivos**

- docs/docs-roadmap.md
- AGENTS.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Fase 0 completada

**Tipo:** docs
**Alcance:** decision

**Resumen**
Se marco la Fase 0 (Fundaciones) como completa en el roadmap vivo.

**Impacto**

- Deja habilitado avanzar a Fase 1 (schema real + RLS).
- No cambia runtime ni DB.

**Archivos**

- docs/docs-roadmap.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Migracion inicial de schema

**Tipo:** db
**Alcance:** db

**Resumen**
Se creo la migracion inicial con tablas, enums, constraints, triggers y RLS basica. Se ajustaron docs vivos para reflejar el nuevo estado.

**Impacto**

- Habilita iniciar `supabase db reset` cuando se decida.
- Deja pendiente agregar views/RPCs y snapshot/types.
- No cambia runtime hasta aplicar migraciones.

**Archivos**

- supabase/migrations/20260208213000_001_init_schema.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/docs-roadmap.md

**Tests:** No ejecutados (DB no aplicada)
**Commit:** N/A

## 2026-02-08 — Reset DB y snapshot/types

**Tipo:** db
**Alcance:** db

**Resumen**
Se ejecuto `supabase db reset`, se aplico la migracion inicial y se generaron `docs/schema.sql` y `types/supabase.ts`.

**Impacto**

- DB local reproducible con schema inicial.
- Snapshot y types listos para desarrollo.
- Quedan pendientes views/RPCs y verificaciones RLS permit/deny.

**Archivos**

- docs/schema.sql
- types/supabase.ts
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md

**Tests:** supabase db reset OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Fix helpers RLS + verificaciones minimas

**Tipo:** rls
**Alcance:** db

**Resumen**
Se agrego migracion para evitar recursion en helpers RLS y se verifico acceso minimo (permitido/denegado) con usuarios de prueba.

**Impacto**

- RLS estable para evaluaciones locales.
- Snapshot y types regenerados con helpers actualizados.
- Falta verificacion de views principales (aun no existen).

**Archivos**

- supabase/migrations/20260208220000_002_rls_helpers.sql
- docs/schema.sql
- types/supabase.ts
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md

**Tests:** RLS minimo OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Checklist pendientes DB

**Tipo:** docs
**Alcance:** db

**Resumen**
Se agrego checklist explicito de views y RPCs pendientes en el baseline de schema.

**Impacto**

- Mejora trazabilidad de lo aun no implementado.
- No cambia DB ni runtime.

**Archivos**

- docs/docs-schema-model.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Views y RPCs MVP + verificacion DB

**Tipo:** db
**Alcance:** db

**Resumen**
Se agregaron migraciones con views y RPCs del MVP, se reseteo la DB local y se verificaron lecturas basicas por RLS.

**Impacto**

- Contratos de lectura/escritura ahora existen en DB.
- Fase 2 de infra/smoke DB queda completa.
- Snapshot y types actualizados.

**Archivos**

- supabase/migrations/20260208221000_003_views.sql
- supabase/migrations/20260208222000_004_rpcs.sql
- docs/schema.sql
- types/supabase.ts
- docs/docs-schema-model.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md

**Tests:** supabase db reset OK; views basicas OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — QA RPCs MVP (admin)

**Tipo:** tests
**Alcance:** db

**Resumen**
Se ejecutaron llamadas de QA sobre RPCs MVP con usuario admin y datos de prueba. Todas las RPCs clave respondieron sin errores.

**Impacto**

- Valida rutas basicas de escritura y lectura en DB.
- Deja datos de prueba en DB local.

**Archivos**

- docs/schema.sql
- types/supabase.ts

**Tests:** QA RPCs admin OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Auth y routing base

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se implementaron login/logout/no-access, middleware de autenticacion y redirecciones por rol, y paginas placeholder para homes.

**Impacto**

- Habilita flujo basico de autenticacion y guardas por rol.
- Permite avanzar a modulos core con rutas existentes.

**Archivos**

- middleware.ts
- lib/supabase/server.ts
- app/login/page.tsx
- app/logout/page.tsx
- app/no-access/page.tsx
- app/dashboard/page.tsx
- app/superadmin/page.tsx
- app/pos/page.tsx
- app/products/lookup/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/page.tsx
- docs/docs-roadmap.md

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Fix warnings build

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se migro middleware a proxy y se ajusto turbopack.root para eliminar warnings de build.

**Impacto**

- Build limpio sin warnings de middleware ni turbopack root.

**Archivos**

- proxy.ts
- next.config.ts

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Productos/Stock (inicio modulo)

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se inicio el modulo Productos/Stock con pagina `/products`, lectura via `v_products_admin` y formularios base para crear producto y ajustar stock.

**Impacto**

- Ruta `/products` operativa para OA.
- Acciones basicas de producto/stock disponibles.
- Requiere hardening y manejo de errores UI.

**Archivos**

- app/products/page.tsx
- supabase/migrations/20260208230000_005_rpc_upsert_product_nullable.sql
- docs/schema.sql
- types/supabase.ts
- docs/docs-roadmap.md
- docs/docs-data-model.md

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Seed usuarios demo

**Tipo:** tests
**Alcance:** infra

**Resumen**
Se creo script de seed para usuarios demo (superadmin/admin/staff) y se poblaron org, sucursales y permisos de staff.

**Impacto**

- Habilita login rapido para QA UI.
- Datos demo en DB local.

**Archivos**

- scripts/seed-users.js

**Tests:** Script ejecutado OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Doc usuarios demo

**Tipo:** docs
**Alcance:** infra

**Resumen**
Se documentaron credenciales demo locales y se referencio el doc en AGENTS.

**Impacto**

- Facilita QA de UI con usuarios conocidos.
- No cambia runtime ni DB.

**Archivos**

- docs/docs-demo-users.md
- AGENTS.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Supabase client singleton

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se convirtio el cliente de Supabase en singleton en browser para evitar warning de multiples instancias. Se agrego ignore para scripts en eslint.

**Impacto**

- Evita warning de GoTrueClient en login.
- No cambia comportamiento funcional.

**Archivos**

- lib/supabase/client.ts
- eslint.config.mjs

**Tests:** npm run lint OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Login cookies SSR

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se cambio el cliente browser a @supabase/ssr con manejo de cookies para que el middleware detecte sesiones y el redirect funcione.

**Impacto**

- Login ahora persiste cookies compatibles con SSR.
- El redirect post-login funciona correctamente.

**Archivos**

- lib/supabase/client.ts

**Tests:** npm run lint OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Staff home redirect fix

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se agrego RPC security definer para resolver modulos efectivos de Staff y se actualizo el proxy para usarla.

**Impacto**

- Staff ahora resuelve home correctamente segun modulos habilitados.
- Evita bloqueo por RLS en staff_module_access.

**Archivos**

- supabase/migrations/20260208234000_006_rpc_staff_effective_modules.sql
- proxy.ts
- lib/supabase/client.ts
- types/supabase.ts
- docs/schema.sql
- docs/docs-schema-model.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Productos/Stock completo

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se completo el modulo Productos/Stock con edicion de producto, activacion/desactivacion y ajustes de stock desde UI.

**Impacto**

- CRUD basico operativo para OA.
- Listado muestra estado y permite cambios rapidos.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx
- lib/supabase/client.ts
- proxy.ts
- docs/docs-roadmap.md

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-09 — TopBar con logout

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se agrego TopBar con boton de logout y se aplico en paginas principales.

**Impacto**

- Cambio rapido de usuario durante QA.
- Layout consistente en paginas base.

**Archivos**

- app/components/TopBar.tsx
- app/components/PageShell.tsx
- app/dashboard/page.tsx
- app/superadmin/page.tsx
- app/pos/page.tsx
- app/products/lookup/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/products/page.tsx

**Tests:** npm run lint OK; npm run build OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Logout via route handler

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se movio el logout a un route handler para permitir modificar cookies en Next 16.

**Impacto**

- Logout funcional sin errores de cookies.

**Archivos**

- app/logout/route.ts
- app/logout/page.tsx (eliminado)

**Tests:** npm run lint OK; npm run build OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Stock por sucursal en productos

**Tipo:** feature
**Alcance:** db, frontend

**Resumen**
Se actualizo `v_products_admin` para incluir stock por sucursal y se reflejo el desglose en la UI de `/products`.

**Impacto**

- OA ve stock total y detalle por sucursal sin selector.
- Clarifica disponibilidad por local.

**Archivos**

- supabase/migrations/20260209002000_007_view_products_admin_stock_by_branch.sql
- app/products/page.tsx
- docs/docs-app-screens-products.md
- docs/schema.sql
- types/supabase.ts

**Tests:** npm run lint OK; npm run build OK (2026-02-09)
**Commit:** N/A

## 2026-02-04 — Docs vivos de modelo y RLS

**Tipo:** docs
**Alcance:** db

**Resumen**
Se agregaron documentos vivos para el modelo de datos y la matriz RLS, y se actualizó AGENTS para exigir su mantenimiento.

**Impacto**

- Habilita trazabilidad clara de schema y permisos.
- Cambia el flujo: toda modificación de DB/RLS exige actualizar estos docs.
- No cambia el comportamiento del sistema.

## 2026-02-04 — Scripts de snapshot y types

**Tipo:** docs
**Alcance:** db

**Resumen**
Se agregaron scripts en package.json para snapshot de schema y generación de types desde Supabase.

**Impacto**

- Habilita generar `docs/schema.sql` y `types/supabase.ts` de forma reproducible.
- Cambia el flujo: se recomienda actualizar snapshot/types tras cambios de DB.
- No cambia el runtime de la app.

## 2026-02-04 — Brief UX/UI para diseñadora

**Tipo:** docs
**Alcance:** ux

**Resumen**
Se creó un brief detallado para UX/UI con pantallas, roles, reglas y orden recomendado de diseño.

**Impacto**

- Habilita onboarding rápido de la diseñadora.
- Alinea expectativas de pantallas y estados obligatorios.
- No cambia el comportamiento del sistema.

## 2026-02-04 — Guía rápida en docs de pantallas y módulos

**Tipo:** docs
**Alcance:** ux

**Resumen**
Se agregó una sección de guía rápida para diseño en los docs de pantallas y módulos para hacerlos más explícitos y navegables.

**Impacto**

- Mejora la claridad para UX/UI sin cambiar requisitos funcionales.
- Reduce ambigüedad al diseñar estados y acciones.
- No cambia el comportamiento del sistema.

## 2026-02-04 10:15 — Commit estado actual

**Lote:** ops-commit
**Tipo:** infra
**Descripción:** Se consolidó el estado actual del repo (configuración base, UI kit, docs y Supabase) para commit.
**Archivos:** .gitignore, .husky/pre-commit, .prettierrc, AGENTS.md, app/globals.css, components.json, components/ui/_, docs/_, lib/_, package.json, package-lock.json, supabase/_, types/supabase.ts
**Tests:** No ejecutados (no solicitados)
**Commit:** (pendiente)

## 2026-02-09 — Auditoria en MVP (docs)

**Tipo:** docs
**Alcance:** db

**Resumen**
Se incorporo la auditoria de acciones al MVP y se documentaron ruta, contrato de pantalla, modelo de datos y reglas RLS.

**Impacto**

- Habilita el diseño y futura implementacion de un audit log visible para OA/SA.
- Cambia el set de docs vivos (sitemap, contratos, modelo de datos, matriz RLS, roadmap).
- No cambia runtime ni DB (docs-only).

**Archivos**

- docs/docs-scope-mvp.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-09 — Audit log MVP (DB + UI)

**Tipo:** feature
**Alcance:** db, frontend, rls, tests

**Resumen**
Se implemento audit log end-to-end: tabla, RLS, view, RPC de log y instrumentacion de RPCs de escritura; UI en /settings/audit-log con filtros y paginacion.

**Impacto**

- Habilita trazabilidad de acciones importantes para OA/SA.
- Agrega view y RPCs nuevas, y registra eventos en operaciones criticas.
- No cambia flujo de Staff (solo lectura restringida por RLS).

**Archivos**

- supabase/migrations/20260209040000_008_audit_log.sql
- app/settings/audit-log/page.tsx
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npx supabase db reset OK (2026-02-09)
- Seed usuarios demo OK (2026-02-09)
- RLS audit_log: admin permitido / staff denegado OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS MVP (UI + permisos)

**Tipo:** feature
**Alcance:** frontend, db, rls, tests

**Resumen**
Se implemento la pantalla /pos con selector de sucursal, busqueda/escaneo, carrito y cobro. Se endurecio rpc_create_sale para validar modulo pos en Staff.

**Impacto**

- Habilita ventas rápidas para Staff/OA con control de stock.
- Agrega validación de modulo pos a nivel RPC.
- Actualiza snapshot y types desde DB local.

**Archivos**

- app/pos/page.tsx
- app/pos/PosClient.tsx
- supabase/migrations/20260209040000_008_audit_log.sql
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npx supabase db reset OK (2026-02-09)
- Seed usuarios demo OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — TopBar con accesos directos

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se agregaron accesos directos en el TopBar a rutas principales para navegacion rapida.

**Impacto**

- Facilita la navegacion entre modulos MVP existentes.
- No cambia permisos: middleware sigue aplicando redirecciones.

**Archivos**

- app/components/TopBar.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS stock cero + moneda ARS

**Tipo:** feature
**Alcance:** db, frontend, docs, tests

**Resumen**
Se ajusto el catalogo POS para mostrar productos aunque no haya stock, se habilito stock negativo por defecto para evitar bloqueos, y se cambio la moneda a ARS en la UI de POS.

**Impacto**

- Productos aparecen en POS aunque stock sea 0 (branch con stock desincronizado).
- Ventas pueden registrarse aunque el stock sea insuficiente (stock negativo permitido).
- Totales en POS se muestran en pesos argentinos.

**Archivos**

- supabase/migrations/20260209130000_009_pos_stock_zero_and_currency.sql
- app/pos/PosClient.tsx
- scripts/seed-users.js
- docs/docs-app-screens-staff-pos.md
- docs/docs-modules-products-stock.md
- docs/docs-schema-model.md
- docs/docs-app-screens-settings-preferences.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npx supabase db reset OK (2026-02-09)
- Seed usuarios demo OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS cantidad editable sin borrar item

**Tipo:** fix
**Alcance:** frontend, tests

**Resumen**
Se ajusto el carrito para permitir dejar el input de cantidad en blanco sin eliminar el item y se bloqueo el cobro con cantidades 0.

**Impacto**

- Permite editar cantidades sin borrar el item.
- Evita cobros con cantidades invalidas.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS resaltado cantidad invalida

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se agrego resaltado visual y mensaje para items con cantidad 0 en el carrito.

**Impacto**

- Hace evidente el error antes de cobrar.
- Reduce intentos fallidos por cantidades invalidas.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS deshabilita cobro con qty invalida

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se deshabilito el boton Cobrar cuando el carrito tiene cantidades invalidas o esta vacio.

**Impacto**

- Reduce errores y evita intentos de cobro invalidos.
- Refuerza la validacion previa en UI.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS tooltip Cobrar deshabilitado

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se agrego tooltip y mensaje de ayuda cuando el boton Cobrar esta deshabilitado.

**Impacto**

- Clarifica por que no se puede cobrar.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Label UOM mas claro

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se renombro el label UOM a "Unidad de medida" en formularios de productos.

**Impacto**

- Mejora comprension del campo sin cambiar comportamiento.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Unidad de venta en español

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se tradujeron las opciones visibles de unidad de venta a español manteniendo los valores internos.

**Impacto**

- Mejora la comprensión en UI sin cambiar lógica.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS unidad de venta en español

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se tradujo la unidad de venta mostrada en el listado de productos del POS.

**Impacto**

- UI mas clara en español.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Idioma base español

**Tipo:** docs
**Alcance:** ux

**Resumen**
Se definio el español como idioma base del producto en el brief de UX/UI.

**Impacto**

- Establece la guia de idioma para futuras pantallas y textos.

**Archivos**

- docs/docs-ux-ui-brief.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-09 — Proveedores y pedidos (MVP)

**Tipo:** feature
**Alcance:** frontend, db, docs, tests

**Resumen**
Se implementaron las pantallas de proveedores y pedidos (lista y detalle), con flujos basicos de CRUD y estados de pedidos. Se agrego products_count a la vista de proveedores.

**Impacto**

- Habilita gestion de proveedores y asociaciones de productos.
- Habilita flujo de pedidos draft → sent → received → reconciled.
- Mejora visibilidad con products_count en listado de proveedores.

**Archivos**

- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/suppliers/SupplierActions.tsx
- app/orders/page.tsx
- app/orders/[orderId]/page.tsx
- supabase/migrations/20260209150000_010_view_suppliers_products_count.sql
- app/components/TopBar.tsx
- docs/docs-roadmap.md
- docs/docs-data-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npx supabase db reset OK (2026-02-09)
- Seed usuarios demo OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Context summary

**Tipo:** docs
**Alcance:** decision

**Resumen**
Se creo un resumen de contexto vivo y se actualizo AGENTS para exigir su lectura cuando aplique.

**Impacto**

- Facilita retomar contexto en conversaciones nuevas.
- Cambia el flujo: contexto resumen pasa a ser lectura requerida.
- No cambia runtime ni DB.

**Archivos**

- docs/context-summary.md
- AGENTS.md
- docs/prompts.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-09 — Proveedores primario/secundario y safety stock

**Tipo:** feature
**Alcance:** frontend, db, docs, tests

**Resumen**
Se agrego soporte a proveedores primario/secundario por producto, schedule de proveedores, safety stock por sucursal y sugeridos simples. Se actualizaron pantallas de productos, proveedores y detalle, junto con migraciones y docs.

**Impacto**

- Permite asignar proveedor primario/secundario y ajustar stock minimo por sucursal.
- Permite definir frecuencia y dias de pedido/recepcion por proveedor.
- Expone sugeridos de compra basados en ventas 30 dias + safety stock.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx
- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/suppliers/SupplierActions.tsx
- app/orders/page.tsx
- supabase/migrations/20260209173000_012_safety_stock_rpc.sql
- supabase/migrations/20260209174000_013_rpc_upsert_supplier_schedule.sql
- supabase/migrations/20260209175000_014_view_suppliers_schedule.sql
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/docs-modules-products-stock.md
- docs/docs-modules-suppliers.md
- docs/docs-modules-supplier-orders.md
- docs/docs-app-screens-products.md
- docs/docs-app-screens-suppliers.md
- docs/docs-app-screens-supplier-detail.md
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-order-detail.md
- docs/docs-scope-post-mvp.md
- docs/context-summary.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md

**Tests:**

- npx supabase db reset OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Politica de commit y push

**Tipo:** decision
**Alcance:** infra

**Resumen**
Se actualizo AGENTS para exigir commit + push al cierre de lote cuando el usuario confirme.

**Impacto**

- Estandariza el cierre de lote con trazabilidad.
- No cambia runtime ni DB.

**Archivos**

- AGENTS.md
- docs/prompts.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-09 — Renombre labels proveedor

**Tipo:** ux
**Alcance:** frontend, docs

**Resumen**
Se renombraron labels de SKU/Nombre del proveedor para clarificar que son datos del producto en el proveedor.

**Impacto**

- Mejora claridad en /suppliers/[supplierId].
- No cambia datos ni contratos.

**Archivos**

- app/suppliers/[supplierId]/page.tsx
- docs/docs-app-screens-supplier-detail.md
- docs/prompts.md

**Tests:** No ejecutados (UI microcambio)
**Commit:** N/A

## 2026-02-09 — Shelf life y FEFO

**Tipo:** feature
**Alcance:** db, frontend, docs, tests

**Resumen**
Se agrego vencimiento aproximado por producto (dias) y se automatizo la creacion/consumo de batches al recibir pedidos y vender (FEFO best-effort). Se filtro expirations por cantidad > 0.

**Impacto**

- Permite alertas de vencimiento basadas en días aproximados.
- Evita alertas falsas al consumir batches en ventas.
- Mantiene ventas sin bloqueo si faltan batches.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx
- app/suppliers/[supplierId]/page.tsx
- supabase/migrations/20260209180000_015_products_shelf_life_days.sql
- supabase/migrations/20260209181000_016_rpc_upsert_product_shelf_life.sql
- supabase/migrations/20260209182000_017_view_products_admin_shelf_life.sql
- supabase/migrations/20260209183000_018_expirations_due_quantity_filter.sql
- supabase/migrations/20260209184000_019_receive_order_create_batches.sql
- supabase/migrations/20260209185000_020_create_sale_consume_batches.sql
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-modules-expirations.md
- docs/docs-modules-products-stock.md
- docs/docs-modules-supplier-orders.md
- docs/docs-app-screens-products.md
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-supplier-detail.md
- docs/context-summary.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md

**Tests:**

- npx supabase db reset OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Reset con seed automatico

**Tipo:** infra
**Alcance:** scripts, docs

**Resumen**
Se agrego el script `npm run db:reset` que ejecuta reset + seed de usuarios demo y se hizo que el seed cargue `.env.local` automaticamente.

**Impacto**

- Evita perder usuarios demo tras `db reset`.
- Reduce pasos manuales para QA.

**Archivos**

- scripts/seed-users.js
- package.json
- AGENTS.md
- docs/docs-demo-users.md
- docs/prompts.md

**Tests:** No ejecutados (scripts/docs)
**Commit:** N/A

## 2026-02-09 — Stock minimo global en alta

**Tipo:** ux
**Alcance:** frontend, docs

**Resumen**
Se agrego opcion para aplicar stock minimo a todas las sucursales en el alta de productos y se aclaro el campo con tooltip. Se incluyo el campo en alta desde proveedor.

**Impacto**

- Evita confusion al setear stock minimo en una sola sucursal.
- Mejora claridad del concepto de stock minimo.

**Archivos**

- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx
- docs/docs-app-screens-products.md
- docs/docs-app-screens-supplier-detail.md
- docs/prompts.md

**Tests:** No ejecutados (UI microcambio)
**Commit:** N/A

## 2026-02-09 — Simplificar stock minimo

**Tipo:** ux
**Alcance:** frontend, docs

**Resumen**
Se removio el selector de sucursal y el checkbox; el stock minimo ahora se aplica a todas las sucursales por defecto, con tooltip aclaratorio.

**Impacto**

- Simplifica alta de producto.
- Unifica stock minimo para todas las sucursales.

**Archivos**

- app/products/page.tsx
- docs/docs-app-screens-products.md
- docs/prompts.md

**Tests:** No ejecutados (UI microcambio)
**Commit:** N/A

## 2026-02-09 — Remover stock minimo por sucursal

**Tipo:** ux
**Alcance:** frontend, docs

**Resumen**
Se elimino la seccion de stock minimo por sucursal en /products para simplificar el flujo global.

**Impacto**

- Evita duplicidad/confusion en el seteo de stock minimo.
- Stock minimo se define solo en alta/edicion de producto.

**Archivos**

- app/products/page.tsx
- docs/docs-app-screens-products.md
- docs/prompts.md

**Tests:** No ejecutados (UI microcambio)
**Commit:** N/A

## 2026-02-13 — Settings MVP completo (rutas faltantes)

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se implementaron las rutas faltantes de Settings del MVP: hub `/settings`, y subpantallas `/settings/users`, `/settings/branches`, `/settings/staff-permissions`, `/settings/preferences`, reutilizando contratos de datos existentes (views/RPC/tablas).

**Impacto**

- Cierra brecha funcional de Fase 5 en frontend.
- Habilita gestion operativa de usuarios, sucursales, permisos staff y preferencias desde UI.
- Agrega punto de entrada de Configuracion en TopBar.

**Archivos**

- app/settings/page.tsx
- app/settings/users/page.tsx
- app/settings/branches/page.tsx
- app/settings/staff-permissions/page.tsx
- app/settings/preferences/page.tsx
- app/components/TopBar.tsx
- docs/prompts.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)
- npx playwright test: 1 passed / 1 failed (2026-02-13)
  - Falla en `e2e/smoke-pos.spec.ts` por selector ambiguo (`getByText('Pedidos especiales')`) en strict mode.

**Commit:** N/A

## 2026-02-13 — Smoke Playwright estabilizado

**Tipo:** tests
**Alcance:** e2e, docs

**Resumen**
Se corrigio el selector ambiguo en la suite smoke de Playwright para `/clients`, cambiando la asercion a un heading especifico.

**Impacto**

- Suite smoke vuelve a verde y recupera señal de regresion para flujo POS + clientes.

**Archivos**

- e2e/smoke-pos.spec.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npx playwright test OK (2 passed, 2026-02-13)
- npm run lint OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Credenciales administradas por admin (settings/users)

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se ajustó `/settings/users` para que el admin gestione credenciales: creación de usuario con contraseña inicial y reset de contraseña por admin, sin exposición de contraseña actual.

**Impacto**

- Staff no tiene flujo para cambiar contraseña en MVP; debe solicitarlo al admin.
- OA ve un apartado de credenciales por usuario (email + reset de contraseña).
- Se registra evento de auditoría `user_password_reset_by_admin`.

**Archivos**

- app/settings/users/page.tsx
- lib/supabase/admin.ts
- docs/docs-app-screens-settings-users.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Checklist de sucursales en settings/users

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se reemplazó el selector múltiple de sucursales por un checklist con checkboxes en alta y edición de usuarios.

**Impacto**

- Más claridad operativa: check marcado implica acceso a esa sucursal.
- Menos ambigüedad en asignación de sucursales para Staff.

**Archivos**

- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Settings/users compacto con edición desplegable

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se reorganizó `/settings/users` para mostrar una lista compacta por usuario (nombre, email, rol y sucursales) y mover los formularios completos de edición/credenciales a un panel desplegable por fila.

**Impacto**

- Menor ruido visual en operación diaria.
- Flujo de edición más explícito: primero lectura, luego edición bajo demanda.
- “Crear usuario” quedó en desplegable para priorizar la vista de usuarios existentes.

**Archivos**

- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Superadmin excluido de settings/users

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se bloqueó completamente la gestión de superadmin en `/settings/users`: no se lista en UI y backend rechaza intentos de creación/edición/reset para ese rol.

**Impacto**

- OA solo administra usuarios operativos de org (`org_admin`, `staff`).
- Se evita modificar cuentas de dueño/soporte desde settings de organización.

**Archivos**

- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Sucursales condicionales por rol en settings/users

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se ocultó el checklist de sucursales cuando el rol seleccionado es Org Admin y se mantiene visible solo para Staff (alta y edición).

**Impacto**

- Reduce confusión: OA no requiere asignación manual de sucursales.
- Refuerza el modelo de acceso por organización para admin.

**Archivos**

- app/settings/users/RoleBranchChecklist.tsx
- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-16 — Fundacion DB para superadmin global multi-org

**Tipo:** schema
**Alcance:** db, docs, tests

**Resumen**
Se implemento la base de datos para operar superadmin global fuera de `org_users`, con soporte de listado de organizaciones, alta de org/sucursal y contexto de org activa para impersonacion controlada.

**Impacto**

- Nuevo scope global de plataforma: `platform_admins` + helper `is_platform_admin()`.
- Nuevo contexto de org activa por usuario: `user_active_orgs` + RPCs de set/get.
- Nuevos contratos de lectura SA: `v_superadmin_orgs`, `v_superadmin_org_detail`.
- Nuevos contratos de escritura SA: `rpc_bootstrap_platform_admin`, `rpc_superadmin_create_org`, `rpc_superadmin_upsert_branch`, `rpc_superadmin_set_active_org`.
- `is_org_admin_or_superadmin` ahora contempla SA de plataforma.

**Archivos**

- supabase/migrations/20260216115100_031_superadmin_platform_foundation.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/docs-app-screens-superadmin.md
- docs/docs-schema-model.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-16)
- Verificacion objetos creada via psql local: tablas/views/RPCs nuevas OK (2026-02-16)
- Verificacion RLS minima via psql local: SA permitido (`orgs`), Staff denegado (`platform_admins`) (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Superadmin UI operativo multi-org

**Tipo:** ui
**Alcance:** frontend, auth/proxy, docs, tests

**Resumen**
Se implemento `/superadmin` con flujo operativo MVP: listado y busqueda de organizaciones, creacion de org con sucursal inicial, alta de sucursal por org y seleccion de org activa (impersonation context). Tambien se restringio visibilidad/acceso para que la opcion Superadmin solo aparezca en usuarios SA.

**Impacto**

- `/superadmin` deja de ser placeholder.
- `proxy.ts` reconoce SA de plataforma (`is_platform_admin`) y aplica redirects/guardas consistentes.
- Topbar oculta el link `Superadmin` para no-SA.
- Home (`/`) redirige correctamente a `/superadmin` para SA.

**Archivos**

- app/superadmin/page.tsx
- app/components/TopBar.tsx
- app/page.tsx
- proxy.ts
- docs/docs-app-screens-superadmin.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npx playwright test -g "smoke" FAIL inicial por datos demo faltantes (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-17 21:03 -03 — Orders: monto estimado por pedido en listado

**Tipo:** ui
**Lote:** orders-list-estimated-supplier-amount
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó en `/orders` la visualización de `Monto estimado` por pedido. El cálculo se realiza sumando los ítems del pedido (`ordered_qty * unit_cost`) y usando `products.unit_price` como fallback cuando `unit_cost` no está cargado. Además, al crear pedidos desde sugeridos se envía `unit_cost` estimado por ítem para mejorar la calidad de esa métrica.

**Archivos**

- app/orders/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- docs/docs-app-screens-orders.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-17)
- npm run build OK (2026-02-17)

**Commit:** N/A

## 2026-02-16 15:45 -03 — Totales automáticos en formulario de conteo de caja

**Tipo:** ui
**Lote:** cashbox-live-totals-drawer-reserve
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó cálculo en vivo en la pantalla `/cashbox` para que al ingresar cantidades por denominación el usuario vea inmediatamente:

- monto en caja
- monto en reserva
- total contado

Aplicado tanto en apertura como en cierre.

**Archivos**

- app/cashbox/CashCountPairFields.tsx
- app/cashbox/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 15:21 -03 — Caja por billetes en caja/reserva + denominaciones configurables

**Tipo:** schema
**Lote:** cashbox-drawer-reserve-denomination-config
**Alcance:** db, ui, docs, tests

**Resumen**
Se evolucionó el módulo `/cashbox` para que apertura y cierre se hagan por conteo de billetes/monedas por denominación en dos ámbitos: `caja` y `reserva`. El total contado se calcula en backend desde las líneas de conteo. Además, se agregó configuración de denominaciones por organización en preferencias.

**Impacto**

- Apertura:
  - ya no recibe monto manual; ahora recibe `opening_drawer_count_lines` + `opening_reserve_count_lines`.
  - persiste `opening_cash_amount` (caja) y `opening_reserve_amount` (reserva).
- Cierre:
  - ya no recibe monto contado manual; calcula total como `closing_drawer + closing_reserve`.
  - persiste `closing_drawer_amount` y `closing_reserve_amount`.
- Configuración:
  - `org_preferences.cash_denominations` define denominaciones activas por org.
  - defaults ARS iniciales: `100, 200, 500, 1000, 2000, 10000, 20000`.
- Auditoría:
  - eventos de apertura/cierre incluyen líneas de conteo de caja y reserva.
  - se mantiene actor (`actor_user_id`) y campos operativos de cierre (`closed_controlled_by_name`, `close_confirmed`).

**Archivos**

- supabase/migrations/20260216194000_038_cashbox_drawer_reserve_denom_config.sql
- app/cashbox/page.tsx
- app/settings/preferences/page.tsx
- docs/docs-app-screens-cashbox.md
- docs/docs-app-screens-settings-preferences.md
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-modules-cashbox.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-16)
- npm run db:schema:snapshot OK (2026-02-16)
- npm run types:gen OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Bootstrap de org con OA inicial + dashboard SA por org activa

**Tipo:** ui
**Alcance:** frontend, auth/proxy, docs, tests

**Resumen**
Se completo el flujo de alta de organización desde `/superadmin` para incluir admin inicial (email + contraseña) en el mismo formulario. Además, se habilitó el acceso de superadmin al `/dashboard` usando la org activa.

**Impacto**

- Crea org + sucursal inicial + OA inicial en una sola acción.
- Evita orgs nuevas sin usuario administrador operativo.
- SA puede cambiar org activa y abrir `/dashboard` para revisar cada cliente.
- `proxy.ts` permite a SA navegar `/superadmin` y `/dashboard`.

**Archivos**

- app/superadmin/page.tsx
- app/dashboard/page.tsx
- proxy.ts
- docs/docs-app-screens-superadmin.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Admin inicial para org existente + SA en módulos por org activa

**Tipo:** ui
**Alcance:** frontend, auth/proxy, docs, tests

**Resumen**
Se habilitó en `/superadmin` la creación de admin inicial para organizaciones ya existentes (sin OA). Además, se extendió el contexto de org activa para superadmin en módulos core del MVP, evitando bloqueo por validaciones directas de `org_users`.

**Impacto**

- Flujo de recuperación para orgs legacy sin admin inicial.
- Operación SA multi-org más usable: activar org y navegar dashboard/módulos.
- Base reutilizable de contexto con helper `lib/auth/org-session.ts`.

**Archivos**

- app/superadmin/page.tsx
- lib/auth/org-session.ts
- app/pos/page.tsx
- app/products/page.tsx
- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/orders/page.tsx
- app/orders/[orderId]/page.tsx
- app/orders/calendar/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/settings/page.tsx
- app/settings/branches/page.tsx
- app/settings/preferences/page.tsx
- app/settings/staff-permissions/page.tsx
- app/settings/users/page.tsx
- app/settings/audit-log/page.tsx
- proxy.ts
- docs/docs-app-screens-superadmin.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Hardening DB: alta org SA requiere owner y membresía atómica

**Tipo:** schema
**Alcance:** db, docs, tests

**Resumen**
Se reemplazó `rpc_superadmin_create_org` para exigir `p_owner_user_id` y garantizar que la org se cree de forma atómica con su admin inicial (sin orgs huérfanas).

**Impacto**

- Si falta owner, la RPC falla antes de crear registros.
- Si el owner no existe en `auth.users`, la RPC falla.
- Org + sucursal inicial + `org_preferences` + `org_users` + `branch_memberships` quedan en una sola transacción.

**Archivos**

- supabase/migrations/20260216124000_032_superadmin_create_org_owner_required.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-16)
- npm run format:check OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 14:13 -03 — Descubrimiento y propuesta de módulo Caja

**Tipo:** decision  
**Lote:** cashbox-module-discovery-proposal  
**Alcance:** docs, arquitectura

**Resumen**
Se realizó lectura repo-aware de documentación viva y contratos actuales para proponer el diseño de un nuevo módulo de caja orientado a cierre por turno o por día, con conteo físico, conciliación contra cobros POS y registro de gastos operativos.

**Archivos consultados**

- AGENTS.md
- docs/docs-scope-mvp.md
- docs/docs-scope-post-mvp.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-staff-permissions.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- app/pos/page.tsx
- app/settings/staff-permissions/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Resultado**

- Se confirmó que “cierres de caja avanzados” está en Post-MVP.
- Se detectó base sólida para caja operativa usando `sales`, `sale_payments`, `audit_log`, `org_preferences` y permisos por `staff_module_access`.
- Se definió recomendar una implementación en dos etapas: MVP de cierre simple (operable ahora) y hardening/analítica para etapa posterior.

**Tests:** No aplica (análisis y propuesta, sin cambios ejecutables)  
**Commit:** N/A

## 2026-02-16 14:28 -03 — Módulo Caja por sucursal (MVP) + auditoría de actor/movimientos

**Tipo:** schema  
**Lote:** cashbox-module-mvp-branch-audit  
**Alcance:** db, ui, docs, tests

**Resumen**
Se implementó el módulo `/cashbox` con operación por sucursal: apertura de caja por turno/día, registro de movimientos manuales (gasto/ingreso), cierre con conteo físico y cálculo de diferencia. Se agregó auditoría explícita para apertura, movimientos y cierre, incluyendo actor y metadata operativa.

**Impacto**

- Caja queda alineada a `branch_id` obligatorio y una sesión abierta por sucursal.
- Conciliación automática del esperado con:
  - apertura
  - cobros en efectivo desde `sale_payments`
  - ingresos y gastos manuales
- Auditoría visible en `/settings/audit-log` con acciones:
  - `cash_session_opened`
  - `cash_movement_added`
  - `cash_session_closed`
- Nuevo módulo habilitable para Staff: `cashbox` (en settings/permisos, proxy y redirect de home).

**Archivos**

- supabase/migrations/20260216171000_036_cashbox_branch_sessions.sql
- app/cashbox/page.tsx
- app/page.tsx
- app/clients/page.tsx
- app/pos/page.tsx
- app/expirations/page.tsx
- app/components/TopBar.tsx
- app/settings/staff-permissions/page.tsx
- app/settings/audit-log/page.tsx
- proxy.ts
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/docs-app-screens-settings-staff-permissions.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/docs-scope-mvp.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-16)
- npm run db:schema:snapshot OK (2026-02-16)
- npm run types:gen OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-18 14:52 -03 — Seguimiento de último pago en `/payments`

**Tipo:** ui  
**Lote:** payments-latest-payment-badge  
**Descripción:** Se agregó en cada card de `/payments` una tarjeta de seguimiento con el último pago registrado (fecha/hora, monto y nota), incluyendo casos de pago parcial para facilitar trazabilidad operativa. Se mantuvo el contrato principal de pantalla y se añadió lectura auxiliar desde `supplier_payments` para obtener el movimiento más reciente por `payable_id`.

**Archivos afectados:**

- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:55 -03 — Botón `Restante` en formulario de registrar pago

**Tipo:** ui
**Lote:** payments-register-payment-fill-remaining
**Descripción:** Se agregó un botón `Restante` junto al input de monto en la sección “Registrar pago” de `/payments`. Al hacer click, completa automáticamente el monto pendiente (`outstanding_amount`) en el campo `amount` para agilizar pagos totales desde parciales.

**Archivos afectados:**

- app/payments/PaymentAmountField.tsx
- app/payments/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:04 -03 — Registrar pago: parcial con total y aceptación de monto real mayor

**Tipo:** ui
**Lote:** payments-partial-total-and-real-amount
**Descripción:** Se ajustó el flujo de `/payments` para registrar pagos sin bloquear montos mayores al saldo estimado cuando representan el monto real pagado. Se agregó check `Es pago parcial` con campo obligatorio de monto total y cálculo de restante proyectado. En backend de la acción server-side se ajusta `invoice_amount` antes de registrar el pago cuando corresponde (parcial declarado o monto real superior al saldo), manteniendo consistencia de estado y saldo.

**Archivos afectados:**

- app/payments/PaymentAmountField.tsx
- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:07 -03 — Fix de ambigüedad en llamada RPC de actualización de payable

**Tipo:** ui
**Lote:** payments-rpc-overload-ambiguity-fix
**Descripción:** Se corrigió la llamada a `rpc_update_supplier_payable` para enviar siempre `p_invoice_reference` (incluyendo `null` cuando no hay valor), evitando que PostgREST elija de forma ambigua entre firmas sobrecargadas durante el flujo de pago parcial.

**Archivos afectados:**

- app/payments/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:09 -03 — Hardening DB: eliminación de overload legacy en `rpc_update_supplier_payable`

**Tipo:** schema
**Lote:** payments-drop-legacy-rpc-overload
**Descripción:** Se agregó migración para eliminar la firma antigua de `rpc_update_supplier_payable` (sin `p_invoice_reference`) que generaba resolución ambigua en PostgREST. Se mantuvo únicamente la firma canónica con `p_invoice_reference`.

**Archivos afectados:**

- supabase/migrations/20260218151000_043_drop_legacy_rpc_update_supplier_payable_overload.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/docs-modules-supplier-payments.md
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-18)
- Verificación SQL `pg_proc` OK: solo existe `rpc_update_supplier_payable(uuid,uuid,numeric,date,text,text,text,payment_method)` (2026-02-18)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:13 -03 — Hardening de error handling en `registerPayment` (Server Action)

**Tipo:** ui
**Lote:** payments-server-action-unexpected-response-hardening
**Descripción:** Se encapsuló la lógica de `registerPayment` en manejo explícito de excepciones para convertir fallos inesperados en `redirect` con banner de error en `/payments` (en vez de runtime genérico “An unexpected response was received from the server”). Se preserva el comportamiento de redirects válidos de Next.

**Archivos afectados:**

- app/payments/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:28 -03 — `/orders/[orderId]`: pago efectivo parcial + formulario de factura/remito

**Tipo:** ui
**Lote:** orders-detail-partial-cash-and-invoice-entrypoint
**Descripción:** Se amplió el bloque de recepción/control en `/orders/[orderId]` para soportar pago en efectivo parcial (check parcial + total declarado + restante proyectado) y se incorporó un segundo entry point de factura/remito en la misma pantalla (número, monto, vencimiento, método, foto y nota) usando `rpc_update_supplier_payable`.

**Archivos afectados:**

- app/orders/ReceiveActionsRow.tsx
- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:31 -03 — Ajuste de copy en campo de fecha de factura/remito

**Tipo:** ui
**Lote:** invoice-date-label-rename-entrypoints
**Descripción:** Se renombró el label del input de fecha (`due_on`) de “Vence el” a “Fecha indicada del remito/factura” en los dos entry points de carga de factura/remito (`/payments` y `/orders/[orderId]`).

**Archivos afectados:**

- app/payments/page.tsx
- app/orders/[orderId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:37 -03 — Preservar formulario de recepción/control y highlight de “Controlado por”

**Tipo:** ui
**Lote:** orders-detail-preserve-receive-form-on-missing-controller
**Descripción:** Se ajustó `/orders/[orderId]` para que, al faltar “Controlado por (nombre)”, no se pierdan los datos ya cargados en el formulario (fecha/hora, pago efectivo, parcial, montos) y se resalte en rojo el campo faltante con mensaje inline específico además del banner superior.

**Archivos afectados:**

- app/orders/[orderId]/page.tsx
- app/orders/ReceiveActionsRow.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-19 10:03 -03 — Dashboard operativo hoy/semana para compras y pagos

**Tipo:** ui
**Lote:** dashboard-ops-today-week-orders-payments
**Descripción:** Se agregó en `/dashboard` una sección operativa con selector de período (`today`/`week`) que informa: pedidos a realizar (según `order_day`), pedidos a recibir (según `expected_receive_on`) y pagos a realizar (según `due_on`) desglosados por método efectivo/transferencia. Se extendió el filtro cliente para conservar sucursal + período en URL.

**Archivos afectados:**

- app/dashboard/page.tsx
- app/dashboard/DashboardFiltersClient.tsx
- docs/docs-app-screens-admin-dashboard.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-19)
- npm run build OK (2026-02-19)

**Commit:** N/A

## 2026-02-19 10:06 -03 — Dashboard operativo: pagos vencidos visibles

**Tipo:** ui
**Lote:** dashboard-ops-include-overdue-payments
**Descripción:** Se extendió el bloque de pagos de la sección operativa del dashboard para incluir cuentas vencidas (`due_on < hoy`) no pagadas, mostrando cantidad y monto total, con desglose por método efectivo/transferencia.

**Archivos afectados:**

- app/dashboard/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-19)
- npm run build OK (2026-02-19)

**Commit:** N/A

## 2026-02-20 09:03 -03 — Cashbox: inputs numéricos permiten vacío temporal al editar

**Tipo:** ui
**Lote:** cashbox-number-input-allow-empty-editing
**Descripción:** Se corrigió `CashCountPairFields` usado en `/cashbox` (apertura/cierre) para que los inputs de cantidad por denominación no fuercen `0` en cada `onChange`. Ahora aceptan estado vacío temporal (`''`) para facilitar edición; los totales siguen calculando vacío como `0` y el backend sigue recibiendo cantidades válidas.

**Archivos afectados:**

- app/cashbox/CashCountPairFields.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)
- npm run db:reset OK (2026-02-20)
- npm run db:rls:smoke FAIL (2026-02-20, baseline preexistente: `staff puede leer products de su org`)
- Verificación RLS puntual `pos_payment_devices` OK (2026-02-20):
  - allow: `authenticated + staff@demo.com` -> `count=4`
  - deny: `authenticated + user fuera de org` -> `count=0`

**Commit:** N/A

## 2026-02-20 09:07 -03 — Auditoría global de inputs numéricos (forzado de `0`)

**Tipo:** decision
**Lote:** global-number-input-allow-empty-audit
**Descripción:** Se realizó barrido repo-wide de todos los `input[type=number]` para detectar campos controlados que repongan `0` al editar. Resultado: no se encontraron más casos con forzado de `0` en `onChange`; el único caso real estaba en `app/cashbox/CashCountPairFields.tsx` y quedó corregido en el lote previo.

**Archivos afectados:**

- docs/prompts.md
- docs/activity-log.md

**Tests:**

- N/A (sin cambios de runtime adicionales)

**Commit:** N/A

## 2026-02-20 09:26 -03 — Caja/POS: tarjeta unificada, mercadopago y trazabilidad por dispositivo

**Tipo:** ui
**Lote:** cashbox-pos-card-mercadopago-devices
**Descripción:** Se implementó la iteración operativa de cobros y cierre de caja: (1) nuevo esquema para dispositivos de cobro por sucursal (`pos_payment_devices`) y vínculo en `sale_payments.payment_device_id`; (2) POS con métodos visibles `cash`, `card` (débito/crédito unificado) y `mercadopago`, exigiendo dispositivo para `card/mercadopago` tanto en pago simple como dividido; (3) `rpc_register_supplier_payment` ahora registra automáticamente egreso `supplier_payment_cash` en `cash_session_movements` cuando el pago de proveedor es en efectivo y existe sesión de caja abierta; (4) `/cashbox` incorpora resumen de cobros no-efectivo (`card`, `mercadopago`) y muestra la categoría amigable del egreso automático.

**Archivos afectados:**

- supabase/migrations/20260220093000_044_pos_devices_card_mercadopago_cashbox_supplier_cash.sql
- app/pos/PosClient.tsx
- app/pos/page.tsx
- app/cashbox/page.tsx
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/docs-modules-supplier-payments.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 09:45 -03 — POS: método/dispositivo con botones visibles + QR/Posnet MP

**Tipo:** ui
**Lote:** pos-checkout-buttons-ux
**Descripción:** En `/pos` se reemplazaron los selects de método de pago y dispositivo por botones visibles para acelerar el cobro táctil. Se agregó selector visible de canal `QR`/`Posnet MP` cuando el método es `mercadopago`, tanto en pago simple como en pago dividido, filtrando dispositivos por canal seleccionado. Se mantuvo la validación existente de dispositivo obligatorio para `card` y `mercadopago`.

**Archivos afectados:**

- app/pos/PosClient.tsx
- docs/docs-app-screens-staff-pos.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 09:50 -03 — POS: QR habilitado sin selección manual + canal alias MP

**Tipo:** ui
**Lote:** pos-mercadopago-qr-alias-flow
**Descripción:** Se ajustó `/pos` para que MercadoPago no bloquee cobro en canal `QR`: ya no exige seleccionar dispositivo manualmente en UI para `QR` y se agregó el canal `Transferencia a alias MP`. `Posnet MP` sigue requiriendo dispositivo explícito. Para compatibilidad con validación backend actual, en QR/alias se resuelve automáticamente un dispositivo MercadoPago activo de la sucursal.

**Archivos afectados:**

- app/pos/PosClient.tsx
- docs/docs-app-screens-staff-pos.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 10:07 -03 — POS: Posnet MP auto con 1 dispositivo + gestión en Settings/Branches

**Tipo:** ui
**Lote:** pos-mp-posnet-devices-config
**Descripción:** Se ajustó `/pos` para que en canal `Posnet MP` no bloquee cuando hay un único dispositivo MercadoPago compatible: se resuelve automáticamente. Si hay 2 o más dispositivos compatibles, la UI exige selección explícita (ej. `Posnet MP 1`, `Posnet MP 2`). Además, se incorporó gestión de dispositivos de cobro por sucursal en `/settings/branches` (alta, edición de nombre/proveedor y activación), permitiendo configurar escenarios futuros sin tocar código.

**Archivos afectados:**

- app/pos/PosClient.tsx
- app/settings/branches/page.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-branches.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 10:14 -03 — Convención de nombres de dispositivos en Settings/POS

**Tipo:** docs
**Lote:** pos-device-naming-convention
**Descripción:** Se incorporó convención operativa de naming para dispositivos de cobro (ej. `MP QR`, `MP Posnet 1`, `MP Posnet 2`, `MP Alias`, `Posnet principal`) visible en `/settings/branches` y documentada en contratos de pantalla para evitar ambigüedad al operar y conciliar cobros.

**Archivos afectados:**

- app/settings/branches/page.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-branches.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 10:17 -03 — Sugerencias automáticas de nombres en dispositivos (validación suave)

**Tipo:** ui
**Lote:** pos-device-naming-soft-validation
**Descripción:** Se agregó validación suave en `/settings/branches` para `device_name` mediante sugerencias automáticas (`datalist`) con nombres estándar (`MP QR`, `MP Posnet 1`, `MP Posnet 2`, `MP Alias`, `Posnet principal`) en alta y edición, manteniendo guardado no bloqueante.

**Archivos afectados:**

- app/settings/branches/page.tsx
- docs/docs-app-screens-settings-branches.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A
