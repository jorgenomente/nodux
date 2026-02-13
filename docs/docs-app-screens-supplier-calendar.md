# Screen Contract — Supplier Calendar (OA / Staff)

## Ruta

- `/orders/calendar`

## Rol / Acceso

- Org Admin (OA)
- Staff (ST) en modo solo lectura
- Superadmin (SA): redirige a `/superadmin`

## Propósito

Mostrar una agenda operativa mobile-first para:

- saber qué pedido se debe realizar hoy/esta semana
- saber qué pedido está pendiente por recibir
- revisar pedidos realizados/recepciones anteriores por rango de fechas

---

## Layout (mobile-first)

1. Header:

- título “Calendario de proveedores”
- leyenda de colores (envío/recepción)

2. Filtros:

- sucursal
- estado (`todos`, `pendiente por enviar`, `pendiente por recibir`, `recibido y controlado`)
- periodo (`hoy`, `esta semana`, `este mes`, `rango personalizado`)
- desde/hasta (solo si el período es `rango personalizado`)
- al seleccionar `rango personalizado`, `desde/hasta` aparecen inmediatamente en UI

3. Agenda:

- secciones por día
- tarjetas de evento por proveedor

---

## Acciones por rol

### Org Admin

- `Ver pedido` cuando el evento viene de una orden real
- `Ver y controlar` cuando está pendiente por recibir
- `Crear pedido` cuando está pendiente por realizar
- editar `expected_receive_on` en pedidos pendientes por recibir

### Staff

- solo visualización

---

## Estados UI

- Loading: render servidor
- Empty: “No hay eventos para el filtro seleccionado.”
- Error: fallback estándar de la app
- Success: N/A (pantalla de lectura)

---

## Data Contract

Contrato único de pantalla (composición server-side):

- `suppliers` (schedule):
  - `id`, `name`, `order_frequency`, `order_day`, `receive_day`, `created_at`
- `v_orders_admin` (eventos reales):
  - `order_id`, `supplier_id`, `supplier_name`, `branch_id`, `branch_name`, `status`, `created_at`, `sent_at`, `received_at`, `reconciled_at`, `expected_receive_on`

Salida UI:

- `date_key`, `date_label`
- `supplier_id`, `supplier_name`, `branch_name`
- `status` (`pending_send` | `pending_receive` | `controlled`)
- `order_id` (nullable)

---

## Reglas de negocio

1. La agenda se filtra por periodo o rango personalizado.
2. `pending_send`: proveedor programado para pedir y sin pedido enviado en esa fecha.
3. `pending_receive`: pedido en estado `sent` pendiente de control.
   Compatibilidad legacy: si aparece `received` sin `reconciled_at`, se trata como pendiente de control.
4. Si `expected_receive_on` existe, ese valor manda la fecha esperada de recepción.
5. `controlled`: pedido con `reconciled_at`.
6. Si no hay sucursales asignadas a Staff, redirige a `/no-access`.

---

## Seguridad (RLS)

- Respeta RLS de `suppliers`, `supplier_orders` y membresías de sucursal.
- No habilita escritura para Staff.
