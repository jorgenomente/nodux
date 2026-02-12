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
- Info: proveedor, sucursal, fechas (creado / enviado / controlado)
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
- diferencia (computed)
- acciones: remover (solo draft)

### Footer / Summary

- Conteo items
- Notas del pedido

---

## Acciones (MVP)

### A1) Agregar ítem

- Selector simple (lista de productos activos)
- Define ordered_qty
- UPSERT item

### A2) Editar ordered_qty (solo draft)

- inline edit
- valida qty > 0

### A3) Remover ítem (solo draft)

- elimina item (o soft delete Post-MVP)

### A4) Enviar pedido (draft → sent)

Validaciones:

- debe tener ≥1 ítem
- ordered_qty > 0 en todos

RPC status change:

- set status sent + sent_at

### A5) Recibir mercadería y controlar (sent → reconciled)

- UI cambia a modo recepción + control:
  - received_qty por item (default = ordered_qty)
  - fecha/hora de recepción editable
  - nombre de quien controla (obligatorio) + autofirma
- Confirmar recepción/control:
  - registra received_at (manual)
  - registra controlado por (nombre + user)
  - status → `reconciled` (Controlado)
  - genera movimientos purchase por item (stock +)
  - genera batches de vencimiento si el producto tiene `shelf_life_days`
    RPC: `rpc_receive_supplier_order(order_id, received_items[], received_at, controlled_by)`

### A6) Actualizar estado manual (draft/sent)

- Selector de estado (solo borrador/enviado)
- Recibido/controlado se realizan solo via recepcion

---

## Estados UI

- Loading: skeleton
- Error: 404 si order no pertenece a org o no existe
- Empty items (draft): “Agregá productos al pedido” + CTA “Agregar ítem”

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
  - controlled_by_name, controlled_by_user_id, controlled_by_user_name
- items[]:
  - order_item_id
  - product_id, product_name
  - ordered_qty
  - received_qty
  - unit_cost (optional)
  - diff_qty (computed)

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

---

## Seguridad (RLS)

- OA: read/write dentro de org
- Order y items siempre con org_id
- Movements/stock update solo en branch del pedido

---

## Edge cases

1. Recibir sin haber enviado

- Bloquear (solo sent→received)

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
