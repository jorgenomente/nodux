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

**Estado actual**: implementada (lookup operativo mobile-first).

## Data Contract

- View: `v_pos_product_catalog`
- Filtros en UI:
  - `org_id` obligatorio
  - `branch_id` obligatorio
  - `is_active = true`
  - búsqueda por `name` con tokens `ILIKE` por palabra (orden independiente)
- Límite de resultados por búsqueda: `30` filas (anti render masivo)

## Estados de pantalla

- `idle`: mensaje para comenzar a escribir
- `loading`: feedback de búsqueda en curso
- `empty`: sin coincidencias
- `error`: fallo de consulta con mensaje de reintento
- `success`: lista de productos con `name`, `unit_price`, `stock_on_hand`, `internal_code`, `barcode`

## Smoke tests (manual)

- PL-01: Staff con módulo `products_lookup` habilitado abre `/products/lookup` y accede.
- PL-02: buscar por nombre con palabras invertidas (ej. `retornable coca`) y confirmar coincidencia.
- PL-03: confirmar que cada resultado muestra precio y stock.
- PL-04: confirmar que la búsqueda no renderiza más de 30 resultados y muestra mensaje de refinado.
