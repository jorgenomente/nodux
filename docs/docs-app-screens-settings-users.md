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

Staff: NO

Propósito

Gestionar usuarios de la organización:

crear usuario (email + contraseña, sin validación por email)

asignar rol (OA o ST)

asignar sucursal(es) para Staff

activar/desactivar acceso (soft)

MVP: permisos finos por acción NO.
Staff permissions por módulo se hace en /settings/staff-permissions.

UI: Layout
Header

Título: “Usuarios”

CTA: “Crear usuario”

Crear usuario en panel desplegable (collapsed por defecto)

Search: nombre/email

Lista de usuarios

Toggle de visualización: `Tabla` | `Tarjetas`

Cada row:

nombre / email

rol (OA/ST)

sucursal(es) asignadas (si ST)

estado: activo/inactivo

acción: “Editar”

Vista `Tabla`: filas compactas con columnas fijas (nombre, email, rol, sucursales) y acción “Editar”.

Vista `Tarjetas`: resumen por usuario optimizado para lectura vertical/mobile.

En ambas vistas, la edición se revela al hacer click en “Editar”.

Modal “Invitar/Editar”
Panel “Crear/Editar”

Campos:

email

password (alta)

display_name (opcional)

role: OA | ST

branches (checklist con checkbox si role=ST)

si role=OA, ocultar checklist y mostrar nota de acceso global por organización

estado activo/inactivo

Panel “Credenciales (admin)”

usuario/email visible (solo lectura)

nueva contraseña (input)

acción: “Restablecer contraseña”

Acciones (MVP)

Crear usuario

Cambiar rol

Asignar branches

Desactivar usuario (revocar acceso operativo)

Restablecer contraseña (solo admin)

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

Server action/API server-side:

- `auth.admin.createUser` (Supabase Admin API, con `email_confirm=true`)
- luego asignación en org vía RPCs de membresía ejecutadas con sesión autenticada OA/SA

RPC: rpc_invite_user_to_org(input)

email

role

branch_ids (si ST)
Output:

user_id

RPC: rpc_update_user_membership(input)

user_id

role

branch_ids

is_active

Nota: en MVP se usa alta directa con contraseña inicial y sin confirmación de email.
El `service_role` se usa solo para Admin API de Auth (crear/reset password); las RPCs de membresía se ejecutan con sesión autenticada para conservar `actor_user_id` en auditoría.

Seguridad

OA solo gestiona su org

ST no puede leer settings

ST no puede cambiar su contraseña en MVP; debe solicitar reset al admin.

Superadmin no se crea, lista ni edita desde esta pantalla.

Smoke tests

US-01: OA crea Staff y lo asigna a sucursal A

US-02: Staff login y queda en módulo correcto

US-03: OA desactiva Staff → Staff no puede operar (debe fallar en guards/RLS)

US-04: OA restablece contraseña de Staff y el Staff puede iniciar con la nueva.
