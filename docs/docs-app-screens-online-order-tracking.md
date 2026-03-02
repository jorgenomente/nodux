# Screen Contract — Tracking público de pedido online (Post-MVP)

## Ruta

- `/o/:trackingToken`

## Estado

Post-MVP en progreso: contrato DB + UI pública v1 implementadas, incluyendo carga de comprobante de pago desde link público.

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

### Comprobante de pago

- input de archivo (jpg/png/webp, hasta 5MB)
- envío del comprobante asociado al `trackingToken`
- feedback de éxito/error al cliente

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

### Escritura complementaria (server action)

- valida `trackingToken` activo/no expirado
- sube archivo en `storage` bucket `online-order-proofs`
- inserta fila en `online_order_payment_proofs` con `review_status='pending'`

## Seguridad

- token aleatorio no enumerable
- respuesta limitada al pedido del token
- expiración opcional de token con estrategia de rotación

## Edge cases

- token inválido/expirado -> pantalla de link no válido
- pedido cancelado -> mostrar estado final + contacto
