# Módulo — Vencimientos

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Objetivo

Evitar pérdidas por productos vencidos mediante:

- registro confiable de fechas de vencimiento
- visibilidad centralizada
- alertas in-app por severidad
- reglas claras de consumo/ajuste (MVP)
- trazabilidad de lotes por recepcion (batch_code)

---

## Roles

- Org Admin (OA): acceso completo (crear/editar/ajustar)
- Staff (ST): acceso opcional si se habilita módulo (recomendación MVP: lectura + registro simple desde góndola, sin ajustes avanzados)

---

## Entidades principales

### expiration_batches

Representa un “lote” de producto con vencimiento dentro de una sucursal.

Campos clave (conceptual):

- id (uuid)
- org_id
- branch_id
- product_id
- expires_on (date)
- quantity (decimal) — cantidad asociada al lote disponible para consumo
- source_type (text): `purchase` | `manual` | `adjustment`
- source_ref_id (uuid, nullable) — order_id u otro
- created_at
- updated_at

> Nota: En MVP, `quantity` puede representar “cantidad existente en ese lote” sin necesidad de trazabilidad perfecta
> por proveedor/lote real. Lo importante es FEFO + alertas + ajuste.

---

## Reglas de negocio (invariantes)

### R1) Vencimiento es por sucursal

Todo batch tiene `branch_id`. No existen batches “globales”.

### R2) Un batch no puede tener cantidad negativa

- `quantity >= 0`
- Para “consumir”, se descuenta (ver R4)

### R3) Severidad (alertas)

Basada en `days_left`:

- CRÍTICO: `days_left <= critical_days` (default 3)
- WARNING: `critical_days < days_left <= warning_days` (default 7)
- INFO: > warning_days

Parámetros:

- `critical_days`, `warning_days` configurables (MVP: settings/preferences simples)

### R4) Consumo FEFO (MVP)

Cuando una venta descuenta stock, si se usa batches:

- consumir de batches del producto ordenados por `expires_on ASC`
- hasta cubrir la cantidad vendida
- si no hay batches suficientes:
  - en MVP permitir que el stock se descuente igual (porque stock es la “verdad operativa”) y marcar inconsistencia como alerta “sin batch”
  - (alternativa strict) bloquear venta si el producto requiere batch tracking (Post-MVP)

> Decisión MVP recomendada: “best effort” FEFO + alerta, no bloquear ventas.

### R4.1) Creación automática de batches (MVP)

- Al recibir pedidos a proveedor, si el producto tiene `shelf_life_days`, se crea un batch:
  - `expires_on = fecha_recepcion + shelf_life_days`
  - `batch_code = <SUP>-<YYYYMMDD>-<NNN>` (SUP = 3 letras proveedor)
  - `quantity = received_qty`
- Si `shelf_life_days` es null/0, no se generan batches automáticos.

### R5) Registro manual desde góndola (MVP)

OA puede registrar batches manualmente:

- selecciona producto
- fecha de vencimiento
- cantidad estimada
  (branch actual seleccionado)
  Esto crea `expiration_batches` con `source_type=manual`.
  `batch_code` queda vacío.

### R6) Ajustes (MVP)

Ajuste de vencimientos se registra como movimiento append-only:

- `movement_type = expiration_adjustment`
- referencia al batch
  Permite:
- corregir cantidad (por merma/vencido)
- marcar batch como agotado (quantity=0)

### R7) Correccion de fecha (MVP)

- Permite corregir fecha de vencimiento aproximada a la fecha real.
- Registra audit log con motivo.

---

## Pantallas asociadas

- `/expirations` (OA)
- (Opcional ST si habilitado) `/expirations` en modo lectura/registro simple (si querés separar, crear `/expirations/scan` Post-MVP)

---

## UX: Principales vistas del módulo

1. Lista por vencer (ordenada por urgencia)
2. Filtros:
   - sucursal (branch)
   - rango por días (0-3 / 4-7 / todas)
   - la severidad en view sigue basada en org_preferences
3. Crear batch manual
4. Ajuste de batch (OA)
5. “Inconsistencias” (alertas):
   - producto con stock pero sin batches
   - batches con cantidad pero stock 0 (desalineación)

---

## Data contracts (resumen)

- View: `v_expirations_due` (lista priorizada)
- View: `v_expiration_batch_detail` (detalle + historial)
- RPC: `rpc_create_expiration_batch_manual(...)`
- RPC: `rpc_adjust_expiration_batch(...)`
- RPC: `rpc_update_expiration_batch_date(...)`

---

## Edge cases

- Productos sin vencimiento: en MVP se modela como “no se registran batches” (no alertar si el producto se marca `has_expiration=false` Post-MVP).
- Batch duplicado (mismo product + expires_on): permitido (o merge automático Post-MVP).
- Cambios de parámetros (critical_days/warning_days) recalculan severidad al vuelo.

---

## Métricas

- batches creados por semana
- % ventas con consumo FEFO exitoso
- conteo alertas críticas por sucursal
- pérdidas registradas por vencimiento (Post-MVP si se agrega costo)

---

## Smoke tests

- Crear batch manual
- Ver aparición en lista “por vencer”
- Ajustar batch (quantity → 0) y verificar que desaparece o cambia estado
- Corregir fecha y verificar orden en lista
- Crear venta y verificar consumo FEFO (si implementado)
