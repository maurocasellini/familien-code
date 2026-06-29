@echo off
chcp 65001 >nul
title Familien-Code
cd /d "%~dp0"

cls
echo.
echo   * * *
echo.
echo   Familien-Code wird gestartet ...
echo   Dieses Fenster bitte offen lassen, solange du arbeitest.
echo   Zum Beenden: dieses Fenster einfach schliessen.
echo.
echo   ---------------------------------------------
echo.

REM 1. Node.js vorhanden?
where node >nul 2>&1
if errorlevel 1 (
  echo   [!] Node.js ist noch nicht installiert.
  echo.
  echo   Bitte einmalig installieren von:  https://nodejs.org
  echo   ^(die grosse gruene LTS-Variante waehlen, durchklicken^)
  echo.
  echo   Danach dieses Fenster schliessen und erneut doppelklicken.
  echo.
  pause
  exit /b 1
)

REM 2. API-Key vorhanden?
if not exist .env.local (
  echo   [!] Die Datei .env.local mit dem API-Schluessel fehlt.
  echo       Bitte bei Mauro melden.
  echo.
  pause
  exit /b 1
)

REM 3. Erster Start: Pakete installieren
if not exist node_modules (
  echo   Erster Start: richte die App ein ^(dauert ein paar Minuten,
  echo   nur dieses eine Mal noetig^). Bitte warten ...
  echo.
  call npm install
  if errorlevel 1 ( echo   Fehler bei der Installation. & pause & exit /b 1 )
  echo.
)

REM 4. Browser oeffnen + App starten
echo   Starte ... der Browser oeffnet sich gleich automatisch.
echo   ^(Beim ersten Aufruf kann es 1-2 Minuten dauern.^)
echo.
start "" /b cmd /c "timeout /t 6 >nul & start http://localhost:3000"
call npm run dev
