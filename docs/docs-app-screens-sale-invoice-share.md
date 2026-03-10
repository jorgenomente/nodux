# Screen Contract — Factura compartida por link

## Ruta

- `/share/i/:token`

## Rol / Acceso

- Público (sin login, vía token)

## Propósito

Permitir abrir una factura fiscal compartible desde WhatsApp u otros canales, sin exigir sesión NODUX.

## UI

- Tarjeta superior simple con contexto de factura compartida.
- Documento fiscal imprimible reutilizando el mismo render base de `/sales/[saleId]/invoice`.
- Soporta vista A4 por defecto y `?format=ticket` para variante ticket fiscal.
- Incluye:
  - datos de emisión
  - CAE y vencimiento
  - receptor
  - ítems y totales
  - QR fiscal con link oficial AFIP
- Estado inválido:
  - `Link inválido, vencido o factura todavía no disponible`
- Estado error:
  - mensaje genérico de fallo temporal

## Data Contract

### Lectura principal

RPC pública: `rpc_get_sale_invoice_delivery(token)`

Salida mínima:

- datos de venta:
  - `sale_id`, `org_id`, `org_name`
  - `branch_id`, `branch_name`
  - `created_at`, `created_by`, `created_by_name`
  - `subtotal_amount`, `discount_amount`, `total_amount`
  - `items`
- datos fiscales:
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
- configuración de impresión de sucursal:
  - `ticket_header_text`
  - `ticket_footer_text`
  - `fiscal_ticket_note_text`
  - `ticket_paper_width_mm`
  - `ticket_margin_*_mm`
  - `ticket_font_size_px`
  - `ticket_line_height`

## Seguridad

- Token aleatorio no enumerable.
- Solo responde si existe `sale_delivery_links` activo para `document_kind = sale_invoice`.
- Sólo expone facturas con `result_status = authorized` y `render_status = completed`.
- Respeta vencimiento (`expires_at`) cuando aplique.

## Notas

- No reemplaza los controles internos de auditoría; es una superficie pública de lectura.
- La creación/reutilización del token se hace desde capa app autenticada (`/api/sales/[saleId]/invoice-share`).
