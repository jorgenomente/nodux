# Brief UX/UI — NODUX (MVP)

Este documento está pensado para alguien **principiante** en el proyecto. Explica qué hay que diseñar, para quién, y con qué restricciones. Úsalo como guía principal de diseño.

---

## 1) Objetivo del producto (en una frase)

NODUX es un sistema operativo simple para tiendas retail: **vender rápido, controlar stock real, gestionar vencimientos y compras**, con UX clara y sin complejidad innecesaria.

---

## 1.1) Idioma preferido

- El idioma base del producto es **español** (labels, mensajes, tooltips y estados).
- Evitar términos técnicos en inglés si existe una alternativa clara en español.

---

## 2) Alcance MVP (qué sí y qué no)

### Sí incluye (MVP)

- Autenticación y navegación por rol
- Ventas (POS táctil)
- Productos y stock por sucursal
- Vencimientos
- Proveedores y pedidos a proveedor
- Clientes y pedidos especiales
- Dashboard operativo
- Configuración de permisos por módulo

### No incluye (fuera del MVP)

- Facturación fiscal
- Pagos integrados
- Automatizaciones complejas
- Analítica avanzada
- App móvil nativa

Si una idea está fuera del MVP, **no se diseña**.

---

## 3) Roles y su foco

### Superadmin (SA)

Perfil SaaS. Ve y gestiona organizaciones. No opera tienda diaria.

### Org Admin (OA)

Responsable operativo. Ve todo su negocio y configura permisos.

### Staff (ST)

Operador. Usa solo módulos habilitados y con flujos rápidos.

**Regla clave:** Nunca mostrar acciones que el usuario no puede ejecutar.

---

## 4) Navegación oficial (rutas permitidas)

**Documento fuente:** `docs/docs-app-sitemap.md`

### Homes por rol

- SA → `/superadmin`
- OA → `/dashboard`
- ST → primer módulo habilitado (si no tiene, `/no-access`)

### Rutas MVP (resumen)

Public/Utility:

- `/login`
- `/logout`
- `/no-access`

Org Admin:

- `/dashboard`
- `/pos`
- `/products`
- `/expirations`
- `/suppliers`
- `/orders`
- `/orders/calendar`
- `/clients`
- `/settings`
- `/settings/users`
- `/settings/branches`
- `/settings/staff-permissions`
- `/settings/preferences`

Staff:

- `/pos`
- `/products/lookup`
- `/clients`
- `/expirations`
- `/orders/calendar`

Superadmin:

- `/superadmin`

**Si una pantalla no está en esta lista, no se diseña.**

---

## 5) Pantallas a diseñar (lista completa)

**Documento fuente:** `docs/docs-app-screens-index.md` y contratos en `docs/docs-app-screens-*.md`.

### Utility

1. `/login`
2. `/logout`
3. `/no-access`

### Staff (Primary)

4. `/pos`
5. `/products/lookup`
6. `/clients` (modo staff)
7. `/expirations` (modo staff)

### Org Admin (Primary)

8. `/dashboard`
9. `/pos` (modo admin)
10. `/products`
11. `/expirations`
12. `/suppliers`
13. `/orders`
14. `/clients` (modo admin)
15. `/settings` (hub)

### Org Admin (Secondary / detalle)

16. `/suppliers/[supplierId]`
17. `/orders/[orderId]`

### Settings (Secondary)

18. `/settings/staff-permissions`
19. `/settings/users`
20. `/settings/branches`
21. `/settings/preferences`

### Superadmin

22. `/superadmin`

---

## 6) Reglas UX clave (no negociables)

### Mobile-first real

- Diseñar primero para 360–430px.
- Targets táctiles >= 44px.
- Acciones frecuentes en 1–3 pasos.

### Estados obligatorios

Cada pantalla debe incluir:

- Loading (skeleton o placeholder)
- Empty (mensaje + CTA)
- Error (explicación clara + acción)
- Success (feedback inmediato)

### Data contract

Cada pantalla consume **un contrato de datos** (view o RPC).
Eso define qué datos se pueden mostrar. Evitar inventar campos.

---

## 7) Dificultades típicas a considerar

1. **Rol y permisos**  
   La UI debe reflejar permisos reales. Si un rol no puede ejecutar algo, no mostrar la acción.

2. **Contexto de sucursal**  
   Muchas pantallas tienen selector de sucursal para OA, pero ST solo ve su sucursal.

3. **Estados vacíos reales**  
   Ej: sin ventas, sin proveedores, sin pedidos, sin vencimientos. Deben tener CTA claro.

4. **Flujos con estados**  
   Pedidos y vencimientos tienen estados que cambian la UI (draft/sent/received, etc.).

5. **Rapidez operativa**  
   En POS y lookup, la velocidad importa más que estética.

---

## 8) Qué documentos debe leer la diseñadora

### Obligatorios

- `docs/docs-scope-mvp.md` (alcance)
- `docs/docs-app-sitemap.md` (navegación)
- `docs/docs-app-screens-index.md` (lista de pantallas)
- `docs/docs-app-screens-*.md` (contratos por pantalla)
- `docs/docs-modules-*.md` (reglas de negocio)

---

## 9) Entregables esperados

1. **Wireframes mobile-first** para cada pantalla.
2. **Variantes por rol** donde aplique (OA vs ST).
3. **Estados UI** completos (loading/empty/error/success).
4. **Notas de interacción** (qué CTA hace qué).

Opcional:

- UI kit básico (botones, cards, tablas, badges, inputs).

---

## 10) Orden recomendado de diseño

Para acelerar desarrollo:

1. Utility: `/login`, `/no-access`
2. Navegación general (shell)
3. POS (staff + admin)
4. Products / Stock
5. Expirations
6. Suppliers + Orders
7. Clients
8. Settings
9. Superadmin

---

## 11) Notas específicas por pantalla (resumen rápido)

### `/dashboard`

KPIs + alertas críticas + paneles operativos.

### `/pos`

Flujo de venta rápido con búsqueda y carrito.

### `/products`

Gestión de catálogo y stock por sucursal.

### `/products/lookup`

Búsqueda rápida de precios/stock.

### `/expirations`

Lista priorizada por vencimiento + registro manual.

### `/suppliers`

CRUD + asociación de productos.

### `/orders`

Lista de pedidos a proveedor + estados.

### `/orders/[orderId]`

Detalle del pedido y acciones por estado.

### `/clients`

Clientes y pedidos especiales.

### `/settings/*`

Permisos, usuarios, sucursales, preferencias.

### `/superadmin`

Gestión de organizaciones.

---

## 12) Contacto y dudas

Si hay una duda de alcance o data, **no inventar**. Preguntar al equipo.
