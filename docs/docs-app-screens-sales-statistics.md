# Screen Contract — Sales Statistics (Org Admin)

## Ruta

- `/sales/statistics`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Propósito

Analizar desempeño de ventas en un período o acumulado histórico para tomar
decisiones operativas rápidas.

- separar analítica en dos vistas desplegables: `Ventas` y `Proveedores/Pagos`
- ranking de productos (más/menos vendidos y más/menos ingresos)
- tendencias por día, semana y mes
- comparación por día de semana (lunes..domingo)
- ranking de proveedores por ventas y por pagos/deuda/frecuencia de pedidos

## UI

### Header

- Título: “Estadísticas de ventas”
- Acceso rápido a `/sales`

### Filtros

- Sucursal (opcional)
- Desde / Hasta (fecha)
- Presets rápidos: histórico, YTD, 90d, 30d, 7d
- Bloque de contexto visible: `Mostrando` con configuración activa aplicada
  (sucursal + período + modo de rango)

Reglas de sucursal:

- si el usuario tiene una única sucursal asignada, esa sucursal queda
  preseleccionada y bloqueada en UI.
- el backend fuerza esa sucursal en consultas para evitar acceso por query params
  a otras sucursales.

### Estructura principal

- dos secciones desplegables:
  - `Ventas de artículos`
  - `Proveedores y pagos`

### Sección desplegable: Ventas de artículos

- resumen:
  - cantidad de ventas
  - ingresos totales
  - unidades vendidas
  - ticket promedio
  - cantidad de productos vendidos

- Productos:
  - top por unidades
  - top por ingresos
  - menor movimiento por unidades
  - menor movimiento por ingresos
- Proveedores:
  - top por ingresos
  - menor movimiento por unidades
- Temporal:
  - ventas por día de semana
  - días con más ventas
  - semanas con más ventas
  - meses con más ventas

### Sección desplegable: Proveedores y pagos

- resumen:
  - cantidad de cuentas por pagar
  - total pagado a proveedores
  - saldo pendiente total
  - cantidad de cuentas vencidas
  - cantidad de proveedores activos en el período
- rankings:
  - proveedores más importantes por monto pagado
  - proveedores con mayor saldo pendiente
  - proveedores más frecuentes (por pedidos/facturas)
  - proveedores menos solicitados (por pedidos/facturas)
  - proveedores más relevantes en ventas
  - proveedores con menor movimiento en ventas

## Data Contract

### Lectura principal

View: `v_sales_statistics_items`

Salida mínima:

- `sale_id`, `org_id`, `branch_id`, `branch_name`, `created_at`
- `product_id`, `product_name`, `quantity`, `unit_price`, `line_total`
- `supplier_id`, `supplier_name` (proveedor primario del producto, si existe)

### Lectura complementaria (proveedores y pagos)

View: `v_supplier_payables_admin`

Salida mínima:

- `payable_id`, `org_id`, `branch_id`, `branch_name`, `created_at`
- `supplier_id`, `supplier_name`, `order_id`
- `payment_state`, `paid_amount`, `outstanding_amount`
- `invoice_amount`, `estimated_amount`, `is_overdue`

## Seguridad (RLS)

- Scope por `org_id`.
- OA/SA: lectura dentro de su org activa.
- ST: sin acceso.

## Smoke tests

1. Abrir `/sales/statistics` y validar los dos desplegables (`Ventas` y `Proveedores y pagos`).
2. Aplicar filtro por sucursal y verificar cambios en ambos bloques.
3. Aplicar rango de fechas manual y verificar tendencias por día/semana/mes.
4. Validar bloque `Mostrando` y coherencia con filtros activos.
5. Si un usuario tiene una sola sucursal asignada, validar que no puede cambiar
   sucursal ni ver datos de otras.
6. Validar rankings de proveedores por pagos/deuda/frecuencia con datos de `v_supplier_payables_admin`.
7. Validar que “Ver estadísticas” desde `/sales` abre la pantalla.
