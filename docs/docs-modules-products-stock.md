# Módulo — Productos y Stock

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Objetivo

Mantener un catálogo claro de productos y un control real de stock por sucursal,
sirviendo como base para ventas, vencimientos, pedidos y reportes.

---

## Roles

- Org Admin (OA): acceso completo
- Staff (ST): acceso solo vía lookup (si módulo habilitado)

---

## Entidades principales

### Product

Representa el producto lógico (no el stock).

Campos clave:

- id
- org_id
- name
- internal_code (SKU interno)
- barcode (opcional)
- sell_unit_type: unit | weight | bulk
- uom (unidad base, ej: kg)
- unit_price (precio de venta actual)
- is_active
- created_at

### Stock Item

Representa stock por sucursal.

Campos clave:

- id
- org_id
- branch_id
- product_id
- quantity_on_hand (decimal)
- updated_at

> Nota: en MVP el stock se mantiene derivado de movimientos.
> `quantity_on_hand` puede ser materializado o view.

---

## Reglas de negocio

### R1) Separación producto vs stock

- Producto ≠ stock
- El stock siempre es por sucursal

### R2) Unidades y cantidades

- `quantity_on_hand` siempre en la unidad base
- Conversión solo en UI (ej: g ↔ kg)

### R3) Precio

- Precio único por producto (MVP)
- Snapshot en venta

### R4) Activación

- Producto inactivo:
  - No se puede vender
  - No aparece en lookup
  - No se puede pedir

---

## Pantallas asociadas

- `/products` (OA)
- `/products/lookup` (ST)

---

## Operaciones principales

### Crear / editar producto (OA)

- CRUD básico
- Validaciones:
  - name obligatorio
  - sell_unit_type coherente
  - precio ≥ 0

### Ajuste de stock (OA)

- Ingreso manual (ej: inventario inicial)
- Ajuste genera movimiento `manual_adjustment`

---

## Movimientos (append-only)

Tipos:

- `sale`
- `purchase`
- `manual_adjustment`
- `expiration_adjustment`

Cada movimiento:

- afecta stock
- tiene referencia (sale_id, order_id, etc.)

---

## Data contracts (resumen)

- View: `v_products_admin`
- View: `v_stock_by_branch`
- View: `v_pos_product_catalog` (reutilizada por POS y lookup)

---

## Edge cases

- Producto con stock 0 → visible pero no vendible
- Producto sin barcode → solo búsqueda por nombre
- Eliminación → NO (solo `is_active=false`)

---

## Smoke tests

- Crear producto
- Ajustar stock
- Ver stock reflejado
- Vender producto y ver decremento
