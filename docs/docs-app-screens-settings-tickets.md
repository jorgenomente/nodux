Screen Contract — Settings: Tickets e impresión

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

Ruta

/settings/tickets

Rol / Acceso

Org Admin (OA)

Superadmin (SA) dentro de org

Staff: NO

Propósito

Centralizar la configuración de impresión por sucursal y separar esta operación del resto de Settings.

Definir, por sucursal:

- texto de encabezado de ticket no fiscal
- texto de pie de ticket no fiscal
- leyenda de comprobante fiscal de prueba
- layout de impresión (ancho de papel, márgenes, tamaño de texto, interlineado)

UI

- Selector de sucursal activa (solo sucursales activas)
- Bloque `Ticket no fiscal`
  - `ticket_header_text` (textarea)
  - `ticket_footer_text` (textarea)
- Bloque `Comprobante fiscal de prueba`
  - `fiscal_ticket_note_text` (textarea)
- Bloque `Configuración de impresión`
  - `ticket_paper_width_mm` (number)
  - `ticket_margin_top_mm` (number)
  - `ticket_margin_right_mm` (number)
  - `ticket_margin_bottom_mm` (number)
  - `ticket_margin_left_mm` (number)
  - `ticket_font_size_px` (number)
  - `ticket_line_height` (number)
- Bloque `Bridge local ESC/POS (MVP web)`
  - modo local de impresión: `browser` | `local_agent`
  - `agentUrl`
  - `printerTarget`
  - `copies`
  - `cut`
  - `cashDrawer`
  - botón `Probar conexión`
  - botón `Imprimir ticket de prueba`
  - nota explícita: la configuración es local de la caja/navegador, no global de org
- Bloque de guía visible de formato para impresión térmica 80mm:
  - texto plano
  - recomendación de ancho por línea
  - uso de saltos de línea manuales
- Bloque de ayuda operativa visible o enlazable:
  - diferencias entre impresión por navegador vs ESC/POS
  - recomendación por sistema operativo
  - referencia a `docs/printing/thermal-setup.md`
  - referencia de evolución técnica a `docs/printing/escpos-bridge-architecture.md`
- CTA `Guardar plantilla`

Reglas de formato (UX)

- El texto se guarda y renderiza como texto plano multilinea.
- No se soporta HTML/markdown.
- Recomendación operativa: ~32 caracteres por línea para 80mm.

Data Contract

Lectura

Tabla: `branches`

- `id`
- `name`
- `ticket_header_text`
- `ticket_footer_text`
- `fiscal_ticket_note_text`
- `ticket_paper_width_mm`
- `ticket_margin_top_mm`
- `ticket_margin_right_mm`
- `ticket_margin_bottom_mm`
- `ticket_margin_left_mm`
- `ticket_font_size_px`
- `ticket_line_height`
- filtro: `org_id`, `is_active=true`

Escritura

Tabla: `branches` (update por `id` + `org_id`)

- `ticket_header_text`
- `ticket_footer_text`
- `fiscal_ticket_note_text`
- `ticket_paper_width_mm`
- `ticket_margin_top_mm`
- `ticket_margin_right_mm`
- `ticket_margin_bottom_mm`
- `ticket_margin_left_mm`
- `ticket_font_size_px`
- `ticket_line_height`

Integraciones de salida

- `/pos` usa la plantilla de la sucursal activa al imprimir ticket.
- `/sales/[saleId]/ticket` usa la plantilla de la sucursal de la venta.
- La guía operativa de setup y compatibilidad térmica vive en `docs/printing/thermal-setup.md`.
- El MVP web del bridge local se configura en el navegador de cada caja desde `/settings/tickets`; `/pos` lee esa configuración local y hace fallback a browser print si el agente no responde.

Edge cases

- Si la sucursal no tiene textos configurados, impresión usa layout base sin bloques adicionales.
- Si la sucursal no tiene layout configurado, usar defaults operativos (80mm, márgenes 2mm, 12px, line-height 1.35).
- Si no hay sucursales activas, mostrar estado vacío con mensaje explícito.

Smoke tests

- TK-01: guardar encabezado/pie en sucursal A y validar impresión en `/pos`.
- TK-02: cambiar a sucursal B con texto distinto y validar que no mezcla contenido.
- TK-03: guardar leyenda fiscal de prueba y validar render en `/sales/[saleId]/ticket`.
- TK-04: configurar margen izquierdo/derecho y validar que el ticket no se corte a la derecha.
- TK-05: revisar bloque/manual de ayuda y confirmar que explicita límites de macOS con térmicas ESC/POS sin driver nativo.
