# Context Summary (NODUX)

Ultima actualizacion: 2026-03-09 09:55

## Estado general

- MVP activo con enfoque DB-first / RLS-first y contratos de pantalla por view/RPC.
- Modulos implementados en ruta: POS, Productos/Stock, Vencimientos, Proveedores, Pedidos, Clientes, Dashboard, Settings completo y Audit Log.
- Auditoria (audit log) visible solo para OA/SA.
- ARCA/facturación fiscal permanece fuera del MVP operativo, pero ya existe un track post-MVP activo con base DB y backend inicial en preparación para homologación.

## Decisiones recientes (clave)

- Idioma preferido de UI y docs: Espanol.
- Moneda operativa: pesos argentinos (ARS).
- Stock negativo permitido para evitar bloqueos por desincronizacion.
- Productos con stock 0 deben seguir visibles (no ocultar en POS ni en catalogo).
- Catálogo de productos es único por org; stock se mantiene por sucursal.
- Política anti-duplicado de productos definida para la org: no duplicar `barcode`, `internal_code` ni `name` normalizado (trim + minúsculas). La unicidad por nombre queda pendiente de hardening DB/RPC.
- Track fiscal ARCA formalizado como línea paralela post-MVP: primero DB/worker backend, luego homologación end-to-end, render y recién después onboarding/UI operativa.

## Estado ARCA / fiscal

- Documentación canónica centralizada en `docs/ARCA/afip-arca-master-index.md`.
- Lote 0 completado: baseline/freeze y reglas de ejecución seguras.
- Lote 1 completado: migraciones fiscales reales (`078_fiscal_core`, `079_fiscal_helpers_and_rpc`) con reset local validado.
- Lote 2 completado: runtime base del worker fiscal en `lib/fiscal/*` con wrappers RPC, polling de jobs y resolución de credenciales/POS.
- Lote 3 parcial completado: WSAA real, capa WSFE, puente `sale -> sale_document -> invoice_job`, y prueba segura en producción (`WSAA + FEDummy`) validada.
- Gate operativo org-wide para enqueue `prod` disponible en `org_preferences.fiscal_prod_enqueue_enabled`, visible en `/settings/preferences`.
- Onboarding fiscal interno inicial disponible en `/settings/fiscal`: carga `.crt/.key`, cifra private key y configura puntos de venta por sucursal/ambiente.
- En desarrollo local, el cifrado fiscal ya puede bootstrapear su key maestra automáticamente en archivo ignorado si falta `FISCAL_ENCRYPTION_MASTER_KEY`; en producción sigue siendo obligatoria por entorno.
- Modo backend `prod-safe` disponible para jobs `prod`: autentica WSAA, ejecuta `FEDummy` y corta antes de `FECAESolicitar`, dejando el job en `pending_reconcile` con evidencia.
- Bloqueo vigente: homologación sigue rechazando certificado en WSAA (`cms.cert.untrusted`), mientras producción autentica correctamente.
- Gap actual: falta habilitar emisión real controlada (`FECAESolicitar` en prod), render real, reconciliación automática real y onboarding/UI operativa.
- Siguiente lote recomendado: conectar credenciales `prod` al worker en modo `prod-safe`, validar operaciones con jobs `prod` y recién después abrir emisión real con confirmación explícita.

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

- `/landing` fue redisenada segun arquitectura de marketing (docs 13/14/15): narrativa completa Problema -> Categoria -> Solucion -> Beneficios -> CTA, con foco en conversion a demo y posicionamiento `Retail Operating System`.
- Nueva ruta pública `/landing` implementada para explicar qué es NODUX (propuesta de valor, módulos core y CTA a login/demo) sin interferir con el flujo autenticado.
- Nueva ruta pública `/demo` implementada como recorrido seguro de producto (solo lectura y datos ficticios), accesible desde `/landing`.
- `/demo` agrega entrypoint `Probar demo interactiva`: login automático con cuenta demo de entorno y bloqueo de escritura para ese usuario (modo solo lectura en `proxy`).
- Se separa navegación por host en producción: `nodux.app` (landing pública) y `app.nodux.app` (login + app interna), evitando mezclar operación con marketing.
- Canonical de marketing definido: `www.nodux.app` redirige a `nodux.app` para evitar duplicidad SEO.
- UI actualizada: /products, /suppliers y /suppliers/[supplierId] con proveedores primario/secundario y safety stock.
- `/products/lookup` pasa de placeholder a lookup operativo mobile-first para Staff/OA, con búsqueda por nombre en cualquier orden de palabras, lookup por `barcode` exacto, botón `Usar cámara` para escaneo desde dispositivo y fallback `Ingresar código` en navegadores sin soporte, límite de resultados (30) y visualización de precio + stock por sucursal.
- `/products` refuerza anti-duplicado en alta: sugerencias en tiempo real por nombre, alertas de posible duplicado por nombre/código interno/barcode y bloqueo de guardado ante match exacto; DB endurecida con `name_normalized` y `barcode_normalized` únicos por org.
- Productos incorpora configuración de compra proveedor por paquete (`purchase_by_pack`, `units_per_pack`); `/orders` y `/orders/[orderId]` muestran equivalencias en paquetes al pedir/recibir y `/onboarding` permite aplicar esta configuración en edición masiva.
- Sugeridos simples en /orders usando ventas 30 dias + safety stock.
- Productos con vencimiento aproximado (dias) y batches automaticos al recibir pedidos.
- Ventas consumen batches FEFO (best-effort) para evitar alertas falsas.
- /expirations operativo por sucursal con filtros 0-3 y 4-7 dias y correccion de fecha.
- Vencidos se muestran en la lista principal de vencimientos y se pueden mover manualmente a desperdicio (monto en ARS, descuenta stock).
- batch_code generado al recibir pedidos: <SUP>-<YYYYMMDD>-<NNN>.
- /clients operativo con lista, detalle y pedidos especiales por sucursal.
- Pedidos especiales usan items de catálogo y se entregan desde POS (stock se descuenta al cobrar).
- Dashboard operativo con KPIs y alertas basicas via rpc_get_dashboard_admin.
- Dashboard incorpora sección operativa con toggle hoy/semana para compras y pagos:
  - pedidos a realizar (según `order_day` de proveedor),
  - pedidos a recibir (según `expected_receive_on`),
  - pagos a realizar (según `due_on`) separados por efectivo/transferencia.
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
- Hardening de alta/edición de usuarios en `/settings/users` y `/superadmin`: las RPCs de membresía (`rpc_invite_user_to_org`, `rpc_update_user_membership`) se ejecutan con sesión autenticada OA/SA (no con `service_role`) y quedan auditadas con `actor_user_id` real, evitando el error "Auth creado pero falló asignación org/sucursales".
- Hotfix en producción para alta de usuarios: `rpc_invite_user_to_org` corrigió ambigüedad SQL `42702` sobre `user_id` (migraciones 065/066), recuperando el flujo `Auth createUser -> org_users/branch_memberships` en `/settings/users`.
- Hardening adicional en `/settings/users` y `/superadmin`: si falla membresía tras `createUser`, se elimina la cuenta recién creada en Auth (rollback compensatorio) para evitar huérfanos; si el email ya existe, se reutiliza esa cuenta y se intenta asignación a org.
- Smoke RLS automatizado disponible en `npm run db:rls:smoke` para validar allow/deny por rol (staff, org_admin, superadmin).
- Workflow CI de hardening agregado en `.github/workflows/ci-hardening.yml` con Supabase local, seed y smoke E2E.
- POS soporta descuento por efectivo con toggle operativo; el porcentaje no es editable en caja y se toma fijo desde `settings/preferences`.
- POS agrega descuento de empleado con cuenta operativa por sucursal (`employee_accounts`), configurable desde `settings/preferences`.
- El descuento de empleado permite cualquier método de pago y puede combinarse o no con descuento efectivo según preferencia org.
- POS soporta pagos divididos (`cash/debit/credit/transfer/other`) con validación de suma exacta en DB.
- POS evoluciona a métodos operativos `cash`, `card` (débito/crédito unificado) y `mercadopago`, con selección de dispositivo de cobro por sucursal para trazabilidad.
- `rpc_create_sale` valida en DB que el descuento solo aplica cuando `payment_method='cash'`.
- Dashboard incorpora métricas de efectivo y descuento (`cash_sales_today_total`, `cash_discount_today_total`, etc.).
- Cambios de preferencias (incluyendo descuento efectivo) quedan auditados con `org_preferences_updated`.
- Gestión de cuentas de empleado (alta/reactivación/inactivación) queda auditada en `audit_log`.
- Módulo Caja (`/cashbox`) operativo por sucursal: apertura por turno/día, registro de gastos/ingresos manuales, cierre con conteo y diferencia.
- Caja audita actor y metadata operativa en `audit_log` (`cash_session_opened`, `cash_movement_added`, `cash_session_closed`).
- Cierre de caja ahora requiere firma operativa (`controlled_by_name`), confirmación explícita y soporta conteo por denominaciones.
- Caja ahora opera con conteo por denominaciones en apertura y cierre para caja + reserva.
- Pagos a proveedor en efectivo ahora generan egreso automático en caja (movimiento `supplier_payment_cash`) si hay sesión abierta en la sucursal.
- `/cashbox` muestra resumen adicional de cobros por `card` y `mercadopago` para conciliación diaria por dispositivo.
- `/cashbox` incorpora desglose por método/dispositivo de la sesión para conciliación operativa contra comprobantes.
- `/cashbox` permite cargar monto de comprobante por fila y calcula diferencia contra sistema.
- En conciliación de caja, MercadoPago se agrupa en una fila total (`MercadoPago (total)`) aunque existan distintos métodos registrados.
- `/cashbox` muestra un bloque de desglose del `Efectivo en sistema` con fórmula + detalle de movimientos (aperturas, ventas cash, ingresos, pagos proveedor cash y otros egresos) para trazabilidad operativa.
- `/cashbox` permite exportar reporte de sesión actual en CSV y abrir vista imprimible para compartir como PDF.
- En `/cashbox`, el cierre se presenta en dos pasos: conteo de efectivo y confirmación final al final de la pantalla, después de conciliación.
- Exportes de caja ahora están ligados a sesiones cerradas: CTA principal sobre último cierre y acciones CSV/PDF por cada fila en `Últimos cierres` para histórico.
- Apertura de caja en `/cashbox` ahora exige responsable, y cuando el tipo es `turno` usa selector `AM/PM` (sin etiqueta libre).
- En formulario de apertura se muestra fecha/hora del sistema en vivo junto al botón `Abrir caja`.
- Se define nueva fase de producto para onboarding de datos maestros (`/onboarding`) con foco en importacion CSV, bandeja de pendientes de completitud y exportes maestros; implementacion aun pendiente.
- Onboarding de datos maestros inicia base DB con jobs/rows de importación, vista de pendientes (`v_data_onboarding_tasks`) y RPCs de creación, validación y aplicación (`rpc_create_data_import_job`, `rpc_upsert_data_import_row`, `rpc_validate_data_import_job`, `rpc_apply_data_import_job`).
- `/onboarding` implementado en frontend para OA/SA: upload CSV/XLSX (productos o proveedores por separado), validación + aplicación opcional, bandeja de pendientes y tabla de importaciones recientes.
- `/onboarding` optimiza `Productos con informacion incompleta` con contrato DB dedicado (`v_products_incomplete_admin`), conteo exacto en servidor, paginación de 25 y buscador por nombre, evitando cargar todo el catálogo en memoria.
- `/onboarding` agrega etapa de detección/mapeo de columnas (archivo -> campos NODUX) y sube límite operativo de importación a 80.000 filas por archivo.
- En importación de onboarding se consolidan duplicados por claves de negocio (producto/proveedor/relación) antes de validar y aplicar, para construir maestro limpio desde archivos transaccionales.
- En `/onboarding`, después de `Detectar columnas`, el archivo queda en staging y `Validar e importar` reutiliza ese mismo archivo sin exigir re-carga en el input.
- `/onboarding/export` agrega exportes maestros CSV para `products`, `suppliers` y `product_supplier`.
- Proveedores ahora tienen `% ganancia sugerida` por defecto (`40%`) para pricing y `/products` muestra sugerencia de `precio unitario` desde `precio proveedor` + `%` del proveedor primario.
- `supplier_price` ahora queda persistido por relación en `supplier_products`; editar producto/proveedor actualiza ese valor y permite trazabilidad del cambio de costo proveedor junto al precio sugerido.
- Nuevo módulo de historial de ventas en `/sales` y detalle en `/sales/[saleId]` con filtros por monto, método, hora e ítems.
- POS separa cierre en dos acciones: `Cobrar` (venta no facturada, sin enqueue fiscal) y `Cobrar y facturar` (inicia enqueue fiscal).
- `sales` incorpora estado fiscal (`is_invoiced`, `invoiced_at`) y RPC `rpc_mark_sale_invoiced` para facturación diferida.
- `/sales` y `/sales/[saleId]` agregan acciones operativas `Imprimir ticket` (copia no fiscal) y `Emitir factura` para ventas previas no facturadas; esos entrypoints encolan job fiscal `prod`.
- `/settings/branches` agrega plantilla de impresión por sucursal (`ticket_header_text`, `ticket_footer_text`, `fiscal_ticket_note_text`) y POS + `/sales/[saleId]/ticket` pasan a usar esa configuración al imprimir.
- Se separa la gestión en `/settings/tickets` para centralizar edición de impresión, diferenciando ticket no fiscal vs leyenda fiscal de prueba con guía operativa de formato 80mm.
- `/settings/tickets` agrega configuración fina de layout por sucursal (ancho en mm, márgenes, tamaño de fuente e interlineado) y POS + `/sales/[saleId]/ticket` usan esos parámetros en CSS de impresión para corregir tickets recortados/descentrados según impresora.
- Dashboard agrega KPIs de facturación diaria: monto/cantidad facturado, no facturado y porcentaje facturado sobre ventas del día.
- `/sales` ahora incluye acceso directo a `/sales/statistics`, con análisis por período/sucursal: top y bottom de productos, relevancia de proveedores y tendencias por día/semana/mes.
- `/sales/statistics` separa la analítica en dos desplegables independientes (`Ventas de artículos` y `Proveedores y pagos`) para consultar por separado rendimiento comercial vs pagos/deuda/frecuencia de proveedores.
- `/sales/statistics` agrega bloque `Mostrando` con configuración activa (sucursal/período/modo) y fuerza sucursal única cuando el usuario tiene una sola asignación activa.
- Corrección de método de pago en detalle de venta vía RPC auditada (`sale_payment_method_corrected`) y bloqueada para ventas de sesiones de caja ya cerradas.
- Las denominaciones son configurables por organización desde preferencias.
- Pagos a proveedor por sucursal agregados: `supplier_payables` por pedido y `supplier_payments` como movimientos.
- `/payments` ahora incluye pedidos `sent` (pendiente por recibir) ademas de `received/reconciled` (controlado), con backfill para historicos.
- `/payments` registra numero de factura/remito (`invoice_reference`) y permite registrar pago con fecha/hora (`paid_at`).
- `/orders` ahora muestra estado de pago y saldo pendiente; `/payments` concentra pendientes, vencidos y registro de pagos.
- `/orders/[orderId]` en estado `draft` ahora usa editor batch de items con lista completa de sugeridos, buscador y guardado único de la nueva lista.
- `/orders/[orderId]` muestra monto estimado total en header/recepción y costo estimado por item (unitario + subtotal).
- `/orders/[orderId]` en recepción/control agrega segundo entry point para registrar factura/remito (número, monto, vencimiento, método, foto, nota) y soporta pago efectivo parcial con total declarado + restante proyectado.
- `/orders/[orderId]` en recepción/control ahora permite confirmar costo proveedor unitario por ítem (desde remito/factura), calcular total operativo con IVA/descuento opcionales y persistir `supplier_price` vigente en `supplier_products` para próximos pedidos.
- `/orders/[orderId]` ahora permite ajustar `precio unitario de venta` por ítem al confirmar recepción, actualizando `products.unit_price` en el acto con sugerido por `% de ganancia` proveedor/fallback org.
- En armado de pedido (`/orders` y `/orders/[orderId]` en draft), costo unitario usa por defecto precio proveedor registrado con check opcional para recalcular por `% ganancia` sugerido.
- `/settings/preferences` incorpora `default_supplier_markup_pct` para definir el margen global por defecto (ej. 41.5%) usado en sugeridos cuando no hay margen específico de proveedor.
- Proveedores incorporan perfil de pago: plazo (días), método de pago preferido (cash/transfer), datos de pago/notas y cuentas de transferencia.
- En `/payments`, la foto de factura/remito se comprime automáticamente (JPG liviano) y se guarda en Storage (`supplier-invoices`).

## Post-MVP ya registrado

- Pagina para movimiento de stock entre sucursales (transferencias masivas).
- Canal de tienda online conectado a stock NODUX (storefront público por org/sucursal, pedidos online, tracking por link único y gestión interna en `/online-orders`), documentado en `docs/docs-modules-online-store.md` y contratos de pantalla asociados.
- Fundación DB del canal online aplicada en migración `20260301213000_068_online_store_foundation.sql`: slugs en `orgs/branches`, `products.image_url`, tablas `storefront_*` y `online_orders*`, vista `v_online_orders_admin` y RPCs públicas/internas de storefront/tracking/estado.
- UI pública inicial del canal online implementada: selector de sucursal por org (`/:orgSlug`), catálogo + carrito + checkout (`/:orgSlug/:branchSlug`) y tracking público por token (`/o/:trackingToken`), con endpoint `POST /api/storefront/order` para crear pedidos online vía RPC.
- Storefront público compacta cards de catálogo para mostrar más productos por pantalla en mobile/desktop (`/:orgSlug/:branchSlug`).
- `/products` incorpora carga de imagen por producto (alta/edición) con compresión previa a JPG liviano; se guarda en Storage bucket público `product-images` y persiste `products.image_url`.
- UI interna inicial de pedidos online implementada en `/online-orders` (OA/ST con módulo habilitado), con filtros por sucursal/estado/búsqueda y transición de estados vía `rpc_set_online_order_status`.
- Comprobantes de pago online v1 implementados: carga pública desde `/o/:trackingToken` (archivo imagen) con persistencia en `online_order_payment_proofs` y revisión interna en `/online-orders` (aprobar/rechazar + nota), soportado por bucket privado `online-order-proofs` (migración `20260302101500_069_online_order_proofs_storage_bucket.sql`).
- `/settings` ahora muestra sección "Tienda online" con estado de storefront (`is_enabled`), `orgSlug` y links públicos por org/sucursal para facilitar QA operativo sin abrir SQL/Studio.
- `/settings` agrega toggle directo para `storefront_settings.is_enabled` (botón `Habilitar/Deshabilitar tienda online`) con persistencia server-side y refresco inmediato.
- Top bar global muestra contexto operativo persistente (`ORG` + `Sucursal activa`) en todas las pantallas autenticadas; además incorpora selector rápido de sucursal activa con cookie (`nodux_active_branch_id`).
- Top bar global ahora también muestra `Usuario` logeado; el selector de sucursal activa queda visible solo para OA/SA (se oculta para Staff).
- Hardening permisos staff: resolución de home ignora `module_key` sin ruta operativa para evitar falsos `Sin acceso` al habilitar módulos adicionales; `/no-access` agrega CTA de `Cerrar sesión`.
- `/settings/staff-permissions` vuelve a listar todos los módulos actuales con toggle, incluyendo `Acceso completo staff (operativo)` para baseline + exclusiones puntuales.
- Permisos staff incorporan `__full_access__` como baseline: habilita por defecto todos los módulos listados en la pantalla y permite quitar acceso puntual por módulo (denylist).
- Se inició hardening ruta-por-ruta para staff: `proxy` y guards de páginas clave ahora resuelven acceso por `module_key` habilitado (home y acceso a `/dashboard`, `/sales`, `/sales/statistics`, `/products`, `/suppliers`, `/orders`, `/orders/calendar`, `/payments`, `/onboarding`, `/settings` y detalles de ventas/pedidos/proveedores).
- Iteración de flujo online aplicada: checkout público ahora solicita `nombre + WhatsApp + dirección`, fija pago en `pagar al retirar`, muestra CTA para notificar pedido por WhatsApp a la tienda (teléfono configurable por sucursal) y tracking `/o/:trackingToken` ahora incluye resumen completo (cliente, ítems y total).
- Flujo operativo de cobro online reforzado: `/online-orders` muestra detalle de artículos y habilita `Cobrar en POS`; `/pos?online_order_id=:id` precarga carrito con ítems snapshot del pedido y, al cobrar, avanza estado online a `delivered`.
- En `/onboarding`, el apply de importación ahora matchea productos existentes solo por `barcode`/`internal_code` (sin fallback por nombre) y la deduplicación previa del archivo sigue la misma regla para evitar merges ambiguos por nombre.
- `/onboarding` incorpora edición masiva de productos con búsqueda/paginación server-side y aplicación por lote sobre seleccionados o todos los resultados filtrados; soporta patch de marca, proveedor primario/secundario, shelf life, precio proveedor y precio unitario.
- Formularios de producto (alta/edición/resolvedor) y edición masiva en `/onboarding` incorporan opción `No aplica vencimiento`, que guarda `shelf_life_days=0`; en recepción de pedidos, `0` o valor vacío no generan batches automáticos de vencimiento.
- En edición masiva de `/onboarding`, el campo de proveedor primario incorpora CTA `Crear proveedor` con modal rápido (nombre obligatorio) que reutiliza contrato de alta de proveedor y permite cargar cuenta de transferencia opcional en el mismo flujo.
