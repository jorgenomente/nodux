# Screen Contract — Superadmin Subscriptions

## Ruta

- `/superadmin/subscriptions`

## Rol / Acceso

- Solo Superadmin (SA)

## Propósito

Dar a superadmin una consola comercial del SaaS para controlar:

- plan por org
- sucursales activas
- monto mensual esperado
- estado del ciclo actual
- estado del servicio
- comprobantes enviados por clientes

No es una pantalla de soporte operativo del negocio.
Es una pantalla de control comercial y continuidad del servicio.

---

## UI

### Header

- Título: `Suscripciones`
- subtítulo con resumen de cartera:
  - orgs activas
  - orgs en gracia
  - orgs suspendidas
  - MRR estimado
- CTA secundario: `Volver a superadmin`
- CTA principal contextual: `Activar org e ir a dashboard`
  - disponible cuando hay una org seleccionada
  - usa la org activa de soporte de SA y redirige a `/dashboard`

### Filtros

- búsqueda por org
- estado del servicio
- estado de pago del ciclo actual
- modo de pricing (`standard` / `custom`)
- CTA `Aplicar filtros`
- CTA `Limpiar`

### Resumen superior

- orgs visibles con los filtros actuales
- orgs activas
- orgs en riesgo (`grace` + `suspended`)
- MRR estimado filtrado

### Tabla principal

Cada row muestra:

- org
- plan
- sucursales activas
- sucursales incluidas
- precio base
- adicional por sucursal
- total mensual esperado
- inicio de plan
- próxima renovación
- estado de pago
- estado del servicio
- acciones: `Ver`, `Editar`, `Suspender/Reactivar`

### Detalle lateral o panel expandido

Bloques:

1. `Resumen comercial`
   - org
   - timezone
   - cantidad de sucursales activas / inactivas
   - plan actual
   - pricing mode
   - monto esperado del ciclo

2. `Configuración de suscripción`
   - presentada como configurador guiado, no como formulario plano
   - sub-bloque `Lo que ve el cliente`
     - precio lista
     - bonificación
     - total final
     - ahorro mensual
   - sub-bloque `Cómo se calcula`
     - pricing_mode
     - base_price_monthly
     - included_branches
     - additional_branch_price_monthly
     - custom_monthly_price (solo si aplica)
   - sub-bloque `Bonificación`
     - discount_mode (`none` / `percent` / `fixed_amount`)
     - discount_percent / discount_amount solo cuando corresponda
     - discount_label
   - sub-bloque `Vigencia y ciclo`
     - started_on
     - renews_on
     - cycle_start_on
     - cycle_end_on
     - cycle_due_on
     - grace_until
   - sub-bloque `Notas`
     - customer_note_visible
     - billing_notes_internal
   - CTA único `Guardar configuración comercial`

3. `Servicio`
   - service_status
   - grace_until
   - motivo interno
   - CTA `Pasar a gracia`
   - CTA `Suspender`
   - CTA `Reactivar`

4. `Ciclo actual`
   - cycle_start_on
   - cycle_end_on
   - due_on
   - expected_amount
   - payment_status
   - paid_at / confirmed_at

5. `Pagos y comprobantes`
   - lista de submissions
   - preview de comprobante
   - amount_reported
   - reference_text
   - review_status
   - review_note
   - CTAs:
     - `Aprobar`
     - `Rechazar`
     - `Marcar pago manual`

6. `Operación de org`
   - activar/desactivar org
   - activar/desactivar sucursal
   - advertencia si impacta precio esperado

7. `Datos de cobro plataforma`
   - titular
   - banco
   - tipo de cuenta
   - CBU / alias / CUIT
   - upload real de QR Mercado Pago
   - preview del QR actual vía signed URL server-side
   - instrucciones de pago
   - toggle `datos de cobro visibles`

---

## Estados UI

- loading
- empty sin clientes
- empty sin resultados
- error de carga
- success de edición
- success de aprobación/rechazo
- alertas contextuales para:
  - org en gracia
  - org suspendida
  - comprobante pendiente de revisión
  - comprobante rechazado

---

## Data Contract

### Lectura principal

View: `v_superadmin_subscriptions`

Salida mínima:

- `org_id`
- `org_name`
- `org_is_active`
- `timezone`
- `plan_id`
- `plan_name`
- `pricing_mode`
- `base_price_monthly`
- `included_branches`
- `additional_branch_price_monthly`
- `discount_mode`
- `discount_percent`
- `discount_amount`
- `discount_label`
- `active_branch_count`
- `billable_additional_branch_count`
- `calculated_monthly_price`
- `list_price_monthly`
- `discount_amount_applied`
- `custom_monthly_price`
- `effective_monthly_price`
- `started_on`
- `renews_on`
- `current_cycle_due_on`
- `current_cycle_payment_status`
- `service_status`
- `grace_until`

### Lectura detalle

View: `v_superadmin_subscription_detail`

Salida mínima:

- resumen de org y branches
- subscription actual
- ciclo actual
- últimos pagos/submissions
- billing settings visibles al cliente

### Escrituras

RPC: `rpc_upsert_org_subscription(...)`

- crea o actualiza configuración comercial de una org

RPC: `rpc_set_org_subscription_service_status(...)`

- cambia `service_status`
- permite setear `grace_until`

RPC: `rpc_set_org_subscription_cycle_payment_status(...)`

- aprobar / rechazar / marcar pago manual

RPC: `rpc_set_org_active_status(...)`

- activa o desactiva la org

RPC: `rpc_set_branch_active_status(...)`

- activa o desactiva una sucursal

RPC: `rpc_upsert_platform_billing_settings(...)`

- actualiza datos bancarios visibles a clientes
- persiste `mercadopago_qr_image_path`

RPC: `rpc_superadmin_set_active_org(...)`

- fija la org activa de soporte de SA antes de redirigir al dashboard

---

## Seguridad

- Solo SA global.
- Todas las mutaciones auditadas.
- No debe exponer datos operativos sensibles de ventas/stock aquí.
- Los comprobantes y el QR viven en buckets privados.
- El QR se sirve mediante signed URL server-side.

---

## Smoke tests

1. SA filtra por org y estado.
2. SA cambia pricing estándar a custom.
3. SA aplica bonificación porcentual y ve precio lista, ahorro y total final.
4. SA aprueba comprobante y el ciclo cambia a `paid`.
5. SA rechaza comprobante con nota.
6. SA suspende org.
7. SA desactiva una sucursal y ve impacto en pricing esperado.
8. SA sube un QR nuevo y luego lo ve renderizado en la consola.
9. SA activa una org y entra directo a `/dashboard`.
