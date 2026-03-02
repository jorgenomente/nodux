# QA Manual — Ecommerce y Pedidos Online v1

## Objetivo

Validar manualmente el flujo de tienda online conectado a stock, checkout, tracking público y comprobantes de pago (carga pública + revisión interna).

## Precondiciones

1. Ejecutar:

```bash
npm run db:reset
npm run dev
```

2. Confirmar acceso local en `http://localhost:3000`.
3. Usuario admin demo: `admin@demo.com / prueba123`.
4. Usuario staff demo: `staff@demo.com / prueba123`.

## Escenario 1 — Configuración inicial storefront

1. Ingresar como admin.
2. Verificar que la org tenga `storefront_settings.is_enabled = true`.
3. Verificar que org y sucursales activas tengan `storefront_slug`.

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

1. Completar nombre, teléfono, método de pago y notas.
2. Confirmar pedido.

Resultado esperado:

- pedido creado exitosamente.
- código de pedido visible.
- link de tracking `/o/<trackingToken>` disponible.

## Escenario 5 — Tracking público

1. Abrir `/o/<trackingToken>`.
2. Validar:
- estado actual.
- timeline de estados.
- botón de contacto WhatsApp (si hay teléfono configurado).

Resultado esperado:

- tracking responde sin login y con datos correctos del pedido.

## Escenario 6 — Carga pública de comprobante (nuevo)

1. En `/o/<trackingToken>`, adjuntar archivo válido (`jpg/png/webp`, <= 5MB).
2. Enviar formulario.

Resultado esperado:

- mensaje de éxito.
- comprobante persistido para revisión interna.

Pruebas negativas:

1. Subir archivo no imagen.
2. Subir archivo > 5MB.
3. Usar token inválido o expirado.

Resultado esperado:

- error controlado y mensaje claro, sin fallas de servidor.

## Escenario 7 — Gestión interna `/online-orders`

1. Ingresar como admin.
2. Abrir `/online-orders`.
3. Buscar el pedido generado.

Resultado esperado:

- pedido visible con estado correcto.
- badge/comprobante visible cuando exista.
- link a tracking funcional.

## Escenario 8 — Revisión de comprobante (nuevo)

1. En el pedido, abrir comprobante (signed URL).
2. Probar aprobar con nota.
3. Probar rechazar con nota.

Resultado esperado:

- estado de revisión actualizado (`approved`/`rejected`).
- nota persistida.
- cambios visibles tras recarga.

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
2. Carga de comprobante pública funciona y errores negativos están controlados.
3. Revisión interna de comprobantes funciona (aprobar/rechazar + nota).
4. Transiciones de estado del pedido son correctas.
5. Permisos de staff respetan módulo y sucursal.
6. `lint` y `build` finalizan OK.
