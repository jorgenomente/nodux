# Módulo — Caja (Cashbox)

## Objetivo MVP

Permitir cierre operativo de caja por sucursal de forma rápida y auditable.

## Alcance

- Apertura por conteo de denominaciones en caja y reserva.
- Movimientos manuales de caja:
  - gastos (delivery, librería, limpieza, servicios, otros)
  - ingresos
- Cierre por turno o por día.
- Firma operativa de cierre (`controlled_by_name`) + confirmación.
- Conteo por denominaciones en el cierre.
- Denominaciones configurables por organización (billetes/monedas).
- Conciliación automática contra cobros en efectivo POS.
- Registro automático de egresos por pagos a proveedor en efectivo (si existe sesión abierta en la sucursal).
- Resumen operativo de cobros no-efectivo por sesión (`card` y `mercadopago`).
- Conciliación operativa por fila (`dispositivo/método`) con monto sistema vs comprobante.
- MercadoPago conciliado en una fila agregada (`MercadoPago total`) sin separar por método.

## Fuentes de datos

- `cash_sessions`
- `cash_session_movements`
- `cash_session_count_lines`
- `cash_session_reconciliation_inputs`
- `sale_payments` (solo componente `cash`)
- `supplier_payments` (solo componente `cash` para egreso automático)
- `audit_log`

## Contratos

- Pantalla: `docs/docs-app-screens-cashbox.md`
- View principal: `v_cashbox_session_current`
- RPCs:
- `rpc_open_cash_session`
- `rpc_add_cash_session_movement`
- `rpc_get_cash_session_summary`
- `rpc_get_cash_session_reconciliation_rows`
- `rpc_upsert_cash_session_reconciliation_inputs`
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
