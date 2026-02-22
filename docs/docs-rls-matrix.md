# Matriz RLS (viva)

Este documento define permisos por rol y entidad. Debe mantenerse actualizado con cualquier cambio de RLS.

Estado actual:

- Existe migracion inicial con RLS basica en `supabase/migrations/20260208213000_001_init_schema.sql`.
- Fix de helpers RLS (security definer) en `supabase/migrations/20260208220000_002_rls_helpers.sql`.
- Esta matriz refleja el baseline y debe ajustarse cuando se agreguen policies mas finas.
- DB local reseteada y snapshot/types generados (ver `docs/schema.sql` y `types/supabase.ts`).
- Views y RPCs creadas en migraciones 003/004 (ver `supabase/migrations/20260208221000_003_views.sql` y `supabase/migrations/20260208222000_004_rpcs.sql`).
- RPC `rpc_get_staff_effective_modules` (security definer) agregada en `supabase/migrations/20260208234000_006_rpc_staff_effective_modules.sql`.
- `supplier_orders.expected_receive_on` agregado en `supabase/migrations/20260213101500_029_supplier_orders_expected_receive_on.sql` (sin cambios de policy; aplica `supplier_orders_update` existente).
- `rpc_set_supplier_order_expected_receive_on` agregado en `supabase/migrations/20260213125000_030_audit_gaps_supplier_orders.sql` (sin cambios de policy; mantiene controles por org y estado en RPC).
- Base superadmin plataforma agregada en `supabase/migrations/20260216115100_031_superadmin_platform_foundation.sql` (`platform_admins`, `user_active_orgs`, `is_platform_admin`, vistas/rpcs SA).
- `rpc_superadmin_create_org` endurecida en `supabase/migrations/20260216124000_032_superadmin_create_org_owner_required.sql`: exige `owner_user_id` y garantiza membresía OA inicial (sin org huérfana).
- Descuento en efectivo POS + métricas dashboard agregados en `supabase/migrations/20260216150000_033_cash_discount_pos_dashboard_audit.sql` (validación estricta: descuento solo con `payment_method='cash'`).
- Split payments POS agregados en `supabase/migrations/20260216163000_034_split_payments_enum.sql` y `supabase/migrations/20260216164000_035_split_payments_pos.sql` (`sale_payments`, `payment_method='mixed'` y cash metrics por cobro real).
- Módulo caja por sucursal agregado en `supabase/migrations/20260216171000_036_cashbox_branch_sessions.sql` (`cash_sessions`, `cash_session_movements`, `v_cashbox_session_current` y RPCs de apertura/movimientos/cierre).
- Cierre de caja con firma y conteo por denominaciones agregado en `supabase/migrations/20260216182000_037_cashbox_close_signature_denominations.sql` (`cash_session_count_lines` y hardening de `rpc_close_cash_session`).
- Módulo pagos proveedor por sucursal agregado en `supabase/migrations/20260217213000_039_supplier_payments_branch_module.sql` (`supplier_payment_accounts`, `supplier_payables`, `supplier_payments`, `v_supplier_payables_admin` y estado de pago en `v_orders_admin`).
- Sincronización extendida en `supabase/migrations/20260218102000_041_payables_include_sent_orders.sql`: `supplier_payables` también se crea/actualiza para pedidos `sent`.
- `supplier_payables` incorpora `invoice_reference` y `rpc_update_supplier_payable` se extiende para persistir número de factura/remito (`supabase/migrations/20260218113000_042_supplier_payables_invoice_reference.sql`).
- Limpieza de RPCs: se elimina overload legacy de `rpc_update_supplier_payable` en `supabase/migrations/20260218151000_043_drop_legacy_rpc_update_supplier_payable_overload.sql` para evitar resolución ambigua de firma en PostgREST (sin cambios de policies).
- POS agrega `pos_payment_devices` y trazabilidad por dispositivo en `sale_payments` (`supabase/migrations/20260220093000_044_pos_devices_card_mercadopago_cashbox_supplier_cash.sql`).
- `rpc_register_supplier_payment` registra automáticamente egreso en `cash_session_movements` cuando el pago a proveedor es en efectivo y hay sesión abierta de caja (`supabase/migrations/20260220093000_044_pos_devices_card_mercadopago_cashbox_supplier_cash.sql`).
- Historial/detalle de ventas + conciliación por dispositivo en caja agregados en `supabase/migrations/20260220113000_045_sales_history_cashbox_reconciliation.sql` (`v_sales_admin`, `v_sale_detail_admin`, `rpc_get_cash_session_payment_breakdown`, `rpc_correct_sale_payment_method`).
- Descuento de empleado + cuentas de empleado por sucursal agregados en `supabase/migrations/20260221223000_052_employee_discount_accounts.sql` (`employee_accounts`, extensión de `org_preferences`, `sales` y `rpc_create_sale`).
- Onboarding de datos maestros agregado en `supabase/migrations/20260222001000_053_data_onboarding_jobs_tasks.sql` (`data_import_jobs`, `data_import_rows`, `v_data_onboarding_tasks` y RPCs de importación/validación/aplicación).
- Proveedores incorporan `% ganancia sugerida` en `supabase/migrations/20260222013000_054_supplier_default_markup_pct.sql` (sin cambios de policy; reusa RLS existente sobre `suppliers` y validación en `rpc_upsert_supplier`).
- Conciliación operativa de caja con captura de comprobantes por fila y agregado MercadoPago total en `supabase/migrations/20260220153000_047_cashbox_reconciliation_inputs.sql` (`cash_session_reconciliation_inputs`, `rpc_get_cash_session_reconciliation_rows`, `rpc_upsert_cash_session_reconciliation_inputs`).
- Ajuste de conciliación para incluir fila `Efectivo esperado total (caja + reserva)` en `supabase/migrations/20260220170000_048_cashbox_reconciliation_include_cash_expected.sql`.
- Ajuste de conciliación para clasificar `MercadoPago (total)` solo por método de pago (no por proveedor de dispositivo) en `supabase/migrations/20260220182000_049_cashbox_reconciliation_mp_by_method_only.sql`.
- Bucket de facturas proveedor agregado en `supabase/migrations/20260217221500_040_supplier_invoice_storage_bucket.sql` (`storage.buckets: supplier-invoices` + policies en `storage.objects` por `org_id` en path).
- Smoke RLS automatizado agregado en `scripts/rls-smoke-tests.mjs` (ejecución: `npm run db:rls:smoke`).
- CI hardening agrega ejecución automática de smoke RLS + smoke Playwright en `.github/workflows/ci-hardening.yml`.

## Convenciones

- Roles: SA (Superadmin), OA (Org Admin), ST (Staff).
- Acciones: `read`, `insert`, `update`, `delete`.
- Siempre se valida `org_id` y `branch_id` segun corresponda.
- La UI nunca reemplaza RLS; las RPCs deben validar permisos y modulos.

---

## Matriz (MVP - propuesta)

| Entidad                              | SA                 | OA                 | ST                            | Notas                                                     |
| ------------------------------------ | ------------------ | ------------------ | ----------------------------- | --------------------------------------------------------- |
| `orgs`                               | read               | read               | no                            | SA global; OA solo su org                                 |
| `branches`                           | read/insert/update | read/insert/update | read (solo asignadas)         | ST solo lectura de sus branches                           |
| `org_users`                          | read/insert/update | read/insert/update | no                            | Gestion de usuarios                                       |
| `platform_admins`                    | read/insert/update | no                 | no                            | SA global (tabla propia de plataforma)                    |
| `user_active_orgs`                   | read/insert/update | read/insert/update | read/insert/update            | Contexto de org activa por usuario                        |
| `branch_memberships`                 | read/insert/update | read/insert/update | read (propias)                | ST ve sus asignaciones                                    |
| `staff_module_access`                | read/insert/update | read/insert/update | no                            | ST usa view efectiva                                      |
| `org_preferences`                    | read/insert/update | read/insert/update | read (propia org)             | ST solo lectura si se expone                              |
| `employee_accounts`                  | read/insert/update | read/insert/update | read (sucursal asignada)      | OA/SA gestionan nombres; ST solo selección en POS         |
| `data_import_jobs`                   | read/insert/update | read/insert/update | no                            | Jobs de importación onboarding solo OA/SA                 |
| `data_import_rows`                   | read/insert/update | read/insert/update | no                            | Filas por job con errores/validación solo OA/SA           |
| `audit_log`                          | read               | read               | no                            | Append-only, solo lectura OA/SA                           |
| `products`                           | read/insert/update | read/insert/update | read (lookup)                 | ST sin escritura                                          |
| `stock_items`                        | read/insert/update | read/insert/update | read (lookup)                 | ST sin ajustes                                            |
| `stock_movements`                    | read               | read/insert        | insert (via RPC)              | ST no lectura historica por defecto                       |
| `sales`                              | read               | read/insert        | insert (via RPC)              | ST crea ventas en su branch                               |
| `sale_payments`                      | read               | read/insert        | insert (via RPC)              | Desglose de cobro por método                              |
| `pos_payment_devices`                | read/insert/update | read/insert/update | read/insert/update            | Catálogo de dispositivos de cobro por sucursal            |
| `cash_sessions`                      | read               | read/insert/update | insert/update (via RPC)       | Caja por sucursal (1 abierta por vez)                     |
| `cash_session_movements`             | read               | read/insert        | insert (via RPC)              | Gastos/ingresos manuales de caja                          |
| `cash_session_count_lines`           | read               | read/insert        | insert (via RPC)              | Conteo por denominaciones (apertura/cierre, caja/reserva) |
| `cash_session_reconciliation_inputs` | read               | read/insert/update | insert/update (via RPC)       | Montos de comprobante por fila de conciliación            |
| `sale_items`                         | read               | read/insert        | insert (via RPC)              | derivado de venta                                         |
| `expiration_batches`                 | read/insert/update | read/insert/update | read/insert (si modulo)       | ST sin ajustes avanzados                                  |
| `expiration_waste`                   | read               | read/insert        | read (via view/RPC)           | Registro de desperdicio                                   |
| `suppliers`                          | read/insert/update | read/insert/update | no                            | ST sin acceso                                             |
| `supplier_products`                  | read/insert/update | read/insert/update | no                            | ST sin acceso                                             |
| `supplier_orders`                    | read/insert/update | read/insert/update | no                            | ST no en MVP                                              |
| `supplier_order_items`               | read/insert/update | read/insert/update | no                            | ST no en MVP                                              |
| `supplier_payment_accounts`          | read/insert/update | read/insert/update | no                            | Cuentas de transferencia por proveedor                    |
| `supplier_payables`                  | read/insert/update | read/insert/update | no                            | Cuenta por pagar por pedido (scope sucursal)              |
| `supplier_payments`                  | read/insert/update | read/insert/update | no                            | Movimientos de pago proveedor                             |
| `clients`                            | read/insert/update | read/insert/update | read/insert/update (limitado) | ST solo en branch asignada                                |
| `client_special_orders`              | read/insert/update | read/insert/update | read/insert/update (limitado) | ST solo su branch                                         |
| `client_special_order_items`         | read/insert/update | read/insert/update | read/insert/update (limitado) | ST solo su branch                                         |

---

## Policies (resumen propuesto)

- Todas las tablas multi-tenant filtran por `org_id`.
- Tablas con `branch_id` filtran adicionalmente por branch asignada (ST) o dentro de org (OA).
- `staff_module_access`:
  - solo OA/SA pueden leer/escribir.
  - ST solo accede a `v_staff_effective_modules`.
- Operaciones criticas (ventas, ajustes de stock, recepcion de pedidos) solo via RPC con validacion de rol, org, branch y modulo.
- Helpers `is_org_member`, `is_org_admin` e `is_org_admin_or_superadmin` son `security definer` con `row_security = off` para evitar recursion en policies.
- Helper `is_platform_admin` define scope global SA fuera de `org_users`.
- `audit_log` es append-only; solo OA/SA pueden leer; insercion solo via RPCs/triggers con `security definer`.

---

## Endpoints criticos que deben validar modulos

- `rpc_create_sale` -> requiere modulo `pos` habilitado, permite pagos divididos (`payments`), descuento cash solo en pago 100% efectivo y descuento empleado con cuenta activa de la sucursal.
  - valida política de combinación entre descuento cash y empleado desde `org_preferences.employee_discount_combinable_with_cash_discount`.
  - para `card` y `mercadopago` exige `payment_device_id` válido en la sucursal.
- `rpc_correct_sale_payment_method` -> solo OA/SA; requiere motivo; bloquea cambios si la venta pertenece a una sesión de caja cerrada; audita `sale_payment_method_corrected`.
- `rpc_get_cash_session_payment_breakdown` -> OA/SA y ST con módulo `cashbox` habilitado; devuelve conciliación por método/dispositivo dentro de la sesión.
- `rpc_get_cash_session_reconciliation_rows` -> OA/SA y ST con módulo `cashbox` habilitado; devuelve filas operativas no-efectivo + agregado `MercadoPago (total)` y diferencia con comprobante cargado.
- `rpc_upsert_cash_session_reconciliation_inputs` -> OA/SA y ST con módulo `cashbox` habilitado; guarda montos de comprobante por fila en sesión abierta.
- `rpc_open_cash_session` -> requiere modulo `cashbox` habilitado para ST y valida sucursal asignada.
  - requiere `opening_drawer_count_lines` y `opening_reserve_count_lines`.
- `rpc_add_cash_session_movement` -> requiere modulo `cashbox` habilitado para ST y sesión abierta de la sucursal.
- `rpc_close_cash_session` -> requiere modulo `cashbox` habilitado para ST y registra cierre + diferencia.
  - requiere firma operativa (`closed_controlled_by_name`) y confirmación explícita.
  - valida conteo por denominaciones en `closing_drawer_count_lines` y `closing_reserve_count_lines`.
- `rpc_adjust_stock_manual` -> solo OA.
- `rpc_set_safety_stock` -> solo OA.
- `rpc_create_supplier_order` y derivados -> solo OA.
- `rpc_update_supplier_payable` y `rpc_register_supplier_payment` -> solo OA/SA en org activa.
  - `rpc_register_supplier_payment` con método `cash` agrega egreso automático en sesión abierta de caja.
- `rpc_create_special_order` -> OA o ST con modulo `clients` habilitado.
- `rpc_create_data_import_job` -> solo OA/SA en org activa; crea job de onboarding.
- `rpc_upsert_data_import_row` -> solo OA/SA en org activa; registra o corrige filas de job.
- `rpc_validate_data_import_job` -> solo OA/SA en org activa; valida filas y calcula conteos.
- `rpc_apply_data_import_job` -> solo OA/SA en org activa; aplica filas válidas con upsert idempotente.
- `rpc_superadmin_create_org` -> solo SA global.
- `rpc_superadmin_upsert_branch` -> solo SA global.
- `rpc_superadmin_set_active_org` -> solo SA global.
