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
- Staff con módulo `products` habilitado:
  - acceso de lectura al listado
  - transferencia entre sucursales solo si tiene 2 o más sucursales asignadas
  - sin alta/edición de catálogo ni ajuste manual directo

## Propósito

Gestionar el catálogo de productos y el stock por sucursal, con operación real:

- alta/edición básica de productos
- activación/desactivación
- ajustes manuales de stock (inventario inicial, corrección, merma no por vencimiento)
- visibilidad por sucursal (desglose) + total
- asociación de proveedor primario/secundario
- safety stock por sucursal
- catálogo único por org (sin duplicados de maestro)

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
- foto del artículo (tap/click abre modal de vista ampliada; si el usuario puede editar, desde ahí puede seleccionar foto, tomar foto o quitarla)
- SKU interno / barcode (si existe)
- precio actual
- stock total
- stock por sucursal (ej: “Sucursal A: 5 · Sucursal B: 2”)
- badge activo/inactivo
- acción: editar / activar-desactivar

Toolbar de lista (MVP actual):

- buscador por nombre (server-side, tokens en cualquier orden)
- input de búsqueda con debounce (actualiza URL sin submit manual)
- selector de tamaño de página (`20`, `50`, `100`)
- contador total + rango visible (`Mostrando X-Y de Z`)
- paginación (`Anterior` / `Siguiente`) + numeración de páginas

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
- brand (opcional)
- categoria (opcional; hashtags normalizados como `#keto #sintacc`)
- internal_code (opcional, recomendado)
- barcode (opcional)
- purchase_by_pack (checkbox, default false)
- units_per_pack (entero > 1, requerido solo si `purchase_by_pack=true`)
- sell_unit_type: unit | weight | bulk
- uom (ej: kg)
- unit_price (>= 0)
- imagen de producto (opcional; upload comprimido a JPG liviano)
- supplier_price (opcional, base para sugerencia)
- is_active (default true)
- vencimiento_aproximado_dias (opcional)
- proveedor_primario (opcional pero recomendado)
- precio_proveedor (opcional)
- nombre_articulo_en_proveedor (opcional, si hay proveedor primario)
- sku_en_proveedor (opcional, si hay proveedor primario)
- proveedor_secundario (opcional)
- stock_minimo (opcional, label UI: `Cantidad de resguardo`, se aplica a todas las sucursales activas)

Comportamiento de sugerencia de precio:

- `precio_proveedor` no fuerza `unit_price`.
- UI muestra sugerencia de `unit_price` usando `% ganancia sugerida` del proveedor
  primario.
- fallback: si proveedor no tiene `%` definido, se usa `40%`.

Reglas anti-duplicado (obligatorias):

- No crear si ya existe producto en la org con el mismo `barcode`.
- No crear si ya existe producto en la org con el mismo `internal_code`.
- No crear si ya existe producto en la org con el mismo `name` normalizado
  (trim + minúsculas), aunque no tenga códigos.
- En alta, mientras se escribe `name`, la UI consulta catálogo existente y muestra
  sugerencias/alertas de coincidencia para prevenir duplicados semánticos.
- La UI debe informar el conflicto y ofrecer abrir/editar el producto existente.
- En `internal_code`, la UI ofrece botón `Generar` para sugerir código consistente
  a partir de `brand` + `name` (si `brand` está vacío no genera).
- En `brand`, la UI muestra alertas/sugerencias de marcas existentes o parecidas
  para reducir duplicados por variaciones ortográficas.
- En `categoria`, la UI sugiere hashtags ya usados en el catálogo y muestra
  coincidencias parecidas mientras se escribe para evitar duplicados o variantes
  casi iguales.
- Configuración de compra proveedor:
  - si `purchase_by_pack=true`, `units_per_pack` debe ser entero > 1.
  - si `purchase_by_pack=false`, `units_per_pack` debe quedar `null`.
  - esta configuración impacta sugeridos y recepción en `/orders` y
    `/orders/[orderId]` (equivalencia unidades <-> paquetes).

### A2) Editar producto

- mismos campos
- permite reemplazar imagen o quitar imagen actual
- permite editar categorías del artículo para storefront y filtros operativos
- desde el listado, click/tap sobre la foto abre modal rápido para verla más grande y editarla sin desplegar todo el formulario
- no eliminar; solo `is_active=false`
- cantidad de resguardo editable desde listado (aplica a todas las sucursales activas)

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

### A4.b) Transferencia de stock entre sucursales (misma sección)

Formulario “Mover stock entre sucursales”, al final de la sección de ajuste manual.

Campos:

- from_branch_id
- to_branch_id
- items[] (`product_id`, `quantity`)
- reason (text, opcional; default "transferencia entre sucursales")

Disponibilidad:

- OA/SA: disponible cuando la org tiene al menos 2 sucursales activas
- Staff: disponible solo si
  - tiene módulo `products` habilitado
  - tiene 2 o más sucursales asignadas activas
  - origen y destino pertenecen a sus sucursales asignadas

Efecto:

- operación atómica en DB
- descuenta stock en origen y suma en destino
- genera movimientos append-only `branch_transfer` en ambas sucursales
- audita el evento como transferencia multi-sucursal

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
- brand
- category_tags[]
- internal_code
- barcode
- purchase_by_pack
- units_per_pack
- sell_unit_type
- uom
- unit_price
- image_url
- is_active
- vencimiento_aproximado_dias
- stock_total
- stock_by_branch[] (branch_id, branch_name, quantity_on_hand)
- shelf_life_days (int, nullable)
- safety_stock_by_branch[] (branch_id, safety_stock) (si se expone en view)

Nota: el desglose por sucursal evita el selector en MVP.

Parámetros de lectura operativa en UI:

- `q` (búsqueda por nombre)
- `page` (paginación)
- `page_size` (`20` | `50` | `100`)

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

RPC 2.b: `rpc_transfer_stock_between_branches(input)`

- from_branch_id
- to_branch_id
- items jsonb[] (`product_id`, `quantity`)
- reason (text, opcional)

RPC 3: `rpc_upsert_supplier_product(input)`

- supplier_id
- product_id
- relation_type (primary | secondary)
- supplier_price optional
- supplier_sku optional
- supplier_product_name optional

RPC 4: `rpc_remove_supplier_product_relation(input)`

- product_id
- relation_type

RPC 5: `rpc_set_safety_stock(input)`

- branch_id

Storage (producto):

- bucket: `product-images` (público, liviano)
- path estable por archivo: `org_id/product_id.jpg`
- upload desde UI comprime imagen antes de enviar para reducir almacenamiento/costo
- product_id
- safety_stock

---

## Seguridad (RLS)

- OA: puede leer/escribir productos y stock dentro de su org
- Staff con módulo `products`: puede leer la pantalla y ejecutar transferencias entre
  sucursales asignadas cuando tiene 2 o más memberships activas
- Debe validar:
  - branch_id pertenece a org del usuario
  - en transferencia: origen != destino, stock suficiente en origen y ambas
    sucursales dentro del scope permitido

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
