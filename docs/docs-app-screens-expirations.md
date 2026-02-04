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
- Staff (ST): opcional si módulo habilitado (recomendación MVP: lectura + crear manual simple; sin ajustes)

## Propósito

Visualizar y gestionar productos por vencer por sucursal, con alertas accionables.

---

## Contexto de sucursal (branch context)

- Selector: “Todas” + sucursal
- Default:
  - OA: “todas” (si >1 sucursal)
  - ST: sucursal activa (sin “todas”)

---

## UI: Layout

### Header

- Título “Vencimientos”
- Selector de sucursal
- Chips de severidad: Critical / Warning / All

### Lista priorizada

Cada row:

- Producto (nombre)
- Fecha vencimiento
- Días restantes (badge)
- Cantidad (si aplica)
- Sucursal (si scope = todas)
- CTA: “Ver” (detalle) / “Ajustar” (solo OA)

### Acciones

- Botón “Registrar vencimiento” (modal) — OA y ST (si habilitado)

---

## Acciones del usuario (MVP)

### A1) Filtrar por severidad y sucursal

- Refresca lista

### A2) Registrar vencimiento manual (modal)

Campos:

- Producto (search)
- Fecha vencimiento (date picker)
- Cantidad (decimal)
- Sucursal (si OA y scope=todas)
  Submit → crea batch manual

### A3) Ajustar batch (solo OA)

Desde row/detalle:

- “Marcar como agotado” (quantity=0)
- “Ajustar cantidad” (nuevo valor)
  Submit → RPC ajuste (append-only en movimientos)

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

- Toast “Vencimiento registrado/ajustado”

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
- severity (critical|warning|info)
- quantity
- branch_id
- branch_name

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

---

## Permisos y seguridad (RLS)

- OA: puede leer/escribir batches de su org (todas las sucursales)
- ST:
  - lectura solo de sucursal asignada/activa
  - escritura manual solo en sucursal asignada/activa
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

1. Filtrar critical/warning
2. Validar que cambia listado
