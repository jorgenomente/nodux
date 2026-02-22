# Prompts Log

Este archivo registra prompts relevantes enviados al agente.

Formato sugerido:

## YYYY-MM-DD HH:mm — <titulo corto>

**Lote:** <id o nombre>
**Objetivo:** <una linea>

**Prompt**
<texto completo>

## 2026-02-22 10:39 -03 — Onboarding: agregar input de precio proveedor en resolver de productos incompletos

**Lote:** onboarding-incomplete-products-add-supplier-price-input
**Objetivo:** Incluir `precio proveedor` en el formulario rápido de `/onboarding` para productos con información incompleta.

**Prompt**
falto el input de precio de proveedor en /onboarding en informacion faltante

## 2026-02-22 10:36 -03 — Onboarding: resolver rápido de productos con información incompleta

**Lote:** onboarding-products-incomplete-fast-resolver
**Objetivo:** Reemplazar tarea de proveedor primario por una tarea unificada de productos incompletos con edición rápida de campos operativos del producto en `/onboarding`.

**Prompt**
ok todo se ve bien ahora, en /products hay un formulario para agregar nuevo producto, ese formulario en teoria es lo que me indica todos los datos que necesito por producto, estos son los datos que me deben salir para rellenar rapidamente en cada producto desde /onboarding resolver productos rapido. Que en vez de decirme productos sin proveedor primario que me diga productos con informacion incompleta y al darle click alli me sale una lista igual a la que veo ahora pero que me permite agregar mas datos, el resto de los datos que se piden en el formulario que son los mismos que veo cuando le doy a editar, solo que en /onboarding es una manera mas rapida de hacerlo. adaptada para llenar esos datos rapidamente. me explico?

## 2026-02-22 10:05 -03 — Pricing: precio proveedor + % ganancia sugerida por proveedor

**Lote:** supplier-markup-and-product-price-suggestion
**Objetivo:** Agregar `% ganancia sugerida` configurable en proveedores (default 40) y usarlo en `/products` para sugerir `precio unitario` desde `precio proveedor`.

**Prompt**
ahora necesito que en el formulario de nuevo producto haya un input antes del input precio unitario que diga precio de proveedor, este precio de proveedor es el que sirve de base para establecer el precio unitaro final. Si bien el precio de proveedor es la base, no forza a fijar el precio unitario sino debajo del input que me muestre un tootltip que me sugiera el precio unitario que es el 40% segun el proveedor seleccionado. Este porcentaje de ganancia debe ser un input adicional que colocamos al agregar un nuevo proveedor en /suppliers, tambien lo puedo editar al darle editar a los proveedores existentes. Si no esta definido se usa 40% por defecto pero si esta definido me debe indicar como sugerencia el % asignado desde proveedor. Mejor dicho todos los proveedores tener esto por defecto en el input y su base de datos y cuando voy a crear un nuevo proveedor ya me venga el 40% marcado pero editable, y si quiero modificarlo entonces me voy al proveedor deseado y lo edito me explico?

## 2026-02-21 21:19 -03 — Fix /onboarding: searchParams async en Next 16

**Lote:** onboarding-searchparams-promise-fix
**Objetivo:** Corregir error server de `/onboarding` por uso sync de `searchParams` (ahora Promise) en Next.js 16.

**Prompt**
no pasa nada la consola dice esto [HMR] connected
...
Server Error: Route "/onboarding" used `searchParams.result`. `searchParams` is a Promise and must be unwrapped with `await` or `React.use()` before accessing its properties.

## 2026-02-21 21:16 -03 — Onboarding: resolvedor rapido inline para proveedor primario

**Lote:** onboarding-inline-primary-supplier-resolver
**Objetivo:** Evitar salida a `/products` desde onboarding para la tarea de productos sin proveedor primario, habilitando resolucion rapida por fila en la misma pantalla.

**Prompt**
vamos a trabajar sobre /onboarding. la idea que me imagino para hacer esto mas rapido es que por ejemplo en Productos sin proveedor primario al darle resolver ahora no me lleve a http://localhost:3000/products sino que me permita ver los articulos y llenar rapidamente la informacion faltante, puede ser como a modo de tabla o tarjeta pero que sea rapido que yo pueda llenarlo darle ok y seguir rapidamente, se entiende?

## 2026-02-22 00:20 -03 — Onboarding DB-first: jobs de importación, validación, aplicación y pendientes

**Lote:** onboarding-db-foundation-053
**Objetivo:** Implementar base de datos para `/onboarding` con tablas de importación, vista de pendientes y RPCs de flujo (crear job, cargar filas, validar y aplicar), con RLS OA/SA y verificación mínima allow/deny.

**Prompt**
ok adelante

## 2026-02-22 00:35 -03 — Onboarding UI: pantalla operativa de importación CSV y exportes maestros

**Lote:** onboarding-ui-mvp-import-export
**Objetivo:** Implementar `/onboarding` conectada a RPCs nuevas para importar CSV, validar/aplicar, ver pendientes y descargar CSV maestros.

**Prompt**
ok adelante

## 2026-02-21 20:10 -03 — Modulo nuevo: onboarding de datos maestros para productos/proveedores

**Lote:** data-onboarding-master-data-docs-foundation
**Objetivo:** Definir en docs el nuevo modulo `/onboarding` para importacion CSV, pendientes de completitud y exportes maestros, alineado a arquitectura DB-first/RLS-first del MVP.

**Prompt**
hay algo que me gustaria implementar que estotalmente nuevo pero me gustaria conversarlo primero. Sabemos que para que todo funcione de la mejor manera es necesario que tengamos todos los datos que queremos medir, como que todos los productos tengan su proveedor princial, que tengan sus dias de fecha de vencimiento aproximada, que los proveedores tengan todos los datos que si los plazos de pago, si son en efectivo o transferencia etc. Todos los datos que hacen que todo funcione correctamente. Se me ocurre que podemos hacer un modulo de onboarding donde nosotros podamos facilitar esto. Desde aqui por ejemplo seria el sitio donde podriamos incertar un archivo csv, pdf o xlsx, lo mas probable es que sea csv, de otras tiendas que tengan otros sistemas pero tengan al menos esta informacion que describe sus productos. Entonces necesitamos lo basico de esos productos para que el programa funcione sin problemas, y con el tiempo poco a poco entrar en esta pagina para completar los datos que tengamos pendientes, como asignar proveedores a articulos o crear los proveedores en tal caso, aqui podriamos hacer un second entry point sobre crear proveedor para hacerlo mas rapido y sencillo, tambien asignar las fecha de vencimiento aproximado el codigo de barras si aplica del item etc. La idea es que yo desde aqui pueda entender que tengo tareas pendientes por realizar en cuanto a finalizar la configuracion de productos y proveedores y todo lo que se necesite. Que sea un proceso sencillo donde se puedean ir llenando esos datos e ir completando nuestra base de datos que permite que todo este bien. entonces piensa en todos los datos que necesitamos, revisa bien la app y sus docs, piensa cual es la mejor manera de organizar esto y de completar la informacion y que todo este debidamente organizado y que sea facil de usar. Considera tambien quizas crear archivos csv o xlsx maestros que contengan esta info como respaldo para poder descargarlos en cualquier momento y si lo quisiera o quisiera importarlos en otra sucursal. Dime tus pensamientos

perfecto. adelante. despues vemos que mas podemos incorporar

## 2026-02-21 19:30 -03 — Caja: apertura con turno AM/PM, responsable y fecha/hora visible

**Lote:** cashbox-open-session-shift-am-pm-responsible-datetime
**Objetivo:** Reestructurar apertura de caja para usar selector de turno AM/PM, requerir responsable y mostrar fecha/hora del sistema junto al botón de apertura.

**Prompt**
despues en /cashbox en la seccion de abrir caja en el formulario me pregunta tipo: dia turno me gustaria que al seleccionar turno entonces se me active la opcion de AM o PM asi defino cual es el turno asi quitamos lo de la etiqueta. y ademas agreguemos un input donde se coloca el nombre del resposnsable

tambien necesito que por defecto me tome la hora y fecha del sistema y aparezca en algun lugar de ese formulario puede ser justo al lado del boton de abrir caja

## 2026-02-21 19:22 -03 — Caja: exportes solo para cierres + acciones por cierre histórico

**Lote:** cashbox-reports-closed-sessions-only-and-history-actions
**Objetivo:** Aclarar y ajustar la UX de reportes para que se exporten sobre cierres confirmados y habilitar descarga por cada cierre histórico.

**Prompt**
hay algo que tenemos que clarificar y es que tenemos los botones de Exportar CSV
Reporte PDF pero no esta claro cual es el documento que se exportara, por ejemplo ahora mismo veo esos botones y la caja esta cerrada, entonces se supone que con cada nueva caja es que se activa el reporte o como seria? deberian solo habilitarse luego de cerrar caja y que haya sucedido correctamente recien ahi deberia invitarme a descargar el reporte. que pasa si despues quiero obtener el reporte de una caja anterior o de hace dos dias? quizas podriamos agregr un boton de accion en la seccion de ultimos cierres que diga descargar pdf asi puedo descargarlo por si lo quiero ver. que te parece?

## 2026-02-21 19:13 -03 — Caja: fix error SQL "session_id is ambiguous" al cerrar

**Lote:** cashbox-close-rpc-ambiguous-session-id-fix
**Objetivo:** Corregir error en cierre de caja por referencia ambigua de `session_id` en `rpc_close_cash_session`.

**Prompt**
intente cerrar caja y me dice Error: column reference "session_id" is ambiguous. podemos chequear que pasa?

## 2026-02-21 19:08 -03 — Caja: separar CTA de cierre del bloque de conteo

**Lote:** cashbox-close-cta-separated-from-count
**Objetivo:** Separar la acción final de cierre (firma/confirmación/botón) del bloque de conteo de efectivo y ubicarla al final, después de conciliación.

**Prompt**
creo que lo que en realidad quiero hacer es separar el CTA de cerrar caja todo lo que dice Controlado por (firma operativa)
Nombre y apellido
Observación (opcional)
Motivo de diferencia, observaciones, etc.
Confirmo el cierre de caja para esta sucursal.
mas el boton me gustaria separarlo de esa seccion de conteo de efectivo, que en vez de cerrar caja deberia llamarse asi porque eso es lo que se hace en ese punto, y colocarlo al final despues de la conciliacion porque en teoria alli es cuando se que todo esta bien. puede ser en una seccion aparte alli de bajo, se entiede?

## 2026-02-21 19:01 -03 — Caja: reporte exportable para compartir (CSV + PDF imprimible)

**Lote:** cashbox-export-report-csv-pdf
**Objetivo:** Implementar reporte de caja ordenado para compartir con dueño/administración, con salida CSV y vista imprimible en PDF.

**Prompt**
necesito poder crear un archivo pdf o csv o xlsx, no estoy seguro de cual es el mejor formato, me ayudas a definirlo? La idea es crear un reporte de esta caja que se le pueda enviar al dueno o al que corresponda, que tenga todos estos datos importantes de manera ordenada que sea facil de entender. que piensas?

adelante

## 2026-02-21 18:48 -03 — Caja: mover sección de cierre al final

**Lote:** cashbox-close-section-reorder
**Objetivo:** Reordenar `/cashbox` para ubicar “Cerrar caja” después de “Movimientos de la sesión”.

**Prompt**
ok me gustaria mover la seccion de cerrar caja hacia el final, despues de la seccion de movimientos de la sesion

## 2026-02-21 18:45 -03 — Caja: desglose visible del efectivo en sistema en conciliación

**Lote:** cashbox-cash-system-amount-breakdown-detail
**Objetivo:** Mostrar en `/cashbox` un desglose claro de cómo se compone el monto de efectivo en sistema (aperturas, ventas cash, ingresos, egresos proveedor y egresos manuales con detalle).

**Prompt**
me gustaria ver en esta pagina un desglose de los montos del efectivo. dice monto en sistema y dice una cantidad de efectivo pero me gustaria que hubiera una seccion de desglose de lo que eso implica y los montos por ejemplo en reserva esto en caja esto, esto de este pedido que se pago en efectivo esto de este gasto y esto de este egreso, como entender que es lo que compone ese monto. me explico?

## 2026-02-20 15:25 -03 — UX montos: corregir bloqueo > 3 dígitos en formato AR

**Lote:** amount-inputs-ar-parser-fix
**Objetivo:** Permitir escribir montos largos con separador de miles AR en todos los inputs de monto que usan `AmountInputAR`, sin bloqueo al superar 3 dígitos.

**Prompt**
creo que no me explique bien. la idea es poder diferenciar cuando quuiero escribir una cantidad como 100mil que yo pueda ver como hay una separacion cada 3 digitos para facil lectura, de acuerdo a la configuracion actual no puedo escribir mas de 3 digitos por alguna razon, asi que vamos a trabajar sobre eso y corregirlo en todos los lugares donde haga falta

## 2026-02-21 18:37 -03 — UX montos: fix de borrado que forzaba coma decimal

**Lote:** amount-inputs-ar-delete-backspace-fix
**Objetivo:** Evitar que al borrar dígitos en montos con miles (ej. `1.000`) el input se convierta en decimal (`1,00`) y complique la edición.

**Prompt**
estoy teniendo otro problema es que cuando tengo una suma de mas de 3 digitos y le doy al boton delete para borrar un digito, entonces aparece una , que complica todo porque ahora es como todo con decimales y tengo que borrar todos para seguir es raro, puedes chequear eso?

## 2026-02-20 12:35 -03 — Caja: conciliación con input manual por fila y agregado MercadoPago

**Lote:** cashbox-reconciliation-inputs-mercadopago-total
**Objetivo:** Permitir cargar monto de comprobante por fila de conciliación en `/cashbox`, mostrando diferencia contra sistema y agrupando MercadoPago en una sola fila total.

**Prompt**
perfecto ahora quiero trabajar sobre /cashbox hay una seccion de Conciliación por medio y dispositivo
Compara los totales del sistema por método y por posnet contra tus comprobantes del turno. esto necesito que funcione de la siguiente manera me tiene que salir en la lista los dispositivos usados junto con el monto que registro el sistema. Yo por mi parte debo tener a la derecha un input vacio donde yo coloco la informacion que me arroja el dispositivo. Entonces si con posnet central el sistema registra 30mil pesos yo en el input vacio voy a colocar lo que veo en el resumen de mi posnet que si todo esta bien deberia coincidir si no entonces entiendo que hay alguna orden que no esta bien pasada. me explico? el tema es que cuando se trata de mercadopago, el monto que yo veo es la suma de todas las transacciones sin importar el medio entonces hay que buscar la manera de agrupar los resultados de mercadopago, creo que eso afecta un poco la arquitectura de los medios de pago pero queria conversarlo para ver si se te ocurre algo

adelante

## 2026-02-20 12:46 -03 — Seed operativo caja: ventas de hoy + pedido controlado pagado en efectivo

**Lote:** cashbox-today-seed-sales-and-cash-payment
**Objetivo:** Insertar datos de prueba para validar `/cashbox` con ventas de hoy y reflejo de pago proveedor en efectivo sobre pedido reconciliado.

**Prompt**
ok ahora hagamos insert ahora de los datos de pruebas, agreguemos tambien ventas realizadas hoy para probar esto de la caja, asi como tambien pedidos controlados y pagados en efectivo para ver como se refleja en /cashbox

## 2026-02-20 12:51 -03 — Script reusable por defecto para seed de caja

**Lote:** cashbox-default-seed-script
**Objetivo:** Dejar un script reusable y comando npm para insertar escenario de prueba de `/cashbox` en futuras corridas.

**Prompt**
dale si deja este script por defecto para insertar datos de prueba en el futuro

## 2026-02-20 14:34 -03 — Seed caja: pedido sent con items para control manual

**Lote:** cashbox-default-seed-script
**Objetivo:** Ajustar `db:seed:cashbox` para crear pedido en `/orders` con items y cantidades > 0, listo para control manual y validación de caja en efectivo.

**Prompt**
vamos a incorporar en este scripts que en la parte de pedidos haya proveedores con items porque en este momento me lo muestra en 0 y no me sirve para la prueba necesito poder yo meterme controlar un pedido para ver como queda la caja en efectivo

## 2026-02-20 14:44 -03 — Caja: incluir efectivo esperado total en conciliación

**Lote:** cashbox-reconciliation-cash-expected-row
**Objetivo:** Ajustar conciliación de `/cashbox` para mostrar efectivo esperado total + dispositivos + MercadoPago total, evitando que quede solo MP.

**Prompt**
hay algo que debemos chequear con respecto a la seccion de Conciliación por medio y dispositivo. ya que en este momento solo me esta mostrando lo de mercado pago, creo que el error fue cuando antes agrupamos a los tipos de pago dentro de mercadopago eso quizas desconfiguro todo. necesito que alli me salga lo que el sistema registro en efectivo: este monto me indica cuanto efectivo deberia existir en total junto con la caja y la reserva entoces este monto lo obtenemos automaticamente cuando se colocan alli los montos de caja y reserva al cierre, despues son los montos segun el dispositivo cobrado y despues los que fueron con mercadopago. no se si me explico

## 2026-02-20 14:52 -03 — Caja: tarjeta en dispositivo MP debe seguir como tarjeta

**Lote:** cashbox-reconciliation-mp-method-clarification
**Objetivo:** Evitar que cobros con método `card` y dispositivo MercadoPago se agrupen en MercadoPago total; MercadoPago debe depender del método elegido.

**Prompt**
hay algo que me estoy dando cuenta que esta mal hecho. cuando en el pos yo proceso una venta y selecciono tarjeta debito/credito y selecciono el dispositivo mercadopago principal me lo esta contando en mercadopago. Hay que aclarar algo, si selecciono metodo de pago tarjeta debito/credito y luego el dispositivo, es para seleccionar el dispoisitvo con el que cobre, el error mio esta en nombrarlo mercadopago posnet, ahi deberia tener otro nombre como payway o nave, y deberia verse eso como cobro con tarjeta. para eso en el boton de mercadopago ya tengo el boton de seleccion de posnt mp. entonces creo que ahi esta la confusion

## 2026-02-20 15:02 -03 — Caja: mostrar automáticamente conteo de cierre en conciliación

**Lote:** cashbox-live-close-count-in-reconciliation
**Objetivo:** Reflejar en conciliación el total contado de cierre (caja + reserva) antes de cerrar caja, para visualizar sobrante/faltante en tiempo real.

**Prompt**
bien. ahora para cerrar la caja uno coloca los billetes que hay en caja y en reserva y te da un monto estimado, ese monto es el que tiene que aparecer automaticamente abajo en la conciliacion antes de que yo le de a cerrar caja asi puedo ver si me sobra o me falta algo. se entiende?

## 2026-02-20 15:07 -03 — Caja: desglose del esperado en efectivo para facilitar cierre

**Lote:** cashbox-expected-cash-breakdown-visibility
**Objetivo:** Mostrar desglose explicativo del esperado en efectivo (aperturas, ventas cash, ingresos, egresos proveedor y otros egresos) para ayudar al cierre operativo.

**Prompt**
es posible colocar una especie de desglose de lo que esta contando el sistema en el conteo en efectivo que pueda ayudar a quien hace la caja, por ejemplo: monto de apertura en caaja y reserva, egresos de pago a proveedor y egreso por compra de libreria, por poner un ejemplo, es eso posible?

## 2026-02-20 15:15 -03 — UX montos: formato AR en inputs de importes altos

**Lote:** amount-inputs-ar-format-ux
**Objetivo:** Mejorar legibilidad de montos grandes en inputs usando separador de miles argentino (`100.000`) en campos críticos.

**Prompt**
hoy en dia los inputs de montos son confusos porque los numeros son planos, en argentina se usa mucho los 100000 y la idea es que se vea 100.000 mas que todo para enteneder los montos en los inputs de manera mas facil. podemos hacer esto en aquellos inputs que necesiten cantidades grandes como montos? Explora los inputs a los que les podemos dar esta configuracion mas que todo para mejorar la experiencia del usuario a la hora de colocar montos

## 2026-02-20 15:17 -03 — Extensión formato AR a más inputs de montos

**Lote:** amount-inputs-ar-format-ux
**Objetivo:** Extender formateo de miles AR a más inputs críticos de monto/precio tras revisión de formularios.

**Prompt**
adelante

## 2026-02-20 10:39 -03 — Ventas: historial/detalle + conciliación de caja por dispositivo

**Lote:** sales-history-detail-cashbox-device-reconciliation
**Objetivo:** Incorporar pantalla de ventas auditable y reforzar caja con desglose por método/dispositivo para control rápido de cierre.

**Prompt**
hay una parte clave del programa que olvidamos crear que es la parte donde puedo ver cada orden realizada en particular, donde pueda ver su informacion, los items, la hora, el monto, el metodo de pago, y donde pueda modificar por ejemplo el metodo de pago seleccionado en caso de que haya sido un error para que quede bien el control de caja. aqui seria util poder ver y organizar esa informacion de acuerdo a lo que yo necesite por ejemplo buscar resultados por monto, o por metodo de pago o por hora o por items, debo poder hacer esto muy facil porque es un punto de dolor a la hora de hacer caja el poder ubicar informacion rapidamente. que piensas? como hacemos esto sin romper nada

Exacto, esta informacion sobre cuanto ingreso a traves de los diferentes medios de pago va a ser util para mostrarla en caja y el que cierra caja va a tener que comparar esa info para determinar que entonces todo esta bien. coloca los montos que indican cada posnet y el efectivo y todo eso y ahi si es una resta todo deberia dar 0. esta informacion debe guardarse como resumen debe ser visible facil de leer y enviable, pero me estoy adelantando solo queria que tuvieras en mente que esta es la manera en que se me ocurre que deberia funcionar la caja

## 2026-02-20 11:07 -03 — Ventas: default por sucursal activa de POS

**Lote:** sales-default-pos-branch
**Objetivo:** Alinear flujo natural POS→Ventas para que `/sales` abra por defecto en la sucursal activa del POS.

**Prompt**
acabo de registrar unas ventas y no veo nada en /sales esto tiene que ser mas sencillo. Me tiene que salir una lista con las ventas del dia directamente y los filtros esten ocultos para cuando los necesite

ok pero no entiendo por que no veo las ventas que acabo de procesar en el pos en /ventas. es como que si no estuviera leyendo los datos o esta mal configurado o hace falta hacer algo para que aparezcan

lo estoy haciendo. estoy yendo a pos estoy procesando compras y luego voy a /sales y ver ventas de hoy pero me dice No hay ventas para los filtros seleccionados. vamos a establecer que por defecto en los filtros se seleccione la sucursal que esta en el pos porque ese es el flujo natural estar en una misma sucursal a menos que rara vez se quiera ver cosas en otra sucursal

## 2026-02-20 12:01 -03 — Sales detail: corrección de pago visible sin desplegables

**Lote:** sales-detail-visible-payment-correction-controls
**Objetivo:** Hacer más rápida y clara la corrección de método de pago en `/sales/[saleId]` con botones visibles y reglas operativas por canal/dispositivo.

**Prompt**
estoy en /sales/id y veo que hay un formulario para corregir el metodo de pago y veo que hay mas metodos de los que deberia ver. En tal caso serian efectivo debito/credito y mercadopago. al seleccionar debito/credito deberia aparecer los dispositivos, si selecciono mercadopago entonces me dice si fue con posnet o qr o transferencia a alias. Necesito que todo esto sea mas visible que no dependa de desplegables para evitar hacer tantos clicks, que piensas?

## 2026-02-20 12:13 -03 — POS/Sales: catálogo de métodos compartido

**Lote:** payments-catalog-single-source-pos-sales
**Objetivo:** Evitar doble mantenimiento de métodos/reglas entre POS y corrección en ventas.

**Prompt**
solo para tener en cuenta, si yo hago en el futuro un cambio en el pos por ejemplo agregar un dispositivo mas o algun otro metodo de pago, esto se va a ver cambiado aqui tambien no? no hay que hacer tambien el cambio manualmente desde esta seccion?

hagamos eso entonces asi queda todo mas consistente

## 2026-02-18 14:42 -03 — Orders detail cash: botón junto al bloque y monto visible bloqueado hasta check

**Lote:** orders-detail-cash-row-inline-button-and-disabled-amount
**Objetivo:** Ajustar layout y UX de recepción con pago efectivo para que todo quede visible y alineado.

**Prompt**
quiero que el boton confirmar recepcion no quede alineado hacia la derecha sino simplemente a la derecha de el texto de pago en efectivo realizado y monto exacto pagado. quizas vamos a dejarlo visible siempre pero que este bloqueado y vacio. que solo se active cuando le doy lcick al check de pagado en efectivo asi esta todo visible

## 2026-02-18 14:38 -03 — Orders detail: anotación de monto estimado aproximado

**Lote:** orders-detail-estimate-approx-note
**Objetivo:** Aclarar que el monto estimado es referencial y el real surge de remito/factura.

**Prompt**
agreguemos un tooltip o pequena anotacion que diga que es solo un aproximado. El monto real se muestra en el remito/factura

## 2026-02-18 14:36 -03 — Orders detail: mostrar monto estimado total y estimado por item

**Lote:** orders-detail-show-estimated-total-and-item-estimates
**Objetivo:** Dar visibilidad al estimado del pedido durante recepción/control.

**Prompt**
me acabo de dar cuenta que en /orders/id a la hora de recibir y confirmar el pedido no veo por ningun lado el monto estimado total del pedido. deberia ser el que me indica estimado a la hora re dealizarlo, quizas tambien en los items podriamos agregar el precio estimado

## 2026-02-18 14:30 -03 — Orders: permitir borrar temporalmente cantidad en input

**Lote:** orders-qty-input-allow-empty-editing
**Objetivo:** Mejorar edición de cantidades permitiendo limpiar el input sin forzar `0`.

**Prompt**
en el input de cantidad a pedir de la tabla no puedo borrar el 0 del input me gustaria que eso fuera posible asi es mas facil modificar cantidades

## 2026-02-18 14:27 -03 — Orders: evitar creación de pedido con 0 artículos

**Lote:** orders-prevent-empty-order-creation
**Objetivo:** Bloquear creación de `supplier_orders` cuando no hay ítems válidos.

**Prompt**
ok ahora se mantiene pero el problema es que si se crea en el listado el pedido con 0 articulos, podriamos evitar que se cree el pedido?

## 2026-02-18 14:25 -03 — Orders: conservar contexto draft cuando falla por ítems en 0

**Lote:** orders-draft-context-preserve-on-empty-items-error
**Objetivo:** Evitar perder selección/contexto de armado al fallar validación de ítems.

**Prompt**
por error envie un pedido en 0 unidades y me dice este mensaje Debes agregar al menos un item para crear el pedido. lo que no me gusta es que se me cierra el desplegable y cuando intento abrirlo otra vez, ya no tengo la informacion tengo que volverla a buscar manualmente podemos chequear eso

## 2026-02-18 13:00 -03 — Orders hydration mismatch por estado inicial de vista en cliente

**Lote:** orders-hydration-mismatch-view-state-fix
**Objetivo:** Resolver error de hidratación en `/orders` causado por inicialización cliente divergente.

**Prompt**
me dice esto ## Error Type
Recoverable Error

## Error Message

Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

...
<SegmentStateProvider>
<RenderFromTemplateContext>
<ScrollAndFocusHandler segmentPath={[...]}>
<InnerScrollAndFocusHandler segmentPath={[...]} focusAndScrollRef={{apply:false, ...}}>
<ErrorBoundary errorComponent={undefined} errorStyles={undefined} errorScripts={undefined}>
<LoadingBoundary name="orders/" loading={null}>
<HTTPAccessFallbackBoundary notFound={undefined} forbidden={undefined} unauthorized={undefined}>
<RedirectBoundary>
<RedirectErrorBoundary router={{...}}>
<InnerLayoutRouter url={"/orders?..."} tree={[...]} params={{}} cacheNode={{rsc:<Fragment>, ...}} ...>
<SegmentViewNode type="page" pagePath="orders/pag...">
<SegmentTrieNode>
<OrdersPage>
<PageShell>

<div

-                               className="min-h-screen bg-zinc-50"

*                               className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 ..."
                              >
                                <TopBar>
                                  <div

-                                   className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-..."

*                                   className="text-sm font-semibold text-zinc-900"
                                  >

-                                   <div className="text-sm font-semibold text-zinc-900">

*                                   NODUX
                                    ...
                                ...
                        ...
                      ...
            ...
      ...

  at div (<anonymous>:null:null)
  at TopBar (app/components/TopBar.tsx:49:7)
  at PageShell (app/components/PageShell.tsx:12:7)
  at OrdersPage (app/orders/page.tsx:459:5)

## Code Frame

47 | return (
48 | <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-3">

> 49 | <div className="text-sm font-semibold text-zinc-900">NODUX</div>

     |       ^

50 | <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
51 | {links.map((link) => (
52 | <Link

Next.js version: 16.1.6 (Turbopack)
estoy en http://localhost:3000/orders?draft_supplier_id=44444444-4444-4444-4444-444444444444&draft_branch_id=33333333-3333-3333-3333-333333333333&draft_avg_mode=cycle

## 2026-02-18 12:57 -03 — Orders: confirmación visual al enviar pedido desde armar pedido

**Lote:** orders-create-send-success-feedback-banner
**Objetivo:** Mostrar confirmación clara cuando se envía pedido desde `/orders`.

**Prompt**
otro error que estoy viendo es que al armar nuevo pedido y darle al boton enviar pedido no veo nada que me confirme que el pedido se envio. si se envio porque lo veo en el listado pero es confuso porque no se directamente que ya se envio y esta todo en orden

## 2026-02-18 12:54 -03 — Orders detail: mostrar pago efectivo aunque estado payable sea parcial

**Lote:** orders-detail-header-cash-paid-visibility-partial
**Objetivo:** Evitar que se oculte el bloque de pago efectivo en header cuando hay pago registrado pero el payable no quedó `paid`.

**Prompt**
hice la prueba y confirme el pago y todo y me dice Recepción/control confirmado y pago en efectivo registrado. pero veo Creado: 18/2/2026, 11:40:07 · Enviado: 18/2/2026, 12:08:13 · Controlado: 18/2/2026, 12:52:44
Controlado por: paola zerpa y no veo el metodo de pago y el monto

## 2026-02-18 12:51 -03 — Orders detail: mostrar pago efectivo y monto en info del pedido

**Lote:** orders-detail-header-show-cash-payment-info
**Objetivo:** Exponer en la cabecera del pedido, cuando aplique, que fue pagado en efectivo y el monto.

**Prompt**
perfecto ahora una vez controlado y pagado en ese pedido deberia decirme tambien en la info ademas de creado enviado y controlado que me diga pagado en efectivo y el monto que se pago en la info del pedido

## 2026-02-18 12:49 -03 — Orders detail cash: evitar mensaje de pago no requerido y hacerlo idempotente

**Lote:** orders-detail-cash-idempotent-no-confusing-error
**Objetivo:** Quitar error confuso al reintentar pago efectivo y reflejar claramente cuando ya está pagado.

**Prompt**
intente el nuevo flujo y parece funcionar pero ahora me dice La cuenta por pagar no requiere un nuevo pago en efectivo. no se si se aplico o es porque ya intente marcar el pago antes pero necesitamos ajustar esto para que no suceda. puedes chequear?

## 2026-02-18 12:46 -03 — Orders detail cash: checkbox + monto inline junto a confirmar

**Lote:** orders-detail-cash-checkbox-inline-with-confirm
**Objetivo:** Simplificar UX de control con check de pago efectivo y monto inline, manteniendo guardrails.

**Prompt**
ok vamos a cambiar un poco mas el flujo. el pago en efectivo realizado debe tener un checkmark que lo marco y al marcarlo al lado me debe aparecer el monto exacto pagado. A la derecha de esas dos cosas es que debe estar el boton de confirmar recepcion asi es mas facil. y quitamos el input de monto exacto pagado de arriba

## 2026-02-18 12:38 -03 — Orders detail cash: evitar control al pagar sin monto

**Lote:** orders-detail-cash-action-separation-and-guardrails
**Objetivo:** Separar control vs pago efectivo y asegurar que sin monto no cambie estado del pedido.

**Prompt**
ok estoy teniendo esta dificultad que es que entre en un pedido que estaba pendiente por controlar y le di al boton de pago realizado en efectivo y me sale este mensaje Para registrar pago en efectivo debés ingresar el monto exacto pagado. pero si se proceso el cambio de estado a controlado y ya no puedo modificarlo. entonces tenemos que colocar reglas aca para que esto no suceda. si no hay el monto exacto entonces no deberia cambiar nada. y no deberia confirmarse como controlado al darle click a pago realizado, eese boton es solo para indicar que esta pagado y el de controlado es para indicar que esta controlado

## 2026-02-18 12:14 -03 — Payments: método requerido alineado al perfil actual de proveedor

**Lote:** payments-required-method-live-from-supplier-profile
**Objetivo:** Evitar que `/payments` muestre método requerido desactualizado cuando cambia en `/suppliers`.

**Prompt**
el problema que tengo ahora es que desde proveedores edite el proveedor y cambie el metodo de pago de transferencia a efectivo y cuando voy a pagos pernientes por pagar me sigue mostrando transferencia. no estoy seguro se es porque ya el pedido estaba hecho

## 2026-02-18 12:08 -03 — Orders detail draft: botón Guardar y enviar

**Lote:** orders-detail-draft-save-and-send-button
**Objetivo:** Agregar acción rápida para guardar ítems del borrador y cambiar estado a enviado en el mismo submit.

**Prompt**
excelente ahora al lado del boton de guardar borrador tambien un boton que diga guardar y enviar asi puedo cambiar el estado de ese pedido como para informar que ya lo envie asi cambia el estadoa pendiente por recibir

## 2026-02-18 12:06 -03 — Orders detail draft: editor completo de ítems

**Lote:** orders-detail-draft-full-items-editor
**Objetivo:** Reemplazar flujo de “agregar ítem” por edición completa de artículos sugeridos con buscador y guardado batch.

**Prompt**
ahora en orders/id estoy entrando en un pedido que estaba en borrador y me sale una seccion de agregar item donde lo puedo seleccionar y decir la cantidad y darle agregar, pero ese flujo no es correcto. lo correcto es que alli me salgan todos los articulos en una lista con sus estadisticas y el pedido sugerido todo, como si estuviera armando un pedido y alli puedo modificar lo que yo quiera o buscar el articulo que yo quiera y agregarle una catidad y entonces darle guardar y esa seria la nueva lista de items. no se si se entiende

## 2026-02-18 12:00 -03 — Refresh inmediato tras editar proveedor en `/suppliers`

**Lote:** suppliers-immediate-refresh-after-save
**Objetivo:** Evitar refresh manual para ver cambios al editar proveedor.

**Prompt**
en /suppliers estoy editando el metodo de pago de un proveedor y le di guardar cambios pero esto no se aplica inmediatamente sino que tengo que hacer refresh de la pagina. podemos hacer que los cambios se apliquen de una vez?

## 2026-02-18 11:57 -03 — Fix Server Actions en `/suppliers` (Next 16 Turbopack)

**Lote:** suppliers-server-action-closure-fix
**Objetivo:** Resolver error de runtime en `/suppliers` por funciones no serializables al pasar Server Actions a Client Components.

**Prompt**
estoy teniendo estos isses ## Error Type
Console Error

## Error Message

Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it.
[function deriveAccepts]
^^^^^^^^^^^^^^^^^^^^^^

    at SuppliersPage (app/suppliers/page.tsx:91:26)
    at SuppliersPage (<anonymous>:null:null)

## Code Frame

89 | const shouldOpenNewSupplier = !suppliers || suppliers.length === 0;
90 |

> 91 | const createSupplier = async (formData: FormData) => {

     |                          ^

92 | 'use server';
93 |
94 | const actionSession = await getOrgAdminSession();

Next.js version: 16.1.6 (Turbopack)

## Error Type

Console Error

## Error Message

Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it.
[function deriveAccepts]
^^^^^^^^^^^^^^^^^^^^^^

    at SuppliersPage (app/suppliers/page.tsx:156:26)
    at SuppliersPage (<anonymous>:null:null)

## Code Frame

154 | };
155 |

> 156 | const updateSupplier = async (formData: FormData) => {

      |                          ^

157 | 'use server';
158 |
159 | const actionSession = await getOrgAdminSession();

Next.js version: 16.1.6 (Turbopack)

## Error Type

Console Error

## Error Message

[31m[1m⨯[22m[39m "unhandledRejection:" Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it.
[function deriveAccepts]
^^^^^^^^^^^^^^^^^^^^^^

    at SuppliersPage (<anonymous>:null:null)

Next.js version: 16.1.6 (Turbopack)

## Error Type

Console Error

## Error Message

[31m[1m⨯[22m[39m "unhandledRejection: " Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it.
[function deriveAccepts]
^^^^^^^^^^^^^^^^^^^^^^

    at SuppliersPage (<anonymous>:null:null)

Next.js version: 16.1.6 (Turbopack)

## 2026-02-18 09:47 -03 — Ajuste de datos demo reales + UI colapsable en pagos

**Lote:** payments-orders-demo-data-hardening
**Objetivo:** Reemplazar datos demo genéricos por datos operativos realistas y reducir carga visual en `/payments`.

**Prompt**
quiero que revises los cambios mas recientes. incorporamos el modulo de pagos e incorporamos informacion adicional en el listado de /orders. necesito adaptar los datos de prueba para que tengan cuenta y todos los datos esten llenos correctamente. asi como por ejemplo la fecha que vence el pago. en el listado por ejemplo dice proveedor mensual demo sucursal A, eso es muy generico necesito que tenga nombres reales como para entender mejor. Basicamente revisa todo e incorpora y modifica los datos demos reales. En el modulo de /payments debo ver los pedidos a proveedores del listado de /orders, eso ya sucede, pero los datos de factura y datos de pago debemos ocultarlos para evitar carga visual y que aparezcan como un desplegable al darle click a un boton

## 2026-02-18 10:02 -03 — Sincronizar pagos con pedidos enviados + estado operativo en payments

**Lote:** payments-sync-sent-orders
**Objetivo:** Hacer que `/payments` incluya pedidos ya enviados (no solo controlados), sincronizar históricos y mostrar estado operativo del pedido.

**Prompt**
si necesitamos sincronizar todos los pagos y tienen que aparecer los pedidos que ya han sido enviados, los que estan en borrador no es necesario pero los que ya se enviaron si deben aparecer. en /payments tambien podriamos mostrar el estado si esta en pendiente por recibir o controlado segun los estados que ya se manejan

## 2026-02-18 10:09 -03 — Mostrar método requerido de pago en orders y payments

**Lote:** payment-method-visibility-orders-payments
**Objetivo:** Exponer en UI el método de pago requerido por proveedor y el método seleccionado por cuenta por pagar.

**Prompt**
estoy viendo que en /orders en el listado no me aparece el metodo de pago requerido por el proveedor efectivo o transferencia. Esta configuracion ya existe, no? solo faltaria indicarlo alli lo mismo en /payments

## 2026-02-18 10:39 -03 — Separar pendientes/pagadas y buscador flexible en payments

**Lote:** payments-list-priority-search
**Objetivo:** Mejorar legibilidad del listado de pagos separando facturas pendientes/pagadas y agregando buscador por nombre con tokens libres.

**Prompt**
ok ahora en /payments me gustaria diferenciar las facturas pagadas con las que estan todavia pendiente por pagar. entonces hagamos dos secciones donde abajo colocalmos las que ya fueron pagadas y arriba pendientes por pagar, y que se orden primero la que se vence mas pronto o esta vencida y despues las que todavia tienen mas tiempo. Tambien incorporemos justo debajo del filtro de sucursal, proveedor que una barra de busqueda para buscar por nombre sin importar el orden en el que lo escriba

## 2026-02-18 10:45 -03 — Flujo de pago con fecha/hora + más demos pendientes transferencia

**Lote:** payments-flow-paid-at-and-demo-transfer-pending
**Objetivo:** Aclarar flujo de cambio a pagado, agregar fecha/hora de pago y ampliar seed con más pendientes por transferencia.

**Prompt**
tengo una pregunta. en /payments veo en facturas pagadas algunoas que requierem metodo de pago como transferencia, pero cuando yo le doy registrar pago me sale un formulario vacio. Como es el proceso de cambiar el pedido de pendiente por pagar a pagado? no seria llenando este formulario? en ese formulario hace falta agregar la fecha y hora de pago. Insertemos los datos de prueba necesarios para ver esto como deberia ser asi como colocar nuevas pedidos que esten pendientes por pagar y en transferencia como para visualizar como se veria

## 2026-02-18 10:53 -03 — Quitar chevrons y scroll accidental en todos los inputs numéricos

**Lote:** global-number-input-no-spinner-no-wheel
**Objetivo:** Eliminar controles incrementales y evitar cambios por rueda en todos los `input[type=number]`.

**Prompt**
normalmente en los inputs de numero me salen estas flechitas chevron arriba abajo no me gustan para nada. porque cuando hago scroll me modifican el monto que esta escrito y es molesto. vamos a quitarlas de todo el proyecto. Un ejemplo es el input de monto en registrar pago. si yo hago scroll y paso por el input se me modifica la cantidad y es molesto. podemos hacer eso? ningun input debe tener esta configuracion. simplemente puedo colocar el numero que necesito y ya

## 2026-02-18 10:58 -03 — Número de factura/remito + defaults automáticos en payments

**Lote:** payments-invoice-reference-and-defaults
**Objetivo:** Mejorar formulario de factura/remito en `/payments` con identificador explícito y defaults coherentes.

**Prompt**
excelente. tambien donde dice editar datos de factura vamos a cambiarlo por editar datos de factura/remito y dentro del formulario vamos a agregar un input que este de primero que diga numero de factura/remito que acepte numeros y letras asi se puede identificar la factura/remito. en el input de metodo seleccionado vamos a colocar automaticamente el que esta asignado para el proveedor, donde dice vence el, tambien si ya esta definido colocamos la fecha que ya esta definida todo esto en /payments

## 2026-02-18 11:35 -03 — Botón de pago efectivo al controlar pedido en order detail

**Lote:** orders-detail-cash-payment-at-receive
**Objetivo:** Integrar flujo operativo de pago efectivo al momento de recepción/control en `/orders/[orderId]`.

**Prompt**
ok hay algo mas. Normalmente el pago a los proveedores en efectivo se realizan al momento de la entrega. Entonces cuando el proveedor es en efectivo en /ordersid justo donde esta el boton de confirmar recepcion que es donde se marca controlado el pedido debe haber al lado tambien un boton que diga pago en efectivo realizado asi se determina el flujo en efectivo. No se si me explique. normalmente la misma persona que lo controla lo paga entonces al momento de controlar alli tambien marcamos el pago en efectivo como realizado y aqui es donde se determina que ya esta pago el pago en efectivo. en caso de no marcar este boton entonces queda el pago pendiente pero noramlmente este es el flujo que debe seguir a menos que no haya efectivo disponible entonces ya queda pendiente o se puede aclarar al moemnto de registrar el pago desde /payments que el pago es en transferencia

## 2026-02-18 11:38 -03 — Monto exacto obligatorio en pago efectivo al controlar

**Lote:** orders-detail-cash-payment-exact-amount
**Objetivo:** Exigir monto exacto al marcar pago efectivo en control de pedido y usarlo como monto real de la orden.

**Prompt**
ok esto es importante. al marcar el pago en efectivo realizado debemos especificar el monto exacto que se le dio y este seria el nuevo monto a ser considerado para esa orden ya que antes que eso el monto es solo aproximado

## 2026-02-18 11:53 -03 — Simplificar formulario de pago en proveedores

**Lote:** suppliers-payment-preference-ui-simplification
**Objetivo:** Limpiar UX en `/suppliers` usando solo método de pago preferido y renombrar campo de notas de pago.

**Prompt**
hay algo que no esta muy claro. al registrar proveedor me dice metodo en /suppliers dice metodo preferido eso me gustaria modificarlo que diga metodo de pago preferido. tambien es un poco confuso los checkmark de acepta efectivo acepta transferencia. eso se define a traves de la opcion de metodo de pago preferido asi que quitemos eso. en donde dice nota de pago ese input de texto vamos a cambiarlo por Datos de pago y notas del proveedor asi alli puedo colocar los datos de transferencia.

## 2026-02-13 12:34 — Auditoría operativa end-to-end

**Lote:** audit-log-operational-hardening
**Objetivo:** Verificar cobertura real de auditoría y cerrar gaps en acciones críticas de operación.

**Prompt**
ok. podemos chequear ahora el modulo de auditoria? podemos verifcar que esta funcionando y que se esta tomando en cuenta cada vez que hacemos algo importante por ejemplo cambiar estado de un pedido, agregar vencimientos, modificar fechas, mover articulos a desperdicio, crear proveedor, modificar proveedor etc. Podemos enumerar o definir que conviene auditar para tenerlo en eeste log asi tener control de todo lo que sucede en la app?

## 2026-02-13 12:34 — Remover estado “realizado” del calendario

**Lote:** orders-calendar-remove-sent-state
**Objetivo:** Dejar calendario con 3 estados operativos y quitar “pedido realizado” por redundante.

**Prompt**
Estado operativo sincronizado con pedidos: pendiente por realizar, realizado, pendiente por recibir y recibido/controlado. siento que hay uno que sobra, el realizado lo podemos quitar porque en teoria el pendiente por recibir es un pedido ya realizado

## 2026-02-13 12:34 — Evitar estado duplicado en tarjeta del calendario

**Lote:** orders-calendar-dedupe-status-text
**Objetivo:** Evitar que en la tarjeta de calendario se repita el estado cuando ya se muestra “Estado de pedido”.

**Prompt**
perfecto mucho mejor ahora solo arreglar esto ahora mismo me dice Proveedor Quincenal Demo

Pedido recibido y controlado

Sucursal: Sucursal A

Estado de pedido: Recibido y controlado si te fijas se repite la informacion dos veces, dejemos solo la que dice estado de pedido:

## 2026-02-13 12:31 — Normalizar estados de calendario y detalle de pedido

**Lote:** orders-status-normalization-calendar-detail
**Objetivo:** Corregir inconsistencia entre `/orders/calendar` y `/orders/[orderId]` para operar con 3 estados UI.

**Prompt**
hay algo que no esta cuadrando bien en calendar. tengo uno de los prveedores demo, ese proveedor dice Proveedor Quincenal Demo

Pedido pendiente por recibir

Sucursal: Sucursal A

Estado de pedido: received. me sale un boton que dice ver y controlar, pero cuando entro a ese pedido me dice que ya esta controlado. Entonces hay algo que no esta cuadrando. si esta pendiente por recibir entonces no deberia ser estado received. y menos controlado. podriamos verficiar esto? El pedido solo debe tener 3 estados. pedido pendiente por realizar, pedido pendiente por recibir y pedido recibido y controlado. Si el pedido ha sido controlado entonces el estado de pedido es recibido y controlado. la fecha que debe mostrar es la fecha de controlado que uno coloca al controlar junto con la firma de la persona. Vamos a chequear esto, y dime que ves que no esta bien formulado y dime como lo arreglariamos

## 2026-02-13 10:34 — Comando único reset + seed completo

**Lote:** db-reset-all-command
**Objetivo:** Crear comando único para resetear DB local y poblar usuarios + datos demo MVP.

**Prompt**
ok adelante

## 2026-02-13 10:26 — Seed integral reusable para QA MVP

**Lote:** seed-mvp-full-reusable
**Objetivo:** Crear/ajustar script de datos de prueba reutilizable para validar todo el MVP actual.

**Prompt**
muy bien lo proximo que me gustaria hacer es crear un script que nos permita insertar datos de prueba que nos sirva para probar todo hasta ahora. Esta bien que se borre cuando hacemos el reset pero que ya este escrito digamos para aplicarlo cada vez que queramos hacer pruebas. la idea es que sirva para todo lo que ya hemos hecho ahsta ahora y poder hacer pruebas. como lo ves?

## 2026-02-13 10:26 — Reubicar buscador bajo título de listado

**Lote:** suppliers-list-search-below-title
**Objetivo:** Colocar el buscador justo debajo del título `Listado` en `/suppliers`.

**Prompt**
ok pero coloca el buscador justo debajo de listado

## 2026-02-13 10:25 — Busqueda en vivo en listado de proveedores

**Lote:** suppliers-list-live-search
**Objetivo:** Mover buscador a `Listado` y filtrar automatico desde 3 letras sin boton.

**Prompt**
tambien hay buscador de proveedor. me gustaria que este dentro de listado y que no tenga un boton de filtrar sino que al escribir 3 letras ya empiece a aparecer resultados.

## 2026-02-13 10:20 — Desplegable para nuevo proveedor

**Lote:** suppliers-new-form-collapsible
**Objetivo:** Ubicar la seccion de alta de proveedor dentro de un desplegable en `/suppliers`.

**Prompt**
trabajemos en /suppliers. la seccion de nuevo proveedor podemos ubicarla dentro de un desplegable?

## 2026-02-13 10:58 — Resaltar recepciones vencidas en orders

**Lote:** orders-list-overdue-expected-receive
**Objetivo:** Mostrar alerta visual en pedidos con fecha estimada de recepcion vencida.

**Prompt**
ok hagamos eso tambien

## 2026-02-13 10:46 — Mostrar expected receive en listado de pedidos

**Lote:** orders-list-expected-receive
**Objetivo:** Mostrar `expected_receive_on` en las tarjetas de `/orders`.

**Prompt**
ok hagamos eso tambien

## 2026-02-13 10:34 — Expected receive en detalle de pedido

**Lote:** suppliers-calendar-expected-receive-order-detail
**Objetivo:** Permitir editar expected receive tambien desde `/orders/[orderId]`.

**Prompt**
si hagamos eso

## 2026-02-13 10:08 — Calendario expected receive editable

**Lote:** suppliers-calendar-expected-receive
**Objetivo:** Permitir ajustar fecha estimada de recepcion por pedido y mejorar filtros del calendario.

**Prompt**
Si me gustaria que en caso de que haya proveedores que no es muy claro cuando se recibe, que yo pueda cambiarle la fecha. por ejemplo hay un proveedor mensual que lo pido hoy y no se cuando lo recibo pero por defecto ya esta configurado un miercoles. pero eso quizas no sea correcto y voy a ver ese dia el pedido que se recibe, pero eso no es exacto, entonces puedo modificar el expected receive y colocarle una fecha exacta o estimada que yo desee asi ya me lo quito de encima y no me queda pendiente y tengo mejor control. de igual manera me gustaria que en los filtros de calendar funcione de esta manera. yo selecciono la sucursal, despues el estado y despues el periodo. Solamente cuando yo seleccione la opcion de rango personalizado es que me deben aparecer los inputs de desde hasta. tiene sentido?

## 2026-02-13 10:02 — Iteracion calendario operativo

**Lote:** suppliers-calendar-mvp-ui-v2
**Objetivo:** Mejorar calendario para operacion diaria con filtros y estados sincronizados con pedidos.

**Prompt**
ok me gusta pero ahora vamos a iterar. el calendario debe funcionar para entender que pedido debo realizar esta semana o el dia actual. Tambien para entender que proveedor deberia estar recibiendo. Tambien podria servirme para chequear pedidos realizados anteriormente y recepciones. Entonces debo poder filtrar los resultados. Se me ocurre que haya un filtro de esta semana, este mes, pedientes por enviar, pendientes por recibir. tambien puedo elegir una fecha o periodo por si quiero ver resultados anteriores. Hay un estado dentro de las targetas que dice envio programado. no entiendo si eso se refiere a que ya se hizo el pedido o hay que crearlo ya que dice crear pedido. Desde aqui yo deberia poder acceder al pedido de ese proveedor, tal como lo haria desde orders. seria como una especie de segundo entry point. me gustaria que los estados fueran pedido pendiente por realizar, pedido realizado, pedido pedindiente por recibir, pedido recibido y controlado. Esto debe estar sincronizado con los estados de pedido en orders. por ejemplo desde el calendario puedo entrar y ver el pedido que recibo hoy y controlarlo. una vez marcado como controlado en el calendario debe decir controlado asi como desde orders. Si yo desde orders creo el pedido y lo envio, entonces en el calendario deberia salirme como envio realizado. No se si me estoy explicando bien

## 2026-02-13 09:30 — Implementar calendario proveedores

**Lote:** suppliers-calendar-mvp-ui
**Objetivo:** Implementar modulo de calendario de proveedores en la app con enfoque mobile-first.

**Prompt**
ok adelante, me gustaria implementarlo

## 2026-02-13 09:24 — Propuesta modulo calendario proveedores

**Lote:** suppliers-calendar-discovery
**Objetivo:** Analizar docs/proyecto y definir propuesta de modulo calendario de pedidos/recepciones de proveedores mobile-first.

**Prompt**
Chequea los docs del proyecto, me gustaria incorporar un calendario de proveedores. en teoria ya los proveedores tienen un dia asignado de cuando se realiza el pedido y un dia de cuando se recibe. Con base en toda esa informacin me gustaria crear este nuevo modulo de calendario donde quien hace los pedidos, generalmente admin pero staff tambien lo puede ver para saber que se recibe un dia determinado. Podriamos usar un color para diferenciar el dia que se envia del dia que se recibe. Analiza los docs y el proyecto y dame ideas de como podriamos hacer este nuevo modulo, que documentaacion nueva debemos crear, que debemos actualizar, y cual es la mejor manera de que esto funcione y sea claro. recuerda que es mobile first

## 2026-02-11 15:24 — Vencidos unificados

**Lote:** expirations-expired-unified
**Objetivo:** Unificar vencidos en la lista principal con filtro y mover a desperdicio.

**Prompt**
ok me gustaria unir la seccion de vencidos con la otra secion donde esta el resto de los productos y los vencidos tienen que salir de primero, luego los criticos y asi, desde el vencido hasta el ultimo por vencer. agregamos un boton mas al filtro que diga vencidos junto a todas critico y pronto. asi evitamos ver eso duplicado y es mas ordenado. en los prodcutos vencidos entonces debe habilitarse este boton de mover a desperdicio

## 2026-02-11 15:33 — Auto filtrar sucursal

**Lote:** expirations-branch-autofilter
**Objetivo:** Cambiar sucursal sin boton de filtrar en /expirations.

**Prompt**
cuando yo selecciono sucursal deberia cambiarse la info de una vez y no esperar a que le de al boton filtrar en esta pagina de vencimientos. lo podemos hacer asi?

## 2026-02-11 15:50 — Estado pedido en UI

**Lote:** orders-detail-status-ui
**Objetivo:** Permitir seleccionar estado en UI con controlado via flujo dedicado.

**Prompt**
prefiero un boton donde yo pueda seleccionar el estado. El unico que no puede ser seleccionado sin accion adicional es el de controlado ya que ese requiere que controlemos el pedido tal como ya esta establecido. ese paso es crucial porque alli es donde ingresa el stock

## 2026-02-11 15:58 — Recibido = controlado

**Lote:** orders-detail-status-merge
**Objetivo:** Unificar recibido y controlado en un solo paso de recepcion.

**Prompt**
ok pero recibido y controlado deberia ser el mismo estado ya que cuando se recibe se controla, y recien alli uno se mete a decir si todo esta ok y hacer el ingreso

## 2026-02-11 16:06 — Refrescar estado al enviar pedido

**Lote:** orders-detail-send-refresh
**Objetivo:** Reflejar cambio de estado al enviar pedido sin recargar manualmente.

**Prompt**
cuando el pedido esta en borrador y uso el boton de enviar pedido. no me cambia el estado inmediatamente sino que tengo que actualizar la pagina podemos arreglar eso

## 2026-02-11 16:20 — Estado controlado y autofiltro en pedidos

**Lote:** orders-detail-status-receive
**Objetivo:** Unificar controlado al recibir y auto mostrar sugeridos al elegir proveedor/sucursal.

**Prompt**
tambien hagamos que el controlado por sea obligatorio colocar alli el nombre. veo que me sale la informacion con la fecha del estado dice creado, enviado, recibido controlado. deberia ser solo 3 estados, el de creado debe ser la fecha que se hizo el borrador, me parece que asi esta ahora, luego el enviado es la fecha que se envio. si yo use el boton de enviar pedido entonces la fecha de creado y enviado es la misma. luego el proximo estado es controlado. no necesitamos el de recibido. Tambien despues en http://localhost:3000/orders cuando yo le doy al boton de ver articulos despues de seleccionar proveedor y sucursal, se me cierra el desplegable y tengo que volverlo abrir para ver la informacion, podemos arreglar eso? Es mas, quitemos el boton de ver articulos, y simplemente al seleccionar el proveedor y la sucursal ya deberia aparecerme la informacion

## 2026-02-11 16:28 — Regenerar schema/types

**Lote:** db-schema-types-refresh
**Objetivo:** Regenerar schema y tipos locales para alinear views con DB.

**Prompt**
ok vamos con 2

## 2026-02-11 16:45 — Implementar dashboard

**Lote:** dashboard-mvp
**Objetivo:** Implementar /dashboard con KPIs y alertas basicas.

**Prompt**
dale empecemos

## 2026-02-11 16:57 — Dashboard por sucursal

**Lote:** dashboard-branch-only
**Objetivo:** Forzar selector de sucursal sin opcion "todas".

**Prompt**
ok. en el dashboard hay una especie de filtro que me permite seleccionar todas las sucurasles, sucursal a o b. quitemos el de todas las sucursales para que solo podamos ver los datos de una sucursal deseada.

## 2026-02-11 15:15 — Vencidos vs desperdicio

**Lote:** expirations-expired-separate
**Objetivo:** Mostrar desperdicio solo cuando se confirma el movimiento.

**Prompt**
ok no. me gustaria que solo aparezcan en la seccion de desperdicio cuando yo les de al boton de mover a desperdicio. si no simplemente me aparecen alli como criticos/vencidos. se entiende?

## 2026-02-11 14:46 — Vencidos y desperdicio

**Lote:** expirations-waste
**Objetivo:** Agregar sección de vencidos con acción de mover a desperdicio y cálculo de pérdidas.

**Prompt**
en expirations me gustaria tambien agregar un apartado de vencidos. es decir los productos que ya se vencieron que van a desperdicio. me gustaria que se habilite un boton de mover a desperdicio de aquellos productos que ya se vencieron. Lo mas importante de esta nueva seccion de desperdicio es que se va a calcular el monto en dinero de los desperdicios asi se sabe cuanto se esta perdiendo normalmente por cosas que se vencen. esto quiere decir que en este caso los productos tienen que tener el precio, pero seria solo en esta pagina de desperdicios dentro de vencimientos. que te parece?

## 2026-02-11 14:17 — Mostrar fuera de especiales

**Lote:** orders-showing-separate
**Objetivo:** Mover el texto “Mostrando” fuera de la caja de pedidos especiales.

**Prompt**
pero por fuera de la seccion, porque se confunde. debajo en una seccion aparte

## 2026-02-11 14:16 — Mover mostrando debajo de especiales

**Lote:** orders-showing-below-specials
**Objetivo:** Ubicar el texto “Mostrando” debajo de pedidos especiales pendientes.

**Prompt**
mejor colocalo debajo de pedidos especiales pendientes

## 2026-02-11 13:57 — Mover texto mostrando

**Lote:** orders-showing-text
**Objetivo:** Mover texto de configuración debajo de ajustes sugeridos.

**Prompt**
justo debajo de proveedor y sucursal y ver articulos me sale un texto que me explica la configuracion actual de la busqueda. vamos a moverlo debajo de ajjustes sugeridos y le ponemos un texto antes que diga mostrando: asi ese texto lo que hace es indicarme lo que estoy viendo en los resultados. tiene sentido?

## 2026-02-11 13:32 — Botones borrador/enviar pedido

**Lote:** orders-draft-sent-buttons
**Objetivo:** Separar guardar borrador y enviar pedido en /orders.

**Prompt**
ahora me gustaria que haya dos botones en la seccion de armar pedidos, quiero cambiar el de crear pededido por guardar borrador y agregar un boton mas que diga enviar pedido. esto lo que me permite es que los pedidos se guarden con estados distintos, si le doy a guardar borrador entonces es para terminarlo luego, si le doy a enviar entonces el estado que me aparece en el listado es enviado

## 2026-02-11 11:57 — Colapsar armar pedido

**Lote:** orders-collapsible-builder
**Objetivo:** Hacer colapsable la sección de armar pedido en /orders.

**Prompt**
me gustaria que la seccion de armar pedido sea desplegable asi puedo ahorrar espacio y vista al entrar si no quiero armar un pedido y solo quiero ver la lista

## 2026-02-11 11:52 — Ajuste label promedio

**Lote:** orders-avg-label
**Objetivo:** Renombrar promedio y aclarar uso del selector.

**Prompt**
al input de promedio cambiale el nombre a promedio de ventas y un tooltip o aclaracion que diga se usa para mostrar estadisticas de los articulos, o algo parecido que explique para que es

## 2026-02-11 11:50 — Ajustes sugeridos en pedidos

**Lote:** orders-suggestions-adjustments
**Objetivo:** Mover ajustes de margen/promedio debajo del listado.

**Prompt**
si ahora en /orders vemos que tenemos la seccion de armar pedido dice proveedor, sucursal margen y promedio. me gustaria que fuera solo proveedor y sucursal y el boton de ver articulos. despues de que salen los articulos alli abajo es que deberia salirme lo del margen y el promedio. que sean como ajustes de la tabla y le doy aplicar. esto para que sea mas entendible para el usuario que lo usa. me explico?

## 2026-02-11 10:43 — Refrescar estado pedido especial

**Lote:** clients-status-refresh
**Objetivo:** Reflejar cambio de estado inmediatamente en /clients.

**Prompt**
estoy viendo que si yo intento actualizar el estado del pedido de pendiente a pedido, por ejemplo y le doy a actualizar, tengo que actualizar la pagina para ver el cambio reflejado. es posible que se vea el cambio reflejado inmediatamente esto en clients/id

## 2026-02-11 10:23 — Fix POS: created_at ambiguo

**Lote:** pos-sale-ambiguous-created-at
**Objetivo:** Corregir error 42702 en rpc_create_sale.

**Prompt**
este es el mesaje {
"message": "column reference \"created_at\" is ambiguous",
"details": "It could refer to either a PL/pgSQL variable or a table column.",
"hint": null,
"code": "42702"
}

## 2026-02-11 10:21 — Debug POS venta

**Lote:** pos-sale-debug
**Objetivo:** Exponer error detallado del RPC de venta para diagnostico.

**Prompt**
lo estoy haciendo manual todo funciona bien excepto al final al cobrar que me dice No pudimos registrar la venta. la consola dice esto forward-logs-shared.ts:95 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
forward-logs-shared.ts:95 [HMR] connected
127.0.0.1:54321/rest/v1/rpc/rpc_create_sale:1 Failed to load resource: the server responded with a status of 400 (Bad Request)
no se si podemos hacer un diagnostico me gustaria que haya un log o algo pareceido para determinar que pasa, sabes que podemos hacer?

## 2026-02-11 10:11 — Smoke test POS + seed real

**Lote:** smoke-pos-seed
**Objetivo:** Crear smoke test y datos reales para proveedores, productos, stock y clientes.

**Prompt**
vamos a crear un smoke test para esto. necesito incorporar proveedores, articulos, stock, clientes, etc. que sean nombres reales por ejemplo cafe, mate, chocolate, todo lo necesario para hacer esta prueba. me puedes ayudar con eso?

## 2026-02-11 10:04 — POS: error al cobrar

**Lote:** pos-sale-rls-fix
**Objetivo:** Resolver error 400 al cobrar en POS causado por RLS.

**Prompt**
todo funciona bien excepto al final en el pos cuando le doy cobrar me dice esto la consola forward-logs-shared.ts:95 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
forward-logs-shared.ts:95 [HMR] connected
fetch.ts:7 POST http://127.0.0.1:54321/rest/v1/rpc/rpc_create_sale 400 (Bad Request)
(anonymous) @ fetch.ts:7
(anonymous) @ fetch.ts:34
await in (anonymous)
then @ PostgrestBuilder.ts:122
y la UI me dice No pudimos registrar la venta.

## 2026-02-11 09:51 — Pedidos especiales + POS

**Lote:** special-orders-pos
**Objetivo:** Integrar pedidos especiales con items, proveedores, alertas en pedidos y cobro en POS.

**Prompt**
muy bien me gusta. ahora vamos a trabajar para conectar todo y hacer esto bien funcional. veo que cuando hgo click en el cliente me muestra todo para editar al cliente, esta bien, pero me gustaria que eso aparezca cuando le de click a editar asi no esta siempre visible y me quite espacio. lo mismo para nuevo pedido especial, que me aparezca esa info cuando le de click a nuevo pedido especial. luego debemos encontrar una manera de que esto tambien se sincronice con el stock porque si entregamos algo que se le pidio a un cliente y fue ordenado y entregado eso se debe contar, entonces como se hace para saber que es lo que el cliente esta pidiendo? Supongo que a la hora de crear este pedido especial yo debo seleccionar entre los articulos registrados en la tienda a traves de un buscador y que pueda ir marcando y agregando al pedido lo que estoy pidiendo. Por otra parte tambien me gustaria que se generara una especie de alerta en ese proveedor por ese articulo que estoy pidiendo asi no me olvido. si yo voy a pedidos y selecciono un proveedor deberia alli decirme que tengo que tomar en cuenta tambien tal cliente que esta haciendo tal pedido de encargo. se entiende?

## 2026-02-10 10:15 — Modulo vencimientos (UI)

**Lote:** expirations-module-ui
**Objetivo:** Implementar la pantalla /expirations segun contrato MVP.

**Prompt**
perfecto, empecemos entonces por lo que recomiendes hacer

## 2026-02-10 10:42 — Ajustes UX vencimientos

**Lote:** expirations-module-ui
**Objetivo:** Forzar selección de sucursal, ajustar filtros por días y simplificar alta manual.

**Prompt**
para este caso de vencimientos si me gustaria hacerlo por sucursal, es decir primero selecciono la sucursal y ahi veo los articulos de esa sucursal y sus fechas de vencimientos. deben estar ordenados automaticamente desde los que se vencen mas pronto hasta los que se vencen de ultimo. Las fechas de vencimientos son aproximadas, entonces debemos agregar un boton para corregir y ajustar la fecha de vencimiento para colocar la correcta en caso de que sea necesario. Como ya la sucursal tiene que estar seleccionada para ver los vencimientos entonces al agregar el vencimiento ya no deberia hacer falta seleccionar sucursal. en ese caso veo que hay un desplegable que me permite filtrar por sucursal aunque hay una opcion de todas. esa opcion de todas la quitamos y dejamos solo seleccionar la sucursal especifica. luego tambien los otros filtros de todas, critico, alerta vamos a cambiarlo, el de todas esta bien para ver todos los vecimientos, el de critico coresponde a los items que se vencen en los proximos 3 dias, vamos a agregar otro que diga pronto que corresponde de 4 a 7 dias y esos serian las opciones de filtrar por fecha, asi puedo ver lo mas cercano, pronto o todas

## 2026-02-10 11:15 — Correccion fecha vencimiento (DB + UI)

**Lote:** expirations-date-correction
**Objetivo:** Agregar RPC para corregir fecha de vencimiento y exponerla en /expirations con audit log.

**Prompt**
si hazlo y actualiza los docs que sean necesarios para que este todo documentado

## 2026-02-10 11:35 — Batch code por recepcion

**Lote:** expirations-batch-code
**Objetivo:** Generar batch code por recepcion con prefijo de proveedor y mostrarlo en vencimientos.

**Prompt**
Si exacto, esto quedaria aplicado cuando se confirma la recepccion de acuerdo a la fecha de recibido asi entendemos a que batch corresponde esa cantidad de articulos y si hay varios batches entonces en vencimientos entonces se entiende que corresponde a productos que se recibieron en distinta fecha. tambien eso sirve como para confirmar productos en fisico con respecto a lo que hay en el sistema. me gusta.

## 2026-02-10 12:10 — Auditoria docs vencimientos

**Lote:** expirations-docs-audit
**Objetivo:** Auditar y ajustar docs de vencimientos para reflejar el estado actual.

**Prompt**
me gustaria que contemples en el AGENTS.md si no lo haces ya, que cualquier modificacion adicional, cualquier feature adicional y todos estos tipo de ajustes se vean reflejados y actualizados en su documento correspondiente. Por ejemplo todo esto que hicimos debe verse cambiado en la documentacion de vencimientos, asi podemos tener una documentacion fiel al proyecto. dicho esto realiza una auditoria de lo que hemos implementados y comparalo y verificalo con su documento correspondiente solo para chequear de que es fiel. no debemos cambiar nada de la app sino solo los docs para que siempre reflejen el estado actual del proyecto. Estos docs despues seran mi columna vertebral en caso de que quiera hacer un proyecto parecido o duplicarlo o lo que sea. que piensas?

## 2026-02-10 12:30 — Auditoria docs pantallas MVP

**Lote:** screens-docs-audit
**Objetivo:** Revisar pantallas implementadas y ajustar sus docs para reflejar el estado actual.

**Prompt**
perfecto, ahora revisa las paginas que hemos hecho hasta ahora y comparalas con su doc correspondiente. Asegurate de explicar las funciones y ediciones adicionales que hemos hecho en su respectivo doc asi todo esta mejor explicado y documentado

## 2026-02-10 13:10 — Modulo clientes

**Lote:** clients-module-ui
**Objetivo:** Implementar /clients con lista, detalle y pedidos especiales.

**Prompt**
dale vamos con clients

## 2026-02-09 16:03 — Desplegable ajuste stock

**Lote:** products-collapsible-forms
**Objetivo:** Hacer desplegable el formulario de ajuste manual de stock.

**Prompt**
lo mismo con ajuste manual de stock

## 2026-02-09 16:01 — Busqueda en vivo POS

**Lote:** pos-token-search
**Objetivo:** Disparar busqueda al tipear en POS.

**Prompt**
el buscador deberia funcionar con tipear las letras y no esperar que yo le de click a buscar

## 2026-02-09 15:59 — Busqueda por tokens en POS

**Lote:** pos-token-search
**Objetivo:** Busqueda por tokens con minimo 3 caracteres en /pos.

**Prompt**
tambien en http://localhost:3000/pos en la barra de busqueda por nombres que sea igual. por tokens minimo 3 caracteres para evitar el render de muchos items pero que pueda escribir en cualquier orden o cualquier numero

## 2026-02-09 15:54 — Separar pedidos controlados

**Lote:** orders-list-split
**Objetivo:** Mostrar pendientes arriba y controlados abajo en el listado de pedidos.

**Prompt**
en http://localhost:3000/orders en el listado me gustaria dividir estos pedidos. los controlados los enviamos al final en otra seccion y los pendientes por controlar y enviar y eso que queden arriba

## 2026-02-09 15:52 — Persistir vista sugeridos

**Lote:** orders-suggestions-view
**Objetivo:** Recordar vista tabla/tarjetas en sugeridos.

**Prompt**
te dije que si

## 2026-02-09 15:48 — Toggle tabla/tarjetas en sugeridos

**Lote:** orders-suggestions-view
**Objetivo:** Permitir cambiar vista de sugeridos entre tabla y tarjetas.

**Prompt**
tambien me gustaria poder cambiar la vista de tabla a modo tarjeta asi es mas facil visualizar los datos desde el celular en esa misma pagina en los datos que se muestran

## 2026-02-09 15:46 — Tooltip margen en pedidos

**Lote:** orders-ui-tooltips
**Objetivo:** Agregar tooltip para explicar el margen de ganancia en pedidos.

**Prompt**
tambien en pedidos donde esta el input de margen de ganancia agrega un tooltip o algo que indique que se usa para calcular el costo aproximado del articulo en el proveedor

## 2026-02-09 15:40 — Fix params en order detail

**Lote:** orders-detail-fix
**Objetivo:** Ajustar params async en /orders/[orderId].

**Prompt**
me dice esto la consola forward-logs-shared.ts:95 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
forward-logs-shared.ts:95 [HMR] connected
forward-logs-shared.ts:95 Server Error: Route "/orders/[orderId]" used `params.orderId`. `params` is a Promise and must be unwrapped with `await` or `React.use()` before accessing its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis
at OrderDetailPage (page.tsx:74:26)

## 2026-02-09 15:37 — Link en listado de pedidos

**Lote:** orders-list-link
**Objetivo:** Habilitar navegación al detalle desde el listado de pedidos.

**Prompt**
ahora tenemos que trabajar en el listado. cuando hago click en el pedido no pasa nada. se supone que ahi deberia poder revisar el pedido y cambiarle el estado y confirmar recepcion y todo eso, no?

## 2026-02-09 15:35 — Total de articulos en pedido

**Lote:** orders-cycle-avg
**Objetivo:** Mostrar cantidad total de articulos junto al total estimado.

**Prompt**
luego abajo donde dice total estimado vamos a agregar tambien la cantidad total de articulos en el pedido

## 2026-02-09 15:34 — Redondeo promedio sugeridos

**Lote:** orders-cycle-avg
**Objetivo:** Redondear promedio por ciclo a entero (>= .5 arriba, <= .4 abajo).

**Prompt**
vamos a hacer que el promedio tambien sea numero entero se redondea hacia arriba cuando es .5 o mas o hacia abajo cuando es .4 o menos

## 2026-02-09 15:33 — Selector promedio sugeridos

**Lote:** orders-cycle-avg
**Objetivo:** Agregar selector para ver promedio semanal/quincenal/mensual en sugeridos.

**Prompt**
si dale

## 2026-02-09 15:32 — Promedio por ciclo y cantidades enteras

**Lote:** orders-cycle-avg
**Objetivo:** Mostrar promedio por ciclo del proveedor y forzar cantidades enteras en pedidos.

**Prompt**
ok la cantidad a pedir debe ser numero entero ya que no se piden con decimales. cuando hablamos de proveedor semanales el promedio que aparece en la tabla debe ser semanal, si es quincenal entonces quincenal y cuando es mensual entonces mensual. O quizas podamos hacer click en esa columna donde dicePromedio 30d y quizas ahi pueda cambiar para ver el promedio semanal o quincenal o mensual. que te parece?

## 2026-02-09 15:28 — Seed demo pedidos y ventas

**Lote:** seed-demo-data
**Objetivo:** Insertar datos ficticios de proveedores, productos, ventas y pedidos para probar flujo de compras.

**Prompt**
3 proveedores con 10 productos cada proveedor con distinto historial de ventas unos 3 meses en total como si se hubieran vendido en distintas cantidades durante los ultimos 3 meses. tener proveedores semanales, quincenales y mensuales, 2 preparados 2 enviados y yo le doy a controlar y eso para ver como afecta el stock y eso

## 2026-02-09 15:02 — Control de recepcion de pedidos

**Lote:** orders-controlled
**Objetivo:** Permitir capturar fecha/hora real de recepcion y firma de control al recibir pedidos.

**Prompt**
si ademas que yo pueda colocar la hora exacta y el dia en el que fue recibido y quien lo controla una especie de firma asi por ejemplo si no se agrego directamente apenas llego es posible que se haya vendido algun articulo y entonces el stock este en negativo asi se sabe a que hora ubo el ingreso y auotmaticamente se resuleve que el stock quede bien otra vez

## 2026-02-09 14:00 — Flujo pedidos con sugeridos

**Lote:** orders-inline-suggestions
**Objetivo:** Armar pedido en /orders con sugeridos inline, cantidades editables y margen de ganancia.

**Prompt**
ahora vamos a trabajar en http://localhost:3000/orders aqui yo deberia seleccionar el proveedor y la sucursal y entonces se debe desplegar todos los articulos de ese proveedor junto con las estadisticas de esa sucursal. y alli ver el pedido sugerido todo debe suceder alli mismo. ver el pedido sugerido, modificar la cantidad de articulos si no estoy de acuerdo, luego las notas y luego crear pedido. entonces abajo en el listado me aparece el pedido creado. Tambien debo tener un input de margen de ganancia que me sirve para calcular el precio de los articulos es decir si yo tengo que un articulo cuesta 6000 pesos y el margen de ganancia es de 40% para ese proveedor entonces el costo calculado por articulo desde el proveedor es 6000 - 40% esto para tener un estimado de cuanto voy a gastar en ese pedido. que te parece?

## 2026-02-09 13:49 — Remover asociar producto en proveedor

**Lote:** suppliers-products-list
**Objetivo:** Quitar inputs/CTA de asociar productos y dejar solo listado de productos principales.

**Prompt**
luego en suppliers/id hay un area de productos asociados. Eso lo quiero eliminar y dejar solo el listado de productos/articulos. porque al final del dia esa informacion se agrega cuando se agregan productos nuevos. y si no se agrega, se puede editar directamente desde la lista de productos principales. es decir esos inputs de asociar producto estan demas. quita los inputs con el cta y deja la lista de productos principales

## 2026-02-09 13:42 — Label codigo de barras

**Lote:** products-supplier-inputs
**Objetivo:** Cambiar el label de barcode por codigo de barras en ambos entry points.

**Prompt**
cambia el texto de barcode por codigo de barras en ambos entry points

## 2026-02-09 13:40 — Labels opcionales proveedor

**Lote:** products-supplier-inputs
**Objetivo:** Marcar como opcionales los campos de proveedor en alta de producto.

**Prompt**
esta bien pero agrega entre parentesis (opcional) en ambos entry point

## 2026-02-09 13:36 — Inputs proveedor al crear producto

**Lote:** products-supplier-inputs
**Objetivo:** Ajustar labels de producto y capturar nombre/SKU del proveedor al crear productos.

**Prompt**
http://localhost:3000/products tengo el input para nuevo producto, quiero cambiar el nombre a los inputs el de nombre que diga nombre de articulo en la tienda y agregar un nuevo input opcional de nombre de articulo en proveedor y SKU en proveedor. esto mismo cuando desde suppliers/id intento crear producto nuevo, quiero esos inputs opcionales asi ya esa info queda guardada y asociada.

## 2026-02-08 20:55 — Diagnostico docs y baseline de schema

**Lote:** docs-schema-baseline
**Objetivo:** Diagnosticar consistencia de docs y crear un modelo de schema DB base.

**Prompt**
Np existe schema db en los docs? Consideras que eso podria ser lo proximo? Si haz un diagnostico mucho mas profundo contrastando todos los docs y crea un nuevo doc con el modelo de schema db que nos sirva de base para todo el proyecto. Haz los ajustes recomendados para que esto este listo para empezar en cualquier momento. Por ahora solo hacemos diagnostico y creamos documento nuevo

## 2026-02-08 20:59 — Alinear docs y completar modelo/rls

**Lote:** docs-schema-baseline
**Objetivo:** Alinear index de pantallas y completar docs de modelo de datos y matriz RLS con el baseline.

**Prompt**
Vamos a alinear los docs y completar los docs con el nuevo baseline, las migraciones vamos a esperar un poco

## 2026-02-08 21:25 — Roadmap vivo

**Lote:** docs-roadmap
**Objetivo:** Crear roadmap vivo y actualizar AGENTS para exigir su mantenimiento.

**Prompt**
Ok quiero que entonces de despues de haber chequeado todos los docs del proyecto hagamos un nuevo documento que nos indique un roadmap o una especie de orden en que avanzar primero y que avanzar despues que tenga logica asi sabemos como vamos avanzando y que hemos hecho. este documento debe ser vivo es decir el AGENTS.md debe saber que esto existe y debe actualizarse cada vez que se avance.

## 2026-02-08 21:28 — Cierre Fase 0

**Lote:** docs-roadmap
**Objetivo:** Marcar Fase 0 como completa en el roadmap vivo.

**Prompt**
ok adelante, haz eso y lo proximo seria hacer el schema y la migracion

## 2026-02-08 21:28 — Migracion inicial schema

**Lote:** schema-init
**Objetivo:** Crear migracion inicial con schema y RLS basica, y actualizar docs vivos.

**Prompt**
si

## 2026-02-08 21:30 — Reset DB + snapshot + types

**Lote:** schema-init
**Objetivo:** Aplicar migracion local, generar snapshot y types.

**Prompt**
si haz los 3 pasos

## 2026-02-08 21:36 — Verificacion RLS minima

**Lote:** schema-init
**Objetivo:** Ejecutar pruebas minimas de RLS y ajustar helpers para evitar recursion.

**Prompt**
si hagamos las verificaciones minimas. te consulto, se aplico todo el modelo de schema db? que esta en schema-model.md?

## 2026-02-08 21:50 — Checklist pendientes DB

**Lote:** schema-init
**Objetivo:** Hacer explicito en el baseline el listado de views y RPCs pendientes.

**Prompt**
ok hazlo

## 2026-02-08 22:10 — Migraciones views y RPCs

**Lote:** schema-views-rpcs
**Objetivo:** Crear migraciones de views y RPCs MVP, resetear DB y verificar views basicas.

**Prompt**
ok adelante

## 2026-02-08 22:15 — QA RPCs

**Lote:** schema-views-rpcs
**Objetivo:** Ejecutar QA basico de RPCs MVP.

**Prompt**
hagamos QA'

## 2026-02-08 22:30 — Fase 3 Auth + routing

**Lote:** auth-routing
**Objetivo:** Implementar login/logout/no-access, guards por rol y redirect post-login.

**Prompt**
avanzamos fase 3

## 2026-02-08 22:23 — Fix warnings build

**Lote:** auth-routing
**Objetivo:** Eliminar warnings de Next sobre middleware/proxy y turbopack root.

**Prompt**
podemos arreglar los warnings?

## 2026-02-08 22:28 — Fase 4.1 Productos/Stock

**Lote:** products-stock
**Objetivo:** Iniciar modulo Productos/Stock con ruta y acciones basicas.

**Prompt**
arranquemos por lo que recomiendes

## 2026-02-08 22:48 — Seed usuarios demo

**Lote:** seed-demo-users
**Objetivo:** Crear usuarios de prueba por rol con password unica para QA UI.

**Prompt**
podemos crear usuarios prueba desde aca? creemos un usuario con los distintos roles posibles y que la clave sea prueba123 y que esten bien configurados para probar la UI

## 2026-02-08 22:49 — Doc usuarios demo

**Lote:** seed-demo-users
**Objetivo:** Documentar usuarios demo y referenciar en AGENTS.

**Prompt**
crea un doc con los usuarios y contrasena y haz la referencia en el agents.md para que sepa

## 2026-02-08 23:12 — Fix GoTrueClient warning

**Lote:** auth-routing
**Objetivo:** Evitar multiples instancias de Supabase client en browser y ajustar lint para scripts.

**Prompt**
si hazlo

## 2026-02-08 23:35 — Fix login redirect cookies

**Lote:** auth-routing
**Objetivo:** Usar supabase/ssr client en browser para persistir cookies y habilitar redirect post-login.

**Prompt**
sigue diciendo http://localhost:3000/login quizas es porque cambiamos el nombre de middleware a proxy para evitar el warning o no tiene nada que ver?

## 2026-02-08 23:38 — Fix staff home redirect

**Lote:** auth-routing
**Objetivo:** Permitir resolver home de Staff via RPC efectiva y corregir login redirect.

**Prompt**
ok estoy usando el de staff y me dice http://localhost:3000/no-access

## 2026-02-08 23:43 — Completar Productos/Stock

**Lote:** products-stock
**Objetivo:** Completar CRUD basico y activar/desactivar producto en UI.

**Prompt**
ok sigamos entonces segun lo recomendado

## 2026-02-09 00:06 — Agregar logout en paginas

**Lote:** auth-routing
**Objetivo:** Agregar boton de logout en paginas principales via header compartido.

**Prompt**
agreguemos boton de logout porque ahora mismo no tengo como cambiar de usuario. esto en todas las paginas que vayamos haciendo

## 2026-02-09 00:08 — Fix logout cookies

**Lote:** auth-routing
**Objetivo:** Mover logout a route handler para modificar cookies legalmente.

**Prompt**
cuando hago logout me sale esto ## Error Type
Console Error

## 2026-02-09 00:47 — Stock por sucursal en listado

**Lote:** products-stock
**Objetivo:** Mostrar desglose de stock por sucursal en /products.

**Prompt**
ok enconces como en teoria este es el dueno del negocio, no tiene sentido agregar un selector de sucursal sino que simplemente en el listado donde dice stock total tambien agregar cuantos items corresponde a cada sucursal de ese total, asi se sabe cuanto hay en cada lugar porque solo con el total no me puedo orientar

## 2026-02-04 00:00 — Modelo de datos y matriz RLS

**Lote:** foundations
**Objetivo:** Definir modelo de datos y matriz RLS en docs vivos.

**Prompt**
Crear documentos vivos para modelo de datos y matriz RLS, y actualizar AGENTS para exigir su mantenimiento.

## 2026-02-04 00:00 — Scripts de snapshot y types

**Lote:** foundations
**Objetivo:** Agregar scripts para snapshot de schema y generación de types.

**Prompt**
Agregar scripts en package.json para generar snapshot de schema y types de Supabase.

## 2026-02-04 00:00 — Brief UX/UI para diseñadora

**Lote:** foundations
**Objetivo:** Documentar guía de diseño completa para UX/UI.

**Prompt**
Crear un documento claro y detallado para la diseñadora con pantallas, roles, restricciones y orden recomendado.

## 2026-02-04 00:00 — Claridad en docs de pantallas y módulos

**Lote:** foundations
**Objetivo:** Mejorar legibilidad y guía de diseño en docs existentes.

**Prompt**
Agregar una sección de guía rápida para diseño en docs de pantallas y módulos, sin cambiar requisitos.

## 2026-02-04 10:15 — Commit actual

**Lote:** ops-commit
**Objetivo:** Preparar commit del estado actual con git add .

**Prompt**
haz el commit actual con git add .

## 2026-02-09 03:54 — Audit log en MVP (docs)

**Lote:** audit-log-mvp-docs
**Objetivo:** Agregar auditoria de acciones al MVP y actualizar docs para data model, RLS y contratos.

**Prompt**
vamos a agregarlo al MVP hacia la parte final, crea los nuevos docs si hacen falta y actualiza los docs que sean necesarios para que todo esto quede bien documentado e integrado en el proyecto

## 2026-02-09 03:54 — Implementacion audit log MVP

**Lote:** audit-log-mvp-impl
**Objetivo:** Implementar audit log end-to-end (DB + RLS + view/RPC + UI) y actualizar snapshot/types.

**Prompt**
ok adelante

## 2026-02-09 12:30 — Implementar POS MVP

**Lote:** pos-mvp
**Objetivo:** Implementar la pantalla /pos con busqueda, carrito y cobro; endurecer RPC de venta y validar modulo.

**Prompt**
si, pos

## 2026-02-09 12:30 — Accesos directos TopBar

**Lote:** topbar-nav
**Objetivo:** Agregar accesos directos en TopBar a paginas principales para navegacion rapida.

**Prompt**
agrega en el top bar accesos directos a las paginas que vamos creando para facil navegacion

## 2026-02-09 12:30 — POS: stock cero y moneda ARS

**Lote:** pos-stock-ars
**Objetivo:** Mostrar productos aunque stock 0, permitir ventas con stock 0 y usar ARS en POS.

**Prompt**
"si el stock esta en 0 no aparece el producto? ... los montos son en pesos argentinos no USD dolar"

## 2026-02-09 12:30 — POS: input cantidad no borra item

**Lote:** pos-qty-input
**Objetivo:** Permitir borrar el input de cantidad sin eliminar el item y bloquear cobro con cantidad 0.

**Prompt**
"si yo quisira borrar el 1 para poner otro numero se me borra el articulo..."

## 2026-02-09 12:30 — POS: resaltar items con cantidad 0

**Lote:** pos-qty-highlight
**Objetivo:** Resaltar items con cantidad invalida y mostrar aviso visual.

**Prompt**
si

## 2026-02-09 12:30 — POS: deshabilitar cobro con qty invalida

**Lote:** pos-disable-checkout
**Objetivo:** Deshabilitar el boton Cobrar si hay cantidades invalidas o carrito vacio.

**Prompt**
si eso esta bueno

## 2026-02-09 12:30 — POS: tooltip en Cobrar deshabilitado

**Lote:** pos-checkout-tooltip
**Objetivo:** Mostrar tooltip/mensaje al deshabilitar Cobrar.

**Prompt**
si

## 2026-02-09 12:30 — Renombrar UOM

**Lote:** products-uom-label
**Objetivo:** Renombrar UOM por un label mas claro.

**Prompt**
ok entonces cambiemos el UOM por otro nombre que explique mejor

## 2026-02-09 12:30 — Unidad de venta en espanol

**Lote:** products-sell-unit-es
**Objetivo:** Mostrar opciones de unidad de venta en espanol.

**Prompt**
es muy dificil cambiar los nombres de las opciones de unidad de venta a espanol?

## 2026-02-09 12:30 — POS: unidad de venta en español

**Lote:** pos-sell-unit-es
**Objetivo:** Traducir unidad de venta en el listado del POS.

**Prompt**
si, necesito que coloquemos en espanol todo lo que se pueda

## 2026-02-09 12:30 — Idioma preferido español

**Lote:** ux-lang-es
**Objetivo:** Definir español como idioma base en documentación UX/UI.

**Prompt**
"Agrega a la documentacion ... que el idioma preferido es espanol"

## 2026-02-09 13:23 — Fase 4.3 Proveedores y Pedidos

**Lote:** suppliers-orders-mvp
**Objetivo:** Implementar pantallas de proveedores y pedidos a proveedor con contratos existentes.

**Prompt**
dale adelante

## 2026-02-09 11:12 — Context summary

**Lote:** context-summary
**Objetivo:** Crear docs/context-summary.md y actualizar AGENTS para exigir su lectura.

**Prompt**
haz tambien el resumen en un doc context-summary y dile al AGENTS.md que lo tome en cuenta cuando sea necesario. la idea es que sepa exactamente cual es el contexto que necesitamos retomar

## 2026-02-09 11:29 — Proveedores, safety stock y sugeridos

**Lote:** suppliers-products-safety-stock
**Objetivo:** Integrar proveedores primario/secundario, safety stock por sucursal y sugeridos simples, con UI y migraciones.

**Prompt**
si adelante con lo recomiendes

## 2026-02-09 11:31 — Commit y push obligatorios con confirmacion

**Lote:** process-commit-push
**Objetivo:** Actualizar AGENTS para exigir commit+push al cierre de lote cuando el usuario confirme.

**Prompt**
antes de hacer QA te queria preguntar si esta contemplado en el AGENTS.md hacer el commit y push caada vez que sea necesario. si no, agregalo, y hagamos el commit de todo lo pendiente y push

## 2026-02-09 11:48 — Renombrar labels proveedor

**Lote:** ui-labels-supplier
**Objetivo:** Renombrar labels de SKU/Nombre en proveedor para evitar confusion.

**Prompt**
Vamos a modificar eso para que se entienda mejor haz el renombre

## 2026-02-09 12:06 — Vencimiento aproximado y batches automaticos

**Lote:** expirations-shelf-life
**Objetivo:** Agregar shelf life en productos y automatizar batches/FEFO en recepcion y ventas.

**Prompt**
Vamos a avanzar en algo mas, en http://localhost:3000/products en nuevo producto me gustaria agregar un campo que diga fecha de vencimiento aproximada y alli coloco el numero de dias. Esto es importante para generar alertas de vencimiento en caso de que el bach de pedido este alli por mas de este numero de dias o cerca ya se genera una alerta automatica de vencimiento de ese articulo. hay productos que duran 3 meses otros anos otros dias, entonces esto es importante coloquemos un numero de dias aproximado. Cuando se confirma el pedido recibido, que creo que no hemos trabajado en esto, debemos entender que tenemos articulos que tienen esa fecha de vencimiento aproxumado. si esos articulos no se han vendido y estamos llegando a esa fecha aproximada pero si se vendieron entonces no deberia recibir esta alerta. tiene sentido? Al registrar el producto colocamos mas o menos la fecha de vencimiento que trae, la cantidad de dias que dura, luego al confirmar la recepcion de ese pedido entonces empieza a contar la fecha segun la cantidad de articulos que nos quedan o que recibimos, no se si me explico bien.

## 2026-02-09 12:10 — Reset con seed automatico

**Lote:** db-reset-seed
**Objetivo:** Agregar script db:reset que re-seedee usuarios y cargar .env.local en seed-users.

**Prompt**
ok vamos con la opcion recomendada

## 2026-02-09 12:29 — Stock minimo global en alta de producto

**Lote:** ui-stock-min-global
**Objetivo:** Permitir aplicar stock minimo a todas las sucursales y aclarar el campo con tooltip.

**Prompt**
hay algo que no entiendo en http://localhost:3000/products en nuevo producto hay un input que dice Sucursal (stock minimo) y me da la opcion de elegir sucursal, pero no entiendo por que debo elegir sucursal porque esto me obliga a establecer un stock minimo a 1 sola sucursal y no entiendo como colocarselo a otra sucursal. se me ocurre que esto sea global. o sea este stock minimo es sugerido para cualquier sucursal y asi nos ahorramos el tener que seleccionar sucursal. Pero me gustaria que el stock minimo. me gustaria agregar tambien un icono de info que aclare que es ese dato y para que se usa. que de una explicacion para que la persona no se confunda en cuanto a que colocar en ese input el hover de info deberia decir algo como esta es la cantidad que debe quedar luego de que se haya vendido lo que se vende usualmente para nunca quedar en 0, o alguna explicacion similar quizas no es la mejor manera de decirlo. y me parece que esta opcion no existe cuando registramos un producto desde la pagina del supplier/id

## 2026-02-09 12:33 — Simplificar stock minimo

**Lote:** ui-stock-min-simple
**Objetivo:** Quitar selector de sucursal y aplicar stock minimo global por defecto.

**Prompt**
simplemente quitemos el Sucursal (stock minimo) ese input no lo necesitamos y dejamos solo el de Stock minimo
ⓘ
el tooltip no parece funcionar. y quitemos Aplicar stock minimo a todas las sucursales (ignora la sucursal). asi todo es mas simple

## 2026-02-09 12:36 — Quitar seccion stock minimo por sucursal

**Lote:** ui-stock-min-remove-section
**Objetivo:** Eliminar la seccion de stock minimo por sucursal en /products.

**Prompt**
1

## 2026-02-13 13:19 — Settings incompleto (Fase 5)

**Lote:** settings-fase5-ui
**Objetivo:** Implementar rutas faltantes de Settings del MVP y validar estado tecnico.

**Prompt**
ok empecemos entonce spor el settings incompleto

## 2026-02-13 13:55 — Smoke Playwright en verde

**Lote:** qa-smoke-playwright
**Objetivo:** Corregir selector ambiguo en smoke E2E para dejar suite verde.

**Prompt**
ok intentalo a ver lo del smoke en verde

## 2026-02-13 13:55 — Alta de usuarios sin validación por email

**Lote:** settings-users-direct-create
**Objetivo:** Permitir que OA cree usuarios admin/staff desde UI con email y contraseña inicial, sin confirmación por email.

**Prompt**
ok entonces implementemos esta manera de incorporar usuarios tanto admin como staff

## 2026-02-13 14:54 — Credenciales administradas por OA

**Lote:** settings-users-admin-credentials
**Objetivo:** Forzar gestión de contraseña solo por admin y agregar apartado de credenciales en /settings/users.

**Prompt**
ok hazlo

## 2026-02-13 15:17 — Sucursales por checklist en usuarios

**Lote:** settings-users-branch-checklist
**Objetivo:** Cambiar selector múltiple de sucursales por checklist con checkboxes para mayor claridad operativa.

**Prompt**
Podemos cambiarlo a algo tipo checklist o que sea mas especifico? tipo si esta marcado el check entonces se que puede ver esa sucursal

## 2026-02-13 15:21 — Layout compacto de usuarios + edición desplegable

**Lote:** settings-users-compact-layout
**Objetivo:** Hacer compacta la lista de usuarios y mover creación/edición avanzada a desplegables.

**Prompt**
Ahora me gustaria organizar mejor como se ven las cosas quiero meter crear usuario dentro de un desplegable y en usuarios de la organizacion deberia salirme la info un poco mas compacta es decir, que yo vea los usuarios su nombre su email su rol y sucursal asignada y si yo quiero editarlo entonces hago click editar y ahi si se revela todo asi como lo de cambiar las credenciales y contrasena. tiene sentido?

## 2026-02-13 15:22 — Excluir superadmin de settings/users

**Lote:** settings-users-no-superadmin
**Objetivo:** Bloquear creación/listado/edición de superadmin desde `/settings/users`.

**Prompt**
como el rol superadmin soy yo como dueno de la app y de soporte no deberia ser configurable aqui, no puedo crear ni ver ni editar un usuario superadmin

## 2026-02-13 15:26 — Ocultar sucursales para Org Admin

**Lote:** settings-users-role-conditional-branches
**Objetivo:** Ocultar checklist de sucursales cuando el rol elegido sea Org Admin y mostrarlo solo para Staff.

**Prompt**
eso hagamos eso

## 2026-02-16 11:51 — Base DB superadmin global multi-org

**Lote:** superadmin-platform-db-foundation
**Objetivo:** Implementar base de datos para superadmin global, gestion de org/sucursales y contexto de org activa.

**Prompt**
Ok de acuerdo a lo que tenemos hasta ahora. la idea es que esta app sea vendida a multiples tiendas (org) cada org puede tener varias sucursales. dicho esto, para salir al mercado, que recomiendas hacer?

ok hagamos eso. sigo tus recomendaciones

## 2026-02-16 12:00 — UI superadmin global multi-org

**Lote:** superadmin-platform-ui
**Objetivo:** Implementar pantalla `/superadmin` operativa (listar orgs, crear org y sucursal, seleccionar org activa) y restringir visibilidad/acceso solo a superadmin.

**Prompt**
ok hagamos eso. el superadmin solo debe ser visible por superadmin es decir yo y ahi debo poder seleccionar o ver todas las org y crear orgs nuevas y nuevas sucursales para esas orgs. como recomiendas que sea esto?

ok. entonces hagamos eso. sigo tus recomendaciones

adelante

## 2026-02-16 12:18 — Alta de org con OA inicial + dashboard SA por org activa

**Lote:** superadmin-org-bootstrap-and-dashboard-context
**Objetivo:** Completar alta de org con usuario OA inicial desde `/superadmin` y permitir que superadmin vea `/dashboard` por org activa.

**Prompt**
supongo que luego de crar una sucursal nueva, el proximo paso seria asignarle un usuario? En que parte de la UI hacemos esto?

lo ideal seria que al crear la org nueva junto su primera sucursal asignar de una vez el usuario con su clave tal como en users. y como hago para ver el dashboard de las distintas org?

adelante

## 2026-02-16 12:32 — Admin inicial para org existente + contexto SA en módulos

**Lote:** superadmin-existing-org-admin-and-active-org-modules
**Objetivo:** Permitir crear admin inicial para org ya existente y habilitar navegación de superadmin por módulos usando org activa.

**Prompt**
como se hace con las org ya creadas que no tienen admin inicial? podemos habilitar para ellas la creacion de este admin? y me explicas entonces como ver el dashboard y los modulos de cada org? cual seria el paso? supongo que hacer click en activar?

adelante

## 2026-02-16 13:00 — Hardening alta org SA sin org huérfana

**Lote:** superadmin-create-org-hardening-owner-required
**Objetivo:** Forzar que la creación de org desde superadmin siempre incluya membresía OA inicial y falle de forma atómica si falta owner.

**Prompt**
que seria esta proteccion extra? que si no se confirma la membresia no se crea la org?

adelante

## 2026-02-16 13:20 — Cierre Fase 6 hardening QA (RLS + CI smoke)

**Lote:** hardening-qa-rls-ci-smoke
**Objetivo:** Cerrar Fase 6 con smoke RLS automatizado y workflow CI reproducible con seed local.

**Prompt**
ok listo, que mas tenemos pendiente?

ok adelate

## 2026-02-16 15:00 — Descuento efectivo en POS con control por preferencias

**Lote:** pos-cash-discount-preferences-audit-dashboard
**Objetivo:** Implementar descuento por efectivo solo para `cash`, con porcentaje fijo desde preferencias, auditoría de cambios y métricas en dashboard.

**Prompt**
En las tiendas hay veces que se hacen descuentos por pagar en efectivo. Me gustaria que chequeemos los docs y veamos cual es la mejor manera de incorporar este descuento. se me ocurre que en el pos haya un boton que diga descuento en efectivo que normalmente este configurado con 10% y al activarlo se descuente del total 10%. ahora interesante seria que por ejemplo si alguien le modifica el valor esto se sepa en la seccion de auditoria, tambien en las estadisticas y el dashboard me gustaria saber de alguna manera que ventas fueron en efectivo y si tuvieron descuento. Ayudame a aterrizar esto para hacerlo de la mejor manera, que sea facil y no se rompa nada y que quede bien documentado

perfecto me gusta. y tambien solo se puede aplicar si el metodo de pago es efectivo. No puedo hacer el descuento efectivo y cobrar con tarjeta

adelante

## 2026-02-16 16:30 — Pagos divididos en POS (split payments)

**Lote:** pos-split-payments-safe-rollout
**Objetivo:** Habilitar pagos divididos en POS sin romper contratos actuales, manteniendo validaciones en DB y auditoría.

**Prompt**
si me gustaria poder aceptar pagos dividios es decir una parte con efectivo u otra con tarjeta o similar. que me recomiendas hacer? chequea todo lo que necesites para habilitar esto sin que se rompa nada

adelante

## 2026-02-16 14:13 -03 — Propuesta de modulo de caja (cierre por turno/dia)

**Lote:** cashbox-module-discovery-proposal
**Objetivo:** Revisar la documentacion y estado real del repo para proponer un modulo de caja que permita cierre por turno o por dia, conteo de efectivo, diferencias y registro de gastos operativos.

**Prompt**
quiero que revises toda la documentacion para que entiendas bien la app y me ayudes a crear un nuevo modulo de caja. este modulo es el que vamos a utilizar para hacer el cierre de caja por turno o por dia segun sea necesario. Aqui es donde contamos todo el dinero, colocamos lo que hay y vemos sin coincide y que todo este ok no nos falte y no nos sobre. aqui tambien podriamos agregar gastos del local por ejemplo algun delivery que se haya pagado o cosas de libreria etc. primero quiero que revises todo y tambien me sugieras algo que facilite todo este proceso para que sea sencillo, rapido y muy completo. dime como sugieres que puede ser

## 2026-02-16 14:28 -03 — Implementación módulo Caja por sucursal con auditoría

**Lote:** cashbox-module-mvp-branch-audit
**Objetivo:** Implementar módulo `/cashbox` por sucursal con apertura/cierre por turno o día, movimientos manuales de caja y trazabilidad en auditoría de actor y detalle de movimientos.

**Prompt**
excelente. el cierre de caja es por sucursal por las dudas

adelante. tambien en auditoria se debe ver quien hizo la caja y los movimientos que hizo

## 2026-02-16 14:56 -03 — Hardening cierre de caja: firma + denominaciones

**Lote:** cashbox-close-signature-denominations
**Objetivo:** Extender el módulo `/cashbox` para requerir firma operativa al cerrar caja y registrar conteo por denominaciones con validación de suma.

**Prompt**
seguimos

## 2026-02-16 15:21 -03 — Caja por billetes en caja/reserva + denominaciones configurables

**Lote:** cashbox-drawer-reserve-denomination-config
**Objetivo:** Ajustar apertura/cierre para conteo por cantidad de billetes en caja y reserva, con denominaciones por defecto de ARS y configuración editable por organización.

**Prompt**
ok para abrir caja usualmente se cuentan los billetes y monedas que hay segun su denominacion y eso debe dar un total y con eso se abre. entonces no se cuenta monto sino se cuentan los billetes. lo mismo para el cierre. Tambien suele haber una cantidad de billetes en reserva, eso es no en caja pero disponible en el local para pagar proveedores o por el estilo. entonces ideal seria para empezar tener billetes inciales en caja y billetes iniciales en reserva (y monedas) en argentina no se usan las monedas o muy poco asi que por el momento serian los billetes. la denominacion del billete normalmente es 100, 200, 500, 1000, 2000, 10000 y 20000 entonces coloquemos eso como por defecto ahora pero esto deberia poder ser modificable segun el pais y el contexto en el que se utilice, quizas se pueda agregar mas o quitar bien sea billetes y monedas entonces debo tener lo mismo para monto en caja y para monto en reserva. para el cierre es igual. Se cuenta y se coloca lo que se deja en la caja para el cierre y lo demas se lleva a reserva entonces se tiene el monto de reserva. y bueno adelantemos esto y despues seguimos iterando.

## 2026-02-16 15:45 -03 — Totales automáticos al contar billetes

**Lote:** cashbox-live-totals-drawer-reserve
**Objetivo:** Mostrar en tiempo real los montos de caja, reserva y total mientras se ingresan cantidades por denominación en apertura y cierre.

**Prompt**
ok entonces al yo colocar el numero de billetes automaticamente deberia decirme los montos en reserva en caja y total

## 2026-02-17 21:03 -03 — Orders: monto estimado en listado

**Lote:** orders-list-estimated-supplier-amount
**Objetivo:** Mostrar en `/orders` el monto estimado a pagar al proveedor por pedido, en base a los items cargados.

**Prompt**
vamos a trabajar sobre orders. me gustaria que en el listado tambien aparezca el monto estimado a pagar al proveedor segun el pedido

## 2026-02-17 22:00 -03 — Pagos proveedor por sucursal integrados con orders

**Lote:** supplier-payments-branch-module-foundation
**Objetivo:** Implementar base operativa de pagos a proveedores por sucursal: perfil de pago en supplier, cuentas por pagar por pedido, registro de pagos y estado reflejado en `/orders`.

**Prompt**
Hay algo que pase por alto y es agregar el metodo de pago del proveedor. esto es importante porque vamos a incorporar un nuevo modulo de pagos donde vamos a gestionar el pago a los proveedores. Mi idea es que al registrar el proveedor tambien se le agregue el metodo de pago, si es efectivo o transferencia y agregar los datos de la cuenta. Es posible que hay veces que proveedores que se paga en efectivo se paguen por transferencia entonces seria conveniente tener esa informacion al registrar al proveedor. De igual manera este nuevo modulo de pagos la idea es que yo pueda ver los pedidos realizados y poder adjuntar una foto de la factura y ajustar el monto para colocar el monto exacto que debo pagar ya que el monto del pedido es aproximado. tambien importante seria agregar a la hora de registrar un proveedor es un plazo de pago si aplica. asi este modulo de pagos ya seria un modulo donde el que hace los pagos se mete a gestionar realizar pagos o saber que tiene que pagar, saber cuanto efectivo va a necesitar para la semana. Pero necesito que todo este conectado, porque asi en pedidos yo puedo ver si un pedido ha sido marcado como pagado desde este modulo de pagos o si esta pendiente por realizar pago. la idea es que yo al recibir el remito o factura le pueda tomar una foto y adjuntarla para tener, agregar comentarios y observaciones si es necesario, si el proveedor es en efectivo normalmente se paga al momento entonces este proceso debe ser simple y rapido, debe permitirme saber rapidamente que cosas se han pagado y estan pedientes, los pagos mas urgentes que estan vencidos o proximos por vencer etc, que te parece?

ok hagamos eso, esto de igual manera se maneja por sucursal. Cada sucursal maneja sus pedidos y sus pagos

## 2026-02-17 22:11 -03 — Factura: compresión de imagen para storage liviano

**Lote:** supplier-invoice-photo-compression-storage
**Objetivo:** Subir foto de factura/remito comprimida y convertida para minimizar peso manteniendo legibilidad.

**Prompt**
despues de eso vamos a hacer que esta foto sea convertida y sea disminuida de peso ya que no quiero ocupar demasiado espacio. debe ser lo mas ligera posible pero debe tener calidad como para ser legible

## 2026-02-18 14:52 -03 — Payments: badge de seguimiento de último pago

**Lote:** payments-latest-payment-badge
**Objetivo:** Mejorar la trazabilidad en `/payments` mostrando en cada cuenta por pagar un resumen del último pago registrado (fecha/hora y nota) para seguimiento rápido de pagos parciales.

**Prompt**
ayudame a resolver algo en /payments. Tengo un recibo en pendientes por pagar, estoy practicando las posibilidades y acabo de darle registrar pago y coloque un monto menor al total y ahora me dice que el pago es parcial y me dice el monto por pagar y pagado, todo eso esta perfecto, lo unico que me gustaria agregar es tambien ver una pequena targetita o badge que me indique la informacion de ese pago es decir la fecha y hora de pago registrada y si hubo alguna nota asi es mas facil hacerle seguimiento

## 2026-02-18 14:55 -03 — Payments: botón `Restante` en registrar pago

**Lote:** payments-register-payment-fill-remaining
**Objetivo:** Agregar un botón en el formulario de pago para completar automáticamente el monto restante pendiente.

**Prompt**
ahora en la seccion de registrar pago agrega un boton al lado del input de monto que diga restante asi al darle ahi automaticamente coloca el restante en el input

## 2026-02-18 15:04 -03 — Payments: pago parcial con total requerido + aceptar monto real mayor

**Lote:** payments-partial-total-and-real-amount
**Objetivo:** Mejorar el flujo de registrar pago para soportar pagos parciales con total declarado y permitir registrar montos reales mayores al estimado sin bloqueo.

**Prompt**
desde /payments estoy intentando registrar un pago en efectivo pero si el monto es mayor al monto estimado no me deja registrarlo. lo mas probable es que este monto no sea igual al monto estimado asi quedebemos poder colocar un checkmark que me indique que es un pago parcial en caso de que se haya pagado solo una parte o que simplemente me acepte el monto que yo le coloque porque este seria el monto real pagado, debo yo entender que el monto que estoy colocando ahi es lo que se le dio al proveedor a menos que este marcado el pago parcial. tambien me gustaria que me pidiera indicar el monto total cuando hago un pago parcial y me diga cual seria el restante, esto para hacer todo esto un poco mas completo a lo que ya esta ahora

## 2026-02-18 15:07 -03 — Fix ambigüedad RPC `rpc_update_supplier_payable` al registrar pago parcial

**Lote:** payments-rpc-overload-ambiguity-fix
**Objetivo:** Resolver error por sobrecarga ambigua al actualizar payable antes de registrar pago parcial/monto real.

**Prompt**
ahora quedo perfecto exepto que me da este mensaje Error: Could not choose the best candidate function between: public.rpc_update_supplier_payable(p_org_id => uuid, p_payable_id => uuid, p_invoice_amount => numeric, p_due_on => date, p_invoice_photo_url => text, p_invoice_note => text, p_selected_payment_method => public.payment_method), public.rpc_update_supplier_payable(p_org_id => uuid, p_payable_id => uuid, p_invoice_amount => numeric, p_due_on => date, p_invoice_reference => text, p_invoice_photo_url => text, p_invoice_note => text, p_selected_payment_method => public.payment_method) intente pagar un monto parcial

## 2026-02-18 15:09 -03 — DB hardening: eliminar overload legacy de `rpc_update_supplier_payable`

**Lote:** payments-drop-legacy-rpc-overload
**Objetivo:** Evitar ambigüedad de firma en PostgREST eliminando la versión legacy del RPC sin `p_invoice_reference`.

**Prompt**
ok adelante

## 2026-02-18 15:13 -03 — Payments: manejar errores inesperados de Server Action sin romper UI

**Lote:** payments-server-action-unexpected-response-hardening
**Objetivo:** Evitar runtime genérico en `/payments` cuando falla `registerPayment`, mostrando error en banner y preservando flujo.

**Prompt**
lo intente nuevamente agregando un comentario y en la nota y me deice esto ## Error Type
Runtime Error

## Error Message

An unexpected response was received from the server.

    at form (<anonymous>:null:null)
    at renderPayableCard (app/payments/page.tsx:893:15)
    at <anonymous> (app/payments/page.tsx:1090:55)
    at Array.map (<anonymous>:1:18)
    at PaymentsPage (app/payments/page.tsx:1090:38)

## Code Frame

891 | Registrar pago
892 | </summary>

> 893 | <form action={registerPayment} className="mt-3 grid gap-2">

      |               ^

894 | <input type="hidden" name="payable_id" value={payable.payable_id} />
895 | <input type="hidden" name="branch_id" value={selectedBranchId} />
896 | <input type="hidden" name="supplier_id" value={selectedSupplierId} />

Next.js version: 16.1.6 (Turbopack)
Call Stack
6

Hide 1 ignore-listed frame(s)
fetchServerAction
node_modules/next/src/client/components/router-reducer/reducers/server-action-reducer.ts (205:11)
form
<anonymous>
renderPayableCard
app/payments/page.tsx (893:15)
<anonymous>
app/payments/page.tsx (1090:55)
Array.map
<anonymous>
PaymentsPage
app/payments/page.tsx (1090:38)

## 2026-02-18 15:28 -03 — Orders detail: pago efectivo parcial + entry point de factura/remito

**Lote:** orders-detail-partial-cash-and-invoice-entrypoint
**Objetivo:** Extender `/orders/[orderId]` para soportar pago efectivo parcial al controlar recepción y permitir registrar factura/remito desde la misma pantalla como segundo entry point operativo.

**Prompt**
ok una cosa mas me acabo de dar cuenta que falta por implementar esta metodologia de pago parcial en /orders/id porque al momento de recibir y controlar mercaderia al yo marcar pago en efectivo realizado solo me dice monto exacto pagado pero no me deja indicar si es un pago parcial y cual seria el total del remito. Me gustaria tambien aqui incorporar un segundo entry point para registrar factura/remito, por ahora lo hacemos desde /payments donde tengo la parte de registrar los datos de factura/remito me gustaria incorporar ese formulario aqui cono un segundo entry point asi se puede permitir que la persona que reciba el pedido llene esta iformacion y no se genere deuda de trabajo por tener que hacer eso despues aunque se puede dejar para despues si no se llena esa info

## 2026-02-18 15:31 -03 — Renombrar label de fecha en factura/remito (payments + order detail)

**Lote:** invoice-date-label-rename-entrypoints
**Objetivo:** Cambiar el label del campo `due_on` a “Fecha indicada del remito/factura” en ambos entry points operativos.

**Prompt**
ahora tambien me estoy dando cuenta que en esos formularios de registrar factura/remito hay un input que dice vence el me gustaria cambiar eso por fecha indicada del remito/factura en ambos entry points ya que esa fecha me interesa mas

## 2026-02-18 15:37 -03 — Orders detail: preservar datos y resaltar campo faltante en control

**Lote:** orders-detail-preserve-receive-form-on-missing-controller
**Objetivo:** Evitar pérdida de datos en recepción/control cuando falta “Controlado por”, y señalar visualmente el campo faltante con estado de error.

**Prompt**
Ahorita estaba llenando los datos para hacer el pago parcial desde /orders/id y me falto llenar el nombre de controlado por y me dio el mensaje Indicá quién controló el pedido. lo que esta bien pero se me borro toda la info que ya habia metido sobre el pago lo que es molesto. podemos arreglar eso? tambien este mensaje debeia darme tambien una informacion mas especifica deberia alumbrarse en rojo el campo que me falta o algo asi ademas de que salga ese mensaje arriba

## 2026-02-19 10:03 -03 — Dashboard: sección operativa hoy/semana para pedidos y pagos

**Lote:** dashboard-ops-today-week-orders-payments
**Objetivo:** Incorporar en `/dashboard` una sección informativa con toggle hoy/semana que muestre pedidos a realizar, pedidos a recibir y pagos a realizar por método (efectivo/transferencia).

**Prompt**
ahora vamos a incorporar al dashboard tambien una seccion informativa sobre los pagos. me gustaria ver una seccion donde me diga que pedidos se reciben hoy, con un toggle o boton para cambiarlo por esta semana y me dice la informaicon de essta semanao de hoy, los pedidos que deberia realizar hoy o esta semana, los pedidos que se reciben hoy o esta semana, los pagos que debo realizar hoy o esta semana bien sea en efectivo o por transferencia. tiene sentido?

## 2026-02-19 10:06 -03 — Dashboard: incluir pagos vencidos en sección operativa

**Lote:** dashboard-ops-include-overdue-payments
**Objetivo:** Mostrar también cuentas por pagar vencidas (cantidad y montos) en el bloque operativo de pagos del dashboard.

**Prompt**
si muestra tambien los pagos vencidos

## 2026-02-20 09:03 -03 — Cashbox: permitir borrar `0` en inputs numéricos

**Lote:** cashbox-number-input-allow-empty-editing
**Objetivo:** Mejorar la edición de cantidades en `/cashbox` para permitir dejar temporalmente vacío el input numérico (sin reponer `0` en cada tecla) y mantener cálculo/envío coherente.

**Prompt**
vamos a trabajar sobre /cashbox. para empezar necesito que en este y todos los inputs numericos se pueda borrar el 0 ya que si no se puede es muy molesto para editar

## 2026-02-20 09:07 -03 — Barrido global de inputs numéricos (forzado de `0`)

**Lote:** global-number-input-allow-empty-audit
**Objetivo:** Verificar y ajustar, si aplica, el comportamiento de edición en todos los `input[type=number]` para permitir vacío temporal sin reponer `0` automáticamente.

**Prompt**
si, haz eso ya que es muy molesto

## 2026-02-20 09:26 -03 — Caja/POS: tarjeta unificada, mercadopago y trazabilidad por dispositivo

**Lote:** cashbox-pos-card-mercadopago-devices
**Objetivo:** Iterar cierre de caja y POS para: egresos automáticos de pagos proveedor cash en `/cashbox`, resumen de cobros `card`/`mercadopago`, método `tarjeta` unificado y selección obligatoria de dispositivo de cobro por sucursal.

**Prompt**
esta bien. ahora lo que necesito es poder iterar sobre el cierre de caja. SObre el cierre de caja me deben aparecer los proveedores que se hayan pagado en efectivo ese dia. Cuando se confirma el proveedor y se chequea que se ha realizado el pago en efectivo y se controla desde /orders. ya que es un egreso que hay en efectivo este deberia aparecerme automaticamente como un movimiento de egreso en /cashbox.. tambien necesito ver un resumen de lo esperado en tarjetas para cuando se selecciona ese metodo de pago que es tarjeta de credito/debito. Necesito hacer tambien algunas modificaciones en el pos, para registrar de mejor manera estos pagos con tarjeta asi puedo seleccionar el dispositivo desde el cual se cobra asi es mas facil trackear el dinero. que piensas y que recomiendas hacer mejor. otro metodo de pago que me gustaria agregar es mercadopago

## 2026-02-20 09:26 -03 — Confirmación de método operativo POS

**Lote:** cashbox-pos-card-mercadopago-devices
**Objetivo:** Consolidar definición final de métodos de cobro POS (`cash`, `card`, `mercadopago`) y criterio de conciliación por dispositivo al cierre.

**Prompt**
si esta bien. la opcion de tarjeta debe ser una sola, tarjeta debito/credito y el posnet es el que se debe seleccionar. La opcion de mercadopago es otra opcion aparte de cash y tarjeta debito/credito. se entiende? porque al final del dia a mi lo que me interesa es saber cuanto dinero dice que se cobro en tal dispositivo y poder chequear que todo efectivamente esta ahi.

## 2026-02-20 09:45 -03 — POS: simplificar cobro con botones visibles para método/dispositivo

**Lote:** pos-checkout-buttons-ux
**Objetivo:** Reducir fricción en cobro POS reemplazando dropdowns de método/dispositivo por botones visibles y exponer selector QR/Posnet para MercadoPago.

**Prompt**
ok estoy probando lo que recientemente hicimos del pos para registrar pagos sobre un dispositivo determinado y todo funciona bien, lo que falta acomodar es la experiencia del usuario ya que necesito que sea mas sencillo. en vez de que sea un seleccionable desplegable de metodo de pago, necesito que sean botones visibles a los cuales le pueda hacer click. por ejemplo efectivo, debito/credito, Mercadopago y lo mismo para el dispositivo de cobro. tambien debe estar visibles las opciones cuando yo elija debito/credito o cuando elija mercadopago si fue con QR o posnet de mercadopago. todo esto para que el proceso sea simple rapido y sin muchos clicks

## 2026-02-20 09:50 -03 — POS: MercadoPago QR sin bloqueo + opción alias MP

**Lote:** pos-mercadopago-qr-alias-flow
**Objetivo:** Evitar bloqueo de cobro en MercadoPago QR cuando no hay dispositivo QR explícito y agregar canal operativo “Transferencia a alias MP”.

**Prompt**
ok lo unico que falta acomodar es que cuando selecciono mercadopago y selecciono QR me dice No hay dispositivos activos para esta opción. y no me deja efectuar el cobro, entonces eso hay que acomodarlo porque QR ya es suficiente, eso es un codigo QR que siempre esta visible para el cliente y lo escanea y paga con eso. es solo como para informar que esta pagando con eso. QUizas agreguemos una 3ra opcion que diga transferencia a alias MP

## 2026-02-20 10:07 -03 — POS: Posnet MP sin bloqueo con 1 dispositivo + configuración en sucursales

**Lote:** pos-mp-posnet-devices-config
**Objetivo:** Resolver bloqueo en canal `Posnet MP` cuando solo existe un dispositivo y habilitar configuración operativa de dispositivos de cobro desde `/settings/branches`.

**Prompt**
Excelente y lo mismo para las otras opciones de mercadopago en la opcion de posnet mp, ese seria el dispositivo, si solo es uno, pero podria aparecer posnet mp 2 en caso de que hayan 2? se entiende? el tema es que cuando selecciono la opcion posnet mp me dice No hay dispositivos activos para esta opción. entonces hay que agregar un dispositivo o que al igual que la opcion de QR este sea el posnet directamente y solo si hay otro entonces que aparezca otra opcion. Esto debe ser perfectamente configurable desde configuracion, no se si ya lo hiciste, pero vamos a chequear de que exista la posibilidad de por ejemplo modificar estas opciones como agregar dispositivos de posnet, otros metodos de pago que puedan surgir. que te parece?

## 2026-02-20 10:14 -03 — Convención de nombres para dispositivos POS/MP

**Lote:** pos-device-naming-convention
**Objetivo:** Definir y exponer convención de nombres para dispositivos de cobro en Settings/POS para operación consistente.

**Prompt**
ok hazlo

## 2026-02-20 10:17 -03 — Validación suave con sugerencias automáticas de nombres

**Lote:** pos-device-naming-soft-validation
**Objetivo:** Agregar sugerencias automáticas de nombres estándar en el alta/edición de dispositivos sin bloquear guardado.

**Prompt**
ok adelante

## 2026-02-21 19:50 -03 — POS: descuento empleado + cuentas por sucursal

**Lote:** pos-employee-discount-branch-accounts
**Objetivo:** Implementar descuento de empleado en POS con selección obligatoria de nombre, cuentas por sucursal y configuración de porcentaje/regla de combinación desde Settings.

**Prompt**
me gustaria agregar una funcion que sea compras empleado. Este es un boton similar al de descuento en efectivo que se puede llamar descuento de empleado y cuando lo selecciono me pide que indique el nombre de empleado, y una vez indicado entonces aplica el descuento. Esto debe ser configurable en configuracion, es decir alli yo debo poder agregar o quitar nombres de empleado, estos deben servir como una cuenta de empleado donde voy registrando sus compras asi puedo ver lo que compraron y cuanto gastaron y con que pagaron y todo eso, esto debe ser distinto a los usuarios porque ahora que lo pienso cualquier staff puede usar la pc logeado con otro dispositivo y no va a ser exacto siempre, es mejor indicar quien eso la compra en esa instancia. que piensas?

el % lo debo definir yo tambien desde configuracion, tambien desde configuracion debo poder decidir si se convina o no con otros descuentos va a dependeer de lo que yo decida pero normalmente no se puede. puede pagar con cualquier metodo de pago, la cuenta de empleado es por sucursal, asi evitamos que se mezclen nombres.

## 2026-02-22 10:48 -03 — Onboarding: resolver productos incompletos con formulario compartido

**Lote:** onboarding-products-shared-form
**Objetivo:** Unificar los entry points de alta/edición/onboarding de productos para reutilizar los mismos campos y mantener la lógica de sugerencia de precio unitario según margen del proveedor.

**Prompt**
pero debe mantener la misma logica, la informacion debe ser la misma, debe tener la sugerencia segun margen de ganancia tal como lo habiamos dicho en /products hay alguna manera de que sea exactamente el mismo formulario el de nuevo producto, el de editar producto cuando le doy a editar y el de onboarding? como que sean el mismo componente compartido? o en este momento funcionan diferente como entry points distintos? no se si sea conveniente lo digo es por si modifico algo en algun lugar no tengo que manualmente irlo cambiando en el resto de los entry points

falto el input de precio de proveedor en /onboarding en informacion faltante

## 2026-02-22 11:04 -03 — Productos: agregar campo marca en formulario compartido

**Lote:** products-brand-shared-field
**Objetivo:** Incorporar campo `marca` en productos y reflejarlo de forma consistente en nuevo producto, editar producto y resolvedor rápido de onboarding usando el mismo bloque reutilizado.

**Prompt**
ok ahora me doy cuenta de que en el formulario de nuevo producto tambien hace falta un campo de marca donde indico la marca del producto. Vamos a agregarlo y obviamente esto tambien se tiene que agregar en editar producto y en la lista del /onboarding pero como ahora es el mismo bloque reutilizado creo que no hay problema, no?

## 2026-02-22 11:13 -03 — Productos: sugerencias de marca reutilizando catálogo existente

**Lote:** products-brand-autocomplete-shared
**Objetivo:** Agregar autocompletado de marca en el input `Marca` tomando como sugerencias las marcas ya registradas en productos, manteniendo comportamiento unificado en nuevo/editar/onboarding.

**Prompt**
excelente ahora me gustaria que el input de marca me de sugeridos de acuerdo a las marcas que ya han sido registradas en algun prodcuto, por ejemplo si en un articulo puse marca Arcor entonces en el siguiente articulo yo al marcar la A me deberia sugerir debajo arcor o cualquier otra marca que empiece por la A. tiene sentido?
