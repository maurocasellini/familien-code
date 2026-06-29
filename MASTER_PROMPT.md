# FAMILIEN-CODE · Master-Prompt für neue Chat-Sessions

> **Zweck dieser Datei:** Vollständige Übergabe damit du in einem neuen Claude-Chat sofort weiterarbeiten kannst, ohne dass Claude den Kontext neu aufbauen muss. Reinkopieren ans Anfang des neuen Chats.

---

## 1. KONTEXT & AUFTRAG

**Projekt:** Familien-Code — eine numerologisch-astrologische Analyse-App
**Auftraggeber:** Mauro Casellini (Entwickler/Auftraggeber)
**End-Nutzerin:** **Susana** (NICHT Sara!) — spirituelle Beraterin/Mediumtante, betreibt **herzbewegung.ch**
**Klient:innen:** Susanas Klient:innen erhalten die fertigen Analysen als Word/PDF (verkauft sie als Beraterin-Leistung)
**Sprache:** Schweizer Hochdeutsch, Deutsch primär (DE/EN/PT verfügbar)

Mauros Geburtsdatum (für Tests): **02.11.1987, 12:00, Bellinzona**

---

## 2. TECH-STACK

- **Frontend:** Next.js 14.2.3, React (single-file `pages/index.js`, ~2900 Zeilen JSX + CSS-in-JS)
- **Backend:** Next.js API Routes (`/api/chat`, `/api/astrology`, `/api/generate-docx`, `/api/admin`)
- **LLM:** Anthropic Claude über API — Model `claude-opus-4-5` (aktuell aliased auf `claude-opus-4-5-20251101`)
- **Desktop-App:** Electron 42 (Mac DMG + Windows EXE über electron-builder)
- **DOCX:** `docx` npm-package mit echten Tabellen
- **Astrologie:** Swiss Ephemeris (`swisseph`) als optional dependency, nur lokal (in gepackter App excluded wegen native binding Inkompatibilität mit Electron 42)
- **Sprachen:** DE/EN/PT in Output, UI nur Deutsch

**Wichtige libs:** `docx`, `swisseph` (optional), `undici`, `electron-builder`

---

## 3. ARCHITEKTUR

### Hybrid-Setup: Lokal primär, Vercel als Demo

- **Lokale Electron-App = HAUPTLÖSUNG**
  - Voller 32K-Token-Output
  - Swiss Ephemeris für Profi-Astrologie
  - Daten verlassen den Rechner nicht
  - Mac DMG + Windows EXE
  - Konfig in `%APPDATA%\FamilienCode` (Win) / `~/Library/Application Support/FamilienCode` (Mac)

- **Vercel = DEMO ONLY**
  - URL: `https://familien-code-v2.vercel.app/`
  - Basic Auth: `susana` / `susana` (über `middleware.js`)
  - Max-Tokens hardcoded auf 8000 (Hobby-60s-Timeout)
  - Kein Swiss Ephemeris (Approximation)
  - NICHT die alte `familien-code.vercel.app` anfassen

### Repo

- **GitHub:** `https://github.com/maurocasellini/familien-code-v2`
- **Mauros Pfad lokal:** `~/familien-code-v2` (= `/Users/maurocasellini/familien-code-v2`)
- **Container-Pfad (Claude):** `/home/claude/familien-code-v2`

### Shell-Aliase (auf Mauros Mac)

```bash
alias fc='cd ~/familien-code-v2'
alias fcdev='cd ~/familien-code-v2 && git pull && npm run electron:dev'
```

---

## 4. METHODIK: CROWLEY THOTH TAROT (KRITISCH!)

Susana arbeitet mit **Aleister Crowleys Thoth-Tarot**, NICHT Rider-Waite. Dies ist die methodische Grundlage der ganzen App.

### Berechnungsmethode

**Block-Summe** (Tag + Monat + komplettes Jahr) statt Ziffer-für-Ziffer-Quersumme.

```
17.05.2026: 17 + 5 + 2026 = 2048 → 2+0+4+8 = 14
→ STOPP bei 14 (≤21)! Karte 14 = Art
```

### Reduktions-Regel

**Reduzieren NUR bis Zahl ≤21.** Dann STOPP. NIEMALS weiter reduzieren!

- 14 bleibt 14 (Art)
- 15 bleibt 15 (Teufel)
- 21 bleibt 21 (Universum)
- 22 wird zu 4 (2+2, weil >21)
- 30 wird zu 3 (3+0)

KEINE Pythagoräische Master-Zahlen-Logik (11, 22, 33 bleiben stehen) für **Daten-basierte** Zahlen!

### Crowley-spezifische Karten-Namen

Crowley hat einige Karten gegenüber Rider-Waite **umbenannt/vertauscht**:

| # | Crowley | Rider-Waite |
|---|---------|-------------|
| 1 | Der Magus | The Magician |
| 8 | **Adjustment** | Strength |
| 11 | **Lust** | Justice |
| 14 | **Art** (alchemistisch) | Temperance |
| 20 | **Das Äon** | Judgement |
| 21 | **Das Universum** | The World |

Crowley vertauschte 8 und 11 aus kabbalistischen Gründen.

### KRITISCH: Karten-Namen sind INTERNE Bedeutungsschicht

Claude bekommt die Karten-Bedeutung (Essenz, Licht, Schatten, Astro-Zuordnung) im Prompt. **DARF aber nie** in der Analyse explizit erwähnen:
- ❌ Kein "Karte XIV: Art"
- ❌ Kein "Der Hierophant zeigt..."
- ❌ Kein "Tarot", "Karte", "Arkanum", "Crowley", "Thoth"
- ❌ Keine Berechnungs-Erklärungen wie "17+5+2026=2048→14→5"

Stattdessen: Karten-Essenz in numerologisch-persönliche Sprache übersetzen.

Beispiel statt "Karte 14 Art = Alchemie":
> "Deine Energie zeigt eine alchemistische Qualität. Du verbindest Gegensätze, was scheinbar nicht zusammengehört wird in deinem inneren Kessel zu etwas Neuem verschmolzen."

### Wo Crowley angewendet wird

- ✅ Lebenszahl (Block-Methode)
- ✅ Persönliches Jahr (Block-Methode)
- ✅ Pinnacles (Block-Methode)

### Wo NICHT (bleibt pythagoräisch)

- Namen-Energien: Seelendrang / Persönlichkeit / Ausdruck — kommen aus Buchstaben (A-Z → 1-9), bleiben pythagoräisch MIT Master-Zahlen (11, 22, 33 stehen lassen)
- Begründung: Crowley nutzt für Buchstaben hebräisches Gematria, nicht lateinisches A-Z

---

## 5. SPRACHE & STIL

### Schweizer Hochdeutsch

- **KEIN ß!** Immer `ss`: muss, gross, weiss, Strasse, heisst, Schluss, Spass, grösste
- **Umlaute NORMAL verwenden:** ä ö ü Ä Ö Ü — NIE als `ae/oe/ue` schreiben!
  - für (nicht "fuer"), über (nicht "ueber"), persönlich (nicht "persoenlich"), Schütze (nicht "Schuetze"), Löwe (nicht "Loewe"), Südknoten (nicht "Suedknoten")
- **KEINE Gedankenstriche** (— oder –) als Satzzeichen. Stattdessen: Kommas, Doppelpunkte, kurze Sätze
- Bindestriche in zusammengesetzten Wörtern (Familien-Code, Lebens-Aufgabe) sind OK

### Berater:innen-Perspektive (UI) vs. Klient:innen-Anrede (Output)

- **UI-Texte** (Eingabemasken in der App) sprechen Susana an: "Wer wird analysiert?", "Die Person", "Worauf soll der Schwerpunkt liegen?", "Person hat den Namen geändert"
- **Analyse-Output** (das was die Klient:in liest) bleibt in direkter Du-Anrede: "Deine Lebenszahl 2 zeigt...", "Du trägst..."

### Defensiver Umlaut-Filter

In `pages/api/chat.js` gibt es einen **POST-Filter** mit ~100 Mappings die häufige Umlaut-Fehler korrigieren bevor die Antwort zurückgeht. Falls Claude trotzdem `ueber` ausspuckt → wird zu `über`.

---

## 6. APP-FLOW & UI

### Screen-Reihenfolge

1. **Splash** — "Familien-Code", Sprach-Wahl
2. **Konstellation** — 4 Optionen: Einzelperson / Paar / Familie / Alleinerziehende:r mit Kind/ern
3. **Person 1** — Vorname (Taufname), Nachname (Geburtsname), Geburtsdatum/-zeit/-ort, Toggle "Person hat Namen geändert"
4. **Person 2** (nur bei Paar/Familie) — analog Person 1
5. **Couple-Daten** (nur bei Paar/Familie) — gemeinsame Daten (optional)
6. **Kinder** (nur bei Familie/Solo+Kinder) — bis zu 5 Kinder
7. **Ahnenlinie** (optional) — Mutter / Vater (für Familiensystem-Analyse)
8. **Detailtiefe** — Slider 5-40 Seiten (Default 15)
9. **Fokus** — 5 Optionen: Gesamtbild / Beziehungsdynamik / Lebensweg / Kinder / Zukunft
10. **Loading** — Timer + Progress-Bar + zyklische Status-Texte + dynamische Hinweise
11. **Result** — Analyse-Anzeige + DOCX-Download + PDF-Print + "Neue Analyse"

### Eingabemasken-Texte

**WICHTIG:** Aus Susanas Perspektive, neutral. Beispiele:
- ❌ "Was bewegt dich am meisten?" → ✅ "Worauf soll der Schwerpunkt liegen?"
- ❌ "Nur für mich" → ✅ "Einzelperson"
- ❌ "Ich habe meinen Namen geändert" → ✅ "Person hat den Namen geändert"

---

## 7. BERECHNUNGEN (Implementation)

### Zentrale Helper in `pages/index.js`

```js
// CROWLEY-METHODE: reduziere bis ≤21
function tarotReduce(num) {
  const steps = [num];
  let cur = num;
  while (cur > 21) {
    cur = String(cur).split('').reduce((a, b) => a + parseInt(b, 10), 0);
    steps.push(cur);
  }
  return { steps, card: cur };
}

// Lebenszahl per Block-Methode
function lifeNum(d) {
  // d = "DD.MM.YYYY"
  // return tarotReduce(day + month + year).card
}

// Persönliches Jahr per Block-Methode
function calcPJ(birthDay, birthMonth, startYear) {
  return tarotReduce(birthDay + birthMonth + startYear).card;
}

// Pinnacles per Block-Methode
function pinnacleDetails(birthDate, today) {
  // p1 = tarotReduce(day + month)
  // p2 = tarotReduce(day + year)
  // p3 = tarotReduce(p1 + p2)
  // p4 = tarotReduce(month + year)
}
```

### Crowley-Karten-DB

Inline in `pages/index.js` als `CROWLEY` Objekt: 0-21 Karten mit:
- `name` (Deutsch, Crowley-spezifisch)
- `en` (English)
- `essence` (kurze Essenz)
- `light` (Lichtseite)
- `shadow` (Schattenseite)
- `astro` (Astro-Zuordnung)
- `note` (bei Crowley-Spezialfällen)

### Karten-Daten ans Prompt

In `personBlock()` und `pjDetailBlock()` wird die Karten-Essenz **mit klarer Anweisung "Namen NICHT erwähnen!"** an Claude geschickt.

---

## 8. PROMPT-ENGINEERING

### System-Prompt (`pages/api/chat.js`)

3 Hauptblöcke:
1. **Sprache & Stil** (Umlaute, ß-Regel, keine Gedankenstriche)
2. **CROWLEY THOTH BEDEUTUNGSSCHICHT** (interne Schicht, Namen NIE erwähnen)
3. **Inhaltliche Tiefe** (warm, persönlich, konkret)

### User-Prompt (in `buildPrompt()` von `pages/index.js`)

Struktur:
1. **DATEN-BLÖCKE** für jede Person (Name, Geburts-Daten, Numerologie-Zahlen, Crowley-Karten-Essenz)
2. **MASTER-REGEL bei Paar/Familie:** "Jede individuelle Sektion MUSS separate Sub-Sektionen pro Person enthalten — GLEICHWERTIG, GLEICH LANG, GLEICH DETAILLIERT"
3. **17 SEKTIONS-ANWEISUNGEN** mit Mindestlängen:
   1. Der zentrale Code
   2. Paar-Schlüsseldaten / Lebensweg (je nach Konstellation)
   3. Beziehungsdynamik / Namen-Energie
   4. Astrologische Kernverbindungen
   5. Die Kinder (nur Familie)
   6. Familiensystem (nur Familie)
   7. Herausforderung & Schlüssel
   8. **Persönliches Jahr im Detail** — längste Sektion, 1800-2400 Wörter
   9. Nächstes Persönliches Jahr
   10. Jahresenergien-Tabelle (6 Jahre)
   11. Pinnacles & Challenges
   12. Namen-Numerologie
   13. Erweiterte Zahlenebenen (Layer A: Geburtszahl, Reifezahl, Rational Thinking, Karmic Debts, Karma-Lessons, Hidden Passion)
   14. Essence Transit (Layer B)
   15. Astrologische Tiefe (Layer C: Mond, Aszendent, Mondknoten)
   16. Persönlicher Tag heute (Layer E)
   17. Saturn & Jupiter Returns (Layer F)
   18. Ahnenlinie (nur wenn aktiviert)

### max_tokens skaliert mit Detailtiefe

```
5 Seiten ≈ 4K Tokens
15 Seiten ≈ 9K Tokens
25 Seiten ≈ 16K Tokens
40 Seiten ≈ 32K Tokens
```

Vercel: gedeckelt auf 8000 wegen 60s-Timeout.

### Mindestlängen verdoppelt bei Paar

PJ-Detail Solo: 1800 Wörter
PJ-Detail Paar: 2400 Wörter (1200 pro Person)

### Marker-System

Claude soll bestimmte Marker im Text setzen die das Frontend + DOCX als visuelle Elemente rendern:
- `[ZAHL:X]` — grosse Code-Zahl
- `[NAMEN-GRID-START]` ... `[NAMEN-CARD:Name|Rolle|Seele|SLabel|Pers|PLabel|Ausdruck|ALabel|Beschreibung]` ... `[NAMEN-GRID-END]`
- `[JAHRES-TABELLE:Name1|Name2]` + mehrere `[JAHR:Jahr|Wert1|Wert2]`
- `[PINNACLE:Person|Nr|Zeitraum|Zahl|Beschreibung|Challenge]`
- `[PJ-HEADER:Titel|Zahl|Zeitraum]`
- `[QUARTAL:Titel|Zeit]`
- `[HIGHLIGHT-MONAT:Monat|PM-Zahl|Label]`
- `[ESSENZ:Text]` — zentrierte Quote-Box
- `[KARTE:eyebrow|title|subtitle|desc]`
- `[DYNAMIK:Name1|Zahl1|Name2|Zahl2|Beschreibung]`
- `[ASTRO:Symbol|Titel|Text]`
- `[HERAUSFORDERUNG:Text]` + `[SCHLUESSEL:Text]`
- `[PERSON-CARD:Name|Rolle|Zahl1|Zahl2|Hauptbeschreibung|Tag1|Tag2|...]`

---

## 9. DOCX-EXPORT (`pages/api/generate-docx.js`)

### Stil
- Cover-Seite mit Symbol ✦, brand "herzbewegung", Klient:innen-Name
- Sektions-Header in **Playfair Display** (Rose-Farbe) mit Gold-Akzentlinie
- Echte Tabellen (NICHT TAB-getrennter Text)
- Footer-Seite mit Susana + herzbewegung.ch

### Farben
- Rose: `#8B4060`
- Gold: `#C4962A`
- Rose-Pale: `#F4E4D9`
- Tabellen-Background: `#F9EDE3` / `#FFFAF5`

### Tabellen-Renderer
- `buildYearTable()` — Jahres-Tabelle mit alternierenden Zeilen
- `buildNameGrid()` — 3-Spalten Namen-Grid (Seele/Persönlichkeit/Ausdruck)
- `buildPinnacleBox()` — Quote-Stil mit Gold-Balken links
- `buildEssenceBox()` — zentrierter italic-Block

### Wichtig
- Keine Notizen-Felder
- Sprach-Filter: nur DE bekommt ß→ss
- Em-Dashes (—) und En-Dashes (–) werden zu Kommas/Bindestrichen

---

## 10. ELECTRON DESKTOP-APP

### `electron/main.js`
- Next.js wird **embedded als Library** (nicht als child_process gespawnt — sonst Windows-Crash)
- Port 3456 für Production, 3000 für Dev
- File-Logging in `userData/app.log`
- Menü: "Log-Datei öffnen", "Konfig-Ordner öffnen"
- Sucht `.env.local` an 4 Stellen:
  1. `%APPDATA%/FamilienCode/.env.local` (empfohlen)
  2. Neben der `.exe`
  3. In Resources-Ordner
  4. Im App-Root

### `package.json` Build-Config
```json
"build": {
  "appId": "ch.herzbewegung.familien-code",
  "productName": "FamilienCode",
  "npmRebuild": false,        // WICHTIG: swisseph crashed sonst
  "files": [
    ...,
    "!node_modules/swisseph/**/*"   // WICHTIG: aus Build excluded
  ]
}
```

### Build-Befehle
```bash
npm run electron:dev          # Dev mit Hot-Reload
npm run electron:build:mac    # .dmg in dist-electron/
npm run electron:build:win    # .exe in dist-electron/
npm run electron:build:all    # beide
```

### Susanas Installation (Windows)
1. `.exe` Doppelklick → "PC geschützt" → "Weitere Informationen" → "Trotzdem ausführen"
2. App einmal starten, schliessen (Konfig-Ordner wird angelegt)
3. Windows+R → `%APPDATA%\FamilienCode` → `.env.local` reinkopieren
4. App neu starten

`.env.local` Inhalt:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## 11. BUG-HISTORIE & WICHTIGE LERNERFAHRUNGEN

### Umlaut-Problem
**Problem:** Claude produzierte `ueber`/`fuer`/`persoenlich` weil System-Prompts diese Schreibweise hatten.
**Lösung:** 
1. Alle Prompts mit korrekten Umlauten umgeschrieben (~70 Wörter)
2. Defensive POST-Filter in `chat.js` mit ~100 Regex-Mappings, korrigiert Output

### Paar/Familie: Person 2 ignoriert
**Problem:** Claude hat Person 2 in individuellen Sektionen (PJ, Pinnacles, Layer A-F) übersprungen.
**Lösung:**
1. MASTER-REGEL ganz oben im Prompt: "Bei Paar/Familie MUSS jede Sektion separate Sub-Sektionen pro Person enthalten — gleichwertig"
2. Mindestlängen bei Paar verdoppelt
3. Explizite Sub-Sektion-Anweisungen pro Sektion

### Windows-Start-Crash
**Problem:** `spawn next.cmd` failed in packed Windows-App → "Server nicht erreichbar nach 30000ms"
**Lösung:** Next.js als embedded library laden statt child_process

### Swiss Ephemeris + Electron 42
**Problem:** `swisseph` C-Binding inkompatibel mit Electron 42 (nan-Library veraltet)
**Lösung:** `npmRebuild: false` + `!node_modules/swisseph/**/*` excluded + try-catch im Code für graceful fallback

### Crowley-Methode falsch implementiert
**Problem:** Zuerst Block-Methode mit 2 Karten (Zwischen + End), dann gemerkt dass Crowley nur EINE Karte hat (Reduktion stoppt bei ≤21)
**Lösung:** `tarotReduce()` korrigiert: stoppt bei ≤21, gibt nur eine Karte zurück

### Inkonsistente PJ-Berechnung
**Problem:** Crowley-Bedeutungsschicht obendrauf, aber `calcPJ` rechnete noch alte pythagoräische Methode → falsche Zahlen
**Lösung:** `lifeNum` und `calcPJ` komplett auf Block-Methode umgestellt

### DOCX-Tabellen falsch dargestellt
**Problem:** Tabellen waren TAB-getrennter Text → unleserlich im Word
**Lösung:** Komplett neue `bodyToBlocks()` Funktion mit echten `Table`, `TableRow`, `TableCell` Objekten

---

## 12. AKTUELLE FILES (Übersicht)

```
familien-code-v2/
├── pages/
│   ├── index.js           ← Haupt-App (~2900 Zeilen)
│   ├── _app.js
│   ├── admin.js           ← Admin-Panel
│   └── api/
│       ├── chat.js        ← Anthropic API + System-Prompt + Umlaut-Filter
│       ├── astrology.js   ← Swiss Ephemeris + Nominatim
│       ├── generate-docx.js ← DOCX-Generator
│       └── admin.js
├── electron/
│   └── main.js            ← Embedded Next.js Server
├── lib/
│   └── crowley-cards.js   ← (vorhanden, aber DB inline in index.js)
├── styles/
│   └── globals.css
├── middleware.js          ← Vercel Basic Auth
├── package.json
├── icon.svg, icon.png
└── LOCAL_SETUP.md, ELECTRON_BUILD.md, WINDOWS_BUILD.md
```

---

## 13. AKTUELLER STATUS & TODOS

### Erledigt (Stand: Frühjahr 2026)
- ✅ Komplette Numerologie (Lebenszahl, Seelendrang, Ausdruck, PJ, Pinnacles, Karmic, Layer A-F)
- ✅ Swiss Ephemeris-Integration (lokal)
- ✅ Crowley Thoth Tarot komplette Umstellung
- ✅ Block-Summe-Methode für Daten-Zahlen
- ✅ Karten-Namen als interne Schicht (nie im Output)
- ✅ Umlaute überall korrekt + defensive Filter
- ✅ Paar/Familie: Person 2 wird gleichwertig behandelt (Master-Regel)
- ✅ DOCX mit echten Tabellen + Cover/Footer
- ✅ Detailtiefe-Slider 5-40 Seiten
- ✅ Lade-Screen mit Timer + Progress + Hinweise
- ✅ Berater:innen-Perspektive in UI (für Susana)
- ✅ Geburtsname-Toggle (Heirat)
- ✅ Ahnenlinie optional
- ✅ Electron Mac DMG funktioniert
- ✅ Electron Windows EXE — embedded Next.js (Crash-Fix)
- ✅ Vercel Basic Auth (susana/susana)

### Pending / nächste Schritte
- ⏳ Windows .exe an Susana ausliefern (mit `.env.local`)
- ⏳ Susanas API-Key (sie braucht eigenen Anthropic-Account)
- ⏳ Eventuell PDF-Export zusätzlich zu DOCX
- ⏳ Eventuell Klienten-Historie (SQLite/JSON lokal)
- ⏳ Eventuell Templates für wiederkehrende Konstellationen
- ⏳ Eventuell Auto-Update via electron-updater + GitHub Releases

### Bewusst NICHT gemacht
- ❌ Streaming-Output (Vercel-Timeout würde damit umgangen, aber lokal nicht nötig)
- ❌ Vercel Pro Upgrade ($240/Jahr für 300s Timeout — Mauro hat sich klar für lokale App entschieden)
- ❌ Code-Signing für Win/Mac (würde "PC geschützt"-Warnung beheben, kostet 80-300 USD/Jahr — nicht nötig für Susanas Einsatz)

---

## 14. WICHTIGE REGELN FÜR NEUE CHATS

Wenn du einen neuen Chat startest mit dieser Datei, achte auf:

1. **Susana** (NICHT Sara) ist die Beraterin
2. **Crowley Thoth** ist die methodische Grundlage — Block-Methode, max 21
3. **Karten-Namen NIE im Output** — interne Bedeutungsschicht
4. **Schweizer Hochdeutsch** — kein ß, Umlaute normal
5. **UI = Berater:innen-Perspektive**, Output = Klient:innen-Anrede (Du)
6. **GitHub:** `maurocasellini/familien-code-v2`
7. **Lokal:** `~/familien-code-v2`
8. **App ist die Hauptlösung**, Vercel nur Demo
9. **Mauros Mac**, **Susanas Windows**
10. **Keine Master-Zahlen** für Daten-Zahlen (Crowley), Master-Zahlen JA für Namen-Energien (pythagoräisch)

### Häufige Befehle die Mauro kennt

```bash
# Update + Start
cd ~/familien-code-v2
git pull
npm run electron:dev

# Windows-Build
npm run electron:build:win

# Mac-Build
npm run electron:build:mac

# Detail-Tiefe
# Solo: 15 (Default), Paar/Familie: 25-30 empfohlen
```

---

## 15. PROMPT FÜR NEUEN CHAT

Wenn du einen neuen Claude-Chat startest, kopiere folgendes als erste Nachricht:

```
Ich arbeite am Familien-Code Projekt für Susana (herzbewegung.ch) — eine 
numerologisch-astrologische Analyse-App basierend auf Crowley Thoth Tarot. 
Die App ist eine Electron Desktop-App (Mac + Windows) mit Next.js Backend, 
verwendet die Anthropic Claude API für die Analyse-Generierung.

Im Anhang findest du das vollständige Übergabe-Dokument (Master-Prompt MD). 
Bitte lies es komplett durch und bestätige dass du folgende Kernregeln 
verinnerlicht hast:

1. Crowley-Methode für Daten-Zahlen (Block-Summe, reduziere bis ≤21, KEINE 
   weitere Reduktion!)
2. Crowley-Karten als interne Bedeutungsschicht — Namen NIE im Output 
   erwähnen
3. Pythagoräisch (mit Master-Zahlen) für Namen-Energien
4. Schweizer Hochdeutsch: kein ß, Umlaute normal verwenden (ä ö ü), keine 
   Gedankenstriche
5. Susana (NICHT Sara) ist die Beraterin
6. UI-Texte aus Berater:innen-Sicht, Analyse-Output aus Du-Anrede
7. GitHub: maurocasellini/familien-code-v2, lokal: ~/familien-code-v2

Mein heutiges Anliegen ist: [HIER DEIN ANLIEGEN]
```

Dann anhängen: diese Master-Prompt-Datei.

---

## 16. KONTAKT & SECURITY

- **GitHub PAT** wurde in alten Chats benutzt — sollte rotiert werden auf https://github.com/settings/tokens
- **Anthropic API Key** wurde in alten Chats geleakt — sollte rotiert werden auf https://console.anthropic.com/settings/keys
- **Susanas API Key** ist separat und sollte SIE selbst verwalten

---

**Letzte Aktualisierung:** Mai 2026
**Maintainer:** Mauro Casellini
**Repo:** https://github.com/maurocasellini/familien-code-v2
