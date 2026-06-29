// ───────────────────────────────────────────────────────────────────────────
//  /api/connection  – Human-Design Connection Chart (Composite) fuer ZWEI Personen.
//
//  Berechnet pro Person den vollen BodyGraph mit exakt derselben Pipeline wie
//  /api/humandesign (Moshier, WAHRER Knoten, tz-lookup + luxon, 88-Grad-Design),
//  und legt darueber die Verbindungs-Analyse aus lib/connectionChart.js:
//  elektromagnetisch / gefaehrtenschaft / dominanz / kompromiss, verbundene
//  Zentren und im Paar NEU entstehende Zentren.
//
//  Knoten-Konsistenz ist automatisch: beide Charts kommen aus derselben
//  Berechnung, es kann nichts auseinanderdriften.
// ───────────────────────────────────────────────────────────────────────────
import swe from 'swisseph';
import tzlookup from 'tz-lookup';
import { DateTime } from 'luxon';
import { buildChart, norm360 } from '../../lib/humandesign';
import { connectionChart } from '../../lib/connectionChart';

export const config = { maxDuration: 30 };

const FLAG = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED;
const BODIES = {
  sun: swe.SE_SUN, moon: swe.SE_MOON, mercury: swe.SE_MERCURY, venus: swe.SE_VENUS,
  mars: swe.SE_MARS, jupiter: swe.SE_JUPITER, saturn: swe.SE_SATURN,
  uranus: swe.SE_URANUS, neptune: swe.SE_NEPTUNE, pluto: swe.SE_PLUTO,
  northNode: swe.SE_TRUE_NODE,   // wie /api/humandesign: WAHRER Knoten
};

function lon(jd, body) {
  const r = swe.swe_calc_ut(jd, body, FLAG);
  if (!r || typeof r.longitude !== 'number') throw new Error('swe_calc_ut fehlgeschlagen für Body ' + body);
  return norm360(r.longitude);
}

function activationsAt(jd) {
  const out = {};
  for (const [name, body] of Object.entries(BODIES)) out[name] = lon(jd, body);
  out.earth = norm360(out.sun + 180);
  out.southNode = norm360(out.northNode + 180);
  return out;
}

function findDesignJd(jdBirth) {
  const sunBirth = lon(jdBirth, swe.SE_SUN);
  const target = norm360(sunBirth - 88);
  let jd = jdBirth - 88.0 / 0.9856;
  for (let i = 0; i < 12; i++) {
    const r = swe.swe_calc_ut(jd, swe.SE_SUN, FLAG);
    let diff = norm360(r.longitude - target);
    if (diff > 180) diff -= 360;
    if (Math.abs(diff) < 1e-7) break;
    const speed = r.longitudeSpeed || 0.9856;
    jd -= diff / speed;
  }
  return jd;
}

async function geocode(place) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=de&format=json`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const hit = j && j.results && j.results[0];
  if (!hit) return null;
  return { lat: hit.latitude, lon: hit.longitude, display: `${hit.name}${hit.country ? ', ' + hit.country : ''}` };
}

function jdToDate(jd) {
  const o = swe.swe_revjul(jd, swe.SE_GREG_CAL);
  const hh = Math.floor(o.hour); const mm = Math.floor((o.hour - hh) * 60);
  const p = (n) => String(n).padStart(2, '0');
  return `${o.year}-${p(o.month)}-${p(o.day)}T${p(hh)}:${p(mm)}Z`;
}

// Vollen BodyGraph fuer EINE Person berechnen (gibt {available, meta, chart} zurueck).
async function computeOne({ birthDate, birthTime, birthPlace, lat, lon: lonIn }) {
  if (!birthDate || !birthTime || birthTime === 'unbekannt') {
    return { available: false, reason: 'Geburtsdatum UND exakte Geburtszeit noetig.' };
  }
  let coords = null;
  if (typeof lat === 'number' && typeof lonIn === 'number') coords = { lat, lon: lonIn, display: birthPlace || '' };
  else if (birthPlace) coords = await geocode(birthPlace);
  if (!coords) return { available: false, reason: 'Geburtsort konnte nicht geokodiert werden — Zeitzone unbestimmt.' };

  const zone = tzlookup(coords.lat, coords.lon);
  let Y, M, D;
  if (birthDate.includes('.')) { const [d, m, y] = birthDate.split('.').map(Number); Y = y; M = m; D = d; }
  else { const [y, m, d] = birthDate.split('-').map(Number); Y = y; M = m; D = d; }
  const [h, mi] = birthTime.split(':').map(Number);
  const local = DateTime.fromObject({ year: Y, month: M, day: D, hour: h, minute: mi || 0 }, { zone });
  if (!local.isValid) return { available: false, reason: 'Ungueltige Datums-/Zeitangabe: ' + local.invalidReason };
  const utc = local.toUTC();

  const jdBirth = swe.swe_julday(utc.year, utc.month, utc.day, utc.hour + utc.minute / 60 + utc.second / 3600, swe.SE_GREG_CAL);
  const jdDesign = findDesignJd(jdBirth);
  const chart = buildChart({ personality: activationsAt(jdBirth), design: activationsAt(jdDesign) });

  return {
    available: true,
    meta: {
      zone, birthUtc: utc.toISO(), designUtc: jdToDate(jdDesign),
      coords: { lat: +coords.lat.toFixed(4), lon: +coords.lon.toFixed(4), display: coords.display },
      node: 'true', ephemeris: 'Moshier',
    },
    chart,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { personA, personB } = req.body || {};
    if (!personA || !personB) {
      return res.status(400).json({ available: false, reason: 'Es braucht personA und personB mit Geburtsdaten.' });
    }

    const [a, b] = await Promise.all([computeOne(personA), computeOne(personB)]);
    if (!a.available) return res.status(200).json({ available: false, reason: `Person A: ${a.reason}` });
    if (!b.available) return res.status(200).json({ available: false, reason: `Person B: ${b.reason}` });

    const labelA = (personA.firstName || 'Person A');
    const labelB = (personB.firstName || 'Person B');

    // Connection-Engine: Gate-Listen der beiden Charts ueberlagern.
    const connection = connectionChart(a.chart.gates, b.chart.gates, { labelA, labelB });

    return res.status(200).json({
      available: true,
      a: { name: labelA, meta: a.meta, ...a.chart },
      b: { name: labelB, meta: b.meta, ...b.chart },
      connection,
    });
  } catch (err) {
    return res.status(200).json({ available: false, reason: 'Berechnung fehlgeschlagen: ' + (err.message || String(err)) });
  }
}
