# Screen Contract — Landing pública

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

## Ruta

- `/landing`

## Rol / Acceso

- Público (autenticado y no autenticado)

## Propósito

Explicar que es NODUX, para quien esta pensado y guiar a una accion comercial
(`Solicitar demo`) o de entrada al sistema (`Iniciar sesion`).

---

## Data Contract

- Pantalla estatica sin lectura de DB.
- Sin RPC principal en MVP.

---

## UI (secciones minimas)

### Hero

- Propuesta de valor clara de NODUX.
- CTA principal: `Empezar ahora` -> `/login`.
- CTA secundaria: `Solicitar demo` (mailto en MVP).

### Problema -> Solucion

- 3 bullets de dolores operativos que NODUX resuelve.

### Modulos clave

- Ventas/Caja
- Stock/Vencimientos
- Compras/Proveedores

### Cierre

- Reafirmar enfoque DB-first / RLS-first.
- CTA final a login/demo.

---

## Estados UI

### Loading

- No aplica (contenido estatico renderizado en servidor).

### Empty

- No aplica.

### Error

- No aplica.

---

## Reglas de negocio

- No debe requerir sesion.
- No debe redirigir automaticamente a `/dashboard` o `/superadmin`.
- Debe convivir con flujo operativo autenticado sin alterar homes por rol.

---

## SEO minimo (MVP)

- `title`
- `description`
- Open Graph basico (`title`, `description`, `url`, `type`)

---

## Smoke tests (manual)

### LP-01: acceso publico

1. Abrir `/landing` sin sesion.
2. Ver contenido completo y CTAs visibles.

### LP-02: CTA login

1. Click en `Empezar ahora`.
2. Navega a `/login`.

### LP-03: acceso con sesion activa

1. Estar autenticado.
2. Abrir `/landing` por URL directa.
3. La pantalla carga sin romper el flujo del resto de rutas.
