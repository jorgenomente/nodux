# Usuarios Demo (local)

Este documento lista usuarios de prueba locales para QA de UI.
No usar en produccion.

## Credenciales

Password comun: `prueba123`

- Superadmin: `superadmin@demo.com`
- Org Admin: `admin@demo.com`
- Staff: `staff@demo.com`

## Configuracion aplicada

- Org demo: `Demo Org`
- Sucursales: `Sucursal Palermo`, `Sucursal Caballito`
- Staff asignado a ambas sucursales
- Modulos habilitados para Staff: `pos`, `products_lookup`, `clients`, `expirations`

## Script

- Seed: `scripts/seed-users.js`
- Reset + seed completo (recomendado para QA integral): `npm run db:reset:all`
- Reset recomendado (DB + seed): `npm run db:reset`
- Seed completo reusable (usuarios + datos operativos MVP): `npm run db:seed:all`
- Seed solo datos operativos (requiere usuarios/org ya creados): `npm run db:seed:demo`
