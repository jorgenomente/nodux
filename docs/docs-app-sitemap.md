# nodux — Sitemap y navegación

Este documento define la navegación oficial de nodux.
No deben existir pantallas fuera de este mapa.

---

## 1. Principios

- Cada rol tiene un “home” claro
- No existen páginas huérfanas
- La navegación del Staff es dinámica según permisos
- RLS refuerza todo acceso (la UI no es la única barrera)

---

## 2. Homes por rol

### Superadmin

- **Home:** `/superadmin`
- Objetivo: visión global del SaaS

### Org Admin

- **Home:** `/dashboard`
- Objetivo: visión operativa y control del negocio

### Staff

- **Home:** primer módulo habilitado (ej: `/pos`)
- Si no tiene módulos habilitados:
  - `/no-access`

---

## 3. Navegación primaria (por rol)

### Staff (dinámica)

La navegación se construye en runtime según `staff_module_access`.

Posibles ítems:

- POS → `/pos`
- Caja → `/cashbox`
- Consulta de precios → `/products/lookup`
- Clientes → `/clients`
- Vencimientos → `/expirations`
- Calendario proveedores → `/orders/calendar`
- Otros módulos habilitados

Reglas:

- Solo se muestran módulos habilitados
- El orden es configurable
- Si un módulo se deshabilita:
  - El usuario es redirigido al siguiente módulo disponible

---

### Org Admin

Navegación fija:

- Dashboard → `/dashboard`
- Ventas → `/pos`
- Historial de ventas → `/sales`
- Estadísticas de ventas → `/sales/statistics`
- Caja → `/cashbox`
- Productos / Stock → `/products`
- Vencimientos → `/expirations`
- Proveedores → `/suppliers`
- Pedidos → `/orders`
- Pagos → `/payments`
- Onboarding datos → `/onboarding`
- Calendario proveedores → `/orders/calendar`
- Clientes → `/clients`
- Configuración → `/settings`

---

### Superadmin

- Organizaciones → `/superadmin`
- Acceso a org/sucursal (impersonation controlada)
- Soporte

---

## 4. Navegación secundaria (Detalles)

- Proveedor (detalle) → `/suppliers/[supplierId]`
- Pedido (detalle) → `/orders/[orderId]`
- Venta (detalle) → `/sales/[saleId]`
- Ticket venta (impresión) → `/sales/[saleId]/ticket`
- Estadísticas de ventas → `/sales/statistics`
- Calendario de proveedores → `/orders/calendar`

---

## 5. Navegación secundaria (Settings)

### `/settings`

Subrutas:

- `/settings/users`
- `/settings/branches`
- `/settings/staff-permissions`
- `/settings/preferences`
- `/settings/audit-log`

Acceso:

- Org Admin
- Superadmin

---

## 6. Rutas públicas / Utility

- `/landing` (publica institucional / comercial)
- `/demo` (recorrido publico guiado, solo lectura)
- `/login`
- `/logout`
- `/no-access`
- `/reset-password` (opcional)

Nota de dominio (produccion):

- `nodux.app` sirve rutas públicas de marketing.
- `app.nodux.app` sirve login y aplicación operativa autenticada.

---

## 7. Reglas de redirección

### Post-login

1. Resolver rol activo
2. Si Superadmin → `/superadmin`
3. Si Org Admin → `/dashboard`
4. Si Staff:
   - Buscar primer módulo habilitado
   - Redirigir a su ruta
   - Si no hay módulos → `/no-access`

---

## 8. Edge cases

### Staff sin módulos

- Ruta: `/no-access`
- Mensaje:
  “No tenés módulos habilitados. Contactá a tu administrador.”

### Acceso directo por URL

- UI puede permitir navegación
- RLS siempre valida acceso real

### Cambio de permisos en tiempo real

- Si un módulo activo se deshabilita:
  - Redirección automática
  - Toast informativo

---

## 9. Páginas explícitas del MVP

- `/login`
- `/logout`
- `/no-access`
- `/dashboard`
- `/pos`
- `/cashbox`
- `/sales`
- `/products`
- `/products/lookup`
- `/expirations`
- `/suppliers`
- `/suppliers/[supplierId]`
- `/orders`
- `/payments`
- `/onboarding`
- `/orders/[orderId]`
- `/sales/[saleId]`
- `/sales/[saleId]/ticket`
- `/orders/calendar`
- `/clients`
- `/settings`
- `/settings/users`
- `/settings/branches`
- `/settings/staff-permissions`
- `/settings/preferences`
- `/settings/audit-log`
- `/superadmin`

### Rutas públicas adicionales (fuera del flujo operativo MVP)

- `/landing`
- `/demo`

---

## 10. Regla de oro

Si una pantalla no está acá:

- No existe
- No se codea
