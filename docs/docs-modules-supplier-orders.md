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

### `sent`

- representa “pedido enviado”
- todavía no impacta stock
- opcional: export/print (Post-MVP)

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

### R3) Ingreso a stock

- El ingreso se hace al pasar a `received` (o en acción explícita “Recibir”)
- Cada item genera movimiento `purchase` (append-only) referenciando order_id y item_id.
- Stock se incrementa por `received_qty`.

### R4) Diferencias pedido vs recibido

- Permitidas (realidad operativa)
- Deben quedar registradas (ordered_qty vs received_qty)

### R5) Proveedor inactivo

- No se puede crear pedido nuevo con proveedor inactivo

---

## Pantallas asociadas

- `/orders` (lista + crear)
- `/orders/[orderId]` (detalle + edición + recepción/conciliación)

---

## Data contracts (resumen)

- View: `v_orders_admin` (lista)
- View: `v_order_detail_admin(order_id)`
- RPC: `rpc_create_supplier_order(...)`
- RPC: `rpc_upsert_supplier_order_item(...)`
- RPC: `rpc_set_supplier_order_status(...)`
- RPC: `rpc_receive_supplier_order(...)` (si se separa del status)
- (opcional) RPC: `rpc_reconcile_supplier_order(...)`

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
