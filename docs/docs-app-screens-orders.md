# Screen Contract — Orders (Org Admin)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/orders`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org
- Staff: NO (MVP recomendado)

## Propósito

Listar pedidos a proveedor y crear nuevos pedidos por sucursal.

- Permitir ver sugeridos de compra por proveedor y sucursal (MVP simple).

---

## Contexto de sucursal

- Filtro por sucursal (opcional) + estado
- Crear pedido requiere seleccionar sucursal

---

## UI

### Header

- Título: “Pedidos”
- Filtros de listado:
  - Sucursal
  - Estado (draft/sent/received/reconciled)

### Lista (tabla/cards)

Cada row:

- order_id (short)
- proveedor
- sucursal
- estado
- fecha (created_at / sent_at)
- acción: “Ver” → `/orders/[orderId]`
- Listado separado: pendientes arriba, controlados abajo

### Pedidos especiales pendientes

- Visible al seleccionar proveedor + sucursal
- Lista ítems de pedidos especiales por cliente
- Muestra sucursal y proveedor de cada ítem
- Botón “Agregar al pedido”

---

## Acciones (MVP)

### A1) Crear pedido (inline)

Paso 1: seleccionar proveedor + sucursal + margen de ganancia (%).

Paso 2: ver sugeridos en la misma pantalla y editar cantidades.

Paso 3: agregar notas y crear pedido.

Campos:

- proveedor (selector)
- sucursal (selector)
- margen de ganancia (%) para estimar costo
- cantidades por item (default sugerido)
- notas (opcional)

Submit → crea order `draft` y vuelve al listado (sin redirigir).

Validaciones:

- proveedor activo
- sucursal válida

---

## Estados UI

- Loading: skeleton lista
- Empty: “Aún no hay pedidos.” + CTA “Nuevo pedido”
- Error: banner + reintentar

---

## Data Contract

### Lectura lista

View: `v_orders_admin(branch_id nullable, status optional, supplier_id optional)`
Salida mínima:

- order_id
- supplier_id, supplier_name
- branch_id, branch_name
- status
- created_at
- sent_at, received_at, reconciled_at (opcional)
- items_count (opcional)

### Escritura

RPC: `rpc_create_supplier_order(input)`

- supplier_id
- branch_id
- notes optional
  Output:
- order_id

### Sugeridos (MVP simple)

View: `v_supplier_product_suggestions(supplier_id, branch_id)`
Salida mínima:

- product_id, product_name
- relation_type
- stock_on_hand
- safety_stock
- avg_daily_sales_30d
- cycle_days
- suggested_qty

Para estimar costo:

- leer `products.unit_price` por product_id
- calcular costo estimado = unit_price \* (1 - margen_pct/100)

UI:

- Mostrar promedio por ciclo = avg_daily_sales_30d \* días
- Cantidad sugerida y cantidad a pedir como entero (redondeo hacia arriba)
- Selector para mostrar promedio semanal/quincenal/mensual (override manual)
- Toggle de vista: tabla/tarjetas (persistido en localStorage)
- Totales: costo estimado + cantidad total de items

### Pedidos especiales pendientes

View: `v_special_order_items_pending`
Salida mínima:

- item_id
- special_order_id
- client_name
- product_id, product_name
- remaining_qty
- supplier_id
- supplier_name (opcional, para UI)
- branch_id
- is_ordered

RPC: `rpc_mark_special_order_items_ordered(p_item_ids[], p_supplier_order_id)`

---

## Seguridad (RLS)

- OA: read/write en org
- Debe respetar branch_id dentro del org

---

## Smoke tests

1. Crear pedido desde `/orders`
2. Verlo en lista
3. Abrir detalle
