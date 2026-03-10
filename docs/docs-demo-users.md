# Usuarios Demo (local)

Este documento lista usuarios de prueba locales para QA de UI.
No usar en produccion.

## Credenciales

Password comun: `prueba123`

- Superadmin: `superadmin@demo.com`
- Demo publica readonly: `demo-readonly@demo.com`
- Org Admin: `admin@demo.com`
- Staff: `staff@demo.com`

## Configuracion aplicada

- Org QA local: `Demo QA Org`
- Sucursales QA: `Sucursal Palermo`, `Sucursal Caballito`
- Org demo publica readonly: `Demo Publica Org`
- Sucursales demo publica: `Showroom Centro`, `Showroom Norte`
- Staff QA asignado a ambas sucursales QA
- Modulos habilitados para Staff QA: `pos`, `products_lookup`, `clients`, `expirations`

## Script

- Seed: `scripts/seed-users.js`
- Reset + seed completo (recomendado para QA integral): `npm run db:reset:all`
- Reset recomendado (DB + seed): `npm run db:reset`
- Seed completo reusable (usuarios + datos operativos MVP): `npm run db:seed:all`
- Seed solo datos operativos (requiere usuarios/org ya creados): `npm run db:seed:demo`
  - incluye escenarios de compras de prueba en `/orders` y `/payments`
  - incluye productos demo con `purchase_by_pack` para validar compra por paquete
  - incluye una venta fiscal fija de `Juan Perez` (`sale_id=8b196ae1-7ec0-4f45-899c-8130d0f96299`) con factura `authorized + completed` para smoke de `/share/i/:token`
  - incluye además un dataset curado para `Demo Publica Org` con catálogo, ventas, proveedores, pedidos y clientes visibles en la demo interactiva readonly
- Seed escenario caja de hoy (ventas + pedido `sent` con items para controlar + pago proveedor cash para validar `/cashbox`): `npm run db:seed:cashbox`

## Demo interactiva pública (landing)

Para habilitar `POST /demo/enter` (botón `Probar demo interactiva` en `/demo`):

- `DEMO_LOGIN_EMAIL` = email de la cuenta demo
- `DEMO_LOGIN_PASSWORD` = password de la cuenta demo
- `DEMO_READONLY_EMAILS` = lista separada por comas de emails demo bloqueados en escritura

Ejemplo:

- `DEMO_LOGIN_EMAIL=demo-readonly@demo.com`
- `DEMO_LOGIN_PASSWORD=prueba123`
- `DEMO_READONLY_EMAILS=demo-readonly@demo.com`

Regla operativa:

- `demo-readonly@demo.com` pertenece solo a `Demo Publica Org` y queda reservado para `/demo` y cualquier recorrido publico bloqueado en escritura.
- `admin@demo.com` y `staff@demo.com` pertenecen solo a `Demo QA Org` y quedan disponibles para QA local y smoke de flujos operativos reales.
- No reutilizar una misma cuenta demo en ambas orgs: varios guards y redirects internos asumen una sola membership `org_users` por usuario no-platform.
- `Demo Publica Org` debe poblarse solo con datos de exhibición curados; no usarla para QA operativo ni para pruebas que escriban datos.
