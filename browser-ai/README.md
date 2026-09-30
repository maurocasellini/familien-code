# Eckblick AI – Claude in der Bildschirmecke

Browser-Erweiterung (Chrome, Edge, Brave, Arc – alle Chromium-Browser). Die KI ist nie im Weg und trotzdem immer eine Handbewegung entfernt.

| Aktion | Was passiert |
|---|---|
| **Text markieren + ⌃C** (Control, nicht ⌘) | Frage geht still im Hintergrund an die KI, kein Fenster springt auf. Das Icon zeigt „…“ solange sie arbeitet und ✓ wenn die Antwort fertig ist (rotes ! bei Fehlern, Details im Panel). Funktioniert auch in Eingabefeldern und iframes. |
| **⌃V** | Antwort wird dort eingefügt, wo der Cursor steht. Läuft sie noch, wird sie eingefügt, sobald sie fertig ist. Ist kein Textfeld aktiv, passiert nichts (grauer ? am Icon). Die Zwischenablage wird nie automatisch verändert. |
| **⌃ gedrückt halten + Maus in die Ecke unten links** | Dezentes Panel mit der Antwort, Quellen und Folgefragen. Maus weg → es verschwindet. Sonst öffnet es sich nie, auch nicht bei Fehlern (dann rotes ! am Icon). |
| ⌘C / ⌘V | bleiben ganz normal. |
| <kbd>Esc</kbd> | Antwort stoppen bzw. Panel schließen |

Windows: Alt+Shift+C / Alt+Shift+V. Ändern unter `chrome://extensions/shortcuts`. In den Einstellungen kann man den Auslöser auch auf „Markieren + ⌘C“ oder „Nur markieren“ umstellen.

Antworten sind **einfügefertig**: so kompakt wie möglich (auch komplexe Fragen höchstens etwa 500 Zeichen), sprachlich einfach, deutsche Rechtschreibung (Deutschland), kein KI-Stil, keine Gedankenstriche, kein Markdown. Aufzählungen nur als schlichte Zeilen mit `- `.

## Wissensbasis (eigene Unterlagen)

**Ordner verbinden (empfohlen):** In den Einstellungen unter „Wissensbasis“ auf „Ordner verbinden“ klicken und einen Ordner wählen (auch ein Google-Drive- oder Dropbox-Ordner auf dem Mac). Alle unterstützten Dateien darin, inkl. Unterordner (max. 60 Dateien), werden übernommen. „Synchronisieren“ lädt neue und geänderte Dateien nach und entfernt gelöschte; beim Öffnen der Einstellungen passiert das automatisch, solange Chrome den Zugriff noch erlaubt.

Alternativ einzelne Dateien hochladen: **PDF, PPTX, DOCX, TXT, MD, CSV**. Jede neue Frage bekommt die aktiven Dokumente als Kontext mit; Claude stützt sich zuerst darauf. Das Panel zeigt als kleine Marke, aus welchem Dokument und von welcher Seite die Antwort stammt (z. B. „📄 Strategie.pdf, S. 4“).

- Präsentationen am besten als **PDF** exportieren, dann sieht Claude auch Grafiken und Layout. PPTX/DOCX werden lokal in Text umgewandelt (inkl. Sprechernotizen).
- Die Dateien liegen in deinem Anthropic-API-Konto (Files API), nicht auf einem fremden Server.
- Dokumente einzeln an- und ausschalten. Die Einstellungsseite zeigt, wie viele Tokens pro neuer Frage anfallen. Dank Prompt-Caching (1 Stunde) sind Folgefragen deutlich günstiger und schneller.

## Installation (2 Minuten)

1. `chrome://extensions` öffnen, oben rechts **Entwicklermodus** einschalten.
2. **Entpackte Erweiterung laden** → den Ordner `browser-ai/extension` wählen.
3. Die Einstellungsseite öffnet sich automatisch: **Anthropic API-Key** eintragen (von [console.anthropic.com](https://console.anthropic.com/settings/keys)) → **Testen**.
4. Tipp: Erweiterung in der Toolbar anpinnen. Offene Tabs funktionieren sofort, ohne Neuladen.

## Einstellungen

- **Modell:** Claude Opus 5.5 (Standard, beste Qualität), Sonnet 5.5, Haiku 4.5 (am schnellsten/günstigsten).
- **Antwortsprache:** Deutsch (Deutschland, Standard) / wie die Frage / Englisch.
- **Auslöser** (⌃C, ⌘C oder nur markieren), **Mindestlänge** der Markierung, **Websuche** (Standard aus), **Ecken-Verzögerung**.

## Technik

- Manifest V3. Content-Script (`extension/content.js`) rendert das Panel in einem Shadow-DOM – kein CSS-Konflikt mit Webseiten, helles/dunkles Design automatisch.
- Der Service-Worker (`src/background.js`) spricht über das offizielle `@anthropic-ai/sdk` mit der Claude API und streamt die Antwort per Port zurück. Der API-Key bleibt im Extension-Speicher und wird von Webseiten nie gesehen.
- Opus/Sonnet laufen mit `effort: "low"` für schnelle Antworten und mit aktiviertem Server-Fallback (`fallbacks: "default"`), damit eine fälschlich abgelehnte Anfrage automatisch auf einem anderen Modell weiterläuft.
- Nichts wird gespeichert oder mitgeloggt; der Gesprächsverlauf lebt nur im jeweiligen Tab.

### Entwickeln

```bash
cd browser-ai
npm install
npm run build        # bündelt src/background.js → extension/background.js
npm run zip          # optional: eckblick-ai.zip zum Weitergeben
```

`extension/background.js` und `extension/options.js` sind gebaut und eingecheckt, damit „Entpackt laden“ ohne Build funktioniert. Nach Änderungen in `src/` neu bauen und in `chrome://extensions` auf ↻ klicken.

Icons neu erzeugen: `python3 make-icons.py`.
