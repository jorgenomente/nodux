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

5. `/cashbox`
   - Roles: ST (si módulo `cashbox` habilitado)
   - Tipo: Primary
   - Módulo: Caja
   - Propósito: apertura/cierre de caja por sucursal y conciliación

6. `/products/lookup`
   - Roles: ST (si módulo `products_lookup` habilitado)
   - Tipo: Primary
   - Módulo: Productos
   - Propósito: consulta rápida de precios y stock

7. `/clients`
   - Roles: ST (si módulo `clients` habilitado)
   - Tipo: Primary
   - Módulo: Clientes y pedidos especiales
   - Propósito: ver/crear pedidos especiales (scope limitado)

8. `/expirations`
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

9. `/dashboard`
   - Roles: OA
   - Tipo: Primary
   - Módulo: Dashboard
   - Propósito: visión operativa del negocio

10. `/pos`

- Roles: OA
- Tipo: Primary
- Módulo: Ventas
- Propósito: operar o auditar ventas

11. `/products`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Productos y Stock
    - Propósito: gestionar productos y stock por sucursal

12. `/expirations`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Vencimientos
    - Propósito: gestionar vencimientos y alertas

13. `/suppliers`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Proveedores
    - Propósito: listar y gestionar proveedores

14. `/orders`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Pedidos a proveedor
    - Propósito: listar y crear pedidos a proveedor

15. `/orders/calendar`
    - Roles: OA, ST
    - Tipo: Primary
    - Módulo: Calendario de proveedores
    - Propósito: ver agenda de envíos y recepciones por proveedor

16. `/clients`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Clientes y pedidos especiales
    - Propósito: gestionar clientes y pedidos especiales end-to-end

17. `/settings`
    - Roles: OA
    - Tipo: Secondary (hub)
    - Módulo: Configuración
    - Propósito: acceso a settings del sistema

---

## 4) Detalles / Subrutas (Org Admin)

18. `/suppliers/[supplierId]`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Proveedores
    - Propósito: detalle del proveedor + productos asociados

19. `/orders/[orderId]`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Pedidos a proveedor
    - Propósito: gestionar pedido (draft → sent → received → reconciled)

---

## 5) Settings (Org Admin / Superadmin)

20. `/settings/staff-permissions`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Permisos Staff
    - Propósito: habilitar/deshabilitar módulos para Staff

21. `/settings/users`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Usuarios
    - Propósito: invitar y gestionar usuarios

22. `/settings/branches`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Sucursales
    - Propósito: crear y gestionar sucursales

23. `/settings/preferences`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Preferencias
    - Propósito: parámetros simples (alertas, UX)

24. `/settings/audit-log`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Auditoría
    - Propósito: ver registro de acciones importantes dentro de la org

---

## 6) Superadmin (Primary)

25. `/superadmin`
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
- `/cashbox`
- `/dashboard`
- `/settings/staff-permissions`
- `/products/lookup`
- `/expirations`
- `/suppliers`
- `/suppliers/[supplierId]`
- `/orders`
- `/orders/calendar`
- `/orders/[orderId]`
- `/products`
- `/clients`
- `/settings/users`
- `/settings/branches`
- `/settings/preferences`
- `/settings/audit-log`
- `/superadmin`

### Pendientes de documentar (siguientes)

- Ninguna (todas las pantallas del MVP tienen contrato documentado)

---

## 8) Regla final

Si una pantalla:

- no está en este índice
- no tiene contrato
- no tiene rol claro

👉 **no se codea**.
