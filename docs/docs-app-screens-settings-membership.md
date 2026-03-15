# Screen Contract — Settings: Membership

## Ruta

- `/settings/membership`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa, en modo soporte
- Staff: NO

## Propósito

Mostrar a la organización su membresía comercial actual y darle un flujo simple
para:

- entender qué plan tiene
- saber cuánto debe pagar
- ver cuántas sucursales activas están siendo consideradas
- consultar medios de pago manuales
- subir comprobante
- revisar pagos anteriores

---

## UI

### Header

- Título: `Membresía`
- subtítulo: `Estado de tu plan y pagos`
- banners de riesgo según estado:
  - servicio en gracia
  - servicio suspendido
  - pago pendiente vencido
  - comprobante enviado
  - comprobante rechazado

### Tarjeta de plan actual

- nombre del plan
- estado del servicio
- fecha de inicio
- próxima renovación
- pricing mode

### Tarjeta de precio mensual

- precio base
- sucursales incluidas
- sucursales activas
- sucursales adicionales cobradas
- precio por sucursal adicional
- precio lista
- bonificación visible
- ahorro mensual
- total mensual esperado

Helper:

- si el pricing es `custom`, mostrar `Precio mensual acordado`
- si el pricing es `standard`, mostrar desglose automático

### Tarjeta de ciclo actual

- período actual
- vencimiento
- precio lista del ciclo
- bonificación aplicada al ciclo
- estado de pago
- monto esperado
- fecha de aprobación o rechazo si existe
- motivo de rechazo si aplica

### Tarjeta de medios de pago

- titular
- banco
- tipo de cuenta
- CBU / CVU
- alias
- CUIT
- QR estático
- instrucciones de pago
- el QR se sirve con signed URL server-side desde bucket privado

### Sección `Informar pago`

Formulario:

- resumen previo con monto esperado y vencimiento
- monto transferido
- referencia / observación
- adjuntar comprobante
- CTA `Enviar comprobante`

### Historial

Lista de últimos pagos:

- fecha de envío
- monto informado
- estado
- nota de revisión

---

## Estados UI

- loading
- empty sin configuración comercial
- empty sin historial
- error
- success al subir comprobante

---

## Data Contract

### Lectura principal

View: `v_org_membership`

Salida mínima:

- `org_id`
- `org_name`
- `plan_name`
- `pricing_mode`
- `service_status`
- `started_on`
- `renews_on`
- `base_price_monthly`
- `included_branches`
- `active_branch_count`
- `billable_additional_branch_count`
- `additional_branch_price_monthly`
- `effective_monthly_price`
- `current_cycle_id`
- `current_cycle_start_on`
- `current_cycle_end_on`
- `current_cycle_due_on`
- `current_cycle_expected_amount`
- `current_cycle_payment_status`
- `current_cycle_review_note`
- billing settings visibles

### Lectura historial

View: `v_org_membership_payments`

Salida mínima:

- `payment_id`
- `cycle_id`
- `submitted_at`
- `amount_reported`
- `reference_text`
- `review_status`
- `review_note`
- `reviewed_at`

### Escritura

RPC: `rpc_create_org_subscription_payment_submission(...)`

- crea submission de pago para el ciclo actual
- valida org activa del usuario
- valida servicio permitido
- persiste metadatos del comprobante

---

## Reglas

- OA no puede cambiar precios ni fechas.
- OA puede ver solo su org.
- La carga de comprobante no aprueba el pago automáticamente.
- Si el último submission fue rechazado, la org puede volver a enviar.

---

## Seguridad

- Scope por `org_id`.
- Storage privado para comprobantes.
- OA/SA solo ven comprobantes de su org activa.
- El QR de cobro no se expone como asset público; se entrega firmado server-side.

---

## Smoke tests

1. OA ve monto mensual correcto según sucursales activas.
2. OA ve precio lista, bonificación y ahorro mensual cuando existe beneficio activo.
3. OA ve QR/CBU y datos bancarios.
4. OA sube comprobante y queda visible en historial.
5. OA no puede ver pagos de otra org.
6. OA ve el QR actualizado cuando SA cambia el asset de cobro.
