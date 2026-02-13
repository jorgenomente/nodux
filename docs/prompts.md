# Prompts Log

Este archivo registra prompts relevantes enviados al agente.

Formato sugerido:

## YYYY-MM-DD HH:mm — <titulo corto>

**Lote:** <id o nombre>
**Objetivo:** <una linea>

**Prompt**
<texto completo>

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
