# Screen Contract — Settings: Audit Log

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/settings/audit-log`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) cuando opera dentro de una org (soporte/impersonation controlado)
- Staff: NO accede

## Propósito

Dar trazabilidad de acciones importantes dentro de la organización:

- Qué se hizo
- Quién lo hizo
- Cuándo ocurrió

---

## UI: Layout

### Header

- Título: “Auditoría”
- Descripción corta: “Registro de acciones importantes en la organización.”

### Filtros (MVP)

- Rango de fecha (desde / hasta)
- Tipo de acción (action_key)
- Usuario (actor)

### Lista (tabla o cards)

Cada fila incluye:

- Fecha y hora
- Acción (label desde `action_key`)
- Actor (nombre + rol)
- Entidad (entity_type + entity_id)
- Resumen breve (desde `metadata` si aplica)
- Acceso a metadata completa con desplegable

### Detalle (opcional MVP)

- Drawer/modal con `metadata` completa (JSON formateado)

---

## Acciones del usuario (MVP)

### A1) Ver lista de auditoría

- Orden por `created_at DESC`
- Paginación simple (limit + offset, 50 por página)

### A2) Filtrar

- Aplicar filtros por fecha, acción y actor

---

## Estados UI

### Loading

- Skeleton tabla/lista

### Empty

- Mensaje: “No hay acciones registradas en el período seleccionado.”

### Error

- Banner “No pudimos cargar la auditoría”
- CTA Reintentar

---

## Reglas de negocio

### R1) Fuente de verdad

La tabla `audit_log` es append-only.

### R2) Visibilidad

Solo OA/SA pueden leer auditoría de su org.

### R3) Escritura

La escritura ocurre en DB (triggers/RPCs), no desde la UI.

---

## Data Contract (One Screen = One Data Contract)

### Lectura principal

**View recomendada**: `v_audit_log_admin`

Output (ordenado por `created_at DESC`):

- `id`
- `org_id`
- `created_at`
- `action_key`
- `entity_type`
- `entity_id`
- `actor_user_id`
- `actor_display_name`
- `actor_role`
- `branch_id`
- `branch_name`
- `metadata` (jsonb)

Filtros soportados (query):

- `created_at` >= desde
- `created_at` <= hasta
- `action_key` (exact match)
- `actor_user_id`

### Escritura

- No aplica (solo lectura en UI)

---

## Validaciones (DB / RPC)

- `action_key` requerido
- `entity_type` requerido
- `created_at` default now()

---

## Smoke tests

AL-01: filtrar por fecha y validar que el resultado respeta el rango.
