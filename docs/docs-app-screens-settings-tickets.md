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

UI

- Selector de sucursal activa (solo sucursales activas)
- Bloque `Ticket no fiscal`
  - `ticket_header_text` (textarea)
  - `ticket_footer_text` (textarea)
- Bloque `Comprobante fiscal de prueba`
  - `fiscal_ticket_note_text` (textarea)
- Bloque de guía visible de formato para impresión térmica 80mm:
  - texto plano
  - recomendación de ancho por línea
  - uso de saltos de línea manuales
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
- filtro: `org_id`, `is_active=true`

Escritura

Tabla: `branches` (update por `id` + `org_id`)

- `ticket_header_text`
- `ticket_footer_text`
- `fiscal_ticket_note_text`

Integraciones de salida

- `/pos` usa la plantilla de la sucursal activa al imprimir ticket.
- `/sales/[saleId]/ticket` usa la plantilla de la sucursal de la venta.

Edge cases

- Si la sucursal no tiene textos configurados, impresión usa layout base sin bloques adicionales.
- Si no hay sucursales activas, mostrar estado vacío con mensaje explícito.

Smoke tests

- TK-01: guardar encabezado/pie en sucursal A y validar impresión en `/pos`.
- TK-02: cambiar a sucursal B con texto distinto y validar que no mezcla contenido.
- TK-03: guardar leyenda fiscal de prueba y validar render en `/sales/[saleId]/ticket`.
