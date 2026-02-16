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
- registro de movimientos manuales (gastos/ingresos)
- cierre por turno o por día
- conciliación de efectivo esperado vs contado

## Reglas clave

- Caja es **por sucursal** (`branch_id` obligatorio).
- Solo puede existir **una sesión abierta por sucursal**.
- El esperado se calcula con:
  - apertura
  - cobros en efectivo POS (`sale_payments.payment_method='cash'`)
  - ingresos manuales
  - gastos manuales
- Al cerrar:
  - se guarda contado
  - se calcula diferencia
  - se registra auditoría con actor y detalle

## Data Contract (One Screen = One Data Contract)

### Lectura principal

- View: `v_cashbox_session_current`
- Campos mínimos:
  - `session_id`, `org_id`, `branch_id`, `status`
  - `period_type`, `session_label`
  - `opening_cash_amount`, `cash_sales_amount`
  - `manual_income_amount`, `manual_expense_amount`
  - `expected_cash_amount`, `counted_cash_amount`, `difference_amount`
  - `opened_by`, `closed_by`, `opened_at`, `closed_at`, `close_note`

### Escrituras (RPC)

- `rpc_open_cash_session(...)`
- `rpc_add_cash_session_movement(...)`
- `rpc_get_cash_session_summary(...)`
- `rpc_close_cash_session(...)`

## Auditoría obligatoria

- `cash_session_opened`
- `cash_movement_added`
- `cash_session_closed`

Los eventos deben incluir actor, sucursal y metadata operativa para trazabilidad.
