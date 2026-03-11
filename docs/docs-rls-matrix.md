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
- Archivado operativo de borradores en pedidos proveedor agregado en `supabase/migrations/20260310234000_092_supplier_orders_draft_archive.sql` (`supplier_orders.is_archived`, extensión de `v_orders_admin` y RPC `rpc_set_supplier_order_archived`; sin cambios de policy, reusa `supplier_orders_update` y valida estado `draft` dentro de la RPC).
- Base superadmin plataforma agregada en `supabase/migrations/20260216115100_031_superadmin_platform_foundation.sql` (`platform_admins`, `user_active_orgs`, `is_platform_admin`, vistas/rpcs SA).
- `rpc_superadmin_create_org` endurecida en `supabase/migrations/20260216124000_032_superadmin_create_org_owner_required.sql`: exige `owner_user_id` y garantiza membresía OA inicial (sin org huérfana).
- Materialización automática SA -> OA en `supabase/migrations/20260309173000_085_superadmin_org_membership_materialization.sql`: cada `platform_admin` se sincroniza dentro de `org_users` como `org_admin` para toda org existente o nueva, reduciendo fallos de autorización en RPCs que leen membresía org-wide.
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
- Facturación operativa de ventas agregada en `supabase/migrations/20260227163000_060_sales_invoicing_ticket_split.sql` (`sales.is_invoiced`, `sales.invoiced_at`, `rpc_mark_sale_invoiced`, extensión de `v_sales_admin`, `v_sale_detail_admin`, `v_dashboard_admin`, `rpc_get_dashboard_admin`).
- Puente fiscal venta -> job y transición `failed` agregados en `supabase/migrations/20260308224500_080_fiscal_enqueue_sale_invoice_and_failed.sql` (`rpc_enqueue_sale_fiscal_invoice`, `fn_fiscal_mark_job_failed`; sin apertura de lectura pública sobre tablas fiscales, ejecución autenticada sólo para miembros con acceso POS en la sucursal de la venta o OA/SA).
- Gates org-wide fiscales productivos agregados en `supabase/migrations/20260309102000_082_fiscal_prod_enqueue_gate.sql` y `supabase/migrations/20260309113000_083_fiscal_prod_live_gate.sql` (`org_preferences.fiscal_prod_enqueue_enabled` y `org_preferences.fiscal_prod_live_enabled`; sin cambios de policy, reusan RLS existente de `org_preferences`; el primero endurece `rpc_enqueue_sale_fiscal_invoice` en ambiente `prod` y el segundo endurece el worker `live` antes de `FECAESolicitar`).
- Render fiscal MVP agregado en `supabase/migrations/20260309124500_084_fiscal_render_read_model.sql`: `invoice_jobs` e `invoices` abren lectura sólo para OA/SA vía nuevas policies `*_select_org_admin` / `*_select_platform_admin`, y la view `v_sale_fiscal_invoice_admin` se expone con `security_invoker=true` para consulta del comprobante desde ventas.
- Identificación opcional de cliente en checkout POS agregada en `supabase/migrations/20260310160500_087_pos_sale_client_link.sql`: `sales` incorpora `client_id`, `rpc_create_sale` valida que el cliente pertenezca a la org y las views de ventas exponen `client_name/client_phone` sin abrir nuevas policies.
- Historial de ventas del cliente agregado en `supabase/migrations/20260310190000_089_client_sales_history.sql`: `rpc_get_client_sales_history` usa `security definer`, exige módulo `clients` para staff y restringe resultados a branches con membership activa, evitando depender del `select` org-wide sobre `sales`.
- Lifecycle de links compartibles agregado en `supabase/migrations/20260310193000_090_sale_delivery_link_lifecycle.sql`: `sale_delivery_links` suma metadata mínima de compartido y nuevas RPCs `rpc_list_sale_delivery_links`, `rpc_revoke_sale_delivery_link`, `rpc_regenerate_sale_delivery_link`, `rpc_mark_sale_delivery_link_shared`, todas autenticadas y restringidas a miembros de la org de la venta.
- Observabilidad de delivery agregada en `supabase/migrations/20260310195500_091_sale_delivery_events_observability.sql`: `sale_delivery_events` registra `shared/revoked/regenerated/opened` por documento/canal y se expone vía RPC autenticada `rpc_list_sale_delivery_events`, mientras el append se centraliza en `rpc_append_sale_delivery_event`.
- Onboarding de datos maestros agregado en `supabase/migrations/20260222001000_053_data_onboarding_jobs_tasks.sql` (`data_import_jobs`, `data_import_rows`, `v_data_onboarding_tasks` y RPCs de importación/validación/aplicación).
- Resolver de productos incompletos para onboarding agregado en `supabase/migrations/20260224201000_057_onboarding_products_incomplete_view.sql` (`v_products_incomplete_admin` con `security_invoker=true`; respeta RLS existente de `products` y `supplier_products`).
- `supplier_products.supplier_price` agregado en `supabase/migrations/20260225111500_058_supplier_product_price.sql` junto con extensión de `rpc_upsert_supplier_product` y `v_supplier_detail_admin` (sin cambios de policy; reusa RLS existente de `supplier_products`).
- Proveedores incorporan `% ganancia sugerida` en `supabase/migrations/20260222013000_054_supplier_default_markup_pct.sql` (sin cambios de policy; reusa RLS existente sobre `suppliers` y validación en `rpc_upsert_supplier`).
- Estadísticas de ventas agregadas en `supabase/migrations/20260222123000_056_sales_statistics_view.sql` (`v_sales_statistics_items` con `security_invoker=true`).
- Conciliación operativa de caja con captura de comprobantes por fila y agregado MercadoPago total en `supabase/migrations/20260220153000_047_cashbox_reconciliation_inputs.sql` (`cash_session_reconciliation_inputs`, `rpc_get_cash_session_reconciliation_rows`, `rpc_upsert_cash_session_reconciliation_inputs`).
- Ajuste de conciliación para incluir fila `Efectivo esperado total (caja + reserva)` en `supabase/migrations/20260220170000_048_cashbox_reconciliation_include_cash_expected.sql`.
- Ajuste de conciliación para clasificar `MercadoPago (total)` solo por método de pago (no por proveedor de dispositivo) en `supabase/migrations/20260220182000_049_cashbox_reconciliation_mp_by_method_only.sql`.
- `org_preferences.default_supplier_markup_pct` agregado en `supabase/migrations/20260301123000_062_org_preferences_default_supplier_markup_pct.sql` (sin cambios de policy; reusa RLS existente de `org_preferences`).
- Plantillas de ticket por sucursal agregadas en `supabase/migrations/20260301143000_063_branch_ticket_templates.sql` (`branches.ticket_header_text`, `branches.ticket_footer_text`, `branches.fiscal_ticket_note_text`, extensión de `v_branches_admin`; sin cambios de policy, reusa RLS existente de `branches`).
- Configuración de layout de impresión por sucursal agregada en `supabase/migrations/20260301170200_067_branch_ticket_print_layout.sql` (`branches.ticket_paper_width_mm`, `ticket_margin_*_mm`, `ticket_font_size_px`, `ticket_line_height`, extensión de `v_branches_admin`; sin cambios de policy, reusa RLS existente de `branches`).
- Hardening de membresía de usuarios en `supabase/migrations/20260301162000_064_users_membership_rpcs_auth_context.sql`: `rpc_invite_user_to_org` y `rpc_update_user_membership` pasan a `security definer`, exigen sesión autenticada OA/SA (`is_org_admin_or_superadmin`), validan rol/sucursales y auditan con actor real (`auth.uid()`).
- Hotfix producción en `supabase/migrations/20260301170000_065_fix_rpc_invite_user_to_org_ambiguous_user_id.sql` y `supabase/migrations/20260301171500_066_fix_rpc_invite_user_to_org_out_param_conflict.sql`: se corrige error SQL `42702` en `rpc_invite_user_to_org` (ambigüedad `user_id`) para restablecer altas de usuarios desde settings/superadmin.
- Fundación DB de canal online en `supabase/migrations/20260301213000_068_online_store_foundation.sql`: nuevas tablas `storefront_*` y `online_orders*`, slugs públicos en `orgs/branches`, y RPCs públicas `rpc_get_public_storefront_branches`, `rpc_get_public_storefront_products`, `rpc_create_online_order`, `rpc_get_online_order_tracking`.
- Bucket de comprobantes online en `supabase/migrations/20260302101500_069_online_order_proofs_storage_bucket.sql`: `storage.buckets.online-order-proofs` + policies `online_order_proofs_*` en `storage.objects` (select para miembros de org, write admin/superadmin).
- Bucket de imágenes de producto en `supabase/migrations/20260303134000_074_product_images_bucket_and_products_view_image.sql`: `storage.buckets.product-images` (público) + policies `product_images_*` en `storage.objects` (write/delete solo OA/SA por `org_id` en path).
- Hardening anti-duplicado de productos en `supabase/migrations/20260305113000_075_products_dedupe_hardening.sql`: agrega `name_normalized`/`barcode_normalized` + índices únicos por org y ajusta `rpc_upsert_product` para normalizar códigos vacíos a `null` (sin cambios de policies RLS).
- Compra por paquete en productos en `supabase/migrations/20260305130500_076_products_purchase_pack_and_orders_views.sql`: agrega campos en `products` y vistas operativas (`v_products_admin`, `v_products_incomplete_admin`, `v_supplier_product_suggestions`, `v_order_detail_admin`) sin cambios de policies RLS.
- Categorías por hashtags en productos en `supabase/migrations/20260311121000_093_product_category_tags_storefront.sql`: agrega `products.category_tags`, extiende `v_products_admin`, `v_products_incomplete_admin`, `v_order_detail_admin` y `rpc_get_public_storefront_products`; sin cambios de policies RLS, reusa permisos existentes sobre `products` y storefront público.
- Fix de unicidad en cambio de proveedor primario/secundario en `supabase/migrations/20260305152000_077_fix_supplier_product_promote_same_supplier.sql`: `rpc_upsert_supplier_product` limpia relación opuesta del mismo proveedor/producto antes del upsert (sin cambios de policies RLS).
- Transferencia inline de stock entre sucursales en `supabase/migrations/20260310093011_086_stock_branch_transfer_inline.sql`: agrega `stock_movement_type.branch_transfer` y RPC `rpc_transfer_stock_between_branches` como `security definer`, con validación explícita de módulo `products`, memberships de sucursal y stock suficiente en origen.
- Iteración checkout/tracking online en `supabase/migrations/20260302121000_070_online_store_checkout_tracking_iteration.sql`: checkout público requiere dirección y fija `pay_on_pickup`; WhatsApp de tienda configurable por sucursal (`branches.storefront_whatsapp_phone`).
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

| Entidad                              | SA                   | OA                   | ST                            | Notas                                                                  |
| ------------------------------------ | -------------------- | -------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `orgs`                               | read                 | read                 | no                            | SA global; OA solo su org                                              |
| `branches`                           | read/insert/update   | read/insert/update   | read (solo asignadas)         | ST solo lectura de sus branches                                        |
| `org_users`                          | read/insert/update   | read/insert/update   | no                            | Gestion de usuarios                                                    |
| `platform_admins`                    | read/insert/update   | no                   | no                            | SA global (tabla propia de plataforma)                                 |
| `user_active_orgs`                   | read/insert/update   | read/insert/update   | read/insert/update            | Contexto de org activa por usuario                                     |
| `branch_memberships`                 | read/insert/update   | read/insert/update   | read (propias)                | ST ve sus asignaciones                                                 |
| `staff_module_access`                | read/insert/update   | read/insert/update   | no                            | ST usa view efectiva                                                   |
| `org_preferences`                    | read/insert/update   | read/insert/update   | read (propia org)             | ST solo lectura si se expone                                           |
| `employee_accounts`                  | read/insert/update   | read/insert/update   | read (sucursal asignada)      | OA/SA gestionan nombres; ST solo selección en POS                      |
| `data_import_jobs`                   | read/insert/update   | read/insert/update   | no                            | Jobs de importación onboarding solo OA/SA                              |
| `data_import_rows`                   | read/insert/update   | read/insert/update   | no                            | Filas por job con errores/validación solo OA/SA                        |
| `audit_log`                          | read                 | read                 | no                            | Append-only, solo lectura OA/SA                                        |
| `products`                           | read/insert/update   | read/insert/update   | read                          | ST sin escritura de catálogo; `/products` lectura si módulo `products` |
| `stock_items`                        | read/insert/update   | read/insert/update   | read                          | ST sin ajuste manual directo; transferencias solo vía RPC              |
| `stock_movements`                    | read                 | read/insert          | insert (via RPC)              | ST puede generar `branch_transfer` vía RPC autorizada                  |
| `sales`                              | read                 | read/insert/update   | insert/update (via RPC)       | ST crea ventas y puede marcarlas facturadas via RPC                    |
| `v_sales_statistics_items`           | read                 | read                 | no                            | View analítica de ventas (OA/SA)                                       |
| `sale_payments`                      | read                 | read/insert          | insert (via RPC)              | Desglose de cobro por método                                           |
| `pos_payment_devices`                | read/insert/update   | read/insert/update   | read/insert/update            | Catálogo de dispositivos de cobro por sucursal                         |
| `cash_sessions`                      | read                 | read/insert/update   | insert/update (via RPC)       | Caja por sucursal (1 abierta por vez)                                  |
| `cash_session_movements`             | read                 | read/insert          | insert (via RPC)              | Gastos/ingresos manuales de caja                                       |
| `cash_session_count_lines`           | read                 | read/insert          | insert (via RPC)              | Conteo por denominaciones (apertura/cierre, caja/reserva)              |
| `cash_session_reconciliation_inputs` | read                 | read/insert/update   | insert/update (via RPC)       | Montos de comprobante por fila de conciliación                         |
| `sale_items`                         | read                 | read/insert          | insert (via RPC)              | derivado de venta                                                      |
| `expiration_batches`                 | read/insert/update   | read/insert/update   | read/insert (si modulo)       | ST sin ajustes avanzados                                               |
| `expiration_waste`                   | read                 | read/insert          | read (via view/RPC)           | Registro de desperdicio                                                |
| `suppliers`                          | read/insert/update   | read/insert/update   | no                            | ST sin acceso                                                          |
| `supplier_products`                  | read/insert/update   | read/insert/update   | no                            | ST sin acceso (incluye `supplier_price`)                               |
| `supplier_orders`                    | read/insert/update   | read/insert/update   | no                            | ST no en MVP                                                           |
| `supplier_order_items`               | read/insert/update   | read/insert/update   | no                            | ST no en MVP                                                           |
| `supplier_payment_accounts`          | read/insert/update   | read/insert/update   | no                            | Cuentas de transferencia por proveedor                                 |
| `supplier_payables`                  | read/insert/update   | read/insert/update   | no                            | Cuenta por pagar por pedido (scope sucursal)                           |
| `supplier_payments`                  | read/insert/update   | read/insert/update   | no                            | Movimientos de pago proveedor                                          |
| `storage.objects` (`product-images`) | insert/update/delete | insert/update/delete | no                            | Imágenes de producto por org (`org_id/product_id.jpg`)                 |
| `storefront_settings`                | read/insert/update   | read/insert/update   | read                          | Configuración de storefront por org                                    |
| `storefront_domains`                 | read/insert/update   | read/insert/update   | no                            | Dominios personalizados de tienda                                      |
| `online_orders`                      | read/insert/update   | read/insert/update   | read/insert/update (limitado) | Pedidos online por org/sucursal                                        |
| `online_order_items`                 | read/insert/update   | read/insert/update   | read/insert/update (limitado) | Ítems snapshot de pedido online                                        |
| `online_order_status_history`        | read/insert/update   | read/insert/update   | read/insert (limitado)        | Historial de estados de pedido online                                  |
| `online_order_tracking_tokens`       | read/insert/update   | read/insert/update   | read/insert/update (limitado) | Token público de tracking                                              |
| `online_order_payment_proofs`        | read/insert/update   | read/insert/update   | read/insert/update (limitado) | Comprobantes de transferencia/QR                                       |
| `sale_delivery_links`                | read/insert/update   | read/insert/update   | read/insert/update (limitado) | Links públicos revocables para ticket/factura de venta                 |
| `sale_delivery_events`               | read/insert          | read/insert          | read/insert (limitado)        | Historial operativo de compartidos y aperturas de links                |
| `clients`                            | read/insert/update   | read/insert/update   | read/insert/update (limitado) | ST solo en branch asignada                                             |
| `client_special_orders`              | read/insert/update   | read/insert/update   | read/insert/update (limitado) | ST solo su branch                                                      |
| `client_special_order_items`         | read/insert/update   | read/insert/update   | read/insert/update (limitado) | ST solo su branch                                                      |

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
- Aunque `is_platform_admin` sigue definiendo el scope SA real, desde migración `085` los SA quedan además materializados en `org_users` como `org_admin` para compatibilidad con flujos heredados.
- `audit_log` es append-only; solo OA/SA pueden leer; insercion solo via RPCs/triggers con `security definer`.

---

## Endpoints criticos que deben validar modulos

- `rpc_create_sale` -> requiere modulo `pos` habilitado, permite pagos divididos (`payments`), descuento cash solo en pago 100% efectivo y descuento empleado con cuenta activa de la sucursal.
  - acepta `p_client_id` opcional; si viene informado debe pertenecer a la org activa y estar activo.
  - valida política de combinación entre descuento cash y empleado desde `org_preferences.employee_discount_combinable_with_cash_discount`.
  - para `card` y `mercadopago` exige `payment_device_id` válido en la sucursal.
- `rpc_mark_sale_invoiced` -> OA/SA y ST con módulo `pos` habilitado (en sucursal de la venta); marca la venta como facturada y audita `sale_marked_invoiced`.
- `rpc_enqueue_sale_fiscal_invoice` -> OA/SA y ST con módulo `pos` habilitado (en sucursal de la venta); crea `sale_document` fiscal, encola `invoice_job` con payload normalizado y audita `sale_invoice_job_enqueued`. En ambiente `prod` exige además `org_preferences.fiscal_prod_enqueue_enabled=true`.
- `v_sale_fiscal_invoice_admin` -> sólo OA/SA; expone CAE, estado de render y rutas del comprobante fiscal sin habilitar escritura.
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
- `rpc_transfer_stock_between_branches` -> OA/SA y ST con módulo `products`
  habilitado, 2+ sucursales asignadas activas y ambas sucursales dentro de sus
  memberships; valida origen != destino y stock suficiente en origen.
- `rpc_set_safety_stock` -> solo OA.
- `rpc_create_supplier_order` y derivados -> solo OA.
- `rpc_set_supplier_order_archived` -> solo OA/SA en org activa; solo permite archivar o restaurar pedidos con `status='draft'`.
- `rpc_update_supplier_payable` y `rpc_register_supplier_payment` -> solo OA/SA en org activa.
  - `rpc_register_supplier_payment` con método `cash` agrega egreso automático en sesión abierta de caja.
- `rpc_create_special_order` -> OA o ST con modulo `clients` habilitado.
- `rpc_get_client_sales_history` -> OA/SA y ST con modulo `clients` habilitado; para staff sólo devuelve ventas de branches donde tiene membership activa.
- `rpc_create_data_import_job` -> solo OA/SA en org activa; crea job de onboarding.
- `rpc_upsert_data_import_row` -> solo OA/SA en org activa; registra o corrige filas de job.
- `rpc_validate_data_import_job` -> solo OA/SA en org activa; valida filas y calcula conteos.
- `rpc_apply_data_import_job` -> solo OA/SA en org activa; aplica filas válidas con upsert idempotente.
- `rpc_get_public_storefront_branches` -> público (anon/authenticated), lectura acotada a org activa con storefront habilitado.
- `rpc_get_public_storefront_products` -> público (anon/authenticated), lectura acotada a catálogo activo por slug org/sucursal.
- `rpc_create_online_order` -> público (anon/authenticated), crea pedido online en estado `pending` con validación de stock.
- `rpc_get_online_order_tracking` -> público (anon/authenticated), tracking por token activo/no expirado.
- `rpc_get_or_create_sale_delivery_link` -> autenticado miembro de org; crea o reutiliza token activo por venta/documento y valida factura lista para `sale_invoice`.
- `rpc_list_sale_delivery_links` -> autenticado miembro de org; devuelve el último estado por documento compartible de la venta.
- `rpc_revoke_sale_delivery_link` -> autenticado miembro de org; revoca el link activo vigente de ticket/factura.
- `rpc_regenerate_sale_delivery_link` -> autenticado miembro de org; rota el token vigente y crea un nuevo link activo.
- `rpc_mark_sale_delivery_link_shared` -> autenticado miembro de org; registra metadata mínima de compartido asistido por canal.
- `rpc_append_sale_delivery_event` -> autenticado miembro de org; registra evento operativo de `shared/revoked/regenerated/opened`.
- `rpc_list_sale_delivery_events` -> autenticado miembro de org; devuelve historial reciente de delivery por venta.
- `rpc_get_sale_ticket_delivery` -> público (anon/authenticated), ticket no fiscal por token activo/no expirado.
- `rpc_get_sale_invoice_delivery` -> público (anon/authenticated), factura fiscal por token activo/no expirado sólo si está autorizada y con render `completed`.
- `rpc_set_online_order_status` -> autenticado miembro de org, con transiciones válidas y auditoría `online_order_status_set`.
- Carga pública de comprobante en `/o/:trackingToken` (server action): valida token activo/no expirado, sube a `online-order-proofs` con service role e inserta en `online_order_payment_proofs` para revisión interna.
- `rpc_superadmin_create_org` -> solo SA global.
- `rpc_superadmin_upsert_branch` -> solo SA global.
- `rpc_superadmin_set_active_org` -> solo SA global.
- `rpc_invite_user_to_org` -> solo OA/SA autenticado para la org destino; requiere branches válidas para `staff`.
- `rpc_update_user_membership` -> solo OA/SA autenticado para la org destino; exige al menos 1 branch para `staff` y limpia/reasigna membresías de sucursal de forma atómica.
