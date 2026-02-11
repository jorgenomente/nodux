# Screen Contract — Clients (Org Admin + Staff, scope limitado)

**Estado actual**: implementado (lista + detalle + pedidos especiales con ítems).

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/clients`

## Rol / Acceso

- Org Admin (OA): full
- Staff (ST): solo si módulo `clients` habilitado
- Superadmin (SA) dentro de org: soporte (redirige a /superadmin)

## Propósito

Gestionar clientes y pedidos especiales (lo que la tienda debe conseguir para un cliente):

- crear/editar cliente
- crear pedido especial con ítems de catálogo
- cambiar estado del pedido especial
- ver historial simple (MVP)

MVP: esto NO es “ecommerce” ni “CRM avanzado”.

## Contexto de sucursal

- OA: puede filtrar por sucursal (opción “Todas” para el listado).
- ST: solo su sucursal activa (sin “todas”).
- Pedidos especiales siempre requieren `branch_id`.

## Entidades

- clients
- client_special_orders (o similar)
- status: pending | ordered | partial | delivered | cancelled

Importante: esto define el contrato funcional, no el schema final.
El schema real se confirma repo-aware cuando se implemente.

## UI: Layout (alto nivel)

### Header

- Título: “Clientes”
- Search: nombre / teléfono / email (según exista)
- Selector sucursal (solo OA)

### Sección A — Lista de clientes

Cada row:

- nombre
- contacto (tel/email)
- “Pedidos activos” (count, opcional MVP)
- acción: seleccionar fila (abre detalle debajo)

### Sección B — Detalle cliente (panel inline)

- Datos cliente
- Lista de pedidos especiales del cliente (últimos N)
- CTA: “Nuevo pedido especial”

### Sección C — Pedidos especiales (creación/edición)

Sección dentro del panel:

- selector de productos del catálogo (múltiples)
- cantidad (entera)
- proveedor sugerido (primario) + override manual
- notas
- estado
- sucursal (solo OA si está en “todas”)

## Acciones del usuario (MVP)

### A1) Crear cliente

Campos mínimos:

- name (requerido)
- phone (opcional)
- email (opcional)
- notes (opcional)

### A2) Editar cliente

- update simple

### A3) Crear pedido especial

Campos:

- client_id
- branch_id (según contexto; OA debe seleccionar sucursal si está en “todas”)
- items[] (producto + cantidad + proveedor opcional)
- notas (opcional)
- status inicial: pending

### A4) Cambiar estado de pedido especial

pending → ordered → partial → delivered
cancelled (solo cancelación total)

### A5) Ir a POS

- Desde el pedido especial se puede abrir `/pos` con los ítems precargados.
- El stock se descuenta en POS al cobrar.

timestamps opcionales (Post-MVP); en MVP basta updated_at

## Estados UI

- Loading: skeleton lista (pendiente de UI)
- Empty: “No hay clientes para este filtro.”
- Empty pedidos: “Este cliente no tiene pedidos especiales.”
- Error: banner + reintentar
- Success: cambios visibles tras guardar (sin toast global)

## Data Contract (One Screen = One Data Contract)

### Lectura principal

RPC: `rpc_list_clients(scope_branch_id nullable, search nullable, limit, offset)`

Salida:

clients[]:

- client_id
- name
- phone, email
- active_special_orders_count (opcional)
- last_order_status (opcional)
- special_orders_by_client (opcional en MVP)

Detalle: `rpc_get_client_detail(client_id)` al seleccionar cliente (incluye ítems).

### Escrituras

RPC: `rpc_upsert_client(input)`

- client_id nullable
- name, phone, email, notes

RPC: `rpc_create_special_order(input)`

- client_id
- branch_id
- items (jsonb)
- notes optional

RPC: `rpc_set_special_order_status(input)`

- special_order_id
- new_status
- reason optional (MVP: opcional; recomendable requerido para “cancelled”)

## Seguridad (RLS)

OA:

- read/write dentro de org, todas las sucursales

ST:

- read/write solo dentro de su branch asignada/activa

enforcement adicional: módulo clients habilitado (como se hace en POS)

No cross-org.

## Edge cases

Cliente duplicado (mismo teléfono)

MVP: permitido (warning UX Post-MVP)

Pedido especial creado por Staff, visto por OA

debe reflejar branch_name y actor (si existe)

## Smoke tests (manual)

CL-01: OA crea cliente + pedido especial y lo ve en lista

CL-02: ST con módulo habilitado crea pedido especial solo en su sucursal

CL-03: ST sin módulo → redirect a fallback / no-access

CL-04: Cambiar estado del pedido y verlo reflejado en dashboard (cuando exista integración)
