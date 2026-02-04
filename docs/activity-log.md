# Activity Log

Registro de cambios importantes del proyecto.

Formato sugerido:

## YYYY-MM-DD — <titulo corto>

**Tipo:** decision | feature | refactor | fix | docs | db | rls | ux | tests
**Alcance:** backend | frontend | db | rls | ux | infra

**Resumen**
Breve descripcion de que se hizo y por que.

**Impacto**

- Que habilita
- Que cambia
- Que NO cambia

## 2026-02-04 — Docs vivos de modelo y RLS

**Tipo:** docs
**Alcance:** db

**Resumen**
Se agregaron documentos vivos para el modelo de datos y la matriz RLS, y se actualizó AGENTS para exigir su mantenimiento.

**Impacto**

- Habilita trazabilidad clara de schema y permisos.
- Cambia el flujo: toda modificación de DB/RLS exige actualizar estos docs.
- No cambia el comportamiento del sistema.

## 2026-02-04 — Scripts de snapshot y types

**Tipo:** docs
**Alcance:** db

**Resumen**
Se agregaron scripts en package.json para snapshot de schema y generación de types desde Supabase.

**Impacto**

- Habilita generar `docs/schema.sql` y `types/supabase.ts` de forma reproducible.
- Cambia el flujo: se recomienda actualizar snapshot/types tras cambios de DB.
- No cambia el runtime de la app.

## 2026-02-04 — Brief UX/UI para diseñadora

**Tipo:** docs
**Alcance:** ux

**Resumen**
Se creó un brief detallado para UX/UI con pantallas, roles, reglas y orden recomendado de diseño.

**Impacto**

- Habilita onboarding rápido de la diseñadora.
- Alinea expectativas de pantallas y estados obligatorios.
- No cambia el comportamiento del sistema.

## 2026-02-04 — Guía rápida en docs de pantallas y módulos

**Tipo:** docs
**Alcance:** ux

**Resumen**
Se agregó una sección de guía rápida para diseño en los docs de pantallas y módulos para hacerlos más explícitos y navegables.

**Impacto**

- Mejora la claridad para UX/UI sin cambiar requisitos funcionales.
- Reduce ambigüedad al diseñar estados y acciones.
- No cambia el comportamiento del sistema.

## 2026-02-04 10:15 — Commit estado actual

**Lote:** ops-commit
**Tipo:** infra
**Descripción:** Se consolidó el estado actual del repo (configuración base, UI kit, docs y Supabase) para commit.
**Archivos:** .gitignore, .husky/pre-commit, .prettierrc, AGENTS.md, app/globals.css, components.json, components/ui/_, docs/_, lib/_, package.json, package-lock.json, supabase/_, types/supabase.ts
**Tests:** No ejecutados (no solicitados)
**Commit:** (pendiente)
