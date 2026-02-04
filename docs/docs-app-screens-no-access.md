# Screen Contract — No Access

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/no-access`

## Rol / Acceso

- Staff (ST) que no tiene módulos habilitados
- Org Admin / Superadmin: NO acceden (redirigir a su home)

## Propósito

Informar claramente al Staff que no tiene módulos habilitados
y qué debe hacer para resolverlo.

---

## Cuándo se muestra

La app debe redirigir a `/no-access` cuando:

1. El Staff inicia sesión y no tiene ningún módulo habilitado
2. Estando logueado, se deshabilitan todos sus módulos
3. Intenta acceder a una ruta sin permiso y no hay fallback válido

---

## UI

### Contenido principal

- Título: “No tenés acceso a ningún módulo”
- Mensaje:
  “Tu usuario no tiene módulos habilitados para operar.
  Contactá a tu administrador para solicitar acceso.”

### Ilustración / icono

- Estado vacío (lock / warning / access denied)

### CTA

- Botón: “Cerrar sesión”
  - Acción: logout → `/login`

---

## Acciones del usuario

### A1) Cerrar sesión

- Ejecuta logout
- Redirige a `/login`

---

## Estados UI

### Loading

- No aplica (pantalla estática)

### Error

- No aplica

---

## Reglas de negocio

- Esta pantalla **no** ofrece navegación a otros módulos
- No debe exponer datos sensibles
- No intenta “resolver” permisos automáticamente

---

## Seguridad

- No requiere lecturas de DB
- Accesible solo si el rol es ST
- OA/SA deben ser redirigidos a su home correspondiente

---

## Edge cases

1. Staff obtiene permisos mientras está en `/no-access`

- En MVP: requiere refresh manual
- Post-MVP: podría redirigir automáticamente al primer módulo

2. Staff intenta acceder directamente a otra ruta desde `/no-access`

- Middleware / guard debe re-redirigir a `/no-access`

---

## Métricas / eventos

- `no_access_viewed`
- `no_access_logout_clicked`

---

## Smoke tests (manual)

### NA-01: Staff sin módulos

1. Deshabilitar todos los módulos para un Staff
2. Login como Staff
3. Ver `/no-access`
4. Click “Cerrar sesión” → `/login`
