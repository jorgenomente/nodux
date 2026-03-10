NODUX Print Agent - Guia Windows

IMPORTANTE
- Este kit sirve para imprimir tickets sin el dialogo del navegador.
- Debe instalarse en la misma PC Windows donde se usa NODUX.
- La impresora debe estar ya instalada y funcionando en Windows.

ANTES DE EMPEZAR
1. Confirma que puedes imprimir una pagina de prueba desde Windows.
2. Confirma que tienes Node.js 20 o superior instalado.
3. Si no sabes si tienes Node.js:
   - abre "Simbolo del sistema" o "PowerShell"
   - escribe:
     node -v

PASO 1 - GUARDAR LOS ARCHIVOS
1. Crea una carpeta en la PC, por ejemplo:
   C:\NODUX-Print-Agent
2. Copia o extrae en esa carpeta todos los archivos del zip.

PASO 2 - PROBAR QUE EL AGENTE ABRE
1. Haz doble click en:
   start-agent.cmd
2. Si todo va bien, se abrira una ventana negra.
3. Debes ver algo parecido a esto:
   NODUX local print agent listening on http://127.0.0.1:4891

Si aparece un error sobre Node.js:
- instala Node.js 20 o superior
- luego vuelve a ejecutar start-agent.cmd

PASO 3 - CREAR EL ARCHIVO DE CONFIGURACION
La primera vez que el agente se ejecuta, crea este archivo:

%USERPROFILE%\.nodux-print-agent\config.json

Normalmente queda en una ruta como esta:

C:\Users\TU_USUARIO\.nodux-print-agent\config.json

PASO 4 - ELEGIR EL TIPO DE IMPRESORA
Hay 2 modos:

A) IMPRESORA USB EN WINDOWS
Usa este modo si la impresora aparece instalada en Windows y tiene un nombre de cola.

Ejemplo:
{
  "listenHost": "127.0.0.1",
  "listenPort": 4891,
  "printers": [
    {
      "id": "cashier-usb",
      "name": "Caja USB Windows",
      "transport": "windows_printer",
      "printerName": "NOMBRE_EXACTO_DE_LA_IMPRESORA",
      "paperWidthMm": 80,
      "supportsCut": true
    }
  ]
}

Que debes cambiar:
- printerName:
  debe ser el nombre exacto de la impresora en Windows

Como encontrar el nombre:
1. Abre Configuracion de Windows
2. Ve a Bluetooth y dispositivos > Impresoras y escaneres
3. Busca tu impresora
4. Copia el nombre exactamente igual

B) IMPRESORA ETHERNET / RED
Usa este modo si la impresora imprime por IP en la red local.

Ejemplo:
{
  "listenHost": "127.0.0.1",
  "listenPort": 4891,
  "printers": [
    {
      "id": "cashier-front",
      "name": "Caja principal Ethernet",
      "transport": "tcp",
      "host": "192.168.0.200",
      "port": 9100,
      "paperWidthMm": 80,
      "supportsCut": true
    }
  ]
}

Que debes cambiar:
- host:
  la IP real de la impresora
- port:
  normalmente 9100, pero solo si tu modelo usa ese puerto

PASO 5 - GUARDAR Y REINICIAR EL AGENTE
1. Guarda el archivo config.json
2. Cierra la ventana del agente si estaba abierta
3. Vuelve a abrir:
   start-agent.cmd

PASO 6 - CONFIGURAR NODUX
1. Abre NODUX
2. Ve a:
   Settings > Tickets e impresion
3. Busca la seccion:
   Bridge local ESC/POS
4. Completa asi:

Si usas USB Windows:
- Modo de impresion: Directo por agente local
- URL del agente: http://127.0.0.1:4891
- Printer target: cashier-usb

Si usas Ethernet:
- Modo de impresion: Directo por agente local
- URL del agente: http://127.0.0.1:4891
- Printer target: cashier-front

Luego:
- Copias: 1
- Cortar ticket: activado si tu impresora corta
- Abrir cajon: desactivado por ahora, salvo que lo necesites

Haz click en:
- Guardar config local

PASO 7 - HACER LAS PRUEBAS
1. En la misma pantalla, haz click en:
   Probar conexion
2. Si dice que el agente esta disponible:
   haz click en:
   Imprimir ticket de prueba
3. Si eso sale bien:
   abre POS y prueba Imprimir ticket

QUE DEBERIA PASAR
- No deberia abrirse el dialogo del navegador
- No deberian abrirse ventanas extra
- La impresora deberia imprimir directamente

SI NO FUNCIONA
Revisa esto:

1. NO IMPRIME NADA
- verifica que la impresora imprima desde Windows
- verifica que start-agent.cmd siga abierto
- verifica que en NODUX la URL sea:
  http://127.0.0.1:4891
- verifica que el printer target coincida con el "id" del config.json

2. AGENTE NO DISPONIBLE
- revisa si la ventana del agente sigue abierta
- vuelve a ejecutar start-agent.cmd
- prueba otra vez "Probar conexion"

3. USB WINDOWS NO IMPRIME
- confirma que el nombre en "printerName" sea EXACTO
- confirma que Windows pueda imprimir pagina de prueba
- intenta reiniciar la impresora y la PC

4. ETHERNET NO IMPRIME
- confirma la IP real de la impresora
- confirma que la impresora este en la misma red
- confirma el puerto correcto

5. SIGUE APARECIENDO EL DIALOGO DEL NAVEGADOR
- revisa que en NODUX el modo sea:
  Directo por agente local
- si el agente falla, NODUX usa fallback al navegador

NOTAS FINALES
- Este kit es MVP.
- Funciona mejor si primero validas la impresora fuera de NODUX.
- Si algo falla, anota:
  - nombre exacto de la impresora
  - contenido del config.json
  - mensaje que aparece en la ventana del agente
  - que paso al hacer "Imprimir ticket de prueba"
