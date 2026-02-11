# Screen Contract — Products (Org Admin)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/products`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de una org (soporte/impersonation controlado)
- Staff: NO (en MVP, Staff solo `/products/lookup`)

## Propósito

Gestionar el catálogo de productos y el stock por sucursal, con operación real:

- alta/edición básica de productos
- activación/desactivación
- ajustes manuales de stock (inventario inicial, corrección, merma no por vencimiento)
- visibilidad por sucursal (desglose) + total
- asociación de proveedor primario/secundario
- safety stock por sucursal

## Contexto de sucursal (branch context)

- OA ve todas las sucursales.
- El listado muestra **stock total** y **detalle por sucursal**.
- En MVP no hay selector; el detalle por sucursal reemplaza el selector.

---

## UI: Layout (alto nivel)

### Header

- Título: “Productos”
- CTA principal: “Nuevo producto” (formulario desplegable)

### Sección A — Lista de productos

Cada row:

- nombre
- SKU interno / barcode (si existe)
- precio actual
- stock total
- stock por sucursal (ej: “Sucursal A: 5 · Sucursal B: 2”)
- badge activo/inactivo
- acción: editar / activar-desactivar

### Sección B — Acciones rápidas por producto (MVP)

- Editar producto (inline)
- Activar/Desactivar
- Ajustar stock (formulario desplegable en sección dedicada)

MVP: no construir “detalle de producto” en subruta a menos que sea estrictamente necesario.
Si crece, Post-MVP o siguiente lote: `/products/[productId]`.

---

## Acciones del usuario (MVP)

### A1) Crear producto

Campos mínimos:

- name (requerido)
- internal_code (opcional, recomendado)
- barcode (opcional)
- sell_unit_type: unit | weight | bulk
- uom (ej: kg)
- unit_price (>= 0)
- is_active (default true)
- vencimiento_aproximado_dias (opcional)
- proveedor_primario (opcional pero recomendado)
- nombre_articulo_en_proveedor (opcional, si hay proveedor primario)
- sku_en_proveedor (opcional, si hay proveedor primario)
- proveedor_secundario (opcional)
- stock_minimo (opcional, se aplica a todas las sucursales activas)

### A2) Editar producto

- mismos campos
- no eliminar; solo `is_active=false`
- stock_minimo editable desde listado (aplica a todas las sucursales activas)

### A3) Activar/Desactivar

- Desactivar: el producto deja de ser vendible y no aparece en lookup/POS

### A4) Ajuste manual de stock (por sucursal)

Modal “Ajustar stock”

Campos:

- branch_id
- product_id
- new_quantity_on_hand
- reason (text, opcional; default "manual")

Efecto:

- genera movimiento append-only `manual_adjustment`
- stock queda consistente para esa sucursal

### A5) Definir stock mínimo (global)

- Se define al crear/editar producto
- Se replica a todas las sucursales activas

---

## Estados UI

- Loading: skeleton lista + toolbar
- Empty: “No tenés productos aún.” + CTA “Nuevo producto”
- Error: banner “No pudimos cargar productos” + reintentar
- Success: estado visible tras guardar (sin toast global)

---

## Data Contract (One Screen = One Data Contract)

### Lectura principal (lista + stock)

View recomendada: `v_products_admin`
Salida mínima por fila:

- product_id
- name
- internal_code
- barcode
- sell_unit_type
- uom
- unit_price
- is_active
- vencimiento_aproximado_dias
- stock_total
- stock_by_branch[] (branch_id, branch_name, quantity_on_hand)
- shelf_life_days (int, nullable)
- safety_stock_by_branch[] (branch_id, safety_stock) (si se expone en view)

Nota: el desglose por sucursal evita el selector en MVP.

### Escrituras

RPC 1: `rpc_upsert_product(input)`

- product_id
- name, internal_code, barcode, sell_unit_type, uom, unit_price, is_active
- shelf_life_days (int, nullable)

RPC 2: `rpc_adjust_stock_manual(input)`

- branch_id
- product_id
- new_quantity_on_hand
- reason (text, requerido)

RPC 3: `rpc_upsert_supplier_product(input)`

- supplier_id
- product_id
- relation_type (primary | secondary)
- supplier_sku optional
- supplier_product_name optional

RPC 4: `rpc_remove_supplier_product_relation(input)`

- product_id
- relation_type

RPC 5: `rpc_set_safety_stock(input)`

- branch_id
- product_id
- safety_stock

---

## Seguridad (RLS)

- OA: puede leer/escribir productos y stock dentro de su org
- Debe validar:
  - branch_id pertenece a org del usuario
- Staff:
  - NO acceso a esta pantalla ni a RPCs admin

---

## Edge cases

- Producto inactivo con stock > 0
  - Visible en admin (con badge)
  - No vendible en POS/lookup
- Producto sin barcode / sin SKU
  - debe seguir siendo buscable por nombre

---

## Smoke tests (manual)

- PR-01: Crear producto y verlo en lista
- PR-02: Ajustar stock en sucursal A y ver desglose actualizado
- PR-03: Desactivar producto y confirmar que no aparece en /pos y /products/lookup
- PR-04: Search por barcode y por nombre
