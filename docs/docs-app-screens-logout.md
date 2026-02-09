# Screen Contract — Logout

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/logout`

## Rol / Acceso

- SA / OA / ST (autenticados)

## Proposito

Cerrar sesion y redirigir a `/login`.

## Data Contract

No requiere lecturas.

Accion: `signOut()` + redirect.

## Smoke test

LO-01: logout desde cualquier rol vuelve a login y bloquea rutas privadas.
