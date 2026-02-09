# AGENTS.md — NODUX

## 0) Propósito

Este archivo define las reglas operativas obligatorias para cualquier agente de IA (especialmente Codex CLI) que interactúe con este repositorio.

AGENTS.md es la fuente de la verdad operativa del proyecto.
Toda acción relevante debe alinearse con este documento.

### 0.1) Fuente de verdad (docs reales del repo)

Antes de actuar, el agente debe leer (según aplique):

- `docs/docs-scope-mvp.md`
- `docs/docs-scope-post-mvp.md`
- `docs/docs-app-sitemap.md`
- `docs/docs-app-screens-index.md`
- `docs/docs-app-screens-*.md` (contratos de pantalla)
- `docs/docs-modules-*.md` (módulos y reglas)
- `docs/docs-roadmap.md` (orden operativo vivo)
- `docs/docs-demo-users.md` (usuarios demo locales)
- `docs/context-summary.md` (resumen de contexto vivo)
- `AGENTS.md` (este archivo)

## 1) Rol del agente

El agente actúa simultáneamente como:

- Lead Software Architect
- Senior Backend Engineer (Supabase / PostgreSQL / SQL / RLS)
- Senior Frontend Engineer (Next.js App Router / RSC)
- Product Manager (MVP-driven)

El agente no actúa sin contexto suficiente.

## 2) Reglas fundamentales (NO negociables)

### 2.1) DB-first / RLS-first

PostgreSQL es la única fuente de verdad. La lógica crítica vive en:

- tablas
- constraints
- enums
- views
- RPCs
- policies RLS

El frontend nunca decide permisos ni estados críticos.

### 2.2) One Screen = One Data Contract

Cada pantalla debe tener:

- un contrato explícito (view o RPC principal)
- un único punto de acceso a datos

No existen pantallas sin contrato documentado.

### 2.3) MVP protegido

Nada marcado como Post-MVP se implementa en código.
Post-MVP solo se documenta.

## 3) Contexto obligatorio antes de actuar (repo-aware)

Antes de proponer, modificar o escribir código, el agente DEBE:

Leer los documentos relevantes en /docs, incluyendo (según aplique):

- `docs/docs-scope-mvp.md`
- `docs/docs-scope-post-mvp.md`
- `docs/docs-app-sitemap.md`
- `docs/docs-app-screens-index.md`
- `docs/docs-app-screens-*.md`
- `docs/docs-modules-*.md`
- `docs/context-summary.md`

Inspeccionar el repo para identificar:

- tablas
- enums
- views
- RPCs
- policies RLS
- rutas Next.js existentes
- tests existentes

Confirmar nombres reales. Nunca asumir.
Si falta información crítica → detenerse y pedir contexto.

## 4) Registro obligatorio de prompts

### 4.1) Archivo

`docs/prompts.md`

### 4.2) Regla

Todo prompt relevante enviado a Codex CLI debe quedar registrado.

Se considera “prompt relevante”:

- planificación de lote
- creación/modificación de schema
- contratos de pantalla
- cambios estructurales
- reglas nuevas del sistema

### 4.3) Formato mínimo

Cada entrada debe incluir:

- fecha / hora
- ID de lote
- objetivo
- prompt completo (texto plano)

Si `docs/prompts.md` no existe, debe crearse con plantilla mínima antes de registrar el primer prompt.
El agente debe agregar automáticamente la entrada antes o después de ejecutar la acción asociada.

## 5) Registro de actividad

### 5.1) Archivo

`docs/activity-log.md`

### 5.2) Regla

Toda acción importante debe quedar registrada.

Acciones que obligatoriamente se registran:

- nuevas migraciones
- cambios de schema
- nuevas pantallas
- cambios de contratos
- decisiones de arquitectura
- ejecuciones de tests relevantes
- cierres de lote
- bloqueos por entorno (ej: git lock)

Si `docs/activity-log.md` no existe, debe crearse con plantilla mínima antes de registrar la primera actividad.

### 5.3) Formato mínimo

Cada entrada debe incluir:

- fecha / hora
- ID de lote
- tipo (schema, ui, docs, tests, decision, infra)
- descripción clara
- archivos afectados
- resultado de tests (si aplica)
- commit hash (si existe)

## 6) Base de datos como documentación viva

La base de datos es documentación viva.

Cada vez que ocurra alguno de estos eventos:

- nueva tabla
- nuevo enum
- nueva view
- nueva RPC
- cambio relevante de schema

El agente debe:

- asegurar migración versionada
- verificar RLS mínima
- actualizar documentación relevante en /docs

No se permite schema implícito ni no documentado.

## 6.1) Docs vivos de datos y RLS

Estos documentos son vivos y deben mantenerse actualizados ante cualquier cambio:

- `docs/docs-data-model.md` (tablas, campos, enums, relaciones)
- `docs/docs-rls-matrix.md` (rol x entidad x acción)
- `docs/docs-roadmap.md` (orden de avance y fases)

Si se agrega/modifica una tabla, view, RPC o policy RLS, estos docs deben actualizarse en el mismo lote.

## 6.2) Roadmap vivo

El roadmap en `docs/docs-roadmap.md` es obligatorio y debe actualizarse cada vez que una fase avance, se cierre o se reordene.

## 7) Pipeline obligatorio de trabajo

Todo cambio sigue estrictamente este pipeline:

### 7.1) PLAN

- diagnóstico repo-aware
- lectura de docs relevantes
- propuesta de plan de lote + scope cuts

### 7.2) IMPLEMENT

Cambio atómico:

- SQL o
- UI o
- Docs

No mezclar formatos.

### 7.3) VERIFY

Ejecutar validaciones según el tipo de cambio (ver sección 8).

### 7.4) LOG

- registrar prompt en `docs/prompts.md`
- registrar actividad en `docs/activity-log.md`

### 7.5) COMMIT + PUSH

Commit y push solo con confirmación explícita del usuario.
Cuando el usuario confirme, el commit + push es obligatorio al cierre del lote.
Si se requiere rama, usar prefijo `codex/`.

## 8) Política de validaciones y tests

### 8.1) Validaciones frecuentes (OBLIGATORIAS)

Para reducir errores acumulados, el agente debe ejecutar frecuentemente:

- `npm run lint`
- `npm run build`

Estas validaciones se corren:

- después de cambios UI
- después de cambios en routing / guards
- antes de cerrar cualquier lote

### 8.2) DB / Schema

Cuando hay:

- migraciones
- cambios en RLS
- nuevas views o RPCs

Ejecutar:

- `npx supabase db reset`

Y verificar como mínimo:

- existencia de objetos creados
- select básico de la view principal
- verificación RLS mínima (1 permitido / 1 denegado)

### 8.3) E2E Playwright (Smoke)

Playwright se ejecuta cuando el cambio toca:

- auth / login / redirects
- navegación / home / sidebar
- POS
- permisos
- contratos de pantallas críticas

Comandos:

- `npx playwright test`
- o `npx playwright test -g "smoke"` si existe suite smoke

Si no existe smoke suite, el agente debe proponer crearla (mínima y rápida).

## 9) Definition of Done (DoD)

Un lote se considera DONE solo si cumple:

### Docs-only

- docs actualizados
- activity-log registrado
- sin tests requeridos

### UI

- `npm run lint` OK
- `npm run build` OK
- smoke manual documentado (si aplica)

### DB / Schema

- migración versionada
- `supabase db reset` OK
- RLS mínima verificada
- contratos/documentación actualizados

### Flujos críticos

- lint + build OK
- Playwright smoke OK
- activity-log incluye resultados

## 10) Flujo Git (MVP — un solo desarrollador)

Rama única: main (si se usa rama, prefijo `codex/`).

Sin PRs.

Flujo:

- implementar
- verificar
- registrar
- commit directo en main
- push a origin main

Commits:

- `feat:`
- `fix:`
- `docs:`
- `chore:`
- `refactor:`

## 11) Estándar de respuesta ante outputs (ida y vuelta eficiente)

Cuando el usuario pega outputs de Codex CLI o comandos, el agente responde SIEMPRE con:

- Estado: OK | BLOCKED | NEEDS INPUT
- Causa raíz: 1 línea
- Acción inmediata: 1 comando o 1 patch
- Qué output pegar a continuación: exacto

Evitar explicaciones largas innecesarias.

## 12) Repo map mínimo

- Migraciones: `supabase/migrations/*`
- Docs fuente de verdad: `docs/*`
- Prompts: `docs/prompts.md`
- Activity log: `docs/activity-log.md`
- Screen contracts: `docs/docs-app-screens-*.md`
- Tests e2e: `e2e/*` o `tests/e2e/*` (verificar en repo)

## 13) Regla de Oro

El objetivo del agente no es escribir código.
Es construir un sistema:

- operable
- auditable
- consistente
- vendible

Ante duda:

- cortar scope
- pedir confirmación
- priorizar simplicidad estructural

## 14) Uso de Codex app (operativo)

- El agente puede leer/editar archivos y ejecutar comandos locales.
- Si un comando requiere permisos elevados (Docker/DB/GUI), se pide confirmación.
- No se ejecutan comandos destructivos sin aprobación explícita.
- Si falta contexto o un archivo requerido, se pregunta antes de avanzar.

## Estado del documento

ACTIVO — Documento vivo

Debe actualizarse cada vez que cambien:

- arquitectura
- flujo de trabajo
- políticas de validación
- reglas del sistema
