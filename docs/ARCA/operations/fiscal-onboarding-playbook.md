NODUX — Playbook Operativo de Onboarding Fiscal (ARCA / AFIP)

Versión: 1.0  
Actualizado: 2026

Este documento describe el procedimiento operativo que debe seguir el equipo de NODUX cada vez que se integra un nuevo cliente que necesita emitir facturas electrónicas mediante Web Services (WSFE).

El objetivo es estandarizar el proceso para que todos los clientes queden correctamente configurados y puedan emitir comprobantes desde el POS sin intervención manual.

---

# 1. Objetivo

Configurar un comercio en NODUX para que pueda emitir comprobantes fiscales electrónicos válidos ante ARCA/AFIP utilizando Web Services.

El proceso incluye:

- verificación de identidad fiscal
- creación o validación de punto de venta
- generación o carga de certificado digital
- asociación al servicio wsfe
- pruebas de conexión
- emisión de comprobante de prueba
- activación productiva

---

# 2. Información que debe proporcionar el cliente

Antes de comenzar, solicitar al cliente la siguiente información:

## Datos fiscales

CUIT  
Razón social  
Condición fiscal (Monotributista / Responsable Inscripto / Exento)  
Domicilio fiscal  
Email administrativo

## Información operativa

Tipo de comprobantes que emitirá:

Factura C  
Factura B  
Factura A  
Notas de crédito/débito (si aplica)

## Estado actual del cliente

Preguntar si el cliente ya tiene:

- punto de venta para Web Services
- certificado digital para Web Services

Esto determina el flujo de onboarding.

---

# 3. Escenarios posibles

## Escenario A — Cliente ya tiene todo configurado

El cliente ya posee:

- certificado digital
- punto de venta Web Services

Debe entregarte:

archivo `.crt`  
archivo `.key` o `.p12`  
contraseña del `.p12` si existe  
número de punto de venta

Procedimiento:

1. cargar configuración fiscal en NODUX
2. subir certificado
3. probar WSAA
4. probar WSFE
5. emitir comprobante de prueba

---

## Escenario B — Cliente no tiene configuración

Debe realizarse el proceso completo.

Pasos:

1. crear certificado digital
2. asociar servicio wsfe
3. crear punto de venta Web Services
4. cargar datos en NODUX
5. probar conexión

---

# 4. Generación de certificado digital

Este paso puede hacerlo NODUX junto con el cliente.

## Generar clave privada

openssl genrsa -out privada.key 2048

## Generar CSR

openssl req -new -key privada.key -out pedido.csr

Datos sugeridos:

Common Name: nombre interno  
Organization: nombre empresa  
SerialNumber: CUIT

---

# 5. Alta del certificado en ARCA

Ingresar con clave fiscal del cliente a:

Administración de Certificados Digitales

Subir el archivo:

pedido.csr

Descargar luego el certificado:

certificado.crt

---

# 6. Asociar Web Service

Ingresar a:

Administrador de Relaciones

Crear nueva relación:

Servicio:

wsfe

Asociar al certificado creado.

---

# 7. Crear punto de venta Web Services

Ir a:

Administración de puntos de venta y domicilios

Crear nuevo punto:

Número recomendado:

00002

Sistema:

Factura Electrónica - Web Services

Guardar.

Importante:

Los puntos de venta de Web Services deben ser distintos a los de Factura en Línea.

---

# 8. Cargar configuración en NODUX

Abrir en el panel del comercio:

Configuración → Facturación Fiscal

Cargar:

CUIT  
Razón social  
Condición fiscal  
Domicilio fiscal

Subir:

certificado `.crt`  
clave privada `.key` o `.p12`

Registrar:

punto de venta WS

Guardar configuración.

---

# 9. Prueba de autenticación (WSAA)

Desde NODUX ejecutar:

Probar WSAA

Resultado esperado:

token válido  
sign válido  
fecha de expiración del ticket

Si falla:

verificar certificado  
verificar asociación al servicio

---

# 10. Prueba de conexión WSFE

Ejecutar:

FECompUltimoAutorizado

Parámetros:

Punto de venta  
Tipo de comprobante

Resultado esperado:

último comprobante = número válido

---

# 11. Emisión de comprobante de prueba

Emitir una factura de prueba.

Ejemplo:

Factura C  
Monto bajo  
CUIT receptor de prueba

Resultado esperado:

CAE autorizado  
fecha de vencimiento CAE

Guardar XML request y response.

---

# 12. Validación final

Verificar que el comprobante generado tenga:

Número de comprobante  
CAE válido  
Fecha de vencimiento CAE

Opcional:

generar PDF y validar QR.

---

# 13. Activación productiva

Si todas las pruebas son correctas:

marcar el comercio como:

Fiscalmente habilitado

Esto activa la emisión automática desde el POS.

---

# 14. Flujo de facturación en producción

Una vez activo:

POS genera venta  
↓  
NODUX calcula totales  
↓  
Fiscal Service obtiene último comprobante  
↓  
FECAESolicitar  
↓  
ARCA autoriza comprobante  
↓  
NODUX guarda CAE  
↓  
Genera ticket / PDF  
↓  
Impresión

---

# 15. Seguridad

Las claves privadas deben:

- almacenarse cifradas
- no enviarse por correo sin protección
- mantenerse separadas por tenant
- registrarse su fecha de expiración

---

# 16. Checklist de onboarding

Antes de activar facturación verificar:

CUIT validado  
punto de venta Web Services activo  
certificado válido  
WSAA autenticado  
WSFE funcionando  
factura de prueba emitida  
CAE recibido

Si todo está correcto:

comercio listo para facturar.

---

# 17. Mantenimiento

Revisar periódicamente:

vencimiento de certificados  
errores de emisión  
reconciliación de comprobantes

Renovar certificados antes de su vencimiento.

---

# Fin del documento

Recomendación importante para NODUX

Este playbook te permite tener un proceso repetible.
Pero hay dos mejoras que valen muchísimo en un SaaS como el tuyo:

Wizard de onboarding fiscal en la UI

Estado automático de configuración

Ejemplo:

Fiscal Setup Status

Identidad fiscal ✔
Certificado ✔
WSAA ✔
WSFE ✔
Prueba emisión ✔

Estado: LISTO PARA FACTURAR
