# AFIP / ARCA Master Index
**Proyecto:** NODUX  
**Versión:** v1.0  
**Estado:** Canonical index  
**Última actualización:** 2026-03-08

---

## 1. Propósito

Este documento es el índice canónico del módulo fiscal AFIP / ARCA de NODUX.

Objetivos:

- centralizar navegación documental
- definir orden de lectura
- fijar fuente de verdad por tema
- distinguir docs canónicos vs legacy

---

## 2. Estructura actual

```text
docs/ARCA/
  afip-arca-master-index.md

  architecture/
    afip-arca-fiscal-service.md
    afip-arca-data-model.md
    afip-arca-state-machine.md
    afip-arca-security-and-secrets.md
    afip-arca-wsaa-wsfev1-integration-contracts.md

  implementation/
    20260308133000_fiscal_core.sql
    20260308134500_fiscal_helpers_and_rpc.sql
    afip-arca-lote-1-homologacion-base.md
    afip-arca-worker-runtime.md
    afip-arca-worker-error-catalog.md
    afip-arca-render-pipeline.md
    afip-arca-reconciliation-playbook.md
    afip-arca-testing-strategy.md
    afip-arca-codex-task-prompts.md

  architecture/modelo de implementacion.md              (legacy)
  configuracion fiscal.md                               (legacy)
  implementacion nodux.md                               (legacy)
```

---

## 3. Orden oficial de lectura

1. `docs/ARCA/architecture/afip-arca-fiscal-service.md`
2. `docs/ARCA/architecture/afip-arca-data-model.md`
3. `docs/ARCA/architecture/afip-arca-state-machine.md`
4. `docs/ARCA/architecture/afip-arca-security-and-secrets.md`
5. `docs/ARCA/architecture/afip-arca-wsaa-wsfev1-integration-contracts.md`
6. `docs/ARCA/implementation/afip-arca-lote-1-homologacion-base.md`
7. `docs/ARCA/implementation/20260308133000_fiscal_core.sql`
8. `docs/ARCA/implementation/20260308134500_fiscal_helpers_and_rpc.sql`
9. `docs/ARCA/implementation/afip-arca-worker-runtime.md`
10. `docs/ARCA/implementation/afip-arca-worker-error-catalog.md`
11. `docs/ARCA/implementation/afip-arca-render-pipeline.md`
12. `docs/ARCA/implementation/afip-arca-reconciliation-playbook.md`
13. `docs/ARCA/implementation/afip-arca-testing-strategy.md`
14. `docs/ARCA/implementation/afip-arca-codex-task-prompts.md`

---

## 4. Fuente de verdad por tema

| Tema | Documento canónico |
| --- | --- |
| Arquitectura general | `docs/ARCA/architecture/afip-arca-fiscal-service.md` |
| Modelo de datos | `docs/ARCA/architecture/afip-arca-data-model.md` |
| Máquina de estados | `docs/ARCA/architecture/afip-arca-state-machine.md` |
| Seguridad y secretos | `docs/ARCA/architecture/afip-arca-security-and-secrets.md` |
| Contratos WSAA/WSFEv1 | `docs/ARCA/architecture/afip-arca-wsaa-wsfev1-integration-contracts.md` |
| Base SQL fiscal | `docs/ARCA/implementation/20260308133000_fiscal_core.sql` |
| Helpers/RPC fiscal | `docs/ARCA/implementation/20260308134500_fiscal_helpers_and_rpc.sql` |
| Runtime worker | `docs/ARCA/implementation/afip-arca-worker-runtime.md` |
| Catálogo de errores | `docs/ARCA/implementation/afip-arca-worker-error-catalog.md` |
| Render pipeline | `docs/ARCA/implementation/afip-arca-render-pipeline.md` |
| Reconciliación | `docs/ARCA/implementation/afip-arca-reconciliation-playbook.md` |
| Testing | `docs/ARCA/implementation/afip-arca-testing-strategy.md` |
| Prompts de ejecución | `docs/ARCA/implementation/afip-arca-codex-task-prompts.md` |

---

## 5. Reglas de coherencia

- No redefinir contratos canónicos en docs legacy.
- Si cambia estado/tablas/RPC, actualizar en el mismo lote:
  - data-model
  - state-machine
  - SQL de referencia
  - docs de runtime/error/reconcile si aplica
- Usar naming consistente:
  - `invoice_job`
  - `sale_document`
  - `pending_reconcile`
  - `render_pending`
  - `WSAA`
  - `WSFEv1`

---

## 6. Legacy

Los siguientes documentos quedan como contexto histórico y no son fuente de verdad:

- `docs/ARCA/architecture/modelo de implementacion.md`
- `docs/ARCA/configuracion fiscal.md`
- `docs/ARCA/implementacion nodux.md`

---

## 7. Conclusión

La carpeta ARCA queda organizada con una jerarquía clara de documentos canónicos, una capa de implementación SQL/operación, y material legacy aislado para referencia histórica.
