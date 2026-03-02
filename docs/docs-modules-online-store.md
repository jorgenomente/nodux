# Módulo — Tienda online y pedidos online (Post-MVP)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Objetivo

Abrir un canal de venta online conectado al inventario real de NODUX:

- catálogo público por organización/sucursal
- pedido online por cliente final
- gestión operativa del pedido por staff/admin
- tracking público por link único

## Estado

Post-MVP en progreso: fundación DB implementada (migración 068) + UI pública v1 (`/:orgSlug`, `/:orgSlug/:branchSlug`, `/o/:trackingToken`) + UI interna v1 (`/online-orders`).

## Roles

- Público: navegación storefront + checkout + tracking con token
- Staff (ST): gestión de pedidos online de su sucursal (si módulo habilitado)
- Org Admin (OA): gestión total de pedidos online en su org
- Superadmin (SA): soporte dentro de org activa

## Entidades principales

### storefront_settings

Configuración de tienda online por org y opcional por sucursal:

- slug de org (obligatorio)
- slug de sucursal (opcional)
- branding básico
- estado activo/inactivo de storefront
- dominio personalizado opcional

### online_orders

Cabecera de pedido online:

- org_id, branch_id
- order_code público corto
- customer_name, customer_phone
- pickup_mode (retiro)
- payment_intent (retiro/transferencia/qr)
- status
- notes de cliente/staff

### online_order_items

Ítems del pedido online:

- product_id
- quantity
- unit_price_snapshot
- product_name_snapshot

### online_order_status_history

Historial append-only de estados:

- online_order_id
- old_status/new_status
- changed_by (nullable para transiciones automáticas)
- changed_at
- internal_note
- customer_note

### online_order_tracking_tokens

Token público para seguimiento:

- online_order_id
- token (único, no guessable)
- expires_at (opcional)
- is_active

### online_order_payment_proofs

Comprobantes adjuntos por cliente:

- online_order_id
- storage_path
- uploaded_at
- review_status (pending/approved/rejected)
- reviewed_by/reviewed_at

## Estados de pedido online (propuestos)

- `pending`: pedido creado por cliente, pendiente de revisión
- `confirmed`: aceptado por tienda (puede incluir ajustes)
- `ready_for_pickup`: pedido guardado/listo para retirar
- `delivered`: retirado/entregado
- `cancelled`: cancelado

## Reglas de negocio (invariantes)

- R1) El storefront siempre está scopeado a una org (y opcional sucursal).
- R2) El precio de checkout usa snapshot para preservar auditoría.
- R3) No se descuenta stock al crear pedido online; se descuenta al cerrar venta (POS o flujo equivalente).
- R4) Cada cambio de estado debe quedar auditado.
- R5) El tracking público no expone datos sensibles internos.
- R6) El token de tracking no debe permitir enumeración.

## Pantallas asociadas (Post-MVP)

- Storefront público: `/:orgSlug` y `/:orgSlug/:branchSlug`
- Tracking público: `/o/:trackingToken`
- Gestión interna: `/online-orders`

## Data contracts (resumen)

- Lectura sucursales storefront: `rpc_get_public_storefront_branches(org_slug)`
- Lectura productos storefront: `rpc_get_public_storefront_products(org_slug, branch_slug)`
- Escritura checkout: `rpc_create_online_order(org_slug, branch_slug, customer_name, customer_phone, payment_intent, items, customer_notes)`
- Lectura gestión interna: `v_online_orders_admin`
- Cambio de estado: `rpc_set_online_order_status(online_order_id, new_status, internal_note, customer_note)`
- Tracking público: `rpc_get_online_order_tracking(token)`

## Integraciones (Post-MVP)

- WhatsApp asistido (link prearmado) como primer paso
- WhatsApp automático como evolución posterior
- Dominio custom por tienda (CNAME) o redirect administrado
