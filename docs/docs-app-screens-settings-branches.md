Screen Contract — Settings: Branches

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

Ruta

/settings/branches

Rol / Acceso

Org Admin (OA)

Superadmin (SA) dentro de org

Staff: NO

Propósito

Gestionar sucursales:

crear sucursal

editar nombre/datos básicos

activar/desactivar (si aplica)

ver resumen básico (usuarios asignados, opcional)

Gestionar dispositivos de cobro por sucursal (POS):

alta de dispositivo

edición de nombre/proveedor

activar/desactivar

UI

Lista de sucursales

CTA “Nueva sucursal”

Modal crear/editar:

name (requerido)

address (opcional)

is_active (default true)

Bloque dispositivos de cobro por sucursal:

device_name (requerido)

provider (`posnet` | `mercadopago` | `other`)

is_active

Convención sugerida de nombres (operativa):

`MP QR`

`MP Posnet 1`, `MP Posnet 2`, ...

`MP Alias`

`Posnet principal`

Validación suave UX:

autocomplete/sugerencias en input `device_name` (sin bloqueo) con nombres estándar.

Data Contract
Lectura

View: v_branches_admin

branch_id

name

address

is_active

members_count (opcional)

Escritura

RPC: rpc_upsert_branch(input)

branch_id nullable

name

address optional

is_active

Tabla: pos_payment_devices (insert/update)

id

org_id

branch_id

device_name

provider

is_active

Edge cases

Desactivar sucursal con stock/ventas:

MVP: permitir, pero bloquear operación futura (no seleccionable)

Staff asignado a sucursal inactiva:

debe quedar sin branch válida → fallback a otra o /no-access (decisión: en MVP, preferible impedir desactivar si hay staff activo)

Smoke tests

BR-01: crear sucursal B y verla en selectors (dashboard/products/orders)

BR-02: desactivar sucursal y verificar que no aparece como seleccionable
