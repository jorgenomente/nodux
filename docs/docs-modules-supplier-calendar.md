# Módulo — Calendario de proveedores

## Objetivo

Dar visibilidad operativa de próximos envíos y recepciones de proveedores en una agenda simple, clara y mobile-first.

---

## Ruta asociada

- `/orders/calendar`

---

## Roles

- Org Admin (OA): lectura + acceso rápido a crear/ver pedido
- Staff (ST): solo lectura

---

## Fuente de datos (MVP actual)

El calendario combina dos fuentes:

1. Programación por proveedor:

- `suppliers.order_frequency`
- `suppliers.order_day`
- `suppliers.receive_day`

2. Eventos reales de pedidos:

- `supplier_orders.sent_at`
- `supplier_orders.reconciled_at` (o `received_at`)
- `supplier_orders.expected_receive_on` (fecha exacta/estimada editable)

---

## Tipos de evento

- `pending_send`: pedido pendiente por realizar (azul claro)
- `sent`: pedido realizado (azul intenso)
- `pending_receive`: pedido pendiente por recibir (verde claro)
- `controlled`: pedido recibido y controlado (verde intenso)

---

## Reglas MVP

1. El calendario filtra en orden operativo: sucursal, estado, periodo.
2. El calendario permite filtros por hoy, semana, mes o rango personalizado.
3. Los campos desde/hasta se muestran solo en rango personalizado.
4. Los pendientes por realizar se calculan con la programación de proveedor (`order_day`, `order_frequency`).
5. Los estados realizados/recepción se sincronizan con `v_orders_admin`.
6. OA puede ajustar `expected_receive_on` para pedidos pendientes por recibir.
7. El Staff no puede editar pedidos desde este módulo.
8. OA puede usar CTA “Crear pedido”, “Ver pedido” o “Ver y controlar”.

---

## Seguridad

- Lectura protegida por RLS existente en `suppliers` y `supplier_orders` (`org_id` del usuario).
- Solo OA (policy de update existente en `supplier_orders`) puede editar `expected_receive_on`.
- Staff se mantiene en solo lectura.

---

## Estado MVP / próximos pasos

MVP actual: calendario operativo con filtros por periodo/rango y fecha estimada editable por pedido.
