#!/bin/bash
# Familien-Code: Build-Cache leeren (behebt "Failed to fetch").
# Diese Datei MUSS im Familien-Code-Projektordner liegen (neben package.json).
cd "$(dirname "$0")" || exit 1
clear
echo "------------------------------------------"
echo "   Familien-Code wird zurueckgesetzt ..."
echo "------------------------------------------"
echo ""
if [ -d ".next" ]; then
  rm -rf .next
  echo "   Erledigt: Build-Cache geleert."
else
  echo "   Alles sauber: kein Cache vorhanden."
fi
echo ""
echo "   Starte Familien-Code jetzt wieder normal."
echo "   Dieses Fenster kannst du schliessen."
echo ""
sleep 3
