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

- Pantalla estática sin lectura de DB.
- Sin RPC principal en MVP.
- Datos visuales de referencia (ficticios), no vinculados a producción.

---

## UI (secciones mínimas)

### Hero demo

- Mensaje de entorno seguro de demostración.
- CTA a `/landing`.
- CTA a `/login`.

### Métricas de ejemplo

- Cards con KPIs ficticios de operación.

### Módulos del producto

- POS y Caja.
- Stock y Vencimientos.
- Proveedores y Compras.

---

## Reglas de negocio

- No requiere sesión.
- No permite escritura ni acciones transaccionales.
- Debe vivir en host de marketing (`nodux.app`) y no en host app operativo.

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
