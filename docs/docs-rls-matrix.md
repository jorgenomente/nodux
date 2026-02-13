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

## Convenciones

- Roles: SA (Superadmin), OA (Org Admin), ST (Staff).
- Acciones: `read`, `insert`, `update`, `delete`.
- Siempre se valida `org_id` y `branch_id` segun corresponda.
- La UI nunca reemplaza RLS; las RPCs deben validar permisos y modulos.

---

## Matriz (MVP - propuesta)

| Entidad                      | SA                 | OA                 | ST                            | Notas                               |
| ---------------------------- | ------------------ | ------------------ | ----------------------------- | ----------------------------------- |
| `orgs`                       | read               | read               | no                            | SA global; OA solo su org           |
| `branches`                   | read/insert/update | read/insert/update | read (solo asignadas)         | ST solo lectura de sus branches     |
| `org_users`                  | read/insert/update | read/insert/update | no                            | Gestion de usuarios                 |
| `branch_memberships`         | read/insert/update | read/insert/update | read (propias)                | ST ve sus asignaciones              |
| `staff_module_access`        | read/insert/update | read/insert/update | no                            | ST usa view efectiva                |
| `org_preferences`            | read/insert/update | read/insert/update | read (propia org)             | ST solo lectura si se expone        |
| `audit_log`                  | read               | read               | no                            | Append-only, solo lectura OA/SA     |
| `products`                   | read/insert/update | read/insert/update | read (lookup)                 | ST sin escritura                    |
| `stock_items`                | read/insert/update | read/insert/update | read (lookup)                 | ST sin ajustes                      |
| `stock_movements`            | read               | read/insert        | insert (via RPC)              | ST no lectura historica por defecto |
| `sales`                      | read               | read/insert        | insert (via RPC)              | ST crea ventas en su branch         |
| `sale_items`                 | read               | read/insert        | insert (via RPC)              | derivado de venta                   |
| `expiration_batches`         | read/insert/update | read/insert/update | read/insert (si modulo)       | ST sin ajustes avanzados            |
| `expiration_waste`           | read               | read/insert        | read (via view/RPC)           | Registro de desperdicio             |
| `suppliers`                  | read/insert/update | read/insert/update | no                            | ST sin acceso                       |
| `supplier_products`          | read/insert/update | read/insert/update | no                            | ST sin acceso                       |
| `supplier_orders`            | read/insert/update | read/insert/update | no                            | ST no en MVP                        |
| `supplier_order_items`       | read/insert/update | read/insert/update | no                            | ST no en MVP                        |
| `clients`                    | read/insert/update | read/insert/update | read/insert/update (limitado) | ST solo en branch asignada          |
| `client_special_orders`      | read/insert/update | read/insert/update | read/insert/update (limitado) | ST solo su branch                   |
| `client_special_order_items` | read/insert/update | read/insert/update | read/insert/update (limitado) | ST solo su branch                   |

---

## Policies (resumen propuesto)

- Todas las tablas multi-tenant filtran por `org_id`.
- Tablas con `branch_id` filtran adicionalmente por branch asignada (ST) o dentro de org (OA).
- `staff_module_access`:
  - solo OA/SA pueden leer/escribir.
  - ST solo accede a `v_staff_effective_modules`.
- Operaciones criticas (ventas, ajustes de stock, recepcion de pedidos) solo via RPC con validacion de rol, org, branch y modulo.
- Helpers `is_org_member`, `is_org_admin` e `is_org_admin_or_superadmin` son `security definer` con `row_security = off` para evitar recursion en policies.
- `audit_log` es append-only; solo OA/SA pueden leer; insercion solo via RPCs/triggers con `security definer`.

---

## Endpoints criticos que deben validar modulos

- `rpc_create_sale` -> requiere modulo `pos` habilitado.
- `rpc_adjust_stock_manual` -> solo OA.
- `rpc_set_safety_stock` -> solo OA.
- `rpc_create_supplier_order` y derivados -> solo OA.
- `rpc_create_special_order` -> OA o ST con modulo `clients` habilitado.
