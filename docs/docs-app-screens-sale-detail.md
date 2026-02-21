# Screen Contract — Sale Detail (Org Admin)

## Ruta

- `/sales/[saleId]`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Propósito

Auditar una venta puntual y corregir método de pago cuando hubo error operativo.

## UI

### Header

- Breadcrumb: Ventas → detalle
- Sucursal + fecha/hora
- Acceso rápido a `/cashbox`

### Resumen

- Subtotal
- Descuento total (%) + desglose (`cash` / `empleado`)
- Total
- Método resumen de la venta
- Empleado asociado (si aplica)

### Bloque ítems

- producto
- cantidad
- precio
- subtotal

### Bloque pagos

- lista de componentes de pago (`sale_payments`)
- cada fila permite corrección de método con controles visibles (sin dropdown):
  - métodos: `efectivo`, `débito`, `crédito`, `mercadopago`
  - para `débito/crédito`: selector visible de dispositivo
  - para `mercadopago`: selector visible de canal (`Posnet MP`, `QR`, `Transferencia a alias MP`)
- motivo de corrección obligatorio en todos los casos

## Data Contract

### Lectura principal

View: `v_sale_detail_admin`

Salida mínima:

- `sale_id`, `org_id`, `branch_id`, `branch_name`
- `created_at`, `created_by`, `created_by_name`
- `employee_account_id`, `employee_name_snapshot`
- `payment_method_summary`
- `subtotal_amount`, `discount_amount`, `discount_pct`, `cash_discount_amount`, `cash_discount_pct`, `employee_discount_applied`, `employee_discount_amount`, `employee_discount_pct`, `total_amount`
- `items` (jsonb array)
- `payments` (jsonb array)

### Escritura

RPC: `rpc_correct_sale_payment_method(...)`

- `p_org_id`
- `p_sale_payment_id`
- `p_payment_method`
- `p_payment_device_id` (nullable)
- `p_reason` (obligatorio)

Reglas críticas:

- Solo OA/SA.
- No permite `mixed`.
- Si método es `débito/crédito` (y `card` legacy), exige dispositivo válido de la sucursal.
- Si método es `mercadopago`, dispositivo opcional para canales `QR/alias`; para `Posnet MP`, exige dispositivo.
- Si la venta pertenece a una sesión de caja ya cerrada, bloquea corrección.
- Actualiza `sales.payment_method` en base al conjunto actual de `sale_payments`.
- Audita evento `sale_payment_method_corrected`.

## Seguridad (RLS)

- Scope por `org_id`.
- OA/SA lectura/escritura por RPC en org activa.
- ST sin acceso.

## Smoke tests

1. Abrir detalle de una venta con 1 método.
2. Corregir método y motivo válido.
3. Ver cambio reflejado en detalle y listado `/sales`.
4. Ver evento en `/settings/audit-log`.
