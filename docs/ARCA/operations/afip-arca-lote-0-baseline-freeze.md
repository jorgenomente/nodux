# AFIP / ARCA — Lote 0 Baseline & Freeze
**Proyecto:** NODUX  
**Versión:** v1.0  
**Estado:** Activo  
**Última actualización:** 2026-03-08

---

## 1. Objetivo

Establecer un baseline técnico y un freeze de alcance para iniciar la implementación fiscal sin romper operación existente.

Este lote no implementa código funcional fiscal.  
Solo prepara condiciones de seguridad para ejecutar Lote 1 (DB canónica).

---

## 2. Alcance de Lote 0

Incluye:

- inventario de contratos y artefactos ARCA vigentes
- definición de alcance congelado (qué sí / qué no entra ahora)
- checklist de precondiciones técnicas
- gates de salida para habilitar Lote 1
- bitácora de riesgos y rollback lógico

No incluye:

- nuevas migraciones productivas
- cambios en POS / sales
- implementación de worker
- integración real WSAA/WSFEv1

---

## 3. Inventario base (fuente de verdad actual)

- Arquitectura: `docs/ARCA/architecture/*`
- Implementación referencia:
  - `docs/ARCA/implementation/20260308133000_fiscal_core.sql`
  - `docs/ARCA/implementation/20260308134500_fiscal_helpers_and_rpc.sql`
- Operación:
  - `docs/ARCA/operations/fiscal-onboarding-playbook.md`
- Historial por lote:
  - `docs/ARCA/activity-log.md`
- Índice maestro:
  - `docs/ARCA/afip-arca-master-index.md`

---

## 4. Freeze de alcance (obligatorio)

Durante Lote 0 y Lote 1:

- no agregar nuevos estados fuera de:
  - `pending`, `reserved`, `authorizing`, `authorized`, `rejected`, `pending_reconcile`, `render_pending`, `completed`, `failed`
- no renombrar tablas fiscales canónicas
- no mover lógica de secuencia fuera de DB
- no mezclar homologación y producción en la misma configuración operativa
- no exponer secretos en frontend ni APIs públicas

---

## 5. Checklist de precondiciones

1. Contratos canónicos alineados:
- `data-model` vs `state-machine` vs SQL helpers/RPC.

2. Rutas y referencias internas consistentes:
- sin referencias legacy activas como fuente de verdad.

3. SQL de referencia ejecutable:
- archivo de helpers finalizando en `commit;`.

4. Estrategia de activación controlada:
- feature flag fiscal por tenant/sucursal definida para rollout gradual.

5. Logging mínimo definido:
- `invoice_job_id`, `tenant_id`, `environment`, `pto_vta`, `cbte_tipo`, `cbte_nro`, `correlation_id`.

---

## 6. Riesgos principales antes de Lote 1

- colisión de numeración por transición incompleta
- estados inciertos mal clasificados como rechazo
- acoplamiento accidental POS <-> SOAP
- cambios de schema sin actualización documental cruzada
- fuga de secretos por logging o rutas públicas

---

## 7. Gates de salida (DoD de Lote 0)

Lote 0 se considera cerrado solo si:

1. Existe este documento de baseline/freeze.
2. `docs/ARCA/activity-log.md` registra el inicio y cierre de Lote 0.
3. `docs/ARCA/afip-arca-master-index.md` referencia explícita a este lote.
4. Se acuerda plan de ejecución de Lote 1 (DB-only) sin mezclar UI/worker.

---

## 8. Plan inmediato (Lote 1)

Objetivo: llevar SQL canónica de ARCA a migraciones reales en `supabase/migrations`.

Secuencia mínima:

1. portar `fiscal_core.sql` a migración versionada
2. portar `fiscal_helpers_and_rpc.sql` a migración versionada
3. ejecutar `npm run db:reset`
4. validar objetos creados
5. validar RLS mínima (allow/deny)
6. actualizar bitácoras y roadmap ARCA

---

## 9. Criterio anti-rotura

Si durante Lote 1 aparece incompatibilidad con módulos actuales:

1. detener avance
2. registrar incidente en `docs/ARCA/activity-log.md`
3. aplicar scope cut
4. retomar solo con contrato estable validado
