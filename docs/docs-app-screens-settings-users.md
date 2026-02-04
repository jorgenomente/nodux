Screen Contract — Settings: Users

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

Ruta

/settings/users

Rol / Acceso

Org Admin (OA)

Superadmin (SA) dentro de org (soporte)

Staff: NO

Propósito

Gestionar usuarios de la organización:

invitar usuario (email)

asignar rol (OA o ST)

asignar sucursal(es) para Staff

activar/desactivar acceso (soft)

MVP: permisos finos por acción NO.
Staff permissions por módulo se hace en /settings/staff-permissions.

UI: Layout
Header

Título: “Usuarios”

CTA: “Invitar usuario”

Search: nombre/email

Lista de usuarios

Cada row:

nombre / email

rol (OA/ST)

sucursal(es) asignadas (si ST)

estado: activo/inactivo

acción: “Editar”

Modal “Invitar/Editar”

Campos:

email (invite)

display_name (opcional)

role: OA | ST

branches (multi-select si role=ST)

estado activo/inactivo

Acciones (MVP)

Crear invitación

Cambiar rol

Asignar branches

Desactivar usuario (revocar acceso operativo)

Data Contract
Lectura

View recomendada: v_settings_users_admin

user_id

email

display_name

role

is_active

branches[] (o string join)

created_at

Escrituras

RPC: rpc_invite_user_to_org(input)

email

role

branch_ids (si ST)
Output:

invitation_id / user_id (según implementación)

RPC: rpc_update_user_membership(input)

user_id

role

branch_ids

is_active

Nota: el mecanismo de invitación (magic link / password set) se decide en implementación.
En docs, solo definimos el contrato.

Seguridad

OA solo gestiona su org

ST no puede leer settings

SA soporte controlado

Smoke tests

US-01: OA invita Staff y lo asigna a sucursal A

US-02: Staff login y queda en módulo correcto

US-03: OA desactiva Staff → Staff no puede operar (debe fallar en guards/RLS)
