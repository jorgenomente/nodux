# Screen Contract — Settings: Staff Permissions (por módulo)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/settings/staff-permissions`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) cuando opera dentro de una org (soporte/impersonation controlado)
- Staff: NO accede

## Propósito

Permitir al Org Admin definir qué módulos puede ver/usar el Staff, con efecto inmediato:

- Navegación dinámica del Staff
- Redirect post-login del Staff
- Enforcements vía RLS/RPC (no solo UI)

---

## Conceptos clave

### Módulo (module_key)

Identificador estable (string) para cada módulo habilitable.

MVP module_keys recomendados:

- `pos`
- `cashbox`
- `products_lookup`
- `clients`
- `orders` (opcional para staff en MVP; por defecto apagado)
- (futuros): `products_manage`, `expirations_manage`, etc.

> Nota: para Staff conviene separar “lookup” vs “manage”.
> En MVP, Staff típicamente NO gestiona catálogo.

---

## Scope de configuración (MVP)

Se soportan 2 scopes:

1. **Org-wide** (default)

- `branch_id = NULL`
- Aplica a todo el staff de la organización (todas las sucursales)

2. **Branch override** (opcional MVP, habilitable si querés)

- `branch_id = <uuid>`
- Sobrescribe para staff operando en esa sucursal

Regla de resolución:

- Si existe override para (org_id, branch_id, role, module_key) → usar ese
- Si no existe → usar org-wide (branch_id NULL)
- Si no existe ninguno → `is_enabled = false`

> Si querés MVP más simple: implementar solo org-wide y dejar branch override Post-MVP.
> (Recomendación: arrancar org-wide.)

---

## UI: Layout

### Header

- Título: “Permisos de Staff”
- Descripción corta: “Definí qué módulos puede usar el personal operativo.”

### Controles superiores

- Selector de scope:
  - “Toda la organización”
  - (Opcional) “Por sucursal” + selector de sucursal
- Search (opcional): filtrar módulos por nombre

### Lista de módulos (cards o rows)

Cada row:

- Nombre del módulo
- Descripción
- Toggle on/off
- (Opcional) “Aplica a: Org / Sucursal X”

### Footer

- Nota: “Los cambios se aplican en tiempo real.”
- Link a “Ver como Staff” (Post-MVP; no en MVP)

---

## Acciones del usuario (MVP)

### A1) Ver permisos actuales

- Renderizar lista completa de módulos disponibles para Staff
- Cada módulo muestra su estado habilitado según scope seleccionado

### A2) Cambiar scope (org-wide / branch)

- Re-cargar estados para ese scope
- Mostrar “override activo” si existe diferencia vs org-wide (opcional)

### A3) Toggle habilitar/deshabilitar módulo

- Persistir cambio inmediatamente (optimistic UI opcional)
- Mostrar toast “Actualizado”

---

## Estados UI

### Loading

- Skeleton lista

### Empty

- No aplica (siempre hay módulos disponibles)
- Si por error la lista de módulos está vacía → error de configuración

### Error (carga o escritura)

- Banner “No pudimos cargar/guardar cambios”
- CTA Reintentar

### Success

- Toast “Permisos actualizados”

---

## Reglas de negocio

### R1) Fuente de verdad

`staff_module_access` es la fuente autoritativa de habilitación por módulo.

### R2) Idempotencia

Togglear debe ser UPSERT sobre unique:

- unique (org_id, branch_id, role, module_key)

### R3) Staff sin módulos habilitados

- Al loguear:
  - Redirect a `/no-access`
- Si estando logueado se deshabilitan todos:
  - Redirigir a `/no-access`

### R4) POS deshabilitado

- Si Staff intenta acceder `/pos`:
  - UI: redirigir
  - Backend: RPC `create_sale` debe denegar

---

## Data Contract (One Screen = One Data Contract)

### Lectura principal

**View/RPC recomendado**: `rpc_get_staff_module_access(scope_branch_id nullable)`

Input:

- `branch_id` nullable
  Output:
- `modules[]` con shape:
  - `module_key`
  - `label`
  - `description`
  - `is_enabled`
  - `source_scope` = `branch_override` | `org_default` | `none`

> Nota: `label/description` pueden vivir en código (const) y la DB solo guarda flags.
> Pero `is_enabled` debe venir resuelto.

### Escritura

**RPC obligatoria**: `rpc_set_staff_module_access(input)`
Input:

- `branch_id` nullable (scope)
- `module_key`
- `is_enabled` boolean
- `role` (en MVP fijo = 'staff'; incluirlo igual por extensibilidad)

Efecto:

- UPSERT en `staff_module_access`
  Output:
- row actualizada

---

## Permisos y seguridad (RLS)

### Lectura

- OA: puede leer filas de `staff_module_access` de su org
- SA: puede leer por soporte (controlado)

### Escritura

- OA: puede upsert en su org
- SA: puede upsert por soporte (controlado)

### Staff

- No puede leer ni escribir settings
- Sí puede leer su “resolución efectiva” mediante una view limitada (opcional):
  - `v_staff_effective_modules` (solo para current_user)

---

## Integración con navegación del Staff

### Construcción de nav

- Al renderizar app shell de Staff:
  - leer módulos efectivos (org-wide o por branch activa)
  - construir items visibles

### Redirect post-login

- Resolver `first_enabled_module_route`
- Si none → `/no-access`

### Cambio en tiempo real

- MVP: refresh al cargar pantalla / cada navegación
- Post-MVP: realtime con supabase channel

---

## Edge cases

1. Org-wide habilita `pos`, branch override lo deshabilita

- Staff en esa sucursal no ve POS
- Si intenta acceder, se redirige y se deniega en backend

2. Conflictos de overrides

- Solo 1 fila por (org, branch, role, module_key) por constraint unique

3. Eliminación de filas

- MVP: no borrar, usar `is_enabled=false`
- Mantiene auditoría simple (append-only se puede sumar Post-MVP)

---

## Métricas / eventos (observabilidad)

- `staff_permissions_viewed` (scope: org|branch)
- `staff_permissions_toggled` (module_key, new_value, scope)
- `staff_permissions_toggle_failed` (reason)

---

## Smoke tests (manual)

### SP-01: Toggle básico org-wide

1. Login OA
2. Ir a `/settings/staff-permissions`
3. Deshabilitar `clients`
4. Login ST (o refrescar)
5. Ver que `clients` desaparece del nav del Staff

### SP-02: Staff sin módulos

1. Deshabilitar todos los módulos
2. Login ST
3. Redirect a `/no-access`

### SP-03: POS deshabilitado enforcement

1. Deshabilitar `pos` para ST
2. ST intenta abrir `/pos`
3. Redirect a primer módulo habilitado o `/no-access`
4. Intentar ejecutar “Cobrar” (si logra llegar) debe fallar por RPC

### SP-04 (si branch override existe): override por sucursal

1. Org-wide habilita `pos`
2. Override branch A deshabilita `pos`
3. ST en branch A no ve POS
4. ST en branch B sí ve POS
