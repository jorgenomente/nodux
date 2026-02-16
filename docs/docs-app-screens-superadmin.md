# Screen Contract — Superadmin

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/superadmin`

## Rol / Acceso

- Solo Superadmin (SA)

## Propósito (MVP)

Control global del SaaS con alcance mínimo:

listar organizaciones

ver detalle básico (org + sucursales + usuarios count)

“Acceder como” (impersonation controlada) solo si ya existe el mecanismo, si no: dejar como placeholder documentado (no codear sin base).

MVP: nada de billing, nada de analítica avanzada, nada de RBAC fino.

**Estado actual**: UI MVP operativa.

## UI

### Header

Título: “Superadmin”

Search por nombre de org

Lista de organizaciones

Cada row:

org_name

branches_count

users_count

created_at

acción: “Ver”
acción: “Activar” (solo SA de plataforma)

Detalle (panel en misma pantalla)

info básica

form “Nueva sucursal” por org

## Data Contract

### Lectura

View: v_superadmin_orgs

org_id

org_name

branches_count

users_count

created_at

### Lectura detalle (opcional)

View: v_superadmin_org_detail(org_id)

org + branches + users summary

### Escritura

RPC: `rpc_superadmin_create_org(...)`

- crea org + sucursal inicial + preferencias base
- puede vincular OA inicial por `owner_user_id` (opcional)

RPC: `rpc_superadmin_upsert_branch(...)`

- crea/edita sucursales de una org

RPC: `rpc_superadmin_set_active_org(...)`

- define org activa para impersonation controlada

RPC: `rpc_get_active_org_id()`

- devuelve org activa efectiva del usuario actual

## Seguridad

RLS: SA global

Nada de datos operativos de ventas/stock sin impersonation explícita

## Smoke tests

SA-01: SA ve listado de orgs

SA-02: SA entra a detalle y no puede ver data cross-org por accidente (sin impersonation)
