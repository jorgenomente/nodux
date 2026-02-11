# Screen Contract — Products Lookup (Staff)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/products/lookup`

## Rol / Acceso

- Staff (ST) con módulo `products_lookup` habilitado
- Org Admin (OA) puede acceder

## Propósito

Consulta rápida de precios y stock (sin edición).

**Estado actual**: placeholder MVP (pantalla informativa).

## Data Contract (futuro)

- View: `v_pos_product_catalog(branch_id, search)`

## Smoke tests (manual)

- PL-01: navegar a `/products/lookup` y ver placeholder.
