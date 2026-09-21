@echo off
setlocal
rem Avvio di Port Control Center su Windows senza diritti di amministratore.
rem Se Node.js portatile e' stato estratto in questa cartella (sottocartella "nodejs"),
rem viene usato automaticamente senza modificare le variabili di sistema.

cd /d "%~dp0"

if exist "nodejs\node.exe" set "PATH=%~dp0nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato.
  echo Estrarre l'archivio ZIP di Node.js 20 nella sottocartella "nodejs" di questa cartella
  echo (in modo che esista il file nodejs\node.exe) e riavviare questo file.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installazione delle dipendenze in corso. Occorre qualche minuto.
  call npm install || goto :errore
)

if not exist "dist\index.cjs" (
  echo Compilazione dell'applicazione in corso.
  call npm run build || goto :errore
)

echo.
echo Applicazione in avvio su http://localhost:5000
echo Per chiuderla premere CTRL+C oppure chiudere questa finestra.
echo.
start "" http://localhost:5000
call npm start
goto :fine

:errore
echo.
echo Operazione non completata. Leggere i messaggi di errore sopra.
pause
exit /b 1

:fine
endlocal
