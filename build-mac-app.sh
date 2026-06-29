#!/bin/bash
# build-mac-app.sh — Erstellt ein FamilienCode.app Bundle aus start-mac.command
# Ausfuehren mit: bash build-mac-app.sh

set -e
cd "$(dirname "$0")"

APPNAME="FamilienCode"
BUNDLE="${APPNAME}.app"

echo "Building ${BUNDLE}..."

# Bestehendes Bundle loeschen
rm -rf "${BUNDLE}"

# Struktur erstellen
mkdir -p "${BUNDLE}/Contents/MacOS"
mkdir -p "${BUNDLE}/Contents/Resources"

# Info.plist
cat > "${BUNDLE}/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${APPNAME}</string>
    <key>CFBundleIdentifier</key>
    <string>ch.herzbewegung.familien-code</string>
    <key>CFBundleName</key>
    <string>${APPNAME}</string>
    <key>CFBundleDisplayName</key>
    <string>Familien-Code</string>
    <key>CFBundleVersion</key>
    <string>2.0</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

# Launcher-Script in MacOS-Ordner
# Findet den Projekt-Pfad aus dem Bundle und startet npm run dev
cat > "${BUNDLE}/Contents/MacOS/${APPNAME}" <<'LAUNCHER'
#!/bin/bash
# FamilienCode Launcher
# Das .app Bundle liegt im Projekt-Root. ProjectRoot = parent of .app

APP_PATH="${BASH_SOURCE[0]}"
# Resolve symlinks
while [ -L "$APP_PATH" ]; do
    APP_PATH=$(readlink "$APP_PATH")
done
# Bundle-Pfad: parent of MacOS folder
BUNDLE_PATH=$(cd "$(dirname "$APP_PATH")/../.." && pwd)
# Projekt-Root: parent of bundle
PROJECT_ROOT=$(dirname "$BUNDLE_PATH")

cd "$PROJECT_ROOT"

# Logfile anlegen damit man sieht was passiert
LOG="$PROJECT_ROOT/familien-code.log"
echo "$(date) - Starte FamilienCode" >> "$LOG"
echo "$(date) - Projekt-Root: $PROJECT_ROOT" >> "$LOG"

# Check .env.local
if [ ! -f .env.local ]; then
    osascript -e 'display alert "Familien-Code: .env.local fehlt" message "Bitte eine Datei .env.local im Projektordner anlegen mit ANTHROPIC_API_KEY=sk-ant-..." as critical'
    exit 1
fi

# Check node
if ! command -v node >/dev/null 2>&1; then
    osascript -e 'display alert "Node.js fehlt" message "Bitte erst Node.js installieren: https://nodejs.org/de/download/" as critical'
    exit 1
fi

# Check node_modules
if [ ! -d node_modules ]; then
    osascript -e 'display notification "Erstinstallation laeuft, einen Moment..." with title "Familien-Code"'
    npm install >> "$LOG" 2>&1
fi

# Browser nach 4 Sekunden oeffnen
( sleep 4 && open http://localhost:3000 ) &

# Notification
osascript -e 'display notification "Server startet, Browser oeffnet sich..." with title "Familien-Code"'

# Server im Hintergrund starten, Output in Log
exec npm run dev >> "$LOG" 2>&1
LAUNCHER

chmod +x "${BUNDLE}/Contents/MacOS/${APPNAME}"

echo "✓ ${BUNDLE} erstellt im aktuellen Ordner"
echo ""
echo "Susana kann jetzt einfach FamilienCode.app doppelklicken."
echo "Achtung: Beim ersten Start fragt macOS evtl nach Sicherheitsbestaetigung (Rechtsklick → 'Oeffnen' → 'Oeffnen')."
echo ""
echo "Zum Beenden des Servers: in Aktivitaetsanzeige nach 'node' suchen und beenden,"
echo "oder im Terminal: pkill -f 'next dev'"
