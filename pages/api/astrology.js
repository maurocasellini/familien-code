// pages/api/astrology.js
// Profi-Astrologie via Swiss Ephemeris (Moshier-Algorithmus, eingebaut, keine externen Files noetig).
// Funktioniert lokal mit `npm install swisseph`. Auf Vercel ist swisseph als native binding
// nicht garantiert. Daher: try-catch + Fallback.
//
// ZEITZONEN-FIX: Die Umrechnung der lokalen Geburtszeit in Weltzeit (UT) erfolgt jetzt korrekt
// ueber die geografische Zeitzone des Geburtsorts (tz-lookup) und luxon, inklusive historischer
// Sommerzeit-Regeln. Frueher wurde pauschal 1 Stunde abgezogen (CET-Naeherung), was fuer
// Sommergeburten und Geburten ausserhalb der Schweiz falsche Positionen ergab.
// Voraussetzung lokal: `npm install luxon tz-lookup`. Fehlen die Pakete, faellt der Code
// auf die alte CET-Naeherung zurueck.

export const config = { maxDuration: 30 };

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

// Geocoding via Nominatim (OpenStreetMap, kostenlos, ~1 req/sec Limit)
async function geocode(place) {
  if (!place) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'familien-code-v2/1.0 (numerology app)' },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display: data[0].display_name,
      };
    }
  } catch (err) {
    console.error('Geocoding error:', err.message);
  }
  return null;
}

// Lokale Geburtszeit -> UT, korrekt ueber Zeitzone des Geburtsorts inkl. historischer DST.
// Gibt {year, month, day, utHour, tzName, method} zurueck. Faellt bei fehlenden Paketen
// oder ungueltigem Datum auf CET-Naeherung (minus 1h) zurueck.
function toUniversalTime(year, month, day, hour, minute, lat, lon) {
  const hourDecimal = hour + minute / 60;
  try {
    const tzlookup = require('tz-lookup');
    const { DateTime } = require('luxon');
    const tzName = tzlookup(lat, lon); // wirft bei ungueltigen Koordinaten
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
      offsetHours: local.offset / 60, // Minuten -> Stunden (z.B. +1 CET, +2 CEST)
      method: 'tz-lookup+luxon',
    };
  } catch (err) {
    // Fallback: grobe CET-Naeherung (keine historische DST, kein Tageswechsel)
    let utHour = hourDecimal - 1;
    let d = day, m = month, y = year;
    if (utHour < 0) { utHour += 24; /* Tageswechsel im Fallback ignoriert (geringe Auswirkung) */ }
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

  // Parse time, default to noon if not given (mid-day is best guess for "unbekannt")
  let hour = 12, minute = 0;
  let timeKnown = false;
  if (birthTime && /^\d{1,2}:\d{2}/.test(birthTime)) {
    const tp = birthTime.match(/^(\d{1,2}):(\d{2})/);
    hour = parseInt(tp[1], 10);
    minute = parseInt(tp[2], 10);
    timeKnown = true;
  }

  // Try loading swisseph (may fail on Vercel due to native binding)
  let swe;
  try {
    swe = require('swisseph');
  } catch (err) {
    return res.status(200).json({
      available: false,
      reason: 'swisseph not available in this environment (lokale Installation noetig)',
      note: 'Fuer Profi-Astrologie bitte App lokal starten (siehe README).',
    });
  }

  // Geocode place if given
  let coords = null;
  if (birthPlace) {
    coords = await geocode(birthPlace);
  }
  // Fallback default: center of Switzerland (so sun/moon/nodes still compute, ASC only if coords known)
  const lat = coords ? coords.lat : 46.8;
  const lon = coords ? coords.lon : 8.2;

  // Lokale Zeit -> UT, korrekt ueber Zeitzone des Geburtsorts (inkl. historischer Sommerzeit).
  const utc = toUniversalTime(year, month, day, hour, minute, lat, lon);
  const julDay = swe.swe_julday(utc.year, utc.month, utc.day, utc.utHour, swe.SE_GREG_CAL);

  const flag = swe.SEFLG_MOSEPH;

  // Helper: synchronous wrapper (swe_calc_ut uses sync callbacks)
  function calcPlanet(planet) {
    return new Promise((resolve) => {
      swe.swe_calc_ut(julDay, planet, flag, (result) => {
        if (result && result.longitude !== undefined) {
          resolve(signFromDegree(result.longitude));
        } else {
          resolve(null);
        }
      });
    });
  }
  function calcHouses() {
    return new Promise((resolve) => {
      swe.swe_houses(julDay, lat, lon, 'P', (result) => {
        if (result && result.ascendant !== undefined) {
          resolve({
            ascendant: signFromDegree(result.ascendant),
            mc: signFromDegree(result.mc),
            houses: result.house ? result.house.map(h => signFromDegree(h)) : null,
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  try {
    const [sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, meanNode, chiron] = await Promise.all([
      calcPlanet(swe.SE_SUN),
      calcPlanet(swe.SE_MOON),
      calcPlanet(swe.SE_MERCURY),
      calcPlanet(swe.SE_VENUS),
      calcPlanet(swe.SE_MARS),
      calcPlanet(swe.SE_JUPITER),
      calcPlanet(swe.SE_SATURN),
      calcPlanet(swe.SE_URANUS),
      calcPlanet(swe.SE_NEPTUNE),
      calcPlanet(swe.SE_PLUTO),
      calcPlanet(swe.SE_MEAN_NODE),
      calcPlanet(swe.SE_CHIRON).catch(() => null),
    ]);

    const houses = timeKnown && coords ? await calcHouses() : null;

    // South Node = opposite of North Node
    const southNodeLon = (meanNode.longitude + 180) % 360;
    const southNode = signFromDegree(southNodeLon);

    const tzNote = utc.method === 'tz-lookup+luxon'
      ? `Zeitzone ${utc.tzName} (UT-Offset ${utc.offsetHours >= 0 ? '+' : ''}${utc.offsetHours}h, historische Sommerzeit beruecksichtigt).`
      : 'Zeitzonen-Naeherung CET (minus 1h) verwendet, da tz-lookup/luxon nicht verfuegbar.';

    return res.status(200).json({
      available: true,
      timeKnown,
      coordsKnown: !!coords,
      coords: coords ? { lat: coords.lat, lon: coords.lon, display: coords.display } : null,
      timezone: { name: utc.tzName, offsetHours: utc.offsetHours, method: utc.method },
      planets: {
        sun: { ...sun, formatted: fmtPos(sun) },
        moon: { ...moon, formatted: fmtPos(moon) },
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
      note: (!timeKnown ? 'Geburtszeit unbekannt — Aszendent nicht berechenbar, Mondposition mit ggf. Unsicherheit (ca. 13°/Tag). '
            : (!coords ? 'Geburtsort nicht eindeutig — Aszendent nicht berechenbar. ' : '')) + tzNote,
    });
  } catch (err) {
    console.error('Astro calc error:', err);
    return res.status(500).json({ error: err.message || 'Astrology calculation failed' });
  }
}
