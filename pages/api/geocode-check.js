// ───────────────────────────────────────────────────────────────────────────
//  /api/geocode-check — leichter Endpoint fuer den Live-Ort-Pruefer im Tool.
//  Nimmt einen Ort entgegen und meldet, ob er gefunden wurde, wie er
//  aufgeloest wird und welche Zeitzone gilt. Rein informativ, veraendert
//  nichts und blockiert nie die Report-Erstellung.
// ───────────────────────────────────────────────────────────────────────────
import { geocodePlace } from '../../lib/geocode';

export const config = { maxDuration: 15 };

// Zeitzone aus Koordinaten, falls der Geocoder selbst keine liefert.
function zoneFor(coords) {
  if (coords.timezone) return coords.timezone;
  try {
    const tzlookup = require('tz-lookup');
    return tzlookup(coords.lat, coords.lon);
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const place = (req.body && req.body.place ? String(req.body.place) : '').trim();
  if (!place) return res.status(200).json({ found: false, empty: true });

  try {
    const coords = await geocodePlace(place);
    if (!coords) return res.status(200).json({ found: false });

    return res.status(200).json({
      found: true,
      display: coords.display,
      timezone: zoneFor(coords),
      country: coords.country || null,
      countryCode: coords.countryCode || null,
      lat: +Number(coords.lat).toFixed(4),
      lon: +Number(coords.lon).toFixed(4),
      approx: coords.quality === 'approx',
      source: coords.source || null,
    });
  } catch (err) {
    return res.status(200).json({ found: false, error: true });
  }
}
