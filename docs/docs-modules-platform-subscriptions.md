# Módulo — Suscripciones SaaS y membresía

## Objetivo

Controlar comercialmente la suscripción de cada organización cliente de NODUX
desde superadmin, y exponer a cada organización una vista clara de su plan,
precio mensual, medios de pago manuales e historial de comprobantes.

El objetivo MVP de este módulo no es integrar cobro automático.
El objetivo es dejar un sistema:

- auditable
- claro para superadmin
- claro para cada org
- compatible con aprobación manual de pagos
- preparado para evolucionar luego a integraciones reales

---

## Roles

- Superadmin (SA): control global comercial y operativo del servicio
- Org Admin (OA): consulta de membresía, carga de comprobantes y seguimiento
- Staff (ST): sin acceso

---

## Alcance MVP

- Definir un esquema comercial mensual por org.
- Cobrar un plan base con 1 sucursal incluida.
- Calcular automáticamente el adicional por sucursales activas extra.
- Permitir override comercial para casos pactados manualmente.
- Permitir bonificación visible por porcentaje o monto fijo.
- Mostrar ciclo actual, vencimiento, monto esperado y estado de pago.
- Mostrar medios de pago manuales de la plataforma:
  - CBU / CVU / alias
  - datos bancarios
  - QR estático de Mercado Pago
- Permitir a SA subir y reemplazar el QR real de cobro desde la consola.
- Permitir carga de comprobante por parte de la org.
- Permitir revisión manual por SA:
  - aprobar
  - rechazar
  - marcar pago manualmente
- Permitir controlar estado del servicio:
  - active
  - grace
  - suspended
  - cancelled
- Permitir activar/desactivar org o sucursales desde SA, con auditoría.

---

## Fuera de alcance MVP

- Débito automático
- Checkout embebido
- Webhooks de pago
- Conciliación bancaria automática
- Factura fiscal automática por suscripción
- Prorrateos complejos
- Cupones o promociones complejas
- Reintentos automáticos de cobro

---

## Modelo comercial recomendado

### Esquema estándar

- `base_price_monthly = 100000`
- `included_branches = 1`
- `additional_branch_price_monthly = 80000`

### Fórmula estándar

- `active_branch_count = cantidad de branches activas de la org`
- `billable_additional_branch_count = max(active_branch_count - included_branches, 0)`
- `calculated_monthly_price = base_price_monthly + billable_additional_branch_count * additional_branch_price_monthly`

### Modos de pricing

#### `standard`

Usa la fórmula automática basada en sucursales activas.

#### `custom`

Permite a SA fijar un monto mensual pactado manualmente para esa org.

Esto evita editar montos cada vez que la org agrega una sucursal, sin perder
flexibilidad comercial.

### Bonificaciones visibles

La configuración comercial puede exponer una bonificación adicional para que la
org vea:

- precio lista
- bonificación aplicada
- total final a pagar
- ahorro mensual

Modos recomendados:

- `none`
- `percent`
- `fixed_amount`

---

## Entidades principales propuestas

### `subscription_plans`

Catálogo de planes base de la plataforma.

Campos recomendados:

- `id`
- `code`
- `name`
- `description`
- `base_price_monthly`
- `included_branches`
- `additional_branch_price_monthly`
- `currency_code`
- `is_active`

### `org_subscriptions`

Configuración comercial vigente por org.

Campos recomendados:

- `id`
- `org_id`
- `plan_id`
- `pricing_mode` (`standard` | `custom`)
- `custom_monthly_price`
- `discount_mode`
- `discount_percent`
- `discount_amount`
- `discount_label`
- `base_price_monthly_snapshot`
- `included_branches_snapshot`
- `additional_branch_price_monthly_snapshot`
- `started_on`
- `renews_on`
- `service_status`
- `grace_until`
- `billing_notes_internal`
- `customer_note_visible`
- `is_auto_branch_pricing_enabled`
- `created_at`
- `updated_at`

### `org_subscription_cycles`

Ciclos mensuales concretos de facturación y seguimiento.

Campos recomendados:

- `id`
- `org_subscription_id`
- `cycle_start_on`
- `cycle_end_on`
- `due_on`
- `expected_amount`
- `list_price_amount`
- `discount_amount_applied`
- `final_amount`
- `discount_mode_snapshot`
- `discount_percent_snapshot`
- `discount_amount_snapshot`
- `discount_label_snapshot`
- `active_branch_count_snapshot`
- `billable_additional_branch_count_snapshot`
- `payment_status`
- `paid_at`
- `payment_confirmed_at`
- `payment_confirmed_by`
- `rejection_reason`
- `created_at`
- `updated_at`

### `org_subscription_payments`

Registro append-only de eventos de pago o revisión.

Campos recomendados:

- `id`
- `org_subscription_cycle_id`
- `payment_method`
- `amount_reported`
- `reference_text`
- `proof_storage_path`
- `proof_uploaded_by`
- `proof_uploaded_at`
- `review_status`
- `reviewed_by`
- `reviewed_at`
- `review_note`
- `created_at`

### `platform_billing_settings`

Fuente de verdad de los datos de cobro de la plataforma.

Campos recomendados:

- `id` singleton
- `bank_account_holder`
- `bank_name`
- `bank_account_type`
- `bank_cbu`
- `bank_alias`
- `bank_cuit`
- `mercadopago_qr_image_path`
- `payment_instructions`
- `is_active`
- `updated_at`

Assets asociados:

- bucket privado `platform-billing-assets`
- el campo `mercadopago_qr_image_path` apunta al asset cargado por SA
- la UI lo expone con signed URL server-side

---

## Reglas de negocio

### R1) La suscripción no depende de un checkbox manual de “pagado”

El estado real se deriva por ciclo:

- `pending`
- `proof_submitted`
- `paid`
- `rejected`
- `waived`

### R2) El precio estándar se calcula desde sucursales activas

El sistema mira `branches.is_active` de la org y calcula el total del ciclo con
snapshot para no perder trazabilidad histórica.

### R3) Los cambios de precio no deben destruir historia

El ciclo guarda snapshot de:

- precio base
- sucursales incluidas
- valor por sucursal extra
- precio lista calculado
- bonificación aplicada
- cantidad de sucursales activas
- monto esperado final

### R4) El servicio y el pago son conceptos distintos

No mezclar:

- `payment_status`
- `service_status`

Una org puede estar:

- con pago pendiente y servicio `grace`
- con pago pendiente y servicio `suspended`
- con pago aprobado y servicio `active`

### R5) Superadmin puede operar excepciones

SA puede:

- marcar pago manual
- aprobar comprobante
- rechazar comprobante
- fijar precio custom
- extender gracia
- suspender o reactivar servicio

Todo auditado.

### R6) Org Admin solo opera su org

OA puede:

- ver su plan
- ver monto esperado
- ver medios de pago
- subir comprobante
- ver historial y estado de revisión

### R7) Los assets de cobro no son públicos

- El QR de Mercado Pago se almacena en bucket privado.
- SA lo sube desde `/superadmin/subscriptions`.
- OA lo visualiza en `/settings/membership` mediante signed URL server-side.

### R8) SA puede cambiar de contexto a una org desde suscripciones

- La consola comercial permite fijar la org activa de soporte.
- Luego redirige a `/dashboard` para inspección operativa rápida.

### R9) La bonificación es una capa separada del pricing

- Primero se determina el precio lista.
- Luego se aplica una bonificación visible.
- El total final es el monto realmente cobrado.
- La UI de OA debe mostrar explícitamente el ahorro para reforzar percepción de valor.

OA no puede aprobar pagos ni cambiar pricing.

### R7) Suspensión comercial no debe destruir datos

Suspender una org no elimina datos.
Solo limita acceso operativo según la política definida más adelante en implementación.

### R8) Activación de sucursales impacta precio

Si el modelo está en `pricing_mode=standard`, activar o desactivar sucursales
impacta el cálculo del próximo ciclo y, si se desea, el ciclo vigente según la
regla comercial que fijemos en DB.

Para MVP se recomienda:

- no prorratear
- recalcular desde el siguiente ciclo
- permitir override manual si SA quiere cobrar distinto en el ciclo actual

---

## Pantallas asociadas

- `/superadmin/subscriptions`
- `/settings/membership`
- `/superadmin`

---

## Contratos propuestos

### Lectura SA

- `v_superadmin_subscriptions`
- `v_superadmin_subscription_detail`

### Lectura OA

- `v_org_membership`
- `v_org_membership_payments`

### Escritura SA

- `rpc_upsert_org_subscription(...)`
- `rpc_set_org_subscription_service_status(...)`
- `rpc_set_org_subscription_cycle_payment_status(...)`
- `rpc_set_org_active_status(...)`
- `rpc_set_branch_active_status(...)`

### Escritura OA

- `rpc_create_org_subscription_payment_submission(...)`

### Escritura plataforma

- `rpc_upsert_platform_billing_settings(...)`

---

## Seguridad / RLS

- SA global: lectura/escritura total del módulo.
- OA: lectura/escritura sólo sobre su `org_id`.
- ST: sin acceso.
- Comprobantes en Storage privado.
- Lectura del comprobante solo para SA y OA de la org dueña.
- Todas las acciones críticas vía RPC con auditoría.

---

## Decisiones de UX recomendadas

- Mostrar siempre:
  - plan actual
  - monto mensual esperado
  - cantidad de sucursales activas
  - fecha de próxima renovación
  - estado del servicio
  - estado del último pago
- Antes de suspender, mostrar banner `grace`.
- En OA, distinguir visualmente:
  - `Pago pendiente`
  - `Comprobante enviado`
  - `Pago aprobado`
  - `Comprobante rechazado`

---

## Smoke tests objetivo

1. SA ve todas las orgs y su estado comercial.
2. OA solo ve su membresía.
3. Cambiar `branches.is_active` modifica el cálculo estándar esperado.
4. OA sube comprobante y queda `proof_submitted`.
5. SA aprueba y el ciclo queda `paid`.
6. SA rechaza y el ciclo vuelve a estado operable con motivo visible.
7. SA suspende org y el estado queda auditado.
