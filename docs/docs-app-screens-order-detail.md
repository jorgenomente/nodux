# Screen Contract — Order Detail (Org Admin)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/orders/[orderId]`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org
- Staff: NO (MVP)

## Propósito

Gestionar un pedido end-to-end:

- editar items en draft
- enviar pedido
- recibir y controlar mercadería (received_qty) en un solo paso

---

## UI: Layout

### Header

- Breadcrumb: Pedidos → {orderId}
- Estado (badge)
- Info: proveedor, sucursal, fechas (creado / enviado / controlado) + monto estimado total del pedido
- Aclaración visible: el estimado es aproximado; el monto real se confirma en remito/factura.
- Si corresponde: estado de pago en efectivo + monto pagado (y fecha/hora)
- Selector de estado (borrador/enviado) + botón “Actualizar estado”
- Acciones por estado:
  - Draft: “Enviar pedido”
  - Sent: “Recibir y controlar mercadería”
  - Reconciled: sin acciones

### Sección Items (tabla)

Columnas:

- producto
- ordered_qty (editable en draft)
- received_qty (editable en recepción/control)
- costo estimado unitario (`unit_cost`)
- subtotal estimado por item (`ordered_qty * unit_cost`)
- diferencia (computed)
- acciones: remover (solo draft)

Comportamiento adicional (compra por paquete):

- en recepción/control, si un producto tiene `purchase_by_pack=true`, debajo de
  `received_qty` se muestra equivalencia en paquetes usando `units_per_pack`.
- el dato persistido continúa siendo `received_qty` en unidades.

### Footer / Summary

- Conteo items
- Monto estimado total del pedido
- Notas del pedido

---

## Acciones (MVP)

### A1) Editar items del borrador (lista completa)

- En `draft`, se muestra la lista completa de artículos sugeridos del proveedor/sucursal.
- Cada fila muestra estadísticas operativas (stock, stock mínimo, promedio por ciclo, sugerido).
- Incluye buscador por artículo y campo de cantidad editable por fila.
- “Guardar items del borrador” aplica la nueva lista completa:
  - qty > 0: upsert item
  - qty = 0 o no incluido: remover item existente
- El costo unitario del borrador se completa por defecto con `supplier_price` registrado.
- Existe check `Usar % ganancia para costo estimado`:
  - activo: todos los costos unitarios pasan al sugerido por margen.
  - inactivo: vuelve a costos registrados por proveedor.
  - si un producto no tiene costo proveedor registrado (`0`), el campo queda editable y muestra sugerido por margen.
- Editar costos en borrador NO sobrescribe `supplier_price`; solo impacta el pedido actual.

### A2) Enviar pedido (draft → sent)

Validaciones:

- debe tener ≥1 ítem
- ordered_qty > 0 en todos

RPC status change:

- set status sent + sent_at

### A3) Recibir mercadería y controlar (sent → reconciled)

- UI cambia a modo recepción + control:
  - ordered_qty visible al inicio de cada fila
  - received_qty por item (default = ordered_qty)
  - fecha/hora de recepción editable
  - nombre de quien controla (obligatorio) + autofirma
  - el submit final no se dispara con tecla `Enter`; la confirmación ocurre solo por click explícito en `Confirmar recepción` / `Confirmar control`
- Confirmar recepción/control:
  - registra received_at (manual)
  - registra controlado por (nombre + user)
  - permite editar `precio proveedor unitario` por item al momento del remito/factura
  - permite completar/ajustar `categoria` por item (hashtags del maestro)
  - status → `reconciled` (Controlado)
  - genera movimientos purchase por item (stock +)
  - genera batches de vencimiento si el producto tiene `shelf_life_days`
  - persiste el costo real en:
    - `supplier_order_items.unit_cost` (snapshot del pedido)
    - `supplier_products.supplier_price` (vigente para próximos pedidos)
      RPC: `rpc_receive_supplier_order(order_id, received_items[], received_at, controlled_by)`
- Calculadora operativa de remito:
  - subtotal sin IVA
  - check `Aplicar IVA` + `%`
  - subtotal con IVA
  - check `Aplicar descuento` + monto
  - total remito/factura
- El total calculado se sincroniza en `supplier_payables.invoice_amount`.
- Columna adicional en recepción: `precio unitario de venta` (`products.unit_price`):
  - default: precio de venta actual del catálogo
  - sugerido: precio proveedor confirmado + `% ganancia` del proveedor (o fallback de preferencias org)
  - al confirmar recepción se actualiza inmediatamente el catálogo global del producto.
- Campo adicional en recepción: `categoria` (`products.category_tags`):
  - default: categorías actuales del producto
  - editable como texto con hashtags
  - al confirmar recepción se actualiza inmediatamente el maestro del producto.
- Campos adicionales en recepción para completar maestro:
  - `marca` (`products.brand`): default a la marca actual del producto, editable desde la recepción y persistida al confirmar.
    - mientras se escribe, la UI sugiere marcas ya registradas en la org para reducir duplicados por mayúsculas/minúsculas, espacios o variantes de escritura.
  - `categoria` (`products.category_tags`): además de ser editable en recepción, su input muestra hashtags ya registrados y coincidencias parecidas para mantener consistencia del maestro.
  - `vencimiento aproximado (dias)` (`products.shelf_life_days`): default al valor actual del producto, editable desde la recepción y persistido al confirmar.
  - `fecha exacta de vencimiento`: input calendario por ítem que calcula automáticamente `vencimiento aproximado (dias)` usando la fecha/hora de recepción como base.
- Este ajuste de precio de venta es independiente del remito/factura y del cálculo de cuentas por pagar.
- Compatibilidad legacy:
  - si existe un pedido en estado `received` (flujo anterior), el control final lo pasa a `reconciled` guardando fecha y firma.
- Flujo efectivo (proveedor con método preferido `cash`):
  - aparece un check “Pago en efectivo realizado” dentro del bloque de recepción/control.
  - el input “Monto exacto pagado” se muestra siempre visible, pero bloqueado/vacío hasta marcar el check.
  - incluye check adicional “Pago parcial”; al marcarlo exige “Monto total remito/factura” y muestra restante proyectado.
  - al confirmar recepción/control:
    - si el check no está marcado: solo controla el pedido.
    - si el check está marcado: controla el pedido y registra el monto efectivo ingresado.
  - si el check está marcado y falta monto exacto, no se aplica ningún cambio.
  - si el payable ya está saldado, no se vuelve a mostrar la opción de registrar pago efectivo.
  - si es pago parcial, el total declarado se aplica como `invoice_amount`; si no es parcial y el monto supera el saldo/estimado, también ajusta `invoice_amount` para reflejar monto real.
- Segundo entry point factura/remito:
  - en la misma pantalla existe “Registrar factura/remito (opcional)” con los mismos campos operativos de `/payments`.
  - permite capturar número, monto, vencimiento, método seleccionado, foto y nota al momento de recibir/controlar.
- Segundo entry point agregar productos:
  - debajo de la aclaración de `PRECIO VENTA (UNITARIO)` existe CTA visible `¿Hay productos en el remito que no están en esta lista? Agrega productos aquí`.
  - abre modal con dos pestañas:
    - `Productos existentes`: buscador, selección múltiple y opción por producto para vincular el proveedor actual como `primario`, `secundario` o no asignarlo, además de completar `Nombre de articulo en el proveedor` y `SKU`.
    - `Nuevo producto`: alta rápida mínima dentro del mismo flujo de recepción.
      - `Nombre de articulo en la tienda` muestra sugerencias del catálogo y alertas de posible duplicado semántico.
      - `Marca` y `Categoria` muestran sugerencias del maestro existente para evitar variantes nuevas innecesarias.
  - al confirmar:
    - el producto se agrega realmente al pedido (`supplier_order_items`) con `ordered_qty = 0` para distinguirlo del pedido original
    - si corresponde, también se persiste la relación en `supplier_products`
    - si es producto nuevo, además se crea/actualiza el maestro (`products`) y puede guardar `Cantidad de resguardo` para la sucursal del pedido
  - después de agregarlo, el ítem aparece en la grilla normal de recepción/control con sus campos operativos (`received_qty`, costo, precio venta, categoría, etc.).

### A4) Actualizar estado manual (draft/sent)

- Selector de estado (solo borrador/enviado)
- Recibido/controlado se realizan solo via recepcion

### A5) Ajustar fecha estimada de recepción (sent/received)

- Campo editable `expected_receive_on` en header
- Permite refinar fecha de llegada cuando la programación del proveedor no es exacta
- Debe sincronizarse con `/orders/calendar`
- Debe registrar auditoria (`supplier_order_expected_receive_on_set`)

---

## Estados UI

- Loading: skeleton
- Error: 404 si order no pertenece a org o no existe
- Empty items (draft): “No hay sugerencias para este proveedor y sucursal”.

---

## Data Contract (One Screen = One Data Contract)

### Lectura

View: `v_order_detail_admin(order_id)`
Salida:

- order:
  - order_id, status, notes
  - supplier_id, supplier_name
  - branch_id, branch_name
  - created_at, sent_at, received_at, reconciled_at
  - expected_receive_on
  - controlled_by_name, controlled_by_user_id, controlled_by_user_name
- items[]:
  - order_item_id
- product_id, product_name
- purchase_by_pack
- units_per_pack
- ordered_qty
  - received_qty
  - unit_cost (optional)
  - supplier_price (lookup auxiliar para default en UI)
  - suggested_unit_cost_by_markup (computed en UI)
  - diff_qty (computed)

View auxiliar (solo `draft`): `v_supplier_product_suggestions(supplier_id, branch_id)`
Salida mínima:

- product_id
- product_name
- stock_on_hand
- safety_stock
- avg_daily_sales_30d
- cycle_days
- suggested_qty

### Escrituras

RPC 1: `rpc_upsert_supplier_order_item(input)`

- order_id
- product_id
- ordered_qty
- (optional) unit_cost
  Output: item

RPC 2: `rpc_remove_supplier_order_item(input)`

- order_item_id (o order_id + product_id)

RPC 3: `rpc_set_supplier_order_status(input)`

- order_id
- status (sent/reconciled) + timestamps

RPC 4: `rpc_receive_supplier_order(input)`

- order_id
- items: [{ order_item_id, received_qty }]
  Efectos:
- status → reconciled
- received_at
- movimientos purchase (append-only)
- update stock

RPC 5: `rpc_set_supplier_order_expected_receive_on(input)`

- order_id
- expected_receive_on (date nullable)

---

## Seguridad (RLS)

- OA: read/write dentro de org
- Order y items siempre con org_id
- Movements/stock update solo en branch del pedido

---

## Edge cases

1. Recibir sin haber enviado

- Bloquear (solo sent/received legacy → reconciled)

2. Recibir con received_qty = 0

- Permitir (representa faltante), pero requiere confirmación

3. Agregar ítems después de sent

- Bloquear en MVP

4. Concurrencia

- MVP: último write gana
- Post-MVP: locking optimista con updated_at/version

---

## Métricas / eventos

- `order_detail_viewed`
- `order_item_added`
- `order_sent`
- `order_received`
- `order_reconciled`
- `order_receive_failed`

---

## Smoke tests (manual)

### OD-01: Flujo completo

1. Crear pedido draft
2. Agregar 2 items
3. Enviar (sent)
4. Recibir (received) con una diferencia (received_qty distinto)
5. Ver stock incrementado
6. Conciliar (reconciled) y confirmar bloqueo

### OD-02: Validaciones

1. Intentar enviar draft sin items → error
2. Intentar editar ordered_qty en sent → bloqueado
