# AFIP Fiscal Job State Machine

Proyecto: NODUX  
Versión: v0.1

---

# 1. Propósito

Definir la máquina de estados del proceso de autorización fiscal.

---

# 2. Estados principales

```

pending
reserved
authorizing
authorized
render_pending
completed
rejected
pending_reconcile
failed

```

---

# 3. Diagrama

```

pending
│
▼
reserved
│
▼
authorizing
│
├─► authorized
│       │
│       ▼
│   render_pending
│       │
│       ▼
│   completed
│
├─► rejected
│
└─► pending_reconcile
│
├─► authorized
├─► rejected
└─► failed

```

---

# 4. Descripción de estados

### pending

El job fue creado pero no se reservó numeración.

---

### reserved

Numeración fiscal reservada.

---

### authorizing

Request enviado a AFIP / ARCA.

---

### authorized

AFIP aprobó el comprobante.

---

### render_pending

Falta generar PDF / ticket.

---

### completed

Proceso finalizado.

---

### rejected

AFIP rechazó el comprobante.

---

### pending_reconcile

Estado incierto (timeout o error de red).

---

### failed

Error terminal del sistema.

---

# 5. Reglas de transición

- `pending → reserved`
- `reserved → authorizing`
- `authorizing → authorized`
- `authorizing → rejected`
- `authorizing → pending_reconcile`
- `pending_reconcile → authorized | rejected | failed`
- `authorized → render_pending`
- `render_pending → completed`

---

# 6. Reglas críticas

- nunca reutilizar numeración en `pending_reconcile`
- registrar todos los cambios en `invoice_events`
