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
- Consulta de precios → `/products/lookup`
- Clientes → `/clients`
- Vencimientos → `/expirations`
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
- Productos / Stock → `/products`
- Vencimientos → `/expirations`
- Proveedores → `/suppliers`
- Pedidos → `/orders`
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

- `/login`
- `/logout`
- `/no-access`
- `/reset-password` (opcional)

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
- `/products`
- `/products/lookup`
- `/expirations`
- `/suppliers`
- `/suppliers/[supplierId]`
- `/orders`
- `/orders/[orderId]`
- `/clients`
- `/settings`
- `/settings/users`
- `/settings/branches`
- `/settings/staff-permissions`
- `/settings/preferences`
- `/settings/audit-log`
- `/superadmin`

---

## 10. Regla de oro

Si una pantalla no está acá:

- No existe
- No se codea
