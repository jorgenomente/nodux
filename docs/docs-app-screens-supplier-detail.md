# Screen Contract — Supplier Detail (Org Admin)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/suppliers/[supplierId]`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de una org (soporte)
- Staff: NO

## Propósito

Gestionar un proveedor en profundidad:

- ver/editar datos del proveedor
- asociar/remover productos
- ver historial de pedidos (MVP: link/preview simple)
- crear producto desde el detalle (entry point alterno)

---

## UI: Layout (alto nivel)

### Header

- Breadcrumb: Proveedores → {Proveedor}
- Título: nombre del proveedor
- Badge: Activo/Inactivo
- Acciones:
  - “Editar proveedor”
  - “Activar/Desactivar”
  - (opcional) “Nuevo pedido” (cuando exista módulo orders)

### Tabs o secciones (MVP)

MVP recomendado (secciones verticales):

1. Datos del proveedor
2. Productos asociados
3. Historial de pedidos (placeholder MVP o link)

---

## Acciones del usuario (MVP)

### A1) Editar proveedor

- Abre modal o sheet con campos (name, contacto, phone, email, notes)
- Incluye frecuencia y días de pedido/recepción
- Guarda con RPC upsert

### A2) Activar/Desactivar proveedor

- Confirmación simple
- Guarda con RPC upsert (is_active)

### A3) Asociar producto

- Input typeahead de productos activos
- Al seleccionar:
  - crea asociación
  - opcional: completar SKU en proveedor y nombre del producto en proveedor
  - definir relation_type (primary | secondary)

### A4) Editar datos de asociación

- Editar supplier_sku y supplier_product_name inline o modal
- Guarda con RPC upsert_supplier_product

### A5) Remover asociación

- Acción “Remover”
- Si en el futuro hay referencias (orders):
  - Post-MVP: soft-remove (is_active=false en la relación)
- MVP: permitir remover si no rompe integridad

### A6) Crear producto desde proveedor

- Formulario mínimo para crear producto nuevo
- Incluir vencimiento aproximado (días)
- Al crear, se asocia automáticamente como proveedor primario

---

## Estados UI

### Loading

- Skeleton header + secciones

### Empty — sin productos asociados

- “Este proveedor no tiene productos asociados.”
- CTA: “Asociar productos”

### Error

- Banner “No pudimos cargar el proveedor.” + Reintentar
- Si `supplierId` no existe o no pertenece a org → 404/Not found

### Success

- Toast “Cambios guardados”

---

## Data Contract (One Screen = One Data Contract)

### Lectura principal

View: `v_supplier_detail_admin(supplier_id)`
Salida:

- supplier:
  - supplier_id
  - name
  - contact_name
  - phone
  - email
  - notes
  - is_active
  - order_frequency
  - order_day
  - receive_day
  - created_at
- products[]:
  - product_id
  - product_name
  - product_is_active
  - barcode (opcional)
  - internal_code (opcional)
  - supplier_sku
  - supplier_product_name
  - relation_type

### Escrituras

RPC 1: `rpc_upsert_supplier(input)`

- supplier_id
- name, contact_name, phone, email, notes, is_active

RPC 2: `rpc_upsert_supplier_product(input)`

- supplier_id
- product_id
- supplier_sku optional
- supplier_product_name optional
- relation_type (primary | secondary)

RPC 3: `rpc_remove_supplier_product(input)`

- supplier_id
- product_id

RPC 4: `rpc_remove_supplier_product_relation(input)`

- product_id
- relation_type

### Typeahead productos

View: `v_products_typeahead_admin(search, limit)`

- product_id
- product_name
- is_active

---

## Permisos y seguridad (RLS)

- OA: read/write dentro de su org
- SA: soporte controlado
- Validación:
  - supplierId pertenece a org actual (RLS + FK)

---

## Edge cases

1. Proveedor inactivo

- Mostrar banner “Proveedor inactivo”
- Permitir reactivar
- Asociar productos: permitido (MVP) o bloqueado (decisión)
  - Recomendación: permitir, pero el proveedor no se podrá seleccionar en pedidos hasta reactivarlo.

2. Producto inactivo

- Mostrar badge “inactivo”
- No debería aparecer en typeahead por defecto

3. Duplicados de asociación

- unique constraint → mostrar error UX

---

## Métricas / eventos

- `supplier_detail_viewed`
- `supplier_updated`
- `supplier_toggled_active`
- `supplier_product_linked`
- `supplier_product_updated`
- `supplier_product_unlinked`

---

## Smoke tests (manual)

### SD-01: Acceso y carga

1. Login OA
2. Ir a `/suppliers`
3. Abrir un proveedor → `/suppliers/[id]`
4. Ver datos + productos

### SD-02: Asociar/editar/remover producto

1. Asociar producto A
2. Editar supplier_sku
3. Remover asociación
