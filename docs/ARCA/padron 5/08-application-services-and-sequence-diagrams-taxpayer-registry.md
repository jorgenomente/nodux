08 — Application Services and Sequence Diagrams: Taxpayer Registry + Factura A POS

Estado: Ready for implementation
Ámbito: Application Layer / POS / Sales API / Fiscal Service / ARCA
Dependencias previas:

05-taxpayer-registry-and-invoice-class-resolution.md

06-implementation-plan-taxpayer-registry-and-factura-a-pos.md

07-sql-and-api-contracts-taxpayer-registry.md

Objetivo: definir los servicios de aplicación, la orquestación entre módulos y los diagramas de secuencia necesarios para implementar el lookup por CUIT, la resolución de clase de comprobante y la emisión de Factura A en NODUX.

1. Objetivo funcional

Cuando el operador del POS pida Factura A, el sistema debe permitir:

ingresar CUIT

consultar padrón del receptor

autocompletar datos fiscales

resolver si corresponde A/B/C/M

confirmar venta

emitir comprobante fiscal vía WSFE

El flujo fiscal se apoya en:

WSAA para obtener Token y Sign

WSFEv1 para emitir el comprobante

servicio de padrón / constancia para identificar al receptor por CUIT

FEParamGetCondicionIvaReceptor para recuperar la referencia oficial de condición frente al IVA del receptor.

manual-desarrollador-ARCA-COMPG…

manual-desarrollador-ARCA-COMPG…

2. Principios de diseño de aplicación
   2.1 Backend como única puerta de acceso fiscal

Ni el POS ni ningún cliente frontend debe hablar directo con ARCA.
Toda interacción fiscal debe pasar por servicios backend internos.

2.2 Casos de uso explícitos

Cada operación debe modelarse como un caso de uso separado:

lookup por CUIT

resolución de clase

creación de draft fiscal de venta

creación de fiscal job

emisión fiscal

2.3 Snapshot inmutable previo a emisión

Antes de emitir, el sistema debe cerrar un snapshot del receptor fiscal.
El worker fiscal debe consumir ese snapshot y no volver a depender del estado mutable de UI.

2.4 Separación entre “resolución” y “emisión”

Una cosa es determinar qué comprobante corresponde.
Otra distinta es emitirlo.

Servicios distintos:

ResolveDocumentClassUseCase

EmitFiscalDocumentUseCase

3. Servicios de aplicación
   3.1 LookupTaxpayerUseCase
   Responsabilidad

validar CUIT

consultar cache

consultar ARCA si no hay cache vigente

normalizar respuesta

registrar lookup

devolver DTO consumible por POS

Interfaz sugerida
export interface LookupTaxpayerUseCase {
execute(input: {
tenantId: string
orgId: string
requestedByUserId?: string
cuit: string
environment: 'homo' | 'prod'
emisorCuit: string
}): Promise<TaxpayerLookupResult>
}
Dependencias

TaxpayerCacheRepository

TaxpayerRegistryGateway

TaxpayerNormalizer

TaxpayerLookupLogRepository

3.2 ResolveDocumentClassUseCase
Responsabilidad

recuperar/asegurar snapshot fiscal del receptor

determinar condicionIVAReceptorId

consultar referencia local de condición IVA receptor

resolver clase permitida/sugerida

devolver resultado operativo para el POS

Interfaz sugerida
export interface ResolveDocumentClassUseCase {
execute(input: {
tenantId: string
orgId: string
requestedByUserId?: string
receiverCuit: string
requestedClass: 'A' | 'B' | 'C' | 'M'
environment: 'homo' | 'prod'
emisorCuit: string
}): Promise<DocumentClassResolution>
}
Dependencias

LookupTaxpayerUseCase

CondicionIvaReceptorRepository

InvoiceClassResolver

3.3 PrepareFiscalSaleUseCase
Responsabilidad

validar intención fiscal del checkout

ejecutar lookup y resolución

construir snapshot del receptor

devolver payload listo para confirmación de venta

Interfaz sugerida
export interface PrepareFiscalSaleUseCase {
execute(input: {
tenantId: string
orgId: string
saleDraftId: string
requestedByUserId: string
requestedDocumentClass: 'A' | 'B' | 'C' | 'M'
receiverCuit: string
environment: 'homo' | 'prod'
emisorCuit: string
}): Promise<{
allowed: boolean
resolution: DocumentClassResolution
receiverSnapshot: TaxpayerSnapshot | null
}>
}
3.4 CreateFiscalJobUseCase
Responsabilidad

tomar venta ya confirmada

cerrar payload fiscal

persistir job

dejar al worker todo lo necesario para emitir

Interfaz sugerida
export interface CreateFiscalJobUseCase {
execute(input: {
saleId: string
tenantId: string
orgId: string
environment: 'homo' | 'prod'
requestedDocumentClass: 'A' | 'B' | 'C' | 'M'
resolvedDocumentClass: 'A' | 'B' | 'C' | 'M'
receiverSnapshot: FiscalReceiverSnapshot
}): Promise<{
fiscalJobId: string
}>
}
3.5 EmitFiscalDocumentUseCase
Responsabilidad

cargar job

reservar secuencia fiscal

obtener TA WSAA

construir request WSFE

incluir CondicionIVAReceptorId

emitir comprobante

persistir CAE, XML, resultado y snapshot

El manual FE v4.0 documenta que FECAESolicitar requiere Auth.Token, Auth.Sign y Auth.Cuit, y además incorpora CondicionIVAReceptorId en el detalle del request.

manual-desarrollador-ARCA-COMPG…

Interfaz sugerida
export interface EmitFiscalDocumentUseCase {
execute(input: {
fiscalJobId: string
}): Promise<{
fiscalDocumentId: string
cae: string
caeVto: string
}>
} 4. Objetos de aplicación
4.1 FiscalReceiverSnapshot
export type FiscalReceiverSnapshot = {
cuit: string
razonSocial: string | null
condicionIVA: string | null
condicionIVAReceptorId: number | null
documentClass: 'A' | 'B' | 'C' | 'M'
domicilioFiscal: {
direccion: string | null
localidad: string | null
provincia: string | null
} | null
source: 'padron_a5' | 'constancia_inscripcion'
raw: unknown
}
4.2 FiscalSalePreparation
export type FiscalSalePreparation = {
allowed: boolean
receiverSnapshot: FiscalReceiverSnapshot | null
resolution: {
requestedClass: 'A' | 'B' | 'C' | 'M'
resolvedClass: 'A' | 'B' | 'C' | 'M' | null
allowed: boolean
warnings: string[]
blockingReason: string | null
}
} 5. Orquestación general
5.1 Flujo principal de preparación
POS
↓
Sales API
↓
PrepareFiscalSaleUseCase
├── LookupTaxpayerUseCase
└── ResolveDocumentClassUseCase
↓
Response al POS
5.2 Flujo principal de emisión
POS confirma venta
↓
Sales API
↓
CreateFiscalJobUseCase
↓
Queue
↓
Fiscal Worker
↓
EmitFiscalDocumentUseCase
├── FiscalSequenceService
├── WsaaService
└── WsfeClient
↓
Persistencia fiscal 6. Sequence diagram — Lookup por CUIT 7. Sequence diagram — Resolución de clase 8. Sequence diagram — Preparación de venta fiscal 9. Sequence diagram — Emisión fiscal end-to-end 10. Pseudocódigo — LookupTaxpayerUseCase
class LookupTaxpayerUseCaseImpl implements LookupTaxpayerUseCase {
async execute(input: {
tenantId: string
orgId: string
requestedByUserId?: string
cuit: string
environment: 'homo' | 'prod'
emisorCuit: string
}): Promise<TaxpayerLookupResult> {
if (!isValidCuit(input.cuit)) {
throw new FiscalTaxpayerError('INVALID_CUIT')
}

    const cached = await this.cacheRepository.findByCuit({
      cuit: input.cuit,
      environment: input.environment
    })

    if (cached && new Date(cached.expiresAt) > new Date()) {
      await this.lookupLogRepository.insert({
        tenantId: input.tenantId,
        orgId: input.orgId,
        requestedByUserId: input.requestedByUserId,
        cuit: input.cuit,
        source: cached.source,
        environment: input.environment,
        resultStatus: 'FOUND',
        fromCache: true,
        degraded: false,
        warnings: []
      })

      return {
        found: true,
        fromCache: true,
        degraded: false,
        warnings: [],
        taxpayer: cached
      }
    }

    const raw = await this.registryGateway.getByCuit({
      environment: input.environment,
      emisorCuit: input.emisorCuit,
      receiverCuit: input.cuit
    })

    const snapshot = this.normalizer.normalize(raw, input.environment)

    await this.cacheRepository.upsert(snapshot)

    await this.lookupLogRepository.insert({
      tenantId: input.tenantId,
      orgId: input.orgId,
      requestedByUserId: input.requestedByUserId,
      cuit: input.cuit,
      source: snapshot.source,
      environment: input.environment,
      resultStatus: snapshot.estadoRegistral === 'NO_ENCONTRADO' ? 'NOT_FOUND' : 'FOUND',
      fromCache: false,
      degraded: false,
      warnings: snapshot.observaciones
    })

    return {
      found: snapshot.estadoRegistral !== 'NO_ENCONTRADO',
      fromCache: false,
      degraded: false,
      warnings: snapshot.observaciones,
      taxpayer: snapshot.estadoRegistral === 'NO_ENCONTRADO' ? null : snapshot
    }

}
} 11. Pseudocódigo — ResolveDocumentClassUseCase
class ResolveDocumentClassUseCaseImpl implements ResolveDocumentClassUseCase {
async execute(input: {
tenantId: string
orgId: string
requestedByUserId?: string
receiverCuit: string
requestedClass: 'A' | 'B' | 'C' | 'M'
environment: 'homo' | 'prod'
emisorCuit: string
}): Promise<DocumentClassResolution> {
const lookup = await this.lookupTaxpayerUseCase.execute({
tenantId: input.tenantId,
orgId: input.orgId,
requestedByUserId: input.requestedByUserId,
cuit: input.receiverCuit,
environment: input.environment,
emisorCuit: input.emisorCuit
})

    if (!lookup.taxpayer) {
      return {
        requestedClass: input.requestedClass,
        resolvedClass: null,
        allowed: false,
        warnings: [],
        blockingReason: 'TAXPAYER_NOT_FOUND'
      }
    }

    const refs = await this.condicionIvaReceptorRepository.getAll({
      environment: input.environment
    })

    return this.invoiceClassResolver.resolve({
      requestedClass: input.requestedClass,
      taxpayer: lookup.taxpayer,
      refs
    })

}
} 12. Pseudocódigo — PrepareFiscalSaleUseCase
class PrepareFiscalSaleUseCaseImpl implements PrepareFiscalSaleUseCase {
async execute(input: {
tenantId: string
orgId: string
saleDraftId: string
requestedByUserId: string
requestedDocumentClass: 'A' | 'B' | 'C' | 'M'
receiverCuit: string
environment: 'homo' | 'prod'
emisorCuit: string
}) {
const lookup = await this.lookupTaxpayerUseCase.execute({
tenantId: input.tenantId,
orgId: input.orgId,
requestedByUserId: input.requestedByUserId,
cuit: input.receiverCuit,
environment: input.environment,
emisorCuit: input.emisorCuit
})

    const resolution = await this.resolveDocumentClassUseCase.execute({
      tenantId: input.tenantId,
      orgId: input.orgId,
      requestedByUserId: input.requestedByUserId,
      receiverCuit: input.receiverCuit,
      requestedClass: input.requestedDocumentClass,
      environment: input.environment,
      emisorCuit: input.emisorCuit
    })

    return {
      allowed: resolution.allowed,
      resolution,
      receiverSnapshot: lookup.taxpayer
        ? {
            cuit: lookup.taxpayer.cuit,
            razonSocial: lookup.taxpayer.razonSocial,
            condicionIVA: lookup.taxpayer.condicionIVA,
            condicionIVAReceptorId: lookup.taxpayer.condicionIVAReceptorId,
            documentClass: resolution.resolvedClass,
            domicilioFiscal: lookup.taxpayer.domicilioFiscal,
            source: lookup.taxpayer.source,
            raw: lookup.taxpayer.raw
          }
        : null
    }

}
} 13. Pseudocódigo — EmitFiscalDocumentUseCase
class EmitFiscalDocumentUseCaseImpl implements EmitFiscalDocumentUseCase {
async execute(input: { fiscalJobId: string }) {
const job = await this.fiscalJobRepository.getByIdOrThrow(input.fiscalJobId)

    const seq = await this.fiscalSequenceService.reserve({
      fiscalEntityId: job.fiscalEntityId,
      posNumber: job.posNumber,
      cbteTipo: job.cbteTipo
    })

    const ta = await this.wsaaService.getAccessTicket({
      environment: job.environment,
      service: 'wsfe',
      fiscalEntityId: job.fiscalEntityId
    })

    const request = this.wsfeRequestBuilder.buildCAERequest({
      auth: {
        token: ta.token,
        sign: ta.sign,
        cuit: Number(job.emisorCuit)
      },
      cab: {
        cantReg: 1,
        ptoVta: job.posNumber,
        cbteTipo: job.cbteTipo
      },
      det: {
        concepto: job.concepto,
        docTipo: job.docTipo,
        docNro: Number(job.receiverSnapshot.cuit),
        cbteDesde: seq.number,
        cbteHasta: seq.number,
        cbteFch: job.cbteFch,
        impTotal: job.impTotal,
        impTotConc: job.impTotConc,
        impNeto: job.impNeto,
        impOpEx: job.impOpEx,
        impTrib: job.impTrib,
        impIVA: job.impIVA,
        monId: job.monId,
        monCotiz: job.monCotiz,
        condicionIVAReceptorId: job.receiverSnapshot.condicionIVAReceptorId
      }
    })

    const result = await this.wsfeClient.fecaeSolicitar({
      environment: job.environment,
      request
    })

    await this.fiscalDocumentRepository.persistAuthorizedDocument({
      job,
      seqNumber: seq.number,
      requestXml: result.requestXml,
      responseXml: result.responseXml,
      cae: result.cae,
      caeVto: result.caeVto,
      receiverSnapshot: job.receiverSnapshot
    })

    return {
      fiscalDocumentId: result.fiscalDocumentId,
      cae: result.cae,
      caeVto: result.caeVto
    }

}
} 14. Contratos entre módulos
14.1 POS → Sales API

El POS no envía lógica fiscal compleja.
Solo envía intención y datos mínimos:

{
"requestedDocumentClass": "A",
"receiverCuit": "30712345678"
}
14.2 Sales API → Application Services

La API debe agregar contexto:

{
"tenantId": "uuid",
"orgId": "uuid",
"requestedByUserId": "uuid",
"environment": "prod",
"emisorCuit": "20958851929",
"requestedDocumentClass": "A",
"receiverCuit": "30712345678"
}
14.3 Application Services → Fiscal Worker

El worker recibe snapshot cerrado, nunca un CUIT “suelto”.

15. Estados operativos del flujo
    15.1 Lookup

FOUND

NOT_FOUND

INVALID_CUIT

REGISTRY_UNAVAILABLE

DEGRADED_CACHE

15.2 Resolución

ALLOWED

BLOCKED

SUGGESTED_DOWNGRADE

MISSING_REFERENCE_DATA

15.3 Emisión

PENDING

RESERVED

AUTH_IN_PROGRESS

AUTHORIZED

REJECTED

RETRYABLE_ERROR

TERMINAL_ERROR

16. Políticas de bloqueo
    16.1 Factura A

Bloquear si:

lookup falló y no hay cache confiable

receptor no corresponde a A

falta CondicionIVAReceptorId

el resolver no pudo obtener resolvedClass = A

16.2 Factura B/C

Puede ser menos estricta según política, pero debe seguir pasando por el mismo servicio de resolución.

17. Sequence diagram — Fallback con cache
18. Sequence diagram — Bloqueo de Factura A
19. Integración con colas y workers
    19.1 Recomendación

El worker fiscal no debe ejecutar lookup de padrón en el momento de emitir.
Eso ya debería venir resuelto desde la fase de preparación.

19.2 Razón

Esto mantiene:

menor latencia en emisión

menos dependencia externa en punto crítico

mayor reproducibilidad

mejor auditoría

19.3 Excepción

Sólo permitir refresh fiscal on-demand si el rechazo de WSFE indica inconsistencia recuperable.

20. Logging estructurado de aplicación
    20.1 Lookup
    {
    "event": "lookup_taxpayer_completed",
    "tenantId": "uuid",
    "orgId": "uuid",
    "cuit": "30712345678",
    "environment": "prod",
    "fromCache": false,
    "degraded": false,
    "durationMs": 420
    }
    20.2 Resolución
    {
    "event": "resolve_document_class_completed",
    "requestedClass": "A",
    "resolvedClass": "B",
    "allowed": false,
    "blockingReason": "DOCUMENT_CLASS_NOT_ALLOWED"
    }
    20.3 Emisión
    {
    "event": "emit_fiscal_document_completed",
    "fiscalJobId": "uuid",
    "saleId": "uuid",
    "cbteTipo": 1,
    "ptoVta": 2,
    "cbteNro": 15,
    "cae": "12345678901234",
    "status": "AUTHORIZED"
    }
21. Checklist técnico por servicio
    21.1 LookupTaxpayerUseCase
    [ ] valida CUIT
    [ ] busca cache
    [ ] consulta ARCA
    [ ] normaliza
    [ ] persiste cache
    [ ] escribe log
    21.2 ResolveDocumentClassUseCase
    [ ] ejecuta lookup
    [ ] obtiene referencias locales
    [ ] resuelve clase
    [ ] devuelve allowed + warnings + blockingReason
    21.3 PrepareFiscalSaleUseCase
    [ ] construye snapshot
    [ ] desacopla UI de emisión
    [ ] devuelve resultado listo para confirmar
    21.4 EmitFiscalDocumentUseCase
    [ ] reserva secuencia
    [ ] obtiene TA WSAA
    [ ] arma FECAESolicitar
    [ ] incluye CondicionIVAReceptorId
    [ ] persiste CAE + XML + snapshot
22. Decisiones de arquitectura recomendadas

Lookup y resolución viven en application layer, no en controller.

El worker fiscal consume snapshots cerrados, no reconsulta padrones.

Toda resolución fiscal del receptor se hace antes de encolar la emisión.

El POS sólo ve DTOs simples, nunca SOAP ni catálogos crudos.

Factura A no se emite sin resolución positiva explícita.

23. Criterio de éxito

La arquitectura queda bien implementada cuando:

el POS resuelve Factura A en segundos

los servicios están separados y testeables

el worker emite sin depender del estado UI

el documento emitido guarda snapshot fiscal completo

un rechazo fiscal puede auditarse con datos persistidos
