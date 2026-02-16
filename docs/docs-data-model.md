# Modelo de Datos (vivo)

Este documento describe el modelo de datos **propuesto para el MVP** y debe mantenerse sincronizado con el schema real cuando existan migraciones.

Estado actual:

- Existe migracion inicial en `supabase/migrations/20260208213000_001_init_schema.sql`.
- Fix de helpers RLS en `supabase/migrations/20260208220000_002_rls_helpers.sql`.
- Views en `supabase/migrations/20260208221000_003_views.sql`.
- RPCs en `supabase/migrations/20260208222000_004_rpcs.sql`.
- Ajuste RPC product upsert en `supabase/migrations/20260208230000_005_rpc_upsert_product_nullable.sql`.
- RPC staff effective modules en `supabase/migrations/20260208234000_006_rpc_staff_effective_modules.sql`.
- Audit log + instrumentacion RPCs en `supabase/migrations/20260209040000_008_audit_log.sql`.
- View suppliers con products_count en `supabase/migrations/20260209150000_010_view_suppliers_products_count.sql`.
- Proveedores: frecuencia de pedido, relacion primaria/secundaria y safety stock en `supabase/migrations/20260209170000_011_suppliers_frequency_safety_stock.sql`.
- RPC safety stock en `supabase/migrations/20260209173000_012_safety_stock_rpc.sql`.
- RPC suppliers con schedule en `supabase/migrations/20260209174000_013_rpc_upsert_supplier_schedule.sql`.
- Views suppliers con schedule en `supabase/migrations/20260209175000_014_view_suppliers_schedule.sql`.
- Shelf life days producto en `supabase/migrations/20260209180000_015_products_shelf_life_days.sql`.
- RPC product shelf life en `supabase/migrations/20260209181000_016_rpc_upsert_product_shelf_life.sql`.
- View products con shelf life en `supabase/migrations/20260209182000_017_view_products_admin_shelf_life.sql`.
- Vencimientos con cantidad > 0 en `supabase/migrations/20260209183000_018_expirations_due_quantity_filter.sql`.
- Recepcion de pedido crea batches en `supabase/migrations/20260209184000_019_receive_order_create_batches.sql`.
- Ventas consumen batches FEFO en `supabase/migrations/20260209185000_020_create_sale_consume_batches.sql`.
- RPC correccion fecha vencimiento en `supabase/migrations/20260210110000_022_expiration_batch_update_date.sql`.
- Batch code por recepcion en `supabase/migrations/20260210113000_023_expiration_batch_code.sql`.
- Enum status pedidos especiales en `supabase/migrations/20260210133000_023_special_order_status_extend.sql`.
- Items de pedidos especiales en `supabase/migrations/20260210140000_024_clients_special_orders_items.sql`.
- RPC ventas con security definer en `supabase/migrations/20260211095500_025_rpc_create_sale_security_definer.sql`.
- Fix created_at ambiguo en `supabase/migrations/20260211103000_026_rpc_create_sale_orderby_fix.sql`.
- Desperdicio de vencidos en `supabase/migrations/20260211140000_027_expiration_waste.sql`.
- Fecha estimada de recepcion en pedidos de proveedor en `supabase/migrations/20260213101500_029_supplier_orders_expected_receive_on.sql`.
- Cierre de gaps de auditoria en proveedores/pedidos (upsert supplier, expected receive y recepcion-control) en `supabase/migrations/20260213125000_030_audit_gaps_supplier_orders.sql`.
- Fundacion Superadmin plataforma (admins globales, vistas/rpcs de org y org activa) en `supabase/migrations/20260216115100_031_superadmin_platform_foundation.sql`.
- Hardening de alta org SA: `rpc_superadmin_create_org` exige owner y evita org huérfana en `supabase/migrations/20260216124000_032_superadmin_create_org_owner_required.sql`.
- Descuento en efectivo en POS + métricas dashboard + auditoría de preferencias en `supabase/migrations/20260216150000_033_cash_discount_pos_dashboard_audit.sql`.
- Split payments en POS en `supabase/migrations/20260216163000_034_split_payments_enum.sql` y `supabase/migrations/20260216164000_035_split_payments_pos.sql`.
- Módulo Caja por sucursal (apertura, movimientos y cierre) en `supabase/migrations/20260216171000_036_cashbox_branch_sessions.sql`.
- Cierre de caja con firma y conteo por denominaciones en `supabase/migrations/20260216182000_037_cashbox_close_signature_denominations.sql`.
- `docs/schema.sql` actualizado desde DB local.
- `types/supabase.ts` actualizado desde DB local.

**Fuente de verdad:** `supabase/migrations` + `docs/schema.sql` + `types/supabase.ts`.

---

## Convenciones

- Tablas y columnas en `snake_case`.
- Entidades operativas incluyen `org_id` y, cuando aplica, `branch_id`.
- `created_at` y `updated_at` en UTC con `timestamptz`.
- Soft delete usando `is_active` donde aplique.

---

## Enums (MVP)

- `user_role`: `superadmin` | `org_admin` | `staff`
- `sell_unit_type`: `unit` | `weight` | `bulk`
- `stock_movement_type`: `sale` | `purchase` | `manual_adjustment` | `expiration_adjustment`
- `supplier_order_status`: `draft` | `sent` | `received` | `reconciled`
- `special_order_status`: `pending` | `ordered` | `partial` | `delivered` | `cancelled`
- `payment_method`: `cash` | `debit` | `credit` | `transfer` | `other` | `mixed`
- `order_frequency`: `weekly` | `biweekly` | `every_3_weeks` | `monthly`
- `weekday`: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun`
- `supplier_product_relation_type`: `primary` | `secondary`

---

## Tablas (core)

### orgs

**Proposito**: organizaciones (tenants).

**Campos clave**:

- `id` (uuid, PK)
- `name` (text)
- `timezone` (text, default 'UTC')
- `is_active` (boolean)
- `created_at`, `updated_at`

---

### branches

**Proposito**: sucursales por organizacion.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK -> orgs.id)
- `name` (text)
- `address` (text, nullable)
- `is_active` (boolean)
- `created_at`, `updated_at`

**Constraints**:

- unique (`org_id`, `name`)

---

### org_users

**Proposito**: membresia y rol dentro de la organizacion.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `user_id` (uuid, FK -> auth.users.id)
- `role` (user_role)
- `display_name` (text, nullable)
- `is_active` (boolean)
- `created_at`, `updated_at`

**Constraints**:

- unique (`org_id`, `user_id`)

---

### platform_admins

**Proposito**: administradores globales de la plataforma (fuera del scope de una org).

**Campos clave**:

- `user_id` (uuid, PK/FK -> auth.users.id)
- `created_at` (timestamptz)
- `created_by` (uuid, nullable FK -> auth.users.id)

---

### user_active_orgs

**Proposito**: contexto de org activa por usuario (principalmente para impersonacion de SA).

**Campos clave**:

- `user_id` (uuid, PK/FK -> auth.users.id)
- `active_org_id` (uuid, FK -> orgs.id)
- `updated_at` (timestamptz)

---

### branch_memberships

**Proposito**: asignacion de staff a sucursales.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `user_id` (uuid, FK)
- `is_active` (boolean)
- `created_at`, `updated_at`

**Constraints**:

- unique (`org_id`, `branch_id`, `user_id`)

---

### staff_module_access

**Proposito**: habilitacion de modulos para Staff (org-wide o por sucursal).

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, nullable FK) -- NULL = org-wide
- `role` (user_role, default 'staff')
- `module_key` (text)
- `is_enabled` (boolean)
- `created_at`, `updated_at`

**Constraints**:

- unique (`org_id`, `branch_id`, `role`, `module_key`)

---

### org_preferences

**Proposito**: parametros simples por organizacion.

**Campos clave**:

- `org_id` (uuid, PK, FK)
- `critical_days` (int)
- `warning_days` (int)
- `allow_negative_stock` (boolean)
- `cash_discount_enabled` (boolean)
- `cash_discount_default_pct` (numeric 0..100)
- `created_at`, `updated_at`

---

### audit_log

**Proposito**: registro append-only de acciones importantes dentro de la organizacion.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `actor_user_id` (uuid, FK -> auth.users.id)
- `branch_id` (uuid, nullable FK)
- `action_key` (text)
- `entity_type` (text)
- `entity_id` (uuid, nullable)
- `metadata` (jsonb, nullable)
- `created_at`

---

### products

**Proposito**: catalogo de productos.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `name` (text)
- `internal_code` (text, nullable)
- `barcode` (text, nullable)
- `sell_unit_type` (sell_unit_type)
- `uom` (text)
- `unit_price` (numeric)
- `shelf_life_days` (int, nullable)
- `is_active` (boolean)
- `created_at`, `updated_at`

**Constraints**:

- unique (`org_id`, `internal_code`) where internal_code is not null
- unique (`org_id`, `barcode`) where barcode is not null

---

### stock_items

**Proposito**: stock por sucursal y producto.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `product_id` (uuid, FK)
- `quantity_on_hand` (numeric)
- `safety_stock` (numeric, default 0)
- `updated_at`

**Constraints**:

- unique (`org_id`, `branch_id`, `product_id`)

---

### stock_movements

**Proposito**: movimientos de stock append-only.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `product_id` (uuid, FK)
- `movement_type` (stock_movement_type)
- `quantity_delta` (numeric)
- `reason` (text, nullable)
- `source_type` (text, nullable)
- `source_id` (uuid, nullable)
- `expiration_batch_id` (uuid, nullable)
- `created_at`

---

### sales

**Proposito**: ventas POS.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `created_by` (uuid, FK -> auth.users.id)
- `payment_method` (payment_method)
- `subtotal_amount` (numeric)
- `discount_amount` (numeric)
- `discount_pct` (numeric 0..100)
- `total_amount` (numeric)
- `created_at`

---

### sale_payments

**Proposito**: desglose de cobro por método para soportar pagos divididos.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `sale_id` (uuid, FK -> sales.id)
- `payment_method` (payment_method, no permite `mixed`)
- `amount` (numeric > 0)
- `created_at`

---

### cash_sessions

**Proposito**: sesión de caja por sucursal (apertura/cierre por turno o día).

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `opened_by` (uuid, FK auth.users)
- `closed_by` (uuid, nullable FK auth.users)
- `period_type` (`shift` | `day`)
- `session_label` (text, nullable)
- `status` (`open` | `closed`)
- `opening_cash_amount` (numeric >= 0)
- `expected_cash_amount` (numeric, nullable)
- `counted_cash_amount` (numeric, nullable)
- `difference_amount` (numeric, nullable)
- `close_note` (text, nullable)
- `closed_controlled_by_name` (text, nullable)
- `close_confirmed` (boolean)
- `opened_at`, `closed_at`, `created_at`, `updated_at`

**Constraints**:

- solo 1 caja abierta por (`org_id`, `branch_id`) mediante índice parcial.

---

### cash_session_movements

**Proposito**: gastos/ingresos manuales de caja asociados a una sesión abierta.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `session_id` (uuid, FK -> cash_sessions.id)
- `movement_type` (`expense` | `income`)
- `category_key` (text)
- `amount` (numeric > 0)
- `note` (text, nullable)
- `movement_at` (timestamptz)
- `created_by` (uuid, FK auth.users)
- `created_at`

---

### cash_session_count_lines

**Proposito**: desglose del conteo físico por denominación al cierre de caja.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `session_id` (uuid, FK -> cash_sessions.id)
- `denomination_value` (numeric > 0)
- `quantity` (int >= 0)
- `created_at`

---

### sale_items

**Proposito**: items de una venta.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `sale_id` (uuid, FK)
- `product_id` (uuid, FK)
- `product_name_snapshot` (text)
- `unit_price_snapshot` (numeric)
- `quantity` (numeric)
- `line_total` (numeric)

---

### expiration_batches

**Proposito**: lotes con vencimiento por sucursal.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `product_id` (uuid, FK)
- `expires_on` (date)
- `quantity` (numeric)
- `batch_code` (text, nullable) — prefijo proveedor + fecha recepcion + secuencia
- `source_type` (text)
- `source_ref_id` (uuid, nullable)
- `created_at`, `updated_at`

---

### expiration_waste

**Proposito**: registro de desperdicio por vencimiento.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `product_id` (uuid, FK)
- `batch_id` (uuid, FK, nullable)
- `quantity` (numeric)
- `unit_price_snapshot` (numeric)
- `total_amount` (numeric)
- `created_by` (uuid, FK auth.users)
- `created_at`

---

### suppliers

**Proposito**: proveedores por organizacion.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `name` (text)
- `contact_name` (text, nullable)
- `phone` (text, nullable)
- `email` (text, nullable)
- `notes` (text, nullable)
- `is_active` (boolean)
- `order_frequency` (order_frequency, nullable)
- `order_day` (weekday, nullable)
- `receive_day` (weekday, nullable)
- `created_at`, `updated_at`

---

### supplier_products

**Proposito**: relacion producto-proveedor.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `supplier_id` (uuid, FK)
- `product_id` (uuid, FK)
- `supplier_sku` (text, nullable)
- `supplier_product_name` (text, nullable)
- `default_purchase_uom` (text, nullable)
- `relation_type` (supplier_product_relation_type, default 'primary')
- `created_at`

**Constraints**:

- unique (`org_id`, `supplier_id`, `product_id`)
- unique (`org_id`, `product_id`, `relation_type`)

---

### supplier_orders

**Proposito**: pedidos a proveedor.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `supplier_id` (uuid, FK)
- `status` (supplier_order_status)
- `notes` (text, nullable)
- `created_by` (uuid, FK -> auth.users.id)
- `created_at`, `updated_at`
- `sent_at`, `received_at`, `reconciled_at` (timestamptz, nullable)
- `expected_receive_on` (date, nullable)
- `controlled_by_user_id` (uuid, FK -> auth.users.id, nullable)
- `controlled_by_name` (text, nullable)

---

### supplier_order_items

**Proposito**: items de pedido a proveedor.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `order_id` (uuid, FK)
- `product_id` (uuid, FK)
- `ordered_qty` (numeric)
- `received_qty` (numeric)
- `unit_cost` (numeric, nullable)
- `created_at`

**Constraints**:

- unique (`order_id`, `product_id`)

---

### clients

**Proposito**: clientes de la organizacion.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `name` (text)
- `phone` (text, nullable)
- `email` (text, nullable)
- `notes` (text, nullable)
- `is_active` (boolean)
- `created_at`, `updated_at`

---

### client_special_orders

**Proposito**: pedidos especiales por cliente.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `client_id` (uuid, FK)
- `description` (text)
- `quantity` (numeric, nullable)
- `notes` (text, nullable)
- `status` (special_order_status)
- `created_by` (uuid, FK -> auth.users.id)
- `created_at`, `updated_at`

---

### client_special_order_items

**Proposito**: items de pedidos especiales por cliente.

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `special_order_id` (uuid, FK)
- `product_id` (uuid, FK)
- `supplier_id` (uuid, nullable FK)
- `supplier_order_id` (uuid, nullable FK)
- `requested_qty` (numeric)
- `fulfilled_qty` (numeric)
- `is_ordered` (boolean)
- `ordered_at` (timestamptz, nullable)
- `created_at`, `updated_at`

---

## Views y RPCs (resumen)

Ver contratos en `docs/docs-schema-model.md`:

- Views de lectura por pantalla (dashboard, products, suppliers, orders, expirations, settings)
- View de caja operativa: `v_cashbox_session_current`
- Views de superadmin global: `v_superadmin_orgs`, `v_superadmin_org_detail`
- RPCs para escrituras (POS, stock, orders, permissions, clients)
- RPCs de caja: `rpc_open_cash_session(...)`, `rpc_add_cash_session_movement(...)`, `rpc_get_cash_session_summary(...)`, `rpc_close_cash_session(...)`
- RPC de fechas estimadas de pedidos proveedor: `rpc_set_supplier_order_expected_receive_on(...)`
- RPC de auditoria append-only: `rpc_log_audit_event(...)`
- RPCs de superadmin: `rpc_bootstrap_platform_admin(...)`, `rpc_superadmin_create_org(...)`, `rpc_superadmin_upsert_branch(...)`, `rpc_superadmin_set_active_org(...)`, `rpc_get_active_org_id(...)`
