// pages/api/astrology.js
// Profi-Astrologie via swisseph-wasm (Moshier-Algorithmus, WebAssembly, keine
// nativen Bindings und keine Ephemeriden-Dateien noetig). Laeuft identisch lokal
// und auf Vercel.
//
// ZEITZONEN-FIX: Die Umrechnung der lokalen Geburtszeit in Weltzeit (UT) erfolgt
// ueber die geografische Zeitzone des Geburtsorts (tz-lookup) und luxon, inklusive
// historischer Sommerzeit-Regeln. Fehlen die Pakete, faellt der Code auf die alte
// CET-Naeherung zurueck.
//
// Hinweis: Astrologie nutzt den MITTLEREN Knoten (SE_MEAN_NODE), wie zuvor.
// (Human Design nutzt dagegen den WAHREN Knoten.)

import { getEphemeris, SE } from '../../lib/ephemeris';
import { geocodePlace } from '../../lib/geocode';
import { normalizeTime } from '../../lib/timeparse';

export const config = { maxDuration: 30 };

const FLAG = SE.FLG_MOSEPH;

const SIGNS = ['Widder', 'Stier', 'Zwillinge', 'Krebs', 'Loewe', 'Jungfrau', 'Waage', 'Skorpion', 'Schuetze', 'Steinbock', 'Wassermann', 'Fische'];

function signFromDegree(deg) {
  while (deg < 0) deg += 360;
  deg = deg % 360;
  const sign = Math.floor(deg / 30);
  const inSign = deg % 30;
  return {
    sign: SIGNS[sign],
    degree: Math.floor(inSign),
    minute: Math.round((inSign % 1) * 60),
    longitude: deg,
  };
}

function fmtPos(p) {
  return `${p.sign} ${p.degree}°${String(p.minute).padStart(2, '0')}'`;
}

// Lokale Geburtszeit -> UT, korrekt ueber Zeitzone des Geburtsorts inkl. historischer DST.
function toUniversalTime(year, month, day, hour, minute, lat, lon, zoneHint) {
  const hourDecimal = hour + minute / 60;
  try {
    const tzlookup = require('tz-lookup');
    const { DateTime } = require('luxon');
    const tzName = zoneHint || tzlookup(lat, lon);
    const local = DateTime.fromObject(
      { year, month, day, hour, minute },
      { zone: tzName }
    );
    if (!local.isValid) throw new Error('luxon: ' + (local.invalidReason || 'invalid datetime'));
    const ut = local.toUTC();
    return {
      year: ut.year,
      month: ut.month,
      day: ut.day,
      utHour: ut.hour + ut.minute / 60 + ut.second / 3600,
      tzName,
      offsetHours: local.offset / 60,
      method: 'tz-lookup+luxon',
    };
  } catch (err) {
    let utHour = hourDecimal - 1;
    let d = day, m = month, y = year;
    if (utHour < 0) { utHour += 24; }
    return { year: y, month: m, day: d, utHour, tzName: null, offsetHours: 1, method: 'cet-fallback' };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { birthDate, birthTime, birthPlace } = req.body || {};
  if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

  // Parse "TT.MM.JJJJ"
  const dp = birthDate.split('.');
  if (dp.length < 3) return res.status(400).json({ error: 'Invalid birthDate format (need TT.MM.JJJJ)' });
  const day = parseInt(dp[0], 10);
  const month = parseInt(dp[1], 10);
  const year = parseInt(dp[2], 10);
  if (!day || !month || !year) return res.status(400).json({ error: 'Invalid date numbers' });

  // Parse time (tolerant: 05:40, 05.40, 0540, 5h40, 5:40 PM ...), sonst Mittag als Notbehelf.
  // WICHTIG: timeRejected unterscheidet "keine Zeit angegeben" von "Zeit angegeben, aber unlesbar".
  let hour = 12, minute = 0;
  let timeKnown = false;
  let timeRejected = null;
  const rawTime = (birthTime === null || birthTime === undefined) ? '' : String(birthTime).trim();
  const parsedTime = normalizeTime(rawTime);
  if (parsedTime) {
    hour = parsedTime.hour;
    minute = parsedTime.minute;
    timeKnown = true;
  } else if (rawTime && !/^(unbekannt|unknown|desconhecid[ao])$/i.test(rawTime)) {
    timeRejected = rawTime;
  }

  // Ephemeride laden (WASM, keine native Kompilierung noetig)
  let eph;
  try {
    eph = await getEphemeris();
  } catch (err) {
    return res.status(200).json({
      available: false,
      reason: 'Ephemeride (swisseph-wasm) konnte nicht geladen werden: ' + (err.message || String(err)),
    });
  }

  // Geocode place if given
  let coords = null;
  if (birthPlace) {
    coords = await geocodePlace(birthPlace);
  }
  const lat = coords ? coords.lat : 46.8;
  const lon = coords ? coords.lon : 8.2;

  const utc = toUniversalTime(year, month, day, hour, minute, lat, lon, coords && coords.timezone);
  const julDay = eph.julday(utc.year, utc.month, utc.day, utc.utHour);

  // Synchroner Positions-Helfer
  function pos(body) {
    try {
      const r = eph.calc(julDay, body, FLAG);
      if (r && typeof r.longitude === 'number') return signFromDegree(r.longitude);
    } catch (e) { /* Body nicht verfuegbar (z.B. Chiron im Moshier-Modus) */ }
    return null;
  }

  try {
    const sun = pos(SE.SUN);
    const moon = pos(SE.MOON);
    const mercury = pos(SE.MERCURY);
    const venus = pos(SE.VENUS);
    const mars = pos(SE.MARS);
    const jupiter = pos(SE.JUPITER);
    const saturn = pos(SE.SATURN);
    const uranus = pos(SE.URANUS);
    const neptune = pos(SE.NEPTUNE);
    const pluto = pos(SE.PLUTO);
    const meanNode = pos(SE.MEAN_NODE);
    const chiron = pos(SE.CHIRON); // im Moshier-Modus ggf. null

    // Haeuser nur wenn Zeit UND Ort bekannt
    let houses = null;
    if (timeKnown && coords) {
      const h = eph.houses(julDay, lat, lon, 'P');
      houses = { ascendant: signFromDegree(h.ascendant), mc: signFromDegree(h.mc) };
    }

    // South Node = gegenueber dem North (Mean) Node
    const southNodeLon = (meanNode.longitude + 180) % 360;
    const southNode = signFromDegree(southNodeLon);

    const tzNote = utc.method === 'tz-lookup+luxon'
      ? `Zeitzone ${utc.tzName} (UT-Offset ${utc.offsetHours >= 0 ? '+' : ''}${utc.offsetHours}h, historische Sommerzeit beruecksichtigt).`
      : 'Zeitzonen-Naeherung CET (minus 1h) verwendet, da tz-lookup/luxon nicht verfuegbar.';

    return res.status(200).json({
      available: true,
      timeKnown,
      timeUsed: timeKnown ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : '12:00 (Notbehelf, Geburtszeit fehlt)',
      timeRejected,
      coordsKnown: !!coords,
      coords: coords ? { lat: coords.lat, lon: coords.lon, display: coords.display } : null,
      timezone: { name: utc.tzName, offsetHours: utc.offsetHours, method: utc.method },
      planets: {
        sun: { ...sun, formatted: fmtPos(sun) },
        moon: { ...moon, formatted: fmtPos(moon), uncertain: !timeKnown },
        mercury: { ...mercury, formatted: fmtPos(mercury) },
        venus: { ...venus, formatted: fmtPos(venus) },
        mars: { ...mars, formatted: fmtPos(mars) },
        jupiter: { ...jupiter, formatted: fmtPos(jupiter) },
        saturn: { ...saturn, formatted: fmtPos(saturn) },
        uranus: { ...uranus, formatted: fmtPos(uranus) },
        neptune: { ...neptune, formatted: fmtPos(neptune) },
        pluto: { ...pluto, formatted: fmtPos(pluto) },
        chiron: chiron ? { ...chiron, formatted: fmtPos(chiron) } : null,
      },
      nodes: {
        north: { ...meanNode, formatted: fmtPos(meanNode) },
        south: { ...southNode, formatted: fmtPos(southNode) },
      },
      ascendant: houses?.ascendant ? { ...houses.ascendant, formatted: fmtPos(houses.ascendant) } : null,
      mc: houses?.mc ? { ...houses.mc, formatted: fmtPos(houses.mc) } : null,
      note: (timeRejected
              ? `ACHTUNG: Die eingegebene Geburtszeit «${timeRejected}» konnte nicht gelesen werden (erwartet HH:MM). Es wurde ersatzweise 12:00 Uhr gerechnet. Aszendent nicht berechenbar, und die MONDPOSITION IST UNZUVERLAESSIG (der Mond laeuft ca. 13°/Tag, das Zeichen kann falsch sein). `
              : (!timeKnown
                  ? 'Geburtszeit unbekannt — es wurde ersatzweise 12:00 Uhr gerechnet. Aszendent nicht berechenbar, und die MONDPOSITION IST UNZUVERLAESSIG (ca. 13°/Tag, das Zeichen kann falsch sein). '
                  : (!coords ? 'Geburtsort nicht eindeutig — Aszendent nicht berechenbar. ' : ''))) + tzNote,
    });
  } catch (err) {
    console.error('Astro calc error:', err);
    return res.status(500).json({ error: err.message || 'Astrology calculation failed' });
  }
}
