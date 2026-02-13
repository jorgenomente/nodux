# Context Summary (NODUX)

Ultima actualizacion: 2026-02-10 14:10

## Estado general

- MVP activo con enfoque DB-first / RLS-first y contratos de pantalla por view/RPC.
- Modulos implementados en ruta: POS, Productos/Stock, Vencimientos, Proveedores, Pedidos, Clientes, Dashboard, Settings, Audit Log.
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

## Post-MVP ya registrado

- Pagina para movimiento de stock entre sucursales (transferencias masivas).
