# Activity Log

Registro de cambios importantes del proyecto.

Formato sugerido:

## YYYY-MM-DD — <titulo corto>

**Tipo:** decision | feature | refactor | fix | docs | db | rls | ux | tests
**Alcance:** backend | frontend | db | rls | ux | infra

**Resumen**
Breve descripcion de que se hizo y por que.

**Impacto**

- Que habilita
- Que cambia
- Que NO cambia

## 2026-02-11 — Pedidos especiales con items y POS

**Tipo:** db
**Alcance:** db + frontend + docs

**Resumen**
Se extendieron los pedidos especiales para manejar ítems con proveedores, estado partial/cancelled, alertas en /orders y cobro desde POS con cierre opcional. Se actualizaron contratos y documentación viva.

**Impacto**

- Permite registrar pedidos especiales por ítems del catálogo.
- Conecta pedidos especiales con pedidos a proveedor y POS (stock se descuenta al cobrar).
- Se agrega opción de cierre al cobrar y soporte de entrega parcial.

**Archivos**

- supabase/migrations/20260210133000_023_special_order_status_extend.sql
- supabase/migrations/20260210140000_024_clients_special_orders_items.sql
- app/clients/page.tsx
- app/clients/ClientSpecialOrderItemsClient.tsx
- app/orders/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- app/pos/page.tsx
- app/pos/PosClient.tsx
- docs/docs-app-screens-clients.md
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-modules-clients.md
- docs/docs-modules-supplier-orders.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11) · `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Fix POS: RLS en ventas

**Tipo:** fix
**Alcance:** db

**Resumen**
Se ajusto `rpc_create_sale` como security definer con validaciones de acceso para permitir ventas de Staff sin romper RLS.

**Impacto**

- POS funciona para Staff con módulo habilitado y sucursal asignada.
- Se mantiene control de acceso por módulo y sucursal.
- No cambia el flujo de negocio ni UI.

**Archivos**

- supabase/migrations/20260211095500_025_rpc_create_sale_security_definer.sql
- docs/docs-data-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Smoke test POS + seed real

**Tipo:** tests
**Alcance:** tests + infra + data

**Resumen**
Se agrego smoke test de POS (venta rapida + pedido especial) y se extendio seed demo con proveedores, productos y clientes reales para pruebas manuales.

**Impacto**

- Permite validar el flujo POS y pedidos especiales con datos reales.
- Agrega datos smoke sin afectar logica de negocio.
- No cambia UI ni contratos.

**Archivos**

- e2e/smoke-pos.spec.ts
- playwright.config.ts
- scripts/seed-demo-data.js
- docs/prompts.md

**Tests:** `npx playwright test -g "smoke"` FAIL (2026-02-11) — `browserType.launch` permission denied (MachPortRendezvousServer)
**Commit:** N/A

## 2026-02-11 — Debug POS venta

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se agregó salida de error detallada (modo dev) en POS para diagnosticar fallos del RPC de venta.

**Impacto**

- Facilita identificar causa del 400 en `rpc_create_sale`.
- No cambia lógica de negocio ni seguridad.
- Visible solo en entorno no producción.

**Archivos**

- app/pos/PosClient.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Fix POS: created_at ambiguo

**Tipo:** fix
**Alcance:** db

**Resumen**
Se corrigieron referencias ambiguas a `created_at` dentro de `rpc_create_sale` calificando columnas.

**Impacto**

- Evita error 42702 al cobrar en POS.
- Mantiene el mismo comportamiento funcional.
- No cambia UI.

**Archivos**

- supabase/migrations/20260211103000_026_rpc_create_sale_orderby_fix.sql
- docs/docs-data-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-11) · `node scripts/seed-demo-data.js` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11)
**Commit:** N/A

## 2026-02-10 — Modulo vencimientos (UI)

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se implemento la pantalla `/expirations` con filtros por sucursal y severidad, listado de vencimientos y acciones de alta manual y ajuste para OA.

**Impacto**

- Habilita operar vencimientos con batches automaticos y manuales.
- Expone alertas por severidad usando `v_expirations_due`.
- No cambia schema ni RPCs.

**Archivos**

- app/expirations/page.tsx
- app/expirations/loading.tsx
- docs/docs-roadmap.md

**Tests:** `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-10 — Ajustes UX vencimientos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se forzo la seleccion de sucursal, se removio el scope "todas" y se ajustaron los filtros a rangos por dias (critico 0-3, pronto 4-7).

**Impacto**

- El listado es siempre por sucursal seleccionada.
- La alta manual hereda la sucursal seleccionada.
- No cambia schema ni RPCs.

**Archivos**

- app/expirations/page.tsx

**Tests:** `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-10 — Correccion fecha vencimiento

**Tipo:** db
**Alcance:** db + frontend + docs

**Resumen**
Se agrego RPC para corregir la fecha de vencimiento con audit log y se expuso la accion en /expirations. Se actualizaron contratos y docs vivos.

**Impacto**

- Permite ajustar fechas aproximadas a fechas reales.
- Mantiene trazabilidad via audit log.
- No cambia otras reglas de negocio.

**Archivos**

- supabase/migrations/20260210110000_022_expiration_batch_update_date.sql
- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-10) · `npm run db:schema:snapshot` OK (2026-02-10) · `npm run types:gen` OK (2026-02-10) · `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-10 — Batch code por recepcion

**Tipo:** db
**Alcance:** db + frontend + docs

**Resumen**
Se agrego batch_code en expiration_batches, se genera al recibir pedidos con prefijo de proveedor + fecha + secuencia y se muestra en /expirations.

**Impacto**

- Trazabilidad clara de lotes por recepcion.
- Facilita verificacion fisica por sucursal y proveedor.
- No altera consumo FEFO ni calculo de vencimientos.

**Archivos**

- supabase/migrations/20260210113000_023_expiration_batch_code.sql
- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-10) · `npm run db:schema:snapshot` OK (2026-02-10) · `npm run types:gen` OK (2026-02-10) · `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-10 — Auditoria docs vencimientos

**Tipo:** docs
**Alcance:** docs

**Resumen**
Se auditaron y ajustaron los docs de vencimientos para reflejar el estado real (filtros por días, batch_code, corrección de fecha). Se reforzó en AGENTS la obligación de actualizar docs por cada feature.

**Impacto**

- Documentación fiel al comportamiento actual.
- Refuerza disciplina de actualización de docs.
- No cambia runtime ni DB.

**Archivos**

- AGENTS.md
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/context-summary.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-10 — Auditoria docs pantallas MVP

**Tipo:** docs
**Alcance:** docs

**Resumen**
Se auditaron pantallas implementadas y se ajustaron contratos de pantalla para reflejar el estado real (placeholders, filtros, flujos y UI existente).

**Impacto**

- Documentación alineada con la app actual.
- Reduce drift entre UI y contratos.
- No cambia runtime ni DB.

**Archivos**

- docs/docs-app-screens-login.md
- docs/docs-app-screens-logout.md
- docs/docs-app-screens-no-access.md
- docs/docs-app-screens-admin-dashboard.md
- docs/docs-app-screens-superadmin.md
- docs/docs-app-screens-clients.md
- docs/docs-app-screens-products.md
- docs/docs-app-screens-products-lookup.md
- docs/docs-app-screens-suppliers.md
- docs/docs-app-screens-supplier-detail.md
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-audit-log.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-10 — Modulo clientes (UI)

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se implemento `/clients` con listado, detalle inline, alta/edicion de clientes y pedidos especiales por sucursal.

**Impacto**

- Habilita flujo de clientes y pedidos especiales en MVP.
- OA puede filtrar por sucursal; ST opera solo su sucursal activa.
- No cambia schema ni RPCs.

**Archivos**

- app/clients/page.tsx
- docs/docs-app-screens-clients.md
- docs/docs-roadmap.md
- docs/context-summary.md

**Tests:** `npm run lint` OK (2026-02-10) · `npm run build` OK (2026-02-10)
**Commit:** N/A

## 2026-02-09 — Inputs proveedor en alta de productos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se ajustaron los formularios de alta de productos para renombrar el campo de nombre y capturar nombre/SKU del proveedor al crear productos desde /products y /suppliers/[supplierId].

**Impacto**

- Habilita guardar nombre y SKU del articulo en proveedor en la asociacion primaria.
- Cambia los formularios de alta en productos y detalle de proveedor.
- No cambia el schema ni las RPCs existentes.

**Archivos**

- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx
- docs/docs-app-screens-products.md
- docs/docs-app-screens-supplier-detail.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Labels opcionales proveedor

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego “(opcional)” a los labels de nombre/SKU en proveedor en los dos entry points de alta de producto.

**Impacto**

- Mejora claridad de formulario sin cambios funcionales.
- Cambia solo textos de UI.
- No cambia schema ni RPCs.

**Archivos**

- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Label codigo de barras

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se renombro el label de “Barcode” a “Codigo de barras” en los formularios de alta de productos.

**Impacto**

- Mejora consistencia de idioma en la UI.
- Cambia solo textos de UI.
- No cambia schema ni RPCs.

**Archivos**

- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Listado solo de productos principales

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se elimino el formulario de asociar productos en /suppliers/[supplierId] y se dejo solo el listado de productos principales con edicion de SKU/nombre en proveedor.

**Impacto**

- Simplifica el flujo: las asociaciones se crean al alta de producto.
- Cambia la UI del detalle de proveedor y su contrato de pantalla.
- No cambia schema ni RPCs.

**Archivos**

- app/suppliers/[supplierId]/page.tsx
- docs/docs-app-screens-supplier-detail.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Pedidos inline con sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se rehizo /orders para armar pedidos en la misma pantalla: seleccionar proveedor/sucursal, ver sugeridos, editar cantidades, cargar notas y crear pedido. Se agrego margen de ganancia para estimar costo.

**Impacto**

- El flujo de pedidos ocurre inline y el listado queda debajo.
- Se calcula costo estimado por articulo y total usando margen.
- No cambia schema ni RPCs; se reutiliza view de sugeridos y RPCs de pedidos.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Control de recepcion de pedidos

**Tipo:** db
**Alcance:** db + frontend

**Resumen**
Se agregaron campos de control en pedidos y se ajusto el flujo de recepcion para capturar fecha/hora real y firma (nombre + usuario). Al recibir se marca como controlado y se ingresa stock.

**Impacto**

- Habilita registrar la hora real de recepcion y quien controla el pedido.
- Cambia el RPC de recepcion y el detalle de pedido para capturar firma/fecha.
- No cambia reglas RLS ni otros modulos.

**Archivos**

- supabase/migrations/20260209141000_021_supplier_orders_controlled_fields.sql
- app/orders/[orderId]/page.tsx
- app/orders/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-data-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-09) · `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Seed demo de compras y ventas

**Tipo:** infra
**Alcance:** db

**Resumen**
Se agrego script para poblar datos demo (3 proveedores, 30 productos, ventas 90 dias, 4 pedidos) y se expuso comando de seed.

**Impacto**

- Habilita probar flujo de pedidos, sugeridos y control de recepcion con datos reales.
- Cambia solo datos locales; no afecta schema ni RPCs.
- Agrega script de seed reutilizable.

**Archivos**

- scripts/seed-demo-data.js
- package.json

**Tests:** `node scripts/seed-demo-data.js` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Promedio por ciclo en pedidos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se ajusto la tabla de sugeridos para mostrar promedio por ciclo (semanal/quincenal/mensual) y forzar cantidades enteras al pedir.

**Impacto**

- El promedio ahora se alinea con la frecuencia del proveedor.
- Las cantidades sugeridas y editables son enteras.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Selector promedio sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego selector para ver promedio semanal/quincenal/mensual en la tabla de sugeridos.

**Impacto**

- Permite comparar el promedio por ciclo del proveedor versus periodos fijos.
- Cambia solo la UI de sugeridos.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Redondeo promedio sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se redondeo el promedio por ciclo a entero (regla de .5 hacia arriba).

**Impacto**

- Mejora consistencia con cantidades enteras en pedidos.
- Cambia solo la visualizacion del promedio.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Total de articulos en pedido

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego la cantidad total de articulos junto al total estimado en la seccion de sugeridos.

**Impacto**

- Permite ver rapidamente el total de unidades a pedir.
- Cambia solo UI en /orders.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Navegacion a detalle de pedidos

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se cambio el listado de pedidos para usar Link y permitir navegar al detalle.

**Impacto**

- El click en el pedido abre `/orders/[orderId]`.
- No cambia datos ni lógica de pedidos.
- Solo afecta la UI del listado.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Fix params en order detail

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se ajusto el acceso a params en /orders/[orderId] para usar await en params Promise.

**Impacto**

- El detalle de pedido vuelve a renderizar sin error.
- No cambia datos ni lógica de negocio.
- Solo afecta el handler de ruta.

**Archivos**

- app/orders/[orderId]/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Tooltip margen en pedidos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego tooltip/ayuda en el input de margen para explicar el costo aproximado.

**Impacto**

- Mejora claridad del calculo de costo en sugeridos.
- Cambia solo UI en /orders.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Vista tarjetas en sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego toggle para ver sugeridos en tabla o tarjetas en /orders.

**Impacto**

- Mejora usabilidad en mobile para revisar sugeridos.
- Cambia solo la UI de sugeridos.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx
- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Persistir vista sugeridos

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se persiste en localStorage la vista elegida (tabla/tarjetas) en sugeridos.

**Impacto**

- Mantiene la preferencia del usuario entre sesiones.
- Cambia solo UI en /orders.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Separar pedidos controlados

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se dividio el listado de pedidos en pendientes y controlados, mostrando controlados al final.

**Impacto**

- Facilita priorizar pedidos por controlar/enviar.
- Cambia solo la UI del listado en /orders.
- No cambia schema ni RPCs.

**Archivos**

- app/orders/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Busqueda tokens en POS

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego busqueda por tokens con minimo 3 caracteres en el POS.

**Impacto**

- Mejora relevancia de resultados y evita render masivo.
- La busqueda acepta tokens en cualquier orden.
- No cambia schema ni RPCs.

**Archivos**

- app/pos/PosClient.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Busqueda en vivo POS

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se agrego busqueda en vivo (debounce) al tipear en el POS.

**Impacto**

- El filtrado ocurre automaticamente sin boton.
- Se reduce la friccion en caja.
- No cambia schema ni RPCs.

**Archivos**

- app/pos/PosClient.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Desplegable ajuste stock

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se convirtio el formulario de ajuste manual de stock en un desplegable.

**Impacto**

- Reduce espacio en la pagina de productos.
- Cambia solo UI en /products.
- No cambia schema ni RPCs.

**Archivos**

- app/products/page.tsx

**Tests:** `npm run lint` OK (2026-02-09) · `npm run build` OK (2026-02-09)
**Commit:** N/A

## 2026-02-08 — Diagnostico docs y baseline de schema

**Tipo:** docs
**Alcance:** db

**Resumen**
Se realizo un diagnostico profundo de consistencia entre docs y se creo un baseline propuesto del modelo de schema DB para el MVP.

**Impacto**

- Habilita iniciar migraciones con una base coherente con contratos y modulos.
- Cambia el estado: ahora hay un documento de schema propuesto como fuente inicial.
- No cambia el runtime ni la DB real (todavia no existe schema implementado).

**Archivos**

- docs/docs-schema-model.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Alineacion docs con baseline

**Tipo:** docs
**Alcance:** db

**Resumen**
Se alineo el indice de pantallas y se completaron los documentos vivos de modelo de datos y matriz RLS usando el baseline propuesto.

**Impacto**

- Deja el set de docs coherente y listo para iniciar migraciones cuando se decida.
- Cambia la fuente de verdad operativa: modelo y RLS dejan de ser placeholders.
- No cambia el runtime ni la DB real.

**Archivos**

- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-logout.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Roadmap vivo

**Tipo:** docs
**Alcance:** decision

**Resumen**
Se creo el roadmap vivo del proyecto y se actualizo AGENTS para exigir su mantenimiento en cada avance.

**Impacto**

- Habilita orden operativo y trazabilidad de fases.
- Cambia el proceso: el roadmap debe actualizarse con cada avance.
- No cambia runtime ni DB.

**Archivos**

- docs/docs-roadmap.md
- AGENTS.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Fase 0 completada

**Tipo:** docs
**Alcance:** decision

**Resumen**
Se marco la Fase 0 (Fundaciones) como completa en el roadmap vivo.

**Impacto**

- Deja habilitado avanzar a Fase 1 (schema real + RLS).
- No cambia runtime ni DB.

**Archivos**

- docs/docs-roadmap.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Migracion inicial de schema

**Tipo:** db
**Alcance:** db

**Resumen**
Se creo la migracion inicial con tablas, enums, constraints, triggers y RLS basica. Se ajustaron docs vivos para reflejar el nuevo estado.

**Impacto**

- Habilita iniciar `supabase db reset` cuando se decida.
- Deja pendiente agregar views/RPCs y snapshot/types.
- No cambia runtime hasta aplicar migraciones.

**Archivos**

- supabase/migrations/20260208213000_001_init_schema.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/docs-roadmap.md

**Tests:** No ejecutados (DB no aplicada)
**Commit:** N/A

## 2026-02-08 — Reset DB y snapshot/types

**Tipo:** db
**Alcance:** db

**Resumen**
Se ejecuto `supabase db reset`, se aplico la migracion inicial y se generaron `docs/schema.sql` y `types/supabase.ts`.

**Impacto**

- DB local reproducible con schema inicial.
- Snapshot y types listos para desarrollo.
- Quedan pendientes views/RPCs y verificaciones RLS permit/deny.

**Archivos**

- docs/schema.sql
- types/supabase.ts
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md

**Tests:** supabase db reset OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Fix helpers RLS + verificaciones minimas

**Tipo:** rls
**Alcance:** db

**Resumen**
Se agrego migracion para evitar recursion en helpers RLS y se verifico acceso minimo (permitido/denegado) con usuarios de prueba.

**Impacto**

- RLS estable para evaluaciones locales.
- Snapshot y types regenerados con helpers actualizados.
- Falta verificacion de views principales (aun no existen).

**Archivos**

- supabase/migrations/20260208220000_002_rls_helpers.sql
- docs/schema.sql
- types/supabase.ts
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md

**Tests:** RLS minimo OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Checklist pendientes DB

**Tipo:** docs
**Alcance:** db

**Resumen**
Se agrego checklist explicito de views y RPCs pendientes en el baseline de schema.

**Impacto**

- Mejora trazabilidad de lo aun no implementado.
- No cambia DB ni runtime.

**Archivos**

- docs/docs-schema-model.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Views y RPCs MVP + verificacion DB

**Tipo:** db
**Alcance:** db

**Resumen**
Se agregaron migraciones con views y RPCs del MVP, se reseteo la DB local y se verificaron lecturas basicas por RLS.

**Impacto**

- Contratos de lectura/escritura ahora existen en DB.
- Fase 2 de infra/smoke DB queda completa.
- Snapshot y types actualizados.

**Archivos**

- supabase/migrations/20260208221000_003_views.sql
- supabase/migrations/20260208222000_004_rpcs.sql
- docs/schema.sql
- types/supabase.ts
- docs/docs-schema-model.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md

**Tests:** supabase db reset OK; views basicas OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — QA RPCs MVP (admin)

**Tipo:** tests
**Alcance:** db

**Resumen**
Se ejecutaron llamadas de QA sobre RPCs MVP con usuario admin y datos de prueba. Todas las RPCs clave respondieron sin errores.

**Impacto**

- Valida rutas basicas de escritura y lectura en DB.
- Deja datos de prueba en DB local.

**Archivos**

- docs/schema.sql
- types/supabase.ts

**Tests:** QA RPCs admin OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Auth y routing base

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se implementaron login/logout/no-access, middleware de autenticacion y redirecciones por rol, y paginas placeholder para homes.

**Impacto**

- Habilita flujo basico de autenticacion y guardas por rol.
- Permite avanzar a modulos core con rutas existentes.

**Archivos**

- middleware.ts
- lib/supabase/server.ts
- app/login/page.tsx
- app/logout/page.tsx
- app/no-access/page.tsx
- app/dashboard/page.tsx
- app/superadmin/page.tsx
- app/pos/page.tsx
- app/products/lookup/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/page.tsx
- docs/docs-roadmap.md

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Fix warnings build

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se migro middleware a proxy y se ajusto turbopack.root para eliminar warnings de build.

**Impacto**

- Build limpio sin warnings de middleware ni turbopack root.

**Archivos**

- proxy.ts
- next.config.ts

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Productos/Stock (inicio modulo)

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se inicio el modulo Productos/Stock con pagina `/products`, lectura via `v_products_admin` y formularios base para crear producto y ajustar stock.

**Impacto**

- Ruta `/products` operativa para OA.
- Acciones basicas de producto/stock disponibles.
- Requiere hardening y manejo de errores UI.

**Archivos**

- app/products/page.tsx
- supabase/migrations/20260208230000_005_rpc_upsert_product_nullable.sql
- docs/schema.sql
- types/supabase.ts
- docs/docs-roadmap.md
- docs/docs-data-model.md

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Seed usuarios demo

**Tipo:** tests
**Alcance:** infra

**Resumen**
Se creo script de seed para usuarios demo (superadmin/admin/staff) y se poblaron org, sucursales y permisos de staff.

**Impacto**

- Habilita login rapido para QA UI.
- Datos demo en DB local.

**Archivos**

- scripts/seed-users.js

**Tests:** Script ejecutado OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Doc usuarios demo

**Tipo:** docs
**Alcance:** infra

**Resumen**
Se documentaron credenciales demo locales y se referencio el doc en AGENTS.

**Impacto**

- Facilita QA de UI con usuarios conocidos.
- No cambia runtime ni DB.

**Archivos**

- docs/docs-demo-users.md
- AGENTS.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-08 — Supabase client singleton

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se convirtio el cliente de Supabase en singleton en browser para evitar warning de multiples instancias. Se agrego ignore para scripts en eslint.

**Impacto**

- Evita warning de GoTrueClient en login.
- No cambia comportamiento funcional.

**Archivos**

- lib/supabase/client.ts
- eslint.config.mjs

**Tests:** npm run lint OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Login cookies SSR

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se cambio el cliente browser a @supabase/ssr con manejo de cookies para que el middleware detecte sesiones y el redirect funcione.

**Impacto**

- Login ahora persiste cookies compatibles con SSR.
- El redirect post-login funciona correctamente.

**Archivos**

- lib/supabase/client.ts

**Tests:** npm run lint OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Staff home redirect fix

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se agrego RPC security definer para resolver modulos efectivos de Staff y se actualizo el proxy para usarla.

**Impacto**

- Staff ahora resuelve home correctamente segun modulos habilitados.
- Evita bloqueo por RLS en staff_module_access.

**Archivos**

- supabase/migrations/20260208234000_006_rpc_staff_effective_modules.sql
- proxy.ts
- lib/supabase/client.ts
- types/supabase.ts
- docs/schema.sql
- docs/docs-schema-model.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-08 — Productos/Stock completo

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se completo el modulo Productos/Stock con edicion de producto, activacion/desactivacion y ajustes de stock desde UI.

**Impacto**

- CRUD basico operativo para OA.
- Listado muestra estado y permite cambios rapidos.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx
- lib/supabase/client.ts
- proxy.ts
- docs/docs-roadmap.md

**Tests:** npm run lint OK; npm run build OK (2026-02-08)
**Commit:** N/A

## 2026-02-09 — TopBar con logout

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se agrego TopBar con boton de logout y se aplico en paginas principales.

**Impacto**

- Cambio rapido de usuario durante QA.
- Layout consistente en paginas base.

**Archivos**

- app/components/TopBar.tsx
- app/components/PageShell.tsx
- app/dashboard/page.tsx
- app/superadmin/page.tsx
- app/pos/page.tsx
- app/products/lookup/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/products/page.tsx

**Tests:** npm run lint OK; npm run build OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Logout via route handler

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se movio el logout a un route handler para permitir modificar cookies en Next 16.

**Impacto**

- Logout funcional sin errores de cookies.

**Archivos**

- app/logout/route.ts
- app/logout/page.tsx (eliminado)

**Tests:** npm run lint OK; npm run build OK (2026-02-09)
**Commit:** N/A

## 2026-02-09 — Stock por sucursal en productos

**Tipo:** feature
**Alcance:** db, frontend

**Resumen**
Se actualizo `v_products_admin` para incluir stock por sucursal y se reflejo el desglose en la UI de `/products`.

**Impacto**

- OA ve stock total y detalle por sucursal sin selector.
- Clarifica disponibilidad por local.

**Archivos**

- supabase/migrations/20260209002000_007_view_products_admin_stock_by_branch.sql
- app/products/page.tsx
- docs/docs-app-screens-products.md
- docs/schema.sql
- types/supabase.ts

**Tests:** npm run lint OK; npm run build OK (2026-02-09)
**Commit:** N/A

## 2026-02-04 — Docs vivos de modelo y RLS

**Tipo:** docs
**Alcance:** db

**Resumen**
Se agregaron documentos vivos para el modelo de datos y la matriz RLS, y se actualizó AGENTS para exigir su mantenimiento.

**Impacto**

- Habilita trazabilidad clara de schema y permisos.
- Cambia el flujo: toda modificación de DB/RLS exige actualizar estos docs.
- No cambia el comportamiento del sistema.

## 2026-02-04 — Scripts de snapshot y types

**Tipo:** docs
**Alcance:** db

**Resumen**
Se agregaron scripts en package.json para snapshot de schema y generación de types desde Supabase.

**Impacto**

- Habilita generar `docs/schema.sql` y `types/supabase.ts` de forma reproducible.
- Cambia el flujo: se recomienda actualizar snapshot/types tras cambios de DB.
- No cambia el runtime de la app.

## 2026-02-04 — Brief UX/UI para diseñadora

**Tipo:** docs
**Alcance:** ux

**Resumen**
Se creó un brief detallado para UX/UI con pantallas, roles, reglas y orden recomendado de diseño.

**Impacto**

- Habilita onboarding rápido de la diseñadora.
- Alinea expectativas de pantallas y estados obligatorios.
- No cambia el comportamiento del sistema.

## 2026-02-04 — Guía rápida en docs de pantallas y módulos

**Tipo:** docs
**Alcance:** ux

**Resumen**
Se agregó una sección de guía rápida para diseño en los docs de pantallas y módulos para hacerlos más explícitos y navegables.

**Impacto**

- Mejora la claridad para UX/UI sin cambiar requisitos funcionales.
- Reduce ambigüedad al diseñar estados y acciones.
- No cambia el comportamiento del sistema.

## 2026-02-04 10:15 — Commit estado actual

**Lote:** ops-commit
**Tipo:** infra
**Descripción:** Se consolidó el estado actual del repo (configuración base, UI kit, docs y Supabase) para commit.
**Archivos:** .gitignore, .husky/pre-commit, .prettierrc, AGENTS.md, app/globals.css, components.json, components/ui/_, docs/_, lib/_, package.json, package-lock.json, supabase/_, types/supabase.ts
**Tests:** No ejecutados (no solicitados)
**Commit:** (pendiente)

## 2026-02-09 — Auditoria en MVP (docs)

**Tipo:** docs
**Alcance:** db

**Resumen**
Se incorporo la auditoria de acciones al MVP y se documentaron ruta, contrato de pantalla, modelo de datos y reglas RLS.

**Impacto**

- Habilita el diseño y futura implementacion de un audit log visible para OA/SA.
- Cambia el set de docs vivos (sitemap, contratos, modelo de datos, matriz RLS, roadmap).
- No cambia runtime ni DB (docs-only).

**Archivos**

- docs/docs-scope-mvp.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-09 — Audit log MVP (DB + UI)

**Tipo:** feature
**Alcance:** db, frontend, rls, tests

**Resumen**
Se implemento audit log end-to-end: tabla, RLS, view, RPC de log y instrumentacion de RPCs de escritura; UI en /settings/audit-log con filtros y paginacion.

**Impacto**

- Habilita trazabilidad de acciones importantes para OA/SA.
- Agrega view y RPCs nuevas, y registra eventos en operaciones criticas.
- No cambia flujo de Staff (solo lectura restringida por RLS).

**Archivos**

- supabase/migrations/20260209040000_008_audit_log.sql
- app/settings/audit-log/page.tsx
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npx supabase db reset OK (2026-02-09)
- Seed usuarios demo OK (2026-02-09)
- RLS audit_log: admin permitido / staff denegado OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS MVP (UI + permisos)

**Tipo:** feature
**Alcance:** frontend, db, rls, tests

**Resumen**
Se implemento la pantalla /pos con selector de sucursal, busqueda/escaneo, carrito y cobro. Se endurecio rpc_create_sale para validar modulo pos en Staff.

**Impacto**

- Habilita ventas rápidas para Staff/OA con control de stock.
- Agrega validación de modulo pos a nivel RPC.
- Actualiza snapshot y types desde DB local.

**Archivos**

- app/pos/page.tsx
- app/pos/PosClient.tsx
- supabase/migrations/20260209040000_008_audit_log.sql
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npx supabase db reset OK (2026-02-09)
- Seed usuarios demo OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — TopBar con accesos directos

**Tipo:** feature
**Alcance:** frontend

**Resumen**
Se agregaron accesos directos en el TopBar a rutas principales para navegacion rapida.

**Impacto**

- Facilita la navegacion entre modulos MVP existentes.
- No cambia permisos: middleware sigue aplicando redirecciones.

**Archivos**

- app/components/TopBar.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS stock cero + moneda ARS

**Tipo:** feature
**Alcance:** db, frontend, docs, tests

**Resumen**
Se ajusto el catalogo POS para mostrar productos aunque no haya stock, se habilito stock negativo por defecto para evitar bloqueos, y se cambio la moneda a ARS en la UI de POS.

**Impacto**

- Productos aparecen en POS aunque stock sea 0 (branch con stock desincronizado).
- Ventas pueden registrarse aunque el stock sea insuficiente (stock negativo permitido).
- Totales en POS se muestran en pesos argentinos.

**Archivos**

- supabase/migrations/20260209130000_009_pos_stock_zero_and_currency.sql
- app/pos/PosClient.tsx
- scripts/seed-users.js
- docs/docs-app-screens-staff-pos.md
- docs/docs-modules-products-stock.md
- docs/docs-schema-model.md
- docs/docs-app-screens-settings-preferences.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npx supabase db reset OK (2026-02-09)
- Seed usuarios demo OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS cantidad editable sin borrar item

**Tipo:** fix
**Alcance:** frontend, tests

**Resumen**
Se ajusto el carrito para permitir dejar el input de cantidad en blanco sin eliminar el item y se bloqueo el cobro con cantidades 0.

**Impacto**

- Permite editar cantidades sin borrar el item.
- Evita cobros con cantidades invalidas.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS resaltado cantidad invalida

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se agrego resaltado visual y mensaje para items con cantidad 0 en el carrito.

**Impacto**

- Hace evidente el error antes de cobrar.
- Reduce intentos fallidos por cantidades invalidas.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS deshabilita cobro con qty invalida

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se deshabilito el boton Cobrar cuando el carrito tiene cantidades invalidas o esta vacio.

**Impacto**

- Reduce errores y evita intentos de cobro invalidos.
- Refuerza la validacion previa en UI.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS tooltip Cobrar deshabilitado

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se agrego tooltip y mensaje de ayuda cuando el boton Cobrar esta deshabilitado.

**Impacto**

- Clarifica por que no se puede cobrar.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Label UOM mas claro

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se renombro el label UOM a "Unidad de medida" en formularios de productos.

**Impacto**

- Mejora comprension del campo sin cambiar comportamiento.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Unidad de venta en español

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se tradujeron las opciones visibles de unidad de venta a español manteniendo los valores internos.

**Impacto**

- Mejora la comprensión en UI sin cambiar lógica.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — POS unidad de venta en español

**Tipo:** ux
**Alcance:** frontend, tests

**Resumen**
Se tradujo la unidad de venta mostrada en el listado de productos del POS.

**Impacto**

- UI mas clara en español.

**Archivos**

- app/pos/PosClient.tsx

**Tests:**

- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Idioma base español

**Tipo:** docs
**Alcance:** ux

**Resumen**
Se definio el español como idioma base del producto en el brief de UX/UI.

**Impacto**

- Establece la guia de idioma para futuras pantallas y textos.

**Archivos**

- docs/docs-ux-ui-brief.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-09 — Proveedores y pedidos (MVP)

**Tipo:** feature
**Alcance:** frontend, db, docs, tests

**Resumen**
Se implementaron las pantallas de proveedores y pedidos (lista y detalle), con flujos basicos de CRUD y estados de pedidos. Se agrego products_count a la vista de proveedores.

**Impacto**

- Habilita gestion de proveedores y asociaciones de productos.
- Habilita flujo de pedidos draft → sent → received → reconciled.
- Mejora visibilidad con products_count en listado de proveedores.

**Archivos**

- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/suppliers/SupplierActions.tsx
- app/orders/page.tsx
- app/orders/[orderId]/page.tsx
- supabase/migrations/20260209150000_010_view_suppliers_products_count.sql
- app/components/TopBar.tsx
- docs/docs-roadmap.md
- docs/docs-data-model.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npx supabase db reset OK (2026-02-09)
- Seed usuarios demo OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Context summary

**Tipo:** docs
**Alcance:** decision

**Resumen**
Se creo un resumen de contexto vivo y se actualizo AGENTS para exigir su lectura cuando aplique.

**Impacto**

- Facilita retomar contexto en conversaciones nuevas.
- Cambia el flujo: contexto resumen pasa a ser lectura requerida.
- No cambia runtime ni DB.

**Archivos**

- docs/context-summary.md
- AGENTS.md
- docs/prompts.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-09 — Proveedores primario/secundario y safety stock

**Tipo:** feature
**Alcance:** frontend, db, docs, tests

**Resumen**
Se agrego soporte a proveedores primario/secundario por producto, schedule de proveedores, safety stock por sucursal y sugeridos simples. Se actualizaron pantallas de productos, proveedores y detalle, junto con migraciones y docs.

**Impacto**

- Permite asignar proveedor primario/secundario y ajustar stock minimo por sucursal.
- Permite definir frecuencia y dias de pedido/recepcion por proveedor.
- Expone sugeridos de compra basados en ventas 30 dias + safety stock.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx
- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/suppliers/SupplierActions.tsx
- app/orders/page.tsx
- supabase/migrations/20260209173000_012_safety_stock_rpc.sql
- supabase/migrations/20260209174000_013_rpc_upsert_supplier_schedule.sql
- supabase/migrations/20260209175000_014_view_suppliers_schedule.sql
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/docs-modules-products-stock.md
- docs/docs-modules-suppliers.md
- docs/docs-modules-supplier-orders.md
- docs/docs-app-screens-products.md
- docs/docs-app-screens-suppliers.md
- docs/docs-app-screens-supplier-detail.md
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-order-detail.md
- docs/docs-scope-post-mvp.md
- docs/context-summary.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md

**Tests:**

- npx supabase db reset OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Politica de commit y push

**Tipo:** decision
**Alcance:** infra

**Resumen**
Se actualizo AGENTS para exigir commit + push al cierre de lote cuando el usuario confirme.

**Impacto**

- Estandariza el cierre de lote con trazabilidad.
- No cambia runtime ni DB.

**Archivos**

- AGENTS.md
- docs/prompts.md

**Tests:** No ejecutados (docs-only)
**Commit:** N/A

## 2026-02-09 — Renombre labels proveedor

**Tipo:** ux
**Alcance:** frontend, docs

**Resumen**
Se renombraron labels de SKU/Nombre del proveedor para clarificar que son datos del producto en el proveedor.

**Impacto**

- Mejora claridad en /suppliers/[supplierId].
- No cambia datos ni contratos.

**Archivos**

- app/suppliers/[supplierId]/page.tsx
- docs/docs-app-screens-supplier-detail.md
- docs/prompts.md

**Tests:** No ejecutados (UI microcambio)
**Commit:** N/A

## 2026-02-09 — Shelf life y FEFO

**Tipo:** feature
**Alcance:** db, frontend, docs, tests

**Resumen**
Se agrego vencimiento aproximado por producto (dias) y se automatizo la creacion/consumo de batches al recibir pedidos y vender (FEFO best-effort). Se filtro expirations por cantidad > 0.

**Impacto**

- Permite alertas de vencimiento basadas en días aproximados.
- Evita alertas falsas al consumir batches en ventas.
- Mantiene ventas sin bloqueo si faltan batches.

**Archivos**

- app/products/page.tsx
- app/products/ProductActions.tsx
- app/suppliers/[supplierId]/page.tsx
- supabase/migrations/20260209180000_015_products_shelf_life_days.sql
- supabase/migrations/20260209181000_016_rpc_upsert_product_shelf_life.sql
- supabase/migrations/20260209182000_017_view_products_admin_shelf_life.sql
- supabase/migrations/20260209183000_018_expirations_due_quantity_filter.sql
- supabase/migrations/20260209184000_019_receive_order_create_batches.sql
- supabase/migrations/20260209185000_020_create_sale_consume_batches.sql
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-modules-expirations.md
- docs/docs-modules-products-stock.md
- docs/docs-modules-supplier-orders.md
- docs/docs-app-screens-products.md
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-supplier-detail.md
- docs/context-summary.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md

**Tests:**

- npx supabase db reset OK (2026-02-09)
- npm run lint OK (2026-02-09)
- npm run build OK (2026-02-09)

**Commit:** N/A

## 2026-02-09 — Reset con seed automatico

**Tipo:** infra
**Alcance:** scripts, docs

**Resumen**
Se agrego el script `npm run db:reset` que ejecuta reset + seed de usuarios demo y se hizo que el seed cargue `.env.local` automaticamente.

**Impacto**

- Evita perder usuarios demo tras `db reset`.
- Reduce pasos manuales para QA.

**Archivos**

- scripts/seed-users.js
- package.json
- AGENTS.md
- docs/docs-demo-users.md
- docs/prompts.md

**Tests:** No ejecutados (scripts/docs)
**Commit:** N/A

## 2026-02-09 — Stock minimo global en alta

**Tipo:** ux
**Alcance:** frontend, docs

**Resumen**
Se agrego opcion para aplicar stock minimo a todas las sucursales en el alta de productos y se aclaro el campo con tooltip. Se incluyo el campo en alta desde proveedor.

**Impacto**

- Evita confusion al setear stock minimo en una sola sucursal.
- Mejora claridad del concepto de stock minimo.

**Archivos**

- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx
- docs/docs-app-screens-products.md
- docs/docs-app-screens-supplier-detail.md
- docs/prompts.md

**Tests:** No ejecutados (UI microcambio)
**Commit:** N/A

## 2026-02-09 — Simplificar stock minimo

**Tipo:** ux
**Alcance:** frontend, docs

**Resumen**
Se removio el selector de sucursal y el checkbox; el stock minimo ahora se aplica a todas las sucursales por defecto, con tooltip aclaratorio.

**Impacto**

- Simplifica alta de producto.
- Unifica stock minimo para todas las sucursales.

**Archivos**

- app/products/page.tsx
- docs/docs-app-screens-products.md
- docs/prompts.md

**Tests:** No ejecutados (UI microcambio)
**Commit:** N/A

## 2026-02-09 — Remover stock minimo por sucursal

**Tipo:** ux
**Alcance:** frontend, docs

**Resumen**
Se elimino la seccion de stock minimo por sucursal en /products para simplificar el flujo global.

**Impacto**

- Evita duplicidad/confusion en el seteo de stock minimo.
- Stock minimo se define solo en alta/edicion de producto.

**Archivos**

- app/products/page.tsx
- docs/docs-app-screens-products.md
- docs/prompts.md

**Tests:** No ejecutados (UI microcambio)
**Commit:** N/A
