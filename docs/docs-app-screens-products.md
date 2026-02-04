1. Screen Contract — Products (Org Admin)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

  Ruta

/products

Rol / Acceso

Org Admin (OA)

Superadmin (SA) dentro de una org (soporte/impersonation controlado)

Staff: NO (en MVP, Staff solo /products/lookup)

Propósito

Gestionar el catálogo de productos y el stock por sucursal, con operación real:

alta/edición básica de productos

activación/desactivación

ajustes manuales de stock (inventario inicial, corrección, merma no por vencimiento)

visibilidad por sucursal + vista agregada

Contexto de sucursal (branch context)

Selector: “Todas” + sucursal

Default:

si hay 1 sucursal → esa sucursal

si hay >1 → “todas”

Nota:

el stock siempre es por sucursal; “todas” es solo vista agregada / comparativa

UI: Layout (alto nivel)
Header

Título: “Productos”

CTA principal: “Nuevo producto”

Search: nombre / barcode / SKU interno

Selector sucursal (scope)

Sección A — Lista de productos

Cada row:

nombre

SKU interno / barcode (si existe)

precio actual

stock (si scope = una sucursal) o “stock total” (si scope = todas)

badge activo/inactivo

acción: “Editar” / “Ver”

Sección B — Acciones rápidas por producto (MVP)

Editar producto (sheet/modal)

Activar/Desactivar (confirmación)

Ajustar stock (modal) cuando scope = una sucursal

MVP: no construir “detalle de producto” en subruta a menos que sea estrictamente necesario.
Si crece, Post-MVP o siguiente lote: /products/[productId].

Acciones del usuario (MVP)
A1) Crear producto

Campos mínimos:

name (requerido)

internal_code (opcional, recomendado)

barcode (opcional)

sell_unit_type: unit | weight | bulk

uom (ej: kg)

unit_price (>= 0)

is_active (default true)

A2) Editar producto

mismos campos

no eliminar; solo is_active=false

A3) Activar/Desactivar

Desactivar: el producto deja de ser vendible y no aparece en lookup/POS

A4) Ajuste manual de stock (por sucursal)

Modal “Ajustar stock”

Campos:

branch_id (implícito por selector)

product_id

new_quantity_on_hand (decimal) o delta (decisión UX)

reason (text, requerido)

Efecto:

genera movimiento append-only manual_adjustment

stock queda consistente para esa sucursal

Estados UI

Loading: skeleton lista + toolbar

Empty: “No tenés productos aún.” + CTA “Nuevo producto”

Error: banner “No pudimos cargar productos” + reintentar

Success: toast “Producto guardado / Stock ajustado”

Data Contract (One Screen = One Data Contract)
Lectura principal (lista + stock)

View recomendada: v_products_admin(scope_branch_id nullable, search text nullable)
Salida mínima por fila:

product_id

name

internal_code

barcode

sell_unit_type

uom

unit_price

is_active

stock_on_hand (si branch_id no-null) o stock_total (si null)

updated_at (opcional)

Nota: si “todas” requiere desglose por sucursal, NO en MVP (sería otra pantalla o modo avanzado).

Escrituras

RPC 1: rpc_upsert_product(input)

product_id nullable

name, internal_code, barcode, sell_unit_type, uom, unit_price, is_active
Output:

product_id + snapshot básico

RPC 2: rpc_adjust_stock_manual(input)

branch_id

product_id

new_quantity_on_hand (o delta_qty)

reason (text, requerido)
Output:

movement_id

resulting_quantity_on_hand

Seguridad (RLS)

OA: puede leer/escribir productos y stock dentro de su org

Debe validar:

branch_id pertenece a org del usuario

Staff:

NO acceso a esta pantalla ni a RPCs admin

Edge cases

Producto inactivo con stock > 0

Visible en admin (con badge)

No vendible en POS/lookup

Cambio de sucursal mientras modal de ajuste está abierto

cerrar modal o recalcular contexto (evitar writes a branch equivocada)

Producto sin barcode / sin SKU

debe seguir siendo buscable por nombre

Smoke tests (manual)

PR-01: Crear producto y verlo en lista

PR-02: Ajustar stock en sucursal A y verificar stock cambia solo allí

PR-03: Desactivar producto y confirmar que no aparece en /pos y /products/lookup

PR-04: Search por barcode y por nombre
