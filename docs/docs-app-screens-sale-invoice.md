# Screen Contract — Fiscal Invoice (Org Admin)

## Ruta

- `/sales/[saleId]/invoice`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Propósito

Visualizar, reimprimir y auditar el comprobante fiscal autorizado de una venta.

## UI

### Header

- Volver al detalle de venta
- Ir a ventas
- Toggle entre vista A4 y ticket fiscal
- Acción `Imprimir`

### Documento

- razón social (`orgs.name`)
- sucursal
- fecha de venta
- vendedor
- número de comprobante (`pto_vta` + `cbte_nro`)
- tipo de comprobante
- CAE y vencimiento
- receptor (`doc_tipo` / `doc_nro`)
- ítems e importes
- bloque QR fiscal con link oficial AFIP y payload persistido

## Data Contract

### Lectura principal

View: `v_sale_fiscal_invoice_admin`

Salida mínima:

- `sale_id`, `org_id`
- `invoice_id`, `invoice_job_id`
- `environment`
- `pto_vta`, `cbte_tipo`, `cbte_nro`
- `doc_tipo`, `doc_nro`
- `currency`, `currency_rate`, `imp_total`
- `cae`, `cae_expires_at`
- `result_status`
- `qr_payload_json`
- `pdf_storage_path`, `ticket_storage_path`
- `render_status`

### Lecturas auxiliares

- `v_sale_detail_admin`
- `orgs`
- `branches` (textos y layout de ticket)

## Reglas críticas

- El documento fiscal se considera visible cuando existe `invoice` autorizada.
- El worker fiscal cierra `render_pending -> completed` persistiendo `qr_payload_json` y rutas determinísticas de reimpresión.
- En MVP, `pdf_storage_path` y `ticket_storage_path` apuntan a rutas internas de la app; no implican todavía archivo binario en storage.

## Seguridad (RLS)

- Scope por `org_id`.
- Sólo OA/SA pueden leer `invoice_jobs` e `invoices`.
- Staff no accede a esta ruta ni a la view fiscal.

## Smoke tests

1. Emitir una factura autorizada.
2. Ejecutar el worker hasta pasar `render_pending -> completed`.
3. Abrir `/sales/[saleId]/invoice`.
4. Validar CAE, número de comprobante y bloque QR.
