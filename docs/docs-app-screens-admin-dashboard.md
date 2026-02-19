# Screen Contract — Org Admin Dashboard

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/dashboard`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) cuando accede a una org (impersonation/soporte controlado)
- Staff: NO accede

## Propósito

Dar una visión operativa clara del negocio, con foco en:

- ventas (hoy/semana/mes)
- productos por vencer (y urgencias)
- pedidos pendientes a proveedor
- pedidos especiales de clientes
- alertas in-app accionables

**Estado actual**: KPIs y alertas basicas implementadas.

---

## Contexto de sucursal (branch context)

### Requisito MVP

El dashboard debe soportar:

1. **Vista por sucursal** (filtro por branch)

### UI

- Selector: lista de sucursales
- Default:
  - Si org tiene 1 sucursal → esa sucursal
  - Si org tiene >1 → primera sucursal

### Nota RLS

- OA puede ver datos de cualquier branch de su org.
- El filtro de branch se aplica en queries y/o en la view.

---

## Layout (alto nivel)

### Sección A — KPIs (cards)

- Ventas Hoy (total + #ventas)
- Ventas Semana (total)
- Ventas Mes (total)
- Ventas Efectivo Hoy (total + #ventas cash)
- Descuento Efectivo Hoy (monto descontado + #ventas con descuento)
- Nota: “Efectivo hoy” suma también el componente cash de ventas con pago dividido.
- Ítems vendidos Hoy (#items) (opcional MVP si es barato)

### Sección B — Alertas críticas (lista)

Ordenadas por severidad:

- Vencimientos críticos (≤ X días)
- Pedidos a proveedor pendientes/atrasados
- Pedidos especiales de clientes pendientes
- Stock bajo (si se incluye en MVP; si no, Post-MVP)

Cada alerta debe tener:

- texto claro
- link directo a pantalla destino (expirations / orders / clients)
- badge de severidad

### Sección C — Paneles operativos (cards)

- Vencimientos (criticos + proximos)
- Pedidos proveedor pendientes
- Pedidos clientes pendientes

### Sección D — Operación compras/pagos (hoy/semana)

- Toggle de vista operativa: `today` | `week`.
- Pedidos que se deberían realizar en el período (proveedores activos con `order_day` en alcance).
- Pedidos que se deberían recibir en el período (órdenes `sent/received` con `expected_receive_on` en alcance).
- Pagos a realizar en el período (cuentas por pagar no pagadas con `due_on` en alcance), separando:
  - efectivo (`cash`)
  - transferencia (`transfer`)

---

## Acciones del usuario (MVP)

### A1) Cambiar scope de sucursal

- Cambia filtro del dashboard
- Recalcula KPIs y listas

### A2) Navegar a módulos desde alertas

- CTA por alerta:
  - Vencimientos → `/expirations`
  - Pedidos proveedor → `/orders`
  - Pedidos clientes → `/clients`

### A3) Ajustar parámetros de alertas (link)

- Link a settings:
  - `/settings/preferences` (si existen parámetros ahí)
  - o `/settings` (hub)

(MVP: solo link, no editor inline).

---

## Estados UI

### Loading

- Skeleton para KPIs
- Skeleton para listas

### Empty (sin actividad)

Casos:

1. Sin ventas:

- “Aún no hay ventas registradas.”
- CTA: “Ir a POS” (`/pos`)

2. Sin alertas:

- “Todo en orden por ahora.”
- Mostrar “0 alertas” y mantener paneles con empty states.

### Error

- Banner: “No pudimos cargar el dashboard.”
- CTA: Reintentar

---

## Reglas de negocio

### R1) Ventas agregadas

- Ventas se computan por `sales.created_at` en timezone de la org (MVP: usar UTC + mostrar relativo; ajustar en hardening).
- Total = suma de `sales.total_amount`
- #ventas = count(sales)

### R2) Severidad de vencimientos

Severidad basada en días a vencimiento:

- CRÍTICO: 0–X días (X configurable; default 3)
- PRÓXIMO: X+1–Y días (Y configurable; default 7)
- OK: >Y

### R3) Pedidos a proveedor

Estados MVP:

- `draft` → `sent` → `reconciled`
  Dashboard muestra pendientes = `sent`

### R4) Pedidos especiales de clientes

Estados MVP:

- `pending` → `ordered` → `received` → `delivered`
  Dashboard debe mostrar pendientes = `pending/ordered/received` (según definiciones del módulo)

---

## Data Contract (One Screen = One Data Contract)

### Objetivo

Resolver el dashboard con **una sola lectura principal** para performance y simplicidad.

### Contrato actual (MVP)

**RPC**: `rpc_get_dashboard_admin(p_org_id, p_branch_id nullable)`

Salida mínima:

- `sales_today_total`
- `sales_today_count`
- `sales_week_total`
- `sales_month_total`
- `cash_sales_today_total`
- `cash_sales_today_count`
- `cash_discount_today_total`
- `cash_discounted_sales_today_count`
- `expirations_critical_count`
- `expirations_warning_count`
- `supplier_orders_pending_count`
- `client_orders_pending_count`

Las alertas y paneles se derivan de estos conteos en la UI.

### Lecturas auxiliares (sección operativa hoy/semana)

- `suppliers` (`id`, `name`, `order_day`) para “pedidos a realizar”.
- `v_orders_admin` (`order_id`, `supplier_name`, `status`, `expected_receive_on`) para “pedidos a recibir”.
- `v_supplier_payables_admin` (`payable_id`, `due_on`, `outstanding_amount`, `payable_status`, `selected_payment_method`, `preferred_payment_method`) para “pagos a realizar” por método.

Nota:

- El contrato principal de KPIs se mantiene en `rpc_get_dashboard_admin`; la sección operativa usa lecturas auxiliares por período (`today|week`) dentro de la misma pantalla.

---

## Permisos y seguridad (RLS)

- OA solo ve datos de su `org_id`.
- Para “todas las sucursales”, el query agrega múltiples branches pero siempre dentro de org.
- La view/RPC no debe exponer datos cross-org ni cross-tenant.

---

## Edge cases

1. Org con múltiples sucursales pero sin datos en alguna

- KPIs agregados OK
- Listas deben indicar branch_name cuando aplique

2. Cambios en tiempo real

- MVP: refresh manual o auto-refresh simple (cada X min) — opcional
- Post-MVP: realtime

3. Timezone

- MVP: usar created_at en UTC (mostrar “hoy” según UTC puede ser impreciso)
- Hardening: timezone por org y uso consistente en agregaciones

---

## Métricas / eventos (observabilidad)

- `dashboard_viewed` (branch_scope: all|branch)
- `dashboard_branch_scope_changed`
- `dashboard_alert_clicked` (type, severity, target)
- `dashboard_load_failed`

---

## Smoke tests (manual)

### AD-01: Dashboard vacío

1. Crear org nueva sin ventas ni pedidos
2. Login como OA
3. Abrir `/dashboard`
4. Ver empty states y CTA a POS

### AD-02: Ventas impactan KPIs

1. Crear 2 ventas en `/pos`
2. Volver a `/dashboard`
3. Ver actualización en “Ventas Hoy” y count

### AD-03: Filtro por sucursal

1. Org con 2 sucursales
2. Generar ventas en sucursal A
3. Dashboard “todas” muestra total
4. Filtrar sucursal B muestra 0

### AD-04: Alertas de vencimientos/pedidos

1. Crear vencimiento cercano en `/expirations`
2. Crear pedido proveedor en estado `sent`
3. Dashboard muestra alertas y links correctos
