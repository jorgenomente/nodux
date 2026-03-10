# Arquitectura propuesta — Bridge local ESC/POS

## Propósito

Definir una arquitectura ejecutable para que NODUX pueda imprimir tickets térmicos sin depender exclusivamente de `window.print()`.

El objetivo es soportar:

- tickets no fiscales desde `/pos`
- reimpresión desde `/sales/[saleId]/ticket`
- futura impresión fiscal desacoplada vía `print_jobs`

sin acoplar el frontend a una marca específica de impresora.

## Problema actual

Hoy NODUX:

- renderiza HTML/CSS para ticket
- delega la impresión al navegador
- depende del driver/cola configurada en el sistema operativo

Esto falla con frecuencia en térmicas USB ESC/POS cuando:

- el OS usa un driver genérico incorrecto
- macOS no tiene driver nativo real
- la impresora espera ESC/POS o raster térmico y recibe PostScript/PDF

## Objetivo del bridge

Agregar un agente local instalable que:

1. reciba jobs de impresión desde NODUX
2. traduzca un payload estructurado a ESC/POS o raster compatible
3. despache el trabajo a una impresora configurada localmente
4. reporte estado al frontend y, a futuro, al backend/cola

## Principios de diseño

- DB-first / queue-friendly: el diseño debe convivir con `print_jobs`
- un payload estructurado por ticket, no HTML arbitrario
- no depender de acceso directo USB desde el navegador
- un mismo contrato lógico para macOS y Windows
- browser print queda como fallback
- primera versión enfocada en un único dispositivo por caja

## Componentes

### 1. App web NODUX

Responsable de:

- generar o solicitar un payload de ticket estructurado
- elegir modo de impresión:
  - `browser`
  - `local_agent`
- mostrar estado de dispatch

### 2. Bridge local

Proceso residente instalado en la caja.

Responsable de:

- exponer endpoint local seguro
- detectar impresoras configuradas
- convertir payload a bytes de impresión
- enviar bytes ESC/POS o raster al destino
- devolver resultado de impresión

### 3. Backend NODUX

En la primera fase puede quedar fuera del camino crítico para ticket no fiscal.

En fases posteriores:

- emite jobs persistidos
- usa `print_jobs`
- permite reintentos
- audita errores y reimpresiones

## Estrategia por fases

### Fase 1 — Bridge local para ticket no fiscal

Objetivo:

- resolver impresión térmica operativa en cajas reales
- sin cambiar aún la DB

Flujo:

1. usuario hace click en `Imprimir ticket`
2. frontend detecta si el agente local está disponible
3. si está disponible:
   - envía payload estructurado al bridge local
4. si no está disponible:
   - cae a `window.print()`

Persistencia:

- no obligatoria en esta fase

### Fase 2 — Configuración por sucursal/dispositivo

Objetivo:

- permitir elegir modo de impresión por caja o sucursal

Agregar:

- preferencia `browser_print` vs `local_agent`
- alias lógico de impresora local
- capabilities simples:
  - `paper_width_mm`
  - `supports_cut`
  - `supports_cash_drawer`
  - `supports_qr`

### Fase 3 — Integración con `print_jobs`

Objetivo:

- desacoplar completamente impresión fiscal/no fiscal

Flujo:

- NODUX genera job persistido
- bridge local consulta o recibe jobs
- el resultado se registra como:
  - `dispatched`
  - `completed`
  - `failed`

### Fase 4 — Spooler y reintentos

Objetivo:

- tolerar cortes de red, puente caído o impresora offline

Agregar:

- cola local liviana
- reintentos controlados
- confirmación de última impresión
- soporte de reimpresión desde historial

## Payload estructurado propuesto

No enviar HTML al bridge.

Enviar JSON semántico.

Ejemplo:

```json
{
  "jobId": "local-8c7f",
  "documentType": "sale_ticket",
  "printerTarget": "cashier-front",
  "paperWidthMm": 80,
  "locale": "es-AR",
  "currency": "ARS",
  "copies": 1,
  "cut": true,
  "cashDrawer": false,
  "headerLines": ["NODUX", "Sucursal Caballito"],
  "metaLines": ["Fecha: 2026-03-10 13:30", "Estado fiscal: No facturada"],
  "items": [
    {
      "name": "Yerba 1kg",
      "qty": 1,
      "unitPrice": 4500,
      "lineTotal": 4500
    }
  ],
  "totals": {
    "subtotal": 4500,
    "discount": 0,
    "total": 4500
  },
  "footerLines": ["Gracias por tu compra"]
}
```

## Render interno del bridge

El bridge debe soportar dos estrategias:

### Estrategia A — ESC/POS texto nativo

Usar cuando:

- el ticket es mayormente texto
- la impresora soporta ESC/POS estable

Ventajas:

- rápido
- simple
- poco peso de datos

Desventajas:

- menos control visual
- tablas y tipografías limitadas

### Estrategia B — raster térmico

Usar cuando:

- la impresora o driver requiere imagen/raster
- hay QR, logo o layout complejo

Ventajas:

- resultado más predecible entre modelos

Desventajas:

- más consumo
- mayor complejidad

Recomendación:

- Fase 1 empezar con texto ESC/POS
- dejar raster como fallback para modelos problemáticos

## API local propuesta

### `GET /health`

Respuesta:

```json
{
  "ok": true,
  "agentVersion": "0.1.0"
}
```

### `GET /printers`

Respuesta:

```json
{
  "printers": [
    {
      "id": "cashier-front",
      "name": "P-HAS-181 USB",
      "connection": "usb",
      "paperWidthMm": 80,
      "supportsCut": true
    }
  ]
}
```

### `POST /print`

Request:

```json
{
  "token": "<ephemeral-token>",
  "payload": {
    "jobId": "local-8c7f",
    "documentType": "sale_ticket"
  }
}
```

Response:

```json
{
  "accepted": true,
  "jobId": "local-8c7f",
  "status": "dispatched"
}
```

## Seguridad mínima

El bridge no debe aceptar cualquier request local sin validación.

Mínimos:

- bind en `127.0.0.1`
- token efímero emitido por la app
- TTL corto
- límite de tamaño de payload
- allowlist de tipos de documento

Fase posterior:

- pairing manual entre navegador y agente
- secreto por dispositivo

## Configuración operativa

El bridge debe almacenar una configuración local simple:

```json
{
  "defaultPrinterId": "cashier-front",
  "printers": [
    {
      "id": "cashier-front",
      "transport": "usb",
      "paperWidthMm": 80,
      "supportsCut": true,
      "driverMode": "escpos"
    }
  ]
}
```

## Instalación por sistema operativo

### Windows

Primera plataforma objetivo recomendada.

Motivo:

- mayor probabilidad de driver térmico usable
- entorno retail más común
- mejor chance de operación inmediata

### macOS

Soporte deseable para QA y clientes puntuales.

Expectativa real:

- no todas las térmicas USB tendrán driver directo funcional
- el bridge local reduce dependencia del diálogo del navegador
- pero puede seguir necesitando modo de transporte o compatibilidad real del dispositivo

### Linux

Útil para print server o cajas dedicadas.

Especialmente interesante cuando el fabricante ya provee PPD/filtro o cuando la impresora acepta ESC/POS crudo de forma estable.

## Integración futura con el producto

### `/settings/tickets`

Agregar más adelante:

- modo de impresión preferido
- estado del agente local
- impresora seleccionada
- prueba de impresión

### `/pos`

Agregar:

- intento silencioso de impresión por agente local
- fallback a browser print
- mensaje claro de disponibilidad del agente

### `/sales/[saleId]/ticket`

Agregar:

- selector `Imprimir por navegador` / `Imprimir por agente local`

### fiscal

La misma arquitectura puede alimentar:

- reimpresión de ticket fiscal
- dispatch de `print_jobs`
- cola de documentos renderizados

## Riesgos

- diversidad de chipsets ESC/POS clonados
- diferencias USB vs red vs serial
- soporte incompleto en macOS para ciertos dispositivos
- necesidad de instalable y soporte operativo

## Recomendación concreta

### Corto plazo

- seguir con browser print
- documentar límites por SO
- recomendar Windows o print server para producción térmica

### Próximo lote técnico

- diseñar MVP del bridge local Windows-first
- definir payload TypeScript compartido
- agregar detector `GET /health` desde frontend
- habilitar fallback explícito

### Después

- sumar macOS para QA
- integrar con `print_jobs`
- agregar spooler y reintentos

## Definición de done para una futura implementación MVP

- agente local corre en Windows
- `/pos` detecta agente disponible
- un ticket no fiscal puede imprimirse por agente local
- si el agente no está disponible, el sistema cae a browser print
- existe prueba de impresión desde settings
- queda documentado el setup operativo
