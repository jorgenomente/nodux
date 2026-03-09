# AFIP / ARCA Fiscal Data Model

Proyecto: NODUX  
Versión: v0.1  
Estado: Draft

---

# 1. Propósito

Este documento define el modelo de datos base necesario para soportar la facturación electrónica AFIP / ARCA dentro de NODUX.

El modelo debe permitir:

- multi-tenant
- múltiples puntos de venta
- múltiples tipos de comprobante
- control de secuencia fiscal
- conciliación de comprobantes
- auditoría completa
- soporte homologación y producción

---

# 2. Principios de modelado

## 2.1 Venta ≠ Factura

Las entidades se separan en:

- `sales` → operación comercial interna
- `invoices` → documento fiscal autorizado

---

## 2.2 Inmutabilidad

Una vez autorizada una factura:

- no se modifica
- sólo se agregan eventos o notas de crédito

---

## 2.3 Dominio de secuencia

La secuencia fiscal depende de:

```

tenant
environment
punto de venta
tipo de comprobante

```

---

# 3. Entidades principales

## fiscal_credentials

Credenciales fiscales por tenant.

Campos:

```

id
tenant_id
environment
taxpayer_cuit
certificate_pem
encrypted_private_key
encryption_key_reference
status
created_at
updated_at
ta_expires_at

```

---

## points_of_sale

Puntos de venta habilitados.

Campos:

```

id
tenant_id
environment
location_id
pto_vta
description
status
created_at
updated_at

```

---

## fiscal_sequences

Control de numeración fiscal.

Campos:

```

id
tenant_id
environment
pto_vta
cbte_tipo
last_local_reserved
last_arca_confirmed
status
created_at
updated_at

```

---

## sales

Ventas internas del POS.

Campos:

```

id
tenant_id
location_id
cashier_user_id
subtotal
tax_total
discount_total
grand_total
currency
payment_status
created_at
closed_at

```

---

## sale_documents

Solicitud de documento asociado a venta.

Campos:

```

id
sale_id
document_kind
status
created_at
updated_at

```

Tipos posibles:

```

fiscal_invoice
receipt
internal_ticket

```

---

## invoice_jobs

Proceso de autorización fiscal.

Campos:

```

id
tenant_id
sale_id
environment
pto_vta
cbte_tipo
cbte_nro
job_status
attempt_count
requested_payload_json
response_payload_json
last_error_code
last_error_message
created_at
updated_at

```

---

## invoices

Factura autorizada por AFIP / ARCA.

Campos:

```

id
tenant_id
sale_id
environment
invoice_job_id
pto_vta
cbte_tipo
cbte_nro
doc_tipo
doc_nro
imp_total
imp_neto
imp_iva
imp_trib
currency
currency_rate
cae
cae_expires_at
result_status
qr_payload_json
pdf_storage_path
created_at

```

---

## invoice_events

Historial del proceso fiscal.

Campos:

```

id
invoice_job_id
event_type
event_payload_json
created_at

```

---

## print_jobs

Cola de impresión.

Campos:

```

id
tenant_id
invoice_id
printer_target
format
status
attempt_count
created_at
updated_at

```

---

# 4. Relaciones principales

```

tenant
├─ fiscal_credentials
├─ points_of_sale
├─ fiscal_sequences
├─ sales
│   └─ sale_documents
│        └─ invoice_jobs
│             └─ invoices
│                  └─ print_jobs

```

---

# 5. Reglas de integridad

- una factura debe pertenecer a un `invoice_job`
- un `invoice_job` pertenece a una venta
- la numeración debe existir en `fiscal_sequences`
- no se permite reutilizar `cbte_nro`

---

# 6. Índices recomendados

```

tenant_id
environment
pto_vta
cbte_tipo
cbte_nro
sale_id

```

---

# 7. Evolución futura

El modelo debe permitir agregar:

- notas de crédito
- notas de débito
- CAEA
- facturación batch
- múltiples CUIT por tenant
