Estado: Ready for implementation
Ámbito: POS / Frontend / UX Operativa / Fiscal Checkout
Dependencias previas:

05-taxpayer-registry-and-invoice-class-resolution.md

06-implementation-plan-taxpayer-registry-and-factura-a-pos.md

07-sql-and-api-contracts-taxpayer-registry.md

08-application-services-and-sequence-diagrams-taxpayer-registry.md

Objetivo: definir la interfaz de POS y la máquina de estados para que la emisión de Factura A sea rápida, simple y segura para el operador, encapsulando toda la complejidad fiscal en backend.

1. Objetivo de UX

La experiencia objetivo debe sentirse así:

1. Elegir comprobante fiscal
2. Ingresar CUIT
3. Ver datos autocompletados
4. Confirmar
5. Emitir

El cajero no debe tener que entender:

WSAA

WSFE

padrón fiscal

condición IVA

CondicionIVAReceptorId

reglas A/B/C/M

La UI debe traducir todo eso a acciones operativas concretas.

2. Principios de diseño UI
   2.1 Un solo foco por paso

El operador debe hacer una sola cosa a la vez:

elegir tipo

ingresar CUIT

confirmar

emitir

2.2 Feedback inmediato

Al ingresar un CUIT, la UI debe responder rápido con uno de estos resultados:

válido y encontrado

válido y no encontrado

inválido

error de consulta

datos degradados desde cache

2.3 Bloqueo claro, no ambiguo

Si no corresponde Factura A, no debe quedar “gris” o ambiguo.
Debe verse algo como:

No corresponde Factura A para este CUIT.
NODUX sugiere Factura B.
2.4 El tipo solicitado y el tipo resuelto deben mostrarse por separado

Esto es importante para que el operador entienda:

qué pidió

qué resolvió el sistema

si puede seguir o no

3. Pantalla objetivo
   3.1 Estructura principal
   ┌──────────────────────────────────────────────┐
   │ Emisión fiscal │
   ├──────────────────────────────────────────────┤
   │ Tipo solicitado: [ A | B | C | M ] │
   │ │
   │ CUIT receptor │
   │ [_____________________] [Consultar] │
   │ │
   │ Resultado lookup │
   │ - Razón social │
   │ - Condición IVA │
   │ - Estado registral │
   │ - Clase sugerida │
   │ - Advertencias │
   │ │
   │ Resolución fiscal │
   │ - Solicitado: A │
   │ - Resuelto: A / B / C / M │
   │ - Estado: permitido / bloqueado │
   │ │
   │ [Cancelar] [Emitir] │
   └──────────────────────────────────────────────┘
4. Componentes UI
   4.1 FiscalDocumentPanel

Contenedor principal del flujo fiscal del checkout.

Responsabilidades

orquestar subcomponentes

manejar estado general

decidir cuándo habilitar emisión

4.2 DocumentClassSelector

Selector del tipo solicitado por el operador.

Opciones iniciales

A

B

C

M

Reglas

default configurable por política

si cambia el tipo, recalcular resolución

si ya había lookup, no perderlo

4.3 ReceiverCuitInput

Input del CUIT del receptor.

Reglas

aceptar solo dígitos

máximo 11 caracteres

permitir pegar

validar localmente antes de llamar backend

Comportamiento

consultar en blur o con botón explícito

permitir reintento rápido

mostrar estado de carga corto

4.4 TaxpayerLookupCard

Tarjeta de resultado del lookup.

Campos a mostrar

CUIT

razón social

condición IVA

estado registral

clase sugerida

origen de datos

timestamp de actualización

Regla

No mostrar datos crudos de ARCA; solo datos normalizados.

4.5 DocumentResolutionBanner

Banner visual que resume la resolución fiscal.

Variante permitida
Factura A permitida para este receptor.
Variante bloqueada
No corresponde Factura A para este receptor.
NODUX sugiere Factura B.
Variante degradada
No se pudo consultar ARCA en este momento.
Se usará la última información disponible.
4.6 EmitFiscalDocumentButton

Botón de acción final.

Reglas de habilitación

Se habilita solo si:

tipo solicitado resuelto exitosamente

lookup válido o cache confiable

no hay bloqueo fiscal

el checkout base está completo

5. Modelo de estado UI
   5.1 Estado raíz
   export type FiscalPosState = {
   requestedClass: 'A' | 'B' | 'C' | 'M'
   receiverCuit: string
   lookupState: TaxpayerLookupUiState
   resolutionState: ResolutionUiState
   receiverData: ReceiverDisplayData | null
   warnings: string[]
   blockingReason: string | null
   canEmit: boolean
   }
   5.2 Estado de lookup
   export type TaxpayerLookupUiState =
   | 'idle'
   | 'invalid_cuit'
   | 'searching'
   | 'found'
   | 'not_found'
   | 'registry_error'
   | 'degraded'
   5.3 Estado de resolución
   export type ResolutionUiState =
   | 'idle'
   | 'resolving'
   | 'allowed'
   | 'blocked'
   | 'missing_data'
   5.4 Datos renderizados
   export type ReceiverDisplayData = {
   cuit: string
   razonSocial: string
   condicionIVA: string
   estadoRegistral: string
   suggestedClass: 'A' | 'B' | 'C' | 'M' | null
   source: 'padron_a5' | 'constancia_inscripcion'
   fromCache?: boolean
   degraded?: boolean
   fetchedAt?: string
   }
6. Máquina de estados
   6.1 Estados principales
   IDLE
   → INVALID_CUIT
   → SEARCHING
   → FOUND
   → NOT_FOUND
   → REGISTRY_ERROR
   → DEGRADED

FOUND
→ RESOLVING
→ ALLOWED
→ BLOCKED
6.2 Flujo principal 7. Eventos de UI
7.1 DOCUMENT_CLASS_CHANGED

Se dispara cuando el operador cambia A/B/C/M.

Efecto

actualiza requestedClass

si ya hay lookup válido, dispara resolución nuevamente

7.2 CUIT_CHANGED

Se dispara al editar el CUIT.

Efecto

limpia errores previos si el valor cambia

si cambia sustancialmente, invalida resolución previa

no borra automáticamente tipo solicitado

7.3 LOOKUP_REQUESTED

Se dispara al presionar “Consultar” o al perder foco.

Efecto

valida formato

si es inválido, pasa a invalid_cuit

si es válido, pasa a searching

7.4 LOOKUP_SUCCEEDED
Efecto

carga receiverData

pasa a found

dispara RESOLUTION_REQUESTED

7.5 LOOKUP_DEGRADED
Efecto

carga receiverData

marca degraded=true

muestra warning

dispara RESOLUTION_REQUESTED

7.6 LOOKUP_FAILED
Efecto

si es no encontrado → not_found

si es error remoto → registry_error

7.7 RESOLUTION_REQUESTED
Efecto

pasa a resolving

llama backend con requestedClass + receiverCuit

7.8 RESOLUTION_ALLOWED
Efecto

pasa a allowed

canEmit = true

7.9 RESOLUTION_BLOCKED
Efecto

pasa a blocked

canEmit = false

setea blockingReason

8. Reglas de habilitación del botón Emitir
   8.1 Regla general
   canEmit =
   lookupState === 'found' || lookupState === 'degraded'
   && resolutionState === 'allowed'
   && blockingReason === null
   8.2 Regla específica para Factura A

Para requestedClass = 'A', emitir solo si:

lookupState in ['found', 'degraded']

resolvedClass === 'A'

allowed === true

8.3 Regla específica para bloqueo

Deshabilitar siempre si:

invalid_cuit

not_found

registry_error

blocked

missing_data

9. Mensajes UX
   9.1 CUIT inválido
   El CUIT ingresado no es válido.
   9.2 Receptor encontrado
   CUIT validado. Se completaron los datos fiscales del receptor.
   9.3 Receptor no encontrado
   No se encontró información fiscal para ese CUIT.
   9.4 Error de consulta
   No se pudo consultar ARCA en este momento.
   Intentá nuevamente.
   9.5 Resultado degradado
   No se pudo consultar ARCA en este momento.
   Se usará la última información disponible.
   9.6 Factura A permitida
   El receptor está habilitado para Factura A.
   9.7 Factura A bloqueada
   El receptor no está habilitado para Factura A.
   NODUX sugiere Factura B.
   9.8 Falta información fiscal
   No hay información fiscal suficiente para emitir este comprobante.
10. Diseño de interacción
    10.1 Secuencia ideal
    Seleccionar A
    → ingresar CUIT
    → consultar
    → ver razón social
    → ver "Factura A permitida"
    → emitir
    10.2 Secuencia bloqueada
    Seleccionar A
    → ingresar CUIT
    → consultar
    → ver razón social
    → ver "No corresponde Factura A"
    → botón Emitir deshabilitado
    → CTA secundario: cambiar a Factura B
    10.3 CTA secundario recomendado

Cuando requestedClass='A' y resolvedClass='B':

mostrar botón auxiliar:

[Usar Factura B]

Al presionarlo:

actualiza selector a B

reusa lookup previo

reevalúa resolución

11. UX de carga
    11.1 Durante lookup

Mostrar skeleton o spinner pequeño solo en la tarjeta de receptor, no bloquear toda la pantalla.

Mensaje:

Consultando datos fiscales...
11.2 Durante resolución

Mensaje corto:

Validando tipo de comprobante...
11.3 Durante emisión

Bloquear doble submit y mostrar:

Emitiendo comprobante fiscal... 12. UX de fallback
12.1 Cache degradada

Si hay cache válida pero el servicio remoto falla:

mostrar badge Datos desde cache

mostrar warning visible

permitir seguir solo según política

Ejemplo:

Datos fiscales recuperados desde cache.
Última actualización: 09/03/2026 09:42
12.2 Sin cache y error remoto

bloquear Factura A

no inventar datos

pedir reintento

13. Layout responsive
    13.1 Desktop

Dos bloques principales:

Izquierda:

- selector
- input CUIT
- tarjeta receptor

Derecha:

- resolución fiscal
- warnings
- acciones
  13.2 Mobile / tablet POS

Orden vertical:

1. Tipo solicitado
2. CUIT
3. Resultado lookup
4. Resolución
5. Botones
6. Estados visuales recomendados
   14.1 Success

Usar estilo de confirmación para:

lookup found

resolution allowed

14.2 Warning

Usar para:

degraded

resolvedClass distinta a requestedClass

14.3 Error

Usar para:

invalid_cuit

not_found

registry_error

blocked

15. Contrato frontend-backend
    15.1 Lookup call
    async function lookupReceiverByCuit(cuit: string): Promise<TaxpayerLookupResult>
    15.2 Resolve call
    async function resolveDocumentClass(input: {
    receiverCuit: string
    requestedClass: 'A' | 'B' | 'C' | 'M'
    }): Promise<DocumentClassResolution>
    15.3 Confirm fiscal preparation
    async function prepareFiscalSale(input: {
    requestedDocumentClass: 'A' | 'B' | 'C' | 'M'
    receiverCuit: string
    }): Promise<FiscalSalePreparation>
16. Estado del formulario
    16.1 Estado mínimo en React
    type FiscalFormState = {
    requestedClass: 'A' | 'B' | 'C' | 'M'
    receiverCuit: string
    lookup: TaxpayerLookupResult | null
    resolution: DocumentClassResolution | null
    isLookingUp: boolean
    isResolving: boolean
    isSubmitting: boolean
    }
    16.2 Resets
    Reset parcial

Si cambia requestedClass:

mantener lookup

resetear resolución

Reset fuerte

Si cambia receiverCuit:

resetear lookup

resetear resolución

canEmit = false

17. Pseudocódigo de componente principal
    function FiscalDocumentPanel() {
    const [state, setState] = useState<FiscalFormState>(initialState)

async function handleLookup() {
if (!isValidCuit(state.receiverCuit)) {
setState(s => ({
...s,
lookup: null,
resolution: null
}))
return
}

    setState(s => ({ ...s, isLookingUp: true }))

    const lookup = await lookupReceiverByCuit(state.receiverCuit)

    setState(s => ({
      ...s,
      lookup,
      resolution: null,
      isLookingUp: false
    }))

    if (lookup.taxpayer) {
      await handleResolve(state.requestedClass, state.receiverCuit)
    }

}

async function handleResolve(requestedClass: 'A' | 'B' | 'C' | 'M', cuit: string) {
setState(s => ({ ...s, isResolving: true }))

    const resolution = await resolveDocumentClass({
      requestedClass,
      receiverCuit: cuit
    })

    setState(s => ({
      ...s,
      resolution,
      isResolving: false
    }))

}

const canEmit =
!!state.lookup?.taxpayer &&
state.resolution?.allowed === true &&
!state.isSubmitting

return (...)
} 18. Casos de borde UX
18.1 El operador pega CUIT con guiones

La UI debe normalizar:

30-71234567-8
→ 30712345678
18.2 El operador borra un dígito después de lookup exitoso

Debe invalidarse la resolución previa inmediatamente.

18.3 El operador cambia de A a B después de bloqueo

Debe recalcular resolución sin volver a cargar la página.

18.4 El lookup responde pero falta razón social

Permitir render con placeholder y warning si backend lo permite.

19. Criterios de aceptación UI
    CA-UI-01

El operador puede consultar un CUIT y ver razón social autocompletada.

CA-UI-02

El sistema distingue claramente entre tipo solicitado y tipo resuelto.

CA-UI-03

Si no corresponde Factura A, el botón Emitir queda deshabilitado.

CA-UI-04

La UI muestra advertencias claras cuando usa cache degradada.

CA-UI-05

Cambiar de tipo de comprobante no obliga a reingresar el CUIT.

CA-UI-06

El flujo completo puede ejecutarse en menos de 10 segundos por un cajero entrenado.

20. Recomendaciones de producto

No ocultar el tipo resuelto. Debe verse claramente.

No permitir errores silenciosos. Todo bloqueo debe tener mensaje claro.

No exigir recarga de pantalla para cambiar A→B.

No mostrar terminología técnica ARCA al cajero.

Permitir un flujo rápido y repetible
