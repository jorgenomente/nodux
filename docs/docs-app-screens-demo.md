# Screen Contract — Demo pública

## Ruta

- `/demo`

## Rol / Acceso

- Público (autenticado y no autenticado)

## Propósito

Permitir a cualquier visitante entender el flujo operativo de NODUX sin
necesidad de login ni exposición de datos reales.

---

## Data Contract

- Pantalla de marketing con datos visuales ficticios.
- Acción de entrada demo: `POST /demo/enter` (route handler) para iniciar
  sesión con cuenta demo configurada por entorno.
- Sin lectura operativa de DB desde la pantalla.

---

## UI (secciones mínimas)

### Hero demo

- Mensaje de entorno seguro de demostración.
- CTA a `/landing`.
- CTA a `/login`.
- CTA principal: `Probar demo interactiva` (form `POST /demo/enter`).

### Métricas de ejemplo

- Cards con KPIs ficticios de operación.

### Módulos del producto

- POS y Caja.
- Stock y Vencimientos.
- Proveedores y Compras.

---

## Reglas de negocio

- No requiere sesión.
- Permite acceso a app operativa con cuenta demo.
- Cuenta demo en modo solo lectura (mutaciones bloqueadas por `proxy` para
  emails configurados en `DEMO_READONLY_EMAILS`).
- Debe vivir en host de marketing (`nodux.app`) y no en host app operativo.
- Si faltan variables demo (`DEMO_LOGIN_EMAIL`, `DEMO_LOGIN_PASSWORD`) debe
  informar estado no disponible.

---

## SEO mínimo (MVP)

- `title`
- `description`
- Open Graph básico (`title`, `description`, `url`, `type`)

---

## Smoke tests (manual)

### DP-01: acceso público

1. Abrir `/demo` sin sesión.
2. Ver recorrido completo y CTA a login.

### DP-02: acceso desde landing

1. Abrir `/landing`.
2. Click en `Ver demo publica`.
3. Navega a `/demo`.

### DP-03: host operativo

1. Abrir `app.nodux.app/demo`.
2. Debe redirigir a `nodux.app/demo`.

### DP-04: entrada interactiva

1. Abrir `/demo`.
2. Click en `Probar demo interactiva`.
3. Debe iniciar sesión y redirigir a home de app según rol demo.

### DP-05: bloqueo de escritura

1. Ingresar con cuenta demo.
2. Intentar guardar un cambio en cualquier módulo.
3. Debe bloquearse por modo solo lectura.
