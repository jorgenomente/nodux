# Screen Contract — Sales (Org Admin)

## Ruta

- `/sales`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Propósito

Auditar ventas de forma rápida para control operativo de caja.

- Buscar ventas por monto, método, hora e ítems.
- Ver desglose de cobros por medio.
- Acceder al detalle y corrección auditada del cobro.

## UI

### Header

- Título: “Ventas”
- Acceso rápido a `/cashbox`
- Acceso rápido a `/sales/statistics`

### Filtros

- Sucursal
- Método de pago
- Monto mínimo/máximo
- Rango fecha/hora (desde/hasta)
- Búsqueda por ítems/sucursal/usuario/empleado

### Resumen superior

- Total filtrado
- Total efectivo
- Total tarjeta
- Total MercadoPago

### Lista

Cada fila muestra:

- fecha/hora
- sucursal y usuario
- empleado (si aplica descuento empleado)
- cantidad de ítems + resumen
- métodos usados
- total
- acción “Ver detalle”

## Data Contract

### Lectura principal

View: `v_sales_admin`

Salida mínima:

- `sale_id`, `org_id`, `branch_id`, `branch_name`
- `created_at`, `created_by`, `created_by_name`
- `employee_account_id`, `employee_name_snapshot`
- `payment_method_summary`
- `subtotal_amount`, `discount_amount`, `discount_pct`, `cash_discount_amount`, `cash_discount_pct`, `employee_discount_applied`, `employee_discount_amount`, `employee_discount_pct`, `total_amount`
- `items_count`, `items_qty_total`
- `item_names_summary`, `item_names_search`
- `payment_methods[]`
- `cash_amount`, `card_amount`, `mercadopago_amount`, `other_amount`

## Seguridad (RLS)

- Scope por `org_id`.
- OA/SA: lectura dentro de su org activa.
- ST: sin acceso.

## Smoke tests

1. Abrir `/sales` y ver listado de ventas.
2. Filtrar por método `cash`.
3. Filtrar por rango de fecha/hora.
4. Buscar por nombre de ítem.
5. Abrir detalle desde una fila.
