# AFIP / ARCA Render Pipeline
**Proyecto:** NODUX  
**Versión:** v0.1  
**Estado:** Draft operativo  
**Última actualización:** 2026-03-08

---

## 1. Propósito

Este documento define el pipeline de render de comprobantes fiscales de NODUX para AFIP / ARCA.

El pipeline de render se ejecuta **después** de la autorización fiscal y se encarga de generar los artefactos visibles y distribuibles del comprobante:

- QR fiscal
- PDF A4
- ticket térmico
- storage artifacts
- integración con impresión

---

## 2. Principio central

### El render no crea la factura

La factura existe cuando AFIP / ARCA autorizó y devolvió CAE.

El render:

- no autoriza
- no valida fiscalmente
- no define el estado fuente

El render sólo produce derivados visuales y operativos.

---

## 3. Objetivos

El pipeline debe:

- tomar una `invoice` autorizada
- construir payload QR
- generar PDF
- generar ticket térmico
- subir artefactos a storage
- persistir rutas y metadatos
- permitir reintentos sin tocar la autorización fiscal

---

## 4. Inputs del pipeline

El render pipeline recibe como mínimo:

- `invoice_id`
- `invoice_job_id`
- `tenant_id`
- `environment`
- `pto_vta`
- `cbte_tipo`
- `cbte_nro`
- `cae`
- `cae_expires_at`
- datos del cliente
- importes
- branding del tenant si aplica
- configuración de render

---

## 5. Outputs del pipeline

Debe producir:

- `qr_payload_json`
- `pdf_storage_path`
- `ticket_storage_path`
- metadata de render
- evento `render_completed`

---

## 6. Etapas del pipeline

```text
invoice authorized
  ↓
build QR payload
  ↓
render QR asset (opcional)
  ↓
render PDF A4
  ↓
render thermal ticket
  ↓
upload artifacts
  ↓
persist paths
  ↓
mark render completed
```

## 7. Fase 1: Build QR Payload
7.1 Objetivo

Construir el payload del QR fiscal a partir de los datos de la invoice.

7.2 Reglas

usar sólo datos persistidos y autorizados

no depender del frontend

no recalcular importes “desde la venta”

no usar datos tentativos

7.3 Input sugerido
{
  "ver": 1,
  "fecha": "2026-03-08",
  "cuit": 20123456789,
  "ptoVta": 1,
  "tipoCmp": 11,
  "nroCmp": 152,
  "importe": 1210.00,
  "moneda": "PES",
  "ctz": 1,
  "tipoDocRec": 99,
  "nroDocRec": 0,
  "tipoCodAut": "E",
  "codAut": 12345678901234
}
7.4 Persistencia

Guardar:

qr_payload_json en invoices


## 8. Fase 2: QR Asset
8.1 Objetivo

Generar representación gráfica del QR para PDF/ticket.

8.2 Notas

el asset puede ser PNG, SVG o data URL

el payload fuente sigue siendo qr_payload_json

si falla la imagen pero el payload existe, el job puede seguir en render_pending


## 9. Fase 3: PDF A4
9.1 Objetivo

Generar un PDF imprimible y descargable del comprobante.

9.2 Requisitos mínimos

El PDF debe mostrar:

emisor

CUIT

tipo y número de comprobante

fecha

cliente si aplica

detalle o resumen de importes

CAE

vencimiento del CAE

QR fiscal

branding básico del tenant si existe

9.3 Principios

el PDF debe ser determinístico

debe poder regenerarse

no depender del estado vivo del frontend

debe generarse con datos persistidos de invoice

9.4 Estrategia recomendada

Para MVP:

HTML template + render a PDF


## 10. Fase 4: Thermal Ticket
10.1 Objetivo

Generar representación de ticket térmico reimprimible.

10.2 Requisitos mínimos

Debe contener:

nombre comercial

CUIT

fecha

comprobante

punto de venta

número

importes

CAE

vencimiento CAE

QR o referencia operativa

10.3 Formato recomendado

texto estructurado para ESC/POS

representación intermedia serializable

no acoplar a una marca específica de impresora en Fase 1

11. Fase 5: Upload a Storage
11.1 Objetivo

Persistir artefactos generados.

11.2 Paths sugeridos
storage/fiscal/homo/{tenantId}/{invoiceId}/invoice.pdf
storage/fiscal/homo/{tenantId}/{invoiceId}/ticket.txt
storage/fiscal/homo/{tenantId}/{invoiceId}/qr.png

y en producción:

storage/fiscal/prod/{tenantId}/{invoiceId}/...
11.3 Reglas

paths determinísticos

separación homo/prod

no sobrescribir artefactos de otra invoice

permitir re-render controlado

12. Fase 6: Persistencia de resultado

Persistir en invoices:

pdf_storage_path

ticket_storage_path

qr_payload_json

Luego llamar:

fn_fiscal_mark_render_completed(...)

13. Estados del pipeline
render_pending

AFIP autorizó, falta render o persistencia de artefactos.

completed

Render terminado y paths persistidos.

render_failed_transient

Estado conceptual interno del runtime, pero no necesariamente persistido como estado separado en DB.

14. Errores del pipeline

Errores típicos:

FISCAL_RENDER_QR_FAILED

FISCAL_RENDER_PDF_FAILED

FISCAL_RENDER_THERMAL_TICKET_FAILED

FISCAL_STORAGE_UPLOAD_FAILED

Regla:

no volver a authorizing

no tocar numeración

no volver a llamar WSFEv1 por errores de render

15. Reintentos
Qué sí reintentar

QR

PDF

thermal ticket

upload storage

Qué no reintentar

autorización fiscal

reserva de secuencia

transiciones ya cerradas de AFIP

16. Contrato interno sugerido
type RenderInput = {
  invoiceId: string
  invoiceJobId: string
  tenantId: string
  environment: 'homo' | 'prod'
  invoice: {
    ptoVta: number
    cbteTipo: number
    cbteNro: number
    cae: string
    caeExpiresAt: string
    currency: string
    amounts: {
      total: number
      net: number
      iva: number
      trib: number
      opEx: number
      totConc: number
    }
  }
  issuer: {
    name: string
    cuit: string
  }
  customer?: {
    docTipo?: number
    docNro?: number
    name?: string
  }
}
Resultado sugerido
type RenderOutput = {
  qrPayloadJson: Record<string, unknown>
  pdfStoragePath?: string
  ticketStoragePath?: string
}
17. Estructura de código sugerida
src/server/fiscal/render/
  build-qr-payload.ts
  render-qr-asset.ts
  render-invoice-pdf.ts
  render-thermal-ticket.ts
  upload-artifacts.ts
  run-render-pipeline.ts
18. Pseudocódigo
async function runRenderPipeline(input: RenderInput): Promise<RenderOutput> {
  const qrPayload = buildQrPayload(input)

  const qrAsset = await renderQrAsset(qrPayload)

  const pdfFile = await renderInvoicePdf({
    ...input,
    qrAsset
  })

  const ticketFile = await renderThermalTicket({
    ...input,
    qrAsset
  })

  const uploaded = await uploadArtifacts({
    environment: input.environment,
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    pdfFile,
    ticketFile,
    qrAsset
  })

  return {
    qrPayloadJson: qrPayload,
    pdfStoragePath: uploaded.pdfStoragePath,
    ticketStoragePath: uploaded.ticketStoragePath
  }
}

## 19. Observabilidad

Loggear:

invoice_id

invoice_job_id

tenant_id

fase actual

duración por fase

tamaño de archivos

intento actual

Medir:

tiempo de render PDF

tiempo de render ticket

tiempo de upload

porcentaje de éxito por fase


## 20. Reglas de idempotencia

El render debe ser idempotente.

Si se ejecuta dos veces sobre la misma invoice:

no debe duplicar documentos operativos en DB

puede sobrescribir artefactos del mismo path si la política lo permite

debe mantener consistencia del resultado final


## 21. Branding y customización

Para Lote 1:

branding mínimo

layout fijo

sin per-tenant templates complejos

Más adelante:

variantes por tenant

logo dinámico

textos legales configurables

estilos por vertical


## 22. Fuera de alcance de Fase 1

templates avanzados por industria

múltiples tamaños de ticket

multi-idioma

impresión fiscal legacy

envío por email/WhatsApp


## 23. Checklist de implementación

 build QR payload

 render QR asset

 render PDF

 render thermal ticket

 upload artifacts

 persist paths

 mark render completed

 reintentos controlados

 logs y métricas


## 24. Conclusión

El render pipeline convierte una autorización fiscal en artefactos operativos utilizables por tienda, soporte y cliente final.

Su principio clave es simple:

la factura ya existe antes del render.

Por eso debe diseñarse como pipeline desacoplado, reintentable e idempotente, sin volver a tocar la autorización fiscal.