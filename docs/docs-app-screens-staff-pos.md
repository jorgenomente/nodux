# Screen Contract — Staff POS

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/pos`

## Rol / Acceso

- Staff (ST) con módulo `pos` habilitado (vía `staff_module_access`)
- Org Admin (OA) también puede acceder (operación o auditoría básica) — se define en su contrato (admin-pos.md) si se separa.
- Si ST no tiene `pos` habilitado:
  - Redirigir al primer módulo habilitado
  - Si no hay módulos: `/no-access`

## Propósito

Registrar ventas en segundos (táctil/mobile-first), minimizando fricción y errores.

## Definición de “Venta” en MVP

Una venta es un registro con:

- branch_id (contexto de sucursal)
- items (producto + cantidad + precio)
- método de pago (simple)
- total
- timestamp
  y genera:
- decremento de stock (por sucursal)
- movimiento(s) append-only en `movements`
- (si aplica) impacto en vencimientos (ver reglas)

---

## Contexto de sucursal (branch context)

- Staff opera **una sucursal activa** a la vez.
- En MVP:
  - Si ST tiene 1 sucursal asignada: se usa esa.
  - Si tiene >1: debe elegir sucursal activa (selector simple en header del POS).
- El POS siempre filtra y escribe con `branch_id = active_branch_id`.

---

## UI: Componentes / Layout (alto nivel)

### Header

- Sucursal activa (selector si corresponde)
- Buscador / input de escaneo
- Acceso rápido a “Consulta de precio” (si módulo habilitado)

### Área principal

- Lista de ítems en carrito (líneas editables)
- Total + método de pago
- CTA principal: “Cobrar”

### Footer (táctil)

- Botón “Limpiar”
- Botón “Guardar borrador” (MVP: NO, fuera de scope)
- Botón “Historial” (MVP: NO, fuera de scope)

---

## Acciones del usuario (MVP)

### A1) Agregar producto por escaneo

- Input acepta código de barras
- Si match único:
  - agrega 1 unidad (o abre modal de peso si aplica)
- Si no hay match:
  - mostrar estado “Producto no encontrado” + CTA “Buscar” (o ir a lookup si habilitado)

### A2) Agregar producto por búsqueda

- Búsqueda por nombre / código interno
- Resultados rápidos (top N, limit 20)
- Tap para agregar al carrito
- Regla UX: mínimo 3 caracteres
- Búsqueda por tokens (orden libre) y debounce

### A3) Ajustar cantidad

- Para productos por unidad: stepper +/- (min 1)
- Para productos por peso/granel: input numérico con unidad (kg/g)
- Recalcular subtotal línea y total

### A4) Remover ítem

- Swipe delete o icono “X”

### A5) Seleccionar método de pago (simple)

- Enumeración MVP: `cash`, `debit`, `credit`, `transfer`, `other`
- Solo 1 método por venta en MVP (sin split payments)

### A6) Cobrar (confirmar venta)

- Valida:
  - carrito no vacío
  - stock suficiente (si política de stock lo exige)
- Ejecuta RPC server-authoritative (ver Data Contract)
- Muestra “Venta realizada” + recibo simple (pantalla/modal) + opción “Nueva venta”

---

## Reglas de negocio (invariantes)

### R1) Precio usado en venta

- Se toma del precio vigente del producto para la sucursal (MVP: precio por producto, no por lista).
- En venta se “snapshotea”:
  - `unit_price` y `product_name` (opcional) para no depender de cambios futuros.

### R2) Stock

- Cada ítem descuenta stock de la sucursal.
- Política MVP:
  - Permitir stock negativo: **SI por defecto** (para evitar bloqueos por desincronización)
  - Si no hay stock suficiente y se deshabilita negativos → error “Stock insuficiente”
  - (Recomendación futura) Toggle “permitir negativo” por sucursal (Post-MVP)

### R3) Productos por peso/granel

- El producto define `sell_unit_type`: `unit` | `weight` | `bulk`
- `quantity` se almacena como decimal
- Se define `uom` (unidad de medida) de forma consistente (ej: kg como base)

### R4) Vencimientos (MVP)

- Si el sistema maneja batches/lotes con vencimiento:
  - La venta descuenta del batch más próximo a vencer (FEFO) **si existe asignación automática**
- Si no hay batches:
  - solo descuenta stock agregado
- El detalle de batch allocation queda explicitado en el módulo de vencimientos.
  - Este contrato solo exige que la venta “no rompa” vencimientos.

### R5) Auditoría

- Toda venta genera movimientos append-only:
  - `movement_type = sale`
  - referencia a `sale_id`
  - detalle por item (o movimientos por item)

---

## Estados de UI

### Loading

- Cargando sucursal activa / permisos / catálogo rápido

### Empty (carrito vacío)

- Mensaje: “Escaneá o buscá un producto para empezar”
- CTA: foco en input de escaneo

### Error (genérico)

- Banner/toast con mensaje claro
- Reintentar si aplica

### Error: Producto no encontrado

- “No encontramos ese código”
- CTA: “Buscar por nombre” / “Ir a consulta de precios” (si habilitado)

### Error: Stock insuficiente

- Indicar producto afectado y stock disponible
- Permitir ajustar cantidad o remover

### Success

- Confirmación “Venta registrada”
- Mostrar total y método
- Botón “Nueva venta” (resetea carrito)

---

## Data Contract (One Screen = One Data Contract)

### Lecturas (ST)

1. **Permisos + módulos habilitados**

- Fuente: `staff_module_access` (org-wide o branch-specific)
- Objetivo: decidir acceso y UI

2. **Sucursal activa y sucursales asignadas**

- Fuente: `branch_memberships` (y/o helper `current_branch_ids()`)
- Objetivo: selector de sucursal (si aplica)

3. **Catálogo rápido de productos (para búsqueda)**

- Contrato sugerido: `v_pos_product_catalog`
- Campos mínimos:
  - product_id
  - name
  - barcode
  - sku/internal_code
  - sell_unit_type (unit/weight/bulk)
  - uom
  - unit_price
  - stock_on_hand (por branch)
  - is_active

> Nota: el catálogo debe estar optimizado (limit + search index).
> Para escaneo por barcode: query exacta por barcode.

---

### Escrituras (ST)

**RPC obligatoria**: `rpc_create_sale(input)`

- Server-authoritative (valida permisos, branch, stock)
- Input (conceptual):
  - branch_id
  - payment_method
  - items: [{ product_id, quantity }]
- Output:
  - sale_id
  - total
  - receipt_number (opcional)
  - created_at

Efectos:

- Inserta `sales`
- Inserta `sale_items`
- Actualiza stock (o inserta movimientos y deriva stock)
- Inserta `movements` append-only
- Ajusta vencimientos si aplica

---

## Permisos y seguridad (RLS)

### Reglas (alto nivel)

- ST solo puede:
  - leer catálogo/stock de sus branches asignadas
  - crear ventas en sus branches asignadas
  - leer ventas propias (MVP: opcional; por defecto NO listado)
- OA puede operar en cualquier branch de su org.

### Validación por módulo

- Si `pos` está deshabilitado para ST:
  - RLS debe impedir inserción/lectura vinculada al módulo (al menos la RPC debe validar).
- En MVP, el bloqueo hard se garantiza en:
  - RPC `create_sale` (deny si módulo pos deshabilitado)
  - Tablas subyacentes con policies por rol/org/branch

---

## Edge cases

1. ST con múltiples sucursales

- Debe elegir sucursal activa antes de cobrar

2. Producto inactivo

- No se puede agregar al carrito

3. Cambio de permisos en vivo

- Si se deshabilita `pos` mientras está en POS:
  - bloquear acción “Cobrar”
  - redirigir al primer módulo habilitado

4. Conectividad intermitente

- MVP: sin modo offline
- Mostrar error y permitir reintentar

---

## Métricas / eventos (observabilidad)

- `pos_product_scanned` (match/no-match)
- `pos_product_added`
- `pos_checkout_attempted`
- `pos_sale_created` (total, items_count)
- `pos_sale_failed` (razón: stock, permisos, server_error)
- Tiempo desde primer ítem hasta cobro (UX KPI)

---

## Smoke tests (manual)

### ST-01: Venta simple

1. Login Staff con módulo POS habilitado
2. Ir a `/pos`
3. Agregar producto por búsqueda
4. Cobrar con “cash”
5. Ver confirmación
6. Ver stock decrementado en `/products` (si ST no accede, validar como OA)

### ST-02: Escaneo no encontrado

1. Escanear código inexistente
2. Ver error “no encontrado” + CTA

### ST-03: Stock insuficiente

1. Intentar vender cantidad mayor al stock
2. Ver error “stock insuficiente”
3. Ajustar cantidad
4. Cobrar OK

### ST-04: Permiso pos deshabilitado

1. Deshabilitar `pos` para el Staff (como OA)
2. Staff intenta cobrar
3. Debe fallar (UI + RPC)
4. Redirigir al primer módulo habilitado o `/no-access`
