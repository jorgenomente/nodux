# Screen Contract — Orders (Org Admin)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/orders`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org
- Staff: NO (MVP recomendado)

## Propósito

Listar pedidos a proveedor y crear nuevos pedidos por sucursal.

- Permitir ver sugeridos de compra por proveedor y sucursal (MVP simple).

---

## Contexto de sucursal

- Filtro por sucursal (opcional) + estado
- Crear pedido requiere seleccionar sucursal

---

## UI

### Header

- Título: “Pedidos”
- Filtros de listado:
  - Sucursal
  - Estado (draft/sent/reconciled)

### Lista (tabla/cards)

Cada row:

- order_id (short)
- proveedor
- sucursal
- estado
- estado de pago (`payment_state`: pendiente/parcial/pagado/vencido)
- método requerido por proveedor (`preferred_payment_method`: efectivo/transferencia)
- saldo pendiente (`payable_outstanding_amount`)
- vencimiento de pago (`payable_due_on`)
- monto estimado a pagar (sumatoria de items del pedido)
- fecha estimada de recepción (`expected_receive_on`, opcional)
- fecha (created_at / sent_at)
- acción: “Ver” → `/orders/[orderId]`
- Listado separado: pendientes arriba, controlados abajo
- Los borradores archivados no aparecen en el listado principal
- Al final de la pantalla existe botón/sección `Archivados` para expandir borradores archivados
- Solo pedidos `draft` pueden archivarse o restaurarse
- si `expected_receive_on` está en el pasado y el pedido no está controlado: resaltar tarjeta con alerta visual “Recepción vencida”

### Pedidos especiales pendientes

- Visible al seleccionar proveedor + sucursal
- Lista ítems de pedidos especiales por cliente
- Muestra sucursal y proveedor de cada ítem
- Botón “Agregar al pedido”

### Productos con proveedor secundario

- Si el proveedor seleccionado está configurado como secundario para algunos artículos, esos productos también aparecen en la sección de sugeridos
- Deben mostrarse al final, separados visualmente del bloque principal
- La UI aclara que esos productos normalmente se piden con otro proveedor
- Cada fila/tarjeta muestra el nombre del proveedor primario asignado a ese producto

---

## Acciones (MVP)

### A1) Crear pedido (inline)

Paso 1: seleccionar proveedor + sucursal (auto carga sugeridos).

Paso 2: ver sugeridos en la misma pantalla y editar cantidades.

Paso 3: ajustar margen y la columna de promedio de ventas (sección “Ajustes de sugeridos”) y aplicar.

Paso 3.b: editar inline `Stock de resguardo` por artículo si hace falta, sin salir de `/orders`.

Paso 4: agregar notas y guardar borrador / enviar pedido.

Campos:

- proveedor (selector)
- botón `Nuevo proveedor` junto al selector, que abre modal reutilizando el mismo alta de `/suppliers`
- sucursal (selector)
- ajustes de sugeridos: margen de ganancia (%) + columna de promedio de ventas (segun proveedor/semanal/quincenal/mensual)
  - default del margen: `suppliers.default_markup_pct`; fallback `org_preferences.default_supplier_markup_pct`
- `Stock de resguardo` editable por artículo dentro del listado de sugeridos
- cantidades por item (default sugerido)
- notas (opcional)

Comportamiento adicional (compra por paquete):

- si el producto está configurado con `purchase_by_pack=true`, debajo del input
  de cantidad a pedir la UI muestra equivalencia sugerida en paquetes
  (`suggested_qty / units_per_pack`) y equivalencia de lo cargado por el usuario.
- la cantidad operativa sigue guardándose en unidades (`ordered_qty`), no en
  paquetes.

UI: la sección “Armar pedido” es colapsable para ahorrar espacio.

Submit → crea order `draft` o `sent` según botón y redirige al listado con banner de resultado.
En error de validación (ej: sin ítems > 0), conserva contexto de armado (proveedor/sucursal/ajustes) para no perder el draft en pantalla.

Persistencia adicional:

- al guardar borrador o enviar pedido, la pantalla también persiste cualquier cambio inline de `Stock de resguardo` sobre `stock_items.safety_stock` para la sucursal seleccionada.

Entry point auxiliar:

- Si el proveedor no existe, `Nuevo proveedor` abre modal y reutiliza el mismo formulario de alta que `/suppliers`
- Al guardar, vuelve a `/orders` con el proveedor recién creado ya seleccionado en el armado

Validaciones:

- proveedor activo
- sucursal válida
- al menos 1 ítem con cantidad > 0 antes de crear el pedido (si no, no se crea registro en `supplier_orders`)

### A2) Archivar borrador

- Disponible solo para pedidos con `status='draft'`
- Acción desde el listado principal: `Archivar borrador`
- Resultado: el pedido sale del listado operativo y pasa a la sección `Archivados`
- Desde `Archivados` se puede `Restaurar`

### A3) Salida con cambios sin guardar

- Aplica durante el armado de un pedido nuevo en `/orders`
- Si el usuario intenta navegar a otra pantalla de la app con el pedido iniciado, la UI abre modal de confirmación
- El modal ofrece:
  - `Guardar borrador`
  - `Salir sin guardar`
  - `Cancelar`
- Si el usuario cierra/recarga la pestaña o cambia la URL fuera del control de la app, el navegador muestra el prompt nativo de cambios sin guardar

---

## Estados UI

- Loading: skeleton lista
- Empty: “Aún no hay pedidos.” + CTA “Nuevo pedido”
- Error: banner + reintentar
- Success: banner explícito de confirmación (“Pedido enviado correctamente” / “Borrador guardado correctamente”)

---

## Data Contract

### Lectura lista

View: `v_orders_admin(branch_id nullable, status optional, supplier_id optional)`
Salida mínima:

- order_id
- supplier_id, supplier_name
- branch_id, branch_name
- status
- created_at
- sent_at, received_at, reconciled_at (opcional)
- expected_receive_on (opcional)
- items_count (opcional)
- payment_state (derivado desde `supplier_payables`)
- payable_due_on (opcional)
- payable_outstanding_amount (opcional)
- is_archived

Monto estimado por pedido (UI):

- La pantalla calcula `monto estimado` en frontend sumando los ítems del pedido:
  - base: `supplier_order_items.ordered_qty * supplier_order_items.unit_cost`
  - fallback si `unit_cost` no está cargado: `products.unit_price`

### Escritura

RPC: `rpc_create_supplier_order(input)`

- supplier_id
- branch_id
- notes optional
  Output:
- order_id

RPC: `rpc_set_supplier_order_archived(p_org_id, p_order_id, p_is_archived)`

- Solo permite cambiar archivado si el pedido está en `draft`
- `true` mueve el pedido a `Archivados`
- `false` restaura el borrador al listado operativo

### Sugeridos (MVP simple)

View: `v_supplier_product_suggestions(supplier_id, branch_id)`
Salida mínima:

- product_id, product_name
- purchase_by_pack
- units_per_pack
- relation_type
- primary_supplier_name (solo para UI cuando `relation_type='secondary'`, derivado desde relación primaria del producto)
- stock_on_hand (`Stock actual` en UI)
- safety_stock (`Stock de resguardo` en UI)
- avg_daily_sales_30d
- cycle_days
- suggested_qty (`Pedido sugerido` en UI)

Para estimar costo:

- leer `products.unit_price` por product_id
- calcular costo estimado = unit_price \* (1 - margen_pct/100)

UI:

- Mostrar promedio de ventas = avg_daily_sales_30d \* días según la opción elegida
- El título de la columna debe explicitar el período efectivo:
  - si el usuario elige override semanal/quincenal/mensual, mostrar `Promedio de ventas semanal/quincenal/mensual`
  - si queda en `Según proveedor`, mostrar el período real configurado para ese proveedor (ej. `Promedio de ventas mensual`, `Promedio de ventas semanal`, `Promedio de ventas quincenal`)
- En el bloque `Mostrando`, si el modo queda en `Según proveedor`, la UI debe explicitar entre paréntesis la frecuencia efectiva del proveedor (ej. `Promedio: Segun proveedor (semanal)`).
- Cantidad sugerida y cantidad a pedir como entero (redondeo hacia arriba)
- Selector para mostrar promedio semanal/quincenal/mensual (override manual)
- Toggle de vista: tabla/tarjetas (persistido en localStorage)
- Totales: costo estimado + cantidad total de items
- Debajo de `Total estimado`, la UI aclara que es un monto estimado y que el monto real se confirma con el remito en la recepción
- En ese mismo bloque, la UI muestra la preferencia de pago del proveedor seleccionado:
  - efectivo: aclaración de pago al momento de la entrega
  - transferencia: aclaración de pago por transferencia y, si existe, plazo configurado en días desde la fecha del pedido

### Pedidos especiales pendientes

View: `v_special_order_items_pending`
Salida mínima:

- item_id
- special_order_id
- client_name
- product_id, product_name
- remaining_qty
- supplier_id
- supplier_name (opcional, para UI)
- branch_id
- is_ordered

RPC: `rpc_mark_special_order_items_ordered(p_item_ids[], p_supplier_order_id)`

---

## Seguridad (RLS)

- OA: read/write en org
- Debe respetar branch_id dentro del org

---

## Smoke tests

1. Crear pedido desde `/orders`
2. Verlo en lista
3. Abrir detalle
