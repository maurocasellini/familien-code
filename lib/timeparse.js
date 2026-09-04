// lib/timeparse.js
// Zentrale, tolerante Normalisierung der Geburtszeit-Eingabe.
//
// HINTERGRUND (Bug 04.09.2026, Fall Brigitte):
// Das Eingabefeld ist ein freies Textfeld. Getippt wurde «05.40» (Punkt statt
// Doppelpunkt). pages/api/astrology.js akzeptierte nur /^\d{1,2}:\d{2}/, hat die
// Zeit also VERWORFEN und still auf 12:00 Uhr mittags zurueckgefallen. Folge:
// Mond stand im Report auf Schuetze 1°54' statt korrekt Skorpion 28°07' (ein
// ganzes Zeichen daneben, weil der Mond ~0.6°/h laeuft), und der Aszendent
// wurde gar nicht berechnet (timeKnown === false). Alle langsamen Planeten
// blieben unauffaellig richtig, deshalb fiel es nur am Mond auf.
//
// Diese Funktion akzeptiert alles, was ein Mensch realistisch tippt, und liefert
// immer kanonisches «HH:MM» zurueck, oder null wenn es wirklich keine Zeit ist.

const UNKNOWN = ['unbekannt', 'unknown', 'desconhecido', 'desconhecida', 'keine', 'k.a.', 'ka', '-', '--', '?', 'n/a'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Normalisiert eine Geburtszeit-Eingabe.
 * Akzeptiert u.a.: "05:40", "5:40", "05.40", "5.40", "05,40", "0540", "540",
 *                  "5h40", "05 40", "5:40 Uhr", "5:40 PM", "05:40:00", "5"
 * @param {*} raw
 * @returns {{hour:number, minute:number, formatted:string}|null}
 */
export function normalizeTime(raw) {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (UNKNOWN.includes(s.toLowerCase())) return null;

  // AM/PM erkennen und herausloesen
  let ampm = null;
  const ap = s.match(/\b([ap])\.?\s*m\.?\b/i);
  if (ap) {
    ampm = ap[1].toLowerCase();
    s = s.replace(ap[0], ' ');
  }

  // "Uhr" / "horas" / "hrs" entfernen
  s = s.replace(/\b(uhr|horas?|hrs?|hours?)\b/gi, ' ').trim();

  let hour = null;
  let minute = null;
  let m;

  if ((m = s.match(/^(\d{1,2})\s*[:.,;hH]\s*(\d{1,2})(?:\s*[:.,]\s*\d{1,2})?$/))) {
    // 05:40 · 5.40 · 05,40 · 5h40 · 05:40:00
    hour = parseInt(m[1], 10);
    minute = parseInt(m[2], 10);
  } else if ((m = s.match(/^(\d{1,2})\s+(\d{2})$/))) {
    // "05 40"
    hour = parseInt(m[1], 10);
    minute = parseInt(m[2], 10);
  } else if ((m = s.match(/^(\d{3,4})$/))) {
    // "0540" · "540"
    const d = m[1].padStart(4, '0');
    hour = parseInt(d.slice(0, 2), 10);
    minute = parseInt(d.slice(2), 10);
  } else if ((m = s.match(/^(\d{1,2})$/))) {
    // "5" -> 05:00
    hour = parseInt(m[1], 10);
    minute = 0;
  } else {
    return null;
  }

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  if (ampm === 'p' && hour < 12) hour += 12;
  if (ampm === 'a' && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute, formatted: `${pad2(hour)}:${pad2(minute)}` };
}

/**
 * Bequemer Wrapper: gibt "HH:MM" zurueck, oder den Fallback wenn nicht parsebar.
 */
export function normalizeTimeString(raw, fallback = 'unbekannt') {
  const t = normalizeTime(raw);
  return t ? t.formatted : fallback;
}

export default normalizeTime;
