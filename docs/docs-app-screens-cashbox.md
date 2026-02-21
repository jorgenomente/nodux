# Screen Contract — Caja (Cashbox)

## Ruta

- `/cashbox`

## Rol / Acceso

- Staff (ST) con módulo `cashbox` habilitado.
- Org Admin (OA).
- Superadmin (SA) en contexto de org activa.

## Propósito

Operar caja por sucursal con flujo simple:

- apertura de caja
- apertura de reserva
- registro de movimientos manuales (gastos/ingresos)
- cierre por turno o por día
- conciliación de efectivo esperado vs contado

## Reglas clave

- Caja es **por sucursal** (`branch_id` obligatorio).
- Solo puede existir **una sesión abierta por sucursal**.
- En apertura:
  - si `period_type='shift'`, el operador debe elegir `AM` o `PM` (se guarda en `session_label`).
  - se requiere responsable de apertura (`opened_controlled_by_name`).
  - se muestra fecha/hora del sistema en el formulario de apertura (referencia operativa previa al submit).
- El esperado se calcula con:
  - apertura en caja
  - apertura en reserva
  - cobros en efectivo POS (`sale_payments.payment_method='cash'`)
  - egresos automáticos por pagos a proveedor en efectivo (`supplier_payments.payment_method='cash'`)
  - ingresos manuales
  - gastos manuales
- La pantalla muestra resumen adicional de cobros no-efectivo de la sesión:
  - tarjeta (`card`, incluyendo histórico `debit/credit`)
  - `mercadopago`
- La pantalla muestra tabla de conciliación operativa con:
  - fila fija de `Efectivo esperado total (caja + reserva)` calculada por sesión
  - al completar conteo de cierre (caja + reserva), la fila de efectivo muestra automáticamente el contado y diferencia en vivo antes de cerrar
  - filas por método/dispositivo para cobros no-efectivo (ej. posnet)
  - fila agregada `MercadoPago (total)` sumando solo transacciones con `payment_method='mercadopago'`
  - cobros con `payment_method='card'` siempre quedan en tarjeta, aunque el dispositivo sea de proveedor MercadoPago
  - input manual por fila para registrar monto de comprobante
  - diferencia (`comprobante - sistema`) por fila
- La pantalla incluye bloque de `Desglose del efectivo en sistema` con fórmula operativa y detalle por movimiento:
  - apertura caja / apertura reserva
  - ventas en efectivo
  - ingresos manuales
  - egresos por pago proveedor en efectivo (con detalle de nota/pedido si aplica)
  - otros egresos manuales
- El flujo operativo de cierre se presenta en 2 secciones:
  - `Conteo de efectivo` (solo conteo de billetes caja/reserva + total en vivo).
  - `Confirmar cierre de caja` (firma operativa, observación, confirmación y botón final) al final, después de conciliación.
- Al cerrar:
  - se guarda cierre en caja
  - se guarda cierre en reserva
  - el total contado se deriva automáticamente
  - se requiere firma operativa (`controlled_by_name`) y confirmación explícita
  - se registra conteo por denominaciones (billetes/monedas)
  - se calcula diferencia
  - se registra auditoría con actor y detalle
- Exportación de reporte:
  - Solo aplica a sesiones cerradas.
  - `Exportar CSV` genera archivo con resumen, desglose, conciliación y movimientos del cierre elegido.
  - `Reporte PDF` abre vista imprimible para compartir (usar imprimir/guardar como PDF) del cierre elegido.
  - En `Últimos cierres` cada fila incluye acciones directas `CSV` y `PDF` para descargar históricos.

## Data Contract (One Screen = One Data Contract)

### Lectura principal

- View: `v_cashbox_session_current`
- Campos mínimos:
  - `session_id`, `org_id`, `branch_id`, `status`
  - `period_type`, `session_label`
  - `opened_controlled_by_name`
  - `opening_cash_amount`, `opening_reserve_amount`
  - `closing_drawer_amount`, `closing_reserve_amount`
  - `cash_sales_amount`
  - `card_sales_amount`, `mercadopago_sales_amount`
  - `manual_income_amount`, `manual_expense_amount`
  - `expected_cash_amount`, `counted_cash_amount`, `difference_amount`
  - `opened_by`, `closed_by`, `opened_at`, `closed_at`, `close_note`

### Escrituras (RPC)

- `rpc_open_cash_session(...)`
  - para `shift`, `session_label` operativo `AM`/`PM`
  - requiere `opened_controlled_by_name`
- `rpc_add_cash_session_movement(...)`
- `rpc_get_cash_session_summary(...)`
- `rpc_get_cash_session_reconciliation_rows(...)`
- `rpc_upsert_cash_session_reconciliation_inputs(...)`
- `rpc_close_cash_session(...)`
  - requiere `closed_controlled_by_name`
  - requiere `close_confirmed=true`
  - soporta `closing_drawer_count_lines` y `closing_reserve_count_lines`
  - valida suma de líneas contra total contado derivado

## Auditoría obligatoria

- `cash_session_opened`
- `cash_movement_added`
- `cash_session_closed`

Los eventos deben incluir actor, sucursal y metadata operativa para trazabilidad.
En cierre deben incluir además firma de control y detalle de denominaciones.
