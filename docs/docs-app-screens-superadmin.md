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

**Estado actual**: placeholder MVP (pantalla informativa, sin listado real).

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

Detalle (MVP puede ser modal o subruta futura)

info básica

botón “Entrar a dashboard de esta org” (si impersonation existe)

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

## Seguridad

RLS: SA global

Nada de datos operativos de ventas/stock sin impersonation explícita

## Smoke tests

SA-01: SA ve listado de orgs

SA-02: SA entra a detalle y no puede ver data cross-org por accidente (sin impersonation)
