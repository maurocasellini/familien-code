# build-windows.ps1 — Automatisierter Windows-Build
# Voraussetzung: Node.js und Git sind installiert (einmalig)
# Ausführung: Rechtsklick → "Mit PowerShell ausführen"
# Oder im Terminal: powershell -ExecutionPolicy Bypass -File build-windows.ps1

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  Familien-Code · Windows-Build" -ForegroundColor Magenta
Write-Host "  herzbewegung · Numerologie & Astrologie" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# ── Voraussetzungen prüfen ────────────────────────────────────────
Write-Host "Prüfe Voraussetzungen..." -ForegroundColor Cyan

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "✗ Node.js fehlt!" -ForegroundColor Red
    Write-Host "  Bitte installiere zuerst Node.js von https://nodejs.org/de/download/"
    Write-Host "  Danach dieses Skript nochmal ausführen."
    Write-Host ""
    Write-Host "Drücke Enter zum Beenden..."
    Read-Host
    exit 1
}
Write-Host "✓ Node.js gefunden: $(node --version)" -ForegroundColor Green

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "✗ Git fehlt!" -ForegroundColor Red
    Write-Host "  Bitte installiere zuerst Git von https://git-scm.com/download/win"
    Write-Host ""
    Read-Host "Drücke Enter zum Beenden..."
    exit 1
}
Write-Host "✓ Git gefunden: $(git --version)" -ForegroundColor Green

# ── .env.local prüfen ─────────────────────────────────────────────
if (-not (Test-Path .env.local)) {
    Write-Host ""
    Write-Host "⚠ .env.local fehlt!" -ForegroundColor Yellow
    Write-Host "  Du brauchst einen Anthropic API Key in der Datei .env.local."
    Write-Host "  Format: ANTHROPIC_API_KEY=sk-ant-api03-..."
    Write-Host ""
    $createNow = Read-Host "Soll ich .env.local jetzt für dich anlegen? (j/n)"
    if ($createNow -eq "j" -or $createNow -eq "J") {
        $key = Read-Host "API Key eingeben (beginnt mit sk-ant-api03-...)"
        "ANTHROPIC_API_KEY=$key" | Out-File -FilePath .env.local -Encoding utf8
        Write-Host "✓ .env.local angelegt" -ForegroundColor Green
    } else {
        Write-Host "Bitte .env.local selbst anlegen und Skript erneut starten."
        Read-Host "Drücke Enter zum Beenden..."
        exit 1
    }
}
Write-Host "✓ .env.local vorhanden" -ForegroundColor Green
Write-Host ""

# ── Updates holen ────────────────────────────────────────────────
Write-Host "Hole neueste Code-Version (git pull)..." -ForegroundColor Cyan
git pull
Write-Host ""

# ── Abhängigkeiten installieren ─────────────────────────────────
Write-Host "Installiere Abhängigkeiten (npm install)..." -ForegroundColor Cyan
Write-Host "  Dauer: ca. 3-6 Min beim ersten Mal" -ForegroundColor DarkGray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ npm install fehlgeschlagen" -ForegroundColor Red
    Read-Host "Drücke Enter zum Beenden..."
    exit 1
}
Write-Host "✓ Abhängigkeiten installiert" -ForegroundColor Green
Write-Host ""

# ── Build ─────────────────────────────────────────────────────────
Write-Host "Erstelle Windows-Installer (npm run electron:build:win)..." -ForegroundColor Cyan
Write-Host "  Dauer: ca. 5-15 Min" -ForegroundColor DarkGray
npm run electron:build:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build fehlgeschlagen" -ForegroundColor Red
    Read-Host "Drücke Enter zum Beenden..."
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Build erfolgreich!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Installer liegt hier:" -ForegroundColor Cyan

$exeFile = Get-ChildItem -Path "dist-electron" -Filter "*Setup*.exe" | Select-Object -First 1
if ($exeFile) {
    Write-Host "  $($exeFile.FullName)" -ForegroundColor White
    Write-Host ""
    $openNow = Read-Host "Soll ich den Installer-Ordner jetzt im Explorer öffnen? (j/n)"
    if ($openNow -eq "j" -or $openNow -eq "J") {
        explorer.exe "dist-electron"
    }
} else {
    Write-Host "  dist-electron\ (siehe dort nach .exe-Datei)" -ForegroundColor White
}

Write-Host ""
Write-Host "Doppelklick auf die .exe → installiert Familien-Code auf diesem PC."
Write-Host "Beim ersten Start: SmartScreen-Warnung → 'Weitere Informationen' → 'Trotzdem ausführen'."
Write-Host ""
Read-Host "Drücke Enter zum Beenden..."
