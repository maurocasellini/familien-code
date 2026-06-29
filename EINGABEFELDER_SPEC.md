# FAMILIEN-CODE · Eingabefelder-Spezifikation für Website

> **Zweck:** Vollständige Übersicht aller Eingabe-Felder die eine Webseite braucht, um die Analyse-Daten zu erfassen. Strukturiert nach Konstellation und Pflicht/Optional.

---

## 1. FELD-LEGENDE

| Symbol | Bedeutung |
|---|---|
| 🔴 | **PFLICHT** — ohne diese Eingabe keine Analyse möglich |
| 🟡 | **EMPFOHLEN** — Analyse wird ohne diese Daten weniger präzise |
| 🟢 | **OPTIONAL** — kann komplett leer bleiben, gibt aber Mehrwert |

---

## 2. KONSTELLATIONS-AUSWAHL (immer als erstes)

**🔴 Pflicht-Auswahl** — bestimmt welche weiteren Felder erscheinen:

| Wert | Anzeige-Name | Wer wird analysiert |
|---|---|---|
| `solo` | **Einzelperson** | 1 Person |
| `pair` | **Paar** | 2 Personen + gemeinsame Daten |
| `family` | **Familie** | 2 Personen + Kinder + gemeinsame Daten |
| `solo_children` | **Alleinerziehende:r mit Kind/ern** | 1 Person + Kinder |

UI-Empfehlung: 4 grosse Karten mit Icon, anklickbar.

---

## 3. PERSON-DATEN (Hauptperson, Partner, jedes Kind)

Diese Felder gibt es **pro Person**. Sie sind identisch für Hauptperson, Partner und Kinder.

### Block: Persönliche Angaben

| Feld | Pflicht | Format | Beispiel | Hinweis |
|---|---|---|---|---|
| **Vorname/n (Taufname)** | 🔴 | Text | `Susana Patricia` | Vollständiger Name bei Geburt — Pflicht für Numerologie |
| **Nachname (Geburtsname)** | 🔴 | Text | `Costa Campelo` | Original-Familienname, NICHT der nach Heirat |
| **Geburtsdatum** | 🔴 | TT.MM.JJJJ | `19.09.1980` | Pflicht für Lebenszahl + Astrologie |
| **Geburtszeit** | 🟡 | HH:MM (24h) | `23:20` | Wichtig für Aszendent & Mondzeichen. Toggle "unbekannt" falls nicht verfügbar |
| **Geburtsort** | 🟡 | Stadt, Land | `Porto, Portugal` | Für Astrologie-Berechnung. Format: City, Country |

### Block: Namensänderung (z.B. nach Heirat)

| Feld | Pflicht | Format | Anzeige |
|---|---|---|---|
| **Toggle "Person hat den Namen geändert"** | 🟢 | Bool | Switch/Checkbox |
| **Neuer Vorname** | conditional | Text | erscheint nur wenn Toggle aktiv |
| **Neuer Nachname** | conditional | Text | erscheint nur wenn Toggle aktiv |

**Wichtig:** Der Geburtsname oben ist die **numerologische Wurzel**. Der "Neue Name" wird als zusätzliche Energie-Schicht analysiert (Vergleich vorher/nachher).

---

## 4. WANN WELCHE PERSONEN ERFASSEN

### Konstellation: Einzelperson
- **Person 1** (Hauptperson) — alle Felder oben

### Konstellation: Paar
- **Person 1** (Hauptperson) — alle Felder oben
- **Person 2** (Partner:in) — alle Felder oben
- **Block "Gemeinsame Daten"** (siehe unten)

### Konstellation: Familie
- **Person 1** + **Person 2** — beide Eltern
- **Block "Gemeinsame Daten"**
- **Kinder** — 1 bis 5 Kinder, jedes mit eigenen Person-Feldern
- UI: "+ Weiteres Kind hinzufügen" Button (max 5)

### Konstellation: Alleinerziehende:r mit Kind/ern
- **Person 1** (Elternteil)
- **Kinder** — 1 bis 5 Kinder

---

## 5. BLOCK: GEMEINSAME DATEN (nur Paar + Familie)

Alle **🟢 OPTIONAL** — bringen aber numerologische Tiefe zu Beziehungsanalyse:

| Feld | Format | Beispiel | Bedeutung |
|---|---|---|---|
| **Kennenlern-Datum** | TT.MM.JJJJ | `30.10.2012` | Numerologischer Energiepunkt der Begegnung |
| **Hochzeits-/Verbindungs-Datum** | TT.MM.JJJJ | `01.06.2018` | Code der formalen Verbindung |

---

## 6. BLOCK: AHNENLINIE (optional, alle Konstellationen)

**Toggle "Ahnenlinie einbeziehen"** schaltet folgendes frei. Bringt Familiensystem-Themen in die Analyse.

### Mutter (alle Felder 🟢 optional)

| Feld | Format | Beispiel |
|---|---|---|
| Vorname (Taufname) | Text | `Maria` |
| Geburtsname (Mädchenname) | Text | `Silva` |
| Geburtsdatum | TT.MM.JJJJ | `15.04.1955` |
| Geburtsort | Stadt, Land | `Lugano, Schweiz` |

### Vater (alle Felder 🟢 optional)

| Feld | Format | Beispiel |
|---|---|---|
| Vorname (Taufname) | Text | `Giovanni` |
| Nachname bei Geburt | Text | `Rossi` |
| Geburtsdatum | TT.MM.JJJJ | `22.08.1952` |
| Geburtsort | Stadt, Land | `Como, Italien` |

**Hinweis im Formular:** "Was nicht bekannt ist, leer lassen — wir machen daraus nichts."

---

## 7. ANALYSE-EINSTELLUNGEN (Meta)

Diese Felder konfigurieren die Analyse-Ausgabe:

### Sprache der Analyse 🔴

| Wert | Anzeige |
|---|---|
| `de` | Deutsch |
| `en` | English |
| `pt` | Português |

UI-Empfehlung: Pills/Tabs.
**Wichtig:** Die Webseite bleibt Deutsch — nur die generierte Analyse + Word-Dokument folgen der gewählten Sprache.

### Detailtiefe 🔴

| Wert | Anzeige | Charakter |
|---|---|---|
| 5 | Kompakt | ca. 1-2 Min Generation, kurze Übersicht |
| 15 (Default) | Mittel | ca. 3-5 Min, ideal für die meisten Klient:innen |
| 25 | Tief | ca. 5-8 Min, jede Sektion ausführlich |
| 40 | Profi-Maximum | ca. 8-12 Min, maximale Tiefe |

UI-Empfehlung: Slider 5-40 mit 5er-Schritten + Live-Anzeige des Werts.
**Bei Paar/Familie:** Empfehlung "25-30" anzeigen weil mehr Inhalt pro Person nötig.

### Fokus-Thema 🔴

Welcher Schwerpunkt soll die Analyse besonders vertiefen:

| Wert | Anzeige | Beschreibung |
|---|---|---|
| `overview` | Das grosse Gesamtbild | Alle Dimensionen — vollständige Tiefenanalyse |
| `relationship` | Beziehungsdynamik | Verbindung, Resonanz & Partnerschaft |
| `personal` | Persönlicher Lebensweg | Seele, Bestimmung & innere Kraft |
| `children_focus` | Die Kinder | Seelenbild & Energien der Kinder |
| `future` | Zukunft & Jahresprognosen | Energien & Pinnacles für die kommenden Jahre |

UI-Empfehlung: 5 Karten zur Auswahl.

---

## 8. EMPFOHLENER FORMULAR-FLOW (UI-Reihenfolge)

```
1. Sprach-Wahl (oben fix als Pills)
   ↓
2. Konstellation wählen
   ↓
3. Person 1 (Hauptperson)
   ↓
4. [nur bei Paar/Familie] Person 2 (Partner:in)
   ↓
5. [nur bei Paar/Familie] Gemeinsame Daten (Kennenlernen + Hochzeit)
   ↓
6. [nur bei Familie/Solo+Kinder] Kinder (1-5)
   ↓
7. [optional, alle Konstellationen] Ahnenlinie aktivieren? → Mutter/Vater-Daten
   ↓
8. Detailtiefe-Slider (5-40)
   ↓
9. Fokus-Thema wählen
   ↓
10. "Analyse generieren ✦" Button
```

---

## 9. VALIDIERUNGS-REGELN

### Pflicht für Generierung

Mindestens **Person 1** vollständig (Vorname + Nachname + Geburtsdatum). Alles andere kann technisch leer sein, aber:

- Bei `pair` / `family`: auch Person 2 (Vorname + Nachname + Geburtsdatum) erforderlich
- Bei `family` / `solo_children`: mindestens 1 Kind (Vorname + Geburtsdatum)
- Wenn Geburtszeit fehlt → Astrologie weniger präzise, aber funktioniert (Toggle "unbekannt" anbieten)
- Wenn Geburtsort fehlt → Astrologie nutzt Default, weniger präzise

### Format-Validierung

| Feld | Regel |
|---|---|
| Geburtsdatum | Regex `^\d{1,2}\.\d{1,2}\.\d{4}$` — Jahr 1900-2100 plausibel |
| Geburtszeit | Regex `^\d{1,2}:\d{2}$` — 00:00 bis 23:59 |
| Geburtsort | Freitext mindestens 2 Zeichen, idealerweise mit Komma "Stadt, Land" |
| Vorname/Nachname | Buchstaben + Bindestriche + Leerzeichen + Umlaute, min 2 Zeichen |

### Fehler-Hinweise

- Inline unter dem Feld, in dezenter Farbe (nicht alarmierend rot)
- "Bitte vollständig ausfüllen" wenn Pflichtfeld leer beim Submit
- "Format: TT.MM.JJJJ" als Placeholder + Hilfetext

---

## 10. DATENSTRUKTUR (JSON-Schema für die API)

So sollte das Backend die Daten erhalten:

```json
{
  "constellation": "family",
  "language": "de",
  "depth": 15,
  "focus": "overview",
  
  "person1": {
    "firstName": "Susana Patricia",
    "lastName": "Costa Campelo",
    "birthDate": "19.09.1980",
    "birthTime": "23:20",
    "birthPlace": "Porto, Portugal",
    "nameChanged": true,
    "newFirstName": "Susana Patricia",
    "newLastName": "Costa Campelo Frehner"
  },
  
  "person2": {
    "firstName": "Thomas",
    "lastName": "Frehner",
    "birthDate": "21.07.1979",
    "birthTime": "12:46",
    "birthPlace": "Chur, Schweiz",
    "nameChanged": false
  },
  
  "couple": {
    "meetingDate": "30.10.2012",
    "weddingDate": "01.06.2018"
  },
  
  "children": [
    {
      "firstName": "Nayeli",
      "lastName": "Frehner",
      "birthDate": "17.05.2012",
      "birthTime": "03:15",
      "birthPlace": "Grabs, Schweiz"
    },
    {
      "firstName": "Sky Leah",
      "lastName": "Frehner",
      "birthDate": "06.08.2017",
      "birthTime": "05:25",
      "birthPlace": "Chur, Schweiz"
    }
  ],
  
  "ancestry": {
    "include": false,
    "mother": {
      "firstName": "",
      "birthName": "",
      "birthDate": "",
      "birthPlace": ""
    },
    "father": {
      "firstName": "",
      "lastName": "",
      "birthDate": "",
      "birthPlace": ""
    }
  }
}
```

---

## 11. UX-EMPFEHLUNGEN

### Fortschrittsanzeige
Sichtbare Schritt-Anzeige oben: "Schritt 3 von 7 · Klient:in"

### Speichern + Bearbeiten
- Felder im Browser-State halten falls Susana zurück navigiert
- Optional: Local Storage damit bei Browser-Refresh nicht alles weg ist
- Optional: "Klient:innen-Profile" speichern für wiederkehrende Klient:innen

### Hilfe-Texte
Kleine Info-Icons (i) neben kniffligen Feldern mit Tooltip:
- **Geburtsname:** "Der vollständige Familienname bei Geburt, vor jeglicher Änderung (z.B. vor Heirat)"
- **Taufname:** "Alle Vornamen wie auf der Geburtsurkunde"
- **Ahnenlinie:** "Daten der Eltern bringen Familiensystem-Themen in die Analyse"

### Geburtsort-Komfort
- Idealerweise mit Autocomplete (Nominatim-API, OpenStreetMap kostenlos)
- Sonst: einfaches Freitext-Feld mit "Stadt, Land"-Hinweis

### Geburtszeit-Komfort
- Format `HH:MM` mit Helper
- Separater Toggle "Zeit unbekannt" daneben — wenn aktiv, Feld ausgegraut

---

## 12. ZUSAMMENFASSUNG: ALLE FELDER AUF EINEN BLICK

```
☐ Konstellation                      🔴 [solo|pair|family|solo_children]
☐ Sprache                            🔴 [de|en|pt]
☐ Detailtiefe                        🔴 [5-40]
☐ Fokus                              🔴 [overview|relationship|personal|children_focus|future]

PERSON 1 (immer)
  ☐ Vorname (Taufname)               🔴
  ☐ Nachname (Geburtsname)           🔴
  ☐ Geburtsdatum                     🔴
  ☐ Geburtszeit                      🟡
  ☐ Geburtsort                       🟡
  ☐ Toggle Namensänderung            🟢
    ☐ Neuer Vorname                  conditional
    ☐ Neuer Nachname                 conditional

PERSON 2 (nur pair/family)
  ☐ ... (identisch zu Person 1)

GEMEINSAME DATEN (nur pair/family)
  ☐ Kennenlern-Datum                 🟢
  ☐ Hochzeits-/Verbindungs-Datum     🟢

KINDER (nur family/solo_children, 1-5 Kinder)
  ☐ Kind 1 ... Kind 5                pro Kind identisch zu Person 1

AHNENLINIE (optional, alle Konstellationen)
  ☐ Toggle "Ahnenlinie einbeziehen"  🟢
  Mutter:
    ☐ Vorname (Taufname)             🟢
    ☐ Geburtsname (Mädchenname)      🟢
    ☐ Geburtsdatum                   🟢
    ☐ Geburtsort                     🟢
  Vater:
    ☐ Vorname (Taufname)             🟢
    ☐ Nachname bei Geburt            🟢
    ☐ Geburtsdatum                   🟢
    ☐ Geburtsort                     🟢
```

---

**Felder gesamt:**

| Konstellation | Min. Pflichtfelder | Max. mögliche Felder |
|---|---|---|
| Einzelperson | 7 (3 Daten + 3 Person + 1 Konstellation) | 20 (mit Namensänderung + Ahnenlinie) |
| Paar | 11 | 32 |
| Familie | 14+ (je nach Kinderzahl) | 60+ (mit 5 Kindern + Ahnen) |
| Alleinerziehend | 10+ | 45+ |

---

**Maintainer:** Mauro Casellini
**Original-App-Referenz:** github.com/maurocasellini/familien-code-v2 (`pages/index.js`)
