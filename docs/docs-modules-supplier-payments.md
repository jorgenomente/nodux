# Módulo — Pagos a proveedor

## Objetivo

Operar pagos de pedidos por sucursal con trazabilidad y visibilidad de urgencias.

## Entidades

### supplier_payment_accounts

- cuentas de transferencia del proveedor (alias/CBU/CVU/banco/titular).

### supplier_payables

- una cuenta por pagar por pedido (`order_id` único).
- guarda estimado, factura, saldo, vencimiento y estado.

### supplier_payments

- movimientos de pago (parcial/total), append-only.

## Reglas de negocio

1. Scope por sucursal:

- cada `supplier_payable` hereda `branch_id` desde `supplier_orders`.

2. Estado de pago:

- `pending`: sin pagos.
- `partial`: pago parcial.
- `paid`: saldo cero.
- `overdue`: estado derivado por vencimiento (`due_on` pasado y saldo > 0).

3. Integración con pedidos:

- al recibir/controlar pedido, se sincroniza la cuenta por pagar.
- `/orders` muestra `payment_state`, vencimiento y saldo.

4. Métodos de pago MVP:

- `cash` y `transfer`.
- proveedor puede preferir un método sin bloquear excepciones.

## Pantallas

- `/payments`
- `/suppliers`
- `/suppliers/[supplierId]`
- `/orders`

## Contratos principales

- `v_supplier_payables_admin`
- `rpc_update_supplier_payable(...)`
- `rpc_register_supplier_payment(...)`
- `rpc_upsert_supplier_payment_account(...)`
- `rpc_set_supplier_payment_account_active(...)`
- `rpc_sync_supplier_payable_from_order(...)`

## Auditoría

Eventos clave:

- `supplier_payable_updated`
- `supplier_payment_registered`
- `supplier_payment_account_upsert`
- `supplier_payment_account_status_set`
