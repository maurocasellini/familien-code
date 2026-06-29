@echo off
REM Familien-Code: Build-Cache leeren (behebt "Failed to fetch").
REM Diese Datei MUSS im Familien-Code-Projektordner liegen (neben package.json).
cd /d "%~dp0"
cls
echo ------------------------------------------
echo    Familien-Code wird zurueckgesetzt ...
echo ------------------------------------------
echo.
if exist ".next" (
  rmdir /s /q ".next"
  echo    Erledigt: Build-Cache geleert.
) else (
  echo    Alles sauber: kein Cache vorhanden.
)
echo.
echo    Starte Familien-Code jetzt wieder normal.
echo    Dieses Fenster kannst du schliessen.
echo.
timeout /t 4 >nul
