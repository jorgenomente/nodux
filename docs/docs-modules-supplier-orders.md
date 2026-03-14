# Módulo — Pedidos a proveedor

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Objetivo

Facilitar y ordenar compras a proveedores:

- armar pedido editable
- enviarlo (estado)
- recibir mercadería
- conciliar pedido vs recibido
- ingresar stock automáticamente
- mantener historial y trazabilidad
- sugerir cantidades basadas en ventas recientes + safety stock (MVP simple)

---

## Roles

- Org Admin (OA): acceso completo
- Staff (ST): opcional (MVP recomendado: NO, o solo lectura si se habilita)

---

## Entidades principales

### supplier_orders

Pedido a un proveedor.

Campos clave (conceptual):

- id (uuid)
- org_id
- branch_id
- supplier_id
- status: `draft` | `sent` | `received` | `reconciled`
- notes (text, optional)
- created_by (user_id)
- created_at
- updated_at
- sent_at (nullable)
- received_at (nullable)
- reconciled_at (nullable)

### supplier_order_items

Ítems del pedido.

Campos clave (conceptual):

- id
- org_id
- order_id
- product_id
- ordered_qty (decimal)
- received_qty (decimal, default 0)
- unit_cost (decimal, optional MVP)
- created_at

Constraints:

- unique (order_id, product_id) (recomendado)

> Nota MVP: unit_cost puede omitirse y agregarse Post-MVP.
> Si se incluye, habilita reportes de costo/margen luego.

---

## Estados y flujo (MVP)

### `draft`

- editable (items, cantidades, notas)
- no impacta stock
- puede marcarse como archivado para salir del listado operativo principal sin cancelar el pedido

### `sent`

- representa “pedido enviado”
- todavía no impacta stock
- opcional: export/print (Post-MVP)
- admite `expected_receive_on` editable para fecha estimada de recepcion

### `received`

- mercadería recibida
- se registra `received_qty` por item (puede diferir de ordered)
- al marcar received:
  - se ingresan movimientos `purchase` (y por ende stock) en la sucursal
  - (opcional) se crean batches de vencimiento si se capturan fechas (ver módulo vencimientos)

### `reconciled`

- “cierre administrativo”
- confirma que diferencias fueron revisadas
- pedido queda bloqueado (no editable)

---

## Reglas de negocio (invariantes)

### R1) Pedido es por sucursal

Siempre `branch_id` (recepción e ingreso de stock ocurren en esa sucursal).

### R2) Edición permitida por estado

- `draft`: editar todo
- `sent`: permitir solo notas (opcional) o nada
- `received`: permitir ajustar received_qty solo antes de reconciliar (opcional)
- `reconciled`: no editable
- archivado:
  - solo aplica a `draft`
  - no cambia el estado operativo
  - permite ocultar borradores descartados o pausados del listado principal
  - se puede restaurar mientras siga en `draft`

En detalle de pedido (`/orders/[orderId]`), el estado `draft` usa edición batch:

- lista completa de sugeridos del proveedor/sucursal con métricas operativas
- buscador por artículo
- guardado único que reemplaza la lista de ítems (upsert qty > 0 y remueve qty = 0)

### R3) Ingreso a stock

- El ingreso se hace al pasar a `received` (o en acción explícita “Recibir”)
- Cada item genera movimiento `purchase` (append-only) referenciando order_id y item_id.
- Stock se incrementa por `received_qty`.
- Si el producto tiene `shelf_life_days`, se crea un batch de vencimiento automático.

### R4) Diferencias pedido vs recibido

- Permitidas (realidad operativa)
- Deben quedar registradas (ordered_qty vs received_qty)

### R4.2) Costo real por remito en recepción/control

- En `sent -> reconciled`, cada item permite confirmar/editar costo unitario real del proveedor.
- El costo real confirmado actualiza:
  - `supplier_order_items.unit_cost` (snapshot histórico del pedido recibido)
  - `supplier_products.supplier_price` (costo vigente para sugerencias futuras)
- Si un producto no tenía costo proveedor, queda editable en recepción y se persiste al confirmar.

### R4.3) Ajuste inmediato de precio de venta en recepción

- En la misma recepción/control, cada item expone `precio unitario de venta` (catálogo global).
- Default del input: `products.unit_price` actual.
- La UI muestra sugerido en base a costo proveedor confirmado + `% ganancia`:
  - primero `%` del proveedor (`suppliers.default_markup_pct`)
  - fallback `%` por defecto de la org (`org_preferences.default_supplier_markup_pct`).
- Al confirmar recepción/control, se actualiza `products.unit_price` inmediatamente para evitar ajuste manual posterior.
- Esta actualización es operativa de catálogo y no modifica lógica de remito/factura.
- En el mismo paso, la recepción también puede completar o corregir metadata del maestro del producto:
  - `products.brand`
  - `products.category_tags`
  - `products.shelf_life_days`
- El input `Marca` en recepción usa catálogo de marcas existente en la org para sugerir coincidencias mientras se escribe y ayudar a mantener un maestro limpio.
- El input `Categoria` en recepción usa hashtags ya registrados en la org y alerta coincidencias parecidas para evitar categorías duplicadas o casi iguales.
- Si el usuario conoce la fecha exacta de vencimiento del remito, la UI permite cargarla y derivar automáticamente `products.shelf_life_days` en base a la fecha efectiva de recepción.
- En recepción/control, `Vencimiento aproximado (dias)` y `Fecha exacta de vencimiento` se muestran juntos; la fecha exacta es opcional y solo se usa para calcular el aproximado con más precisión cuando el usuario no quiere estimarlo manualmente.
- Objetivo operativo: que el maestro se complete progresivamente mientras entra mercadería real, sin obligar a abrir `/products` para cada ajuste.

### R4.4) Productos extra del remito

- En `/orders/[orderId]` durante recepción/control existe un segundo entry point para sumar productos que llegaron en el remito pero no estaban en el pedido original.
- El modal permite:
  - buscar y agregar uno o varios productos existentes
  - definir si el proveedor actual queda como `primary`, `secondary` o sin relación en `supplier_products`
  - completar allí mismo `supplier_product_name` y `supplier_sku`
  - crear un producto nuevo mínimo sin salir del flujo
  - mientras se completa el producto nuevo, `name`, `brand` y `category_tags` usan sugerencias del maestro existente para prevenir duplicados
- Cuando se agrega un producto desde recepción:
  - se persiste en `supplier_order_items` con `ordered_qty = 0` y luego se carga `received_qty` en la misma grilla de control
  - si se elige relación del proveedor, se persiste con `rpc_upsert_supplier_product(...)`
  - si es producto nuevo, además se crea el maestro y puede fijarse `stock_items.safety_stock` para la sucursal del pedido
- Objetivo operativo: permitir que el maestro de productos y relaciones proveedor-producto se complete progresivamente desde la recepción real de mercadería.

### R4.1) Integración con pagos por proveedor

- Al recibir/controlar un pedido, se sincroniza una cuenta por pagar (`supplier_payables`) ligada al `order_id`.
- El estado de pago se opera en `/payments` y se refleja en `/orders`.
- Para proveedores con método preferido `cash`, en el detalle del pedido (`/orders/[orderId]`) existe un check “Pago en efectivo realizado” dentro del flujo de control.
  - al marcarlo, exige monto exacto pagado en efectivo.
  - soporta check de pago parcial con monto total de remito/factura y cálculo de restante.
  - si está marcado y falta monto, no se procesa ningún cambio del pedido.
  - al confirmar control con check marcado, además de controlar se registra el pago efectivo por el monto ingresado.
  - si hay pago parcial, actualiza `invoice_amount` con el total declarado; si no hay parcial y el monto supera saldo/estimado, también ajusta `invoice_amount` para reflejar el monto real.
  - `/orders/[orderId]` incorpora además un segundo entry point para registrar factura/remito (número, monto, vencimiento, método, foto, nota), equivalente al flujo operativo de `/payments`.
  - en recepción/control también se calcula total remito desde items (subtotal sin IVA, IVA opcional, descuento opcional) y se sincroniza en `supplier_payables.invoice_amount`.

### R5) Proveedor inactivo

- No se puede crear pedido nuevo con proveedor inactivo

### R6) Sugeridos (MVP simple)

- Sugerido = promedio ventas 30 días \* ciclo + safety_stock - stock_on_hand
- El ciclo se calcula por `order_frequency` (mensual = 30 días)
- Se recomienda mostrar sugerido como ayuda, no obligatorio
- En `/orders`, el ajuste `Margen de ganancia (%)` debe precargar primero el `% de ganancia deseado` del proveedor (`suppliers.default_markup_pct`) y usar el default org-wide (`org_preferences.default_supplier_markup_pct`) solo si el proveedor no lo definió
- En `/orders`, la columna editable de costo sugerido por item se rotula como `Precio estimado de proveedor` para dejar claro que representa el valor esperado de compra al proveedor, no el precio de venta.
- En `/orders`, el selector inline `Promedio de ventas` no debe mostrar `Según proveedor`; debe explicitar la frecuencia efectiva cargada en el proveedor (por ejemplo `quincenal`), con fallback `semanal` si el proveedor no tiene período definido.
- En `/orders`, `Margen de ganancia (%)` deja de vivir en un bloque separado con botón `Aplicar`: ahora se controla desde el área de sugeridos, junto al toggle de cálculo estimado, y recalcula la UI en tiempo real.
- En `/orders`, el resumen `Mostrando` debe aclarar si `Precio estimado de proveedor` está en modo `real registrado` o `por margen de ganancia`, en sincronía con el toggle de cálculo estimado.
- En `/orders`, `Stock de resguardo` funciona como segundo entry point operativo para editar `stock_items.safety_stock` del artículo en la sucursal seleccionada; el cambio se persiste al guardar borrador o enviar pedido.
- En `/orders`, el modal de impresión/WhatsApp funciona también como segundo entry point para editar `supplier_products.supplier_product_name` del proveedor seleccionado; el cambio se persiste al guardar borrador o enviar pedido.
- En `/orders`, existe además un segundo entry point `Agregar productos al pedido` que reutiliza el modal de recepción para sumar artículos faltantes al draft actual. Debe permitir elegir productos existentes del catálogo aunque no tengan relación previa con el proveedor, opcionalmente asignarlos como `primary`/`secondary`/`none`, o crear un producto nuevo con metadata mínima y `Cantidad de resguardo`.
- Al confirmar ese modal en `/orders`, los artículos agregados se inyectan de inmediato en la grilla local del draft sin exigir refresco de página; la relación proveedor-producto solo se persiste si el usuario eligió `primary` o `secondary`.
- La regla de catálogo se mantiene: un producto solo puede tener un proveedor `primary`. Si en el modal de `/orders` o `/orders/[orderId]` el artículo ya tiene otro primario, la UI debe mostrar ese proveedor, preseleccionar `secondary` para el proveedor actual y pedir confirmación explícita antes de reemplazar al primario existente.
- Si producto `purchase_by_pack=true`, la UI muestra equivalencia sugerida en
  paquetes (`suggested_qty / units_per_pack`) y equivalencia de cantidad cargada.
  Persistencia sigue en unidades.

### R7) Pedidos especiales de clientes (MVP)

- Al seleccionar proveedor + sucursal, se muestran ítems pendientes por cliente.
- “Agregar al pedido” suma esos ítems y los marca como ordenados.
- El pedido especial no descuenta stock; el stock se descuenta en POS al cobrar.

---

## Pantallas asociadas

- `/orders` (lista + crear)
- `/orders/calendar` (agenda operativa de envíos/recepciones)
- `/orders/[orderId]` (detalle + edición + recepción/conciliación)

---

## Data contracts (resumen)

- View: `v_orders_admin` (lista)
  - la UI de lista muestra monto estimado por pedido (sumatoria de items)
- View: `v_order_detail_admin(order_id)`
- View: `v_supplier_product_suggestions(supplier_id, branch_id)`
- View: `v_special_order_items_pending`
- RPC: `rpc_create_supplier_order(...)`
- RPC: `rpc_upsert_supplier_order_item(...)`
- RPC: `rpc_set_supplier_order_status(...)`
- RPC: `rpc_set_supplier_order_archived(...)`
- RPC: `rpc_receive_supplier_order(...)` (si se separa del status)
- RPC: `rpc_set_supplier_order_expected_receive_on(...)`
- RPC: `rpc_mark_special_order_items_ordered(...)`
- (opcional) RPC: `rpc_reconcile_supplier_order(...)`

Eventos de auditoria clave (MVP):

- `supplier_order_status_set`
- `supplier_order_archived`
- `supplier_order_restored`
- `supplier_order_received`
- `supplier_order_expected_receive_on_set`

---

## Edge cases

- Pedido sin items: permitido en draft, no permitido enviar
- Ítem duplicado: bloqueado por unique
- Recibir más que ordered: permitido (registrar diferencia)
- Cancelación: Post-MVP (en MVP no hay “cancelled”; usar draft o reconciled)

---

## Métricas

- pedidos creados por semana
- lead time sent→received
- % diferencias (ordered vs received)
- volumen comprado por proveedor

---

## Smoke tests

- Crear pedido draft
- Enviar pedido (sent)
- Recibir pedido (received) con received_qty
- Ver stock incrementado
- Conciliar (reconciled) y bloquear edición
