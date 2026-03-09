NODUX — Runbook operativo del worker fiscal (`prod-safe`)

Actualizado: 2026-03-09

Objetivo: ejecutar el worker fiscal real contra jobs `prod` sin emitir comprobantes, validando `WSAA + FEDummy` y cortando antes de `FECAESolicitar`.

Nota operativa: los comandos usan `node --import tsx` en lugar de `npx tsx` para evitar bloqueos intermitentes del runtime CLI local.

## 1. Prerrequisitos

- La organización ya debe tener credencial `prod` guardada en `/settings/fiscal`.
- La organización ya debe tener `pto_vta` `prod` activo por sucursal en `/settings/fiscal`.
- `org_preferences.fiscal_prod_enqueue_enabled` debe estar activo desde `/settings/fiscal`.
- Debe existir al menos un `invoice_job` `prod` en estado `pending`.

## 2. Variables de entorno

Si la credencial `prod` fue guardada con una key maestra explícita, el worker debe usar la misma:

```bash
export FISCAL_ENCRYPTION_MASTER_KEY='...'
export FISCAL_ENCRYPTION_KEY_REFERENCE='prod-2026-03'
```

Notas:

- El script `scripts/fiscal-worker.ts` carga `.env.local` y `.env` automáticamente usando `@next/env`.
- En local, si no existe `FISCAL_ENCRYPTION_MASTER_KEY`, NODUX puede bootstrapear una key dev en `.nodux-secrets/fiscal-encryption-dev.json`.
- Para credenciales productivas reales se recomienda usar siempre env explícitas y estables.

## 3. Comandos

Modo seguro recomendado:

```bash
npm run fiscal:worker:prod-safe
```

Modo explícito equivalente:

```bash
FISCAL_EXECUTION_MODE=prod-safe FISCAL_DRY_RUN=false npm run fiscal:worker
```

Con batch size custom:

```bash
FISCAL_EXECUTION_MODE=prod-safe FISCAL_DRY_RUN=false FISCAL_BATCH_SIZE=5 npm run fiscal:worker
```

## 4. Resultado esperado

El script imprime dos bloques JSON:

- `fiscal_worker_start`
- `fiscal_worker_finish`

Si el job `prod-safe` completa la validación segura:

- el worker autentica contra WSAA `prod`
- ejecuta `FEDummy` contra WSFE `prod`
- mueve el job a `pending_reconcile`
- deja `last_error_code=FISCAL_PROD_SAFE_STOP_BEFORE_FECAE`

Esto confirma plumbing productivo sin emitir factura real.

## 5. No hacer en este modo

- No habilita `FECAESolicitar`
- No emite CAE
- No genera comprobante fiscal real

La emisión real queda para un paso posterior con confirmación explícita.
