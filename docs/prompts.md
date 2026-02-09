# Prompts Log

Este archivo registra prompts relevantes enviados al agente.

Formato sugerido:

## YYYY-MM-DD HH:mm — <titulo corto>

**Lote:** <id o nombre>
**Objetivo:** <una linea>

**Prompt**
<texto completo>

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
