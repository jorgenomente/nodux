# Screen Contract — Expirations

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/expirations`

## Rol / Acceso

- Org Admin (OA): full
- Staff (ST): opcional si módulo habilitado (lectura + mover a desperdicio; sin ajustes avanzados)

## Propósito

Visualizar y gestionar productos por vencer por sucursal, con alertas accionables.

---

## Contexto de sucursal (branch context)

- Selector: sucursal (obligatorio)
- Default:
  - OA: primera sucursal activa
  - ST: sucursal activa

---

## UI: Layout

### Header

- Título “Vencimientos”
- Selector de sucursal
- Chips de filtro: Vencidos / Critico (0-3 dias) / Pronto (4-7 dias) / Todas

### Lista priorizada

Cada row:

- Producto (nombre)
- Fecha vencimiento
- Días restantes (badge)
- Cantidad (si aplica)
- Batch code (si existe)
- CTA: “Ajustar cantidad” / “Corregir fecha” (solo OA)
- Si está vencido (days_left < 0), se muestra:
  - Fecha vencida + días desde vencimiento
  - Precio unitario
  - Pérdida estimada (cantidad \* precio)
  - CTA: “Mover a desperdicio” (OA + ST)

### Sección “Desperdicio”

Cada row:

- Producto
- Fecha de registro
- Cantidad
- Precio unitario
- Pérdida registrada

Resumen:

- Total desperdicio (ARS) por sucursal

### Acciones

- Botón “Registrar vencimiento” (modal) — OA y ST (si habilitado)

---

## Acciones del usuario (MVP)

### A1) Filtrar por severidad y sucursal

- Refresca lista automaticamente al cambiar sucursal o severidad

### A2) Registrar vencimiento manual (modal)

Campos:

- Producto (select)
- Fecha vencimiento (date picker)
- Cantidad (decimal)
  (Sucursal tomada del selector actual)
  Submit → crea batch manual

### A3) Ajustar batch (solo OA)

Desde row/detalle:

- “Marcar como agotado” (quantity=0)
- “Ajustar cantidad” (nuevo valor)
  Submit → RPC ajuste (append-only en movimientos)

### A4) Corregir fecha (solo OA)

Desde row/detalle:

- “Corregir fecha” (date + motivo)
  Submit → RPC actualizar fecha con audit log

### A5) Mover vencidos a desperdicio (OA + ST)

- Confirma cantidad vencida del batch
- Mueve todo el batch a desperdicio
- Descuenta stock y registra pérdida
  Los vencidos se muestran en la lista principal hasta que se confirma el desperdicio.

---

## Estados UI

### Loading

- skeleton lista

### Empty

- “No hay vencimientos próximos.”
- CTA: “Registrar vencimiento”

### Error

- Banner “No pudimos cargar vencimientos” + Reintentar

### Success

- Banner “Vencimiento registrado/ajustado”

---

## Data Contract (One Screen = One Data Contract)

### Lectura

View recomendada: `v_expirations_due(branch_id nullable, severity optional)`
Salida mínima:

- batch_id
- product_id
- product_name
- expires_on
- days_left
- severity (critical|warning|info) — la UI filtra por `days_left` (vencidos < 0 / 0-3 / 4-7)
- quantity
- batch_code
- unit_price (solo vencidos)
- total_value (solo vencidos)
- branch_id
- branch_name

View: `v_expiration_waste_summary(branch_id)`
Salida mínima:

- total_amount
- total_quantity

View: `v_expiration_waste_detail(branch_id)`
Salida mínima:

- waste_id
- product_id, product_name
- quantity
- unit_price_snapshot
- total_amount
- created_at

### Escrituras

RPC 1: `rpc_create_expiration_batch_manual(input)`

- branch_id
- product_id
- expires_on
- quantity

RPC 2 (OA): `rpc_adjust_expiration_batch(input)`

- batch_id
- new_quantity
- reason (text, required)

RPC 3 (OA): `rpc_update_expiration_batch_date(input)`

- batch_id
- new_expires_on
- reason (text, required)

RPC 4 (OA + ST): `rpc_move_expiration_batch_to_waste(input)`

- batch_id
- expected_qty

---

## Permisos y seguridad (RLS)

- OA: puede leer/escribir batches de su org (todas las sucursales)
- ST:
  - lectura solo de sucursal asignada/activa
  - escritura manual solo en sucursal asignada/activa
  - Puede mover vencidos a desperdicio (MVP)
  - NO puede ajustar batches (MVP)

- Enforcements:
  - Policies por org_id + branch_id
  - Validación de módulo habilitado para ST (si se activa el acceso)

---

## Edge cases

1. Venta sin batches suficientes

- No bloquea UI aquí
- Puede generar alerta en dashboard (Post-MVP o MVP simple: contar inconsistencias)

2. Batch con cantidad 0

- Ocultar por defecto
- Mostrar solo si filtro “Mostrar agotados” (Post-MVP)

3. Parámetros severidad cambian

- Recalcular en view (no persistir severity)

---

## Métricas / eventos

- `expirations_viewed` (scope, severity)
- `expiration_batch_created_manual`
- `expiration_batch_adjusted`

---

## Smoke tests (manual)

### EX-01: Registro manual

1. Login OA
2. Ir a `/expirations`
3. Registrar vencimiento manual para producto X
4. Verlo en lista con días restantes

### EX-02: Ajuste OA

1. Ajustar batch a quantity=0 con reason
2. Ver actualización en lista

### EX-03: Filtros

1. Filtrar critico/pronto
2. Validar que cambia listado

### EX-04: Corregir fecha

1. Corregir fecha con motivo
2. Ver actualización en lista
