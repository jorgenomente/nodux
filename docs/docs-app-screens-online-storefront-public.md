# Screen Contract — Storefront público (Post-MVP)

## Ruta

- `/:orgSlug`
- `/:orgSlug/:branchSlug`

## Estado

Post-MVP en progreso: contrato DB + UI pública v1 implementadas.

## Rol / Acceso

- Público (sin login)

## Propósito

Permitir que clientes vean productos y hagan pedidos online conectados al catálogo real de NODUX.

## Comportamiento por ruta

- `/:orgSlug`: muestra selector de sucursal (si hay más de una activa) y luego catálogo.
- `/:orgSlug/:branchSlug`: entra directo al catálogo de esa sucursal.

## UI (alto nivel)

### Header

- nombre de tienda
- sucursal activa
- buscador
- carrito

### Catálogo

Cada card:

- foto representativa
- nombre de producto
- precio
- stock disponible (visible o etiqueta disponibilidad)
- acción “Agregar”

### Checkout

Campos mínimos:

- nombre
- teléfono (WhatsApp)
- notas
- forma de pago declarada (retiro/transferencia/qr)

Salida:

- número de pedido
- link de tracking público
- CTA WhatsApp (mensaje prearmado)

## Data Contract (One Screen = One Data Contract)

### Lectura principal

RPC 1: `rpc_get_public_storefront_branches(org_slug)`
RPC 2: `rpc_get_public_storefront_products(org_slug, branch_slug)`

Salida mínima:

- org_id, org_name, org_slug
- branch_id, branch_name, branch_slug
- product_id, product_name
- unit_price
- stock_on_hand
- image_url
- is_available

### Escritura checkout

RPC: `rpc_create_online_order(org_slug, branch_slug, customer_name, customer_phone, payment_intent, items, customer_notes)`

Input mínimo:

- org_slug
- branch_slug
- customer_name
- customer_phone
- payment_intent
- items[]

Output mínimo:

- online_order_id
- order_code
- tracking_token

## Seguridad

- Solo datos públicos permitidos en contrato storefront.
- Nunca exponer IDs internos sensibles en URL pública.
- Rate limit y anti-spam requeridos en creación de pedido.

## Edge cases

- org slug inexistente -> 404 pública
- sucursal inexistente/inactiva -> fallback a selector de sucursal
- producto sin stock -> no bloquea visualización, sí bloquea cantidades inválidas
- cambios de precio entre vista y envío -> validar en backend y devolver resumen ajustado
