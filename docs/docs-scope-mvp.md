# nodux — Alcance MVP

## Objetivo del MVP

Validar que nodux puede resolver los problemas críticos de la operación retail diaria:
ventas rápidas, control real de stock, vencimientos y compras, con una UX clara y sin
complejidad innecesaria.

El MVP debe ser usable en producción real por una tienda.

---

## Incluye (MVP)

### Plataforma

- Autenticación
- Onboarding de organización
- Creación y gestión de sucursales
- Multi-tenant real con RLS
- App shell con navegación por rol
- Auditoría de acciones (audit log) para OA/SA

### Roles

- Superadmin (SaaS)
- Org Admin
- Staff (operativo)

### Módulos operativos

- Ventas (POS táctil)
- Caja operativa por sucursal (apertura/cierre simple)
- Productos y stock por sucursal
- Vencimientos (manual y automático)
- Proveedores
- Pedidos a proveedor
- Clientes y pedidos especiales
- Dashboard operativo
- Alertas in-app
- Configuración de permisos por módulo para Staff

---

## NO incluye (explícitamente fuera del MVP)

- Facturación legal / fiscal
- Integraciones con medios de pago
- Envío de WhatsApp o emails automáticos
- App móvil nativa
- Permisos por acción (RBAC fino)
- Automatizaciones complejas
- Analítica predictiva

---

## Criterios de “Done” del MVP

- Un Org Admin puede:
  - Crear sucursales
  - Configurar permisos de Staff
  - Ver el estado real del negocio

- Un Staff puede:
  - Registrar ventas
  - Consultar precios
  - Operar solo los módulos habilitados

- El sistema:
  - Bloquea accesos por RLS (no solo UI)
  - Maneja stock y vencimientos correctamente
  - No tiene pantallas huérfanas

---

## Riesgos aceptados en MVP

- Operación manual de algunos procesos
- UX no completamente optimizada
- Reportes limitados
