# Windows-Build für Familien-Code

Diese Anleitung erstellt **eine fertige `.exe`-Installer-Datei** für Windows. Nach dem Bauen wird Familien-Code wie jede andere Windows-App im Startmenü und auf dem Desktop liegen — kein Terminal mehr nötig zum Starten.

## Voraussetzungen einmalig installieren

### 1. Node.js installieren

Browser öffnen, gehe auf https://nodejs.org/de/download/

- "Windows Installer (.msi)" → "64-bit" klicken
- Datei `node-v20.x.x-x64.msi` (oder höher) wird runtergeladen
- Doppelklick darauf
- Im Setup-Wizard alle Defaults bestätigen (Next → Next → Install)
- Am Ende: "Finish"

**Verifizieren:** PowerShell öffnen (Windows-Taste drücken, "PowerShell" tippen, Enter). Eingeben:

```
node --version
```

Sollte ausgeben: `v20.x.x` oder ähnlich. Wenn ja → fertig mit Schritt 1.

### 2. Git installieren

Browser: https://git-scm.com/download/win

- Automatischer Download startet, oder Button "Click here to download" klicken
- Doppelklick auf `Git-2.xx.x-64-bit.exe`
- Im Wizard: **alle Defaults belassen** (einfach immer "Next" klicken)
- Am Ende: "Finish"

**Verifizieren** in PowerShell:

```
git --version
```

Sollte ausgeben: `git version 2.xx.x...`

## Repository klonen (einmalig)

PowerShell öffnen. Eingeben:

```
cd $env:USERPROFILE
git clone https://github.com/maurocasellini/familien-code-v2.git
cd familien-code-v2
```

Das erstellt einen Ordner `familien-code-v2` in deinem Benutzer-Verzeichnis (typischerweise `C:\Users\Susana\familien-code-v2`).

## API-Key konfigurieren (einmalig)

Im PowerShell, im Projektordner (du bist nach Schritt oben drin):

```
notepad .env.local
```

Notepad öffnet sich. **Wenn gefragt** ob neue Datei erstellt werden soll: Ja klicken.

In die leere Datei eintippen (eine einzige Zeile):

```
ANTHROPIC_API_KEY=sk-ant-api03-DEIN-ECHTER-KEY-HIER
```

(Den echten Anthropic API Key bekommst du von Mauro oder unter https://console.anthropic.com/settings/keys)

Speichern: Strg-S, dann Notepad schliessen.

## Build durchführen

Im PowerShell, im Projektordner:

```
npm install
```

→ Dauert 3-6 Minuten beim ersten Mal. Lädt alle Pakete inklusive Electron runter (~500 MB).

Dann:

```
npm run electron:build:win
```

→ Dauert weitere 5-15 Minuten. Lädt Electron-Binaries und packt alles zusammen. Am Ende steht in der Konsole:

```
• building target=NSIS file=dist-electron\FamilienCode Setup 2.0.0.exe
```

## Installer ausführen

Im Datei-Explorer zu `dist-electron\` navigieren (im Projektordner). Da liegt:

**`FamilienCode Setup 2.0.0.exe`** (ca. 200-300 MB)

Doppelklick darauf. Windows zeigt vermutlich SmartScreen-Warnung weil unsigniert:

> "Der Computer wurde durch Windows geschützt"

→ Klicken auf "Weitere Informationen" → dann auf "Trotzdem ausführen"

Installer-Wizard läuft durch. Nach der Installation:

- **Familien-Code** im **Startmenü** (Windows-Taste → "Familien-Code" tippen)
- Auch auf dem **Desktop** als Verknüpfung
- Kann ins Startmenü geheftet werden (Rechtsklick → "An Startmenü anheften")

## Tägliche Nutzung

Ab jetzt: einfach **Familien-Code im Startmenü doppelklicken**. App öffnet sich. Kein Terminal, kein npm, kein nichts.

## Wenn Mauro Updates pusht

PowerShell öffnen, dann:

```
cd $env:USERPROFILE\familien-code-v2
git pull
npm install
npm run electron:build:win
```

Wieder warten, dann neuen `.exe`-Installer ausführen → installiert die neue Version drüber.

## Problemlösung

**`npm` ist nicht erkannt** → Node.js nicht korrekt installiert. PowerShell neu öffnen, oder PC neu starten.

**`git` ist nicht erkannt** → Git nicht korrekt installiert. PowerShell neu öffnen.

**`npm install` schlägt fehl mit "swisseph" Fehler** → Native Binding für Windows kompiliert nicht. Lösung: in PowerShell eingeben:

```
npm install --build-from-source
```

Falls das auch nicht klappt: `swisseph` ist optional. Die App läuft auch ohne (mit weniger genauen Astrologie-Berechnungen). Setze in `package.json` `swisseph` von `optionalDependencies` weg, oder ignoriere den Fehler.

**Build hängt sehr lange** → Geduld. Electron-Binaries sind ~150 MB Download. Beim ersten Mal kann es 15+ Min dauern.

**`.exe` startet nicht oder zeigt weisses Fenster** → Schau ins Logfile `dist-electron\win-unpacked\resources\app\familien-code.log` für den genauen Fehler.

## Kontakt

Bei Problemen → Mauro fragen.
