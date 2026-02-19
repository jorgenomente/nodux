# Screen Contract — Suppliers (Org Admin)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/suppliers`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de una org (soporte)
- Staff: NO

## Propósito

Gestionar proveedores y asociar productos para habilitar compras/pedidos.

---

## Layout (alto nivel)

### Header

- Título: “Proveedores”
- CTA principal: “Nuevo proveedor” (formulario desplegable en la misma página)

### Lista (tabla o cards)

- Search inline en bloque de listado (sin botón)
- Filtro reactivo por nombre/contacto al escribir 3+ letras

Cada row:

- nombre
- contacto (opcional)
- teléfono/email (opcional)
- estado (activo/inactivo)
- conteo de productos asociados
- acción: “Ver” + edición inline (toggle)

### Detalle (MVP)

- Alternativa A: navegación a subruta `/suppliers/[id]` (recomendado por claridad)
- Alternativa B: modal de detalle (rápido pero puede crecer)

> Recomendación: usar subruta (mejor “no pages huérfanas” y shareable URL).
> Si elegimos subruta, agregarla al índice de pantallas.

Estado actual: se usa subruta `/suppliers/[supplierId]`.

---

## Acciones del usuario (MVP)

### A1) Crear proveedor (desplegable inline)

Campos:

- name (requerido)
- contact_name
- phone
- email
- notes
- order_frequency (weekly | biweekly | every_3_weeks | monthly)
- order_day (weekday)
- receive_day (weekday)
- payment_terms_days (opcional)
- preferred_payment_method (`cash` | `transfer`, opcional)
- payment_note (opcional, label UI: “Datos de pago y notas del proveedor”)

Submit → upsert

### A2) Editar proveedor

- mismo modal prefill

### A3) Activar/Desactivar proveedor

- toggle o acción contextual
- confirmación si está siendo usado en pedidos (cuando exista)

### A4) Asociar productos (en “detalle”)

- En MVP actual no hay búsqueda para asociar productos existentes.
- La asociación ocurre al crear producto desde el detalle.

### A5) Remover asociación

- acción “remover” (desde detalle)
- si hay referencias futuras (orders), definir soft-remove Post-MVP

---

## Estados UI

### Loading

- skeleton lista

### Empty (sin proveedores)

- “Aún no tenés proveedores.”
- CTA: “Nuevo proveedor”

### Empty (proveedor sin productos)

- “Este proveedor no tiene productos asociados.”
  (CTA ocurre en detalle al crear producto)

### Error

- Banner “No pudimos cargar proveedores” + Reintentar

### Success

- Toast “Proveedor actualizado”

---

## Data Contract (One Screen = One Data Contract)

### Lectura (lista)

View: `v_suppliers_admin`
Campos mínimos:

- supplier_id
- name
- contact_name
- phone
- email
- is_active
- products_count

Filtros:

- search por name/contact

### Lectura (detalle + productos)

View: `v_supplier_detail_admin(supplier_id)`
Salida:

- supplier: { ...campos }
- products[]:
  - product_id
  - product_name
  - product_is_active
  - supplier_sku
  - supplier_product_name
  - relation_type

### Escrituras

RPC 1: `rpc_upsert_supplier(input)`

- supplier_id nullable
- name, contact_name, phone, email, notes, is_active
- payment_terms_days, preferred_payment_method, payment_note

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

---

## Permisos y seguridad (RLS)

- OA: read/write solo en su org
- SA: soporte controlado
- Staff: sin acceso

Policies:

- suppliers: org_id match
- supplier_products: org_id match + FK integrity
- supplier_payment_accounts: org_id match + write OA/SA

---

## Edge cases

1. Proveedor inactivo

- visible en listado (con badge)
- no seleccionable para nuevos pedidos (en módulo orders)

2. Producto inactivo

- mostrar en detalle con badge “inactivo”
- permitir remover asociación

3. Duplicidad de asociación

- unique constraint evita doble vínculo (mostrar error UX “ya asociado”)

---

## Métricas / eventos

- `suppliers_viewed`
- `supplier_created`
- `supplier_updated`
- `supplier_toggled_active`
- `supplier_product_linked`
- `supplier_product_unlinked`

---

## Smoke tests (manual)

### SU-01: CRUD proveedor

1. Login OA
2. Ir a `/suppliers`
3. Crear proveedor
4. Editar datos
5. Desactivar proveedor (is_active=false)
6. Ver badge correcto

### SU-02: Asociar productos

1. Abrir detalle proveedor
2. Asociar producto A y B
3. Ver conteo en listado
4. Remover asociación de A
