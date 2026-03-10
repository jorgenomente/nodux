# Bridge local ESC/POS — MVP ejecutable

## Objetivo

Convertir la arquitectura propuesta del bridge local en un MVP pequeño, Windows-first y compatible con fallback.

## Alcance del MVP

- solo ticket no fiscal
- solo `/pos`
- un único documento: `sale_ticket`
- una impresora por caja
- fallback a browser print
- transportes iniciales:
  - TCP/Ethernet
  - cola Windows USB por nombre de impresora (`windows_printer`)

## Fuera de alcance

- ticket fiscal
- spooler persistente
- reintentos avanzados
- múltiples impresoras por tipo
- integración completa con `print_jobs`
- instalador macOS

## Componentes mínimos

### Repo NODUX

- tipo compartido `LocalPrintPayload`
- detector de agente local
- acción `print via local agent`
- fallback a `window.print()`

### Agente local

- endpoint `GET /health`
- endpoint `POST /print`
- archivo de configuración local
- soporte de impresora ESC/POS simple

## Secuencia mínima

1. Cajero pulsa `Imprimir ticket`
2. Frontend intenta `GET http://127.0.0.1:<port>/health`
3. Si responde OK:
   - envía `POST /print`
4. Si falla:
   - usa browser print

## Criterio de éxito

- un ticket real se imprime en térmica compatible sin abrir preview del navegador
- el usuario no queda bloqueado si el agente no está instalado
