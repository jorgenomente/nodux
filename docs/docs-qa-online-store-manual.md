# QA Manual — Ecommerce y Pedidos Online v1

## Objetivo

Validar manualmente el flujo de tienda online conectado a stock, checkout simplificado, notificación por WhatsApp y tracking público detallado.

## Precondiciones

1. Ejecutar:

```bash
npm run db:reset
npm run dev
```

2. Confirmar acceso local en `http://localhost:3000`.
3. Usuario admin demo: `admin@demo.com / prueba123`.
4. Usuario staff demo QA: `staff@demo.com / prueba123`.
5. Usuario demo publico readonly: `demo-readonly@demo.com / prueba123` solo para `/demo`.

## Escenario 1 — Configuración inicial storefront

1. Ingresar como admin.
2. Ir a `/settings` y validar sección "Tienda online":

- `Estado storefront = Habilitado`.
- `Org slug` visible.
- Links públicos por sucursal visibles.

3. Ir a `/settings/branches` y validar WhatsApp de tienda por sucursal.

Resultado esperado:

- storefront habilitado para acceso público por slug.

## Escenario 2 — Ruta pública por organización

1. Abrir `/<orgSlug>`.
2. Validar listado de sucursales activas.
3. Seleccionar una sucursal.

Resultado esperado:

- navegación correcta a `/<orgSlug>/<branchSlug>`.

## Escenario 3 — Catálogo público por sucursal

1. En `/<orgSlug>/<branchSlug>` validar:

- nombre, precio, stock e imagen (si existe) por producto.
- carrito funcional (agregar/quitar).
- total calculado correctamente.

Resultado esperado:

- productos visibles y consistentes con stock.

## Escenario 4 — Checkout de pedido online

1. Completar nombre, WhatsApp, dirección y notas.
2. Confirmar pedido.

Resultado esperado:

- pedido creado exitosamente.
- código de pedido visible.
- link de tracking `/o/<trackingToken>` disponible.
- método de pago indicado como "Pagar al retirar".
- aparece CTA para notificar pedido por WhatsApp a la tienda.

## Escenario 5 — Notificación WhatsApp a tienda

1. Desde checkout exitoso, hacer click en "Notificar a la tienda por WhatsApp".
2. Verificar que abre WhatsApp con mensaje prearmado.

Resultado esperado:

- mensaje incluye pedido, datos cliente, items y total.
- se envía al número configurado de la sucursal.

## Escenario 6 — Tracking público detallado

1. Abrir `/o/<trackingToken>`.
2. Validar:

- estado actual.
- resumen del cliente (nombre, WhatsApp, dirección).
- detalle de ítems y total.
- timeline de estados.
- botón de contacto WhatsApp (si hay teléfono configurado).

Resultado esperado:

- tracking responde sin login y con datos correctos del pedido.

## Escenario 7 — Gestión interna `/online-orders`

1. Ingresar como admin.
2. Abrir `/online-orders`.
3. Buscar el pedido generado.

Resultado esperado:

- pedido visible con estado correcto.
- datos del cliente (incluida dirección) visibles.
- detalle de artículos visible.
- link a tracking funcional.
- botón `Cobrar en POS` visible para pedidos no finalizados.

## Escenario 8 — Cobro en POS desde pedido online

1. En `/online-orders`, click en `Cobrar en POS`.
2. Validar que abre `/pos?online_order_id=...`.
3. Confirmar que el carrito del POS viene precargado con los ítems del pedido.
4. Cobrar la venta en POS.

Resultado esperado:

- venta registrada correctamente.
- el pedido online avanza a `delivered` después del cobro.

## Escenario 9 — Transiciones de estado del pedido

1. Ejecutar transiciones válidas:

- `pending -> confirmed`
- `confirmed -> ready_for_pickup`
- `ready_for_pickup -> delivered`

Resultado esperado:

- transiciones válidas aplican correctamente.
- estados finales no permiten más cambios.

## Escenario 10 — Permisos staff

1. Ingresar como staff.
2. Verificar acceso a `/online-orders` según módulo `online_orders`.
3. Verificar visibilidad por sucursales asignadas.

Resultado esperado:

- staff con módulo activo: solo ve/gestiona sucursales asignadas.
- staff sin módulo o sin membership: redirección a `no-access` o home correspondiente.

## Smoke técnico de cierre

Ejecutar:

```bash
npm run lint
npm run build
```

Resultado esperado:

- ambos comandos en estado OK.

## Criterio de aprobación

Se aprueba QA manual cuando:

1. Checkout y tracking funcionan sin errores.
2. Notificación por WhatsApp abre mensaje completo al número correcto de sucursal.
3. Tracking muestra información completa del pedido (cliente, ítems, total, estado).
4. Handoff a POS funciona (`Cobrar en POS`) y cierra pedido al cobrar.
5. Transiciones de estado del pedido son correctas.
6. Permisos de staff respetan módulo y sucursal.
7. `lint` y `build` finalizan OK.
