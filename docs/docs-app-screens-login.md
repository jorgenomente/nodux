# Screen Contract — Login

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/login`

## Rol / Acceso

- Público (no autenticado)

## Propósito

Autenticar al usuario y redirigirlo a su home correcto
según rol y permisos.

---

## UI

### Campos

- Email
- Password

### CTA

- Botón: “Iniciar sesión”
- Estado loading: “Ingresando...”
- Link secundario: `Probar demo interactiva` -> `/demo`

### Estados auxiliares

- Error de credenciales
- Loading
- Link “Olvidé mi contraseña” (presente pero deshabilitado)

---

## Acciones del usuario

### A1) Iniciar sesión

- Envía credenciales a Supabase Auth
- Maneja loading y errores
- En éxito → redirect a `/` (root resuelve el home)

---

## Reglas de redirección post-login (CRÍTICO)

Al autenticarse correctamente:

1. Resolver **rol activo** del usuario
   - Superadmin
   - Org Admin
   - Staff

2. Si Superadmin:
   - Redirect → `/superadmin`

3. Si Org Admin:
   - Redirect → `/dashboard`

4. Si Staff:
   - Resolver módulos habilitados efectivos:
     - org-wide + override por sucursal activa (si aplica)
   - Si tiene ≥1 módulo:
     - Redirect → ruta del primer módulo habilitado
       (orden definido por config / default)
   - Si NO tiene módulos:
     - Redirect → `/no-access`

---

## Estados UI

### Loading

- Spinner / disabled button durante auth

### Error

- Credenciales inválidas:
  “Email o contraseña incorrectos.”
- Error genérico:
  “No pudimos iniciar sesión. Intentá de nuevo.”

---

## Reglas de negocio

- Un usuario **no autenticado** no puede acceder a rutas privadas
- Un usuario autenticado **no debe ver** `/login`
  - Si intenta acceder → redirect a su home
- El login **no decide permisos**, solo dispara el flujo

---

## Seguridad

- No exponer mensajes de error sensibles
- Rate limiting manejado por proveedor auth
- No revelar si un email existe o no

---

## Edge cases

1. Usuario autenticado pero sin org activa

- MVP: no permitido (se asume membership válida)
- Si ocurre → error + soporte

2. Usuario con múltiples roles

- MVP: un rol efectivo por sesión
- Resolución definida por backend / helper

3. Sesión expirada

- Redirect automático a `/login`

---

## Métricas / eventos

- `login_attempted`
- `login_succeeded`
- `login_failed` (reason)

---

## Smoke tests (manual)

### L-01: Login Staff con módulos

1. Login Staff con `pos` habilitado
2. Redirect automático a `/pos`

### L-02: Login Staff sin módulos

1. Login Staff sin módulos
2. Redirect automático a `/no-access`

### L-03: Login Org Admin

1. Login OA
2. Redirect a `/dashboard`

### L-04: Login Superadmin

1. Login SA
2. Redirect a `/superadmin`
