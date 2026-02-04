# nodux — Pantallas del MVP (Índice)

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

Este documento lista TODAS las pantallas del MVP.
Si una pantalla no está acá, no se implementa.

Regla base:

- One Screen = One Data Contract
- Toda ruta tiene rol, propósito y punto de entrada claro

---

## Convenciones

### Roles

- SA = Superadmin
- OA = Org Admin
- ST = Staff

### Tipos

- Primary: navegación principal
- Secondary: navegación secundaria / detalle
- Utility: soporte (login, no-access, etc.)

---

## 1) Públicas / Utility

1. `/login`
   - Roles: Público
   - Tipo: Utility
   - Propósito: autenticación y redirect post-login

2. `/logout`
   - Roles: SA / OA / ST
   - Tipo: Utility
   - Propósito: cerrar sesión y limpiar estado

3. `/no-access`
   - Roles: ST
   - Tipo: Utility
   - Propósito: informar que no hay módulos habilitados

---

## 2) Staff (Primary, navegación dinámica por permisos)

> Home de Staff = primer módulo habilitado según `staff_module_access`.

4. `/pos`
   - Roles: ST (si módulo `pos` habilitado)
   - Tipo: Primary
   - Módulo: Ventas (POS)
   - Propósito: registrar ventas rápidas

5. `/products/lookup`
   - Roles: ST (si módulo `products_lookup` habilitado)
   - Tipo: Primary
   - Módulo: Productos
   - Propósito: consulta rápida de precios y stock

6. `/clients`
   - Roles: ST (si módulo `clients` habilitado)
   - Tipo: Primary
   - Módulo: Clientes y pedidos especiales
   - Propósito: ver/crear pedidos especiales (scope limitado)

7. `/expirations`
   - Roles: ST (opcional, si módulo habilitado)
   - Tipo: Primary
   - Módulo: Vencimientos
   - Propósito: ver vencimientos y registrar manual simple

> Nota:
>
> - Staff NO gestiona catálogo, proveedores ni pedidos a proveedor en MVP
> - Si no tiene ningún módulo habilitado → `/no-access`

---

## 3) Org Admin (Primary)

8. `/dashboard`
   - Roles: OA
   - Tipo: Primary
   - Módulo: Dashboard
   - Propósito: visión operativa del negocio

9. `/pos`
   - Roles: OA
   - Tipo: Primary
   - Módulo: Ventas
   - Propósito: operar o auditar ventas

10. `/products`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Productos y Stock
    - Propósito: gestionar productos y stock por sucursal

11. `/expirations`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Vencimientos
    - Propósito: gestionar vencimientos y alertas

12. `/suppliers`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Proveedores
    - Propósito: listar y gestionar proveedores

13. `/orders`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Pedidos a proveedor
    - Propósito: listar y crear pedidos a proveedor

14. `/clients`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Clientes y pedidos especiales
    - Propósito: gestionar clientes y pedidos especiales end-to-end

15. `/settings`
    - Roles: OA
    - Tipo: Secondary (hub)
    - Módulo: Configuración
    - Propósito: acceso a settings del sistema

---

## 4) Detalles / Subrutas (Org Admin)

16. `/suppliers/[supplierId]`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Proveedores
    - Propósito: detalle del proveedor + productos asociados

17. `/orders/[orderId]`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Pedidos a proveedor
    - Propósito: gestionar pedido (draft → sent → received → reconciled)

---

## 5) Settings (Org Admin / Superadmin)

18. `/settings/staff-permissions`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Permisos Staff
    - Propósito: habilitar/deshabilitar módulos para Staff

19. `/settings/users`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Usuarios
    - Propósito: invitar y gestionar usuarios

20. `/settings/branches`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Sucursales
    - Propósito: crear y gestionar sucursales

21. `/settings/preferences`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Preferencias
    - Propósito: parámetros simples (alertas, UX)

---

## 6) Superadmin (Primary)

22. `/superadmin`
    - Roles: SA
    - Tipo: Primary
    - Módulo: SaaS Admin
    - Propósito: gestionar organizaciones y soporte

---

## 7) Estado de documentación de pantallas

### Contratos COMPLETOS

- `/login`
- `/no-access`
- `/pos` (Staff)
- `/dashboard`
- `/settings/staff-permissions`
- `/products/lookup`
- `/expirations`
- `/suppliers`
- `/suppliers/[supplierId]`
- `/orders`
- `/orders/[orderId]`
- `/products`
- `/clients`
- `/settings/users`
- `/settings/branches`
- `/settings/preferences`
- `/superadmin`

### Pendientes de documentar (siguientes)

- `/logout` (opcional: contrato corto, pantalla utility)

---

## 8) Regla final

Si una pantalla:

- no está en este índice
- no tiene contrato
- no tiene rol claro

👉 **no se codea**.
