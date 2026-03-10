# Setup operativo — Impresión térmica no fiscal

## Propósito

Documentar cómo funciona hoy la impresión no fiscal en NODUX, qué requisitos tiene por sistema operativo y cuál es el camino recomendado para impresoras térmicas ESC/POS.

## Estado actual en NODUX

- `/pos` y `/sales/[saleId]/ticket` renderizan un ticket HTML/CSS.
- La impresión se dispara con el diálogo del navegador (`window.print()`).
- NODUX no envía bytes ESC/POS crudos directamente a la impresora.
- NODUX no incluye todavía bridge local, spooler propio ni app nativa de impresión.

## Implicación técnica

Para que el flujo actual funcione bien, el sistema operativo debe tener una cola/driver capaz de traducir el trabajo del navegador a un formato que la impresora térmica entienda.

Si la cola queda configurada como:

- `Generic PostScript Printer`
- `Generic PCL`
- driver de etiqueta/matricial/láser no compatible

la impresora puede:

- imprimir caracteres o códigos extraños
- expulsar mucho papel
- cortar mal
- ignorar ancho real de 72mm/80mm

## Recomendación operativa por prioridad

### Prioridad 1 — Windows con driver del fabricante o compatible

Es el camino más simple para operación retail real cuando la impresora térmica es USB ESC/POS.

Usar cuando:

- la tienda opera en PC Windows
- el fabricante entrega driver o utilitario estable para Windows
- se quiere seguir usando impresión desde navegador sin agregar software extra de NODUX

### Prioridad 2 — Print server dedicado

Usar una PC Windows o Linux conectada a la impresora y compartir la cola por red.

Conviene cuando:

- la caja principal usa macOS
- la impresora solo tiene soporte real para Windows/Linux
- se necesita una salida rápida sin desarrollar bridge local

Ventajas:

- evita depender del stack USB de macOS
- mantiene el flujo actual de NODUX con pocos cambios
- permite centralizar configuración de corte, tamaño y pruebas

### Prioridad 3 — Bridge local ESC/POS

Es el camino correcto a mediano plazo para control real de térmicas.

Consiste en:

- generar payload estructurado del ticket
- convertirlo a ESC/POS o raster térmico compatible
- enviarlo a una app local o servicio residente

Ventajas:

- impresión más confiable
- menos dependencia del navegador
- mejor control de corte, cajón y QR

Costo:

- requiere desarrollo adicional
- requiere instalable por sistema operativo

## Guía rápida por sistema operativo

### Windows

- Preferir driver del fabricante.
- Si no existe, usar driver compatible probado por modelo/chipset, no uno genérico al azar.
- Validar primero una página de prueba del sistema operativo.
- Recién después probar desde `/pos` o `/sales/[saleId]/ticket`.

### macOS

- No usar `Generic PostScript Printer` para una térmica ESC/POS.
- No asumir que una opción genérica de la lista de `Printer Software` va a servir.
- Si el fabricante no ofrece driver macOS real, el flujo por navegador suele ser inestable o directamente incorrecto.
- En ese caso, la recomendación práctica es:
  - usar print server Windows/Linux
  - o avanzar a un bridge local ESC/POS

### Linux

- Es viable si existe PPD/filtro CUPS compatible.
- Para la P-HAS-181 revisada en este repo, el paquete Linux trae:
  - `has_generic.ppd`
  - filtro `rastertozj`
- Eso confirma que la impresora necesita pipeline específico de raster térmico, no PostScript genérico.

## Caso revisado: P-HAS-181

Hallazgos del material cargado en este repo:

- `impresoras no-fiscales/Drivers/Linux/HASAR Driver Linux.tar.gz` trae driver Linux, no macOS.
- El driver Linux usa `CUPS raster -> rastertozj`.
- El PPD declara:
  - impresión térmica
  - 72mm / 80mm
  - 203dpi
  - largo variable
  - corte
- Los ejemplos del fabricante envían comandos ESC/POS crudos, no HTML de navegador.

Conclusión:

- la P-HAS-181 no debe operarse en macOS como `Generic PostScript Printer`
- para pruebas en Mac conviene usar print server o, más adelante, bridge local ESC/POS

## QA mínimo antes de culpar a NODUX

1. Confirmar nombre del driver/cola instalada.
2. Imprimir página de prueba del sistema operativo.
3. Confirmar si la página de prueba sale correcta.
4. Confirmar ancho de rollo real: 72mm u 80mm.
5. Ajustar en `/settings/tickets`:
   - `ticket_paper_width_mm`
   - márgenes
   - `ticket_font_size_px`
   - `ticket_line_height`
6. Reprobar desde `/pos`.

## Decisión recomendada para NODUX

### Corto plazo

- Mantener browser print como fallback universal.
- Documentar setup por sistema operativo.
- Recomendar Windows o print server para térmicas USB ESC/POS sin driver macOS.

### Mediano plazo

- Agregar en `/settings/tickets` un bloque visible de ayuda operativa.
- Incluir checklist de driver, ancho y compatibilidad.
- Ofrecer guía descargable para macOS/Windows.

### Largo plazo

- Implementar bridge local de impresión ESC/POS.
- Separar `Imprimir vía navegador` de `Imprimir vía agente local`.
- Preparar spooler/reintentos para tickets fiscales y no fiscales.

## Alcance explícitamente fuera de este lote

- No se implementa aún bridge local.
- No se agrega instalador nativo para macOS.
- No se cambia todavía el flujo actual de `window.print()`.
- No se garantiza compatibilidad universal con cualquier térmica USB.
