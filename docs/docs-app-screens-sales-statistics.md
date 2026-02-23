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

- ranking de productos (más/menos vendidos y más/menos ingresos)
- tendencias por día, semana y mes
- comparación por día de semana (lunes..domingo)
- relevancia de proveedores según ventas de sus productos

## UI

### Header

- Título: “Estadísticas de ventas”
- Acceso rápido a `/sales`

### Filtros

- Sucursal (opcional)
- Desde / Hasta (fecha)
- Presets rápidos: histórico, YTD, 90d, 30d, 7d

### Resumen superior

- cantidad de ventas
- ingresos totales
- unidades vendidas
- ticket promedio
- cantidad de productos vendidos

### Bloques de análisis

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

## Data Contract

### Lectura principal

View: `v_sales_statistics_items`

Salida mínima:

- `sale_id`, `org_id`, `branch_id`, `branch_name`, `created_at`
- `product_id`, `product_name`, `quantity`, `unit_price`, `line_total`
- `supplier_id`, `supplier_name` (proveedor primario del producto, si existe)

## Seguridad (RLS)

- Scope por `org_id`.
- OA/SA: lectura dentro de su org activa.
- ST: sin acceso.

## Smoke tests

1. Abrir `/sales/statistics` y ver métricas históricas.
2. Aplicar filtro por sucursal y verificar cambios en rankings.
3. Aplicar rango de fechas manual y verificar tendencias por día/semana/mes.
4. Validar que “Ver estadísticas” desde `/sales` abre la pantalla.
