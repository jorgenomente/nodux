Screen Contract — Settings: Preferences

## Guía rápida (para diseño)

- Lee primero las secciones existentes (ruta/rol/propósito/acciones/estados/data contract).
- Diseña mobile-first (360–430px) con targets táctiles >= 44px.
- Incluye estados: loading, empty, error, success.
- No inventes campos ni acciones: usa lo definido en el contrato de datos.
- Si algo no está definido, marca la duda y consulta antes de decidir.

Ruta

/settings/preferences

Rol / Acceso

Org Admin (OA)

Superadmin (SA) dentro de org

Staff: NO

Propósito

Configurar parámetros simples del sistema (MVP), especialmente:

thresholds de alertas de vencimientos:

critical_days (default 3)

warning_days (default 7)

(opcional MVP) preferencias UX menores (ej: orden módulos staff)
Si no está definido, se posterga.

allow_negative_stock (default true)

cash_discount_enabled (default true)

cash_discount_default_pct (default 10)

cash_denominations (default ARS: 100, 200, 500, 1000, 2000, 10000, 20000)

UI

Sección “Alertas de vencimientos”

input número: critical_days

input número: warning_days

toggle: cash_discount_enabled

input número: cash_discount_default_pct (0..100)

input texto: cash_denominations (lista separada por coma)

helper text + validaciones

CTA “Guardar” (o autosave con debounce; MVP mejor botón explícito)

Data Contract
Lectura

View/RPC: rpc_get_org_preferences()
Output:

critical_days

warning_days

cash_discount_enabled

cash_discount_default_pct

cash_denominations

(opcional) staff_nav_order[]

Escritura

RPC: rpc_set_org_preferences(input)

critical_days

warning_days

(opcional) staff_nav_order[]

cash_discount_enabled

cash_discount_default_pct

cash_denominations

Validaciones (DB / RPC)

critical_days >= 0

warning_days >= critical_days

cash_discount_default_pct >= 0 y <= 100

cash_denominations debe ser array/lista de números positivos

Smoke tests

PF-01: cambiar thresholds y verificar severidades recalculadas en /expirations y alertas en /dashboard
