# Screen Contract — Tracking público de pedido online (Post-MVP)

## Ruta

- `/o/:trackingToken`

## Estado

Post-MVP en progreso: contrato DB + UI pública v1 implementadas.

## Rol / Acceso

- Público (sin login, vía token)

## Propósito

Permitir al cliente consultar el estado de su pedido con un link único, sin exponer datos internos.

## UI (alto nivel)

### Header

- nombre de tienda
- código de pedido
- estado actual (badge)

### Timeline de estado

- pendiente
- confirmado
- guardado/listo para retirar
- entregado
- cancelado

### Bloque de ayuda

- mensaje de estado actual
- teléfono de contacto
- botón WhatsApp (mensaje prearmado)

## Data Contract (One Screen = One Data Contract)

RPC: `rpc_get_online_order_tracking(token)`

Salida mínima:

- order_code
- store_name
- branch_name
- status
- created_at
- last_status_at
- timeline[]
- contact_phone

## Seguridad

- token aleatorio no enumerable
- respuesta limitada al pedido del token
- expiración opcional de token con estrategia de rotación

## Edge cases

- token inválido/expirado -> pantalla de link no válido
- pedido cancelado -> mostrar estado final + contacto
