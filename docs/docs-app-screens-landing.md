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

- Headline: `El sistema operativo de tu tienda`.
- Subheadline orientado a control operativo (ventas, inventario, caja, compras).
- CTA principal: `Solicitar demo` (mailto en MVP).
- CTA secundaria: `Ver como funciona` -> `/demo`.
- CTA terciaria: `Empezar ahora` -> `https://app.nodux.app/login` (o `/login` en entorno local).
- Visual de flujo operativo conectado (Mercancia -> Inventario -> Ventas -> Caja -> Compras -> Pagos -> Reposicion).

### Problema del retail + caos operativo

- Bloques de dolores concretos del retail:
  - inventario que no coincide
  - vencimientos detectados tarde
  - pedidos improvisados
  - cierres de caja confusos
  - canal online desconectado
  - falta de visibilidad multi-sucursal

### Cambio de perspectiva / categoria

- Introducir categoria: `Retail Operating System`.
- Mensaje clave: no es otro POS ni un ERP; es infraestructura operativa conectada.

### Que hace NODUX (modulos)

- Ventas + POS
- Inventario y vencimientos
- Caja auditable
- Compras y proveedores
- Control multi-sucursal
- Tienda online conectada

### Comercio unificado

- Explicar flujo BOPIS (cliente -> tienda online -> sucursal -> pedido listo -> retiro).

### Beneficios operativos

- Traducir modulos a resultados:
  - menos vencidos
  - menos quiebres/sobrestock
  - compras basadas en datos
  - caja trazable
  - mas control para el dueno

### Credibilidad

- Reforzar origen en operacion real de tiendas retail.
- Mantener tono de autoridad practica, no lenguaje SaaS abstracto.

### Cierre / conversion

- Reafirmar enfoque DB-first / RLS-first.
- CTA final principal: `Solicitar demo`.
- CTA final secundaria: `Hablar con el fundador`.
- CTA final adicional: `Ver demo publica`.

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

### LP-02: CTA principal de conversion

1. Click en `Solicitar demo`.
2. Abre `mailto:hola@nodux.app` con asunto de demo.

### LP-03: CTA demo publica

1. Click en `Ver como funciona` o `Ver demo publica`.
2. Navega a `/demo`.

### LP-04: acceso con sesion activa

1. Estar autenticado.
2. Abrir `/landing` por URL directa.
3. La pantalla carga sin romper el flujo del resto de rutas.
