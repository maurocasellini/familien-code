#!/bin/bash
# ═══════════════════════════════════════════════════════
#   Familien-Code · Doppelklick-Starter (Mac)
#   herzbewegung · Numerologie & Astrologie
# ═══════════════════════════════════════════════════════

cd "$(dirname "$0")"

clear
echo ""
echo "  ✦ ✦ ✦"
echo ""
echo "  Familien-Code wird gestartet ..."
echo "  Dieses Fenster bitte offen lassen, solange du arbeitest."
echo "  Zum Beenden: dieses Fenster einfach schliessen."
echo ""
echo "  ─────────────────────────────────────────────"
echo ""

# 1. Node.js vorhanden?
if ! command -v node >/dev/null 2>&1; then
  echo "  ⚠  Node.js ist noch nicht installiert."
  echo ""
  echo "  Bitte einmalig installieren von:  https://nodejs.org"
  echo "  (die grosse gruene LTS-Variante waehlen, durchklicken)"
  echo ""
  echo "  Danach dieses Fenster schliessen und erneut doppelklicken."
  echo ""
  read -p "  Druecke Return zum Schliessen ..."
  exit 1
fi

# 2. API-Key vorhanden?
if [ ! -f .env.local ]; then
  echo "  ⚠  Die Datei .env.local mit dem API-Schluessel fehlt."
  echo "     Bitte bei Mauro melden."
  echo ""
  read -p "  Druecke Return zum Schliessen ..."
  exit 1
fi

# 3. Erster Start: Pakete installieren
if [ ! -d node_modules ]; then
  echo "  Erster Start: richte die App ein (dauert ein paar Minuten,"
  echo "  nur dieses eine Mal noetig). Bitte warten ..."
  echo ""
  npm install || { echo "  Fehler bei der Installation."; read -p "  Return zum Schliessen ..."; exit 1; }
  echo ""
fi

# 4. App starten + Browser oeffnen
echo "  Starte ... der Browser oeffnet sich gleich automatisch."
echo "  (Beim ersten Aufruf kann es 1-2 Minuten dauern.)"
echo ""
( sleep 6 && open "http://localhost:3000" ) &
npm run dev
