# Módulo — Caja (Cashbox)

## Objetivo MVP

Permitir cierre operativo de caja por sucursal de forma rápida y auditable.

## Alcance

- Apertura de caja (monto inicial).
- Movimientos manuales de caja:
  - gastos (delivery, librería, limpieza, servicios, otros)
  - ingresos
- Cierre por turno o por día.
- Conciliación automática contra cobros en efectivo POS.

## Fuentes de datos

- `cash_sessions`
- `cash_session_movements`
- `sale_payments` (solo componente `cash`)
- `audit_log`

## Contratos

- Pantalla: `docs/docs-app-screens-cashbox.md`
- View principal: `v_cashbox_session_current`
- RPCs:
  - `rpc_open_cash_session`
  - `rpc_add_cash_session_movement`
  - `rpc_get_cash_session_summary`
  - `rpc_close_cash_session`

## Seguridad / RLS

- Scope por `org_id` + `branch_id`.
- ST solo en sucursales asignadas y con módulo `cashbox` habilitado.
- OA/SA pueden operar por org activa.
- Acciones críticas solo vía RPC.

## Post-MVP relacionado

- Aprobaciones de cierre y reapertura.
- Multi-caja simultánea por sucursal.
- Reportes avanzados de diferencias.
