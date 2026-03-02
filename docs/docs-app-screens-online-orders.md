# Screen Contract — Online Orders (Post-MVP)

## Ruta

- `/online-orders`

## Estado

Post-MVP en progreso: contrato DB + UI interna v1 implementadas, con revisión de comprobantes de pago v1.

## Rol / Acceso

- Org Admin (OA): full
- Staff (ST): según módulo `online_orders` y scope de sucursal
- Superadmin (SA): soporte dentro de org activa

## Propósito

Operar pedidos online de punta a punta:

- ver pedidos entrantes
- confirmar/ajustar pedido
- marcar pedido guardado/listo
- marcar pedido entregado
- enviar mensaje asistido por WhatsApp

## UI (alto nivel)

### Header

- filtros: sucursal, estado, rango fecha
- búsqueda: pedido/teléfono/nombre

### Lista de pedidos

Cada row/card:

- código de pedido
- cliente + teléfono
- sucursal
- monto total snapshot
- estado
- hora de creación
- alerta de comprobante pendiente (si aplica)

### Detalle lateral/modal

- items + cantidades + precios snapshot
- notas cliente
- comprobante adjunto (si existe)
- revisión de comprobante (aprobar/rechazar + nota)
- acciones de estado
- CTA “Enviar WhatsApp”

## Estados y acciones

- `pending` -> `confirmed`
- `confirmed` -> `ready_for_pickup`
- `ready_for_pickup` -> `delivered`
- `*` -> `cancelled` (con motivo)

## Data Contract (One Screen = One Data Contract)

### Lectura principal

View: `v_online_orders_admin`

Salida mínima:

- online_order_id
- order_code
- org_id, branch_id, branch_name
- customer_name, customer_phone
- status
- total_amount
- payment_intent
- created_at, updated_at
- tracking_token
- has_payment_proof
- payment_proof_review_status

### Escritura estado

RPC: `rpc_set_online_order_status(online_order_id, new_status, internal_note, customer_note)`

Input mínimo:

- online_order_id
- new_status
- internal_note optional
- customer_note optional
- `notify_via_whatsapp` queda para capa app/integración (no en firma actual RPC)

### Escritura revisión de comprobante

Tabla: `online_order_payment_proofs`

Campos actualizados:

- review_status (`approved`/`rejected`)
- review_note (optional)
- reviewed_by_user_id
- reviewed_at

## Seguridad (RLS)

- OA: lectura/escritura en su org
- ST: lectura/escritura solo en sucursales asignadas y con módulo habilitado
- No cross-org

## Edge cases

- doble click en cambio de estado -> idempotencia por backend
- transición inválida -> error de negocio explícito
- pedido ya entregado/cancelado -> bloquear cambios posteriores
