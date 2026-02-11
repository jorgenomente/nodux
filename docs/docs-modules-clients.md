# Módulo — Clientes y pedidos especiales

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Objetivo

Gestionar clientes y pedidos especiales sin descontar stock hasta el cobro:

- registrar clientes
- crear pedidos especiales con ítems reales
- coordinar con pedidos a proveedor
- entregar y cobrar desde POS

---

## Roles

- Org Admin (OA): acceso completo
- Staff (ST): acceso si módulo habilitado (solo su sucursal)

---

## Entidades principales

### clients

Datos básicos del cliente.

### client_special_orders

Pedido especial por cliente (cabecera).

### client_special_order_items

Ítems del pedido especial:

- product_id
- requested_qty
- fulfilled_qty
- supplier_id (opcional)
- supplier_order_id (cuando se ordena al proveedor)

---

## Reglas de negocio (invariantes)

### R1) Stock solo en POS

Los pedidos especiales **no descuentan stock**. El stock se descuenta en POS al cobrar.

### R2) Estados de pedido especial

- `pending`: creado, aún no pedido al proveedor
- `ordered`: pedido al proveedor (al agregar a /orders)
- `partial`: entregado parcialmente (si no se cierra)
- `delivered`: entregado/cobrado (cierre total)
- `cancelled`: cancelado sin entrega

### R3) Proveedor sugerido

- Si el producto tiene proveedor primario, se sugiere.
- Se puede override manual o dejar sin proveedor.

### R4) Entrega parcial

- POS puede entregar una parte.
- Si se elige “Cerrar pedido especial”, se marca `delivered` aunque quede pendiente.

---

## Pantallas asociadas

- `/clients`
- `/orders` (alertas por proveedor)
- `/pos` (entrega/cobro)

---

## Data contracts (resumen)

- RPC: `rpc_list_clients(...)`
- RPC: `rpc_get_client_detail(...)`
- RPC: `rpc_upsert_client(...)`
- RPC: `rpc_create_special_order(...)` (items jsonb)
- RPC: `rpc_set_special_order_status(...)`
- RPC: `rpc_mark_special_order_items_ordered(...)`
- RPC: `rpc_get_special_order_for_pos(...)`
- View: `v_special_order_items_pending`

---

## Smoke tests

- Crear cliente
- Crear pedido especial con 2 ítems
- Agregar ítems a pedido a proveedor (marca ordered)
- Ir a POS y cobrar (marca delivered/partial)
