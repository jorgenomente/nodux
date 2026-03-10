# Printing — Master Index

## Propósito

Centralizar el contexto operativo y técnico de impresión en NODUX.

Este directorio agrupa:

- setup operativo por sistema operativo
- estrategia de corto plazo
- arquitectura objetivo del bridge local ESC/POS
- recorte MVP de implementación

## Documentos

- `thermal-setup.md`
  - guía operativa actual
  - límites del flujo `window.print()`
  - recomendaciones por Windows, macOS y print server

- `escpos-bridge-architecture.md`
  - arquitectura completa del bridge local
  - payload estructurado
  - fases
  - integración futura con `print_jobs`

- `escpos-bridge-mvp.md`
  - recorte MVP Windows-first
  - alcance inicial
  - criterio de éxito

- `local-agent-setup.md`
  - runbook del agente local ya implementado en el repo
  - configuración TCP/Ethernet
  - pasos de prueba

## Orden recomendado de lectura

1. `thermal-setup.md`
2. `escpos-bridge-architecture.md`
3. `escpos-bridge-mvp.md`
4. `local-agent-setup.md`

## Fuente de verdad del track

Para cualquier lote futuro de impresión, este directorio debe tratarse como el contexto base del módulo.
