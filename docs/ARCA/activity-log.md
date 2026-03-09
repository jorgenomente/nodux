# ARCA Activity Log

Bitácora de cambios del módulo fiscal ARCA para preservar contexto por lote.

Regla: toda decisión/cambio relevante de ARCA debe registrarse acá al cerrar cada lote.

---

## Formato

## YYYY-MM-DD HH:mm -03 — <título corto>

**Lote:** <id>
**Tipo:** docs | db | backend | ui | tests | decision | infra
**Objetivo:** <1 línea>

**Resumen**
<qué se hizo y por qué>

**Archivos**
- <path>

**Validación**
- <checks ejecutados o N/A>

**Estado:** DONE | IN PROGRESS | BLOCKED
**Commit:** <hash o N/A>

---

## 2026-03-08 14:32 -03 — Limpieza inicial de rutas ARCA

**Lote:** arca-docs-route-cleanup
**Tipo:** docs
**Objetivo:** Normalizar rutas internas y eliminar documento duplicado.

**Resumen**
Se corrigieron referencias internas hacia `docs/ARCA/...`, se limpiaron envoltorios de copia en documentos base y se eliminó `Plan pos serio.md` por duplicidad.

**Archivos**
- docs/ARCA/architecture/afip-arca-data-model.md
- docs/ARCA/architecture/afip-arca-fiscal-service.md
- docs/ARCA/architecture/afip-arca-security-and-secrets.md
- docs/ARCA/architecture/afip-arca-state-machine.md
- docs/ARCA/architecture/afip-arca-wsaa-wsfev1-integration-contracts.md
- docs/ARCA/implementation/afip-arca-lote-1-homologacion-base.md

**Validación**
- Revisión manual de rutas y estructura documental.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 13:05 -03 — Lote 4I render MVP: cierre de render_pending y comprobante visible

**Lote:** arca-lote-4i-fiscal-render-mvp
**Tipo:** db/backend/ui/docs/tests
**Objetivo:** Cerrar el pipeline mínimo posterior a autorización fiscal para que una factura emitida quede visible y reimprimible desde ventas.

**Resumen**
Se implementó la etapa MVP de render fiscal. El worker ahora consume `render_pending`, arma `qr_payload_json` a partir de la invoice autorizada y persiste rutas determinísticas del comprobante (`/sales/[saleId]/invoice` y variante `?format=ticket`) mediante `fn_fiscal_mark_render_completed`, dejando el job en `completed`. En paralelo se abrió un contrato de lectura seguro (`v_sale_fiscal_invoice_admin`) y una nueva pantalla imprimible de factura fiscal, visible desde `/sales` y `/sales/[saleId]`.

**Archivos**
- supabase/migrations/20260309124500_084_fiscal_render_read_model.sql
- lib/fiscal/render/build-qr-payload.ts
- lib/fiscal/worker/poll-render-jobs.ts
- lib/fiscal/worker/process-render-job.ts
- lib/fiscal/worker/run-worker.ts
- scripts/fiscal-worker.ts
- app/sales/PrintTicketButton.tsx
- app/sales/fiscal-document.ts
- app/sales/[saleId]/invoice/page.tsx
- app/sales/page.tsx
- app/sales/[saleId]/page.tsx
- docs/docs-app-screens-sale-invoice.md
- docs/docs-app-screens-index.md
- docs/docs-app-sitemap.md
- docs/docs-app-screens-sales.md
- docs/docs-app-screens-sale-detail.md
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/context-summary.md
- docs/docs-roadmap.md
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `npm run lint`: OK
- `npm run build`: OK
- `npm run db:reset`: OK
- `v_sale_fiscal_invoice_admin`: OK (`security_invoker=true`)
- policies read admin sobre `invoices` e `invoice_jobs`: OK

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 12:20 -03 — Lote 4H ops/backend: runner live estable y primera emisión real autorizada

**Lote:** arca-lote-4h-fiscal-live-runner-fix
**Tipo:** backend/docs/tests
**Objetivo:** Confirmar el resultado productivo de la primera emisión viva y estabilizar el comando operativo del worker `live`.

**Resumen**
Se verificó por DB que el job `07790e9c-4c32-4cb1-a25d-269116dc7c14` quedó `render_pending` y que se persistió una factura autorizada en `public.invoices` para `pto_vta=2`, `cbte_tipo=11`, `cbte_nro=2`, con `CAE 86106905768691` e importe total `20.00`. En paralelo se reemplazó el uso operativo de `npx tsx` por `node --import tsx` en `package.json`, ya que el runner local quedaba inestable con la variante anterior.

**Archivos**
- package.json
- docs/ARCA/operations/fiscal-worker-prod-safe-runbook.md
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `public.invoice_jobs`: OK (`job_status=render_pending`, `authorized_at` presente)
- `public.invoices`: OK (`result_status=authorized`, `CAE=86106905768691`)
- `public.fiscal_sequences`: OK (`last_local_reserved=2`, `last_arca_confirmed=2`, `status=healthy`)

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 11:16 -03 — ARCA UI: conflicto explícito de punto de venta

**Lote:** arca-lote-4c-fiscal-pos-conflict-message
**Tipo:** ui/docs/tests
**Objetivo:** Evitar ambigüedad operativa al asignar puntos de venta fiscales y corregir el contexto demo local.

**Resumen**
Se ajustó `/settings/fiscal` para detectar de antemano cuando un `pto_vta` ya pertenece a otra sucursal del mismo ambiente y mostrar un mensaje explícito con el nombre de esa sucursal. También se diferenciaron los errores de credencial vs los errores de PV. En paralelo, se corrigió la configuración demo local moviendo `prod / pto_vta=2` a `Sucursal Caballito`.

**Evidencia**
- antes: `prod / 00002` estaba en `Sucursal Palermo`
- después: `prod / 00002` quedó en `Sucursal Caballito`
- `npm run lint`: OK

**Conclusión**
El flujo de onboarding fiscal ahora explica mejor los conflictos reales de numeración y el demo local quedó alineado con la sucursal sobre la que el usuario está operando.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 11:02 -03 — ARCA DX local: bootstrap automático de key maestra

**Lote:** arca-lote-4b-fiscal-local-encryption-bootstrap
**Tipo:** backend/docs/tests
**Objetivo:** Reducir fricción de onboarding fiscal en desarrollo local sin relajar seguridad de producción.

**Resumen**
Se incorporó `get-encryption-config.ts` para resolver la key maestra de cifrado fiscal. Si `FISCAL_ENCRYPTION_MASTER_KEY` existe, se usa como fuente de verdad. Si no existe y el entorno no es producción, la app crea una key maestra local estable en `.nodux-secrets/fiscal-encryption-dev.json` y la reutiliza en `encrypt-private-key.ts` y `decrypt-private-key.ts`. En producción, la ausencia de la env sigue siendo error bloqueante.

**Evidencia**
- helper nuevo: `lib/fiscal/auth/get-encryption-config.ts`
- `.gitignore` ahora excluye `.nodux-secrets/`
- `encrypt-private-key.ts` y `decrypt-private-key.ts` consumen la misma fuente de configuración
- `npm run lint`: OK
- `npm run build`: OK

**Conclusión**
El flujo ya es automático para dev local, pero sigue correctamente controlado en producción. Esto permite usar `/settings/fiscal` sin preparar secretos manuales en cada entorno local nuevo, preservando al mismo tiempo una clave estable para descifrar las private keys persistidas.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 10:48 -03 — ARCA onboarding interno: settings fiscal

**Lote:** arca-lote-4a-settings-fiscal-onboarding
**Tipo:** ui/backend/docs/tests
**Objetivo:** Eliminar dependencia de SQL manual para asociar una ORG con su certificado fiscal, private key y puntos de venta.

**Resumen**
Se implementó `/settings/fiscal` como pantalla interna de onboarding fiscal. La ruta permite cargar `.crt/.pem` y `.key/.pem` por ambiente, cifra la private key con AES-256-GCM mediante `lib/fiscal/auth/encrypt-private-key.ts`, guarda/actualiza `fiscal_credentials` de la ORG activa y configura `points_of_sale` por sucursal y ambiente. La UI también expone metadata útil del certificado (subject, issuer, vigencia, fingerprint SHA-256) sin revelar la private key.

**Evidencia**
- ruta nueva: `/settings/fiscal`
- helper nuevo: `lib/fiscal/auth/encrypt-private-key.ts`
- settings hub enlaza “Facturacion fiscal”
- docs de sitemap e índice actualizados
- `npm run lint`: OK
- `npm run build`: OK

**Conclusión**
La asociación ORG -> material fiscal ya queda resuelta dentro de la app: `fiscal_credentials.tenant_id` define qué certificado/clave usa cada organización, y `points_of_sale` define qué PV utiliza cada sucursal en cada ambiente. Ya no hace falta cargar estos datos por SQL manual para el onboarding habitual.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 11:55 -03 — ARCA backend: sincronización de secuencia con FECompUltimoAutorizado

**Lote:** arca-lote-4g-fiscal-sequence-sync
**Tipo:** backend/docs/tests
**Objetivo:** Alinear la reserva de numeración local con el último comprobante autorizado real en ARCA.

**Resumen**
Se extendió el cliente WSFE con `FECompUltimoAutorizado`, se agregó `syncFiscalSequenceWithArca` para persistir `last_local_reserved` y `last_arca_confirmed` a partir de ese valor remoto, y se integró la sincronización al worker `live` para jobs `prod` antes de `fn_fiscal_reserve_sequence`. Esto ataca directamente el rechazo `10016` observado en la primera emisión real.

**Evidencia**
- `lib/fiscal/wsfe/wsfe-client.ts`
- `lib/fiscal/worker/sync-fiscal-sequence.ts`
- `lib/fiscal/worker/process-invoice-job.ts`
- `npm run lint`: OK
- `npm run build`: OK
- consulta manual real `WSAA -> FECompUltimoAutorizado`: `lastAuthorized = 1` para `prod / PV 0002 / cbte tipo 11`
- observación `Code 39` devuelta por ARCA: aviso sobre obligatoriedad futura de `Condicion Frente al IVA del receptor` desde `2026-04-01`
- secuencia local ajustada a `last_local_reserved=1` y `last_arca_confirmed=1`

**Conclusión**
El worker ya no depende de una secuencia local ciega al empezar a emitir en producción. Antes de reservar `cbte_nro`, consulta a ARCA cuál es el último autorizado y alinea la base interna.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 11:30 -03 — ARCA schema/backend/UI: gate de emisión real productiva

**Lote:** arca-lote-4f-fiscal-prod-live-gate
**Tipo:** schema/backend/ui/docs/tests
**Objetivo:** Controlar explícitamente cuándo una ORG puede ejecutar `FECAESolicitar` real en producción.

**Resumen**
Se agregó `org_preferences.fiscal_prod_live_enabled` como segundo gate org-wide. El worker `live` consulta ese flag y, si el job es `prod`, rechaza la emisión con `FISCAL_PROD_LIVE_DISABLED` antes de llegar a WSFE. En paralelo se expuso el toggle en `/settings/preferences` y se agregó un comando operativo explícito `npm run fiscal:worker:live`.

**Evidencia**
- `supabase/migrations/20260309113000_083_fiscal_prod_live_gate.sql`
- `lib/fiscal/worker/get-fiscal-org-controls.ts`
- `lib/fiscal/worker/process-invoice-job.ts`
- `app/settings/preferences/page.tsx`
- `package.json`
- `npm run db:reset`: OK
- verificación SQL: `org_preferences.fiscal_prod_live_enabled` existe y default local queda `false`
- `npm run lint`: OK
- `npm run build`: OK

**Conclusión**
La plataforma ya puede distinguir entre “permitir preparar emisión productiva” y “permitir emitir realmente”. Ese corte operacional era el faltante para pasar de `prod-safe` a una primera emisión controlada.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 11:20 -03 — ARCA fix: redirect correcto en prueba segura fiscal

**Lote:** arca-lote-4e-fiscal-settings-connection-test
**Tipo:** ui/tests
**Objetivo:** Corregir el manejo de redirects internos en la prueba segura desde settings fiscal.

**Resumen**
Se agregó `isNextRedirectError` en `/settings/fiscal` y se re-lanzan redirects exitosos dentro de `runConnectionTest`. Antes, el `redirect()` que debía llevar al estado `test_ok` era atrapado por el `catch` y transformado en `test_error` con texto `NEXT_REDIRECT`.

**Evidencia**
- `app/settings/fiscal/page.tsx`
- `npm run lint`: OK
- `npm run build`: OK

**Conclusión**
La prueba segura vuelve a usar el patrón correcto de Server Actions de Next.js y deja de reportar un falso negativo en entornos locales.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 11:15 -03 — ARCA UI/backend: prueba segura desde settings fiscal

**Lote:** arca-lote-4e-fiscal-settings-connection-test
**Tipo:** backend/ui/docs/tests
**Objetivo:** Llevar la validación segura de credenciales fiscales a la interfaz interna de onboarding.

**Resumen**
Se agregó `lib/fiscal/testing/test-fiscal-connection.ts` para encapsular una prueba segura completa: resolución de contexto fiscal activo, descifrado de private key, obtención de TA por WSAA y `FEDummy` sobre WSFE. Luego se conectó esa capacidad a `/settings/fiscal` con un bloque nuevo por ambiente que permite elegir un `pto_vta` activo y ejecutar la prueba sin emitir comprobantes reales ni depender de jobs `invoice_jobs`.

**Evidencia**
- `lib/fiscal/testing/test-fiscal-connection.ts`
- `app/settings/fiscal/page.tsx`
- `docs/docs-app-screens-settings-fiscal.md`
- `npm run lint`: OK
- `npm run build`: OK

**Conclusión**
La pantalla de onboarding fiscal pasa a cubrir no sólo carga de secretos y puntos de venta sino también la verificación segura del wiring ARCA. Esto la convierte en el entrypoint operativo correcto para dar de alta una ORG antes de abrir emisión real.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 11:05 -03 — ARCA ops: runbook y comando estable para prod-safe

**Lote:** arca-lote-4d-fiscal-prod-safe-runbook
**Tipo:** backend/docs/tests
**Objetivo:** Estandarizar la ejecución del worker fiscal productivo en modo seguro.

**Resumen**
Se agregó `scripts/fiscal-worker.ts` como wrapper del runtime existente para evitar seguir usando comandos `npx tsx -e` ad-hoc. El script valida `FISCAL_EXECUTION_MODE`, `FISCAL_DRY_RUN`, `FISCAL_BATCH_SIZE`, resuelve temprano la configuración de cifrado fiscal y emite bloques JSON de inicio/cierre. Además se documentó un runbook corto con prerrequisitos, envs y comandos recomendados para `prod-safe`.

**Evidencia**
- `package.json`: `npm run fiscal:worker`
- `package.json`: `npm run fiscal:worker:prod-safe`
- `scripts/fiscal-worker.ts`
- `docs/ARCA/operations/fiscal-worker-prod-safe-runbook.md`
- `npm run lint`: OK
- `npm run build`: OK
- `FISCAL_EXECUTION_MODE=prod-safe FISCAL_DRY_RUN=true npm run fiscal:worker`: OK
  - `encryptionSource=env`
  - `encryptionKeyReference=prod-2026-03`
  - `pendingProcessed=0`
  - `reconcileProcessed=1`

**Conclusión**
El flujo `prod-safe` deja de depender de invocaciones manuales no repetibles y pasa a tener una superficie operativa explícita dentro del repo. Esto reduce error humano antes de habilitar emisión real.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 10:34 -03 — ARCA wiring operativo: cobrar y facturar / emitir factura

**Lote:** arca-lote-3h-sales-pos-fiscal-trigger
**Tipo:** ui/docs/tests
**Objetivo:** Asegurar que el flujo fiscal productivo sólo se dispare desde los entrypoints correctos de operación.

**Resumen**
Se reemplazó el marcado simple por enqueue fiscal en `POS` (`Cobrar y facturar`) y en `Ventas` (`Emitir factura` en listado y detalle). Esos entrypoints ahora llaman `rpc_enqueue_sale_fiscal_invoice(..., p_environment='prod', ...)` y luego `rpc_mark_sale_invoiced(...)` para mantener la UX actual. `Cobrar` simple quedó sin cambios y no dispara flujo fiscal.

**Evidencia**
- `app/pos/PosClient.tsx`: `charge_and_invoice` usa `rpc_enqueue_sale_fiscal_invoice` con `p_environment='prod'`
- `app/sales/page.tsx`: `Emitir factura` usa enqueue fiscal + marcado visible
- `app/sales/[saleId]/page.tsx`: mismo comportamiento en detalle
- prueba local equivalente al server action:
  - enqueue devuelve fila existente `invoice_job_id=6c776080-1198-4384-a15a-eeae632f0468`
  - venta `a87e1f30-40c2-44ec-bda8-640bc9c139fd` queda `is_invoiced=true`
- `npm run lint`: OK
- `npm run build`: OK

**Conclusión**
El disparo del pipeline fiscal queda limitado a los puntos de entrada correctos: `Cobrar y facturar` y `Emitir factura`. El flujo `Cobrar` solo sigue siendo no fiscal.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 10:20 -03 — ARCA DB/UI: gate de enqueue productivo

**Lote:** arca-lote-3g-prod-enqueue-gate
**Tipo:** schema/ui/docs/tests
**Objetivo:** Controlar explícitamente desde operación qué organizaciones pueden crear `invoice_jobs` en ambiente `prod`.

**Resumen**
Se agregó `org_preferences.fiscal_prod_enqueue_enabled` como gate org-wide, se expuso en `/settings/preferences` y se reemplazó `rpc_enqueue_sale_fiscal_invoice` para exigir ese flag cuando `p_environment='prod'`. La validación se hizo sobre DB local reseteada y datos demo: con el flag apagado, el RPC deniega; con el flag encendido y un `points_of_sale` `prod` activo, el enqueue se completa.

**Evidencia**
- migración nueva: `20260309102000_082_fiscal_prod_enqueue_gate.sql`
- denegación esperada: `fiscal prod enqueue disabled for org 11111111-1111-1111-1111-111111111111`
- allow esperado tras habilitar flag: `invoice_job_id=6c776080-1198-4384-a15a-eeae632f0468`
- `npm run db:reset`: OK
- `npm run db:seed:demo`: OK
- `npm run lint`: OK
- `npm run build`: OK

**Conclusión**
Queda resuelto el gate operacional previo a emisión real: la org debe habilitar explícitamente el enqueue `prod` antes de poder crear jobs fiscales productivos. Esto permite seguir con rollout controlado y reduce riesgo de activación accidental.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 10:12 -03 — ARCA QA producción: worker en modo prod-safe

**Lote:** arca-qa-prod-safe-002
**Tipo:** tests/infra
**Objetivo:** Validar el worker real sobre un job `prod` usando el nuevo corte `prod-safe`, sin emisión de comprobantes.

**Resumen**
Se insertó configuración `prod` local (`fiscal_credentials` + `points_of_sale`), se encoló un job productivo sobre la venta demo (`190c25b9-ffd9-4e57-a2f0-ff7f2c075f03`) y se ejecutó `runFiscalWorkerOnce({ dryRun: false, executionMode: 'prod-safe' })`. El pipeline completó reserva de secuencia, autenticación WSAA y `FEDummy`, y se detuvo antes de `FECAESolicitar`.

**Evidencia**
- Job: `190c25b9-ffd9-4e57-a2f0-ff7f2c075f03`
- Estado final: `pending_reconcile`
- `last_error_code`: `FISCAL_PROD_SAFE_STOP_BEFORE_FECAE`
- `cbte_nro`: `1`
- `wsaaExpiresAt`: `2026-03-09T22:12:12.851-03:00`
- `FEDummy`: `AppServer=OK`, `DbServer=OK`, `AuthServer=OK`
- `response_payload_json` persiste `executionMode=prod-safe` + XML crudo de `FEDummy`

**Conclusión**
El worker productivo ya puede correrse de punta a punta en modo seguro, con evidencia persistida y sin riesgo de emitir facturas reales. El siguiente salto técnico es abrir una ruta explícita y confirmada para `FECAESolicitar` real cuando se defina el corte operativo.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 09:55 -03 — ARCA backend: modo prod-safe

**Lote:** arca-lote-3f-prod-safe-mode
**Tipo:** backend/docs/tests
**Objetivo:** Habilitar un modo de ejecución segura en producción que valide WSAA + WSFE sin emitir comprobantes reales.

**Resumen**
Se agregó `FiscalExecutionMode` con variante `prod-safe`, se extendió `runFiscalWorkerOnce` para propagar el modo al procesamiento de jobs y se modificó `processInvoiceJob` para que, después de autenticar WSAA, ejecute `FEDummy` cuando el job pertenece a `prod`. Si `FEDummy` responde, el job se mueve a `pending_reconcile` con evidencia (`wsaaExpiresAt`, `AppServer/DbServer/AuthServer`) y el pipeline se corta antes de `FECAESolicitar`.

**Evidencia**
- `prod-safe` en ambiente no `prod` falla con `FISCAL_PROD_SAFE_REQUIRES_PROD_ENV`
- `prod-safe` con `FEDummy` exitoso deja `last_error_code=FISCAL_PROD_SAFE_STOP_BEFORE_FECAE`
- `npm run lint`: OK
- `npm run build`: OK

**Conclusión**
Queda disponible un camino operativo para seguir avanzando sobre credenciales y jobs de producción sin riesgo de emitir comprobantes reales por accidente. El siguiente paso es configurar jobs `prod` reales y correr el worker con `executionMode='prod-safe'` para validar el plumbing completo con tus datos productivos.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 09:40 -03 — ARCA QA local: reintento con certificado AFIP emitido

**Lote:** arca-qa-local-homo-002
**Tipo:** tests/infra
**Objetivo:** Reprobar WSAA/WSFE homologación con el nuevo certificado emitido por AFIP cargado en `docs/ARCA/certificados/homo`.

**Resumen**
Se detectó que el archivo nuevo cambió de `jorgehomo.crt` a `noduxhomo.crt`. Se verificó por `openssl` que `noduxhomo.crt` matchea con `privada_homo.key`, incorpora `serialNumber=CUIT 20958851929` y tiene emisor `CN=Computadores, O=AFIP, C=AR`. Luego se actualizó la credencial fiscal local, se encoló un nuevo job (`9b98c72b-0676-4529-bb87-f3a4f0cb2522`) y se ejecutó el worker completo contra homologación.

**Evidencia**
- Cert fingerprint SHA-256: `3D:34:DE:83:A7:F7:9F:01:CB:AD:49:A1:1B:D0:0D:71:B3:FF:B2:C5:20:C7:E0:A7:CF:A1:24:F5:E4:B3:FF:0C`
- Cert vigencia: `2026-03-09 12:23:00Z` a `2028-03-08 12:23:00Z`
- Worker reservó secuencia `cbte_nro=5` para `pto_vta=2`, `cbte_tipo=11`
- WSAA fault final: `cms.cert.untrusted` / `Certificado no emitido por AC de confianza`
- WSFE `FEDummy`: OK (prueba previa, sin cambios)

**Conclusión**
El nuevo certificado está bien formado y coincide con la privada, pero WSAA homologación sigue sin confiarlo. El siguiente paso queda fuera de código: validar en ARCA que ese certificado emitido esté efectivamente asociado al servicio `wsfe` y operativo para homologación.

**Estado:** BLOCKED (externo a código)
**Commit:** N/A

## 2026-03-09 09:48 -03 — ARCA QA producción: autenticación y conectividad segura

**Lote:** arca-qa-prod-safe-001
**Tipo:** tests/infra
**Objetivo:** Validar que el certificado de producción y el flujo interno WSAA/WSFE funcionan contra endpoints reales sin emitir comprobantes.

**Resumen**
Se usaron `docs/ARCA/certificados/arca-certificado.crt` y `docs/ARCA/certificados/privada.key` para construir TRA, firmar CMS con `openssl`, autenticar en `https://wsaa.afip.gov.ar/ws/services/LoginCms` y luego ejecutar `FEDummy` sobre `https://servicios1.afip.gov.ar/wsfev1/service.asmx`.

**Evidencia**
- Cert subject: `CN=jorge1452, serialNumber=CUIT 20958851929`
- Cert issuer: `CN=Computadores, O=AFIP, C=AR`
- Cert SHA-256: `3B:AC:00:E6:6F:F0:DE:DF:71:DC:B8:6B:1F:9B:AF:E9:97:C0:66:E2:54:09:AB:3A:AF:D8:D6:1E:2C:4A:A0:0F`
- WSAA producción: `HTTP 200`, `loginCmsReturn` presente, `token/sign` presentes
- TA expira: `2026-03-09T22:07:49.641-03:00`
- WSFE `FEDummy`: `AppServer=OK`, `DbServer=OK`, `AuthServer=OK`

**Conclusión**
El flujo seguro en producción está operativo. El certificado de producción sí autentica en WSAA y el endpoint WSFE responde correctamente. El siguiente paso de implementación puede apoyarse en producción como referencia técnica, manteniendo fuera de alcance la emisión real (`FECAESolicitar`) hasta definir el corte operativo.

**Estado:** DONE
**Commit:** N/A

## 2026-03-09 09:10 -03 — QA local homologación: TRA alineado y FEDummy OK

**Lote:** arca-qa-local-homo-002
**Tipo:** backend | tests
**Objetivo:** Comparar el flujo interno contra el proceso manual de integradores y aislar WSFE de WSAA.

**Resumen**
Se ajustó `build-tra.ts` para usar por defecto la ventana manual `now - 5 minutos / now + 5 minutos` y se agregó `submitFEDummy` en `wsfe-client.ts`. La prueba con el certificado de `docs/ARCA/certificados/homo` confirmó que WSAA sigue rechazando con `cms.cert.untrusted`, pero `FEDummy` sobre WSFE homologación responde `OK/OK/OK`. Esto demuestra que el flujo interno ya replica correctamente la secuencia manual TRA -> CMS -> WSAA y que la conectividad al servicio WSFE es sana; el bloqueo vigente sigue estando exclusivamente en WSAA/certificado confiable.

**Archivos**
- lib/fiscal/auth/build-tra.ts
- lib/fiscal/wsfe/wsfe-client.ts
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `npm run lint`: OK.
- `npm run build`: OK.
- WSAA con cert `homo`: `cms.cert.untrusted`.
- WSFE `FEDummy`: `AppServer=OK`, `DbServer=OK`, `AuthServer=OK`.

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 22:53 -03 — QA local homologación: hotfix de secuencia + bloqueo real por certificado

**Lote:** arca-qa-local-homo-001
**Tipo:** db | backend | tests
**Objetivo:** Ejecutar el flujo fiscal local con certificado real y aislar el bloqueo real de homologación.

**Resumen**
Se probó el flujo local completo con una venta demo encolada vía `rpc_enqueue_sale_fiscal_invoice`, `points_of_sale` locales y certificado/clave desde `docs/ARCA/certificados`. La primera corrida expuso un bug SQL en `fn_fiscal_reserve_sequence` (`tenant_id` ambiguo), corregido con la migración hotfix `081`. Luego el worker quedó estable y clasificó correctamente fallos previos a WSFE: primero `FISCAL_WSAA_TIMEOUT` y, con timeout ampliado, una respuesta WSAA explícita `cms.cert.untrusted` / `Certificado no emitido por AC de confianza`. El estado actual confirma que el pipeline ya llega a WSAA real y que el bloqueo vigente es de confianza/validez del certificado para homologación, no de plumbing interno.

**Archivos**
- supabase/migrations/20260308221500_079_fiscal_helpers_and_rpc.sql
- supabase/migrations/20260309014000_081_fix_fiscal_reserve_sequence_ambiguous_tenant.sql
- lib/fiscal/worker/process-invoice-job.ts
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `npm run db:reset`: OK.
- `npm run db:seed:demo`: OK.
- `npm run lint`: OK.
- `npm run build`: OK.
- encolado fiscal local: OK.
- WSAA local:
  - timeout clasificado a `failed`
  - SOAP fault AFIP `cms.cert.untrusted` detectado y persistido

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 22:29 -03 — Lote 3E DB/backend: puente venta -> invoice_job + WSFE en worker

**Lote:** arca-lote-3e-sale-to-job-bridge
**Tipo:** db | backend
**Objetivo:** Conectar ventas existentes con el pipeline fiscal y permitir que el worker consuma WSFE cuando el payload fiscal esté presente.

**Resumen**
Se agregó `rpc_enqueue_sale_fiscal_invoice` para encolar facturas fiscales desde una venta existente, crear `sale_document`, crear `invoice_job` y persistir `requested_payload_json` con un contrato fiscal MVP. También se agregó `fn_fiscal_mark_job_failed`, que faltaba para cerrar errores terminales del pipeline. En backend, `processInvoiceJob` ahora usa ese payload para construir `FECAESolicitar`, llamar WSFE y mover el job a `authorized`, `rejected`, `pending_reconcile` o `failed` según el resultado.

**Archivos**
- supabase/migrations/20260308224500_080_fiscal_enqueue_sale_invoice_and_failed.sql
- lib/fiscal/rpc/types.ts
- lib/fiscal/rpc/mark-failed.ts
- lib/fiscal/rpc/enqueue-sale-invoice.ts
- lib/fiscal/worker/poll-pending-jobs.ts
- lib/fiscal/worker/poll-reconcile-jobs.ts
- lib/fiscal/worker/process-invoice-job.ts
- lib/fiscal/shared/fiscal-types.ts
- lib/fiscal/wsfe/build-fecae-request.ts
- docs/docs-data-model.md
- docs/docs-rls-matrix.md
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `npm run lint`: OK.
- `npm run build`: OK.

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 22:20 -03 — Lote 3D backend-only: capa WSFE reusable

**Lote:** arca-lote-3d-wsfe-foundation
**Tipo:** backend
**Objetivo:** Dejar lista la capa de transporte/parsing WSFE antes de cablearla al worker.

**Resumen**
Se creó `lib/fiscal/wsfe/*` con builder de `FECAESolicitar`, cliente SOAP, normalizador de respuesta y mapeo de errores/rechazos AFIP. También se expandieron los tipos fiscales compartidos para representar request/amounts/IVA/tributos. Este lote deja resuelta la capa WSFE reutilizable, pero no la conecta aún al worker porque todavía falta un contrato de entrada fiscal consistente desde ventas/`invoice_jobs`.

**Archivos**
- lib/fiscal/shared/fiscal-types.ts
- lib/fiscal/wsfe/build-fecae-request.ts
- lib/fiscal/wsfe/map-afip-errors.ts
- lib/fiscal/wsfe/normalize-wsfe-response.ts
- lib/fiscal/wsfe/wsfe-client.ts
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `npm run lint`: OK.

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 22:16 -03 — Lote 3C backend-only: descifrado de private key + WSAA en worker

**Lote:** arca-lote-3c-worker-wsaa-wiring
**Tipo:** backend
**Objetivo:** Completar el cableado de WSAA en el worker fiscal sin implementar todavía WSFE.

**Resumen**
Se agregó `decrypt-private-key.ts` para descifrar `encrypted_private_key` con AES-256-GCM usando key maestra de entorno y validación de `encryption_key_reference`. También se conectó esa resolución al `processInvoiceJob`, que ahora obtiene/renueva TA por WSAA antes de continuar el flujo. El worker sigue frenando en `pending_reconcile` porque WSFE aún no está implementado, pero la autenticación fiscal ya quedó operativa dentro del backend.

**Archivos**
- lib/fiscal/auth/decrypt-private-key.ts
- lib/fiscal/worker/process-invoice-job.ts
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `npm run lint`: OK.

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 22:13 -03 — Lote 3B backend-only: cache y cliente WSAA

**Lote:** arca-lote-3b-wsaa-client-cache
**Tipo:** backend
**Objetivo:** Implementar cache de TA y cliente WSAA base para homologación.

**Resumen**
Se agregó `wsaa-cache.ts` para cachear tickets de acceso en memoria con renovación preventiva y `wsaa-client.ts` para construir la llamada SOAP a WSAA, firmar CMS con `openssl`, parsear `loginCmsReturn` y persistir `last_ta_obtained_at`/`ta_expires_at` en `fiscal_credentials`. El lote no resuelve aún el descifrado de `encrypted_private_key` ni conecta el flujo al worker/WSFE final; fija la capa de autenticación reutilizable y acotada.

**Archivos**
- lib/fiscal/shared/fiscal-types.ts
- lib/fiscal/auth/wsaa-cache.ts
- lib/fiscal/auth/wsaa-client.ts
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `npm run lint`: OK.

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 22:10 -03 — Lote 3A backend-only: base WSAA (TRA + signing contract)

**Lote:** arca-lote-3a-wsaa-foundation
**Tipo:** backend
**Objetivo:** Iniciar homologación backend construyendo la base de autenticación WSAA.

**Resumen**
Se agregó la primera pieza de ARCA-3 en `lib/fiscal/auth/*`: constructor de TRA (`build-tra`) y contrato de firma CMS (`sign-tra`) basado en adapter inyectable. También se extendieron los tipos fiscales compartidos con `WsaaTra` y `WsaaSignedCms`. Este lote fija la frontera técnica correcta para autenticación WSAA sin falsear una firma real ni acoplar todavía una librería concreta de CMS/SOAP.

**Archivos**
- lib/fiscal/shared/fiscal-types.ts
- lib/fiscal/auth/build-tra.ts
- lib/fiscal/auth/sign-tra.ts
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- `npm run lint`: OK.

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 22:07 -03 — ARCA roadmap alignment con docs generales

**Lote:** arca-roadmap-alignment-001
**Tipo:** docs
**Objetivo:** Reflejar en docs generales el estado real de implementación ARCA y fijar el siguiente lote técnico.

**Resumen**
Se actualizó el roadmap general de NODUX para incorporar ARCA como track paralelo post-MVP y se sincronizó `context-summary` con la situación actual del módulo: Lote 0, Lote 1 y Lote 2 cerrados; homologación WSAA/WSFE, render, reconciliación y puente venta->job aún pendientes. Queda fijado como siguiente paso recomendado el lote backend de homologación end-to-end sin tocar UI.

**Archivos**
- docs/docs-roadmap.md
- docs/context-summary.md
- docs/prompts.md
- docs/activity-log.md
- docs/ARCA/activity-log.md

**Validación**
- Revisión manual de coherencia entre scope MVP, roadmap general y bitácora ARCA.

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 21:40 -03 — Normalización canónica post-auditoría

**Lote:** arca-docs-audit-100
**Tipo:** docs
**Objetivo:** Dejar ARCA coherente al 100% a nivel documentación/contratos.

**Resumen**
Se rehízo el índice maestro canónico, se alinearon estados con RPC, se corrigió modelo de datos (`invoice_job_id`), se reparó markdown roto, se limpió SQL no ejecutable en helpers, y se marcaron documentos conversacionales como legacy.

**Archivos**
- docs/ARCA/afip-arca-master-index.md
- docs/ARCA/architecture/afip-arca-data-model.md
- docs/ARCA/architecture/afip-arca-fiscal-service.md
- docs/ARCA/architecture/afip-arca-security-and-secrets.md
- docs/ARCA/architecture/afip-arca-state-machine.md
- docs/ARCA/architecture/modelo de implementacion.md
- docs/ARCA/configuracion fiscal.md
- docs/ARCA/implementacion nodux.md
- docs/ARCA/implementation/20260308134500_fiscal_helpers_and_rpc.sql
- docs/ARCA/implementation/afip-arca-codex-task-prompts.md
- docs/ARCA/implementation/afip-arca-reconciliation-playbook.md
- docs/ARCA/implementation/afip-arca-render-pipeline.md
- docs/ARCA/implementation/afip-arca-worker-error-catalog.md

**Validación**
- Sin rutas viejas `docs/architecture|docs/implementation`.
- Sin fences markdown desbalanceados.
- SQL helpers finalizando en `commit;`.

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 21:55 -03 — Inicio implementación fiscal segura

**Lote:** arca-lote-0-kickoff
**Tipo:** decision
**Objetivo:** Definir arranque controlado para implementar flujo fiscal sin romper operación.

**Resumen**
Se inicia ejecución por lotes con estrategia de bajo riesgo: primero baseline/freeze y luego contrato DB canónico en migraciones reales, sin mezclar UI/worker en el mismo lote.

**Archivos**
- docs/ARCA/activity-log.md
- docs/ARCA/afip-arca-master-index.md
- docs/ARCA/operations/afip-arca-lote-0-baseline-freeze.md

**Validación**
- N/A (lote de planificación/documentación).

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 21:54 -03 — Lote 1 DB-only: port y validación de migraciones fiscales

**Lote:** arca-lote-1-db-core
**Tipo:** db
**Objetivo:** Portar SQL fiscal canónica de ARCA a migraciones reales en `supabase/migrations`.

**Resumen**
Se crearon dos migraciones nuevas en `supabase/migrations` copiando el contrato fiscal canónico:
- `078_fiscal_core` (tablas, índices, RLS base)
- `079_fiscal_helpers_and_rpc` (helpers y transiciones RPC)

Durante ejecución se ajustaron dos incompatibilidades SQL detectadas en reset local:
- `078`: reemplazo de `create policy if not exists` por `drop policy if exists + create policy`.
- `079`: firma de `fn_fiscal_mark_job_authorized` sin defaults intermedios inválidos en PostgreSQL.

Luego se ejecutó validación completa con `npm run db:reset` OK y checks mínimos de objetos/RLS.

**Archivos**
- supabase/migrations/20260308220000_078_fiscal_core.sql
- supabase/migrations/20260308221500_079_fiscal_helpers_and_rpc.sql

**Validación**
- Verificación estática de objetos en SQL: OK.
- `npm run db:reset`: OK.
- Existencia de objetos fiscales:
  - tablas esperadas: 8
  - funciones esperadas: 8
- RLS mínima:
  - `service_role` insert en `fiscal_credentials`: permitido
  - `authenticated` insert en `fiscal_credentials`: denegado (RLS)

**Estado:** DONE
**Commit:** N/A

## 2026-03-08 22:03 -03 — Lote 2 backend-only: runtime base del fiscal worker

**Lote:** arca-lote-2-worker-base
**Tipo:** backend
**Objetivo:** Implementar estructura base del worker fiscal (sin WSAA/WSFE real) con contratos tipados y wrappers RPC.

**Resumen**
Se implementó el esqueleto backend del módulo fiscal en `lib/fiscal/*`: tipos compartidos, redacción de secretos, logger estructurado, wrappers de RPC fiscales, loaders de jobs (`pending` / `pending_reconcile`), resolver de credenciales/POS y orquestador `runFiscalWorkerOnce`. Este lote no toca UI ni flujo POS; deja preparado el runtime para integrar WSAA/WSFE y reconciliación real en lote posterior.

**Archivos**
- lib/fiscal/shared/fiscal-types.ts
- lib/fiscal/shared/redact-secrets.ts
- lib/fiscal/shared/fiscal-logger.ts
- lib/fiscal/rpc/client.ts
- lib/fiscal/rpc/types.ts
- lib/fiscal/rpc/reserve-sequence.ts
- lib/fiscal/rpc/mark-authorizing.ts
- lib/fiscal/rpc/mark-authorized.ts
- lib/fiscal/rpc/mark-rejected.ts
- lib/fiscal/rpc/mark-pending-reconcile.ts
- lib/fiscal/rpc/mark-render-completed.ts
- lib/fiscal/worker/poll-pending-jobs.ts
- lib/fiscal/worker/poll-reconcile-jobs.ts
- lib/fiscal/worker/resolve-credentials.ts
- lib/fiscal/worker/process-invoice-job.ts
- lib/fiscal/worker/process-reconcile-job.ts
- lib/fiscal/worker/run-worker.ts

**Validación**
- `npm run lint`: OK.
- `npm run build`: OK.

**Estado:** DONE
**Commit:** N/A
