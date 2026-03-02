# nodux — Post-MVP

Este documento define funcionalidades que NO forman parte del MVP.
Su objetivo es capturar ideas sin contaminar el desarrollo inicial.

Ningún ítem aquí se implementa sin pasar por:
Idea → Epic → Lote → Código.

---

## Categoría 1 — Fiscal y pagos

- Facturación legal
- Integración con medios de pago
- Cierres de caja avanzados
- Reportes fiscales

---

## Categoría 2 — Automatización y comunicaciones

- WhatsApp automático a clientes
- Emails automáticos a proveedores
- Alertas externas (push / email)
- Reglas automáticas de reposición

---

## Categoría 3 — Analítica avanzada

- Predicción de quiebre de stock
- Predicción de vencimientos
- Análisis de rotación
- Márgenes y rentabilidad

---

## Categoría 4 — RBAC avanzado

- Permisos por acción
- Roles custom por organización
- Auditoría de permisos

---

## Categoría 5 — Operación avanzada

- Transferencias entre sucursales
- Pantalla de movimiento de stock masivo entre sucursales
- Conteo cíclico de inventario
- Lotes / seriales
- Multi-depósito
- Integraciones externas

---

## Categoría 6 — Canal online (ecommerce conectado a stock)

- Tienda online pública por organización (slug y opcional por sucursal)
- Catálogo público con precio, stock y foto de producto
- Pedidos online con retiro en tienda
- Estado operativo de pedido online (pendiente, confirmado, guardado/listo, entregado)
- Link único público para tracking del pedido
- Comprobante de pago por transferencia/QR adjunto por cliente
- WhatsApp asistido y/o automático para notificaciones al cliente
- Dominio personalizado por tienda (CNAME o redirect)

---

## Regla de oro Post-MVP

- Nada de esto bloquea el MVP
- Nada se implementa “rápido”
- Todo requiere impacto claro en:
  - UX
  - Modelo de datos
  - RLS
  - Navegación
