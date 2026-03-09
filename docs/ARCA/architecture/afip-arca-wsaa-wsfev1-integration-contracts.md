# WSAA / WSFEv1 Integration Contracts

Proyecto: NODUX

---

# 1. Servicios utilizados

```

WSAA
WSFEv1

```

---

# 2. WSAA

Servicio de autenticación.

Resultado:

```

Token
Sign
expirationTime

```

Duración aproximada:

```

12 horas

```

---

# 3. WSFEv1

Servicio de autorización de comprobantes.

Operaciones principales:

```

FECAESolicitar
FECompUltimoAutorizado
FECompConsultar

```

---

# 4. Auth Object

Todos los requests requieren:

```

Auth
├─ Token
├─ Sign
└─ Cuit

```

---

# 5. Request básico

Campos mínimos:

```

PtoVta
CbteTipo
CbteDesde
CbteHasta
CbteFch
ImpTotal
MonId
MonCotiz

```

---

# 6. Response

AFIP devuelve:

```

CAE
CAEExpiration
Resultado
Observaciones
Errores
Eventos

```

---

# 7. Reglas operativas

- siempre persistir payload crudo
- validar respuesta antes de confirmar venta
- no asumir rechazo sin confirmación
