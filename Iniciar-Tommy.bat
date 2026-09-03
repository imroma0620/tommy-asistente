@echo off
cd /d "%~dp0"
if not exist dist\index.html (
  echo Preparando Tommy la primera vez...
  call npm run build
)
echo Abriendo Tommy. Puedes cerrar Cursor.
start "" "http://localhost:8787"
node server.mjs
pause
