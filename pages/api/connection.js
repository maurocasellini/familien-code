// ───────────────────────────────────────────────────────────────────────────
//  /api/connection  – Human-Design Connection Chart (Composite) fuer ZWEI Personen.
//
//  Berechnet pro Person den vollen BodyGraph mit exakt derselben Pipeline wie
//  /api/humandesign (Moshier ueber swisseph-wasm, WAHRER Knoten, tz-lookup + luxon,
//  88-Grad-Design), und legt darueber die Verbindungs-Analyse aus
//  lib/connectionChart.js: elektromagnetisch / gefaehrtenschaft / dominanz /
//  kompromiss, verbundene Zentren und im Paar NEU entstehende Zentren.
//
//  Knoten-Konsistenz ist automatisch: beide Charts kommen aus derselben
//  Berechnung, es kann nichts auseinanderdriften.
// ───────────────────────────────────────────────────────────────────────────
import tzlookup from 'tz-lookup';
import { DateTime } from 'luxon';
import { buildChart, norm360 } from '../../lib/humandesign';
import { connectionChart } from '../../lib/connectionChart';
import { getEphemeris, SE, MOSEPH_SPEED } from '../../lib/ephemeris';

export const config = { maxDuration: 30 };

const BODIES = {
  sun: SE.SUN, moon: SE.MOON, mercury: SE.MERCURY, venus: SE.VENUS,
  mars: SE.MARS, jupiter: SE.JUPITER, saturn: SE.SATURN,
  uranus: SE.URANUS, neptune: SE.NEPTUNE, pluto: SE.PLUTO,
  northNode: SE.TRUE_NODE,   // wie /api/humandesign: WAHRER Knoten
};

function lon(eph, jd, body) {
  const r = eph.calc(jd, body, MOSEPH_SPEED);
  if (!r || typeof r.longitude !== 'number') throw new Error('Ephemeriden-Berechnung fehlgeschlagen für Body ' + body);
  return norm360(r.longitude);
}

function activationsAt(eph, jd) {
  const out = {};
  for (const [name, body] of Object.entries(BODIES)) out[name] = lon(eph, jd, body);
  out.earth = norm360(out.sun + 180);
  out.southNode = norm360(out.northNode + 180);
  return out;
}

function findDesignJd(eph, jdBirth) {
  const sunBirth = lon(eph, jdBirth, SE.SUN);
  const target = norm360(sunBirth - 88);
  let jd = jdBirth - 88.0 / 0.9856;
  for (let i = 0; i < 12; i++) {
    const r = eph.calc(jd, SE.SUN, MOSEPH_SPEED);
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

function jdToDate(eph, jd) {
  const o = eph.revjul(jd, SE.GREG_CAL);
  const hh = Math.floor(o.hour); const mm = Math.floor((o.hour - hh) * 60);
  const p = (n) => String(n).padStart(2, '0');
  return `${o.year}-${p(o.month)}-${p(o.day)}T${p(hh)}:${p(mm)}Z`;
}

// Vollen BodyGraph fuer EINE Person berechnen (gibt {available, meta, chart} zurueck).
async function computeOne(eph, { birthDate, birthTime, birthPlace, lat, lon: lonIn }) {
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

  const jdBirth = eph.julday(utc.year, utc.month, utc.day, utc.hour + utc.minute / 60 + utc.second / 3600);
  const jdDesign = findDesignJd(eph, jdBirth);
  const chart = buildChart({ personality: activationsAt(eph, jdBirth), design: activationsAt(eph, jdDesign) });

  return {
    available: true,
    meta: {
      zone, birthUtc: utc.toISO(), designUtc: jdToDate(eph, jdDesign),
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

    const eph = await getEphemeris();
    const [a, b] = await Promise.all([computeOne(eph, personA), computeOne(eph, personB)]);
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
