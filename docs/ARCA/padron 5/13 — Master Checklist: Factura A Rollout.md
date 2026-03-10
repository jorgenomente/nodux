13 — Master Checklist: Factura A Rollout

Estado: Release preparation
Ámbito: Backend / POS / Fiscal Worker / Infraestructura / Operación
Objetivo: garantizar que el flujo de Factura A por CUIT esté correctamente preparado para pasar por:

Dev → QA → Homologación → Producción

sin romper la operación de caja.

1. Alcance del rollout

Este rollout habilita en NODUX:

✔ ingreso de CUIT en POS
✔ autocompletado de datos fiscales
✔ resolución automática de tipo de comprobante
✔ bloqueo de Factura A inválida
✔ emisión vía ARCA con CondicionIVAReceptorId
✔ persistencia de snapshot fiscal

2. Arquitectura final esperada

El flujo completo debe ser:

POS
↓
Sales API
↓
LookupTaxpayerUseCase
↓
ResolveDocumentClassUseCase
↓
PrepareFiscalSaleUseCase
↓
CreateFiscalJob
↓
Fiscal Worker
↓
WSAA
↓
WSFE
↓
ARCA

Y el documento final debe persistirse en:

fiscal_documents

con snapshot fiscal.

3. Checklist de base de datos

Antes de desplegar verificar:

[ ] migración fiscal_taxpayer_cache aplicada
[ ] migración fiscal_taxpayer_lookup_log aplicada
[ ] migración fiscal_reference_condicion_iva_receptor aplicada
[ ] columnas snapshot agregadas a fiscal_documents
[ ] índices creados
[ ] foreign keys correctas
[ ] timestamps automáticos funcionando 4. Catálogo fiscal cargado

La tabla:

fiscal_reference_condicion_iva_receptor

debe contener los valores oficiales de ARCA.

Verificar:

[ ] Consumidor Final
[ ] Responsable Inscripto
[ ] Monotributista
[ ] Exento
[ ] No categorizado

Campos mínimos:

id
codigo_afip
descripcion
permite_factura_a
permite_factura_b
permite_factura_c
permite_factura_m 5. Verificación del certificado ARCA

Confirmar:

[ ] certificado homologación instalado
[ ] certificado producción instalado
[ ] private key segura
[ ] configuración WSAA correcta

Validar con comando manual:

LoginCms

y verificar obtención de:

Token
Sign 6. Verificación WSAA

Pruebas obligatorias:

[ ] obtener TA homologación
[ ] renovar TA automáticamente
[ ] validar expiración
[ ] retry ante timeout

Debe existir:

WsaaService

con:

getValidAccessTicket() 7. Verificación WSFE

Probar en homologación:

FECAESolicitar

Casos mínimos:

[ ] Factura B consumidor final
[ ] Factura A responsable inscripto
[ ] rechazo por tipo inválido
[ ] emisión con observación

Confirmar persistencia:

CAE
CAEFchVto
CbteTipo
CbteNro
PtoVta 8. Verificación Lookup CUIT

Probar:

CUIT válido
CUIT inválido
CUIT inexistente
CUIT monotributista
CUIT responsable inscripto

Confirmar:

[ ] cache se guarda
[ ] cache se reutiliza
[ ] cache expira
[ ] lookup log se registra 9. Verificación resolución de clase

Casos obligatorios:

CUIT condición IVA solicitado esperado
Responsable inscripto RI A permitido
Monotributista MONO A bloqueado
Consumidor final CF A bloqueado
Exento EX A permitido o política 10. Verificación UI POS

El POS debe mostrar:

CUIT
Razón Social
Condición IVA
Estado registral
Clase solicitada
Clase resuelta

Y estados:

loading
success
blocked
error 11. Comportamiento esperado del POS
Caso 1

CUIT válido responsable inscripto.

Factura A habilitada
Botón emitir activo
Caso 2

CUIT monotributista.

Factura A bloqueada
Sugerir Factura B
Caso 3

CUIT inválido.

error inmediato
no consulta backend
Caso 4

padrón caído pero cache vigente.

warning
permitir continuar 12. Verificación fiscal job

El fiscal job debe incluir:

saleId
requestedClass
resolvedClass
receiverSnapshot
environment

Confirmar:

worker no consulta padrón
worker usa snapshot 13. Verificación snapshot fiscal

Antes de emitir debe existir:

receiverSnapshot

Con:

cuit
razon_social
condicion_iva
estado
domicilio

Y persistirse en:

fiscal_documents 14. Verificación worker fiscal

Worker debe:

leer fiscal_job
construir request WSFE
usar CondicionIVAReceptorId
emitir
persistir resultado

Confirmar que no consulte padrón.

15. Verificación de errores

Probar:

CUIT inválido
padrón no responde
WSAA falla
WSFE rechaza

Confirmar que UI muestre mensajes operativos.

16. Logs obligatorios

Confirmar logs:

taxpayer_lookup_completed
document_class_resolution_blocked
fiscal_document_authorized
fiscal_document_rejected

Todos con:

saleId
fiscalJobId
tenantId
receiverCuit 17. Métricas mínimas

Debe existir instrumentación para:

taxpayer_lookup_total
taxpayer_lookup_cache_hit
fiscal_emission_total
fiscal_emission_authorized
fiscal_emission_rejected
wsaa_errors
wsfe_errors 18. Seguridad

Confirmar:

[ ] private keys no loggeadas
[ ] tokens WSAA no loggeados
[ ] certificados fuera de repositorio
[ ] secrets en variables seguras 19. Pruebas de homologación

Ejecutar flujo completo:

POS
→ CUIT lookup
→ resolución
→ emisión homologación
→ CAE

Confirmar:

CAE válido
XML correcto
persistencia correcta 20. Pruebas de carga

Simular:

10 cajas simultáneas
50 emisiones
100 emisiones

Verificar:

latencia lookup
latencia emisión
worker throughput 21. Validación con negocio real

Antes de producción probar con:

1 negocio piloto
1 punto de venta
facturas reales

Confirmar:

flujo POS natural
errores comprensibles
emisión estable 22. Procedimiento de despliegue

Orden recomendado:

1 deploy DB migrations
2 deploy backend
3 deploy worker
4 deploy POS
5 habilitar feature flag 23. Feature flag recomendado

Usar flag:

enableFacturaACuitFlow

para:

activar gradualmente 24. Plan de rollback

Si algo falla:

desactivar feature flag
volver a flujo anterior
no emitir Factura A automática 25. Monitoreo post deploy

Primeras 24h monitorear:

lookup failures
WSAA errors
WSFE errors
rejections
POS blocking rate 26. Capacitación operativa

Entrenar operadores:

cómo ingresar CUIT
qué significa bloqueo de A
cómo emitir B alternativa

Duración típica:

5 minutos 27. Documentación soporte

Soporte debe tener acceso a:

saleId
fiscalJobId
logs
snapshot receptor
XML request
XML response 28. Criterio de éxito del rollout

El rollout es exitoso si:

> 95% lookup exitosos
> 98% emisiones exitosas
> <2% errores operativos 29. Riesgos conocidos

Riesgos comunes:

padrón ARCA intermitente
latencia WSFE
errores de catálogo fiscal
CUIT mal ingresado 30. Próximo documento recomendado

El último documento que normalmente se crea en esta serie es:

docs/ARCA/14-architecture-map-arca-facturacion-nodux.md

que sería un mapa visual completo de arquitectura fiscal, conectando:

POS
API
Taxpayer Registry
Fiscal Engine
Worker
WSAA
WSFE
ARCA

Ese documento es extremadamente útil para onboarding y debugging.
