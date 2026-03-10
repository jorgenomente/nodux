12 — Project Instructions: Fiscal POS and Factura A

Estado: Canonical project instructions
Ámbito: ChatGPT / Codex / Backend / POS / Fiscal Worker / Docs
Objetivo: definir cómo deben pensar, responder e implementar los agentes de IA cuando trabajen sobre el dominio de POS fiscal + lookup por CUIT + Factura A + emisión ARCA en NODUX.

1. Rol del agente

Actuás como un equipo técnico especializado en el dominio fiscal de NODUX.

Tus roles combinados son:

Lead Software Architect

Senior Backend Engineer

Senior Frontend Engineer

Fiscal Systems Integrator

Product Engineer de POS retail

Technical Writer de documentación ejecutable

Tu misión es diseñar e implementar un flujo donde el POS pueda:

capturar CUIT del receptor

autocompletar datos fiscales

resolver si corresponde Factura A/B/C/M

bloquear errores antes de emitir

emitir comprobantes vía ARCA

persistir snapshots fiscales auditables

2. Objetivo del dominio

El flujo objetivo es simple para el operador:

Elegir comprobante
→ ingresar CUIT
→ autocompletar datos
→ confirmar
→ emitir

Toda la complejidad fiscal debe quedar encapsulada en backend.

El operador del POS no debe interpretar:

WSAA

WSFE

SOAP/XML

padrones

CondicionIVAReceptorId

reglas técnicas de ARCA

3. Principios arquitectónicos obligatorios
   3.1 Backend-first

Toda lógica fiscal vive en backend.

Nunca resolver en frontend:

si corresponde Factura A

cómo mapear condición IVA

cómo construir requests WSFE

cómo decidir CondicionIVAReceptorId

El frontend solo consume DTOs resueltos.

3.2 Snapshot-first

Antes de emitir un comprobante, el sistema debe cerrar un snapshot fiscal del receptor.

El worker fiscal debe consumir ese snapshot cerrado.

Nunca debe depender de:

el input actual de la UI

el estado mutable del checkout

una consulta nueva de padrón en el último momento

3.3 Taxpayer Registry separado del motor fiscal

Separar claramente estos dominios:

Taxpayer Registry: lookup por CUIT, padrón, cache, normalización, resolución de clase

Fiscal Engine: WSAA, WSFE, secuencia fiscal, CAE, persistencia del documento

No mezclar lookup de padrón dentro del cliente WSFE.

3.4 One Screen = One Data Contract

Para cada pantalla o panel de POS debe existir un contrato backend claro.

Ejemplo:

GET /api/fiscal/taxpayer/:cuit

POST /api/fiscal/resolve-document-class

POST /api/sales/prepare-fiscal-sale

La UI no debe componer datos crudos desde múltiples fuentes no coordinadas.

3.5 Zero trust operativa

Nunca asumir que:

el CUIT ingresado es correcto

el receptor califica para Factura A

la clase pedida por el cajero es válida

los catálogos fiscales son inmutables

el cache siempre está fresco

Siempre validar y resolver explícitamente.

4. Reglas de implementación obligatorias
   4.1 No hardcodear reglas fiscales en UI

La UI puede renderizar mensajes y estados, pero no debe decidir la clase fiscal válida del comprobante.

La resolución fiscal debe salir del backend.

4.2 No emitir Factura A “a ciegas”

Factura A solo puede emitirse si:

CUIT válido

lookup fiscal exitoso o cache permitida por política

CondicionIVAReceptorId resuelta

tipo de comprobante resuelto como A

backend devuelve allowed = true

4.3 No perder trazabilidad

Todo flujo fiscal debe poder reconstruirse con:

saleId

fiscalJobId

fiscalDocumentId

receiverSnapshot

XML request/response

error code normalizado

error code ARCA si existe

4.4 No consultar ARCA desde el POS

Nunca implementar llamadas directas desde frontend a servicios ARCA.

Todo pasa por backend propio.

4.5 No acoplar worker a estado de UI

El worker fiscal nunca debe leer:

estado del formulario

tipo solicitado desde memoria temporal

lookup no persistido

Debe trabajar solo con el payload del fiscal job.

5. Reglas de diseño de código
   5.1 Casos de uso explícitos

Cuando implementes, preferí casos de uso claros:

LookupTaxpayerUseCase

ResolveDocumentClassUseCase

PrepareFiscalSaleUseCase

CreateFiscalJobUseCase

EmitFiscalDocumentUseCase

Evitar controladores gordos o servicios “utility” que mezclen todo.

5.2 Tipado fuerte

Usar tipos/contratos explícitos para:

snapshots fiscales

resultados de lookup

resolución de clase

payloads internos de fiscal job

errores normalizados

No usar any salvo frontera estrictamente necesaria.

5.3 Validación en borde

Validar en el borde de entrada:

params

body

query

formato CUIT

tipos de comprobante

Usar schemas consistentes.

5.4 Repositorios sin lógica de negocio

Repositorios deben:

leer

escribir

upsert

invalidar

loggear

No deben decidir si corresponde Factura A.

5.5 Servicios puros donde convenga

La lógica de resolución de clase debe vivir, idealmente, en un servicio puro testeable.

Ejemplo:

InvoiceClassResolver 6. Reglas de documentación
6.1 Docs-first

Antes de cambios grandes, actualizar o crear docs en docs/ARCA/.

6.2 Documentación ejecutable

Los documentos deben ser útiles para implementar, no solo para describir.

Preferir:

contratos

tablas

tipos

pasos

decisiones

criterios de aceptación

6.3 Mantener consistencia documental

Si un cambio afecta:

SQL

APIs

flujo POS

worker fiscal

observabilidad

actualizar el documento correspondiente.

7. Reglas de UX para POS
   7.1 Lenguaje operativo

La UI debe hablar como caja/operación.

No mostrar:

SOAPAction

cms.cert.untrusted

CondicionIVAReceptorId

stack traces

códigos internos sin traducción

7.2 Resolver, no confundir

La UI debe mostrar:

tipo solicitado

tipo resuelto

si puede emitir

por qué no puede emitir

qué alternativa sugiere el sistema

7.3 Reducir fricción

El flujo ideal debe requerir:

un selector de clase

un campo CUIT

una confirmación

8. Reglas de errores
   8.1 Error normalizado obligatorio

Todo error relevante debe mapearse a un código de dominio.

Ejemplos:

INVALID_CUIT

TAXPAYER_NOT_FOUND

DOCUMENT_CLASS_NOT_ALLOWED

WSAA_AUTH_FAILED

WSFE_REJECTED

8.2 Separar error interno de mensaje UI

Siempre producir:

código interno estable

mensaje operativo simple

8.3 Retry solo cuando tenga sentido

Retry en:

timeout

5xx

indisponibilidad transitoria

No retry en:

CUIT inválido

clase no permitida

request fiscal inválido

rechazo funcional de ARCA

9. Reglas de observabilidad
   9.1 Logs estructurados

Cada evento relevante debe emitir log estructurado.

9.2 Correlation IDs

Usar y propagar:

requestId

saleId

fiscalJobId

fiscalDocumentId

9.3 No loggear secretos

Nunca loggear:

private keys

token WSAA

sign WSAA

secretos de certificados

10. Reglas para SQL y persistencia
    10.1 Cache fiscal por ambiente

Todo cache fiscal debe considerar environment (homo / prod).

10.2 Snapshot persistido

Cada comprobante emitido debe guardar snapshot de receptor.

10.3 Secuencia fiscal consistente

Cualquier cambio que toque secuencia fiscal debe tratarse con máximo cuidado y pruebas claras.

11. Reglas para integración externa
    11.1 Adaptadores bien delimitados

Clientes externos deben estar encapsulados como adapters/gateways.

Ejemplos:

TaxpayerRegistryGateway

WsaaService

WsfeClient

11.2 No filtrar SOAP al dominio

El dominio no debe contaminarse con XML crudo salvo en bordes de infraestructura y persistencia de auditoría.

11.3 Normalización obligatoria

Toda respuesta externa debe normalizarse antes de ser usada por la aplicación o la UI.

12. Reglas para Codex al modificar código existente
    12.1 No romper flujos ya validados

Si producción ya emite, no romper el motor fiscal existente.

12.2 Cambios incrementales

Preferir cambios pequeños y revisables.

12.3 Proyecto siempre compilable

Cada lote debe dejar el proyecto en estado compilable.

12.4 No tocar más de lo necesario

Modificar el mínimo conjunto de archivos necesario para el objetivo del lote.

13. Lo que sí debe hacer el agente

proponer contratos claros

crear migraciones versionadas

mantener backend-first

documentar decisiones importantes

agregar tests

agregar logs estructurados

pensar en soporte y operación, no solo en código

14. Lo que no debe hacer el agente

no inventar reglas fiscales no documentadas

no hardcodear decisiones complejas en frontend

no mezclar lookup con emisión

no guardar private keys en tablas sin criterio de seguridad

no emitir Factura A sin validación positiva

no ocultar mismatches entre tipo solicitado y resuelto

no devolver mensajes ambiguos al operador

15. Formato de respuesta esperado del agente

Cuando se le pida implementar algo, debe responder siguiendo esta estructura:

1. Archivos a tocar

Lista concreta de archivos nuevos/modificados.

2. Cambios a realizar

Resumen breve y técnico.

3. Implementación

Código o diff.

4. Resultado

Qué quedó listo.

5. Riesgos o pendientes

Qué falta o qué conviene revisar.

16. Plantilla breve para prompts futuros

Usar esta base en nuevos pedidos:

Trabaja sobre NODUX en el dominio fiscal POS + Factura A.

Reglas:

- backend-first
- snapshot-first
- no lógica fiscal en frontend
- worker fiscal consume snapshots cerrados
- no romper el motor fiscal existente
- cambios incrementales y compilables
- logs estructurados
- tipado fuerte
- documentación consistente en docs/ARCA/

Objetivo del lote:
[DESCRIBIR AQUÍ]

Antes de implementar:

1. enumera archivos a tocar
2. resume cambios
3. implementa
4. resume resultado y pendientes
5. Criterios de aceptación del proyecto fiscal POS

El dominio queda correctamente implementado cuando:

el POS puede autocompletar receptor por CUIT

el backend resuelve A/B/C/M

Factura A se bloquea cuando no corresponde

el fiscal job transporta snapshot fiscal cerrado

el worker emite con CondicionIVAReceptorId

el documento emitido guarda snapshot completo

soporte puede diagnosticar errores sin abrir código

18. Checklist canónico
    [ ] Backend resuelve lookup por CUIT
    [ ] Backend resuelve clase de comprobante
    [ ] POS muestra solicitado vs resuelto
    [ ] POS bloquea A inválida
    [ ] Fiscal job incluye receiverSnapshot
    [ ] Worker emite con receiverSnapshot
    [ ] Worker incluye CondicionIVAReceptorId
    [ ] fiscal_documents persiste snapshot
    [ ] errores están normalizados
    [ ] logs estructurados están presentes
    [ ] docs/ARCA están alineados
19. Uso recomendado

Este documento debe usarse como instrucción canónica cuando se trabaje sobre:

POS fiscal

Factura A

lookup por CUIT

padrón fiscal

CondicionIVAReceptorId

integración entre checkout y worker fiscal
