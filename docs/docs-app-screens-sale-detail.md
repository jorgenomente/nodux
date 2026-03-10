# Screen Contract — Sale Detail (Org Admin)

## Ruta

- `/sales/[saleId]`

## Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org activa
- Staff: NO

## Propósito

Auditar una venta puntual, corregir método de pago cuando hubo error operativo y gestionar comprobantes (ticket/factura).

## UI

### Header

- Breadcrumb: Ventas → detalle
- Sucursal + fecha/hora
- Acceso rápido a `/cashbox`

### Resumen

- Subtotal
- Descuento total (%) + desglose (`cash` / `empleado`)
- Total
- Método resumen de la venta
- Empleado asociado (si aplica)
- Estado fiscal (facturada/no facturada)
- Cliente vinculado (si existe) con nombre y WhatsApp

### Bloque ítems

- producto
- cantidad
- precio
- subtotal

### Bloque pagos

- lista de componentes de pago (`sale_payments`)
- cada fila permite corrección de método con controles visibles (sin dropdown):
  - métodos: `efectivo`, `débito`, `crédito`, `mercadopago`
  - para `débito/crédito`: selector visible de dispositivo
  - para `mercadopago`: selector visible de canal (`Posnet MP`, `QR`, `Transferencia a alias MP`)
- motivo de corrección obligatorio en todos los casos

### Bloque comprobantes

- Botón “Imprimir ticket” (copia no fiscal)
- Botón `Compartir ticket por WhatsApp` si la venta tiene `client_phone`
- Botón `Compartir factura por WhatsApp` si la venta tiene `client_phone` y la factura fiscal está `completed`
- Estado del link vigente por documento (`activo/revocado/vencido/sin generar`)
- Metadata mínima del link: creación, último compartido asistido, canal y contador de reenvíos
- Acciones operativas: `Revocar link` / `Regenerar link`
- Bloque `Historial de compartidos` con eventos recientes por documento/canal/fecha/actor
- Botón “Emitir factura” si la venta aún no está facturada
  Debe encolar el job fiscal en ambiente `prod`; no es equivalente al ticket no fiscal.
- Si existe factura fiscal, mostrar estado real (`render_pending/completed`) y acceso “Ver factura”.

## Data Contract

### Lectura principal

View: `v_sale_detail_admin`

Salida mínima:

- `sale_id`, `org_id`, `branch_id`, `branch_name`
- `created_at`, `created_by`, `created_by_name`
- `employee_account_id`, `employee_name_snapshot`
- `is_invoiced`, `invoiced_at`
- `payment_method_summary`
- `subtotal_amount`, `discount_amount`, `discount_pct`, `cash_discount_amount`, `cash_discount_pct`, `employee_discount_applied`, `employee_discount_amount`, `employee_discount_pct`, `total_amount`
- `items` (jsonb array)
- `payments` (jsonb array)
- lectura auxiliar opcional de `v_sale_fiscal_invoice_admin`
- lectura auxiliar: `rpc_list_sale_delivery_links(sale_id)`
- lectura auxiliar: `rpc_list_sale_delivery_events(sale_id, limit)`

### Escritura

RPC: `rpc_correct_sale_payment_method(...)`

- `p_org_id`
- `p_sale_payment_id`
- `p_payment_method`
- `p_payment_device_id` (nullable)
- `p_reason` (obligatorio)

Reglas críticas:

- Solo OA/SA.
- No permite `mixed`.
- Si método es `débito/crédito` (y `card` legacy), exige dispositivo válido de la sucursal.
- Si método es `mercadopago`, dispositivo opcional para canales `QR/alias`; para `Posnet MP`, exige dispositivo.
- Si la venta pertenece a una sesión de caja ya cerrada, bloquea corrección.
- Actualiza `sales.payment_method` en base al conjunto actual de `sale_payments`.
- Audita evento `sale_payment_method_corrected`.

RPC: `rpc_mark_sale_invoiced(...)`

- `p_org_id`
- `p_sale_id`
- `p_source` (ej. `sale_detail`, `sales_list`, `pos_checkout`)

RPCs auxiliares de lifecycle:

- `rpc_list_sale_delivery_links(p_sale_id)`
- `rpc_revoke_sale_delivery_link(p_sale_id, p_document_kind)`
- `rpc_regenerate_sale_delivery_link(p_sale_id, p_document_kind, p_expires_at nullable)`
- `rpc_list_sale_delivery_events(p_sale_id, p_limit)`

## Seguridad (RLS)

- Scope por `org_id`.
- OA/SA lectura/escritura por RPC en org activa.
- ST sin acceso.

## Smoke tests

1. Abrir detalle de una venta con 1 método.
2. Corregir método y motivo válido.
3. Ver cambio reflejado en detalle y listado `/sales`.
4. Ver evento en `/settings/audit-log`.
5. Revocar un link de ticket y verificar que el `/share/t/:token` viejo deja de responder.
6. Regenerar el link y verificar que el token nuevo vuelve a responder.
7. Ver en el detalle eventos `Compartido`, `Abierto` y `Regenerado` cuando aplica.
