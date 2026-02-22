# Módulo — Proveedores

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Objetivo

Centralizar proveedores y su relación con productos para facilitar compras,
historial y trazabilidad básica.

---

## Roles

- Org Admin (OA): acceso completo (CRUD + asociación productos)
- Staff (ST): no accede (MVP)

---

## Entidades principales

### suppliers

Proveedor dentro de una organización.

Campos clave (conceptual):

- id (uuid)
- org_id
- name (text, required)
- contact_name (text, optional)
- phone (text, optional)
- email (text, optional)
- notes (text, optional)
- is_active (boolean, default true)
- order_frequency (order_frequency, optional)
- order_day (weekday, optional)
- receive_day (weekday, optional)
- payment_terms_days (integer, optional)
- default_markup_pct (numeric, default 40)
- preferred_payment_method (`cash` | `transfer`, optional)
- payment_note (text, optional; en UI se muestra como “Datos de pago y notas del proveedor”)
- created_at
- updated_at

### supplier_products (join)

Asociación de productos con un proveedor (MVP: muchas a muchas).

Campos clave (conceptual):

- id (uuid)
- org_id
- supplier_id
- product_id
- supplier_sku (text, optional)
- supplier_product_name (text, optional)
- default_purchase_uom (text, optional)
- relation_type (supplier_product_relation_type, default 'primary')
- created_at

Constraints:

- unique (org_id, supplier_id, product_id)
- unique (org_id, product_id, relation_type)

> Nota: `supplier_product_name` permite mostrar “nombre del proveedor” vs “nombre interno”.

---

## Reglas de negocio (invariantes)

### R1) Proveedor pertenece a org

- `org_id` obligatorio

### R2) Proveedor inactivo

- No se puede usar para nuevos pedidos
- Se mantiene visible en historial

### R3) Asociación producto↔proveedor

- Un producto tiene 1 proveedor primario y puede tener 1 proveedor secundario
- Un proveedor puede tener múltiples productos (primarios y secundarios)
- No se permite que un producto tenga 2 proveedores primarios

### R4) Eliminación

- No se elimina físicamente si hay referencias (pedidos/historial)
- Se usa `is_active=false`

---

## Pantallas asociadas

- `/suppliers` (OA)

---

## Operaciones principales (MVP)

### O1) CRUD Proveedor

- Crear/editar datos básicos
- Definir frecuencia de pedido y días de pedido/recepción
- Definir `% ganancia sugerida` para pricing de productos (default 40)
- Definir método de pago preferido (efectivo/transferencia)
- Activar/desactivar

### O2) Asociar productos al proveedor

- Buscar producto y asociarlo
- Opcional: setear supplier_sku y supplier_product_name
- Definir si la relación es primaria o secundaria
- Remover asociación (si no hay referencias a pedidos; si hay, marcar inactiva Post-MVP)

### O3) Vista “Detalle proveedor”

- Datos del proveedor
- Lista de productos asociados
- Historial de pedidos (MVP: link a pedidos filtrado o conteo simple)
- Cuentas de transferencia del proveedor para el módulo de pagos

---

## Data Contracts (resumen)

- View: `v_suppliers_admin` (lista)
- View: `v_supplier_detail_admin` (detalle + productos asociados)
- RPC: `rpc_upsert_supplier(...)`
- RPC: `rpc_upsert_supplier_product(...)`
- RPC: `rpc_remove_supplier_product(...)` (o soft-remove)

---

## Edge cases

- Producto inactivo: igual puede estar asociado, pero no sugerido para nuevos pedidos
- Proveedor sin productos: permitido (estado vacío con CTA “Asociar productos”)
- Duplicados por nombre: permitido, pero se recomienda warning UX (Post-MVP)

---

## Métricas

- proveedores activos
- % productos con proveedor asignado
- pedidos por proveedor (cuando exista orders)

---

## Smoke tests

- Crear proveedor
- Asociar productos
- Editar proveedor
- Desactivar proveedor y confirmar que no aparece como seleccionable (cuando haya pedidos)
