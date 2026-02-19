# Screen Contract — Payments (Org Admin)

## Ruta

- `/payments`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Propósito

Gestionar pagos a proveedores por sucursal a partir de pedidos enviados/controlados.

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
- Búsqueda por nombre (palabras en cualquier orden; ejemplo: `palermo cafe`)

### Lista de cuentas por pagar

Listado en dos secciones:

- Arriba: facturas pendientes por pagar
- Abajo: facturas pagadas

Orden sección pendientes:

- primero vencidas
- luego por vencimiento más próximo (`due_on` ascendente)
- sin vencimiento al final

Cada card muestra:

- proveedor + sucursal
- referencia a pedido (`order_id`)
- estado operativo del pedido (`sent` pendiente por recibir, `received/reconciled` controlado)
- método requerido según perfil actual del proveedor y método seleccionado para el pago (`selected_payment_method`)
- estado de pago
- vencimiento
- número de factura/remito (`invoice_reference`)
- estimado / factura / pagado / saldo
- badge/tarjeta de seguimiento del último pago registrado (fecha/hora y nota si existe)

Acciones por card:

- acciones de factura y pago en secciones colapsables (desplegable por botón) para reducir carga visual en listado.
- actualizar datos de factura (`invoice_amount`, `due_on`, método seleccionado, observación, foto/remito URL)
- actualizar datos de factura/remito (`invoice_reference`, `invoice_amount`, `due_on`, método seleccionado, observación, foto/remito URL)
- registrar pago (`amount`, `paid_at` fecha/hora, `payment_method`, cuenta de transferencia opcional, referencia, nota)
- en registrar pago:
  - botón `Restante` para completar automáticamente el saldo pendiente actual.
  - check `Es pago parcial`; al activarlo exige `monto total` y muestra restante proyectado.
  - si no está marcado como parcial, se acepta monto real mayor al estimado/saldo y se ajusta la base de factura para reflejar el pago real.
- cuando la factura ya está pagada, la tarjeta muestra estado final y no permite registrar nuevos pagos.
- adjuntar foto de factura/remito desde cámara/archivo con compresión automática (JPG liviano y legible)

## Data Contract

### Lectura principal

View: `v_supplier_payables_admin`

Salida mínima:

- `payable_id`, `order_id`
- `branch_id`, `branch_name`
- `supplier_id`, `supplier_name`
- `order_status`
- `payable_status`, `payment_state`, `is_overdue`
- `estimated_amount`, `invoice_amount`, `paid_amount`, `outstanding_amount`
- `due_on`, `due_in_days`
- `preferred_payment_method`, `selected_payment_method`

Nota de visualización:

- en UI, “método requerido” se muestra desde el perfil actual del proveedor (`suppliers.preferred_payment_method`) para reflejar cambios recientes en `/suppliers` sin depender del snapshot histórico del payable.
- `invoice_reference`, `invoice_photo_url`, `invoice_note`
  - `invoice_photo_url` almacena path de Storage (`supplier-invoices`) cuando se sube imagen comprimida.

### Lectura auxiliar (seguimiento en card)

Tabla: `supplier_payments` (scope `org_id` + `payable_id`)

Uso en UI:

- tomar el movimiento más reciente por `payable_id` (`paid_at` desc, `created_at` desc)
- mostrar badge “Último pago registrado” con:
  - `paid_at` (fecha/hora)
  - `amount`
  - `note` (si no existe, mostrar “Sin nota”)

### Escrituras

RPC: `rpc_update_supplier_payable(...)`

- ajusta monto exacto, vencimiento, método seleccionado y datos de factura.
- usa firma canónica con `p_invoice_reference` (sin sobrecarga legacy).

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
