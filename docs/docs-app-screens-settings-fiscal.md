# Screen Contract — Settings: Fiscal

Ruta

- `/settings/fiscal`

Rol / Acceso

- Org Admin (OA)
- Superadmin (SA) dentro de org
- Staff: NO

Propósito

Configurar el material fiscal de la ORG activa sin SQL manual:

- asociar certificado `.crt/.pem` por ambiente (`homo` / `prod`)
- asociar private key `.key/.pem` por ambiente
- guardar la private key cifrada
- configurar puntos de venta fiscales por sucursal y ambiente
- mostrar metadata mínima de la credencial activa (CUIT, alias, vigencia, fingerprint)

UI

- Bloque `Credencial Homologación`
  - CUIT
  - alias interno
  - archivo certificado
  - archivo private key
  - estado (`active/inactive/pending/revoked`)
  - resumen de credencial actual
- Bloque `Credencial Producción`
  - mismos campos
- Bloque `Puntos de venta fiscales`
  - listado de puntos configurados por ambiente
  - formulario para guardar `pto_vta` por sucursal/ambiente

Data Contract

Lectura

- `orgs`
  - `id`, `name`
- `fiscal_credentials`
  - por `tenant_id = org activa`
- `points_of_sale`
  - por `tenant_id = org activa`
- `branches`
  - sucursales activas de la org

Escritura

- upsert en `fiscal_credentials`
  - `tenant_id`
  - `environment`
  - `taxpayer_cuit`
  - `alias`
  - `certificate_pem`
  - `encrypted_private_key`
  - `encryption_key_reference`
  - `status`
  - `wsaa_service_name = wsfe`
  - `wsfe_service_name = wsfe`
- insert/update en `points_of_sale`
  - `tenant_id`
  - `location_id`
  - `environment`
  - `pto_vta`
  - `description`
  - `invoice_mode`
  - `status`

Validaciones

- `taxpayer_cuit` debe tener 11 dígitos
- certificado debe parsear como X509 válido
- private key debe ser PEM
- la private key se cifra con AES-256-GCM antes de persistir
- `pto_vta > 0`
- sólo OA/SA pueden guardar
- si un `pto_vta` ya está asignado a otra sucursal en el mismo ambiente, la UI debe informar explícitamente el conflicto

Notas operativas

- dejar archivos vacíos en una credencial existente conserva el material ya guardado
- esta pantalla no ejecuta WSAA ni emite comprobantes
- la asociación ORG -> certificado queda determinada por `fiscal_credentials.tenant_id`
