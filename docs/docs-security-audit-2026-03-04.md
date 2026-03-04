# Auditoria de Seguridad — NODUX

Fecha: 2026-03-04 14:02 -03
Alcance: app Next.js (rutas/server actions/route handlers), Supabase (Auth/RLS/RPC/Storage), dependencias y controles operativos.
Metodologia: revision repo-aware de codigo + migraciones + docs + `npm audit --omit=dev`.

---

## 1) Resumen ejecutivo

Estado general: **Bueno con riesgos concretos a corregir**.

Fortalezas actuales:
- Arquitectura `DB-first / RLS-first` consistente.
- Uso extensivo de RLS, views y RPCs para control de permisos por org/sucursal.
- Sesiones y guardas centralizadas (`proxy.ts`, `lib/auth/org-session.ts`).
- Storage privado para comprobantes sensibles con signed URLs temporales.

Riesgos prioritarios:
1. Dependencia `xlsx` con vulnerabilidades `high` (Prototype Pollution + ReDoS).
2. Endpoint publico de checkout sin rate-limit/anti-bot/captcha.
3. Falta de hardening HTTP (CSP/HSTS/headers de seguridad).
4. Algunas rutas publicas devuelven errores internos de RPC al cliente.

---

## 2) Hallazgos por severidad

## Critico
- No se detectaron hallazgos criticos en esta revision.

## Alto

### H-01 — Vulnerabilidad en dependencia `xlsx`
- Evidencia: `package.json` usa `xlsx@^0.18.5`.
- Evidencia: `npm audit --omit=dev --json` reporta:
  - `GHSA-4r6h-8v6p-xvw6` (Prototype Pollution) `high`
  - `GHSA-5pgg-2g8v-p4x9` (ReDoS) `high`
- Impacto: parsing de archivos onboarding puede exponer a denegacion de servicio o comportamientos inseguros con archivos maliciosos.
- Recomendacion:
  - Migrar a version no vulnerable (>= `0.20.2`) o reemplazar libreria.
  - Agregar validacion estricta de tamaño/tiempo de parseo y timeout de procesamiento para imports.

### H-02 — Checkout publico sin controles anti-abuso
- Evidencia: [app/api/storefront/order/route.ts](/Users/jorgepulido/CosmicStudio/nodux/app/api/storefront/order/route.ts)
- Evidencia DB: `rpc_create_online_order` con `grant execute ... to anon` en migraciones online-store.
- Hallazgo: endpoint anonimo sin rate-limit, sin CAPTCHA/challenge, sin cuota por IP/fingerprint.
- Impacto: spam de pedidos, stress de DB/RPC, ruido operativo y vector de degradacion.
- Recomendacion:
  - Rate limiting por IP + org + branch (edge o API gateway).
  - Challenge anti-bot (Cloudflare Turnstile/hCaptcha) en checkout.
  - Throttling progresivo + bloqueo temporal por picos anormales.

## Medio

### M-01 — Faltan security headers baseline
- Evidencia: [next.config.ts](/Users/jorgepulido/CosmicStudio/nodux/next.config.ts) sin `headers()` para CSP/HSTS/XFO/etc.
- Impacto: mayor superficie ante XSS, clickjacking, mixed content downgrade y exfiltracion via fuentes externas.
- Recomendacion:
  - Implementar headers minimos:
    - `Content-Security-Policy`
    - `Strict-Transport-Security`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy`
    - `Permissions-Policy`
    - `X-Frame-Options` (o `frame-ancestors` en CSP)

### M-02 — Exposicion de mensajes internos en endpoint publico
- Evidencia: [app/api/storefront/order/route.ts](/Users/jorgepulido/CosmicStudio/nodux/app/api/storefront/order/route.ts) retorna `error.message` directo al cliente.
- Impacto: filtracion de detalles internos (reglas de negocio/DB), util para reconocimiento por atacante.
- Recomendacion:
  - Responder mensajes genericos en publico.
  - Log interno con `request_id` y correlacion para debugging.

### M-03 — Upload de imagen de producto con validacion server-side insuficiente
- Evidencia: [app/products/page.tsx](/Users/jorgepulido/CosmicStudio/nodux/app/products/page.tsx)
- Hallazgo: `parseImageDataUrl` no valida magic bytes, ni limita tamaño antes de decodificar Base64, y acepta `contentType` del cliente.
- Impacto: consumo de memoria/CPU en server action (DoS autenticado) y mayor riesgo de payloads malformados.
- Recomendacion:
  - Limitar tamaño en servidor antes de `Buffer.from`.
  - Verificar firma real del archivo (magic bytes) y whitelist fuerte (`jpeg/png/webp`).
  - Reducir `serverActions.bodySizeLimit` o mover upload a flujo firmado controlado.

## Bajo

### L-01 — Login CSRF en ruta demo (riesgo operativo bajo)
- Evidencia: [app/demo/enter/route.ts](/Users/jorgepulido/CosmicStudio/nodux/app/demo/enter/route.ts)
- Hallazgo: `POST /demo/enter` inicia sesion demo sin token CSRF.
- Impacto: forzar sesion demo de un usuario (molestia operativa, no robo de datos).
- Recomendacion: validar `Origin/Referer` y/o token anti-CSRF en esa ruta.

---

## 3) Controles de seguridad ya implementados (positivos)

- Multi-tenant con RLS en tablas core y modulos recientes.
- RPCs criticas con `security definer` + chequeos de `auth.uid()` y membresia.
- Guards de rol/modulo en `proxy.ts` + verificacion adicional en server actions.
- Buckets sensibles privados (`supplier-invoices`, `online-order-proofs`) con acceso por org.
- Signed URLs temporales para archivos privados.
- Smoke test de RLS disponible (`npm run db:rls:smoke`).
- Registro de auditoria funcional (`audit_log`, `v_audit_log_admin`).

---

## 4) Instrumentos de seguridad recomendados (target state)

## Perimetro y anti-DDoS
- WAF/CDN (Cloudflare o equivalente) delante de app y API.
- Rate-limit por ruta critica (`/api/storefront/order`, login, tracking, uploads).
- Bot management + challenge en checkout publico.

## App/API
- CSP estricta + hardening headers.
- Estandar de errores: publico generico, interno detallado con `request_id`.
- Validacion de payloads con esquemas estrictos (Zod) en rutas publicas.
- Cuotas por usuario/org para acciones costosas (imports, uploads).

## Datos y DB
- Mantener RLS-first, revisar grants `anon/authenticated` en cada RPC publica.
- Limites defensivos en RPC publicas (max items por pedido, longitudes maximas, saneamiento).
- Backup verificado + restore drills + retencion definida.

## Deteccion y respuesta
- Logs centralizados (app + DB + edge) con alertas:
  - picos de 4xx/5xx
  - picos de creación de pedidos online
  - fallos repetidos de auth
- Tablero de seguridad y runbook de incidentes (P1/P2).

## Cadena de suministro
- SCA continuo (Dependabot/Renovate + politica de bloqueo para HIGH/CRITICAL).
- SBOM y revisiones periodicas de dependencias de parseo de archivos.

---

## 5) Plan de remediacion priorizado

### Fase 1 (0-3 dias)
1. Mitigar `xlsx` (upgrade/reemplazo) y validar importaciones.
2. Implementar rate-limit en `/api/storefront/order`.
3. Sanitizar errores publicos en checkout.
4. Agregar CSP + headers de seguridad base.

### Fase 2 (1-2 semanas)
1. Integrar challenge anti-bot en checkout.
2. Endurecer upload server-side (magic bytes, limites estrictos, quotas).
3. Alertas operativas de abuso (pedidos por IP/org/time-window).

### Fase 3 (2-4 semanas)
1. WAF reglas administradas + playbook de incidentes.
2. Dashboard de seguridad/observabilidad.
3. Ejercicio de recuperacion (backup/restore) documentado.

---

## 6) Evidencia revisada (muestra)

- [proxy.ts](/Users/jorgepulido/CosmicStudio/nodux/proxy.ts)
- [lib/auth/org-session.ts](/Users/jorgepulido/CosmicStudio/nodux/lib/auth/org-session.ts)
- [app/api/storefront/order/route.ts](/Users/jorgepulido/CosmicStudio/nodux/app/api/storefront/order/route.ts)
- [app/demo/enter/route.ts](/Users/jorgepulido/CosmicStudio/nodux/app/demo/enter/route.ts)
- [app/products/page.tsx](/Users/jorgepulido/CosmicStudio/nodux/app/products/page.tsx)
- [next.config.ts](/Users/jorgepulido/CosmicStudio/nodux/next.config.ts)
- [supabase/migrations/20260301213000_068_online_store_foundation.sql](/Users/jorgepulido/CosmicStudio/nodux/supabase/migrations/20260301213000_068_online_store_foundation.sql)
- [supabase/migrations/20260302121000_070_online_store_checkout_tracking_iteration.sql](/Users/jorgepulido/CosmicStudio/nodux/supabase/migrations/20260302121000_070_online_store_checkout_tracking_iteration.sql)
- [supabase/migrations/20260302101500_069_online_order_proofs_storage_bucket.sql](/Users/jorgepulido/CosmicStudio/nodux/supabase/migrations/20260302101500_069_online_order_proofs_storage_bucket.sql)
- [supabase/migrations/20260303134000_074_product_images_bucket_and_products_view_image.sql](/Users/jorgepulido/CosmicStudio/nodux/supabase/migrations/20260303134000_074_product_images_bucket_and_products_view_image.sql)

Comando ejecutado:
- `npm audit --omit=dev --json` (2026-03-04) -> 1 dependencia con vulnerabilidades HIGH (`xlsx`).
