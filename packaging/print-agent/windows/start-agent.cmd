@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado o no esta en PATH.
  echo Instala Node.js 20+ y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

node local-print-agent.js

endlocal
