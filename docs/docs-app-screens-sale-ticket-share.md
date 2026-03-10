# Screen Contract — Ticket compartido por link

## Ruta

- `/share/t/:token`

## Rol / Acceso

- Público (sin login, vía token)

## Propósito

Permitir abrir un ticket no fiscal compartible desde WhatsApp u otros canales, sin exigir sesión NODUX.

## UI

- Tarjeta superior simple con contexto de ticket compartido.
- Acción visible: `Imprimir`.
- Documento imprimible con el mismo layout base del ticket interno:
  - header/footer configurados por sucursal
  - fecha, sucursal y vendedor
  - datos básicos del cliente si la venta fue identificada
  - lista de ítems y totales
  - estado fiscal (`facturada` / `no facturada`)
- Estado inválido:
  - `Link inválido o vencido`
- Estado error:
  - mensaje genérico de fallo temporal

## Data Contract

### Lectura principal

RPC pública: `rpc_get_sale_ticket_delivery(token)`

Salida mínima:

- `sale_id`
- `org_name`, `branch_name`
- `created_at`, `created_by_name`
- `subtotal_amount`, `discount_amount`, `total_amount`
- `is_invoiced`
- `client_name`, `client_phone`
- `items` (jsonb array)
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
- Solo responde si existe `sale_delivery_links` activo para `document_kind = sale_ticket`.
- Respeta vencimiento (`expires_at`) cuando aplique.
- No requiere sesión ni expone otros documentos de la venta.

## Notas

- Es una copia no fiscal compartible.
- La versión fiscal pública `/share/i/:token` queda pendiente para un lote posterior.
