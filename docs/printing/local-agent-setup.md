# Local print agent — Setup MVP

## Estado de este MVP

El agente local ya existe en el repo y se ejecuta con:

```bash
npm run print:agent
```

Tambien existe un kit Windows descargable desde la app:

```text
/downloads/nodux-print-agent-windows.zip
```

Este lote soporta:

- endpoint local `GET /health`
- endpoint local `GET /printers`
- endpoint local `POST /print`
- dispatch de tickets ESC/POS por TCP/Ethernet
- dispatch RAW a cola de impresora Windows (`windows_printer`)

Este lote no soporta todavía:

- instalador `.exe`
- autostart del sistema
- spooler persistente

## Configuración local

La primera vez que corre, el agente crea:

```text
~/.nodux-print-agent/config.json
```

Ejemplo:

```json
{
  "listenHost": "127.0.0.1",
  "listenPort": 4891,
  "printers": [
    {
      "id": "cashier-front",
      "name": "Caja principal",
      "transport": "tcp",
      "host": "192.168.0.200",
      "port": 9100,
      "paperWidthMm": 80,
      "supportsCut": true
    },
    {
      "id": "cashier-usb",
      "name": "Caja USB Windows",
      "transport": "windows_printer",
      "printerName": "POS-80",
      "paperWidthMm": 80,
      "supportsCut": true
    }
  ]
}
```

## Cómo probar

1. Ejecutar `npm run print:agent`.
   Alternativa Windows sin repo abierto:
   - descargar `nodux-print-agent-windows.zip`
   - extraerlo en una carpeta local
   - ejecutar `start-agent.cmd`
2. Confirmar en consola que escucha en `http://127.0.0.1:4891`.
3. Editar `~/.nodux-print-agent/config.json` con la IP y puerto reales de la impresora Ethernet.
   Alternativa Windows USB:
   - usar `transport: "windows_printer"`
   - poner `printerName` exactamente igual al nombre de la cola instalada en Windows
4. Abrir NODUX en `/settings/tickets`.
5. En `Bridge local ESC/POS`:
   - poner modo `Directo por agente local`
   - dejar URL `http://127.0.0.1:4891`
   - usar `printerTarget` igual al `id` del config
6. Guardar configuración local.
7. Probar `Probar conexión`.
8. Probar `Imprimir ticket de prueba`.

## Notas operativas

- Muchas térmicas Ethernet ESC/POS escuchan en `9100/tcp`, pero no debe asumirse sin validar modelo.
- Para USB Windows, la cola debe existir y aceptar `RAW`. El agente envía bytes crudos vía WinSpool `WritePrinter`.
- Si el agente no responde o la impresora no está disponible, NODUX hace fallback al navegador.
- El frontend guarda su configuración en `localStorage`; el agente guarda la suya en el sistema operativo.

## Siguiente paso

- agregar instalador Windows
- mejorar diagnóstico de colas Windows USB
- exponer descarga del agente desde la UI
