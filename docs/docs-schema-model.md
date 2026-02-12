# Modelo de Schema DB — Baseline Propuesto (MVP)

Estado: **baseline**. Este documento define una base de datos mínima coherente con los contratos de pantalla y módulos del MVP.

> Nota: ya existe una migracion inicial en `supabase/migrations/20260208213000_001_init_schema.sql`. Views y RPCs siguen pendientes y se agregaran en migraciones posteriores.

---

## Estado de implementacion (DB)

**Views (lectura)**:

- [x] `v_dashboard_admin`
- [x] `v_products_admin`
- [x] `v_stock_by_branch`
- [x] `v_pos_product_catalog`
- [x] `v_products_typeahead_admin`
- [x] `v_suppliers_admin`
- [x] `v_supplier_detail_admin`
- [x] `v_orders_admin`
- [x] `v_order_detail_admin`
- [x] `v_expirations_due`
- [x] `v_expiration_batch_detail`
- [x] `v_expirations_expired`
- [x] `v_expiration_waste_summary`
- [x] `v_expiration_waste_detail`
- [x] `v_settings_users_admin`
- [x] `v_branches_admin`
- [x] `v_staff_effective_modules`
- [x] `v_audit_log_admin`

**RPCs (escritura/lectura)**:

- [x] `rpc_upsert_product`
- [x] `rpc_adjust_stock_manual`
- [x] `rpc_create_sale`
- [x] `rpc_upsert_supplier`
- [x] `rpc_upsert_supplier_product`
- [x] `rpc_remove_supplier_product`
- [x] `rpc_create_supplier_order`
- [x] `rpc_upsert_supplier_order_item`
- [x] `rpc_remove_supplier_order_item`
- [x] `rpc_set_supplier_order_status`
- [x] `rpc_receive_supplier_order`
- [x] `rpc_reconcile_supplier_order`
- [x] `rpc_create_expiration_batch_manual`
- [x] `rpc_adjust_expiration_batch`
- [x] `rpc_upsert_client`
- [x] `rpc_move_expiration_batch_to_waste`
- [x] `rpc_create_special_order`
- [x] `rpc_set_special_order_status`
- [x] `rpc_invite_user_to_org`
- [x] `rpc_update_user_membership`
- [x] `rpc_upsert_branch`
- [x] `rpc_get_staff_module_access`
- [x] `rpc_set_staff_module_access`
- [x] `rpc_list_clients`
- [x] `rpc_get_client_detail`
- [x] `rpc_get_dashboard_admin`
- [x] `rpc_get_staff_effective_modules`
- [x] `rpc_log_audit_event`
- [x] `rpc_set_safety_stock`

---

## 1) Convenciones

- Tablas y columnas en `snake_case`.
- Todas las entidades operativas incluyen `org_id` y, cuando aplica, `branch_id`.
- `created_at` y `updated_at` en UTC con `timestamptz`.
- Soft-delete: usar `is_active` donde sea necesario (no borrar filas históricas).

---

## 2) Enums (MVP)

- `user_role`: `superadmin` | `org_admin` | `staff`
- `sell_unit_type`: `unit` | `weight` | `bulk`
- `stock_movement_type`: `sale` | `purchase` | `manual_adjustment` | `expiration_adjustment`
- `supplier_order_status`: `draft` | `sent` | `received` | `reconciled`
- `special_order_status`: `pending` | `ordered` | `partial` | `delivered` | `cancelled`
- `payment_method`: `cash` | `debit` | `credit` | `transfer` | `other`
- `alert_severity` (si se materializa): `critical` | `warning` | `info`
- `order_frequency`: `weekly` | `biweekly` | `every_3_weeks` | `monthly`
- `weekday`: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun`
- `supplier_product_relation_type`: `primary` | `secondary`

---

## 3) Tablas (por dominio)

### 3.1 Organización y sucursales

**`orgs`**

- `id` (uuid, PK)
- `name` (text, required)
- `timezone` (text, default 'UTC')
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

**`branches`**

- `id` (uuid, PK)
- `org_id` (uuid, FK -> orgs.id)
- `name` (text, required)
- `address` (text, nullable)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

Constraints:

- unique (`org_id`, `name`)

### 3.2 Usuarios y membresías

**`org_users`** (membresía y rol)

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `user_id` (uuid, FK -> auth.users.id)
- `role` (user_role)
- `display_name` (text, nullable)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

Constraints:

- unique (`org_id`, `user_id`)

**`branch_memberships`** (asignación de Staff a sucursales)

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `user_id` (uuid, FK)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

Constraints:

- unique (`org_id`, `branch_id`, `user_id`)

### 3.3 Configuración y permisos por módulo

**`staff_module_access`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, nullable FK) -- NULL = org-wide
- `role` (user_role, default 'staff')
- `module_key` (text, required)
- `is_enabled` (boolean, default false)
- `created_at`, `updated_at`

Constraints:

- unique (`org_id`, `branch_id`, `role`, `module_key`)

**`org_preferences`** (parámetros simples)

- `org_id` (uuid, PK, FK)
- `critical_days` (int, default 3)
- `warning_days` (int, default 7)
- `allow_negative_stock` (boolean, default true)
- `created_at`, `updated_at`

**`audit_log`** (auditoría)

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `actor_user_id` (uuid, FK -> auth.users.id)
- `branch_id` (uuid, nullable FK)
- `action_key` (text, required)
- `entity_type` (text, required)
- `entity_id` (uuid, nullable)
- `metadata` (jsonb, nullable)
- `created_at` (timestamptz, default now())

### 3.4 Catálogo y stock

**`products`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `name` (text, required)
- `internal_code` (text, nullable)
- `barcode` (text, nullable)
- `sell_unit_type` (sell_unit_type)
- `uom` (text, required) -- unidad base (ej: kg)
- `unit_price` (numeric(12,2), default 0)
- `shelf_life_days` (int, nullable)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

Constraints:

- unique (`org_id`, `internal_code`) where internal_code is not null
- unique (`org_id`, `barcode`) where barcode is not null

**`stock_items`** (stock por sucursal)

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `product_id` (uuid, FK)
- `quantity_on_hand` (numeric(14,3), default 0)
- `safety_stock` (numeric(14,3), default 0)
- `updated_at`

Constraints:

- unique (`org_id`, `branch_id`, `product_id`)

**`stock_movements`** (append-only)

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `product_id` (uuid, FK)
- `movement_type` (stock_movement_type)
- `quantity_delta` (numeric(14,3), required) -- positivo/negativo
- `reason` (text, nullable)
- `source_type` (text, nullable) -- sale/order/manual/expiration
- `source_id` (uuid, nullable)
- `expiration_batch_id` (uuid, nullable)
- `created_at`

### 3.5 Ventas (POS)

**`sales`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `created_by` (uuid, FK -> auth.users.id)
- `payment_method` (payment_method)
- `total_amount` (numeric(12,2))
- `created_at`

**`sale_items`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `sale_id` (uuid, FK -> sales.id)
- `product_id` (uuid, FK)
- `product_name_snapshot` (text)
- `unit_price_snapshot` (numeric(12,2))
- `quantity` (numeric(14,3))
- `line_total` (numeric(12,2))

Constraints:

- unique (`sale_id`, `product_id`, `unit_price_snapshot`, `quantity`) (opcional)

### 3.6 Vencimientos

**`expiration_batches`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `product_id` (uuid, FK)
- `expires_on` (date)
- `quantity` (numeric(14,3))
- `batch_code` (text, nullable)
- `source_type` (text) -- purchase | manual | adjustment
- `source_ref_id` (uuid, nullable)
- `created_at`, `updated_at`

### 3.7 Proveedores y compras

**`suppliers`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `name` (text, required)
- `contact_name` (text, nullable)
- `phone` (text, nullable)
- `email` (text, nullable)
- `notes` (text, nullable)
- `is_active` (boolean, default true)
- `order_frequency` (order_frequency, nullable)
- `order_day` (weekday, nullable)
- `receive_day` (weekday, nullable)
- `created_at`, `updated_at`

**`supplier_products`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `supplier_id` (uuid, FK)
- `product_id` (uuid, FK)
- `supplier_sku` (text, nullable)
- `supplier_product_name` (text, nullable)
- `default_purchase_uom` (text, nullable)
- `relation_type` (supplier_product_relation_type, default 'primary')
- `created_at`

Constraints:

- unique (`org_id`, `supplier_id`, `product_id`)
- unique (`org_id`, `product_id`, `relation_type`)

**`supplier_orders`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `supplier_id` (uuid, FK)
- `status` (supplier_order_status)
- `notes` (text, nullable)
- `created_by` (uuid, FK -> auth.users.id)
- `created_at`, `updated_at`
- `sent_at` (timestamptz, nullable)
- `received_at` (timestamptz, nullable)
- `reconciled_at` (timestamptz, nullable)

**`supplier_order_items`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `order_id` (uuid, FK)
- `product_id` (uuid, FK)
- `ordered_qty` (numeric(14,3))
- `received_qty` (numeric(14,3), default 0)
- `unit_cost` (numeric(12,2), nullable)
- `created_at`

Constraints:

- unique (`order_id`, `product_id`)

### 3.8 Clientes y pedidos especiales

**`clients`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `name` (text, required)
- `phone` (text, nullable)
- `email` (text, nullable)
- `notes` (text, nullable)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

**`client_special_orders`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK)
- `client_id` (uuid, FK)
- `description` (text, required)
- `quantity` (numeric(14,3), nullable)
- `notes` (text, nullable)
- `status` (special_order_status)
- `created_by` (uuid, FK -> auth.users.id)
- `created_at`, `updated_at`

**`client_special_order_items`**

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `special_order_id` (uuid, FK)
- `product_id` (uuid, FK)
- `supplier_id` (uuid, nullable FK)
- `supplier_order_id` (uuid, nullable FK)
- `requested_qty` (numeric(14,3))
- `fulfilled_qty` (numeric(14,3), default 0)
- `is_ordered` (boolean, default false)
- `ordered_at` (timestamptz, nullable)
- `created_at`, `updated_at`

---

## 4) Views (contratos de pantalla esperados)

- `v_dashboard_admin(branch_id nullable)`
- `v_products_admin(branch_id nullable, search nullable)`
- `v_stock_by_branch`
- `v_pos_product_catalog(branch_id, search)`
- `v_products_typeahead_admin(search, limit)`
- `v_suppliers_admin`
- `v_supplier_detail_admin(supplier_id)`
- `v_supplier_product_suggestions(supplier_id, branch_id)`
- `v_orders_admin(branch_id nullable, status nullable, supplier_id nullable)`
- `v_order_detail_admin(order_id)`
- `v_special_order_items_pending`
- `v_expirations_due(branch_id nullable)`
- `v_expiration_batch_detail(batch_id)`
- `v_settings_users_admin`
- `v_branches_admin`
- `v_staff_effective_modules` (solo current_user)

---

## 5) RPCs (contratos de escritura esperados)

- `rpc_upsert_product(input)`
- `rpc_adjust_stock_manual(input)`
- `rpc_create_sale(input)`
- `rpc_upsert_supplier(input)`
- `rpc_upsert_supplier_product(input)`
- `rpc_remove_supplier_product(input)`
- `rpc_remove_supplier_product_relation(input)`
- `rpc_set_safety_stock(input)`
- `rpc_create_supplier_order(input)`
- `rpc_upsert_supplier_order_item(input)`
- `rpc_remove_supplier_order_item(input)`
- `rpc_set_supplier_order_status(input)`
- `rpc_receive_supplier_order(input)`
- `rpc_reconcile_supplier_order(input)`
- `rpc_create_expiration_batch_manual(input)`
- `rpc_adjust_expiration_batch(input)`
- `rpc_update_expiration_batch_date(input)`
- `rpc_upsert_client(input)`
- `rpc_create_special_order(input)`
- `rpc_set_special_order_status(input)`
- `rpc_mark_special_order_items_ordered(input)`
- `rpc_get_special_order_for_pos(input)`
- `rpc_invite_user_to_org(input)`
- `rpc_update_user_membership(input)`
- `rpc_upsert_branch(input)`
- `rpc_get_staff_module_access(branch_id nullable)`
- `rpc_set_staff_module_access(input)`
- `rpc_list_clients(scope_branch_id, search, limit, offset)`
- `rpc_get_client_detail(client_id)`
- `rpc_get_dashboard_admin(branch_id nullable)`

---

## 6) Decisiones abiertas (para cerrar antes de migraciones)

- ¿`stock_items.quantity_on_hand` se mantiene materializado o derivado de `stock_movements`?
- ¿Se permite stock negativo por sucursal (y cómo se controla desde `org_preferences`)?
- ¿Captura de vencimientos en recepción de pedidos (MVP o Post‑MVP)?
- ¿Invitaciones: tabla propia vs uso directo de `auth` + RPCs?
- ¿Alertas materializadas en tabla vs calculadas en view?

---

## 7) Próximo paso recomendado

Convertir este baseline en migraciones reales y regenerar:

- `docs/schema.sql`
- `types/supabase.ts`
- `docs/docs-data-model.md` y `docs/docs-rls-matrix.md` (actualizar con schema real)
