# Context Summary (NODUX)

Ultima actualizacion: 2026-02-16 15:00

## Estado general

- MVP activo con enfoque DB-first / RLS-first y contratos de pantalla por view/RPC.
- Modulos implementados en ruta: POS, Productos/Stock, Vencimientos, Proveedores, Pedidos, Clientes, Dashboard, Settings completo y Audit Log.
- Auditoria (audit log) visible solo para OA/SA.

## Decisiones recientes (clave)

- Idioma preferido de UI y docs: Espanol.
- Moneda operativa: pesos argentinos (ARS).
- Stock negativo permitido para evitar bloqueos por desincronizacion.
- Productos con stock 0 deben seguir visibles (no ocultar en POS ni en catalogo).

## Proveedores y pedidos (MVP)

- Un producto tiene exactamente un proveedor primario y puede tener un proveedor secundario.
- Se evita duplicar productos como primarios en mas de un proveedor.
- Frecuencia de pedido por proveedor: weekly, biweekly, every_3_weeks, monthly (mensual = 30 dias en sugerencias).
- Dias de pedido y recepcion se guardan como weekday (mon..sun).

## Stock y sugerencias

- Safety stock es por sucursal (stock_items.safety_stock).
- Sugerido de compra (simple): promedio de ventas 30 dias \* ciclo + safety_stock - stock_on_hand.
- Esto se documenta como MVP simple y se planea mejorar post-MVP.

## Estado reciente

- UI actualizada: /products, /suppliers y /suppliers/[supplierId] con proveedores primario/secundario y safety stock.
- Sugeridos simples en /orders usando ventas 30 dias + safety stock.
- Productos con vencimiento aproximado (dias) y batches automaticos al recibir pedidos.
- Ventas consumen batches FEFO (best-effort) para evitar alertas falsas.
- /expirations operativo por sucursal con filtros 0-3 y 4-7 dias y correccion de fecha.
- Vencidos se muestran en la lista principal de vencimientos y se pueden mover manualmente a desperdicio (monto en ARS, descuenta stock).
- batch_code generado al recibir pedidos: <SUP>-<YYYYMMDD>-<NNN>.
- /clients operativo con lista, detalle y pedidos especiales por sucursal.
- Pedidos especiales usan items de catálogo y se entregan desde POS (stock se descuenta al cobrar).
- Dashboard operativo con KPIs y alertas basicas via rpc_get_dashboard_admin.
- Calendario de proveedores en `/orders/calendar` iterado a modo operativo: filtros por hoy/semana/mes/rango, estados (pendiente por realizar, realizado, pendiente por recibir, recibido/controlado), acceso directo a pedidos y edicion de fecha estimada de recepcion (`expected_receive_on`) para pedidos no exactos.
- Settings operativo completo en frontend: hub `/settings` y subrutas `/settings/users`, `/settings/branches`, `/settings/staff-permissions`, `/settings/preferences`, `/settings/audit-log`.
- Superadmin global operativo en `/superadmin`: listado/busqueda de orgs, creacion de org, alta de sucursal por org y activacion de org para contexto de soporte.
- Alta de org desde `/superadmin` incluye OA inicial (email + contraseña) en el mismo flujo.
- `/superadmin` permite crear OA inicial para orgs ya existentes (sin admin operativo previo).
- SA de plataforma puede abrir `/dashboard` usando la org activa (`rpc_get_active_org_id`).
- SA de plataforma puede navegar módulos core (`/pos`, `/products`, `/suppliers`, `/orders`, `/orders/calendar`, `/clients`, `/expirations`, `/settings`) sobre la org activa.
- Base DB de superadmin global multi-org implementada: `platform_admins`, `user_active_orgs`, vistas `v_superadmin_orgs`/`v_superadmin_org_detail` y RPCs para alta org/sucursal + org activa.
- Alta de usuarios desde `/settings/users` para OA: crea cuenta con email + contraseña inicial sin validación por email (`email_confirm=true`) usando Admin API server-side; la contraseña solo puede restablecerla el admin (no visible en UI).
- `/settings/users` gestiona solo roles `org_admin` y `staff`; superadmin queda fuera de creación/listado/edición en esta pantalla.
- En `/settings/users`, el checklist de sucursales se muestra solo para `staff`; para `org_admin` se oculta y aplica acceso global por organización.
- Smoke RLS automatizado disponible en `npm run db:rls:smoke` para validar allow/deny por rol (staff, org_admin, superadmin).
- Workflow CI de hardening agregado en `.github/workflows/ci-hardening.yml` con Supabase local, seed y smoke E2E.
- POS soporta descuento por efectivo con toggle operativo; el porcentaje no es editable en caja y se toma fijo desde `settings/preferences`.
- POS soporta pagos divididos (`cash/debit/credit/transfer/other`) con validación de suma exacta en DB.
- `rpc_create_sale` valida en DB que el descuento solo aplica cuando `payment_method='cash'`.
- Dashboard incorpora métricas de efectivo y descuento (`cash_sales_today_total`, `cash_discount_today_total`, etc.).
- Cambios de preferencias (incluyendo descuento efectivo) quedan auditados con `org_preferences_updated`.
- Módulo Caja (`/cashbox`) operativo por sucursal: apertura por turno/día, registro de gastos/ingresos manuales, cierre con conteo y diferencia.
- Caja audita actor y metadata operativa en `audit_log` (`cash_session_opened`, `cash_movement_added`, `cash_session_closed`).

## Post-MVP ya registrado

- Pagina para movimiento de stock entre sucursales (transferencias masivas).
