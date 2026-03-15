# QA Manual — Suscripciones SaaS y Membresía

## Objetivo

Validar manualmente el módulo de suscripciones SaaS implementado en:

- `/superadmin/subscriptions`
- `/settings/membership`

El alcance de esta QA cubre:

- pricing estándar y custom
- datos de cobro plataforma
- upload y visualización de QR
- carga manual de comprobantes
- revisión manual por superadmin
- activación/desactivación de org y sucursales
- alertas y estados comerciales visibles para la org

## Precondiciones

1. Ejecutar:

```bash
npm run db:reset
npm run dev
```

2. Confirmar acceso local en `http://localhost:3000`.
3. Usar usuarios demo:

- Superadmin: `superadmin@demo.com / prueba123`
- Org Admin QA: `admin@demo.com / prueba123`
- Staff QA: `staff@demo.com / prueba123`

4. Confirmar en la base demo local:

- org QA: `Demo QA Org`
- sucursales QA: `Sucursal Palermo` y `Sucursal Caballito`
- existe al menos una suscripción/ciclo para `Demo QA Org`

5. Tener un archivo de prueba para upload:

- 1 imagen liviana para QR
- 1 imagen o PDF liviano para comprobante

## Escenario 1 — Acceso superadmin a la consola comercial

1. Ingresar como `superadmin@demo.com`.
2. Abrir `/superadmin/subscriptions`.
3. Validar:

- carga correcta de la pantalla
- lista de orgs visible
- KPIs superiores visibles
- panel de datos de cobro visible

Resultado esperado:

- superadmin accede sin errores y la consola muestra cartera, filtros y detalle.

## Escenario 2 — Filtros de superadmin

1. En `/superadmin/subscriptions`, probar filtros por:

- búsqueda por org
- `service = active`
- `service = grace`
- `payment = pending`
- `payment = proof_submitted`
- `pricing = standard`
- `pricing = custom`

2. Usar `Aplicar filtros`.
3. Luego usar `Limpiar`.

Resultado esperado:

- la lista se reduce según cada criterio.
- los KPIs se recalculan sobre el conjunto filtrado.
- `Limpiar` restablece la vista general.

## Escenario 3 — Alta o edición comercial en modo standard

1. Seleccionar `Demo QA Org`.
2. En `Configuración comercial`, definir:

- `pricing_mode = standard`
- `base_price_monthly = 100000`
- `included_branches = 1`
- `additional_branch_price_monthly = 80000`
- fechas válidas de inicio, renovación y ciclo

3. Guardar.

Resultado esperado:

- la suscripción se guarda correctamente.
- el monto mensual refleja la fórmula estándar.
- con 2 sucursales activas, el total esperado debe ser `180000`.

## Escenario 4 — Cambio a pricing custom

1. En la misma org, cambiar:

- `pricing_mode = custom`
- `custom_monthly_price = 150000`

2. Guardar.

Resultado esperado:

- el monto visible en superadmin pasa a `150000`.
- en `/settings/membership` la org ve que el precio es acordado manualmente.

## Escenario 5 — Activación y desactivación de sucursales

1. En `Sucursales`, desactivar una sucursal activa.
2. Confirmar que el contador de sucursales activas baja.
3. Si la org está en pricing `standard`, validar el impacto comercial.
4. Volver a activar la sucursal.

Resultado esperado:

- el estado operativo de la sucursal cambia correctamente.
- en pricing estándar, el total mensual se ajusta según la cantidad de sucursales activas.

## Escenario 6 — Activación y desactivación de la org

1. En `Activación de org`, desactivar la org.
2. Validar estado operativo.
3. Volver a activarla.

Resultado esperado:

- la org cambia entre `Activa` e `Inactiva`.
- la acción responde sin error y deja trazabilidad operativa consistente.

## Escenario 7 — Estados de servicio y alertas comerciales

1. Cambiar `service_status` a `grace` con una fecha `grace_until`.
2. Validar banner de riesgo en superadmin.
3. Abrir luego `/settings/membership` con el usuario OA.
4. Validar banner de `gracia`.
5. Repetir con `service_status = suspended`.

Resultado esperado:

- superadmin ve alerta contextual correspondiente.
- OA ve banner claro de `gracia` o `suspendido`.

## Escenario 8 — Datos de cobro plataforma

1. En `/superadmin/subscriptions`, cargar o editar:

- titular
- banco
- tipo de cuenta
- CBU/CVU
- alias
- CUIT
- instrucciones

2. Activar `Datos de cobro visibles`.
3. Guardar.

Resultado esperado:

- los datos se guardan correctamente.
- luego son visibles en `/settings/membership`.

## Escenario 9 — Upload real de QR Mercado Pago

1. En la consola superadmin, cargar una imagen nueva de QR.
2. Guardar datos de cobro.
3. Confirmar preview del QR en superadmin.
4. Ingresar como OA y abrir `/settings/membership`.

Resultado esperado:

- el QR se sube correctamente.
- se renderiza en superadmin.
- se renderiza en membresía de la org.
- no se expone como asset público directo; la visualización ocurre sin error desde la UI.

## Escenario 10 — CTA de superadmin para entrar a la org activa

1. En `/superadmin/subscriptions`, seleccionar `Demo QA Org`.
2. Hacer click en `Activar org e ir a dashboard`.

Resultado esperado:

- la org activa de soporte cambia correctamente.
- superadmin es redirigido a `/dashboard`.
- el contexto visible de `ORG` en la app corresponde a la org seleccionada.

## Escenario 11 — Membresía visible para Org Admin

1. Ingresar como `admin@demo.com`.
2. Abrir `/settings/membership`.
3. Validar:

- plan actual
- estado del servicio
- inicio y renovación
- precio mensual
- sucursales activas
- adicionales cobradas
- monto esperado del ciclo

Resultado esperado:

- OA ve la membresía de su org y no puede editar pricing ni fechas.

## Escenario 12 — Recordatorios y banners de pago

1. Configurar un ciclo con:

- `payment_status = pending`
- `due_on` hoy o fecha pasada

2. Abrir `/settings/membership` como OA.
3. Luego cambiar el ciclo a:

- `proof_submitted`
- `rejected`
- `paid`

4. Revalidar la pantalla en cada caso.

Resultado esperado:

- `pending` vencido: aparece recordatorio de pago pendiente.
- `proof_submitted`: aparece banner de comprobante enviado.
- `rejected`: aparece banner de rechazo con nota si existe.
- `paid`: desaparecen alertas de deuda/revisión.

## Escenario 13 — Carga de comprobante por Org Admin

1. En `/settings/membership`, completar:

- método de pago
- monto informado
- referencia opcional
- archivo comprobante

2. Enviar comprobante.

Resultado esperado:

- aparece mensaje de envío exitoso.
- el pago queda visible en historial.
- el estado del ciclo pasa a revisión pendiente / comprobante enviado.

## Escenario 14 — Revisión manual del comprobante por Superadmin

1. Volver a ingresar como superadmin.
2. Abrir la org correspondiente en `/superadmin/subscriptions`.
3. En `Pagos y comprobantes`, revisar el submission.
4. Probar:

- `Aprobar pago`
- `Rechazar comprobante` con nota
- `Volver a pendiente`
- `Condonar ciclo`

Resultado esperado:

- cada decisión cambia el estado del ciclo correctamente.
- la nota de revisión queda visible para la org cuando aplica.

## Escenario 15 — Historial de pagos en membresía

1. Como OA, abrir nuevamente `/settings/membership`.
2. Revisar `Últimos pagos`.

Resultado esperado:

- se ven fecha de envío, monto, estado y nota de revisión.
- si existe comprobante, el link `Ver comprobante` funciona.

## Escenario 16 — Permisos y aislamiento por rol

1. Como OA, intentar operar elementos que solo corresponden a SA.
2. Como staff (`staff@demo.com`), intentar abrir `/settings/membership`.
3. Como staff, intentar abrir `/superadmin/subscriptions`.

Resultado esperado:

- OA no puede cambiar precios, fechas ni estados comerciales.
- staff no accede a membresía ni a suscripciones superadmin.
- no se exponen datos de otra org.

## Escenario 17 — Regresión básica de navegación

1. Validar presencia de accesos:

- `Suscripciones` en navegación superadmin
- `Membresía` en settings/top bar para org activa

2. Entrar y salir de ambas pantallas varias veces.

Resultado esperado:

- navegación estable.
- sin errores de sesión ni redirecciones incorrectas.

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

1. Superadmin puede configurar pricing, estados de servicio, datos bancarios y QR sin errores.
2. OA ve su membresía con monto correcto según pricing `standard` o `custom`.
3. OA puede enviar comprobante y SA puede revisarlo end-to-end.
4. Los estados `pending`, `proof_submitted`, `paid`, `rejected` y `waived` se reflejan correctamente en ambas pantallas.
5. Activación/desactivación de org y sucursales funciona y el pricing estándar reacciona a sucursales activas.
6. El CTA `Activar org e ir a dashboard` cambia correctamente el contexto de soporte.
7. Los permisos respetan el aislamiento por rol y organización.
8. `lint` y `build` finalizan OK.
