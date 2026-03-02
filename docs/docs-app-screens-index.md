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

Ruta pública adicional (institucional, fuera del flujo operativo MVP):

- `/landing`
  - Roles: Público
  - Tipo: Utility
  - Propósito: explicar propuesta de valor de NODUX y dirigir a login/demo
- `/demo`
  - Roles: Público
  - Tipo: Utility
  - Propósito: mostrar recorrido de producto con datos ficticios en modo solo lectura

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

11. `/sales`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Ventas
    - Propósito: historial y auditoría de ventas

12. `/products`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Productos y Stock
    - Propósito: gestionar productos y stock por sucursal

13. `/expirations`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Vencimientos
    - Propósito: gestionar vencimientos y alertas

14. `/suppliers`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Proveedores
    - Propósito: listar y gestionar proveedores

15. `/orders`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Pedidos a proveedor
    - Propósito: listar y crear pedidos a proveedor

16. `/orders/calendar`
    - Roles: OA, ST
    - Tipo: Primary
    - Módulo: Calendario de proveedores
    - Propósito: ver agenda de envíos y recepciones por proveedor

17. `/clients`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Clientes y pedidos especiales
    - Propósito: gestionar clientes y pedidos especiales end-to-end

18. `/settings`
    - Roles: OA
    - Tipo: Secondary (hub)
    - Módulo: Configuración
    - Propósito: acceso a settings del sistema

19. `/onboarding`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Onboarding de datos maestros
    - Propósito: importar catalogo y resolver pendientes de completitud en productos y proveedores

---

## 4) Detalles / Subrutas (Org Admin)

20. `/suppliers/[supplierId]`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Proveedores
    - Propósito: detalle del proveedor + productos asociados

21. `/orders/[orderId]`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Pedidos a proveedor
    - Propósito: gestionar pedido (draft → sent → received → reconciled)

22. `/sales/[saleId]`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Ventas
    - Propósito: auditar una venta y corregir método de cobro (auditado)

23. `/sales/statistics`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Ventas
    - Propósito: analizar tendencias y rankings de ventas por período

24. `/sales/[saleId]/ticket`
    - Roles: OA
    - Tipo: Secondary
    - Módulo: Ventas
    - Propósito: imprimir ticket no fiscal de una venta registrada

---

## 5) Settings (Org Admin / Superadmin)

24. `/settings/staff-permissions`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Permisos Staff
    - Propósito: habilitar/deshabilitar módulos para Staff

25. `/settings/users`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Usuarios
    - Propósito: invitar y gestionar usuarios

26. `/settings/branches`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Sucursales
    - Propósito: crear y gestionar sucursales

27. `/settings/tickets`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Tickets e impresión
    - Propósito: configurar plantilla de ticket por sucursal

28. `/settings/preferences`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Preferencias
    - Propósito: parámetros simples (alertas, UX)

29. `/settings/audit-log`
    - Roles: OA (SA en soporte)
    - Tipo: Secondary
    - Módulo: Auditoría
    - Propósito: ver registro de acciones importantes dentro de la org

---

## 6) Pagos y Superadmin (Primary)

30. `/payments`
    - Roles: OA
    - Tipo: Primary
    - Módulo: Pagos a proveedor
    - Propósito: gestionar cuentas por pagar y registrar pagos por sucursal

31. `/superadmin`
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
- `/sales`
- `/dashboard`
- `/settings/staff-permissions`
- `/products/lookup`
- `/expirations`
- `/suppliers`
- `/suppliers/[supplierId]`
- `/orders`
- `/payments`
- `/onboarding`
- `/orders/calendar`
- `/orders/[orderId]`
- `/sales/[saleId]`
- `/sales/[saleId]/ticket`
- `/sales/statistics`
- `/products`
- `/clients`
- `/settings/users`
- `/settings/branches`
- `/settings/tickets`
- `/settings/preferences`
- `/settings/audit-log`
- `/superadmin`

### Pendientes de documentar (siguientes)

- Ninguna (todas las pantallas del MVP tienen contrato documentado)

---

## 8) Rutas Post-MVP en progreso

- `/:orgSlug` (storefront público por org)
- `/:orgSlug/:branchSlug` (storefront público por sucursal)
- `/o/:trackingToken` (tracking público)
- `/online-orders` (operación interna de pedidos online)

Contratos asociados:

- `docs/docs-app-screens-online-storefront-public.md`
- `docs/docs-app-screens-online-order-tracking.md`
- `docs/docs-app-screens-online-orders.md`

---

## 9) Regla final

Si una pantalla:

- no está en este índice
- no tiene contrato
- no tiene rol claro

👉 **no se codea**.
