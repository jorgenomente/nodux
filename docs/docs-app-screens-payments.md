# Screen Contract — Payments (Org Admin)

## Ruta

- `/payments`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Propósito

Gestionar pagos a proveedores por sucursal a partir de pedidos recibidos/controlados.

- Ver cuentas por pagar pendientes, parciales, pagadas y vencidas.
- Cargar monto exacto de factura/remito.
- Registrar pagos (efectivo o transferencia) con trazabilidad.

## UI

### Header

- Título: “Pagos a proveedores”
- Acceso rápido a auditoría

### Filtros

- Sucursal
- Proveedor
- Estado (`pending`, `partial`, `paid`, `overdue`, `due_soon`)

### Lista de cuentas por pagar

Cada card muestra:

- proveedor + sucursal
- referencia a pedido (`order_id`)
- estado de pago
- vencimiento
- estimado / factura / pagado / saldo

Acciones por card:

- actualizar datos de factura (`invoice_amount`, `due_on`, método seleccionado, observación, foto/remito URL)
- registrar pago (`amount`, `payment_method`, cuenta de transferencia opcional, referencia, nota)

## Data Contract

### Lectura principal

View: `v_supplier_payables_admin`

Salida mínima:

- `payable_id`, `order_id`
- `branch_id`, `branch_name`
- `supplier_id`, `supplier_name`
- `payable_status`, `payment_state`, `is_overdue`
- `estimated_amount`, `invoice_amount`, `paid_amount`, `outstanding_amount`
- `due_on`, `due_in_days`
- `preferred_payment_method`, `selected_payment_method`
- `invoice_photo_url`, `invoice_note`

### Escrituras

RPC: `rpc_update_supplier_payable(...)`

- ajusta monto exacto, vencimiento, método seleccionado y datos de factura.

RPC: `rpc_register_supplier_payment(...)`

- registra un movimiento de pago y recalcula saldo/estado.

RPC auxiliar en detalle proveedor:

- `rpc_upsert_supplier_payment_account(...)`
- `rpc_set_supplier_payment_account_active(...)`

## Reglas

- Scope por sucursal: cada cuenta por pagar pertenece a `branch_id` del pedido.
- Estado de pago se calcula con saldo pendiente.
- Vencido se determina por `due_on < current_date` y saldo > 0.
- Pedido y pago son estados independientes.

## Seguridad (RLS)

- OA/SA: read/write dentro de su org.
- ST: sin acceso a módulo pagos en MVP.

## Smoke tests

1. Pedido reconciliado crea cuenta por pagar.
2. Ajustar `invoice_amount` y `due_on`.
3. Registrar pago parcial y validar estado `partial`.
4. Registrar pago final y validar estado `paid`.
5. Ver estado reflejado en `/orders`.
