# Modelo de Datos (vivo)

Este documento describe el modelo de datos actual del MVP.
Debe actualizarse cada vez que cambie el schema (tablas, enums, relaciones o constraints).

## Convenciones

- Nombres de tablas y columnas en `snake_case`.
- Todas las entidades operativas tienen `org_id` y `branch_id` cuando aplica.
- `created_at` y `updated_at` en UTC.

## Enums

> Completar y mantener sincronizado con el schema real.

## Tablas (core)

> Completar con tablas, campos y notas. Formato sugerido:

### <table_name>

**Propósito**: ...

**Campos clave**:

- `id` (uuid, PK)
- `org_id` (uuid, FK)
- `branch_id` (uuid, FK, nullable?)
- ...

**Constraints**:

- ...

**Relaciones**:

- ...

## Views y RPCs (resumen)

> Listado mínimo de views/RPCs que exponen contratos de pantalla.
