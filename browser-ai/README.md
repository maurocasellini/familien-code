# Eckblick AI – Claude in der Bildschirmecke

Browser-Erweiterung (Chrome, Edge, Brave, Arc – alle Chromium-Browser). Die KI ist nie im Weg und trotzdem immer eine Handbewegung entfernt.

| Aktion | Was passiert |
|---|---|
| **Maus in die Ecke unten links** | Panel gleitet auf, Eingabefeld hat Fokus. Maus wegziehen → Panel verschwindet. |
| **Text markieren** | Markierung wird sofort als Frage geschickt, Antwort streamt ins Panel. Der umgebende Absatz wird als Kontext mitgeschickt. |
| <kbd>Alt</kbd> beim Markieren | Auto-Frage unterdrücken (z. B. wenn du nur kopieren willst). |
| <kbd>Alt</kbd>+<kbd>K</kbd> | Panel öffnen/schließen |
| <kbd>Alt</kbd>+<kbd>J</kbd> | Aktuelle Markierung fragen (auch wenn Auto-Frage aus ist) |
| <kbd>Esc</kbd> | Antwort stoppen bzw. Panel schließen |
| 📌 / 🌐 | Panel anheften · Websuche an/aus |
| Chips unter der Antwort | „Mehr Details“, „Einfacher erklären“, „Beispiel“ – Ein-Klick-Folgefragen |

Antworten sind bewusst **kompakt** (Kernaussage zuerst, ca. 40–120 Wörter, keine Floskeln). Die Erweiterung erkennt die Absicht der Markierung: Begriff → Erklärung, Fremdsprache → Übersetzung, Code/Fehler → Erklärung + Fix, Behauptung → Einordnung, langer Absatz → Kernaussagen.

## Installation (2 Minuten)

1. `chrome://extensions` öffnen, oben rechts **Entwicklermodus** einschalten.
2. **Entpackte Erweiterung laden** → den Ordner `browser-ai/extension` wählen.
3. Die Einstellungsseite öffnet sich automatisch: **Anthropic API-Key** eintragen (von [console.anthropic.com](https://console.anthropic.com/settings/keys)) → **Testen**.
4. Tipp: Erweiterung in der Toolbar anpinnen. Schon offene Tabs einmal neu laden.

## Einstellungen

- **Modell:** Claude Opus 5.5 (Standard, beste Qualität), Sonnet 5.5, Haiku 4.5 (am schnellsten/günstigsten).
- **Antwortsprache:** wie die Frage / immer Deutsch / immer Englisch.
- **Auto-Frage**, **Mindestlänge** der Markierung, **Websuche** (Standard aus), **Ecken-Verzögerung**.

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

`extension/background.js` ist gebaut und eingecheckt, damit „Entpackt laden“ ohne Build funktioniert. Nach Änderungen an `src/background.js` neu bauen und in `chrome://extensions` auf ↻ klicken.

Icons neu erzeugen: `python3 make-icons.py`.
