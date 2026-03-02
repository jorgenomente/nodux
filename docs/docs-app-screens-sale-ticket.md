# Screen Contract — Sale Ticket (Org Admin)

## Ruta

- `/sales/[saleId]/ticket`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Propósito

Permitir imprimir un ticket de venta como copia operativa no fiscal.

## UI

- Encabezado con fecha, sucursal y vendedor.
- Si la sucursal tiene plantilla configurada, mostrar:
  - `ticket_header_text`
  - `ticket_footer_text`
  - `fiscal_ticket_note_text`
- Aplicar layout de impresión de la sucursal:
  - `ticket_paper_width_mm`
  - `ticket_margin_top_mm`
  - `ticket_margin_right_mm`
  - `ticket_margin_bottom_mm`
  - `ticket_margin_left_mm`
  - `ticket_font_size_px`
  - `ticket_line_height`
- Lista de ítems (cantidad, precio, subtotal).
- Totales (`subtotal`, `descuento`, `total`).
- Estado fiscal de la venta (`facturada` / `no facturada`).
- Acción visible: `Imprimir ticket`.

## Data Contract

### Lectura principal

View: `v_sale_detail_admin`

Salida mínima:

- `sale_id`, `org_id`, `branch_id`, `branch_name`
- `created_at`, `created_by_name`
- `subtotal_amount`, `discount_amount`, `total_amount`
- `is_invoiced`, `items` (jsonb array)

## Seguridad (RLS)

- Scope por `org_id`.
- OA/SA lectura dentro de org activa.
- ST sin acceso.

## Notas

- El ticket emitido desde esta pantalla es una copia no fiscal.
- La facturación fiscal se gestiona en el flujo de `Emitir factura`.
