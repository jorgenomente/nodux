# Roadmap Vivo — NODUX (MVP)

Este documento ordena el trabajo en fases logicas para avanzar el MVP de forma consistente.
Debe actualizarse cada vez que se complete una fase o se cambie el plan.

Estado actual: **MVP en progreso** (Fase 6 — hardening inicial multi-org/superadmin).

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

**Estado**: PENDIENTE

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
