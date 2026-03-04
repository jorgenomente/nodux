# Screen Contract — Consulta de precios (Staff)

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

Consulta rápida de precios y stock (sin edición), con entrada por texto o cámara.

**Estado actual**: implementada (lookup operativo mobile-first).

## Data Contract

- View: `v_pos_product_catalog`
- Filtros en UI:
  - `org_id` obligatorio
  - `branch_id` obligatorio
  - `is_active = true`
  - búsqueda por `name` con tokens `ILIKE` por palabra (orden independiente)
  - búsqueda por `barcode` exacto (cuando el término coincide con código escaneado o tipeado)
- Entry points UI:
  - input de búsqueda manual
  - botón `Usar cámara` junto al input para escanear código de barras con el dispositivo
  - fallback `Ingresar código` cuando el navegador no soporta `BarcodeDetector`
- Límite de resultados por búsqueda: `30` filas (anti render masivo)

## Estados de pantalla

- `idle`: mensaje para comenzar a escribir
- `loading`: feedback de búsqueda en curso
- `empty`: sin coincidencias
- `error`: fallo de consulta con mensaje de reintento
- `scanner_error`: cámara no disponible / permiso denegado / navegador sin soporte de detector
- `manual_code`: ingreso manual de barcode y búsqueda inmediata en navegadores sin escaneo por cámara
- `success`: lista de productos con `name`, `unit_price`, `stock_on_hand`, `internal_code`, `barcode`

## Smoke tests (manual)

- PL-01: Staff con módulo `products_lookup` habilitado abre `/products/lookup` y accede.
- PL-02: buscar por nombre con palabras invertidas (ej. `retornable coca`) y confirmar coincidencia.
- PL-03: buscar por código de barras (tipeado o escaneado) y confirmar coincidencia.
- PL-04: tocar `Usar cámara`, escanear código y validar autocompletado + búsqueda inmediata.
- PL-05: confirmar que cada resultado muestra precio y stock.
- PL-06: confirmar que la búsqueda no renderiza más de 30 resultados y muestra mensaje de refinado.
- PL-07: en navegador sin `BarcodeDetector`, validar fallback `Ingresar código` + búsqueda inmediata por Enter/botón.
