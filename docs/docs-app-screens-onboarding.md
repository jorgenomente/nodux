# Screen Contract — Onboarding de Datos Maestros

## Ruta

- `/onboarding`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Proposito

Centralizar importacion y completitud de datos maestros para que la operacion
diaria tenga base consistente en productos y proveedores.

---

## Layout (alto nivel)

### Header

- Titulo: "Onboarding de datos"
- Subtitulo: "Importa catalogo y completa pendientes operativos"

### Seccion A — Importar archivo

- upload CSV/XLSX
- selector de plantilla:
  - productos
  - proveedores
- accion "Detectar columnas"
- configurador de mapeo columna-origen -> campo NODUX (opcional por campo)
- boton "Validar archivo"
- preview de columnas detectadas + mapeo

### Seccion B — Resultado de validacion

- filas validas
- filas con error
- lista de errores por fila/columna
- filas consolidadas por duplicados (preprocesamiento)
- boton "Aplicar importacion"

### Seccion C — Pendientes de completitud

Cards de tareas:

- productos con informacion incompleta
- proveedores sin terminos de pago
- proveedores sin metodo de pago preferido

Cada card tiene CTA:

- "Resolver ahora"
- "Ver detalle"

Comportamiento MVP actual:

- `productos con informacion incompleta`: abre resolvedor rapido inline en la
  misma pantalla con formulario por fila para completar campos operativos de
  producto (nombre, marca, codigos, unidad, precio, shelf life, proveedor
  primario/secundario, SKU/nombre proveedor y stock minimo global). El
  resolvedor usa conteo exacto en DB, paginacion (25 por pagina) y buscador
  server-side por nombre para evitar cargas masivas.
- resto de tareas: mantiene salida rapida a pantalla fuente (`/products` o
  `/suppliers`).

### Seccion D — Acciones rapidas

- crear proveedor rapido
- asignar proveedor a producto
- completar shelf life / barcode / codigo interno
- completar datos de pago proveedor

Accion implementada en MVP:

- completitud rapida de producto desde `/onboarding` sin salir de la pantalla
  (modo rapido por filas).

### Seccion E — Exportes maestros

- descargar `productos_master.csv`
- descargar `proveedores_master.csv`
- descargar `producto_proveedor_master.csv`
- `productos_master.csv` refleja el contrato del formulario de alta de
  `/products` (incluye proveedor primario/secundario, SKU/nombre de proveedor y
  stock minimo consolidado)
- `proveedores_master.csv` refleja el contrato del formulario de alta de
  `/suppliers` (incluye `% ganancia sugerida` y perfil de pago)

---

## Acciones del usuario (MVP)

### A1) Descargar plantilla CSV

El usuario descarga plantilla estandar antes de importar.

### A2) Subir y validar archivo (CSV/XLSX)

El sistema crea job de importacion y ejecuta validaciones sintacticas +
semanticas.

Incluye paso previo de deteccion de columnas para permitir mapeo manual por
plantilla antes de validar/importar.
Luego de detectar columnas, la importacion reutiliza el mismo archivo en
staging (sin pedir recarga del archivo en el browser).

En plantilla de productos, los campos de mapeo se alinean con el formulario
compartido de alta/edicion de producto para evitar divergencias de contrato.

### A3) Aplicar importacion

Se aplican filas validas por upsert idempotente y se deja auditoria de job.

### A4) Resolver pendientes

Desde la bandeja, el usuario completa datos faltantes con formularios rapidos
sin salir del flujo.

### A5) Exportar maestros

El usuario descarga un snapshot actual para respaldo o migracion a otra
sucursal.

---

## Estados UI

- Loading: skeleton de cards y tabla de validacion
- Empty: sin pendientes + CTA "Importar archivo"
- Error: banner con causa y reintento
- Success: resumen con filas aplicadas, omitidas y pendientes restantes

---

## Data Contract (One Screen = One Data Contract)

### Lectura principal

View: `v_data_onboarding_tasks`

Salida minima:

- `task_key`
- `task_label`
- `pending_count`
- `sample_records` (jsonb, opcional)
- `last_calculated_at`

### Lectura complementaria (resolver productos incompletos)

View: `v_products_incomplete_admin`

Salida minima:

- `id`
- `org_id`
- `name`
- `internal_code`
- `barcode`
- `unit_price`
- `shelf_life_days`
- `has_primary_supplier`
- `missing_primary_supplier`
- `missing_shelf_life`
- `missing_identifier`

### Escrituras

RPC 1: `rpc_create_data_import_job(input)`

- `org_id`
- `template_key`
- `file_name`
- `file_storage_path`

RPC 2: `rpc_validate_data_import_job(input)`

- `org_id`
- `job_id`

RPC 3: `rpc_upsert_data_import_row(input)`

- `org_id`
- `job_id`
- `row_number`
- `raw_payload`
- `normalized_payload` (opcional)

RPC 4: `rpc_apply_data_import_job(input)`

- `org_id`
- `job_id`
- `apply_mode` (`valid_only` recomendado)

RPC 5..N (reuso existentes):

- `rpc_upsert_product(...)`
- `rpc_upsert_supplier(...)`
- `rpc_upsert_supplier_product(...)`

---

## Seguridad (RLS)

- OA/SA: lectura/escritura solo de su org activa
- ST: sin acceso
- jobs y rows de importacion siempre filtrados por `org_id`

---

## Smoke tests (manual)

- ONB-01: validar CSV/XLSX con errores y revisar reporte por fila
- ONB-02: aplicar importacion parcial y verificar upserts en productos/proveedores
- ONB-03: resolver pendiente de proveedor primario desde CTA rapido
- ONB-04: exportar maestros y abrir archivo con columnas esperadas
