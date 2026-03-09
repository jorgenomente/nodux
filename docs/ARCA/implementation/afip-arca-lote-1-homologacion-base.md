# Lote 1 — Homologación Base AFIP

Proyecto: NODUX

---

# 1. Objetivo

Lograr emitir facturas en ambiente de homologación.

---

# 2. Alcance

Implementar:

- WSAA authentication
- WSFEv1 authorization
- control de numeración
- persistencia de CAE
- generación de PDF
- generación de QR
- ticket térmico

---

# 3. Entregables

- tablas fiscales
- worker fiscal
- client SOAP
- endpoint interno fiscal
- render PDF
- render ticket

---

# 4. Pasos

1. crear migraciones SQL
2. implementar WSAA
3. cachear token
4. implementar WSFEv1
5. implementar reserva de secuencia
6. persistir factura
7. generar QR
8. generar PDF
9. imprimir ticket

---

# 5. Criterios de éxito

- emitir factura homologación
- obtener CAE
- PDF correcto
- ticket correcto
- QR válido

---

# 6. Fuera de alcance

- CAEA
- batch fiscal
- portal de configuración
- conciliación automática
