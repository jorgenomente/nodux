# AFIP / ARCA Security and Secrets

Proyecto: NODUX

---

# 1. Propósito

Definir cómo manejar credenciales fiscales de forma segura.

---

# 2. Riesgos principales

- filtración de clave privada
- acceso indebido a certificados
- exposición de token WSAA
- uso indebido de credenciales por otro tenant

---

# 3. Secretos fiscales

Secretos críticos:

```

certificate
private_key
token
sign
cuit

```

---

# 4. Estrategia de cifrado

Guardar:

```

encrypted_private_key
certificate_pem

```

Cifrado:

```

AES-256-GCM

```

La clave maestra debe vivir en:

```

secret manager
environment variable segura
KMS

```

---

# 5. Boundary de acceso

Sólo pueden acceder:

```

Fiscal Worker
Fiscal Orchestrator

```

Nunca:

```

frontend
public API
edge functions

```

---

# 6. Rotación

Recomendado:

```

certificados: anual
claves de cifrado: semestral
tokens WSAA: automático

```

---

# 7. Auditoría

Registrar eventos:

```

credential_created
credential_rotated
credential_revoked
certificate_expiring
token_renewed

```
