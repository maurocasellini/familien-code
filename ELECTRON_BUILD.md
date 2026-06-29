# Electron Desktop-App bauen (für Mauro)

Diese Anleitung zeigt, wie du aus dem Repo eine echte **Desktop-App** generierst, die Susana einfach doppelklicken kann. Ergebnis: `FamilienCode.dmg` (Mac) oder `FamilienCode Setup.exe` (Windows).

## Voraussetzungen

- Node.js 18 oder neuer
- Etwa 2 GB freier Speicher
- **Mac-Build geht nur auf einem Mac** (wegen `.dmg`-Erzeugung und Code-Signing)
- **Windows-Build geht idealerweise auf Windows** (Cross-Build von Mac geht prinzipiell auch, aber unsigniert)

## Setup einmalig

```bash
git clone https://github.com/maurocasellini/familien-code-v2.git
cd familien-code-v2
npm install
```

`.env.local` mit dem Anthropic-Key erstellen:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Variante A: Dev-Modus zum Testen

Live-Vorschau mit Hot-Reload (öffnet ein Electron-Fenster):

```bash
npm run electron:dev
```

Das startet parallel den Next.js-Dev-Server und Electron. Ideal zum Entwickeln.

## Variante B: Distribution-Build

### Mac (.dmg)

Auf einem Mac:

```bash
npm run electron:build:mac
```

Output: `dist-electron/FamilienCode-2.0.0.dmg` (Intel) und `FamilienCode-2.0.0-arm64.dmg` (Apple Silicon).

Susana doppelklickt die `.dmg`, zieht **FamilienCode** in den **Programme**-Ordner, fertig.

**Hinweis Code-Signing:** Ohne Apple Developer Account (jährlich 99 USD) ist die App unsigniert. macOS zeigt dann beim ersten Start die Sicherheitswarnung *"Programm konnte nicht geöffnet werden, da der Entwickler nicht verifiziert ist"*. Lösung für Susana:
- Rechtsklick auf die App → "Öffnen" → im Dialog "Öffnen" bestätigen
- Danach läuft sie normal

Falls du das beheben willst: Apple Developer Account holen, `CSC_LINK` und `CSC_KEY_PASSWORD` als Env-Variablen setzen, dann signiert `electron-builder` automatisch.

### Windows (.exe-Installer)

Auf einem Windows-Rechner:

```bash
npm run electron:build:win
```

Output: `dist-electron\FamilienCode Setup 2.0.0.exe`

Susana doppelklickt den Installer, klickt durch, App liegt danach im Startmenü und auf dem Desktop.

**Hinweis Code-Signing Windows:** Auch hier zeigt Windows SmartScreen bei unsignierten Apps eine Warnung. Susana muss "Weitere Informationen" → "Trotzdem ausführen" klicken beim ersten Mal. Code-Signing-Zertifikate kosten ca. 80-300 USD/Jahr.

### Beide gleichzeitig (auf Mac)

```bash
npm run electron:build:all
```

Mac-Builds sauber, Windows-Build geht von Mac aus (cross-compile via `wine`), ist aber etwas wackliger. Besser auf Windows direkt.

## Updates verteilen

Wenn du eine neue Version bauen willst:

1. In `package.json` die `version` hochsetzen (z.B. `2.0.0` → `2.0.1`)
2. `npm run electron:build:mac` (oder `:win`)
3. Neue `.dmg`/`.exe` an Susana schicken
4. Sie installiert drüber

Für **automatische Updates** könntest du später `electron-updater` einbauen plus eine Update-Quelle (z.B. GitHub Releases). Das ist eine eigene kleine Sache.

## Was Susana letztendlich sieht

1. Doppelklick auf die App
2. Während ~5 Sekunden startet der interne Server (kein sichtbares Terminal)
3. Das Familien-Code-Fenster öffnet sich
4. Sie arbeitet wie gewohnt
5. Beim Schliessen wird der Server automatisch beendet

Kein Terminal, kein `npm`, kein Stress.

## Troubleshooting

**Build hängt bei `electron-builder`** → Manchmal lädt es Electron-Binaries runter (~150 MB). Beim ersten Build kann das dauern, Geduld.

**"app code is not signed"** → Erwartet ohne Developer Account. Siehe Hinweis oben.

**App startet, zeigt aber weisses Fenster** → Wahrscheinlich Port-Konflikt. Schau in der Konsole (View → Developer Tools im Electron-Menü) ob 3456 belegt ist.

**Swisseph error in der gepackten App** → swisseph ist eine native Binding. electron-builder bundlet sie zwar, aber je nach Mac/Windows-Architektur kann es Probleme geben. Lösung: bei Problemen `npm install --build-from-source swisseph` lokal nochmal.
