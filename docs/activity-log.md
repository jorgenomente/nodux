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

## 2026-03-01 10:40 -03 — Docs: catálogo global por org y anti-duplicado de productos

**Tipo:** decision
**Lote:** docs-catalog-org-antidup-products
**Alcance:** docs

**Resumen**
Se actualizó la documentación viva para dejar explícito que el catálogo de productos es único por organización y que la política operativa anti-duplicado obliga a no repetir productos por `barcode`, `internal_code` ni `name` normalizado (trim + minúsculas). También se dejó trazada la brecha actual: la unicidad por nombre requiere hardening DB/RPC en lote técnico posterior.

**Archivos**

- docs/docs-modules-products-stock.md
- docs/docs-app-screens-products.md
- docs/docs-data-model.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- No aplica (`docs-only`).

**Commit:** N/A

## 2026-03-01 17:18 -03 — Hotfix producción: `/settings/tickets` sin sucursales por migración faltante

**Tipo:** infra/schema
**Lote:** tickets-print-layout-controls
**Descripción:** Se corrigió incidente en producción donde `/settings/tickets` no mostraba sucursales tras deploy UI. Causa raíz: faltaba aplicar en remoto la migración `20260301170200_067_branch_ticket_print_layout.sql` (columnas nuevas leídas por la pantalla). Se aplicó `supabase db push --linked --include-all --yes` y quedó sincronizado.

**Archivos afectados:**

- docs/activity-log.md

**Tests:**

- Producción: `npx supabase db push --linked --include-all --yes` OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 16:52 -03 — Tickets: configuración de layout de impresión por sucursal

**Tipo:** schema/ui/docs/tests
**Lote:** tickets-print-layout-controls
**Descripción:** Se agregó configuración de layout de ticket por sucursal para resolver cortes laterales en impresión térmica: ancho de papel, márgenes (superior/derecho/inferior/izquierdo), tamaño de fuente e interlineado. `/settings/tickets` ahora permite editar estos parámetros y POS + `/sales/[saleId]/ticket` aplican esos valores al CSS de impresión (`@page` + ancho real de contenido) para ajustar impresoras 80mm con offsets distintos.

**Archivos afectados:**

- supabase/migrations/20260301170200_067_branch_ticket_print_layout.sql
- app/settings/tickets/page.tsx
- app/settings/tickets/TicketTemplateEditors.tsx
- app/pos/page.tsx
- app/pos/PosClient.tsx
- app/sales/[saleId]/ticket/page.tsx
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/docs-app-screens-settings-tickets.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-sale-ticket.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)
- npm run db:reset OK (2026-03-01)
- Verificación objetos DB OK (`branches` y `v_branches_admin` exponen campos de layout de impresión)
- npm run db:rls:smoke FAIL inicial (faltaba data demo tras reset)
- npm run db:seed:demo OK (2026-03-01)
- npm run db:rls:smoke OK (allow/deny verificado)
- Producción: `npx vercel --prod` OK (alias `https://nodux.app`)

**Commit:** N/A

## 2026-02-27 14:50 -03 — POS/Sales: ventas facturadas vs no facturadas + ticket no fiscal

**Tipo:** feature
**Lote:** pos-sales-invoicing-split-ticket
**Alcance:** db, frontend, docs, tests

**Resumen**
Se implementó estructura MVP para distinguir ventas facturadas y no facturadas: el POS ahora separa `Cobrar` y `Cobrar y facturar`, agrega `Imprimir ticket` no fiscal (antes o después del cobro), y el historial `/sales` + detalle permiten reimprimir ticket y emitir factura diferida. En DB se agregó estado fiscal de venta (`is_invoiced`, `invoiced_at`), RPC `rpc_mark_sale_invoiced` y extensión de dashboard para KPIs diarios facturado/no facturado.

**Archivos**

- supabase/migrations/20260227163000_060_sales_invoicing_ticket_split.sql
- app/pos/PosClient.tsx
- app/dashboard/page.tsx
- app/sales/page.tsx
- app/sales/[saleId]/page.tsx
- app/sales/[saleId]/ticket/page.tsx
- app/sales/PrintTicketButton.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-sales.md
- docs/docs-app-screens-sale-detail.md
- docs/docs-app-screens-admin-dashboard.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run build` OK (2026-02-27)
- `npm run lint` FAIL (baseline preexistente en `apps/video/build/*`)
- `npm run db:reset` OK (2026-02-27)
- `npm run db:seed:demo` OK (2026-02-27)
- `npm run db:rls:smoke` OK (2026-02-27, requiere datos demo para `products.length > 0`)

**Commit:** N/A

## 2026-02-27 17:05 -03 — Fix DB: `rpc_mark_sale_invoiced` elimina ambigüedad de `invoiced_at`

**Tipo:** fix
**Lote:** pos-sales-invoicing-split-ticket
**Alcance:** db, tests, docs

**Resumen**
Se corrigió el error al emitir factura desde `/sales` y `/sales/[saleId]` (`column reference "invoiced_at" is ambiguous`) ajustando `rpc_mark_sale_invoiced` para calificar explícitamente la columna (`s.invoiced_at`) dentro del `UPDATE`.

**Archivos**

- supabase/migrations/20260227170500_061_fix_rpc_mark_sale_invoiced_ambiguous.sql
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-27)
- `npm run db:seed:demo` OK (2026-02-27)
- `npm run db:rls:smoke` OK (2026-02-27)

**Commit:** N/A

## 2026-02-27 14:28 -03 — UI: TopBar oculta `Superadmin` para usuarios no SA

**Tipo:** ui
**Lote:** topbar-superadmin-visibility-guard
**Alcance:** frontend, docs, tests

**Resumen**
Se actualizó `TopBar` para que el link `/superadmin` se renderice únicamente cuando el usuario autenticado es superadmin real (platform admin o rol legacy `superadmin`). Para el resto de usuarios (OA/ST) el botón ya no aparece en navegación.

**Archivos**

- app/components/TopBar.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` FAIL (2026-02-27, baseline preexistente en `apps/video/build/*`)
- `npm run build` OK (2026-02-27)

**Commit:** N/A

## 2026-02-27 13:05 -03 — Demo prod: cuenta OA read-only + seed realista multi-módulo

**Tipo:** feature
**Lote:** public-demo-mode-from-landing-safe
**Alcance:** infra, db, docs, tests

**Resumen**
Se ajustó el acceso demo de producción para que ingrese con `admin@demo.com` (rol `org_admin`) en lugar de `staff`, permitiendo navegar más módulos del MVP. Además se ejecutó seed completo de usuarios y datos demo operativos en producción (`scripts/seed-users.js` + `scripts/seed-demo-data.js`) para poblar proveedores, productos, ventas, pedidos, vencimientos, clientes y casos smoke. Se redeployó `nodux.app` para tomar la variable `DEMO_LOGIN_EMAIL` actualizada.

**Archivos**

- docs/prompts.md
- docs/activity-log.md

**Tests:**

- Verificación login demo prod OK (`admin@demo.com`, rol `org_admin`)
- `node scripts/seed-users.js` OK (prod, 2026-02-27)
- `node scripts/seed-demo-data.js` OK (prod, 2026-02-27)
- `npx vercel --prod` OK (2026-02-27)

**Commit:** N/A

## 2026-02-27 12:41 -03 — Fix infra: loop de redirección en `/demo/enter`

**Tipo:** fix
**Lote:** public-demo-mode-from-landing-safe
**Alcance:** infra, frontend, docs, tests

**Resumen**
Se corrigió un bucle de redirecciones entre `nodux.app` y `app.nodux.app` al ejecutar `POST /demo/enter`. El `proxy` ahora permite `/demo/enter` como ruta de marketing y excluye ese endpoint de la redirección `app -> marketing` para rutas `/demo`. Además, la respuesta de login demo redirige explícitamente a `https://app.nodux.app/` para entrar a la app operativa tras autenticación.

**Archivos**

- proxy.ts
- app/demo/enter/route.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run build` OK (2026-02-27)
- `npm run lint` no ejecutado en este fix (baseline conocido en `apps/video/build/*`)

**Commit:** N/A

## 2026-02-27 12:18 -03 — Feature/Infra: demo interactiva con login automático y guard solo lectura

**Tipo:** feature
**Lote:** public-demo-mode-from-landing-safe
**Alcance:** frontend, infra, docs, tests

**Resumen**
Se corrigió el modo demo para que sea operativo: `/demo` ahora expone botón `Probar demo interactiva` que ejecuta `POST /demo/enter` y autentica automáticamente una cuenta demo definida por entorno. Además, `proxy.ts` bloquea métodos mutantes para usuarios demo configurados en `DEMO_READONLY_EMAILS`, evitando cambios en datos mientras se navega la app real.

**Archivos**

- app/demo/page.tsx
- app/demo/enter/route.ts
- app/login/page.tsx
- proxy.ts
- docs/docs-app-screens-demo.md
- docs/docs-app-screens-landing.md
- docs/docs-app-screens-login.md
- docs/docs-demo-users.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run build` OK (2026-02-27)
- `npm run lint` FAIL (2026-02-27, baseline ajeno en `apps/video/build/*`)

**Commit:** N/A

## 2026-02-27 10:09 -03 — UI/Infra: modo demo público seguro accesible desde `/landing`

**Tipo:** ui
**Lote:** public-demo-mode-from-landing-safe
**Alcance:** frontend, infra, docs, tests

**Resumen**
Se agregó una ruta pública `/demo` como recorrido de producto en modo solo lectura con datos ficticios, enlazada desde `/landing`, para que prospectos naveguen sin credenciales compartidas ni exposición operativa. El `proxy` ahora permite `/demo` en host de marketing y fuerza redirección de `app.nodux.app/demo` hacia `nodux.app/demo`.

**Archivos**

- app/demo/page.tsx
- app/landing/page.tsx
- proxy.ts
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-landing.md
- docs/docs-app-screens-demo.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` FAIL (2026-02-27, baseline ajeno en `apps/video/build/*` con reglas ESLint faltantes y warnings masivos)
- `npm run build` OK (2026-02-27)

**Commit:** N/A

## 2026-02-26 14:00 -03 — Infra/UI: split de dominio `nodux.app` vs `app.nodux.app`

**Tipo:** infra
**Lote:** domain-host-split-marketing-app
**Alcance:** frontend, infra, docs, tests

**Resumen**
Se implementó redirección por host en `proxy.ts` para separar marketing y operación: `nodux.app` sirve landing pública y cualquier ruta operativa/auth se redirige a `app.nodux.app`. Además, la landing actualizó CTAs para apuntar directo a `https://app.nodux.app/login`.

**Archivos**

- proxy.ts
- app/landing/page.tsx
- docs/prompts.md
- docs/activity-log.md
- docs/context-summary.md
- docs/docs-roadmap.md

**Tests:**

- `npm run lint` OK (2026-02-26)
- `npm run build` OK (2026-02-26)

**Commit:** N/A

## 2026-02-26 14:04 -03 — Infra: canonical de marketing `www.nodux.app` -> `nodux.app`

**Tipo:** infra
**Lote:** domain-canonical-www-to-root
**Alcance:** infra, docs, tests

**Resumen**
Se agregó redirección canónica en `proxy.ts` para que todo tráfico entrante en `www.nodux.app` redirija a `nodux.app`, manteniendo la separación con `app.nodux.app` para la aplicación autenticada.

**Archivos**

- proxy.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-26)
- `npm run build` OK (2026-02-26)

**Commit:** N/A

## 2026-02-26 10:31 -03 — UI: landing pública `/landing` para posicionamiento de NODUX

**Tipo:** ui
**Lote:** public-landing-page-mvp
**Alcance:** frontend, docs, tests

**Resumen**
Se implementó una landing pública estática en `/landing` para explicar qué es NODUX (propuesta de valor, módulos core y CTAs a login/demo), manteniendo separado el flujo autenticado del MVP. Además, se habilitó la ruta como pública en `proxy.ts` y se documentó contrato/sitemap asociado.

**Archivos**

- app/landing/page.tsx
- proxy.ts
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-landing.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-26)
- `npm run build` OK (2026-02-26)

**Commit:** N/A

## 2026-02-25 10:24 -03 — Fix: `/suppliers/[supplierId]` evita closure de función en server action

**Tipo:** fix
**Lote:** suppliers-detail-server-action-serialization-fix
**Alcance:** frontend, tests, docs

**Resumen**
Se corrigió el error runtime de Next.js 16 al abrir detalle de proveedor desde `/suppliers`: la acción server `updateSupplier` capturaba una función local (`deriveAccepts`) definida dentro del componente server, lo que disparaba `Functions cannot be passed directly to Client Components`. Se removió esa captura y el cálculo de `accepts_cash/accepts_transfer` quedó inline dentro de la action.

**Archivos**

- app/suppliers/[supplierId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-25)
- `npm run build` OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 10:30 -03 — UI: `/suppliers/[supplierId]` reutiliza formulario de `/products`

**Tipo:** ui
**Lote:** suppliers-detail-reuse-products-new-form
**Alcance:** frontend, docs, tests

**Resumen**
Se reemplazó el formulario hardcodeado de “Crear producto nuevo” en `/suppliers/[supplierId]` por el componente reutilizable `NewProductForm` usado en `/products`, para mantener un único contrato de inputs. El proveedor primario ahora llega preseleccionado y bloqueado al proveedor actual, y la acción server de alta en detalle se alineó con los mismos campos que `/products` (marca, precio proveedor, proveedor secundario, stock mínimo, SKU/nombre de proveedor).

**Archivos**

- app/suppliers/[supplierId]/page.tsx
- app/products/NewProductForm.tsx
- app/products/ProductFormFieldsShared.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-25)
- `npm run build` OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 11:01 -03 — UI: exportes maestros de onboarding alineados al contrato de formularios

**Tipo:** ui
**Lote:** onboarding-export-master-form-contract-sync
**Alcance:** frontend, docs, tests

**Resumen**
Se actualizó `/onboarding/export` para que `productos_master.csv` y `proveedores_master.csv` reflejen los campos operativos de alta/edición en `/products` y `/suppliers`. En productos se agregaron columnas de marca, proveedor primario/secundario, SKU/nombre proveedor y stock mínimo consolidado; en proveedores se agregó `% ganancia sugerida` (`default_markup_pct`) manteniendo perfil de pago completo.

**Archivos**

- app/onboarding/export/route.ts
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-25)
- `npm run build` OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 11:15 -03 — DB/UI: persistencia de `supplier_price` por relación producto-proveedor

**Tipo:** db
**Lote:** supplier-price-persistence-e2e
**Alcance:** db, frontend, docs, tests

**Resumen**
Se agregó persistencia de `supplier_price` en `supplier_products` para registrar cambios de costo proveedor y reutilizar el dato en formularios de edición. La migración agrega columna + check no negativo, extiende `rpc_upsert_supplier_product` (manteniendo compatibilidad por defaults) y actualiza `v_supplier_detail_admin`. En frontend, `/products`, `/suppliers/[supplierId]` y el resolvedor rápido de `/onboarding` ahora leen/escriben `supplier_price`; además los exportes maestros incluyen el valor persistido.

**Archivos**

- supabase/migrations/20260225111500_058_supplier_product_price.sql
- app/products/ProductFormFieldsShared.tsx
- app/products/ProductActions.tsx
- app/products/ProductListClient.tsx
- app/products/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/onboarding/page.tsx
- app/onboarding/export/route.ts
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/docs-modules-suppliers.md
- docs/docs-app-screens-products.md
- docs/docs-app-screens-supplier-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-25)
- `npm run lint` OK (2026-02-25)
- `npm run build` OK (2026-02-25)
- `npm run db:rls:smoke` FAIL (baseline preexistente): `staff puede leer products de su org`

**Commit:** N/A

## 2026-02-24 17:10 -03 — DB/UI: resolver de productos incompletos con paginación y búsqueda server-side

**Tipo:** db
**Lote:** onboarding-incomplete-products-paginated-resolver
**Alcance:** db, frontend, docs, tests

**Resumen**
Se eliminó la carga masiva de productos para la tarea `Productos con informacion incompleta` en `/onboarding`. Se agregó el contrato `v_products_incomplete_admin` (1 fila por producto incompleto con flags) y la UI ahora usa conteo exacto en DB + listado paginado (25 por página) + buscador por nombre en servidor.

**Archivos**

- supabase/migrations/20260224201000_057_onboarding_products_incomplete_view.sql
- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-24)
- `npm run lint` OK (2026-02-24)
- `npm run build` OK (2026-02-24)

**Commit:** N/A

## 2026-02-24 18:05 -03 — UI: `/products` con paginación configurable, buscador server-side y contador

**Tipo:** ui
**Lote:** products-pagination-search-count
**Alcance:** frontend, docs, tests

**Resumen**
La pantalla `/products` dejó de cargar/renderizar todo el catálogo en cliente. Ahora usa búsqueda por nombre y paginación server-side con parámetros URL (`q`, `page`, `page_size`), muestra total de productos, rango visible y navegación por página. El tamaño por página se puede configurar en `20/50/100`.
Además, el buscador se ejecuta con debounce y la paginación incorpora números de página visibles.

**Archivos**

- app/products/page.tsx
- app/products/ProductListClient.tsx
- app/products/ProductListFilters.tsx
- docs/docs-app-screens-products.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-24)
- `npm run build` OK (2026-02-24)

**Commit:** N/A

## 2026-02-22 10:39 -03 — UI: onboarding agrega input precio proveedor en productos incompletos

**Tipo:** ui
**Lote:** onboarding-incomplete-products-add-supplier-price-input
**Alcance:** frontend, tests, docs

**Resumen**
Se agregó el input `Precio proveedor` en el formulario rápido de productos incompletos dentro de `/onboarding`, antes de `Precio unitario`, con validación básica de número no negativo en la acción server.

**Archivos**

- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-22)
- `npm run build` OK (2026-02-22)

**Commit:** N/A

## 2026-02-22 10:36 -03 — UI: onboarding con resolvedor rápido de productos incompletos

**Tipo:** ui
**Lote:** onboarding-products-incomplete-fast-resolver
**Alcance:** frontend, docs, tests

**Resumen**
Se reemplazó la tarea puntual de proveedor primario por un resolvedor unificado de `productos con informacion incompleta` en `/onboarding`. El panel rápido ahora permite completar por fila los campos operativos del producto equivalentes al flujo de edición de `/products` (datos base, precios, shelf life, proveedores, SKU/nombre proveedor y stock mínimo global).

**Archivos**

- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-22)
- `npm run build` OK (2026-02-22)

**Commit:** N/A

## 2026-02-22 10:26 -03 — Tests: recarga de datos de prueba local

**Tipo:** tests
**Lote:** seed-reload-local-demo-data
**Alcance:** db, tests

**Resumen**
Se ejecutó recarga de datos de prueba local para continuar iteración funcional sobre módulos operativos y onboarding.

**Archivos**

- docs/activity-log.md

**Tests:**

- `npm run db:seed:all` OK (2026-02-22)
  - Demo data seeded (suppliers/products/clients/sales/orders)
  - Cashbox today seed listo con sesión y pedido de control

**Commit:** N/A

## 2026-02-22 10:05 -03 — DB/UI: % ganancia sugerida por proveedor + sugerencia de precio en productos

**Tipo:** ui
**Lote:** supplier-markup-and-product-price-suggestion
**Alcance:** db, frontend, docs, tests

**Resumen**
Se agregó `% ganancia sugerida` en proveedores (`default_markup_pct`, default 40) y se integró en `/products` como base de sugerencia para `precio unitario` a partir de `precio proveedor`. El input de precio proveedor no fuerza el precio unitario final: solo muestra recomendación dinámica por proveedor seleccionado.

**Archivos**

- supabase/migrations/20260222013000_054_supplier_default_markup_pct.sql
- app/products/NewProductForm.tsx
- app/products/page.tsx
- app/suppliers/page.tsx
- app/suppliers/SupplierActions.tsx
- app/suppliers/[supplierId]/page.tsx
- docs/docs-data-model.md
- docs/docs-app-screens-products.md
- docs/docs-app-screens-suppliers.md
- docs/docs-modules-suppliers.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-22)
- Verificación DB:
  - columna `suppliers.default_markup_pct` OK
  - select `v_suppliers_admin` con `default_markup_pct` OK
- `npm run db:rls:smoke` FAIL (baseline preexistente): `staff puede leer products de su org`
- `npm run lint` OK (2026-02-22)
- `npm run build` OK (2026-02-22)

**Commit:** N/A

## 2026-02-21 21:19 -03 — Fix: /onboarding compatible con searchParams async (Next 16)

**Tipo:** fix
**Lote:** onboarding-searchparams-promise-fix
**Alcance:** frontend, tests, docs

**Resumen**
Se corrigio el error server en `/onboarding` donde `searchParams` se estaba usando como objeto sync. En Next.js 16 llega como Promise en este contexto, por lo que ahora se resuelve con `await` y se consume como `resolvedSearchParams`.

**Archivos**

- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-21)

**Commit:** N/A

## 2026-02-21 21:16 -03 — UI: resolvedor rapido inline en /onboarding para proveedor primario

**Tipo:** ui
**Lote:** onboarding-inline-primary-supplier-resolver
**Alcance:** frontend, docs, tests

**Resumen**
Se reemplazo la salida directa a `/products` para la tarea "Productos sin proveedor primario" por un resolvedor rapido inline en `/onboarding`. El flujo permite seleccionar proveedor, completar SKU/nombre opcional del proveedor y confirmar por fila con `OK`, sin abandonar la pantalla.

**Archivos**

- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-21)
- `npm run build` OK (2026-02-21)

**Commit:** N/A

## 2026-02-22 00:35 -03 — UI: /onboarding operativo (import CSV + pendientes + exportes)

**Tipo:** ui
**Lote:** onboarding-ui-mvp-import-export
**Alcance:** frontend, docs, tests

**Resumen**
Se implementó la pantalla `/onboarding` para OA/SA con flujo operativo de importación CSV conectado a DB: creación de job, carga de filas, validación y aplicación opcional de filas válidas. La pantalla muestra pendientes de completitud desde `v_data_onboarding_tasks`, historial de jobs recientes y exportes maestros CSV (`products`, `suppliers`, `product_supplier`).

**Archivos**

- app/onboarding/page.tsx
- app/onboarding/export/route.ts
- app/components/TopBar.tsx
- docs/prompts.md
- docs/activity-log.md
- docs/context-summary.md
- docs/docs-roadmap.md

**Tests:**

- `npm run lint` OK (2026-02-22)
- `npm run build` OK (2026-02-22)

**Commit:** N/A

## 2026-02-22 00:20 -03 — DB: base onboarding de datos maestros (import jobs + tasks + RPCs)

**Tipo:** db
**Lote:** onboarding-db-foundation-053
**Alcance:** db, rls, docs, tests

**Resumen**
Se implementó la base DB de `/onboarding` con flujo completo de importación: jobs, filas, validación y aplicación idempotente sobre productos/proveedores/relaciones. También se agregó la vista de pendientes operativos (`v_data_onboarding_tasks`) para medir completitud de datos maestros y se definieron policies RLS para limitar el módulo a OA/SA.

**Archivos**

- supabase/migrations/20260222001000_053_data_onboarding_jobs_tasks.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/docs-modules-data-onboarding.md
- docs/docs-app-screens-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-22)
- Verificación objetos/flujo onboarding (admin):
  - `rpc_create_data_import_job` OK
  - `rpc_upsert_data_import_row` OK
  - `rpc_validate_data_import_job` OK (`total_rows=1`, `valid_rows=1`, `invalid_rows=0`)
  - `rpc_apply_data_import_job` OK (`applied_rows=1`, `skipped_rows=0`)
- Verificación view principal:
  - select de `v_data_onboarding_tasks` OK (retorna tasks para org demo)
- Verificación RLS mínima:
  - ALLOW: `org_admin` insert en `data_import_jobs` vía RPC/tabla
  - DENY: `staff` insert en `data_import_jobs` (`new row violates row-level security policy`)
- `npm run lint` OK (2026-02-22)
- `npm run build` OK (2026-02-22)

**Commit:** N/A

## 2026-02-21 20:10 -03 — Docs: definicion de modulo Onboarding de datos maestros

**Tipo:** docs
**Lote:** data-onboarding-master-data-docs-foundation
**Alcance:** docs

**Resumen**
Se documento un nuevo modulo MVP para onboarding de datos maestros con ruta `/onboarding`, contrato de pantalla, reglas de completitud y lineamientos de importacion CSV + exportes maestros. Tambien se actualizo sitemap, indice de pantallas, scope MVP y roadmap para mantener trazabilidad operativa.

**Archivos**

- docs/docs-modules-data-onboarding.md
- docs/docs-app-screens-onboarding.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-scope-mvp.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- No aplica (lote docs-only).

**Commit:** N/A

## 2026-02-21 19:30 -03 — Caja: apertura con AM/PM, responsable obligatorio y reloj del sistema

**Tipo:** db
**Lote:** cashbox-open-session-shift-am-pm-responsible-datetime
**Alcance:** db, frontend, docs, tests

**Resumen**
Se actualizó la apertura de caja para operar por turno `AM/PM` cuando `period_type='shift'`, eliminar etiqueta libre y exigir responsable de apertura. Se agregó columna `opened_controlled_by_name` en `cash_sessions`, ajuste de RPC de apertura/resumen y visualización de fecha/hora del sistema junto al botón `Abrir caja`.

**Archivos**

- supabase/migrations/20260221194000_051_cashbox_open_shift_and_responsible.sql
- app/cashbox/OpenCashSessionMetaFields.tsx
- app/cashbox/SystemDateTimeBadge.tsx
- app/cashbox/page.tsx
- lib/cashbox/report.ts
- scripts/seed-cashbox-today.js
- docs/docs-data-model.md
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-21)
- `npm run db:seed:all` OK (2026-02-21)
- `npm run format:check` OK (2026-02-21)
- `npm run lint` OK (2026-02-21)
- `npm run build` OK (2026-02-21)

**Commit:** N/A

## 2026-02-21 19:22 -03 — Caja: reportes ligados a cierres + descarga histórica por fila

**Tipo:** ui
**Lote:** cashbox-reports-closed-sessions-only-and-history-actions
**Alcance:** frontend, docs, tests

**Resumen**
Se aclaró y ajustó la UX de reportes en `/cashbox`: ahora la exportación principal apunta al último cierre y, si no hay cierres, se muestra estado informativo en lugar de CTA activo. Además, en `Últimos cierres` cada fila incluye acciones `CSV`/`PDF` para descargar reportes de cajas anteriores.

**Archivos**

- app/cashbox/page.tsx
- lib/cashbox/report.ts
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run format:check` OK (2026-02-21)
- `npm run lint` OK (2026-02-21)
- `npm run build` OK (2026-02-21)

**Commit:** N/A

## 2026-02-21 19:13 -03 — DB fix: cierre de caja sin ambigüedad de `session_id`

**Tipo:** db
**Lote:** cashbox-close-rpc-ambiguous-session-id-fix
**Alcance:** db, docs, tests

**Resumen**
Se corrigió `rpc_close_cash_session` para eliminar ambigüedad entre la columna `session_id` y la variable de salida homónima de la función. El `delete` de líneas de conteo ahora referencia explícitamente alias de tabla (`ccl.session_id`), evitando el error `column reference "session_id" is ambiguous`.

**Archivos**

- supabase/migrations/20260221191000_050_fix_close_cash_session_ambiguous_session_id.sql
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-21)
- `npm run db:seed:all` OK (2026-02-21)
- Verificación RPC cierre (admin autenticado) OK:
  - `rpc_close_cash_session` devuelve `session_id`, `expected_cash_amount`, `counted_cash_amount`, `difference_amount`, `closed_at` sin error.

**Commit:** N/A

## 2026-02-21 19:08 -03 — Caja: CTA final de cierre separado del conteo

**Tipo:** ui
**Lote:** cashbox-close-cta-separated-from-count
**Alcance:** frontend, docs, tests

**Resumen**
Se separó el bloque de cierre en dos etapas visibles: `Conteo de efectivo` (conteo y total) y `Confirmar cierre de caja` (firma + observación + checkbox + botón). La confirmación final quedó ubicada después de conciliación para respetar el flujo operativo de validación.

**Archivos**

- app/cashbox/page.tsx
- app/cashbox/CashCountPairFields.tsx
- docs/docs-app-screens-cashbox.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run format:check` OK (2026-02-21)
- `npm run lint` OK (2026-02-21)
- `npm run build` OK (2026-02-21)

**Commit:** N/A

## 2026-02-21 19:01 -03 — Caja: reporte exportable CSV + vista PDF imprimible

**Tipo:** ui
**Lote:** cashbox-export-report-csv-pdf
**Alcance:** frontend, docs, tests

**Resumen**
Se implementó un reporte de caja compartible desde `/cashbox` con dos salidas: descarga CSV y vista imprimible para guardar como PDF. El reporte incluye resumen de sesión, desglose de efectivo, conciliación por medio/dispositivo y movimientos.

**Archivos**

- app/cashbox/page.tsx
- app/cashbox/report/page.tsx
- app/cashbox/report/PrintReportButton.tsx
- app/cashbox/report/export/route.ts
- lib/cashbox/report.ts
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-21)
- `npm run build` OK (2026-02-21)

**Commit:** N/A

## 2026-02-21 18:48 -03 — Caja: reorden de cierre al final de la pantalla

**Tipo:** ui
**Lote:** cashbox-close-section-reorder
**Alcance:** frontend, docs, tests

**Resumen**
Se movió la sección `Cerrar caja` dentro de `/cashbox` para que aparezca después de `Movimientos de la sesión`, respetando el flujo operativo solicitado: primero registrar y revisar movimientos, luego cerrar.

**Archivos**

- app/cashbox/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-21)
- `npm run build` OK (2026-02-21)

**Commit:** N/A

## 2026-02-21 18:45 -03 — Caja: desglose auditable del efectivo en sistema

**Tipo:** ui
**Lote:** cashbox-cash-system-amount-breakdown-detail
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó en `/cashbox` una sección dedicada para explicar el `Efectivo en sistema` que aparece en conciliación. El bloque muestra fórmula operativa y detalle por movimientos reales de la sesión: aperturas, ventas en efectivo, ingresos manuales, pagos a proveedor en efectivo (con nota/pedido) y otros egresos manuales.

**Archivos**

- app/cashbox/page.tsx
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-21)
- `npm run build` OK (2026-02-21)

**Commit:** N/A

## 2026-02-20 15:25 -03 — UX montos: fix parser AR para montos largos

**Tipo:** fix
**Lote:** amount-inputs-ar-parser-fix
**Alcance:** frontend, docs, tests

**Resumen**
Se corrigió el parser de `AmountInputAR` para evitar que el separador de miles (`.`) se interprete como decimal al seguir escribiendo, que era la causa por la que el input parecía bloquearse al superar 3 dígitos. Ahora permite cargar montos largos (`100000` -> `100.000`) de forma continua y mantiene normalización server-side.

**Archivos**

- app/components/AmountInputAR.tsx
- app/cashbox/CashboxReconciliationSection.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-20)
- `npm run build` OK (2026-02-20)

**Commit:** N/A

## 2026-02-21 18:37 -03 — UX montos: fix backspace en miles AR

**Tipo:** fix
**Lote:** amount-inputs-ar-delete-backspace-fix
**Alcance:** frontend, docs, tests

**Resumen**
Se ajustó el parser de `AmountInputAR` para que, durante edición, no convierta automáticamente a decimal cuando el usuario borra desde un valor con separador de miles (ej. `1.000` -> backspace). Antes, al quedar temporalmente `1.00`, se renderizaba como `1,00`; ahora se mantiene el flujo de miles y se puede seguir editando sin limpiar todo el campo.

**Archivos**

- app/components/AmountInputAR.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-21)
- `npm run build` OK (2026-02-21)

**Commit:** N/A

## 2026-02-20 12:35 -03 — Caja: conciliación con comprobante por fila + MercadoPago total

**Tipo:** db
**Lote:** cashbox-reconciliation-inputs-mercadopago-total
**Alcance:** db, frontend, docs, tests

**Resumen**
Se implementó conciliación operativa en `/cashbox` con input manual por fila para registrar el monto del comprobante y diferencia automática contra monto sistema. La conciliación no-efectivo ahora agrupa MercadoPago en una única fila total (sin separar por método), manteniendo filas por dispositivo/método para el resto de cobros.

**Archivos**

- supabase/migrations/20260220153000_047_cashbox_reconciliation_inputs.sql
- app/cashbox/page.tsx
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)
- npm run db:reset OK (2026-02-20)
- Verificación DB objetos: `cash_session_reconciliation_inputs`, `rpc_get_cash_session_reconciliation_rows`, `rpc_upsert_cash_session_reconciliation_inputs` OK
- Verificación RLS mínima:
  - ALLOW: `org_admin` ejecuta `rpc_get_cash_session_reconciliation_rows` sin error
  - DENY: `staff` sin módulo `cashbox` recibe `cashbox module disabled` en `rpc_get_cash_session_reconciliation_rows`

**Commit:** N/A

## 2026-02-20 12:46 -03 — Seed operativo caja (hoy): ventas + pago proveedor cash

**Tipo:** tests
**Lote:** cashbox-today-seed-sales-and-cash-payment
**Alcance:** db, tests

**Resumen**
Se insertaron datos de prueba operativos para validar `/cashbox` con escenario real de hoy: ventas no-efectivo en sucursal Palermo y pago a proveedor en efectivo sobre pedido reconciliado (generando movimiento automático `supplier_payment_cash` en sesión de caja abierta).

**Archivos**

- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:seed:demo` OK (2026-02-20)
- Verificación ventas hoy (Palermo): `sales_today=4`, `total_today=141473.37`
- Verificación medios hoy:
  - `card` + `Posnet principal`: `13602.00`
  - `card` + `MercadoPago principal`: `7659.20`
  - `mercadopago` + `MercadoPago principal`: `33146.80`
- Verificación RPC conciliación (`rpc_get_cash_session_reconciliation_rows`) en sesión abierta `44444444-4444-4444-4444-444444444444`:
  - `Posnet principal` (`card`): `13602.00`
  - `MercadoPago (total)`: `40806.00`
- Verificación pago proveedor cash:
  - `payable_id=2d393e90-3225-4c56-8248-8cfdf579bd78` actualizado a `invoice_amount=12000`
  - pago `3000` por `rpc_register_supplier_payment`
  - payable resultante `status=partial`, `outstanding_amount=9000`
  - movimiento caja generado: `category_key=supplier_payment_cash`, `amount=3000`

**Commit:** N/A

## 2026-02-20 14:34 -03 — Script de seed caja: pedido `sent` con items para control

**Tipo:** tests
**Lote:** cashbox-default-seed-script
**Alcance:** db, docs, tests

**Resumen**
Se ajustó `scripts/seed-cashbox-today.js` para que también cree/actualice un pedido en estado `sent` con items y cantidades > 0 en sucursal Palermo, permitiendo prueba manual de control en `/orders` antes de registrar pago en efectivo y validar impacto en `/cashbox`.

**Archivos**

- scripts/seed-cashbox-today.js
- package.json
- docs/docs-demo-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:seed:cashbox` OK (2026-02-20)
- Verificación pedido seed en DB:
  - `id=93000000-0000-0000-0000-000000000001`
  - `status=sent`
  - `items=3`
  - `ordered_total=18.000`
- `npm run lint` OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 14:44 -03 — Caja: conciliación con fila de efectivo esperado total

**Tipo:** db
**Lote:** cashbox-reconciliation-cash-expected-row
**Alcance:** db, frontend, docs, tests

**Resumen**
Se corrigió la conciliación en `/cashbox` para incluir explícitamente una fila de `Efectivo esperado total (caja + reserva)` dentro de la sesión, además de filas por dispositivo no-MP y fila agregada `MercadoPago (total)`. En UI, la fila de efectivo se muestra como cálculo automático sin input manual.

**Archivos**

- supabase/migrations/20260220170000_048_cashbox_reconciliation_include_cash_expected.sql
- app/cashbox/page.tsx
- scripts/seed-cashbox-today.js
- docs/docs-app-screens-cashbox.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-20)
- `npm run db:seed:demo` OK (2026-02-20)
- `npm run db:seed:cashbox` OK (2026-02-20)
- Verificación seed conciliación: `Reconciliation rows: 3` y `MercadoPago total: 26122`
- `npm run lint` OK (2026-02-20)
- `npm run build` OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 14:52 -03 — Caja: MercadoPago total solo por método `mercadopago`

**Tipo:** db
**Lote:** cashbox-reconciliation-mp-method-clarification
**Alcance:** db, tests, docs

**Resumen**
Se ajustó la clasificación de conciliación para que `MercadoPago (total)` dependa solo del método seleccionado (`payment_method='mercadopago'`). Los cobros `card` permanecen en filas de tarjeta por dispositivo, incluso cuando el dispositivo es `MercadoPago principal`.

**Archivos**

- supabase/migrations/20260220182000_049_cashbox_reconciliation_mp_by_method_only.sql
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-20)
- `npm run db:seed:demo` OK (2026-02-20)
- `npm run db:seed:cashbox` OK (2026-02-20)
- Verificación RPC (`rpc_get_cash_session_reconciliation_rows`) en sesión abierta:
  - `cash_expected_total`: `92000`
  - `card` + `MercadoPago principal`: `5302`
  - `card` + `Posnet principal`: `13255`
  - `mercadopago_total`: `21208`

**Commit:** N/A

## 2026-02-20 15:02 -03 — Caja: conciliación muestra conteo de cierre en vivo

**Tipo:** ui
**Lote:** cashbox-live-close-count-in-reconciliation
**Alcance:** frontend, docs, tests

**Resumen**
Se conectó el conteo de cierre (`Billetes al cierre en caja` + `Billetes al cierre en reserva`) con la sección de conciliación para mostrar en vivo el total contado antes de cerrar caja. En la fila de efectivo, `Monto comprobante` ahora se completa automáticamente con ese total y la diferencia se calcula en tiempo real contra el esperado de sistema.

**Archivos**

- app/cashbox/CashCountPairFields.tsx
- app/cashbox/CashboxReconciliationSection.tsx
- app/cashbox/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-20)
- `npm run build` OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 15:07 -03 — Caja: desglose visible del esperado en efectivo

**Tipo:** ui
**Lote:** cashbox-expected-cash-breakdown-visibility
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó en el bloque `Cerrar caja` un desglose explícito del esperado en efectivo para facilitar auditoría operativa durante el cierre: apertura caja, apertura reserva, ventas en efectivo, ingresos manuales, egresos por pago a proveedor en efectivo, otros egresos manuales y total egresos.

**Archivos**

- app/cashbox/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-20)
- `npm run build` OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 15:15 -03 — UX montos: inputs con separador de miles AR

**Tipo:** ui
**Lote:** amount-inputs-ar-format-ux
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó componente reusable `AmountInputAR` para mostrar montos con formato argentino en inputs (`100.000`, decimales con coma) sin romper formularios server-side. El componente renderiza input visible formateado + hidden con valor normalizado para backend.

**Archivos**

- app/components/AmountInputAR.tsx
- app/cashbox/page.tsx
- app/cashbox/CashboxReconciliationSection.tsx
- app/payments/page.tsx
- app/payments/PaymentAmountField.tsx
- app/orders/ReceiveActionsRow.tsx
- app/orders/[orderId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-20)
- `npm run build` OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 15:17 -03 — UX montos: extensión a ventas/productos/proveedores

**Tipo:** ui
**Lote:** amount-inputs-ar-format-ux
**Alcance:** frontend, docs, tests

**Resumen**
Se extendió el uso de `AmountInputAR` a más puntos de alto uso para lectura de montos grandes: filtros de ventas por monto, alta/edición de precio unitario en productos y alta de producto en detalle de proveedor.

**Archivos**

- app/sales/page.tsx
- app/products/page.tsx
- app/products/ProductActions.tsx
- app/suppliers/[supplierId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-02-20)
- `npm run build` OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 10:39 -03 — Ventas auditables + conciliación caja por dispositivo

**Tipo:** db
**Lote:** sales-history-detail-cashbox-device-reconciliation
**Alcance:** db, frontend, docs, tests

**Resumen**
Se agregó contrato completo de historial y detalle de ventas con filtros operativos y corrección auditada del método de pago. Además, `Caja` incorpora conciliación por método/dispositivo (posnet/MP/efectivo) para comparar comprobantes del turno contra monto sistema.

**Archivos**

- supabase/migrations/20260220113000_045_sales_history_cashbox_reconciliation.sql
- app/sales/page.tsx
- app/sales/[saleId]/page.tsx
- app/cashbox/page.tsx
- app/components/TopBar.tsx
- app/orders/[orderId]/page.tsx
- app/payments/page.tsx
- docs/docs-app-screens-sales.md
- docs/docs-app-screens-sale-detail.md
- docs/docs-app-screens-cashbox.md
- docs/docs-app-screens-index.md
- docs/docs-app-sitemap.md
- docs/docs-modules-cashbox.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)
- npm run db:reset OK (2026-02-20)
- Verificación DB objetos: `v_sales_admin`, `v_sale_detail_admin`, `rpc_get_cash_session_payment_breakdown`, `rpc_correct_sale_payment_method` OK
- Verificación RLS mínima:
  - ALLOW: org_admin puede leer `v_sales_admin` (query ejecuta sin error)
  - DENY: staff recibe `not authorized` en `rpc_correct_sale_payment_method`
- npm run db:rls:smoke FAIL (baseline preexistente: `staff puede leer products de su org`)

**Commit:** N/A

## 2026-02-20 12:13 -03 — Catálogo compartido de pagos entre POS y Sales

**Tipo:** refactor
**Lote:** payments-catalog-single-source-pos-sales
**Alcance:** frontend, docs, tests

**Resumen**
Se centralizó el catálogo operativo de pagos en `lib/payments/catalog.ts` y se conectó tanto en `POS` como en la corrección de pagos de `/sales/[saleId]`. Con esto, métodos/labels/reglas base se mantienen en un solo lugar y evita divergencias futuras entre módulos.

**Archivos**

- lib/payments/catalog.ts
- app/pos/PosClient.tsx
- app/sales/SalePaymentCorrectionForm.tsx
- app/sales/[saleId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 12:01 -03 — Sales detail: corrección de pago con botones visibles y canales MP

**Tipo:** ui
**Lote:** sales-detail-visible-payment-correction-controls
**Alcance:** frontend, db, docs, tests

**Resumen**
En `/sales/[saleId]` se reemplazó el formulario de corrección basado en dropdowns por controles visibles (botones) para método de pago. Ahora el flujo muestra explícitamente: `efectivo`, `débito`, `crédito` y `mercadopago`; para MercadoPago se agrega selector visible de canal (`Posnet MP`, `QR`, `Transferencia a alias MP`) y para débito/crédito se muestran dispositivos de cobro visibles. Además, se endureció la RPC para exigir dispositivo en débito/crédito y permitir MercadoPago sin dispositivo cuando no es canal posnet.

**Archivos**

- app/sales/[saleId]/page.tsx
- app/sales/SalePaymentCorrectionForm.tsx
- supabase/migrations/20260220114500_046_rpc_correct_sale_payment_method_channels.sql
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)
- npm run db:reset OK (2026-02-20)
- npm run db:seed:all OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 11:07 -03 — Ventas: default en sucursal activa del POS

**Tipo:** ui
**Lote:** sales-default-pos-branch
**Alcance:** frontend, docs, tests

**Resumen**
Se alinea `/sales` con el flujo operativo real: POS persiste la sucursal activa en cookie (`nodux_active_branch_id`) y `/sales` la usa por defecto cuando no hay filtros manuales. Así, al cobrar en POS y luego abrir ventas, la lista se centra en la misma sucursal automáticamente.

**Archivos**

- app/pos/PosClient.tsx
- app/sales/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-18 14:42 -03 — Orders detail: fila de acciones inline para recepción + pago efectivo

**Tipo:** ui
**Lote:** orders-detail-cash-row-inline-button-and-disabled-amount
**Alcance:** frontend, docs, tests

**Resumen**
Se ajustó el layout del bloque de confirmación en `/orders/[orderId]`: el botón “Confirmar recepción/control” ahora queda inline a la derecha del check de pago efectivo y su monto. El input de monto exacto se mantiene siempre visible pero bloqueado/vacío hasta marcar “Pago en efectivo realizado”.

**Archivos**

- app/orders/ReceiveActionsRow.tsx
- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:38 -03 — Orders detail: nota de “estimado aproximado” en monto

**Tipo:** ui
**Lote:** orders-detail-estimate-approx-note
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó anotación/tooltip en `/orders/[orderId]` junto al monto estimado (header y bloque de recepción) aclarando que es aproximado y que el monto real se confirma en remito/factura.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:36 -03 — Orders detail: estimado total visible y estimado por item

**Tipo:** ui
**Lote:** orders-detail-show-estimated-total-and-item-estimates
**Alcance:** frontend, docs, tests

**Resumen**
En `/orders/[orderId]` se agregó visibilidad del monto estimado total del pedido en el header y en el bloque de recepción/control. Además, en la lista de ítems se incorporó costo estimado unitario y subtotal estimado por item para mejorar validación operativa al recibir/controlar.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:30 -03 — Orders: input de cantidad permite vacío temporal al editar

**Tipo:** ui
**Lote:** orders-qty-input-allow-empty-editing
**Alcance:** frontend, tests

**Resumen**
Se mejoró la UX del input “Cantidad a pedir” en sugeridos (`OrderSuggestionsClient`): ahora permite borrar temporalmente el valor (estado vacío) sin forzar `0` en cada tecla, facilitando edición manual de cantidades.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:27 -03 — Orders: bloquear creación de pedido sin ítems válidos

**Tipo:** ui
**Lote:** orders-prevent-empty-order-creation
**Alcance:** frontend, docs, tests

**Resumen**
Se corrigió el flujo de creación en `/orders` para validar primero que exista al menos un ítem con cantidad > 0 antes de invocar `rpc_create_supplier_order`. Con esto se evita crear pedidos vacíos en el listado.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:25 -03 — Orders: preservar contexto de draft en error por ítems vacíos

**Tipo:** ui
**Lote:** orders-draft-context-preserve-on-empty-items-error
**Alcance:** frontend, docs, tests

**Resumen**
Se mejoró UX de `/orders` al crear pedido: cuando falla por ítems en 0, el redirect de error ahora conserva proveedor, sucursal y ajustes del draft (`draft_margin_pct`, `draft_avg_mode`) para que el desplegable siga abierto con el contexto armado y no haya que reconfigurar manualmente.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 13:00 -03 — Orders: fix de hydration mismatch en sugeridos

**Tipo:** ui
**Lote:** orders-hydration-mismatch-view-state-fix
**Alcance:** frontend, tests

**Resumen**
Se resolvió un `hydration mismatch` en `/orders` causado por inicializar la vista (tabla/tarjetas) con branch `typeof window` durante render del Client Component `OrderSuggestionsClient`. La vista ahora arranca estable en `table` para SSR/cliente y evita desalineación de HTML en hidratación.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:57 -03 — Orders: banner de confirmación al guardar/enviar desde armar pedido

**Tipo:** ui
**Lote:** orders-create-send-success-feedback-banner
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó feedback explícito en `/orders` al crear pedidos desde “Armar pedido”. El submit ahora redirige con `result` y muestra banner claro para: pedido enviado, borrador guardado y errores de creación/ítems vacíos.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:54 -03 — Orders detail: visibilidad de pago efectivo sin requerir estado `paid`

**Tipo:** ui
**Lote:** orders-detail-header-cash-paid-visibility-partial
**Alcance:** frontend, tests

**Resumen**
Se ajustó la condición del header de `/orders/[orderId]` para mostrar “Pagado en efectivo” y monto cuando exista pago efectivo registrado (`selected_payment_method='cash'` y `paid_amount>0`), aunque el payable no esté en estado final `paid` (por ejemplo `partial`).

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:51 -03 — Orders detail: header con “Pagado en efectivo” y monto

**Tipo:** ui
**Lote:** orders-detail-header-show-cash-payment-info
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó en la info superior de `/orders/[orderId]` el estado de pago en efectivo cuando aplica, mostrando monto pagado (ARS) y fecha/hora de pago junto a creado/enviado/controlado.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:49 -03 — Orders detail: pago efectivo idempotente sin error confuso

**Tipo:** ui
**Lote:** orders-detail-cash-idempotent-no-confusing-error
**Alcance:** frontend, docs, tests

**Resumen**
Se eliminó el mensaje de error confuso “La cuenta por pagar no requiere un nuevo pago en efectivo” en `/orders/[orderId]` para el flujo de control con check de pago efectivo. Ahora, si el payable ya quedó saldado, la acción no intenta registrar otro pago y la UI ya no muestra el check de pago efectivo para ese pedido; en su lugar informa que el pago ya está registrado.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:46 -03 — Orders detail: check de pago efectivo inline en confirmación

**Tipo:** ui
**Lote:** orders-detail-cash-checkbox-inline-with-confirm
**Alcance:** frontend, docs, tests

**Resumen**
Se iteró la UX en `/orders/[orderId]`: en recepción/control para proveedores de efectivo ahora se usa un check “Pago en efectivo realizado” y el monto exacto aparece inline al marcarlo, en la misma fila del botón “Confirmar recepción/control”. Se removió el input de monto separado de arriba y se mantuvo la regla de seguridad: si el check está marcado sin monto válido, no se procesa ningún cambio.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:38 -03 — Orders detail: separación estricta entre controlar y pagar efectivo

**Tipo:** ui
**Lote:** orders-detail-cash-action-separation-and-guardrails
**Alcance:** frontend, docs, tests

**Resumen**
Se corrigió el flujo en `/orders/[orderId]` para evitar regresión de estado al usar “Pago en efectivo realizado”. Ahora el botón de pago es una acción separada que no cambia estado del pedido. Además, si no se informa monto exacto, no se procesa ningún cambio. Se agregaron guardrails para impedir pago efectivo antes de confirmar control/recepción.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:14 -03 — Payments: método requerido en vivo desde perfil de proveedor

**Tipo:** ui
**Lote:** payments-required-method-live-from-supplier-profile
**Alcance:** frontend, docs, tests

**Resumen**
Se corrigió la visualización de “Método requerido” en `/payments`: ahora toma el método preferido actual del proveedor (`suppliers.preferred_payment_method`) en lugar de depender solo del snapshot de `supplier_payables`. Con esto, cambios recientes en `/suppliers` (por ejemplo transfer -> efectivo) se reflejan inmediatamente en pendientes por pagar.

**Archivos**

- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:08 -03 — Orders detail: acción Guardar y enviar en borrador

**Tipo:** ui
**Lote:** orders-detail-draft-save-and-send-button
**Alcance:** frontend, tests

**Resumen**
En el editor de borrador de `/orders/[orderId]` se agregó el botón `Guardar y enviar` junto a `Guardar borrador`. La acción reutiliza el guardado batch de ítems y, en el mismo submit, cambia el estado del pedido a `sent` para que pase a “Pendiente por recibir”.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:06 -03 — Orders detail: editor batch de borrador con sugeridos + buscador

**Tipo:** ui
**Lote:** orders-detail-draft-full-items-editor
**Alcance:** frontend, docs, tests

**Resumen**
En `/orders/[orderId]` (estado `draft`) se reemplazó el flujo de “Agregar ítem” + edición individual por un editor completo de borrador con lista de artículos sugeridos del proveedor/sucursal, estadísticas operativas, buscador por artículo y guardado batch. Al guardar, se aplica la nueva lista completa de ítems (upsert qty > 0 y remoción de los que quedan en 0/no incluidos).

**Archivos**

- app/orders/[orderId]/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 12:00 -03 — Suppliers: aplicar cambios de edición sin refresh manual

**Tipo:** ui
**Lote:** suppliers-immediate-refresh-after-save
**Alcance:** frontend, tests

**Resumen**
Se mejoró la UX de edición en `/suppliers` para que los cambios (incluyendo método de pago) se reflejen inmediatamente tras guardar, sin recargar manualmente la página. `SupplierActions` ahora ejecuta la Server Action y luego fuerza `router.refresh()`; además cierra el formulario de edición al completar.

**Archivos**

- app/suppliers/SupplierActions.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 11:57 -03 — Suppliers: fix Server Action closure en Next 16

**Tipo:** ui
**Lote:** suppliers-server-action-closure-fix
**Alcance:** frontend, tests

**Resumen**
Se corrigió el error de runtime en `/suppliers` bajo Next.js 16.1.6 (Turbopack) donde `createSupplier` y `updateSupplier` quedaban enlazadas a una función local (`deriveAccepts`) no serializable al cruzar el boundary Server Component -> Client Component. Se eliminó el closure y se derivaron `accepts_cash`/`accepts_transfer` inline dentro de cada Server Action.

**Archivos**

- app/suppliers/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 11:53 -03 — Suppliers: método de pago preferido como único control UX

**Tipo:** ui
**Lote:** suppliers-payment-preference-ui-simplification
**Alcance:** frontend, docs, tests

**Resumen**
Se simplificó la UX de pagos en proveedores (`/suppliers` y `/suppliers/[supplierId]`): “Método preferido” pasó a “Método de pago preferido”, se removieron los checkboxes visibles de “Acepta efectivo/transferencia”, y “Nota de pago” se renombró a “Datos de pago y notas del proveedor”. Internamente, la aceptación se deriva automáticamente desde el método preferido para mantener compatibilidad con RPC/DB.

**Archivos**

- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/suppliers/SupplierActions.tsx
- docs/docs-app-screens-suppliers.md
- docs/docs-modules-suppliers.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 11:38 -03 — Order detail cash: monto exacto obligatorio y monto real de la orden

**Tipo:** ui
**Lote:** orders-detail-cash-payment-exact-amount
**Alcance:** frontend, docs, tests

**Resumen**
El botón “Pago en efectivo realizado” en `/orders/[orderId]` ahora exige monto exacto pagado. Ese monto se usa para actualizar el `invoice_amount` real del payable de la orden y luego registrar el pago en efectivo en el mismo flujo de control.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 11:35 -03 — Order detail: pago en efectivo al controlar recepción

**Tipo:** ui
**Lote:** orders-detail-cash-payment-at-receive
**Alcance:** frontend, docs, tests

**Resumen**
En `/orders/[orderId]` se agregó botón “Pago en efectivo realizado” junto a la confirmación de recepción/control para proveedores con método preferido `cash`. Esa acción confirma el control del pedido y registra automáticamente un pago en efectivo por el saldo pendiente del payable asociado. Si no se usa, el pedido queda controlado y el pago permanece pendiente/parcial para gestionarse en `/payments`.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:58 -03 — Payments: número factura/remito persistente + defaults de método/fecha

**Tipo:** schema
**Lote:** payments-invoice-reference-and-defaults
**Alcance:** db, ui, docs, tests

**Resumen**
Se agregó `invoice_reference` en `supplier_payables` y se extendió `rpc_update_supplier_payable` para guardar número de factura/remito. En `/payments` el formulario ahora se llama “Editar datos de factura/remito”, incluye ese campo al inicio, precarga método seleccionado con el preferido del proveedor cuando no había selección y usa `due_on` guardado sin conversión de zona horaria.

**Archivos**

- supabase/migrations/20260218113000_042_supplier_payables_invoice_reference.sql
- app/payments/page.tsx
- scripts/seed-demo-data.js
- docs/docs-app-screens-payments.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-18)
- node scripts/seed-demo-data.js OK (2026-02-18)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:53 -03 — Inputs numéricos sin chevrons y sin cambio por scroll (global)

**Tipo:** ui
**Lote:** global-number-input-no-spinner-no-wheel
**Alcance:** frontend, ux, tests

**Resumen**
Se aplicó hardening global para inputs numéricos: se removieron los chevrons (spin buttons) en todos los navegadores y se bloqueó el cambio de valor por rueda del mouse cuando un `input[type=number]` está enfocado.

**Archivos**

- app/globals.css
- app/layout.tsx
- app/components/NumberInputScrollGuard.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:45 -03 — Payments: fecha/hora en registro + bloqueo en pagadas + seed con más transfer pendientes

**Tipo:** ui
**Lote:** payments-flow-paid-at-and-demo-transfer-pending
**Alcance:** frontend, db, docs, tests

**Resumen**
Se agregó `fecha y hora de pago` al formulario de “Registrar pago” en `/payments` y se envía como `p_paid_at` al RPC. Para facturas ya pagadas se oculta la acción de registrar nuevos pagos y se muestra mensaje de estado final con fecha/hora. Además, se amplió el seed con nuevos pedidos y más escenarios `pending` por transferencia para visualización operativa.

**Archivos**

- app/payments/page.tsx
- scripts/seed-demo-data.js
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- node scripts/seed-demo-data.js OK (2026-02-18)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:39 -03 — Payments: pendientes/pagadas + orden por urgencia + buscador flexible

**Tipo:** ui
**Lote:** payments-list-priority-search
**Alcance:** frontend, docs, tests

**Resumen**
En `/payments` el listado se dividió en dos secciones (pendientes arriba, pagadas abajo). Las pendientes se ordenan por prioridad operativa: vencidas primero, luego próximo vencimiento y por último sin vencimiento. Se agregó buscador por nombre debajo de filtros, con coincidencia por palabras en cualquier orden.

**Archivos**

- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:09 -03 — Visibilidad de método de pago requerido en listados

**Tipo:** ui
**Lote:** payment-method-visibility-orders-payments
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó en `/orders` la visualización del método de pago requerido por proveedor (`preferred_payment_method`) y en `/payments` se muestra en cada cuenta por pagar el método requerido + método seleccionado.

**Archivos**

- app/orders/page.tsx
- app/payments/page.tsx
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 10:02 -03 — Pagos sincronizados con pedidos enviados + estado operativo visible

**Tipo:** schema
**Lote:** payments-sync-sent-orders
**Alcance:** db, ui, docs, tests

**Resumen**
Se extendió la sincronización de `supplier_payables` para incluir pedidos `sent` además de `received/reconciled`, con backfill automático sobre históricos. En `/payments` se expone el estado operativo del pedido para distinguir “pendiente por recibir” vs “controlado”.

**Archivos**

- supabase/migrations/20260218102000_041_payables_include_sent_orders.sql
- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/docs-modules-supplier-payments.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-18)
- node scripts/seed-demo-data.js OK (2026-02-18)
- psql local check `v_supplier_payables_admin` OK (sent=2, received=2, reconciled=2)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 09:47 -03 — Datos demo realistas en orders/payments + UI colapsable

**Tipo:** ui
**Lote:** payments-orders-demo-data-hardening
**Alcance:** frontend, db, docs, tests

**Resumen**
Se ajustaron los datos demo para que `/orders` y `/payments` muestren proveedores/sucursales con nombres reales, perfiles de pago completos y cuentas por pagar con factura, vencimiento y estados pendientes/parciales/pagados. En `/payments` se ocultaron formularios de factura y pago en secciones desplegables para reducir carga visual.

**Archivos**

- scripts/seed-users.js
- scripts/seed-demo-data.js
- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/docs-demo-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- node scripts/seed-demo-data.js OK (2026-02-18)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-17 22:11 -03 — Factura comprimida para pagos proveedor

**Tipo:** ui
**Lote:** supplier-invoice-photo-compression-storage
**Alcance:** db, ui, docs, tests

**Resumen**
Se incorporó carga de foto de factura/remito en `/payments` con conversión y compresión automática a JPG para minimizar peso manteniendo legibilidad. La imagen se sube a Storage en bucket `supplier-invoices` y se guarda el path en `supplier_payables.invoice_photo_url`.

**Archivos**

- supabase/migrations/20260217221500_040_supplier_invoice_storage_bucket.sql
- app/payments/InvoiceImageField.tsx
- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run db:reset OK (2026-02-17)
- npm run db:schema:snapshot OK (2026-02-17)
- npm run types:gen OK (2026-02-17)
- npm run db:seed:all OK (2026-02-17)
- npm run db:rls:smoke OK (2026-02-17)
- npm run lint OK (2026-02-17)
- npm run build OK (2026-02-17)

**Commit:** N/A

## 2026-02-17 22:00 -03 — Pagos proveedor por sucursal + integración con orders

**Tipo:** schema
**Lote:** supplier-payments-branch-module-foundation
**Alcance:** db, ui, docs, tests

**Resumen**
Se implementó la base operativa del módulo `/payments` por sucursal: perfil de pago en proveedor (métodos/plazo), cuentas de transferencia, cuentas por pagar por pedido y registro de pagos. El estado de pago queda integrado en `/orders` para ver pendiente/parcial/pagado/vencido y saldo.

**Impacto**

- Nuevo flujo conectado `suppliers -> orders -> payments`.
- Cada sucursal gestiona sus pedidos y pagos sobre `branch_id`.
- Al recibir/controlar pedido se sincroniza automáticamente `supplier_payables`.
- `/orders` muestra estado de pago y saldo pendiente por pedido.
- `/suppliers` y `/suppliers/[supplierId]` incluyen método/plazo/cuentas de pago.

**Archivos**

- supabase/migrations/20260217213000_039_supplier_payments_branch_module.sql
- app/payments/page.tsx
- app/orders/page.tsx
- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/suppliers/SupplierActions.tsx
- app/components/TopBar.tsx
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-orders.md
- docs/docs-app-screens-suppliers.md
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-app-screens-payments.md
- docs/docs-modules-suppliers.md
- docs/docs-modules-supplier-orders.md
- docs/docs-modules-supplier-payments.md
- docs/docs-scope-mvp.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-17)
- npm run db:schema:snapshot OK (2026-02-17)
- npm run types:gen OK (2026-02-17)
- npm run db:seed:all OK (2026-02-17)
- npm run db:rls:smoke OK (2026-02-17)
- npm run lint OK (2026-02-17)
- npm run build OK (2026-02-17)

**Commit:** N/A

## 2026-02-13 — Auditoría: hardening operativo en proveedores/pedidos

**Lote:** audit-log-operational-hardening
**Tipo:** db
**Alcance:** db + frontend + docs

**Resumen**
Se auditó la cobertura real de `audit_log` con pruebas autenticadas y se cerraron gaps en acciones críticas: `supplier_upsert`, actualización de `expected_receive_on` y recepción/control de pedidos proveedor. También se actualizaron labels de `/settings/audit-log`.

**Impacto**

- Crear/editar proveedor vuelve a registrar `supplier_upsert`.
- Ajustar fecha estimada de recepción registra `supplier_order_expected_receive_on_set`.
- Confirmar recepción/control registra `supplier_order_received`.
- UI de auditoría muestra labels legibles para acciones de vencimientos/stock safety nuevas.

**Archivos**

- supabase/migrations/20260213125000_030_audit_gaps_supplier_orders.sql
- app/orders/calendar/page.tsx
- app/orders/[orderId]/page.tsx
- app/settings/audit-log/page.tsx
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/docs-modules-supplier-orders.md
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-settings-audit-log.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run db:reset` OK (2026-02-13) · `npm run db:seed:demo` OK (2026-02-13) · `npm run db:schema:snapshot` OK (2026-02-13) · `npm run types:gen` OK (2026-02-13) · `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Verificación DB:** action_keys observados: `supplier_upsert`, `supplier_order_status_set`, `supplier_order_expected_receive_on_set`, `supplier_order_received`, `expiration_batch_date_corrected`, `expiration_waste_recorded`
**Verificación RLS mínima:** OA lectura `v_audit_log_admin` OK (6 filas) · ST lectura `v_audit_log_admin` denegada por política efectiva (0 filas)
**Commit:** N/A

## 2026-02-16 — POS split payments (efectivo + tarjeta) con contrato DB compatible

**Tipo:** schema
**Alcance:** db, ui, docs, tests

**Resumen**
Se habilitó pago dividido en POS con desglose por método (`sale_payments`), manteniendo compatibilidad backward en `rpc_create_sale` y sin romper flujo actual de pago único.

**Impacto**

- POS permite combinar métodos (ej: efectivo + tarjeta) con suma exacta obligatoria.
- `rpc_create_sale` acepta `p_payments` opcional:
  - sin `p_payments` mantiene comportamiento previo.
  - con `p_payments` valida montos/metodos y total exacto.
- `sales.payment_method` pasa a `mixed` cuando hay más de un método.
- Descuento efectivo sigue protegido:
  - solo aplica si el cobro es 100% cash (no split).
- Dashboard de efectivo usa cobros reales desde `sale_payments` (incluye componente cash en ventas mixtas).
- Auditoría de venta registra detalle `payments`.

**Archivos**

- supabase/migrations/20260216163000_034_split_payments_enum.sql
- supabase/migrations/20260216164000_035_split_payments_pos.sql
- app/pos/PosClient.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-admin-dashboard.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run db:reset:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)
- npm run format:check OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — POS: descuento en efectivo fijo por preferencias + métricas dashboard

**Tipo:** schema
**Alcance:** db, ui, docs, tests

**Resumen**
Se implementó descuento por efectivo en POS con porcentaje fijo configurable en `settings/preferences`, validación estricta en DB para que solo aplique con `payment_method='cash'`, auditoría de cambios de preferencias y nuevos KPI de efectivo/descuento en dashboard.

**Impacto**

- Caja: toggle de descuento efectivo sin edición de porcentaje.
- Configuración: porcentaje gestionado solo por OA/SA en preferencias.
- DB: `rpc_create_sale` bloquea intento de descuento en tarjeta/otros medios.
- Auditoría:
  - `sale_created` ahora incluye `subtotal_amount`, `discount_amount`, `discount_pct`, `cash_discount_applied`.
  - nuevo evento `org_preferences_updated` al cambiar preferencias.
- Dashboard: nuevos indicadores de efectivo y descuentos del día.

**Archivos**

- supabase/migrations/20260216150000_033_cash_discount_pos_dashboard_audit.sql
- app/pos/page.tsx
- app/pos/PosClient.tsx
- app/settings/preferences/page.tsx
- app/dashboard/page.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-admin-dashboard.md
- docs/docs-app-screens-settings-preferences.md
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run db:reset:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run format:check OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 14:56 -03 — Hardening Caja: firma operativa + conteo por denominaciones

**Tipo:** schema  
**Lote:** cashbox-close-signature-denominations  
**Alcance:** db, ui, docs, tests

**Resumen**
Se endureció el cierre de caja para exigir firma operativa (`closed_controlled_by_name`) y confirmación explícita. Además, se agregó conteo por denominaciones con validación de suma exacta contra el total contado.

**Impacto**

- Cierre de caja más auditable y trazable por sucursal.
- `rpc_close_cash_session` ahora:
  - exige nombre de quien controla,
  - exige confirmación de cierre,
  - valida `count_lines` y su suma.
- Se almacena el detalle de denominaciones en `cash_session_count_lines`.
- Auditoría de cierre incluye firma/confirmación/denominaciones en metadata.

**Archivos**

- supabase/migrations/20260216182000_037_cashbox_close_signature_denominations.sql
- app/cashbox/page.tsx
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/docs-app-screens-settings-audit-log.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md
- docs/schema.sql
- types/supabase.ts

**Tests:**

- npm run db:reset OK (2026-02-16)
- npm run db:schema:snapshot OK (2026-02-16)
- npm run types:gen OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Cierre hardening QA: smoke RLS + CI automatizada

**Tipo:** tests
**Alcance:** qa, ci, docs

**Resumen**
Se agregó una suite mínima de smoke RLS ejecutable por script y un workflow de GitHub Actions para validar de forma repetible DB local + seed + lint/build + smoke RLS + smoke Playwright.

**Impacto**

- Validación automática de permisos críticos:
  - staff puede leer catálogo y no puede crear productos.
  - org_admin puede crear productos y no puede ejecutar RPCs de superadmin.
  - superadmin puede operar org activa y leer vistas de plataforma.
- Pipeline CI deja de depender de ejecución manual para smoke.
- Se reduce riesgo de regresiones en auth/RLS/routing multi-org.

**Archivos**

- scripts/rls-smoke-tests.mjs
- package.json
- .github/workflows/ci-hardening.yml
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/docs-rls-matrix.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-13 — Calendario: remover estado “pedido realizado”

**Lote:** orders-calendar-remove-sent-state
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se simplificó el calendario de proveedores para trabajar con solo 3 estados operativos: pendiente por realizar, pendiente por recibir y recibido/controlado. Se removió el estado intermedio “pedido realizado”.

**Impacto**

- Se elimina ambigüedad entre “realizado” y “pendiente por recibir”.
- El filtro de estado ya no muestra “pedido realizado”.
- La copia de cabecera y el contrato de pantalla quedan alineados con 3 estados.

**Archivos**

- app/orders/calendar/page.tsx
- app/orders/calendar/CalendarFiltersClient.tsx
- docs/docs-app-screens-supplier-calendar.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario: deduplicar texto de estado en tarjetas

**Lote:** orders-calendar-dedupe-status-text
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se eliminó la repetición de estado en tarjetas de `/orders/calendar`: cuando existe la línea “Estado de pedido”, ya no se renderiza el texto de estado superior.

**Impacto**

- Mejora claridad visual en eventos con pedido real.
- Mantiene el estado operativo en la línea “Estado de pedido”.
- No altera reglas de negocio ni filtros del calendario.

**Archivos**

- app/orders/calendar/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Normalización de estados en calendario/detalle de pedidos

**Lote:** orders-status-normalization-calendar-detail
**Tipo:** fix
**Alcance:** frontend + docs

**Resumen**
Se corrigió una inconsistencia de estados entre `/orders/calendar` y `/orders/[orderId]`: antes un pedido `received` podía verse como “pendiente por recibir” en calendario pero “controlado” en detalle. Ahora la UI opera con 3 estados claros y consistentes.

**Impacto**

- En calendario, `controlled` solo se construye con `reconciled_at` (ya no con `received_at`).
- En calendario, pedidos `received` legacy sin `reconciled_at` se tratan como pendientes por recibir.
- En detalle, `received` deja de mostrarse como controlado; permite completar control y cerrar en `reconciled` con fecha/firma.

**Archivos**

- app/orders/calendar/page.tsx
- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-supplier-calendar.md
- docs/docs-app-screens-order-detail.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Comando único db:reset:all

**Lote:** db-reset-all-command
**Tipo:** infra
**Alcance:** backend + docs

**Resumen**
Se agregó el comando `db:reset:all` para ejecutar en una sola orden el reset local de Supabase, seed de usuarios y seed demo operativo MVP.

**Impacto**

- Simplifica la preparación de entorno QA con un único entry point.
- Mantiene `db:reset`, `db:seed:all` y `db:seed:demo` para casos parciales.
- Documenta explícitamente el flujo recomendado de reseteo integral.

**Archivos**

- package.json
- docs/docs-demo-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run db:reset:all` OK (2026-02-13) · `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Seed QA integral para MVP

**Lote:** seed-mvp-full-reusable
**Tipo:** tests
**Alcance:** backend + infra + docs

**Resumen**
Se fortalecio el seed demo para cubrir mas escenarios operativos del MVP (pedidos proveedor en multiples estados, expected receive, vencimientos y pedidos especiales en estados variados), se agrego comando unico `db:seed:all` y se corrigio idempotencia de `seed-users` para el error `email_exists`.

**Impacto**

- Permite poblar datos consistentes para probar `/products`, `/suppliers`, `/orders`, `/orders/calendar`, `/clients`, `/expirations` y POS sin preparar datos manualmente.
- El seed completo se ejecuta con un solo comando (`npm run db:seed:all`).
- Re-ejecuciones no fallan por usuarios ya existentes.

**Archivos**

- scripts/seed-demo-data.js
- scripts/seed-users.js
- package.json
- docs/docs-demo-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run db:seed:all` OK (2026-02-13) · `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Suppliers: buscador bajo título de listado

**Lote:** suppliers-list-search-below-title
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se ajusto el layout en `/suppliers` para ubicar el buscador justo debajo del título “Listado”, manteniendo el filtro en vivo desde 3 letras.

**Impacto**

- Mejora jerarquía visual de la sección de listado.
- No cambia la lógica de búsqueda ni el contrato de datos.
- Mantiene interacción sin botón y actualización automática por query param.

**Archivos**

- app/suppliers/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Suppliers: buscador en vivo dentro de listado

**Lote:** suppliers-list-live-search
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se movio el buscador de proveedores al bloque `Listado` y se cambio a filtro en vivo sin boton: aplica busqueda por nombre/contacto al escribir 3 o mas letras.

**Impacto**

- Reduce pasos para filtrar proveedores en operacion diaria.
- Mantiene el contrato de lectura `v_suppliers_admin` sin cambios estructurales.
- Con 1-2 letras no se filtra; al limpiar input vuelve listado completo.

**Archivos**

- app/suppliers/page.tsx
- app/suppliers/SuppliersSearchInput.tsx
- docs/docs-app-screens-suppliers.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Suppliers: alta en desplegable

**Lote:** suppliers-new-form-collapsible
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se movio la seccion “Nuevo proveedor” de `/suppliers` a un bloque desplegable (`details/summary`) para reducir ruido visual y mantener el formulario disponible en la misma pantalla.

**Impacto**

- Mejora legibilidad del listado de proveedores al entrar a la pantalla.
- Mantiene intacto el contrato de datos (`v_suppliers_admin` + `rpc_upsert_supplier`).
- El desplegable queda abierto por defecto cuando no hay proveedores (empty state).

**Archivos**

- app/suppliers/page.tsx
- docs/docs-app-screens-suppliers.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Orders list: alerta de recepción vencida

**Lote:** orders-list-overdue-expected-receive
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agrego alerta visual en `/orders` para pedidos pendientes cuya fecha estimada de recepción ya venció.

**Impacto**

- Mejora detección rápida de pedidos atrasados.
- No altera lógica de estados ni reglas de negocio.
- Mantiene compatibilidad con `expected_receive_on` editable.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Orders list: mostrar fecha estimada de recepción

**Lote:** orders-list-expected-receive
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agrego `expected_receive_on` en las tarjetas del listado de `/orders` (pendientes y controlados) para visibilidad rápida sin entrar al detalle.

**Impacto**

- Mejora seguimiento operativo de recepciones esperadas desde la lista principal.
- Mantiene sincronia con el valor editable desde calendario y detalle.
- No cambia reglas de negocio ni flujo de estados.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Orders detail: expected receive editable

**Lote:** suppliers-calendar-expected-receive-order-detail
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agrego edicion de `expected_receive_on` en `/orders/[orderId]` para pedidos en estado enviado/received, manteniendo sincronia con calendario.

**Impacto**

- OA puede ajustar fecha estimada desde detalle del pedido, sin volver al calendario.
- Al guardar, la fecha se refleja en `/orders/calendar`.
- No cambia flujo de control de mercaderia ni recepcion.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario: expected receive editable + filtros condicionales

**Lote:** suppliers-calendar-expected-receive
**Tipo:** feature
**Alcance:** db + frontend + docs

**Resumen**
Se agrego `expected_receive_on` en `supplier_orders` y se habilito su edicion desde `/orders/calendar` para pedidos pendientes por recibir. Tambien se ajustaron filtros para flujo `sucursal -> estado -> periodo` y `desde/hasta` solo en rango personalizado (aparece inmediatamente al seleccionar la opcion).

**Impacto**

- OA puede ajustar fecha estimada exacta de recepcion cuando el dia por defecto del proveedor no aplica.
- El calendario mantiene sincronia con estados reales de pedidos en `/orders`.
- Staff conserva visibilidad solo lectura.

**Archivos**

- supabase/migrations/20260213101500_029_supplier_orders_expected_receive_on.sql
- app/orders/calendar/page.tsx
- app/orders/calendar/CalendarFiltersClient.tsx
- docs/schema.sql
- types/supabase.ts
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/docs-app-screens-supplier-calendar.md
- docs/docs-modules-supplier-calendar.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run db:reset` OK (2026-02-13) · `npm run db:schema:snapshot` OK (2026-02-13) · `npm run types:gen` OK (2026-02-13) · `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario de proveedores v2 (filtros + estados operativos)

**Lote:** suppliers-calendar-mvp-ui-v2
**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se itero la pantalla de calendario para orientarla a operacion diaria con filtros por periodo/rango y estados operativos sincronizados con pedidos.

**Impacto**

- Filtros: hoy, semana, mes o rango personalizado.
- Estados de tarjeta: pendiente por realizar, pedido realizado, pendiente por recibir, recibido y controlado.
- Acceso directo a pedido para revisar/controlar desde calendario.

**Archivos**

- app/orders/calendar/page.tsx
- docs/docs-app-screens-supplier-calendar.md
- docs/docs-modules-supplier-calendar.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario de proveedores MVP (UI + docs)

**Lote:** suppliers-calendar-mvp-ui
**Tipo:** feature
**Alcance:** frontend + docs

**Resumen**
Se implemento la nueva pantalla `/orders/calendar` con agenda mobile-first de 14 dias que combina envios/recepciones programados desde proveedores y eventos reales de pedidos, con visibilidad para OA y Staff (solo lectura para Staff).

**Impacto**

- OA puede ver agenda de proveedores y entrar rapido a crear/ver pedido.
- Staff puede consultar que se envia/recibe por dia sin acceso de escritura.
- Se actualiza documentacion de sitemap, indice de pantallas y modulo/calendario.

**Archivos**

- app/orders/calendar/page.tsx
- app/components/TopBar.tsx
- docs/docs-modules-supplier-calendar.md
- docs/docs-app-screens-supplier-calendar.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-modules-supplier-orders.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/docs-ux-ui-brief.md
- docs/prompts.md
- docs/activity-log.md

**Tests:** `npm run lint` OK (2026-02-13) · `npm run build` OK (2026-02-13)
**Commit:** N/A

## 2026-02-13 — Calendario proveedores: discovery y propuesta de arquitectura

**Lote:** suppliers-calendar-discovery
**Tipo:** decision
**Alcance:** docs + arquitectura

**Resumen**
Se realizo analisis repo-aware (docs, schema, RLS, rutas y contratos actuales) para definir la propuesta del nuevo modulo de calendario de proveedores con enfoque mobile-first y visibilidad para OA/ST.

**Impacto**

- Define una propuesta concreta de rutas, contrato de datos, permisos y UX para el calendario.
- Identifica brechas del modelo actual (eventos recurrentes vs eventos reales de pedidos) y una estrategia de implementacion por fases.
- No se aplican cambios de codigo ni migraciones en este lote.

**Archivos**

- docs/docs-scope-mvp.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-suppliers.md
- docs/docs-app-screens-orders.md
- docs/docs-modules-suppliers.md
- docs/docs-modules-supplier-orders.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md
- app/orders/page.tsx
- app/pos/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/components/TopBar.tsx
- supabase/migrations/20260208213000_001_init_schema.sql
- supabase/migrations/20260208221000_003_views.sql
- supabase/migrations/20260208222000_004_rpcs.sql
- supabase/migrations/20260208234000_006_rpc_staff_effective_modules.sql
- supabase/migrations/20260209170000_011_suppliers_frequency_safety_stock.sql
- supabase/migrations/20260209174000_013_rpc_upsert_supplier_schedule.sql
- supabase/migrations/20260209175000_014_view_suppliers_schedule.sql
- docs/schema.sql
- types/supabase.ts

**Tests:** N/A (lote de analisis/documentacion)
**Commit:** N/A

## 2026-02-11 — Expirations: vencidos unificados

**Tipo:** docs
**Alcance:** docs

**Resumen**
Se actualizo la documentacion de vencimientos para reflejar la lista unificada (vencidos primero) y el filtro “Vencidos”.

**Impacto**

- La pantalla /expirations queda documentada con lista unificada y accion de mover a desperdicio.
- El modulo de vencimientos refleja el flujo actualizado.
- No cambia la app ni la base de datos.

**Archivos**

- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/context-summary.md
- docs/prompts.md

**Tests:** N/A
**Commit:** N/A

## 2026-02-11 — Expirations: auto filtro por sucursal

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se actualizo el selector de sucursal para que refresque automaticamente la lista de vencimientos sin boton de filtrar.

**Impacto**

- Cambiar sucursal actualiza la lista al instante.
- No cambia reglas de negocio ni base de datos.
- Se actualiza el contrato de pantalla para reflejar el comportamiento.

**Archivos**

- app/expirations/ExpirationsFiltersClient.tsx
- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/prompts.md

**Tests:** N/A
**Commit:** N/A

## 2026-02-11 — Orders: selector de estado en detalle

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agrego selector de estado (borrador/enviado) en /orders/[orderId] y se documenta que “recibido/controlado” requieren sus flujos dedicados.

**Impacto**

- Permite ajustar el estado del pedido desde el header.
- Mantiene la recepcion y control como acciones dedicadas.
- No cambia RPCs ni modelo de datos.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md

**Tests:** N/A
**Commit:** N/A

## 2026-02-11 — Orders: recibido/controlado unificados en UI

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se unifico el estado “recibido” con “controlado” en la UI de detalle, manteniendo la recepcion/control como un solo paso.

**Impacto**

- El selector de estado solo permite borrador/enviado.
- La recepcion aplica controlado en un solo flujo.
- No cambia RPCs ni modelo de datos.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: refresh estado al enviar

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se fuerza redirect con aviso para que el estado se actualice inmediatamente al enviar pedido.

**Impacto**

- El estado cambia sin refrescar manualmente.
- Se mantiene el flujo actual de estados.
- No cambia DB ni RPCs.

**Archivos**

- app/orders/[orderId]/page.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: controlado obligatorio + auto sugeridos

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se obliga a indicar “controlado por” al recibir pedidos, se elimina “recibido” en la UI y se auto cargan sugeridos al elegir proveedor/sucursal.

**Impacto**

- La recepcion exige nombre de control.
- La cabecera muestra solo creado/enviado/controlado.
- El armado de pedido no requiere boton “Ver articulos”.

**Archivos**

- app/orders/[orderId]/page.tsx
- app/orders/OrderDraftFiltersClient.tsx
- app/orders/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — DB: refresco schema y tipos

**Tipo:** db
**Alcance:** db + docs

**Resumen**
Se corrigio la migracion de `v_expirations_due` para recrear el view y se regeneraron snapshot y tipos.

**Impacto**

- El view incluye `unit_price` y `total_value` sin conflicto.
- `types/supabase.ts` queda alineado a la DB local.
- `docs/schema.sql` actualizado.

**Archivos**

- supabase/migrations/20260211150000_028_expirations_due_include_price.sql
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md

**Tests:** `npm run db:reset` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Dashboard: KPIs y alertas basicas

**Tipo:** feature
**Alcance:** frontend + docs

**Resumen**
Se implemento el dashboard operativo con KPIs, alertas y paneles de acceso rapido usando `rpc_get_dashboard_admin`.

**Impacto**

- Visibilidad de ventas hoy/semana/mes y conteos clave.
- Alertas con CTA a vencimientos, pedidos y clientes.
- Filtro por sucursal con vista agregada.

**Archivos**

- app/dashboard/page.tsx
- app/dashboard/DashboardFiltersClient.tsx
- docs/docs-app-screens-admin-dashboard.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Dashboard: filtro por sucursal obligatorio

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se elimino la opcion “todas las sucursales” y el dashboard ahora opera siempre en una sucursal seleccionada.

**Impacto**

- El selector de sucursal es obligatorio.
- La vista siempre muestra datos de una sucursal.
- No cambia DB ni RPCs.

**Archivos**

- app/dashboard/DashboardFiltersClient.tsx
- app/dashboard/page.tsx
- docs/docs-app-screens-admin-dashboard.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

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

## 2026-02-11 — Clients: refresh estado pedido especial

**Tipo:** fix
**Alcance:** frontend

**Resumen**
Se fuerza redirect al mismo filtro al actualizar estado para reflejar cambios sin recargar manualmente.

**Impacto**

- Estado actualizado se ve inmediatamente.
- No cambia reglas de negocio ni DB.
- Mantiene filtros y cliente seleccionado.

**Archivos**

- app/clients/page.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: ajustes sugeridos debajo

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se movieron los ajustes de margen/promedio para que aparezcan debajo del listado de sugeridos y se apliquen con botón separado.

**Impacto**

- El usuario primero selecciona proveedor/sucursal.
- Los ajustes se aplican como configuración del listado.
- No cambia lógica de negocio ni RPCs.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: label promedio de ventas

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se renombro el selector de promedio a “Promedio de ventas” y se agrego aclaracion de uso.

**Impacto**

- Mejora claridad del ajuste.
- No cambia calculos ni lógica.
- No impacta DB.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: armar pedido colapsable

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se hizo colapsable la sección “Armar pedido” para priorizar el listado.

**Impacto**

- Reduce ruido visual al entrar a /orders.
- Mantiene el flujo actual sin cambios funcionales.
- No impacta DB.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: borrador vs enviado

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se agregaron botones para guardar como borrador o enviar pedido, actualizando el estado en el listado.

**Impacto**

- Permite distinguir borradores y pedidos enviados desde la creación.
- No cambia schema ni contratos.
- Mantiene el flujo de sugeridos.

**Archivos**

- app/orders/page.tsx
- docs/docs-app-screens-orders.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: texto mostrando

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se movio el texto de configuracion actual debajo de “Ajustes de sugeridos” y se prefijo con “Mostrando:”.

**Impacto**

- Mejora claridad de lo que se visualiza en los resultados.
- No cambia lógica de negocio ni datos.
- No afecta DB.

**Archivos**

- app/orders/page.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: mostrar debajo de especiales

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se movio el texto “Mostrando” debajo de la sección de pedidos especiales pendientes.

**Impacto**

- La configuración visible queda junto a las alertas.
- No cambia cálculos ni datos.
- Sin impacto en DB.

**Archivos**

- app/orders/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Orders: mostrar separado

**Tipo:** ux
**Alcance:** frontend

**Resumen**
Se movio el texto “Mostrando” fuera de la caja de pedidos especiales a una sección aparte.

**Impacto**

- Evita confusión entre alertas y contexto.
- No cambia cálculos ni datos.
- Sin impacto en DB.

**Archivos**

- app/orders/OrderSuggestionsClient.tsx
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Expirations: vencidos y desperdicio

**Tipo:** feature
**Alcance:** db + frontend + docs

**Resumen**
Se agregó sección de vencidos con acción de mover a desperdicio, cálculo de pérdida monetaria y registro en DB.

**Impacto**

- Permite registrar desperdicio por vencimiento.
- Descuenta stock al mover a desperdicio.
- Muestra total de pérdidas por sucursal.

**Archivos**

- supabase/migrations/20260211140000_027_expiration_waste.sql
- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/docs-data-model.md
- docs/docs-schema-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/prompts.md
- docs/schema.sql
- types/supabase.ts

**Tests:** `npm run db:reset` OK (2026-02-11) · `npm run db:schema:snapshot` OK (2026-02-11) · `npm run types:gen` OK (2026-02-11) · `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
**Commit:** N/A

## 2026-02-11 — Expirations: desperdicio confirmado

**Tipo:** ux
**Alcance:** frontend + docs

**Resumen**
Se separó “Vencidos” de “Desperdicio”; solo aparece en desperdicio cuando se confirma el movimiento.

**Impacto**

- Los vencidos pendientes se mantienen visibles hasta confirmar.
- Desperdicio muestra solo registros confirmados.
- No cambia cálculos ni DB.

**Archivos**

- app/expirations/page.tsx
- docs/docs-app-screens-expirations.md
- docs/docs-modules-expirations.md
- docs/docs-schema-model.md
- docs/prompts.md

**Tests:** `npm run lint` OK (2026-02-11) · `npm run build` OK (2026-02-11)
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

## 2026-02-13 — Settings MVP completo (rutas faltantes)

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se implementaron las rutas faltantes de Settings del MVP: hub `/settings`, y subpantallas `/settings/users`, `/settings/branches`, `/settings/staff-permissions`, `/settings/preferences`, reutilizando contratos de datos existentes (views/RPC/tablas).

**Impacto**

- Cierra brecha funcional de Fase 5 en frontend.
- Habilita gestion operativa de usuarios, sucursales, permisos staff y preferencias desde UI.
- Agrega punto de entrada de Configuracion en TopBar.

**Archivos**

- app/settings/page.tsx
- app/settings/users/page.tsx
- app/settings/branches/page.tsx
- app/settings/staff-permissions/page.tsx
- app/settings/preferences/page.tsx
- app/components/TopBar.tsx
- docs/prompts.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)
- npx playwright test: 1 passed / 1 failed (2026-02-13)
  - Falla en `e2e/smoke-pos.spec.ts` por selector ambiguo (`getByText('Pedidos especiales')`) en strict mode.

**Commit:** N/A

## 2026-02-13 — Smoke Playwright estabilizado

**Tipo:** tests
**Alcance:** e2e, docs

**Resumen**
Se corrigio el selector ambiguo en la suite smoke de Playwright para `/clients`, cambiando la asercion a un heading especifico.

**Impacto**

- Suite smoke vuelve a verde y recupera señal de regresion para flujo POS + clientes.

**Archivos**

- e2e/smoke-pos.spec.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npx playwright test OK (2 passed, 2026-02-13)
- npm run lint OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Credenciales administradas por admin (settings/users)

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se ajustó `/settings/users` para que el admin gestione credenciales: creación de usuario con contraseña inicial y reset de contraseña por admin, sin exposición de contraseña actual.

**Impacto**

- Staff no tiene flujo para cambiar contraseña en MVP; debe solicitarlo al admin.
- OA ve un apartado de credenciales por usuario (email + reset de contraseña).
- Se registra evento de auditoría `user_password_reset_by_admin`.

**Archivos**

- app/settings/users/page.tsx
- lib/supabase/admin.ts
- docs/docs-app-screens-settings-users.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Checklist de sucursales en settings/users

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se reemplazó el selector múltiple de sucursales por un checklist con checkboxes en alta y edición de usuarios.

**Impacto**

- Más claridad operativa: check marcado implica acceso a esa sucursal.
- Menos ambigüedad en asignación de sucursales para Staff.

**Archivos**

- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Settings/users compacto con edición desplegable

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se reorganizó `/settings/users` para mostrar una lista compacta por usuario (nombre, email, rol y sucursales) y mover los formularios completos de edición/credenciales a un panel desplegable por fila.

**Impacto**

- Menor ruido visual en operación diaria.
- Flujo de edición más explícito: primero lectura, luego edición bajo demanda.
- “Crear usuario” quedó en desplegable para priorizar la vista de usuarios existentes.

**Archivos**

- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Superadmin excluido de settings/users

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se bloqueó completamente la gestión de superadmin en `/settings/users`: no se lista en UI y backend rechaza intentos de creación/edición/reset para ese rol.

**Impacto**

- OA solo administra usuarios operativos de org (`org_admin`, `staff`).
- Se evita modificar cuentas de dueño/soporte desde settings de organización.

**Archivos**

- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-13 — Sucursales condicionales por rol en settings/users

**Tipo:** ui
**Alcance:** frontend, docs, tests

**Resumen**
Se ocultó el checklist de sucursales cuando el rol seleccionado es Org Admin y se mantiene visible solo para Staff (alta y edición).

**Impacto**

- Reduce confusión: OA no requiere asignación manual de sucursales.
- Refuerza el modelo de acceso por organización para admin.

**Archivos**

- app/settings/users/RoleBranchChecklist.tsx
- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-13)
- npm run build OK (2026-02-13)

**Commit:** N/A

## 2026-02-16 — Fundacion DB para superadmin global multi-org

**Tipo:** schema
**Alcance:** db, docs, tests

**Resumen**
Se implemento la base de datos para operar superadmin global fuera de `org_users`, con soporte de listado de organizaciones, alta de org/sucursal y contexto de org activa para impersonacion controlada.

**Impacto**

- Nuevo scope global de plataforma: `platform_admins` + helper `is_platform_admin()`.
- Nuevo contexto de org activa por usuario: `user_active_orgs` + RPCs de set/get.
- Nuevos contratos de lectura SA: `v_superadmin_orgs`, `v_superadmin_org_detail`.
- Nuevos contratos de escritura SA: `rpc_bootstrap_platform_admin`, `rpc_superadmin_create_org`, `rpc_superadmin_upsert_branch`, `rpc_superadmin_set_active_org`.
- `is_org_admin_or_superadmin` ahora contempla SA de plataforma.

**Archivos**

- supabase/migrations/20260216115100_031_superadmin_platform_foundation.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/docs-app-screens-superadmin.md
- docs/docs-schema-model.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-16)
- Verificacion objetos creada via psql local: tablas/views/RPCs nuevas OK (2026-02-16)
- Verificacion RLS minima via psql local: SA permitido (`orgs`), Staff denegado (`platform_admins`) (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Superadmin UI operativo multi-org

**Tipo:** ui
**Alcance:** frontend, auth/proxy, docs, tests

**Resumen**
Se implemento `/superadmin` con flujo operativo MVP: listado y busqueda de organizaciones, creacion de org con sucursal inicial, alta de sucursal por org y seleccion de org activa (impersonation context). Tambien se restringio visibilidad/acceso para que la opcion Superadmin solo aparezca en usuarios SA.

**Impacto**

- `/superadmin` deja de ser placeholder.
- `proxy.ts` reconoce SA de plataforma (`is_platform_admin`) y aplica redirects/guardas consistentes.
- Topbar oculta el link `Superadmin` para no-SA.
- Home (`/`) redirige correctamente a `/superadmin` para SA.

**Archivos**

- app/superadmin/page.tsx
- app/components/TopBar.tsx
- app/page.tsx
- proxy.ts
- docs/docs-app-screens-superadmin.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npx playwright test -g "smoke" FAIL inicial por datos demo faltantes (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-17 21:03 -03 — Orders: monto estimado por pedido en listado

**Tipo:** ui
**Lote:** orders-list-estimated-supplier-amount
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó en `/orders` la visualización de `Monto estimado` por pedido. El cálculo se realiza sumando los ítems del pedido (`ordered_qty * unit_cost`) y usando `products.unit_price` como fallback cuando `unit_cost` no está cargado. Además, al crear pedidos desde sugeridos se envía `unit_cost` estimado por ítem para mejorar la calidad de esa métrica.

**Archivos**

- app/orders/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- docs/docs-app-screens-orders.md
- docs/docs-modules-supplier-orders.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-17)
- npm run build OK (2026-02-17)

**Commit:** N/A

## 2026-02-16 15:45 -03 — Totales automáticos en formulario de conteo de caja

**Tipo:** ui
**Lote:** cashbox-live-totals-drawer-reserve
**Alcance:** frontend, docs, tests

**Resumen**
Se agregó cálculo en vivo en la pantalla `/cashbox` para que al ingresar cantidades por denominación el usuario vea inmediatamente:

- monto en caja
- monto en reserva
- total contado

Aplicado tanto en apertura como en cierre.

**Archivos**

- app/cashbox/CashCountPairFields.tsx
- app/cashbox/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 15:21 -03 — Caja por billetes en caja/reserva + denominaciones configurables

**Tipo:** schema
**Lote:** cashbox-drawer-reserve-denomination-config
**Alcance:** db, ui, docs, tests

**Resumen**
Se evolucionó el módulo `/cashbox` para que apertura y cierre se hagan por conteo de billetes/monedas por denominación en dos ámbitos: `caja` y `reserva`. El total contado se calcula en backend desde las líneas de conteo. Además, se agregó configuración de denominaciones por organización en preferencias.

**Impacto**

- Apertura:
  - ya no recibe monto manual; ahora recibe `opening_drawer_count_lines` + `opening_reserve_count_lines`.
  - persiste `opening_cash_amount` (caja) y `opening_reserve_amount` (reserva).
- Cierre:
  - ya no recibe monto contado manual; calcula total como `closing_drawer + closing_reserve`.
  - persiste `closing_drawer_amount` y `closing_reserve_amount`.
- Configuración:
  - `org_preferences.cash_denominations` define denominaciones activas por org.
  - defaults ARS iniciales: `100, 200, 500, 1000, 2000, 10000, 20000`.
- Auditoría:
  - eventos de apertura/cierre incluyen líneas de conteo de caja y reserva.
  - se mantiene actor (`actor_user_id`) y campos operativos de cierre (`closed_controlled_by_name`, `close_confirmed`).

**Archivos**

- supabase/migrations/20260216194000_038_cashbox_drawer_reserve_denom_config.sql
- app/cashbox/page.tsx
- app/settings/preferences/page.tsx
- docs/docs-app-screens-cashbox.md
- docs/docs-app-screens-settings-preferences.md
- docs/docs-app-screens-settings-audit-log.md
- docs/docs-modules-cashbox.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-16)
- npm run db:schema:snapshot OK (2026-02-16)
- npm run types:gen OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Bootstrap de org con OA inicial + dashboard SA por org activa

**Tipo:** ui
**Alcance:** frontend, auth/proxy, docs, tests

**Resumen**
Se completo el flujo de alta de organización desde `/superadmin` para incluir admin inicial (email + contraseña) en el mismo formulario. Además, se habilitó el acceso de superadmin al `/dashboard` usando la org activa.

**Impacto**

- Crea org + sucursal inicial + OA inicial en una sola acción.
- Evita orgs nuevas sin usuario administrador operativo.
- SA puede cambiar org activa y abrir `/dashboard` para revisar cada cliente.
- `proxy.ts` permite a SA navegar `/superadmin` y `/dashboard`.

**Archivos**

- app/superadmin/page.tsx
- app/dashboard/page.tsx
- proxy.ts
- docs/docs-app-screens-superadmin.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Admin inicial para org existente + SA en módulos por org activa

**Tipo:** ui
**Alcance:** frontend, auth/proxy, docs, tests

**Resumen**
Se habilitó en `/superadmin` la creación de admin inicial para organizaciones ya existentes (sin OA). Además, se extendió el contexto de org activa para superadmin en módulos core del MVP, evitando bloqueo por validaciones directas de `org_users`.

**Impacto**

- Flujo de recuperación para orgs legacy sin admin inicial.
- Operación SA multi-org más usable: activar org y navegar dashboard/módulos.
- Base reutilizable de contexto con helper `lib/auth/org-session.ts`.

**Archivos**

- app/superadmin/page.tsx
- lib/auth/org-session.ts
- app/pos/page.tsx
- app/products/page.tsx
- app/suppliers/page.tsx
- app/suppliers/[supplierId]/page.tsx
- app/orders/page.tsx
- app/orders/[orderId]/page.tsx
- app/orders/calendar/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/settings/page.tsx
- app/settings/branches/page.tsx
- app/settings/preferences/page.tsx
- app/settings/staff-permissions/page.tsx
- app/settings/users/page.tsx
- app/settings/audit-log/page.tsx
- proxy.ts
- docs/docs-app-screens-superadmin.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 — Hardening DB: alta org SA requiere owner y membresía atómica

**Tipo:** schema
**Alcance:** db, docs, tests

**Resumen**
Se reemplazó `rpc_superadmin_create_org` para exigir `p_owner_user_id` y garantizar que la org se cree de forma atómica con su admin inicial (sin orgs huérfanas).

**Impacto**

- Si falta owner, la RPC falla antes de crear registros.
- Si el owner no existe en `auth.users`, la RPC falla.
- Org + sucursal inicial + `org_preferences` + `org_users` + `branch_memberships` quedan en una sola transacción.

**Archivos**

- supabase/migrations/20260216124000_032_superadmin_create_org_owner_required.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-16)
- npm run format:check OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-16 14:13 -03 — Descubrimiento y propuesta de módulo Caja

**Tipo:** decision  
**Lote:** cashbox-module-discovery-proposal  
**Alcance:** docs, arquitectura

**Resumen**
Se realizó lectura repo-aware de documentación viva y contratos actuales para proponer el diseño de un nuevo módulo de caja orientado a cierre por turno o por día, con conteo físico, conciliación contra cobros POS y registro de gastos operativos.

**Archivos consultados**

- AGENTS.md
- docs/docs-scope-mvp.md
- docs/docs-scope-post-mvp.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-staff-permissions.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- app/pos/page.tsx
- app/settings/staff-permissions/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Resultado**

- Se confirmó que “cierres de caja avanzados” está en Post-MVP.
- Se detectó base sólida para caja operativa usando `sales`, `sale_payments`, `audit_log`, `org_preferences` y permisos por `staff_module_access`.
- Se definió recomendar una implementación en dos etapas: MVP de cierre simple (operable ahora) y hardening/analítica para etapa posterior.

**Tests:** No aplica (análisis y propuesta, sin cambios ejecutables)  
**Commit:** N/A

## 2026-02-16 14:28 -03 — Módulo Caja por sucursal (MVP) + auditoría de actor/movimientos

**Tipo:** schema  
**Lote:** cashbox-module-mvp-branch-audit  
**Alcance:** db, ui, docs, tests

**Resumen**
Se implementó el módulo `/cashbox` con operación por sucursal: apertura de caja por turno/día, registro de movimientos manuales (gasto/ingreso), cierre con conteo físico y cálculo de diferencia. Se agregó auditoría explícita para apertura, movimientos y cierre, incluyendo actor y metadata operativa.

**Impacto**

- Caja queda alineada a `branch_id` obligatorio y una sesión abierta por sucursal.
- Conciliación automática del esperado con:
  - apertura
  - cobros en efectivo desde `sale_payments`
  - ingresos y gastos manuales
- Auditoría visible en `/settings/audit-log` con acciones:
  - `cash_session_opened`
  - `cash_movement_added`
  - `cash_session_closed`
- Nuevo módulo habilitable para Staff: `cashbox` (en settings/permisos, proxy y redirect de home).

**Archivos**

- supabase/migrations/20260216171000_036_cashbox_branch_sessions.sql
- app/cashbox/page.tsx
- app/page.tsx
- app/clients/page.tsx
- app/pos/page.tsx
- app/expirations/page.tsx
- app/components/TopBar.tsx
- app/settings/staff-permissions/page.tsx
- app/settings/audit-log/page.tsx
- proxy.ts
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/docs-app-screens-settings-staff-permissions.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-schema-model.md
- docs/docs-scope-mvp.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/schema.sql
- types/supabase.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-16)
- npm run db:schema:snapshot OK (2026-02-16)
- npm run types:gen OK (2026-02-16)
- npm run db:seed:all OK (2026-02-16)
- npm run db:rls:smoke OK (2026-02-16)
- npm run lint OK (2026-02-16)
- npm run build OK (2026-02-16)
- npx playwright test -g "smoke" OK (2026-02-16)

**Commit:** N/A

## 2026-02-18 14:52 -03 — Seguimiento de último pago en `/payments`

**Tipo:** ui  
**Lote:** payments-latest-payment-badge  
**Descripción:** Se agregó en cada card de `/payments` una tarjeta de seguimiento con el último pago registrado (fecha/hora, monto y nota), incluyendo casos de pago parcial para facilitar trazabilidad operativa. Se mantuvo el contrato principal de pantalla y se añadió lectura auxiliar desde `supplier_payments` para obtener el movimiento más reciente por `payable_id`.

**Archivos afectados:**

- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 14:55 -03 — Botón `Restante` en formulario de registrar pago

**Tipo:** ui
**Lote:** payments-register-payment-fill-remaining
**Descripción:** Se agregó un botón `Restante` junto al input de monto en la sección “Registrar pago” de `/payments`. Al hacer click, completa automáticamente el monto pendiente (`outstanding_amount`) en el campo `amount` para agilizar pagos totales desde parciales.

**Archivos afectados:**

- app/payments/PaymentAmountField.tsx
- app/payments/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:04 -03 — Registrar pago: parcial con total y aceptación de monto real mayor

**Tipo:** ui
**Lote:** payments-partial-total-and-real-amount
**Descripción:** Se ajustó el flujo de `/payments` para registrar pagos sin bloquear montos mayores al saldo estimado cuando representan el monto real pagado. Se agregó check `Es pago parcial` con campo obligatorio de monto total y cálculo de restante proyectado. En backend de la acción server-side se ajusta `invoice_amount` antes de registrar el pago cuando corresponde (parcial declarado o monto real superior al saldo), manteniendo consistencia de estado y saldo.

**Archivos afectados:**

- app/payments/PaymentAmountField.tsx
- app/payments/page.tsx
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:07 -03 — Fix de ambigüedad en llamada RPC de actualización de payable

**Tipo:** ui
**Lote:** payments-rpc-overload-ambiguity-fix
**Descripción:** Se corrigió la llamada a `rpc_update_supplier_payable` para enviar siempre `p_invoice_reference` (incluyendo `null` cuando no hay valor), evitando que PostgREST elija de forma ambigua entre firmas sobrecargadas durante el flujo de pago parcial.

**Archivos afectados:**

- app/payments/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:09 -03 — Hardening DB: eliminación de overload legacy en `rpc_update_supplier_payable`

**Tipo:** schema
**Lote:** payments-drop-legacy-rpc-overload
**Descripción:** Se agregó migración para eliminar la firma antigua de `rpc_update_supplier_payable` (sin `p_invoice_reference`) que generaba resolución ambigua en PostgREST. Se mantuvo únicamente la firma canónica con `p_invoice_reference`.

**Archivos afectados:**

- supabase/migrations/20260218151000_043_drop_legacy_rpc_update_supplier_payable_overload.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/docs-modules-supplier-payments.md
- docs/docs-app-screens-payments.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-18)
- Verificación SQL `pg_proc` OK: solo existe `rpc_update_supplier_payable(uuid,uuid,numeric,date,text,text,text,payment_method)` (2026-02-18)
- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:13 -03 — Hardening de error handling en `registerPayment` (Server Action)

**Tipo:** ui
**Lote:** payments-server-action-unexpected-response-hardening
**Descripción:** Se encapsuló la lógica de `registerPayment` en manejo explícito de excepciones para convertir fallos inesperados en `redirect` con banner de error en `/payments` (en vez de runtime genérico “An unexpected response was received from the server”). Se preserva el comportamiento de redirects válidos de Next.

**Archivos afectados:**

- app/payments/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:28 -03 — `/orders/[orderId]`: pago efectivo parcial + formulario de factura/remito

**Tipo:** ui
**Lote:** orders-detail-partial-cash-and-invoice-entrypoint
**Descripción:** Se amplió el bloque de recepción/control en `/orders/[orderId]` para soportar pago en efectivo parcial (check parcial + total declarado + restante proyectado) y se incorporó un segundo entry point de factura/remito en la misma pantalla (número, monto, vencimiento, método, foto y nota) usando `rpc_update_supplier_payable`.

**Archivos afectados:**

- app/orders/ReceiveActionsRow.tsx
- app/orders/[orderId]/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:31 -03 — Ajuste de copy en campo de fecha de factura/remito

**Tipo:** ui
**Lote:** invoice-date-label-rename-entrypoints
**Descripción:** Se renombró el label del input de fecha (`due_on`) de “Vence el” a “Fecha indicada del remito/factura” en los dos entry points de carga de factura/remito (`/payments` y `/orders/[orderId]`).

**Archivos afectados:**

- app/payments/page.tsx
- app/orders/[orderId]/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-18 15:37 -03 — Preservar formulario de recepción/control y highlight de “Controlado por”

**Tipo:** ui
**Lote:** orders-detail-preserve-receive-form-on-missing-controller
**Descripción:** Se ajustó `/orders/[orderId]` para que, al faltar “Controlado por (nombre)”, no se pierdan los datos ya cargados en el formulario (fecha/hora, pago efectivo, parcial, montos) y se resalte en rojo el campo faltante con mensaje inline específico además del banner superior.

**Archivos afectados:**

- app/orders/[orderId]/page.tsx
- app/orders/ReceiveActionsRow.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-18)
- npm run build OK (2026-02-18)

**Commit:** N/A

## 2026-02-19 10:03 -03 — Dashboard operativo hoy/semana para compras y pagos

**Tipo:** ui
**Lote:** dashboard-ops-today-week-orders-payments
**Descripción:** Se agregó en `/dashboard` una sección operativa con selector de período (`today`/`week`) que informa: pedidos a realizar (según `order_day`), pedidos a recibir (según `expected_receive_on`) y pagos a realizar (según `due_on`) desglosados por método efectivo/transferencia. Se extendió el filtro cliente para conservar sucursal + período en URL.

**Archivos afectados:**

- app/dashboard/page.tsx
- app/dashboard/DashboardFiltersClient.tsx
- docs/docs-app-screens-admin-dashboard.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-19)
- npm run build OK (2026-02-19)

**Commit:** N/A

## 2026-02-19 10:06 -03 — Dashboard operativo: pagos vencidos visibles

**Tipo:** ui
**Lote:** dashboard-ops-include-overdue-payments
**Descripción:** Se extendió el bloque de pagos de la sección operativa del dashboard para incluir cuentas vencidas (`due_on < hoy`) no pagadas, mostrando cantidad y monto total, con desglose por método efectivo/transferencia.

**Archivos afectados:**

- app/dashboard/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-19)
- npm run build OK (2026-02-19)

**Commit:** N/A

## 2026-02-20 09:03 -03 — Cashbox: inputs numéricos permiten vacío temporal al editar

**Tipo:** ui
**Lote:** cashbox-number-input-allow-empty-editing
**Descripción:** Se corrigió `CashCountPairFields` usado en `/cashbox` (apertura/cierre) para que los inputs de cantidad por denominación no fuercen `0` en cada `onChange`. Ahora aceptan estado vacío temporal (`''`) para facilitar edición; los totales siguen calculando vacío como `0` y el backend sigue recibiendo cantidades válidas.

**Archivos afectados:**

- app/cashbox/CashCountPairFields.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)
- npm run db:reset OK (2026-02-20)
- npm run db:rls:smoke FAIL (2026-02-20, baseline preexistente: `staff puede leer products de su org`)
- Verificación RLS puntual `pos_payment_devices` OK (2026-02-20):
  - allow: `authenticated + staff@demo.com` -> `count=4`
  - deny: `authenticated + user fuera de org` -> `count=0`

**Commit:** N/A

## 2026-02-20 09:07 -03 — Auditoría global de inputs numéricos (forzado de `0`)

**Tipo:** decision
**Lote:** global-number-input-allow-empty-audit
**Descripción:** Se realizó barrido repo-wide de todos los `input[type=number]` para detectar campos controlados que repongan `0` al editar. Resultado: no se encontraron más casos con forzado de `0` en `onChange`; el único caso real estaba en `app/cashbox/CashCountPairFields.tsx` y quedó corregido en el lote previo.

**Archivos afectados:**

- docs/prompts.md
- docs/activity-log.md

**Tests:**

- N/A (sin cambios de runtime adicionales)

**Commit:** N/A

## 2026-02-20 09:26 -03 — Caja/POS: tarjeta unificada, mercadopago y trazabilidad por dispositivo

**Tipo:** ui
**Lote:** cashbox-pos-card-mercadopago-devices
**Descripción:** Se implementó la iteración operativa de cobros y cierre de caja: (1) nuevo esquema para dispositivos de cobro por sucursal (`pos_payment_devices`) y vínculo en `sale_payments.payment_device_id`; (2) POS con métodos visibles `cash`, `card` (débito/crédito unificado) y `mercadopago`, exigiendo dispositivo para `card/mercadopago` tanto en pago simple como dividido; (3) `rpc_register_supplier_payment` ahora registra automáticamente egreso `supplier_payment_cash` en `cash_session_movements` cuando el pago de proveedor es en efectivo y existe sesión de caja abierta; (4) `/cashbox` incorpora resumen de cobros no-efectivo (`card`, `mercadopago`) y muestra la categoría amigable del egreso automático.

**Archivos afectados:**

- supabase/migrations/20260220093000_044_pos_devices_card_mercadopago_cashbox_supplier_cash.sql
- app/pos/PosClient.tsx
- app/pos/page.tsx
- app/cashbox/page.tsx
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-cashbox.md
- docs/docs-modules-cashbox.md
- docs/docs-modules-supplier-payments.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 09:45 -03 — POS: método/dispositivo con botones visibles + QR/Posnet MP

**Tipo:** ui
**Lote:** pos-checkout-buttons-ux
**Descripción:** En `/pos` se reemplazaron los selects de método de pago y dispositivo por botones visibles para acelerar el cobro táctil. Se agregó selector visible de canal `QR`/`Posnet MP` cuando el método es `mercadopago`, tanto en pago simple como en pago dividido, filtrando dispositivos por canal seleccionado. Se mantuvo la validación existente de dispositivo obligatorio para `card` y `mercadopago`.

**Archivos afectados:**

- app/pos/PosClient.tsx
- docs/docs-app-screens-staff-pos.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 09:50 -03 — POS: QR habilitado sin selección manual + canal alias MP

**Tipo:** ui
**Lote:** pos-mercadopago-qr-alias-flow
**Descripción:** Se ajustó `/pos` para que MercadoPago no bloquee cobro en canal `QR`: ya no exige seleccionar dispositivo manualmente en UI para `QR` y se agregó el canal `Transferencia a alias MP`. `Posnet MP` sigue requiriendo dispositivo explícito. Para compatibilidad con validación backend actual, en QR/alias se resuelve automáticamente un dispositivo MercadoPago activo de la sucursal.

**Archivos afectados:**

- app/pos/PosClient.tsx
- docs/docs-app-screens-staff-pos.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 10:07 -03 — POS: Posnet MP auto con 1 dispositivo + gestión en Settings/Branches

**Tipo:** ui
**Lote:** pos-mp-posnet-devices-config
**Descripción:** Se ajustó `/pos` para que en canal `Posnet MP` no bloquee cuando hay un único dispositivo MercadoPago compatible: se resuelve automáticamente. Si hay 2 o más dispositivos compatibles, la UI exige selección explícita (ej. `Posnet MP 1`, `Posnet MP 2`). Además, se incorporó gestión de dispositivos de cobro por sucursal en `/settings/branches` (alta, edición de nombre/proveedor y activación), permitiendo configurar escenarios futuros sin tocar código.

**Archivos afectados:**

- app/pos/PosClient.tsx
- app/settings/branches/page.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-branches.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 10:14 -03 — Convención de nombres de dispositivos en Settings/POS

**Tipo:** docs
**Lote:** pos-device-naming-convention
**Descripción:** Se incorporó convención operativa de naming para dispositivos de cobro (ej. `MP QR`, `MP Posnet 1`, `MP Posnet 2`, `MP Alias`, `Posnet principal`) visible en `/settings/branches` y documentada en contratos de pantalla para evitar ambigüedad al operar y conciliar cobros.

**Archivos afectados:**

- app/settings/branches/page.tsx
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-branches.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)

**Commit:** N/A

## 2026-02-20 10:17 -03 — Sugerencias automáticas de nombres en dispositivos (validación suave)

**Tipo:** ui
**Lote:** pos-device-naming-soft-validation
**Descripción:** Se agregó validación suave en `/settings/branches` para `device_name` mediante sugerencias automáticas (`datalist`) con nombres estándar (`MP QR`, `MP Posnet 1`, `MP Posnet 2`, `MP Alias`, `Posnet principal`) en alta y edición, manteniendo guardado no bloqueante.

**Archivos afectados:**

- app/settings/branches/page.tsx
- docs/docs-app-screens-settings-branches.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-20)
- npm run build OK (2026-02-20)

**Commit:** N/A

## 2026-02-21 19:56 -03 — POS: descuento empleado + cuentas por sucursal

**Tipo:** schema/ui/docs
**Lote:** pos-employee-discount-branch-accounts
**Descripción:** Se implementó descuento de empleado en POS con cuenta operativa por sucursal, separado de `auth.users`. La configuración se extiende en `/settings/preferences` para definir porcentaje de descuento de empleado y política de combinación con descuento en efectivo. Se agregó gestión de cuentas de empleado por sucursal (alta/reactivación/inactivación), validación en DB vía `rpc_create_sale` y trazabilidad en ventas (`employee_name_snapshot`, desglose de descuentos cash/empleado) para auditoría en `/sales` y `/sales/[saleId]`.

**Archivos afectados:**

- supabase/migrations/20260221223000_052_employee_discount_accounts.sql
- app/pos/page.tsx
- app/pos/PosClient.tsx
- app/settings/preferences/page.tsx
- app/sales/page.tsx
- app/sales/[saleId]/page.tsx
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-settings-preferences.md
- docs/docs-app-screens-sales.md
- docs/docs-app-screens-sale-detail.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-21)
- npm run build OK (2026-02-21)
- npm run db:reset OK (2026-02-21)
- Verificación DB objetos OK: `employee_accounts`, `v_sales_admin`, `v_sale_detail_admin`, `rpc_create_sale`.
- Verificación RLS mínima (manual): ALLOW `staff` select en `employee_accounts` (scope org), DENY `staff` insert en `employee_accounts`.
- npm run db:rls:smoke FAIL (baseline preexistente): `staff puede leer products de su org`.

**Commit:** N/A

## 2026-02-22 10:48 -03 — Onboarding/Productos: formulario compartido y sugerencia por margen

**Tipo:** ui/docs
**Lote:** onboarding-products-shared-form
**Descripción:** Se unificaron los campos de producto en un componente compartido reutilizado por alta (`/products`), edición (`/products`) y resolución rápida en onboarding (`/onboarding?resolver=products_incomplete_info`). Se agregó explícitamente `Precio proveedor` en onboarding y se mantuvo la sugerencia de `Precio unitario` usando `default_markup_pct` del proveedor (fallback 40%).

**Archivos afectados:**

- app/products/ProductFormFieldsShared.tsx
- app/products/NewProductForm.tsx
- app/products/ProductActions.tsx
- app/products/ProductListClient.tsx
- app/products/page.tsx
- app/onboarding/page.tsx
- docs/docs-app-screens-products.md
- docs/docs-app-screens-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-22)
- npm run build OK (2026-02-22)

**Commit:** N/A

## 2026-02-22 11:04 -03 — Productos: campo marca en formulario compartido (nuevo/editar/onboarding)

**Tipo:** schema/ui/docs
**Lote:** products-brand-shared-field
**Descripción:** Se agregó `brand` en `products` y se expuso en `v_products_admin`. El bloque compartido de formulario ahora incluye campo `Marca`, reutilizado en alta de producto, edición inline y resolución rápida en onboarding. La persistencia se aplica en los tres entry points manteniendo la lógica existente de sugerencia de precio por margen.

**Archivos afectados:**

- supabase/migrations/20260222110000_055_products_brand.sql
- app/products/ProductFormFieldsShared.tsx
- app/products/NewProductForm.tsx
- app/products/ProductActions.tsx
- app/products/ProductListClient.tsx
- app/products/page.tsx
- app/onboarding/page.tsx
- docs/docs-app-screens-products.md
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-products-stock.md
- docs/docs-data-model.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-22)
- npm run lint OK (2026-02-22)
- npm run build OK (2026-02-22)

**Commit:** N/A

## 2026-02-22 11:13 -03 — Productos/Onboarding: autocompletado de marca por historial

**Tipo:** ui/docs
**Lote:** products-brand-autocomplete-shared
**Descripción:** El input `Marca` del formulario compartido ahora muestra sugerencias con marcas existentes (catálogo actual), permitiendo autocompletar al escribir. Se aplica automáticamente en alta de producto, edición y resolvedor rápido de onboarding para mantener consistencia entre entry points.

**Archivos afectados:**

- app/products/ProductFormFieldsShared.tsx
- app/products/NewProductForm.tsx
- app/products/ProductActions.tsx
- app/products/ProductListClient.tsx
- app/products/page.tsx
- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-22)
- npm run build OK (2026-02-22)

**Commit:** N/A

## 2026-02-22 11:31 -03 — Ventas: pantalla de estadísticas por período/sucursal

**Tipo:** schema/ui/docs
**Lote:** sales-statistics-screen
**Descripción:** Se agregó botón “Ver estadísticas” en `/sales` y nueva pantalla `/sales/statistics` con filtros por sucursal/período (presets + rango manual), resumen de KPIs y rankings operativos: productos top/bottom por unidades e ingresos, proveedores más relevantes/menor movimiento y tendencias con top días/semanas/meses. Se creó contrato de datos único `v_sales_statistics_items` para centralizar lectura analítica.

**Archivos afectados:**

- supabase/migrations/20260222123000_056_sales_statistics_view.sql
- app/sales/page.tsx
- app/sales/statistics/page.tsx
- docs/docs-app-screens-sales-statistics.md
- docs/docs-app-screens-sales.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-index.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-02-22)
- npm run lint OK (2026-02-22)
- npm run build OK (2026-02-22)

**Commit:** N/A

## 2026-02-22 11:38 -03 — Ventas: comparativo por día de semana + estabilización de TopBar

**Tipo:** ui/docs
**Lote:** sales-statistics-weekday-hydration-fix
**Descripción:** Se agregó bloque de análisis “Ventas por día de la semana” en `/sales/statistics` para comparar rendimiento entre lunes..domingo (incluye martes/miércoles/sábado como pediste). Además se simplificó `TopBar` para render determinista en SSR/CSR y reducir riesgo de hydration mismatch en navegación.

**Archivos afectados:**

- app/sales/statistics/page.tsx
- app/components/TopBar.tsx
- docs/docs-app-screens-sales-statistics.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-22)
- npm run build OK (2026-02-22)

**Commit:** N/A

## 2026-02-23 11:29 -03 — Products Lookup: búsqueda móvil rápida con precio + stock

**Tipo:** ui/docs
**Lote:** products-lookup-mobile-search
**Descripción:** `/products/lookup` deja de ser placeholder y pasa a flujo operativo para Staff/OA. Se implementó búsqueda mobile-first con debounce, filtro por nombre por tokens (orden independiente), selector de sucursal, visualización de precio y stock por resultado, y límite de 30 filas para evitar render masivo. También se agregó validación de acceso para Staff según módulo `products_lookup` habilitado.

**Archivos afectados:**

- app/products/lookup/page.tsx
- app/products/lookup/ProductsLookupClient.tsx
- docs/docs-app-screens-products-lookup.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 11:44 -03 — Onboarding: body limit de Server Actions + soporte XLSX

**Tipo:** ui/docs/infra
**Lote:** onboarding-import-xlsx-body-limit
**Descripción:** Se resolvió el error `Body exceeded 1 MB limit` elevando el límite de Server Actions a `10mb` en Next config. Además, `/onboarding` ahora acepta archivos `.csv` y `.xlsx` en el mismo flujo de importación. Para `.xlsx`, se agregó parsing server-side de la primera hoja (ZIP/XML), reutilizando el mismo pipeline de validación/aplicación por RPCs. También se actualizaron textos de UI y documentación del módulo/pantalla.

**Archivos afectados:**

- next.config.ts
- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 12:21 -03 — Onboarding: detección/mapeo de columnas + límite 20k filas

**Tipo:** ui/docs
**Lote:** onboarding-column-mapping-and-row-limit
**Descripción:** Se mejoró el flujo de importación en `/onboarding` para detectar columnas del archivo y permitir mapeo manual campo a campo (archivo -> modelo NODUX) antes de validar/importar. Se agregó acción `Detectar columnas`, autopropuesta de mapeo por aliases y aplicación de `normalized_payload` por fila en RPC. Además, el límite operativo de filas por archivo sube de 5.000 a 20.000 para evitar rechazos tempranos por `too_many_rows` en cargas grandes.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 12:32 -03 — Onboarding: consolidación de duplicados por claves de negocio

**Tipo:** ui/docs
**Lote:** onboarding-master-dedup-consolidation
**Descripción:** Se agregó deduplicación y consolidación de filas antes de persistir `data_import_rows`, para construir maestro limpio desde archivos con transacciones repetidas y formatos heterogéneos. Reglas: `products` por `barcode > internal_code > nombre`, `suppliers` por nombre de proveedor normalizado, y `products_suppliers` por combinación producto+proveedor+relación. La UI de resumen ahora reporta filas consolidadas por duplicado.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/docs-modules-data-onboarding.md
- docs/docs-app-screens-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 13:31 -03 — Onboarding: conflicto de precio resuelto por última fecha

**Tipo:** ui/docs
**Lote:** onboarding-price-latest-by-date
**Descripción:** Se ajustó la consolidación de duplicados para `products` y `products_suppliers`: cuando existen múltiples filas del mismo artículo con `unit_price` distinto, se conserva el precio de la fila con fecha más reciente. Se agregó campo de mapeo opcional `source_date` y parsing flexible de fechas para aplicar la regla de “última venta”.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/docs-modules-data-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 13:34 -03 — Onboarding: límite de importación ampliado a 70.000 filas

**Tipo:** ui/docs
**Lote:** onboarding-row-limit-70k
**Descripción:** Se actualizó el límite máximo de filas por archivo en onboarding de 20.000 a 70.000 para permitir cargas más extensas sin bloquear por `too_many_rows`. Se alinearon mensajes de UI y documentación viva del módulo/contexto.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/docs-modules-data-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 13:58 -03 — Onboarding: precio unitario derivado desde cantidad/subtotal

**Tipo:** ui/docs
**Lote:** onboarding-unit-price-from-subtotal-qty
**Descripción:** Se agregó lógica de preprocesamiento para imports `products` y `products_suppliers`: si no existe `unit_price` explícito y el archivo trae `cantidad` + `subtotal`, se calcula `unit_price = subtotal / cantidad` antes de validar/aplicar. Se incorporaron campos de mapeo `source_quantity` y `source_subtotal` con aliases comunes para archivos de ventas.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/docs-modules-data-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 14:05 -03 — Onboarding: límite de importación ampliado a 80.000 filas

**Tipo:** ui/docs
**Lote:** onboarding-row-limit-80k
**Descripción:** Se actualizó el límite máximo de filas por archivo en onboarding de 70.000 a 80.000 para permitir cargas aún más extensas sin bloquear por `too_many_rows`. Se alinearon validación y documentación viva.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/docs-modules-data-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 14:10 -03 — Onboarding: importación separada por plantilla (productos/proveedores)

**Tipo:** ui/docs
**Lote:** onboarding-separate-product-supplier-templates
**Descripción:** Se eliminó del flujo de onboarding la plantilla combinada `products_suppliers`. El selector y la validación de `template_key` ahora aceptan solo `products` o `suppliers`, para mantener contratos de datos separados por entidad y evitar mezcla de campos.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 14:17 -03 — Onboarding: columnas de productos alineadas a formulario y fecha `hora` soportada

**Tipo:** ui/docs
**Lote:** onboarding-product-contract-reuse-and-hour-date-parsing
**Descripción:** Se alineó el contrato de columnas de importación `products` con el formulario compartido de producto (labels y campos maestros). Se agregó módulo compartido `app/products/product-form-contract.ts` para reutilizar etiquetas y reducir drift. Además se extendió el parser de fechas para aceptar formatos sin año como `09/08 21:01` (columna `hora`) y usarlo en la regla de precio más reciente.

**Archivos afectados:**

- app/products/product-form-contract.ts
- app/products/ProductFormFieldsShared.tsx
- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 14:27 -03 — Onboarding: staging de archivo entre detección e importación

**Tipo:** ui/docs
**Lote:** onboarding-staged-file-after-column-detection
**Descripción:** Se implementó staging del archivo en backend al ejecutar `Detectar columnas`. La acción `Validar e importar` ahora puede reutilizar ese mismo archivo (job de staging) sin requerir nueva carga en el input de archivo. Se agregó hidden `staged_job_id`, mensaje visual de archivo listo y manejo de error si el staging no existe.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-23 14:36 -03 — Onboarding: feedback visual de procesamiento en formulario

**Tipo:** ui/docs
**Lote:** onboarding-import-pending-feedback
**Descripción:** Se agregó estado visual `pending` en el formulario de importación de onboarding con spinner y mensaje “Procesando documento...”, visible durante ejecución de acciones del form para evitar sensación de espera sin respuesta.

**Archivos afectados:**

- app/onboarding/OnboardingFormPendingState.tsx
- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-23)
- npm run build OK (2026-02-23)

**Commit:** N/A

## 2026-02-24 19:35 -03 — Onboarding: estado pending contextual por acción

**Tipo:** ui/docs
**Lote:** onboarding-pending-message-by-intent
**Descripción:** Se diferenciaron mensajes de espera en el formulario de onboarding según acción enviada (`intent`). Ahora el pending muestra “Detectando columnas del documento...” o “Validando e importando documento...” según el botón presionado.

**Archivos afectados:**

- app/onboarding/OnboardingFormPendingState.tsx
- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-24)
- npm run build OK (2026-02-24)

**Commit:** N/A

## 2026-02-25 12:43 -03 — Onboarding: matching estricto por barcode/internal_code

**Tipo:** schema/ui/docs
**Lote:** onboarding-strict-product-code-match
**Descripción:** Se ajustó la importación de onboarding para que el matching de productos existentes sea estricto por `barcode` y `internal_code` (sin fallback por nombre). Se reemplazó `rpc_apply_data_import_job` en nueva migración y se alineó la deduplicación previa del archivo para no consolidar productos por nombre cuando faltan códigos.

**Archivos afectados:**

- supabase/migrations/20260225132000_059_onboarding_strict_product_match.sql
- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-02-25)
- `select count(*) from public.v_data_onboarding_tasks` OK (2026-02-25)
- RLS mínima `data_import_jobs` verificada por SQL:
  - allow: admin ve 1 fila (`count=1`) con claims `authenticated`
  - deny: staff ve 0 filas (`count=0`) con claims `authenticated`
- `npm run db:rls:smoke` FAIL (caso preexistente no relacionado: `staff puede leer products de su org`)
- `npm run lint` OK (2026-02-25)
- `npm run build` OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 13:22 -03 — Onboarding: edición masiva de productos (selección + filtro)

**Tipo:** ui/docs
**Lote:** onboarding-bulk-products-patch
**Descripción:** Se incorporó en `/onboarding` una sección de edición masiva de productos con búsqueda y paginación server-side para escalar a miles de registros. El flujo permite selección múltiple de filas visibles o aplicar sobre todos los resultados filtrados, y patch masivo de marca, proveedor primario/secundario, shelf life, precio proveedor primario y precio unitario.

**Archivos afectados:**

- app/onboarding/page.tsx
- app/onboarding/BulkProductSelectionActions.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 13:54 -03 — Onboarding: ajuste de layout en edición masiva

**Tipo:** ui/docs
**Lote:** onboarding-bulk-products-layout-flow
**Descripción:** Se reordenó el flujo visual de edición masiva en `/onboarding`: ahora la lista de productos aparece inmediatamente debajo del buscador y el formulario de acciones quedó al final (incluyendo los botones `Aplicar a seleccionados` y `Aplicar a filtrados`).

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 13:57 -03 — Onboarding: alinear controles de acciones masivas

**Tipo:** ui/docs
**Lote:** onboarding-bulk-products-form-alignment
**Descripción:** Se rediseñó el formulario de acciones de edición masiva para mostrar cada acción en una fila clara `checkbox + etiqueta + input`, evitando ambigüedad visual entre checks e inputs.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 14:12 -03 — Productos/Onboarding: opción “No aplica vencimiento”

**Tipo:** ui/docs
**Lote:** onboarding-products-no-expiration-applicable
**Descripción:** Se agregó control explícito `No aplica vencimiento` en el formulario compartido de productos (alta, edición y resolvedor rápido), que guarda `shelf_life_days = 0`. En edición masiva de onboarding se agregó opción equivalente para aplicar `0` en lote. Se refuerza regla operativa: `0` o vacío no generan lotes automáticos de vencimiento al recibir pedidos.

**Archivos afectados:**

- app/products/ProductFormFieldsShared.tsx
- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md
- docs/context-summary.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 14:12 -03 — Onboarding bulk: modal rápido de alta de proveedor

**Tipo:** ui/docs
**Lote:** onboarding-bulk-create-supplier-modal
**Descripción:** En edición masiva de onboarding se agregó botón `Crear proveedor` junto al selector de proveedor primario. Abre modal rápido con formulario completo de proveedor (nombre obligatorio) y desplegable opcional para cargar cuenta de transferencia. Al guardar, crea proveedor y (si aplica) cuenta bancaria, refresca onboarding/suppliers/payments y mantiene contexto de filtro/paginación.

**Archivos afectados:**

- app/onboarding/BulkCreateSupplierModal.tsx
- app/onboarding/page.tsx
- docs/docs-app-screens-onboarding.md
- docs/docs-modules-data-onboarding.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 14:27 -03 — Hotfix UI: evitar form anidado en modal Crear proveedor

**Tipo:** ui/docs
**Lote:** onboarding-bulk-create-supplier-nested-form-fix
**Descripción:** Se corrigió error de hidratación en `/onboarding` al abrir el modal `Crear proveedor` dentro de edición masiva. El modal ahora se renderiza vía portal (`document.body`) para evitar `<form>` dentro de `<form>`.

**Archivos afectados:**

- app/onboarding/BulkCreateSupplierModal.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 14:30 -03 — Onboarding bulk: botón Crear proveedor en fila de secundario

**Tipo:** ui/docs
**Lote:** onboarding-bulk-create-supplier-secondary-cta
**Descripción:** Se duplicó el CTA `Crear proveedor` (modal rápido) también en la fila `Aplicar proveedor secundario` dentro de edición masiva de onboarding.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 14:35 -03 — Onboarding bulk: persistencia de selección al crear proveedor

**Tipo:** ui/docs
**Lote:** onboarding-bulk-preserve-selection-on-create-supplier
**Descripción:** Se preserva el estado de trabajo en edición masiva al crear proveedor desde modal rápido: selección de `product_ids` y valores/checks del formulario de acciones masivas. El modal captura snapshot del formulario (`bulk_state`) y lo reinyecta en el redirect; la pantalla restaura checkboxes e inputs al recargar.

**Archivos afectados:**

- app/onboarding/BulkCreateSupplierModal.tsx
- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 14:42 -03 — Onboarding bulk: sugerencia de precio unitario por markup de proveedor

**Tipo:** ui/docs
**Lote:** onboarding-bulk-pricing-suggestion-by-supplier-markup
**Descripción:** En edición masiva de `/onboarding` se agregó lógica de sugerencia de precio unitario basada en proveedor primario y precio proveedor, alineada con `/products`: usa `%` de ganancia del proveedor (`default_markup_pct`) o `40%` por defecto. El bloque de precios ahora muestra helper dinámico y acción `Usar sugerido`, manteniendo edición manual final del usuario.

**Archivos afectados:**

- app/onboarding/BulkPricingSuggestion.tsx
- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 15:01 -03 — Onboarding import: persistir unit_price calculado desde subtotal/cantidad

**Tipo:** ui/docs
**Lote:** onboarding-import-computed-unit-price-persistence
**Descripción:** Se corrigió un caso de importación en `/onboarding` donde el `unit_price` calculado (`subtotal / cantidad`) se perdía si no se mapeaba explícitamente la columna de precio. Ahora, para plantilla `products`, se inyecta `unit_price` calculado en `normalized_payload` como fallback antes de validar/aplicar. Además, se robusteció el parser numérico para tolerar separadores de miles/decimales y símbolos comunes.

**Archivos afectados:**

- app/onboarding/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run format:check OK (2026-02-25)
- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 16:39 -03 — Superadmin prod: hardening de Server Actions

**Tipo:** ui/docs
**Lote:** superadmin-prod-server-action-error-hardening
**Descripción:** Se reforzaron las Server Actions de `/superadmin` (`createOrg`, `setActiveOrg`, `createBranch`, `createOrgAdmin`) con `try/catch`, `console.error` etiquetado y redirects de fallback para evitar error cliente tipo `unexpected response` cuando falla una acción en producción. Esto permite diagnóstico real en Vercel logs y mantiene UX con `result` controlado.

**Archivos afectados:**

- app/superadmin/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 16:53 -03 — Proxy: bypass redirects en Server Actions

**Tipo:** ui/docs
**Lote:** superadmin-prod-server-action-error-hardening
**Descripción:** Se corrigió `proxy.ts` para no forzar redirects (`/login`, `/no-access`, `homePath`) en requests de Server Actions (`POST` con header `next-action`). Antes, esos `307` en `/superadmin` rompían el protocolo de respuesta de Next y el cliente mostraba `An unexpected response was received from the server`.

**Archivos afectados:**

- proxy.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 17:02 -03 — Superadmin: rethrow de NEXT_REDIRECT + trazas de contexto

**Tipo:** ui/docs
**Lote:** superadmin-prod-server-action-error-hardening
**Descripción:** Se corrigió `app/superadmin/page.tsx` para no tratar `NEXT_REDIRECT` como error inesperado dentro de Server Actions (se re-lanza), evitando enmascarar redirects válidos como `org_error`. Se agregó logging de contexto (`auth.getUser` nulo y usuario sin contexto superadmin) para diagnosticar en producción por qué una acción termina en `/no-access`.

**Archivos afectados:**

- app/superadmin/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 17:12 -03 — Login: redirección full-page post-auth

**Tipo:** ui/docs
**Lote:** superadmin-prod-server-action-error-hardening
**Descripción:** Se endureció el flujo de `/login`: tras `signInWithPassword`, ahora se espera `auth.getSession()` y se navega con `window.location.href='/'` para asegurar que la cookie/sesión quede persistida antes de entrar a rutas SSR/Server Actions.

**Archivos afectados:**

- app/login/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 17:22 -03 — Supabase browser client: cookie handling estándar

**Tipo:** ui/docs
**Lote:** superadmin-prod-server-action-error-hardening
**Descripción:** Se simplificó `lib/supabase/client.ts` para crear cliente browser con `createBrowserClient(url, anonKey)` sin adapter manual de cookies. El adapter custom podía desalinear persistencia de auth en producción y causar `auth.getUser` nulo en SSR/Server Actions.

**Archivos afectados:**

- lib/supabase/client.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 17:29 -03 — Superadmin: trazabilidad de contexto y redirects de sesión

**Tipo:** ui/docs
**Lote:** superadmin-prod-server-action-error-hardening
**Descripción:** `getSuperadminContext` ahora reporta estado explícito (`ok`, `no_user`, `no_superadmin`) con `source` por etapa y metadatos de cookies `sb-*` para diagnóstico. Cuando falta sesión, `/superadmin` y sus Server Actions redirigen a `/login?result=session_missing` (en lugar de caer silenciosamente a `no-access`).

**Archivos afectados:**

- app/superadmin/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 17:36 -03 — Logout hardening: solo POST para signOut

**Tipo:** ui/docs
**Lote:** superadmin-prod-server-action-error-hardening
**Descripción:** Se corrigió causa raíz de pérdida de sesión en producción: `TopBar` tenía `Link` a `/logout` y el `GET /logout` ejecutaba `signOut`, por lo que navegación/prefetch podía cerrar sesión de forma involuntaria. Ahora el logout se ejecuta vía `form method=post` y `app/logout/route.ts` solo hace `signOut` en `POST`; `GET /logout` solo redirige a `/login`.

**Archivos afectados:**

- app/components/TopBar.tsx
- app/logout/route.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 17:47 -03 — Settings Users: vista tabla/tarjetas + layout compacto

**Tipo:** ui/docs
**Lote:** settings-users-table-cards-layout
**Descripción:** Se rediseñó `/settings/users` para corregir expansión de la última columna en modo tabla y se incorporó toggle de visualización `Tabla | Tarjetas`. En tabla se agregaron headers y filas compactas con editor desplegable separado; en tarjetas se mantiene lectura vertical mobile-first con el mismo editor.

**Archivos afectados:**

- app/settings/users/page.tsx
- docs/docs-app-screens-settings-users.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 18:31 -03 — Settings Users: diferenciar visualmente Tabla vs Tarjetas

**Tipo:** ui/docs
**Lote:** settings-users-table-cards-layout
**Descripción:** Se ajustó `/settings/users` para que la diferencia entre vistas sea explícita: indicador de vista activa, resumen compacto en modo tabla y tarjeta visual con badge de rol/sucursales en modo tarjetas.

**Archivos afectados:**

- app/settings/users/page.tsx
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 18:38 -03 — Settings Users: fix toggle Tabla/Tarjetas (searchParams)

**Tipo:** ui/docs
**Lote:** settings-users-table-cards-layout
**Descripción:** Se corrigió lectura de `searchParams` en `/settings/users` para Next 16 (`Promise<SearchParams>` + `await`). Esto habilita correctamente `?view=table|cards` y activa el toggle visual.

**Archivos afectados:**

- app/settings/users/page.tsx
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 18:45 -03 — Proxy: detener loop de /no-access con usuarios sin org

**Tipo:** ui/docs
**Lote:** auth-no-access-redirect-loop-fix
**Descripción:** Se ajustó `proxy.ts` para permitir `pathname === '/no-access'` cuando el usuario está autenticado pero sin membresía (`org_id/role` nulos), evitando redirección circular a sí misma.

**Archivos afectados:**

- proxy.ts
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 18:53 -03 — Alta de usuarios: chequeo estricto de RPCs de membresía

**Tipo:** ui/docs
**Lote:** auth-user-membership-assignment-hardening
**Descripción:** Se reforzó `/settings/users` para ejecutar RPCs de membresía con `service_role` y validar `error` explícitamente antes de marcar éxito. Se agregaron resultados UI para fallos de asignación (`membership_failed`, `membership_update_failed`). Además, se endureció `/superadmin` (crear admin para org existente) con chequeo explícito de errores de invitación/membresía para evitar cuentas en Auth sin org.

**Archivos afectados:**

- app/settings/users/page.tsx
- app/superadmin/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-25 19:08 -03 — Settings Users: Org Admin con acceso global visible

**Tipo:** ui/docs
**Lote:** settings-users-org-admin-branches-label
**Descripción:** Se ajustó la presentación de sucursales en tabla y tarjetas de `/settings/users`: para rol `org_admin` ahora se muestra “Todas las sucursales (acceso global)”. Se mantiene “Sin sucursales” para staff sin asignación.

**Archivos afectados:**

- app/settings/users/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-02-25)
- npm run build OK (2026-02-25)

**Commit:** N/A

## 2026-02-26 14:39 -03 — Fix deploy prod Vercel por TypeScript scope

**Tipo:** infra/ui/docs
**Lote:** vercel-prod-build-fix-exclude-video-workspace
**Descripción:** Se ejecutó `npx vercel --prod` con permisos escalados. El primer intento falló por `npm run build` (TypeScript intentaba compilar `apps/video/skills/...` y faltaban dependencias de Remotion en el app principal). Se corrigió `tsconfig.json` excluyendo `apps/**` del alcance de TypeScript para Next. Se validó con `npm run build` local y se relanzó deploy productivo exitoso con alias activo en `nodux.app`.

**Archivos afectados:**

- tsconfig.json
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run build OK (2026-02-26)
- npx vercel --prod FAIL inicial (2026-02-26)
- npx vercel --prod OK (2026-02-26)

**Commit:** N/A

## 2026-03-01 11:20 -03 — Orders: recepción con costo real + IVA/descuento y sync de costo proveedor

**Tipo:** ui/docs
**Lote:** orders-receive-real-cost-iva-discount
**Descripción:** Se extendió `/orders/[orderId]` para confirmar costo proveedor unitario por ítem durante recepción/control, calcular total de remito (subtotal sin IVA + IVA opcional + descuento opcional) y sincronizar el costo vigente en `supplier_products.supplier_price` para próximos pedidos. También se actualizó el armado de pedido (`/orders` y `/orders/[orderId]` en draft) con toggle para alternar entre costo proveedor registrado y estimado por `% ganancia`, manteniendo edición manual por item sin sobrescribir el maestro hasta recepción.

**Archivos afectados:**

- app/orders/[orderId]/page.tsx
- app/orders/OrderSuggestionsClient.tsx
- app/orders/ReceiveItemsPricingClient.tsx
- app/orders/page.tsx
- docs/docs-app-screens-order-detail.md
- docs/docs-modules-supplier-orders.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint FAIL global (2026-03-01) por errores preexistentes fuera de scope en `apps/video/build/*` y `apps/postcss.config.mjs`.
- npm run lint -- app/orders/OrderSuggestionsClient.tsx app/orders/[orderId]/page.tsx app/orders/page.tsx app/orders/ReceiveItemsPricingClient.tsx OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 12:10 -03 — Orders recepción: precio venta en confirmación + margen default org

**Tipo:** schema/ui/docs
**Lote:** orders-receive-sale-price-and-org-default-markup
**Descripción:** Se ajustó la grilla de recepción para mostrar `Ordenado` al inicio y agregar input de `Precio venta (unitario)` por ítem con sugerido por margen. Al confirmar recepción, ahora también se actualiza `products.unit_price` (catálogo/POS) además del costo proveedor. Se agregó configuración org-wide de margen default en `/settings/preferences` y en DB (`org_preferences.default_supplier_markup_pct`) para fallback de sugeridos.

**Archivos afectados:**

- app/orders/ReceiveItemsPricingClient.tsx
- app/orders/[orderId]/page.tsx
- app/settings/preferences/page.tsx
- supabase/migrations/20260301123000_062_org_preferences_default_supplier_markup_pct.sql
- docs/docs-data-model.md
- docs/docs-app-screens-order-detail.md
- docs/docs-app-screens-settings-preferences.md
- docs/docs-modules-supplier-orders.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-03-01)
- Verificación SQL objeto nuevo OK: `org_preferences.default_supplier_markup_pct` existe (2026-03-01)
- Verificación SQL view principal OK: `select ... from v_order_detail_admin` ejecuta sin error (2026-03-01)
- npm run db:rls:smoke FAIL (2026-03-01) por caso preexistente ajeno al cambio: `staff puede leer products de su org`.
- npm run lint -- app/orders/ReceiveItemsPricingClient.tsx app/orders/[orderId]/page.tsx app/settings/preferences/page.tsx app/orders/OrderSuggestionsClient.tsx app/orders/page.tsx OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 12:46 -03 — Sales Statistics: separación ventas vs proveedores/pagos

**Tipo:** ui/docs
**Lote:** sales-statistics-separate-sales-vs-suppliers-payments
**Descripción:** Se reorganizó `/sales/statistics` para separar la información en dos secciones desplegables independientes: `Ventas de artículos` y `Proveedores y pagos`. En la sección de proveedores se incorporaron KPIs y rankings basados en `v_supplier_payables_admin` (pagado, pendiente, vencidas, proveedores más importantes, más frecuentes y menos solicitados), manteniendo además la relevancia por ventas. Se actualizó el contrato de pantalla y contexto vivo.

**Archivos afectados:**

- app/sales/statistics/page.tsx
- docs/docs-app-screens-sales-statistics.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint FAIL (2026-03-01) por errores preexistentes fuera de alcance en `apps/video/build/*` y `apps/postcss.config.mjs`.
- npx eslint app/sales/statistics/page.tsx OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 13:04 -03 — Sales Statistics: bloque “Mostrando” y lock de sucursal única

**Tipo:** ui/docs
**Lote:** sales-statistics-active-config-and-single-branch-lock
**Descripción:** Se agregó en `/sales/statistics` un bloque de contexto `Mostrando` debajo de filtros para indicar configuración activa (sucursal, rango y modo aplicado). Además, si el usuario tiene una única sucursal asignada en `branch_memberships`, la pantalla fuerza ese `branch_id` en servidor, lo deja preseleccionado y bloqueado en UI, y preserva ese scope en presets/limpiar.

**Archivos afectados:**

- app/sales/statistics/page.tsx
- docs/docs-app-screens-sales-statistics.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npx eslint app/sales/statistics/page.tsx OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 13:09 -03 — Dashboard/Products: quitar texto de contrato en encabezados

**Tipo:** ui/docs
**Lote:** ui-remove-contract-labels-dashboard-products
**Descripción:** Se removió el texto técnico de contrato en los subtítulos de `/dashboard` y `/products` para reducir ruido visual en UI operativa.

**Archivos afectados:**

- app/dashboard/page.tsx
- app/products/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint FAIL (2026-03-01) por errores preexistentes fuera de alcance en `apps/video/build/*` y `apps/postcss.config.mjs`.
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 13:20 -03 — Lint global: fix de scope en ESLint

**Tipo:** infra/docs
**Lote:** lint-global-ignore-generated-workspaces
**Descripción:** Se corrigió el scope de `npm run lint` en `eslint.config.mjs` agregando ignores explícitos para `apps/**` y bundles generados (`**/*.bundle.js`, `**/bundle.js`). Con esto se evita analizar artefactos del workspace de video y se elimina ruido de reglas/plugins no presentes en este app.

**Archivos afectados:**

- eslint.config.mjs
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 21:03 -03 — Post-MVP: base documental de tienda online conectada a stock

**Tipo:** docs/decision
**Lote:** postmvp-online-store-foundation-docs
**Descripción:** Se aterrizó formalmente la iniciativa de tienda online conectada a NODUX como alcance Post-MVP: rutas públicas por slug de organización/sucursal, consola interna de pedidos online, tracking público por token, estados operativos de pedido y lineamientos para WhatsApp/pagos con comprobante. Se definieron contratos de módulo y pantallas para ejecución por fases sin contaminar el scope MVP actual.

**Archivos afectados:**

- docs/docs-scope-post-mvp.md
- docs/docs-roadmap.md
- docs/docs-app-sitemap.md
- docs/docs-modules-online-store.md
- docs/docs-app-screens-online-storefront-public.md
- docs/docs-app-screens-online-orders.md
- docs/docs-app-screens-online-order-tracking.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- No aplica (lote docs-only).

**Commit:** N/A

## 2026-03-01 21:21 -03 — Post-MVP: fundación DB de tienda online (slugs, pedidos online, tracking)

**Tipo:** schema/docs/tests/decision
**Lote:** postmvp-online-store-db-foundation
**Descripción:** Se implementó la fundación de datos para canal online conectado a stock NODUX: slugs públicos por organización/sucursal, configuración de storefront, dominios personalizados, tablas de pedidos online con historial/tokens/comprobantes, vista de gestión `v_online_orders_admin` y RPCs públicas para storefront/checkout/tracking junto con RPC autenticada para transición de estado. También se incorporó `products.image_url` para soportar foto representativa en catálogo online. Se agregó hardening de slugs con triggers (`trg_orgs_set_storefront_slug`, `trg_branches_set_storefront_slug`) para que seeds/altas nuevas no queden sin slug.

**Archivos afectados:**

- supabase/migrations/20260301213000_068_online_store_foundation.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/docs-modules-online-store.md
- docs/docs-app-screens-online-storefront-public.md
- docs/docs-app-screens-online-orders.md
- docs/docs-app-screens-online-order-tracking.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run db:reset` OK (2026-03-01, re-ejecutado tras hardening de slugs)
- Verificación objetos DB OK: `storefront_settings`, `online_orders`, `v_online_orders_admin` existen
- Select básico view principal OK: `select count(*) from public.v_online_orders_admin`
- Verificación RPC pública OK: `rpc_get_public_storefront_branches(...)` devuelve 2 sucursales activas (Demo Org)
- Verificación RLS mínima manual OK:
  - ALLOW `authenticated` miembro org sobre `online_orders` (`allow_count=1`)
  - DENY `authenticated` sin membresía sobre `online_orders` (`deny_count=0`)
- `npm run lint` OK (2026-03-01)
- `npm run build` OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 21:30 -03 — Post-MVP: UI pública v1 de storefront + checkout + tracking

**Tipo:** ui/docs/tests
**Lote:** postmvp-online-store-public-ui-v1
**Descripción:** Se implementó la primera iteración de UI pública del canal online sobre la base DB ya creada: selector de sucursal por slug de organización (`/:orgSlug`), catálogo con carrito y checkout (`/:orgSlug/:branchSlug`) y pantalla de tracking por token (`/o/:trackingToken`). Se agregó endpoint `POST /api/storefront/order` que invoca `rpc_create_online_order` y se ajustó `proxy.ts` para permitir acceso público a rutas/storefront API sin sesión.

**Archivos afectados:**

- app/[orgSlug]/page.tsx
- app/[orgSlug]/[branchSlug]/page.tsx
- app/[orgSlug]/[branchSlug]/StorefrontBranchClient.tsx
- app/o/[trackingToken]/page.tsx
- app/api/storefront/order/route.ts
- proxy.ts
- docs/docs-modules-online-store.md
- docs/docs-app-screens-online-storefront-public.md
- docs/docs-app-screens-online-order-tracking.md
- docs/docs-app-sitemap.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-03-01) con warning conocido: `@next/next/no-img-element` en storefront de catálogo.
- `npm run build` OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 21:36 -03 — Post-MVP: UI interna v1 `/online-orders` + wiring de permisos Staff

**Tipo:** ui/docs/tests
**Lote:** postmvp-online-orders-internal-ui-v1
**Descripción:** Se implementó la pantalla interna `/online-orders` para OA/ST (si módulo habilitado), con filtros por sucursal/estado/búsqueda, tarjetas de pedidos y transición de estados válidos mediante `rpc_set_online_order_status`. Además se extendió el wiring de navegación/permisos Staff para soportar `module_key=online_orders` (redirect home, guards en `proxy`, menú topbar y settings de permisos).

**Archivos afectados:**

- app/online-orders/page.tsx
- app/page.tsx
- app/pos/page.tsx
- app/cashbox/page.tsx
- app/products/lookup/page.tsx
- app/clients/page.tsx
- app/expirations/page.tsx
- app/components/TopBar.tsx
- app/settings/staff-permissions/page.tsx
- app/[orgSlug]/[branchSlug]/StorefrontBranchClient.tsx
- proxy.ts
- docs/docs-modules-online-store.md
- docs/docs-app-screens-online-orders.md
- docs/docs-app-screens-index.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-settings-staff-permissions.md
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- `npm run lint` OK (2026-03-01)
- `npm run build` OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 13:43 -03 — POS tickets: plantillas por sucursal

**Tipo:** schema/ui/docs
**Lote:** pos-branch-ticket-templates-foundation
**Descripción:** Se implementó configuración de impresión por sucursal para tickets en POS y ticket de venta admin. Se agregaron campos en `branches` (`ticket_header_text`, `ticket_footer_text`, `fiscal_ticket_note_text`), se extendió `v_branches_admin`, se actualizó `/settings/branches` para editar esos textos, y se integró la plantilla en la impresión de `/pos` (pre y post cobro) y `/sales/[saleId]/ticket`.

**Archivos afectados:**

- supabase/migrations/20260301143000_063_branch_ticket_templates.sql
- app/settings/branches/page.tsx
- app/pos/page.tsx
- app/pos/PosClient.tsx
- app/sales/[saleId]/ticket/page.tsx
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-app-screens-settings-branches.md
- docs/docs-app-screens-staff-pos.md
- docs/docs-app-screens-sale-ticket.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)
- npm run db:reset OK (2026-03-01)
- Verificación DB objetos creados OK (columnas en `branches` + `select` de `v_branches_admin` vía `psql`)
- npm run db:rls:smoke FAIL inicial (sin datos demo tras reset)
- npm run db:seed:demo OK (2026-03-01)
- npm run db:rls:smoke OK (permitido/denegado verificado)

**Commit:** N/A

## 2026-03-01 14:12 -03 — Settings: pantalla dedicada de Tickets e impresión

**Tipo:** ui/docs
**Lote:** settings-tickets-dedicated-screen-and-guidelines
**Descripción:** Se reorganizó Settings para separar la configuración de impresión del resto: se crea `/settings/tickets` como pantalla dedicada por sucursal para editar `ticket_header_text`, `ticket_footer_text` y `fiscal_ticket_note_text`, diferenciando explícitamente ticket no fiscal vs comprobante fiscal de prueba e incorporando guía de formato 80mm. `/settings/branches` deja de editar esos textos y queda enfocada en sucursales/dispositivos.

**Archivos afectados:**

- app/settings/page.tsx
- app/settings/tickets/page.tsx
- app/settings/branches/page.tsx
- docs/docs-app-screens-settings-tickets.md
- docs/docs-app-screens-settings-branches.md
- docs/docs-app-screens-index.md
- docs/docs-app-sitemap.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 14:49 -03 — Fix `/settings/tickets`: branch selection estable

**Tipo:** ui/docs
**Lote:** settings-tickets-branch-selection-fix
**Descripción:** Se corrigió lectura de `searchParams` en `/settings/tickets` para Next.js 16 (`searchParams` async). Antes la pantalla caía siempre en la primera sucursal (Caballito), provocando confusión y sobrescritura aparente al guardar. Ahora `Ver` y `Guardar` operan sobre la sucursal seleccionada y el estado permanece consistente.

**Archivos afectados:**

- app/settings/tickets/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 14:57 -03 — `/settings/tickets`: contador por línea en editores

**Tipo:** ui/docs
**Lote:** settings-tickets-line-character-counter
**Descripción:** Se agregaron contadores de caracteres por línea dentro de cada editor de plantilla en `/settings/tickets` (encabezado, pie y leyenda fiscal de prueba). El contador muestra total de líneas, longitud máxima y chips `Lx: n` con alerta visual cuando supera recomendación de 32 chars por línea para 80mm.

**Archivos afectados:**

- app/settings/tickets/TicketTemplateEditors.tsx
- app/settings/tickets/page.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 14:59 -03 — POS: impresión con fallback sin pop-up

**Tipo:** ui/docs
**Lote:** pos-ticket-print-popup-fallback
**Descripción:** Se actualizó `openTicketPrintWindow` en POS para mantener flujo actual con `window.open` y, si el navegador lo bloquea, usar fallback de impresión mediante `iframe` oculto. Con esto el botón `Imprimir ticket` no depende estrictamente de permisos de pop-up.

**Archivos afectados:**

- app/pos/PosClient.tsx
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)

**Commit:** N/A

## 2026-03-01 15:20 -03 — Fix `/settings/users`: Auth creado pero falla membresía org/sucursales

**Tipo:** schema/ui/docs/tests
**Lote:** settings-users-membership-failure-auth-created
**Descripción:** Se corrigió el flujo de alta/edición de usuarios cuando `auth.admin.createUser` creaba la cuenta pero fallaba la asignación en org/sucursales. Se endurecieron `rpc_invite_user_to_org` y `rpc_update_user_membership` como `security definer` con validación explícita (`is_org_admin_or_superadmin`, rol permitido y branches válidas para staff), y se actualizó app para ejecutar esas RPCs con sesión autenticada (`auth.supabase`) en `/settings/users` y `/superadmin`. Con esto, la auditoría conserva `actor_user_id` real y se evita el rollback por contexto sin usuario.

**Archivos afectados:**

- supabase/migrations/20260301162000_064_users_membership_rpcs_auth_context.sql
- app/settings/users/page.tsx
- app/superadmin/page.tsx
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/docs-app-screens-settings-users.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)
- npm run db:reset OK (2026-03-01)
- Verificación objetos DB OK (`rpc_invite_user_to_org` y `rpc_update_user_membership` con `prosecdef=true`)
- Select básico OK (`select count(*) from public.v_settings_users_admin`)
- npm run db:rls:smoke FAIL inicial (faltaba data demo tras reset)
- npm run db:seed:demo OK (2026-03-01)
- npm run db:rls:smoke OK (allow/deny verificado)

**Commit:** N/A

## 2026-03-01 15:38 -03 — Hotfix prod: `rpc_invite_user_to_org` error SQL 42702

**Tipo:** schema/tests/decision
**Lote:** users-membership-prod-diagnosis-hotfix
**Descripción:** Se diagnosticó en producción el fallo de alta en `/settings/users`: `auth.admin.createUser` creaba el usuario, pero `rpc_invite_user_to_org` fallaba con `42702 column reference "user_id" is ambiguous`, dejando usuarios huérfanos en Auth sin `org_users`. Se aplicaron hotfixes de DB para eliminar conflicto de nombres (OUT param y referencias SQL), y se verificó contra producción con prueba sintética `createUser + rpc_invite_user_to_org + rpc_update_user_membership` en estado OK.

**Archivos afectados:**

- supabase/migrations/20260301170000_065_fix_rpc_invite_user_to_org_ambiguous_user_id.sql
- supabase/migrations/20260301171500_066_fix_rpc_invite_user_to_org_out_param_conflict.sql
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run db:reset OK (2026-03-01)
- npm run db:seed:demo OK (2026-03-01)
- npm run db:rls:smoke OK (2026-03-01)
- Producción: `npx supabase db push --linked --yes` OK (migraciones 065 y 066)
- Producción: prueba sintética de alta y membresía OK (`invite_error=null`, `update_error=null`)

**Commit:** N/A

## 2026-03-01 15:55 -03 — Prod hotfix final: alta usuarios sin huérfanos + recuperación por email existente

**Tipo:** ui/infra/schema/tests
**Lote:** users-membership-prod-diagnosis-hotfix
**Descripción:** Se implementó hardening en `createUser` de `/settings/users` y `/superadmin` para evitar huérfanos: cuando `auth.admin.createUser` fue exitoso pero falla cualquier RPC de membresía, se ejecuta rollback compensatorio eliminando la cuenta recién creada en Auth. Además, si el email ya existe (incluye huérfanos previos), el flujo ahora reutiliza el usuario existente e intenta asignación a org en lugar de abortar por `email_exists`. Se aplicaron migraciones 065/066 a prod y se redeployó `nodux.app`.

**Archivos afectados:**

- app/settings/users/page.tsx
- app/superadmin/page.tsx
- supabase/migrations/20260301170000_065_fix_rpc_invite_user_to_org_ambiguous_user_id.sql
- supabase/migrations/20260301171500_066_fix_rpc_invite_user_to_org_out_param_conflict.sql
- docs/docs-app-screens-settings-users.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md

**Tests:**

- npm run lint OK (2026-03-01)
- npm run build OK (2026-03-01)
- npm run db:reset OK (2026-03-01)
- npm run db:seed:demo OK (2026-03-01)
- npm run db:rls:smoke OK (2026-03-01)
- Producción: `npx supabase db push --linked --yes` OK (065 y 066)
- Producción: `npx vercel --prod` OK (alias `https://nodux.app`)
- Producción: recuperación manual de huérfanos `samuel@demo.com` y `samuelg@demo.com` OK (invite/update sin error)

**Commit:** N/A
