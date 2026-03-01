# Roadmap Vivo — NODUX (MVP)

Este documento ordena el trabajo en fases logicas para avanzar el MVP de forma consistente.
Debe actualizarse cada vez que se complete una fase o se cambie el plan.

Estado actual: **MVP operativo** (Fase 6 — hardening y QA completada).

---

## Reglas de uso

- Cada fase debe cerrarse con una actualizacion en este documento.
- Si se cambia el orden o se corta scope, registrar el cambio aqui.
- Mantener trazabilidad con `docs/activity-log.md`.

---

## Fase 0 — Fundaciones (Docs)

**Objetivo**: dejar contratos, alcance y modelo base definidos.

**Incluye**:

- Alcance MVP y Post-MVP
- Sitemap y contratos de pantallas
- Modulos y reglas de negocio
- Modelo de datos y matriz RLS (baseline)
- Roadmap vivo

**Estado**: COMPLETA

**Checklist**:

- [x] docs/docs-scope-mvp.md
- [x] docs/docs-scope-post-mvp.md
- [x] docs/docs-app-sitemap.md
- [x] docs/docs-app-screens-index.md
- [x] docs/docs-app-screens-\*.md
- [x] docs/docs-modules-\*.md
- [x] docs/docs-schema-model.md
- [x] docs/docs-data-model.md
- [x] docs/docs-rls-matrix.md
- [x] docs/docs-roadmap.md

---

## Fase 1 — Schema real + RLS

**Objetivo**: convertir el baseline en migraciones reales y policies minimas.

**Incluye**:

- Migraciones en `supabase/migrations`
- `docs/schema.sql` actualizado
- `types/supabase.ts` actualizado
- RLS minimo por tabla + RPCs criticas
- Actualizar docs vivos de modelo y RLS

**Estado**: COMPLETA

**Notas**:

- Migracion inicial creada (tablas + enums + RLS basica).
- Snapshot y types generados desde DB local.
- Views y RPCs siguen pendientes (proxima fase de DB).

---

## Fase 2 — Infra local y smoke DB

**Objetivo**: asegurar DB local reproducible.

**Incluye**:

- `npx supabase db reset` OK
- Verificacion de objetos creados (tablas, views, RPCs)
- Smoke RLS: 1 permitido / 1 denegado

**Estado**: COMPLETA

**Notas**:

- `supabase db reset` OK.
- RLS minimo verificado (admin permite insert product, staff denegado, usuario externo sin lectura).
- Verificacion de views basicas OK (v_branches_admin, v_products_admin).

---

## Fase 3 — Auth + Enrutamiento base

**Objetivo**: login funcional y redirecciones por rol.

**Incluye**:

- `/login`, `/logout`, `/no-access`
- Guardas por rol en rutas
- Redireccion post-login segun `docs/docs-app-sitemap.md`

**Estado**: COMPLETA

**Notas**:

- Login/logout/no-access implementados.
- Middleware con redireccion por rol y guardas basicas.
- Placeholder pages para homes (dashboard/superadmin/pos).

---

## Fase 4 — Modulos core (orden recomendado)

### 4.1 Productos / Stock (OA)

**Objetivo**: CRUD de productos + ajuste de stock por sucursal.

**Estado**: COMPLETA

**Notas**:

- Ruta `/products` creada con lectura de `v_products_admin`.
- Crear, editar, activar/desactivar productos.
- Ajuste manual de stock via RPC.

### 4.2 POS (Staff/OA)

**Objetivo**: flujo de venta rapida con stock.

**Estado**: COMPLETA

**Notas**:

- POS implementado en `/pos` con selector de sucursal, busqueda/escaneo y carrito.
- RPC `rpc_create_sale` valida modulo `pos` para Staff.

### 4.3 Proveedores + Pedidos a proveedor

**Objetivo**: CRUD proveedores + flujo de pedido draft->reconciled.

**Estado**: COMPLETA

**Notas**:

- /suppliers, /suppliers/[supplierId], /orders y /orders/[orderId] implementados.
- Vistas/RPCs usadas: v_suppliers_admin (products_count), v_supplier_detail_admin, v_orders_admin, v_order_detail_admin.

### 4.4 Vencimientos

**Objetivo**: batches, alertas y ajustes.

**Estado**: COMPLETA

**Notas**:

- /expirations implementado con lectura de `v_expirations_due`.
- Alta manual y ajustes via RPCs de vencimientos.

### 4.5 Clientes y pedidos especiales

**Objetivo**: clientes + pedidos especiales con estados.

**Estado**: COMPLETA

**Notas**:

- /clients implementado con lista, detalle y pedidos especiales con ítems.
- Integración POS para entrega/cobro.
- RPCs usadas: rpc_list_clients, rpc_get_client_detail, rpc_upsert_client, rpc_create_special_order, rpc_set_special_order_status, rpc_get_special_order_for_pos.

### 4.6 Dashboard (OA)

**Objetivo**: KPI + alertas basadas en views.

**Estado**: COMPLETA

**Notas**:

- /dashboard implementado con KPIs y alertas basicas.
- Contrato via rpc_get_dashboard_admin.

---

## Fase 5 — Settings

**Objetivo**: configurar usuarios, sucursales y permisos Staff.

**Incluye**:

- `/settings/users`
- `/settings/branches`
- `/settings/staff-permissions`
- `/settings/preferences`
- `/settings/audit-log` (auditoria OA/SA)

**Nota**: la auditoria se implementa hacia el final del MVP, luego de modulos core.

**Estado**: COMPLETA

**Notas**:

- Implementado hub `/settings`.
- Implementadas subrutas: `/settings/users`, `/settings/branches`, `/settings/staff-permissions`, `/settings/preferences` y `/settings/audit-log`.

---

## Fase 6 — Hardening y QA

**Objetivo**: estabilizar y asegurar el MVP.

**Incluye**:

- Lint + build
- Playwright smoke (si aplica)
- Ajustes de UX
- RLS final y tests minimos

**Estado**: COMPLETA

**Notas**:

- Smoke RLS automatizado agregado (`npm run db:rls:smoke`).
- Workflow CI agregado (`.github/workflows/ci-hardening.yml`) con:
  - Supabase local + `db:reset:all`
  - `lint` + `build`
  - smoke RLS
  - smoke Playwright.

---

## Fase 7 — Onboarding de datos maestros

**Objetivo**: acelerar carga inicial y completitud de productos/proveedores para operacion estable.

**Incluye**:

- `/onboarding` con contrato de pantalla dedicado
- importacion CSV con validacion por fila y aplicacion idempotente
- bandeja de pendientes de completitud de datos maestros
- acciones rapidas para completar proveedor primario, shelf_life_days y datos de pago
- exportes maestros CSV para respaldo y portabilidad
- hardening anti-duplicado de catálogo por org (barcode/internal_code/name normalizado)

**Estado**: EN PROGRESO (base DB + UI implementadas, hardening pendiente)

---

## Notas de avance

- 2026-02-08: Se crea este roadmap vivo como fuente de orden operativo.
- 2026-02-09: Auditoria (DB + UI + RLS) implementada antes de completar Settings; Fase 5 sigue pendiente.
- 2026-02-13: Se agrega `/orders/calendar` como agenda operativa mobile-first para proveedores (envios/recepciones), con lectura OA/ST y acciones solo OA.
- 2026-02-13: Se agrega `expected_receive_on` en `supplier_orders` y edición desde calendario para mejorar control de recepciones no exactas.
- 2026-02-13: Hardening de auditoria en pedidos/proveedores: `rpc_upsert_supplier` vuelve a registrar `supplier_upsert`, se agrega `rpc_set_supplier_order_expected_receive_on` y se audita recepcion/control en `rpc_receive_supplier_order`.
- 2026-02-13: Se completa Fase 5 de Settings en frontend con rutas faltantes (users, branches, staff-permissions, preferences y hub).
- 2026-02-16: Se agrega base DB para superadmin global multi-org (`platform_admins`, `user_active_orgs`, `v_superadmin_orgs`, `v_superadmin_org_detail`, RPCs de alta org/sucursal y org activa).
- 2026-02-16: `/superadmin` pasa de placeholder a UI operativa con listado/busqueda de orgs, alta de org/sucursal y cambio de org activa; acceso visible/restringido solo para superadmin.
- 2026-02-16: alta de org se completa end-to-end desde `/superadmin` (incluye OA inicial con password) y SA puede abrir `/dashboard` de la org activa.
- 2026-02-16: se agrega creación de OA inicial para org existente desde `/superadmin` y se extiende contexto SA de org activa a módulos core del MVP.
- 2026-02-16: hardening DB de alta org SA para exigir OA inicial en `rpc_superadmin_create_org` (alta atómica sin org huérfana).
- 2026-02-16: cierre Fase 6 con smoke RLS automatizado y CI hardening (Supabase local + seed + lint/build + smoke E2E).
- 2026-02-16: se agrega descuento en efectivo en POS (porcentaje fijo desde preferencias), validación estricta en DB y métricas de efectivo/descuento en dashboard.
- 2026-02-16: POS incorpora pagos divididos (split payments) con desglose `sale_payments`, compatibilidad backward en `rpc_create_sale` y métricas de efectivo basadas en cobros reales.
- 2026-02-16: se agrega módulo Caja (`/cashbox`) por sucursal con sesiones de apertura/cierre, movimientos manuales y auditoría de actor/detalle.
- 2026-02-25: se persiste `supplier_price` por relación producto-proveedor (`supplier_products`), se extiende `rpc_upsert_supplier_product` y se actualiza `v_supplier_detail_admin` para soportar edición y trazabilidad de cambios de costo proveedor.
- 2026-02-16: hardening de cierre de Caja con firma operativa obligatoria, confirmación explícita y conteo por denominaciones.
- 2026-02-16: caja pasa a conteo por denominaciones en apertura/cierre para caja + reserva, con denominaciones configurables por organización.
- 2026-02-18: se agrega módulo `/payments` por sucursal para cuentas a pagar de proveedores (pendiente/parcial/pagado/vencido), registro de pagos y estado de pago integrado en `/orders`.
- 2026-02-18: hardening de RPCs en pagos: se elimina sobrecarga legacy de `rpc_update_supplier_payable` para evitar errores de resolución ambigua en PostgREST durante pagos parciales/actualización de factura.
- 2026-02-18: `/orders/[orderId]` agrega entry point operativo de factura/remito y soporte de pago efectivo parcial en recepción/control (total declarado + restante), alineado con `/payments`.
- 2026-02-19: `/dashboard` agrega sección operativa hoy/semana para compras y pagos (pedidos a realizar, pedidos a recibir y pagos por método efectivo/transferencia).
- 2026-02-20: POS unifica tarjeta en método `card`, agrega `mercadopago` y trazabilidad por dispositivo (`pos_payment_devices` + `sale_payments.payment_device_id`); Caja integra egreso automático por pago proveedor en efectivo y resumen de cobros no-efectivo (`card`/`mercadopago`).
- 2026-02-20: se agrega módulo de historial/detalle de ventas (`/sales`, `/sales/[saleId]`) con filtros operativos y corrección auditada de método de pago; Caja suma conciliación por método/dispositivo en sesión (`rpc_get_cash_session_payment_breakdown`).
- 2026-02-20: `/cashbox` agrega conciliación operativa con carga manual de comprobantes por fila y diferencia automática; MercadoPago se agrupa en una fila total (`rpc_get_cash_session_reconciliation_rows`, `rpc_upsert_cash_session_reconciliation_inputs`).
- 2026-02-21: POS incorpora descuento de empleado con cuenta por sucursal (`employee_accounts`), configurable desde `/settings/preferences` (porcentaje y regla de combinación con descuento efectivo), con trazabilidad en ventas (`employee_name_snapshot`) y validación DB en `rpc_create_sale`.
- 2026-02-22: Onboarding datos maestros inicia base DB: `data_import_jobs`, `data_import_rows`, `v_data_onboarding_tasks` y RPCs `rpc_create_data_import_job`/`rpc_upsert_data_import_row`/`rpc_validate_data_import_job`/`rpc_apply_data_import_job`.
- 2026-02-22: Onboarding datos maestros implementa UI `/onboarding` con importación CSV operativa, resumen de jobs, pendientes por tarea y exportes maestros (`/onboarding/export`).
- 2026-02-22: Proveedores agregan `% ganancia sugerida` (`default_markup_pct`, default 40) y `/products` incorpora `precio proveedor` con sugerencia dinámica de `precio unitario` por proveedor seleccionado.
- 2026-02-22: Ventas incorpora entry point `/sales/statistics` con filtros por período/sucursal y ranking de productos/proveedores + tendencias por día/semana/mes basado en `v_sales_statistics_items`.
- 2026-02-26: Se agrega ruta pública `/landing` para posicionamiento comercial de NODUX (propuesta de valor + CTA a `/login` y demo), manteniendo separado el flujo operativo autenticado.
- 2026-02-26: Se hardenea split de dominios por host en `proxy`: `nodux.app` queda para marketing (`/landing`) y rutas operativas/auth redirigen a `app.nodux.app`.
- 2026-02-26: Se agrega canonical SEO de marketing en `proxy`: `www.nodux.app` redirige a `nodux.app`.
- 2026-02-27: Se agrega ruta pública `/demo` como recorrido solo lectura con datos ficticios y acceso directo desde `/landing`; `app.nodux.app/demo` redirige a `nodux.app/demo`.
- 2026-03-01: `/orders/[orderId]` agrega hardening de recepción para confirmar costo proveedor real por ítem, calcular total remito (subtotal sin IVA + IVA opcional + descuento opcional) y persistir costo vigente en `supplier_products.supplier_price` para próximos pedidos.
- 2026-03-01: `/orders/[orderId]` agrega ajuste inmediato de `precio unitario de venta` en recepción/control (update de `products.unit_price`) con sugerido por `% de ganancia` proveedor/fallback org y orden de datos priorizando cantidad ordenada al inicio de fila.
- 2026-03-01: `/settings/preferences` incorpora `% de ganancia por defecto` de la org (`default_supplier_markup_pct`) para unificar sugeridos cuando el proveedor no define margen.
- 2026-03-01: se agregan plantillas de impresión por sucursal en `branches` (`ticket_header_text`, `ticket_footer_text`, `fiscal_ticket_note_text`) y se integran en POS + `/sales/[saleId]/ticket` para ticket no fiscal configurable por sucursal.
- 2026-03-01: configuración de impresión se desacopla de `/settings/branches` y pasa a `/settings/tickets` con guía explícita de formato para rollo térmico 80mm y separación de ticket no fiscal vs leyenda fiscal de prueba.
- 2026-02-27: `/demo` evoluciona a demo interactiva con login automático (`POST /demo/enter`) y guard de solo lectura para usuario demo vía `DEMO_READONLY_EMAILS`.
- 2026-02-27: POS divide cierre de venta en `Cobrar` y `Cobrar y facturar`; ventas agregan estado fiscal (`is_invoiced`/`invoiced_at`), `/sales` y detalle habilitan `Emitir factura` + `Imprimir ticket` (copia no fiscal), y dashboard suma KPIs de facturación diaria (facturado/no facturado + % facturado).
- 2026-03-01: decisión de catálogo global por org explicitada en docs + política anti-duplicado obligatoria para productos (`barcode`, `internal_code`, `name` normalizado). Queda pendiente hardening DB/RPC para unicidad por nombre.
