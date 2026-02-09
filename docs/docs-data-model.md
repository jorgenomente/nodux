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
- `special_order_status`: `pending` | `ordered` | `received` | `delivered`
- `payment_method`: `cash` | `debit` | `credit` | `transfer` | `other`
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
- `total_amount` (numeric)
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
- `source_type` (text)
- `source_ref_id` (uuid, nullable)
- `created_at`, `updated_at`

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
- `status` (special_order_status)
- `created_by` (uuid, FK -> auth.users.id)
- `created_at`, `updated_at`

---

## Views y RPCs (resumen)

Ver contratos en `docs/docs-schema-model.md`:

- Views de lectura por pantalla (dashboard, products, suppliers, orders, expirations, settings)
- RPCs para escrituras (POS, stock, orders, permissions, clients)
