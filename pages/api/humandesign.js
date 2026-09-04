// ───────────────────────────────────────────────────────────────────────────
//  /api/humandesign  – berechnet aus Geburtsdaten den vollen BodyGraph.
//
//  Persoenlichkeit = Geburtsmoment. Design = Moment, in dem die Sonne exakt
//  88 Grad Bogen frueher stand (rund 88 Tage vor Geburt). Beide Seiten liefern
//  je 13 Aktivierungen (Sonne, Erde, Mond, Knoten, Merkur..Pluto), die im
//  reinen Rechner-Kern (lib/humandesign.js) auf das Tor-Rad gemappt werden.
//
//  Ephemeride: swisseph-wasm im Moshier-Modus (SEFLG_MOSEPH) ueber lib/ephemeris.js.
//  Kein natives Modul, laeuft also identisch lokal und auf Vercel, bogensekunden-
//  genau (validiert gegen das fruehere native swisseph). Wahrer Knoten (SE_TRUE_NODE).
//  Zeitzone: tz-lookup + luxon (historisch korrekte Sommerzeit).
// ───────────────────────────────────────────────────────────────────────────
import tzlookup from 'tz-lookup';
import { DateTime } from 'luxon';
import { buildChart, norm360 } from '../../lib/humandesign';
import { getEphemeris, SE, MOSEPH_SPEED } from '../../lib/ephemeris';
import { geocodePlace } from '../../lib/geocode';
import { normalizeTime } from '../../lib/timeparse';

export const config = { maxDuration: 30 };

const BODIES = {
  sun: SE.SUN, moon: SE.MOON, mercury: SE.MERCURY, venus: SE.VENUS,
  mars: SE.MARS, jupiter: SE.JUPITER, saturn: SE.SATURN,
  uranus: SE.URANUS, neptune: SE.NEPTUNE, pluto: SE.PLUTO,
  // Knoten: Human-Design-Software nutzt ueblicherweise den WAHREN Knoten.
  northNode: SE.TRUE_NODE,
};

function lon(eph, jd, body) {
  const r = eph.calc(jd, body, MOSEPH_SPEED);
  if (!r || typeof r.longitude !== 'number') throw new Error('Ephemeriden-Berechnung fehlgeschlagen für Body ' + body);
  return norm360(r.longitude);
}

// alle 13 Aktivierungen fuer einen Julianischen Tag (UT)
function activationsAt(eph, jd) {
  const out = {};
  for (const [name, body] of Object.entries(BODIES)) out[name] = lon(eph, jd, body);
  out.earth = norm360(out.sun + 180);        // Erde = Sonne gegenueber
  out.southNode = norm360(out.northNode + 180);
  return out;
}

// Design-Moment: JD, an dem die Sonne genau 88 Grad vor der Geburts-Sonne stand.
function findDesignJd(eph, jdBirth) {
  const sunBirth = lon(eph, jdBirth, SE.SUN);
  const target = norm360(sunBirth - 88);
  let jd = jdBirth - 88.0 / 0.9856;          // erste Schaetzung (~89.3 Tage)
  for (let i = 0; i < 12; i++) {
    const r = eph.calc(jd, SE.SUN, MOSEPH_SPEED);
    let diff = norm360(r.longitude - target);
    if (diff > 180) diff -= 360;             // kuerzester Weg, signiert
    if (Math.abs(diff) < 1e-7) break;
    const speed = r.longitudeSpeed || 0.9856;
    jd -= diff / speed;
  }
  return jd;
}

function jdToDate(eph, jd) {
  const o = eph.revjul(jd, SE.GREG_CAL);
  const hh = Math.floor(o.hour); const mm = Math.floor((o.hour - hh) * 60);
  const p = (n) => String(n).padStart(2, '0');
  return `${o.year}-${p(o.month)}-${p(o.day)}T${p(hh)}:${p(mm)}Z`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { birthDate, birthTime, birthPlace, lat, lon: lonIn } = req.body || {};
    if (!birthDate || !birthTime) {
      return res.status(400).json({ available: false, reason: 'Human Design braucht Geburtsdatum UND exakte Geburtszeit.' });
    }

    const eph = await getEphemeris();

    // Koordinaten: entweder mitgeliefert (vom Astrologie-Call wiederverwendet) oder geokodieren.
    let coords = null;
    if (typeof lat === 'number' && typeof lonIn === 'number') coords = { lat, lon: lonIn, display: birthPlace || '' };
    else if (birthPlace) coords = await geocodePlace(birthPlace);
    if (!coords) {
      return res.status(200).json({
        available: false,
        reason: `Geburtsort «${birthPlace || ''}» konnte nicht gefunden werden — Zeitzone unbestimmt. Bitte den Ortsnamen pruefen (Stadt genuegt, z.B. «Rio de Janeiro»).`,
      });
    }

    // Zeitzone bevorzugt direkt vom Geocoder, sonst geografisch bestimmt.
    const zone = coords.timezone || tzlookup(coords.lat, coords.lon);
    let Y, M, D;
    if (birthDate.includes('.')) { const [d, m, y] = birthDate.split('.').map(Number); Y = y; M = m; D = d; }
    else { const [y, m, d] = birthDate.split('-').map(Number); Y = y; M = m; D = d; }
    const _t = normalizeTime(birthTime);
    if (!_t) {
      return res.status(200).json({
        available: false,
        reason: `Die Geburtszeit «${String(birthTime).trim()}» konnte nicht gelesen werden. Bitte im Format HH:MM angeben, z.B. 05:40.`,
      });
    }
    const h = _t.hour, mi = _t.minute;
    const local = DateTime.fromObject({ year: Y, month: M, day: D, hour: h, minute: mi || 0 }, { zone });
    if (!local.isValid) return res.status(200).json({ available: false, reason: 'Ungueltige Datums-/Zeitangabe: ' + local.invalidReason });
    const utc = local.toUTC();

    const jdBirth = eph.julday(utc.year, utc.month, utc.day, utc.hour + utc.minute / 60 + utc.second / 3600);
    const jdDesign = findDesignJd(eph, jdBirth);

    const chart = buildChart({ personality: activationsAt(eph, jdBirth), design: activationsAt(eph, jdDesign) });

    const designUtc = jdToDate(eph, jdDesign);
    return res.status(200).json({
      available: true,
      meta: {
        zone, birthUtc: utc.toISO(), designUtc,
        coords: { lat: +coords.lat.toFixed(4), lon: +coords.lon.toFixed(4), display: coords.display, source: coords.source || null },
        node: 'true', ephemeris: 'Moshier',
      },
      ...chart,
    });
  } catch (err) {
    return res.status(200).json({ available: false, reason: 'Berechnung fehlgeschlagen: ' + (err.message || String(err)) });
  }
}
