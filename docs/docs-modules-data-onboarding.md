# Modulo — Onboarding de datos maestros

## Objetivo

Acelerar la puesta en marcha y calidad operativa de datos maestros para que
Productos, Proveedores, Pedidos, Pagos y Vencimientos funcionen sin friccion.

El modulo combina:

- importacion inicial de catalogo (CSV/XLSX)
- validacion y normalizacion de datos
- bandeja de pendientes de completitud
- acciones rapidas para completar informacion faltante

---

## Roles

- Org Admin (OA): acceso completo
- Superadmin (SA) dentro de org activa: acceso completo (soporte)
- Staff (ST): sin acceso en MVP

---

## Entidades principales (MVP)

### Reuso de entidades existentes

- `products`
- `suppliers`
- `supplier_products`
- `supplier_payment_accounts` (cuando aplique)

### Entidades nuevas recomendadas

- `data_import_jobs`
- `data_import_rows`

Estas entidades permiten trazabilidad de importaciones, errores por fila y
reprocesos idempotentes.

---

## Reglas de negocio

### R1) Formatos de importacion MVP

- La version actual soporta importacion de `csv` y `xlsx`.
- PDF queda fuera del alcance MVP.
- Limite operativo por archivo: hasta 70.000 filas.

### R2) Idempotencia

- Reimportar el mismo archivo no debe duplicar productos/proveedores.
- Claves de matching recomendadas:
  - producto: `barcode` o `internal_code`, fallback por nombre normalizado
  - proveedor: nombre normalizado + org
- En el preprocesamiento de importación, filas repetidas se consolidan antes de
  persistir en `data_import_rows`:
  - `products`: por `barcode` > `internal_code` > nombre normalizado.
  - `suppliers`: por nombre de proveedor normalizado.
  - `products_suppliers`: por producto + proveedor + `relation_type`.
- Si un producto consolidado trae precios distintos en filas duplicadas, se
  prioriza el `unit_price` de la fila con fecha más reciente (`source_date` o
  columnas de fecha equivalentes mapeadas/detectadas).
- Cuando el archivo trae ventas con `cantidad` y `subtotal` (sin precio
  unitario explícito), onboarding deriva `unit_price = subtotal / cantidad`
  antes de validar/aplicar.

### R3) Completitud operativa

El modulo mide calidad de datos por tareas concretas, no por campos aislados.

Tareas minimas de completitud:

- producto sin proveedor primario
- producto sin `shelf_life_days` (si aplica operativamente)
- producto sin `barcode` ni `internal_code`
- proveedor sin `payment_terms_days`
- proveedor sin metodo de pago preferido

### R4) Entry points rapidos

Desde la bandeja de pendientes se permite:

- crear proveedor
- asignar proveedor primario/secundario a producto
- completar shelf life days
- completar barcode/internal_code
- completar terminos y metodo de pago de proveedor

Implementacion MVP actual:

- tarea de productos incompletos se resuelve inline en `/onboarding` con
  formulario rapido por fila para completar los campos operativos del producto
  (incluyendo proveedor primario/secundario y datos base de catalogo).
- las tareas de proveedores mantienen salida rapida a `/suppliers`.
- la importacion incorpora paso de deteccion y mapeo de columnas para alinear
  nombres del archivo con los campos reales del modelo de datos NODUX.

### R5) Sin romper contratos actuales

El modulo no reemplaza `/products` ni `/suppliers`.
Funciona como capa de aceleracion y control de calidad.

---

## Pantallas asociadas

- `/onboarding` (OA/SA)
- links de salida rapida a:
  - `/products`
  - `/suppliers`
  - `/settings/preferences` (si se requiere ajuste global)
- resolvedor rapido inline en `/onboarding` para productos con informacion incompleta

---

## Contratos (resumen)

- View principal: `v_data_onboarding_tasks`
- RPCs recomendadas:
  - `rpc_create_data_import_job(...)`
  - `rpc_upsert_data_import_row(...)`
  - `rpc_validate_data_import_job(...)`
  - `rpc_apply_data_import_job(...)`
  - `rpc_upsert_product(...)` (reuso)
  - `rpc_upsert_supplier(...)` (reuso)
  - `rpc_upsert_supplier_product(...)` (reuso)

---

## Exportes maestros (respaldo)

El modulo debe permitir exportar plantillas maestras para respaldo y
portabilidad operativa:

- `productos_master.csv`
- `proveedores_master.csv`
- `producto_proveedor_master.csv`

Objetivo:

- descargar estado actual de datos maestros
- reutilizar en otra sucursal u org de forma controlada

---

## Edge cases

- filas invalidas parciales: se aplican solo filas validas (modo parcial) con
  reporte de errores
- duplicados en archivo: consolidar por clave de negocio antes de aplicar
- proveedor inactivo importado: mantener `is_active=false` sin perder historial

---

## Smoke tests (cuando se implemente)

- importar CSV/XLSX de productos/proveedores y verificar upsert sin duplicados
- validar bandeja de pendientes con conteos correctos
- completar pendientes con acciones rapidas y verificar descenso de tareas
- exportar maestros y reimportar en entorno limpio
