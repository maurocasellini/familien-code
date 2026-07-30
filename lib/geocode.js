// ───────────────────────────────────────────────────────────────────────────
//  lib/geocode.js — robuste Geburtsort-Aufloesung fuer Astrologie, Human
//  Design und den Live-Ort-Pruefer im Tool. EIN Weg fuer alle.
//
//  Ziel: jede sinnvolle Schreibweise in jeder Sprache muss treffen —
//  «Rio de Janeiro, Brasil» / «Brasilien» / «brazil» / nur «Rio de Janeiro»,
//  «São Paulo/SP», «Genève, Suisse», «Москва», «北京» …
//
//  Strategie: Nominatim (OpenStreetMap) versteht Freitext nativ in jeder
//  Sprache und Schrift und kennt Landernamen mehrsprachig — deshalb der
//  Primaerdienst. Open-Meteo ist schneller und liefert die Zeitzone direkt,
//  ist aber auf reine Ortsnamen angewiesen — daher schneller Fallback.
//
//  Rueckgabe: { lat, lon, display, timezone|null, country, countryCode,
//               source } oder null.
// ───────────────────────────────────────────────────────────────────────────

const NOM_URL = 'https://nominatim.openstreetmap.org/search';
const OM_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const UA = 'familien-code/2.0 (herzbewegung.ch)';
const TIMEOUT_MS = 6000;

// Nur als ASSIST fuer Open-Meteos strengen Laenderfilter und zum Erkennen
// eines angehaengten Landes. Nominatim braucht diese Liste NICHT — es
// versteht Landesnamen ohnehin mehrsprachig. Die Liste muss also nicht
// vollstaendig sein; sie schaerft nur die Fallback-Praezision.
const COUNTRY_ALIAS = {
  brasil: { cc: 'BR', om: 'Brazil' }, brasilien: { cc: 'BR', om: 'Brazil' }, brazil: { cc: 'BR', om: 'Brazil' }, bresil: { cc: 'BR', om: 'Brazil' },
  schweiz: { cc: 'CH', om: 'Switzerland' }, suisse: { cc: 'CH', om: 'Switzerland' }, svizzera: { cc: 'CH', om: 'Switzerland' }, switzerland: { cc: 'CH', om: 'Switzerland' }, suica: { cc: 'CH', om: 'Switzerland' },
  deutschland: { cc: 'DE', om: 'Germany' }, germany: { cc: 'DE', om: 'Germany' }, allemagne: { cc: 'DE', om: 'Germany' }, alemanha: { cc: 'DE', om: 'Germany' },
  osterreich: { cc: 'AT', om: 'Austria' }, oesterreich: { cc: 'AT', om: 'Austria' }, austria: { cc: 'AT', om: 'Austria' },
  espana: { cc: 'ES', om: 'Spain' }, spanien: { cc: 'ES', om: 'Spain' }, spain: { cc: 'ES', om: 'Spain' }, espanha: { cc: 'ES', om: 'Spain' },
  italia: { cc: 'IT', om: 'Italy' }, italien: { cc: 'IT', om: 'Italy' }, italy: { cc: 'IT', om: 'Italy' }, italie: { cc: 'IT', om: 'Italy' },
  portugal: { cc: 'PT', om: 'Portugal' },
  frankreich: { cc: 'FR', om: 'France' }, france: { cc: 'FR', om: 'France' }, franca: { cc: 'FR', om: 'France' },
  polska: { cc: 'PL', om: 'Poland' }, polen: { cc: 'PL', om: 'Poland' }, poland: { cc: 'PL', om: 'Poland' },
  turkiye: { cc: 'TR', om: 'Turkey' }, turkei: { cc: 'TR', om: 'Turkey' }, tuerkei: { cc: 'TR', om: 'Turkey' }, turkey: { cc: 'TR', om: 'Turkey' },
  hrvatska: { cc: 'HR', om: 'Croatia' }, kroatien: { cc: 'HR', om: 'Croatia' }, croatia: { cc: 'HR', om: 'Croatia' },
  srbija: { cc: 'RS', om: 'Serbia' }, serbien: { cc: 'RS', om: 'Serbia' },
  nederland: { cc: 'NL', om: 'Netherlands' }, niederlande: { cc: 'NL', om: 'Netherlands' }, netherlands: { cc: 'NL', om: 'Netherlands' },
  sverige: { cc: 'SE', om: 'Sweden' }, schweden: { cc: 'SE', om: 'Sweden' },
  danmark: { cc: 'DK', om: 'Denmark' }, danemark: { cc: 'DK', om: 'Denmark' }, daenemark: { cc: 'DK', om: 'Denmark' },
  norge: { cc: 'NO', om: 'Norway' }, norwegen: { cc: 'NO', om: 'Norway' },
  suomi: { cc: 'FI', om: 'Finland' }, finnland: { cc: 'FI', om: 'Finland' },
  ungarn: { cc: 'HU', om: 'Hungary' }, magyarorszag: { cc: 'HU', om: 'Hungary' },
  cesko: { cc: 'CZ', om: 'Czechia' }, tschechien: { cc: 'CZ', om: 'Czechia' },
  romania: { cc: 'RO', om: 'Romania' }, rumanien: { cc: 'RO', om: 'Romania' }, rumaenien: { cc: 'RO', om: 'Romania' },
  griechenland: { cc: 'GR', om: 'Greece' }, greece: { cc: 'GR', om: 'Greece' }, ellada: { cc: 'GR', om: 'Greece' },
  russland: { cc: 'RU', om: 'Russia' }, russia: { cc: 'RU', om: 'Russia' }, rossiya: { cc: 'RU', om: 'Russia' },
  ukraine: { cc: 'UA', om: 'Ukraine' }, ukraina: { cc: 'UA', om: 'Ukraine' },
  mexico: { cc: 'MX', om: 'Mexico' }, mexiko: { cc: 'MX', om: 'Mexico' },
  peru: { cc: 'PE', om: 'Peru' }, chile: { cc: 'CL', om: 'Chile' },
  argentinien: { cc: 'AR', om: 'Argentina' }, argentina: { cc: 'AR', om: 'Argentina' },
  kolumbien: { cc: 'CO', om: 'Colombia' }, colombia: { cc: 'CO', om: 'Colombia' },
  venezuela: { cc: 'VE', om: 'Venezuela' }, uruguay: { cc: 'UY', om: 'Uruguay' }, uruguai: { cc: 'UY', om: 'Uruguay' },
  paraguay: { cc: 'PY', om: 'Paraguay' }, bolivien: { cc: 'BO', om: 'Bolivia' }, bolivia: { cc: 'BO', om: 'Bolivia' },
  ecuador: { cc: 'EC', om: 'Ecuador' },
  grossbritannien: { cc: 'GB', om: 'United Kingdom' }, england: { cc: 'GB', om: 'United Kingdom' }, uk: { cc: 'GB', om: 'United Kingdom' }, greatbritain: { cc: 'GB', om: 'United Kingdom' },
  usa: { cc: 'US', om: 'United States' }, us: { cc: 'US', om: 'United States' }, vereinigtestaaten: { cc: 'US', om: 'United States' }, estadosunidos: { cc: 'US', om: 'United States' },
  kanada: { cc: 'CA', om: 'Canada' }, canada: { cc: 'CA', om: 'Canada' },
  indien: { cc: 'IN', om: 'India' }, india: { cc: 'IN', om: 'India' },
  china: { cc: 'CN', om: 'China' }, japan: { cc: 'JP', om: 'Japan' }, thailand: { cc: 'TH', om: 'Thailand' },
  marokko: { cc: 'MA', om: 'Morocco' }, maroc: { cc: 'MA', om: 'Morocco' },
  agypten: { cc: 'EG', om: 'Egypt' }, aegypten: { cc: 'EG', om: 'Egypt' },
  sudafrika: { cc: 'ZA', om: 'South Africa' }, suedafrika: { cc: 'ZA', om: 'South Africa' },
  angola: { cc: 'AO', om: 'Angola' }, mosambik: { cc: 'MZ', om: 'Mozambique' }, mocambique: { cc: 'MZ', om: 'Mozambique' },
  australien: { cc: 'AU', om: 'Australia' }, australia: { cc: 'AU', om: 'Australia' },
};

// Nominatim-Klassen, die echte Orte sind (keine Strassen/Gebaeude).
const PLACE_CLASSES = new Set(['place', 'boundary']);
const PLACE_TYPES = new Set([
  'city', 'town', 'village', 'hamlet', 'municipality', 'administrative',
  'suburb', 'borough', 'quarter', 'county', 'state', 'region', 'district',
  'province', 'locality', 'isolated_dwelling',
]);

function deAccent(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function key(s) {
  return deAccent(s).toLowerCase().replace(/[^a-z]/g, '');
}

async function getJson(url, headers) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: headers || {} });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Trennt "Stadt, Region, Land" — auch bei " - " oder "/" als Trenner.
// Ein Bindestrich ohne Leerzeichen bleibt stehen (Baden-Baden, Sainte-Foy).
function splitSegments(s) {
  return String(s || '')
    .split(/\s*[,;/]\s*|\s+[-–]\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// Erkennt ein am Ende angehaengtes Land -> ISO-Code + Open-Meteo-Name.
export function countryHint(raw) {
  const parts = splitSegments(raw);
  if (parts.length < 2) return null;
  const alias = COUNTRY_ALIAS[key(parts[parts.length - 1])];
  if (!alias) return null;
  return { cc: alias.cc, om: alias.om };
}

// Alle sinnvollen Schreibweisen, beste zuerst. Raw bleibt immer an Position 0,
// weil Nominatim mit dem vollen Freitext am besten arbeitet.
export function placeVariants(raw) {
  const s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const out = [];
  const push = (v) => {
    const t = String(v || '').replace(/\s+/g, ' ').trim().replace(/[,;/\-–]+$/, '').trim();
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  };

  push(s);                                   // 0: voller Freitext
  const noParen = s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const bases = noParen && noParen !== s ? [s, noParen] : [s];

  for (const base of bases) {
    const parts = splitSegments(base);
    if (parts.length > 1) {
      const alias = COUNTRY_ALIAS[key(parts[parts.length - 1])];
      if (alias) {
        push([...parts.slice(0, -1), alias.om].join(', '));
        push(`${parts[0]}, ${alias.om}`);
      }
      push(parts.join(', '));                // normalisierte Trenner
      push(parts.slice(0, 2).join(', '));    // Stadt, Region
      push(parts[0]);                        // nur Stadt
    }
    const noZip = base.replace(/\b\d{4,6}\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (noZip && noZip !== base) push(splitSegments(noZip)[0]);
  }

  for (const v of [...out]) {                // akzentfreie Fassungen zuletzt
    const plain = deAccent(v);
    if (plain !== v) push(plain);
  }
  return out;
}

// ── Nominatim ────────────────────────────────────────────────────────────
function scoreNominatim(r, hint) {
  let sc = Number(r.importance || 0) * 10;
  if (PLACE_CLASSES.has(r.class)) sc += 5;
  if (PLACE_TYPES.has(r.type) || PLACE_TYPES.has(r.addresstype)) sc += 5;
  if (r.class === 'highway' || r.class === 'building' || r.class === 'shop' || r.class === 'amenity') sc -= 8;
  if (hint && hint.cc && String((r.address && r.address.country_code) || '').toUpperCase() === hint.cc) sc += 6;
  return sc;
}

async function nominatim(q, hint) {
  const url = `${NOM_URL}?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&accept-language=de`;
  const j = await getJson(url, { 'User-Agent': UA });
  if (!Array.isArray(j) || !j.length) return null;

  let pool = j;
  if (hint && hint.cc) {
    const inCountry = j.filter((r) => String((r.address && r.address.country_code) || '').toUpperCase() === hint.cc);
    if (inCountry.length) pool = inCountry;
  }
  pool = [...pool].sort((a, b) => scoreNominatim(b, hint) - scoreNominatim(a, hint));
  const hit = pool[0];
  const lat = parseFloat(hit.lat), lon = parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const addr = hit.address || {};
  const isPlace = PLACE_CLASSES.has(hit.class) || PLACE_TYPES.has(hit.type) || PLACE_TYPES.has(hit.addresstype);
  return {
    lat, lon,
    display: hit.display_name || q,
    timezone: null,
    country: addr.country || null,
    countryCode: (addr.country_code || '').toUpperCase() || null,
    source: 'nominatim',
    quality: isPlace ? 'place' : 'approx',
  };
}

// ── Open-Meteo ───────────────────────────────────────────────────────────
function matchesCountry(r, hint) {
  if (!hint) return true;
  if (hint.cc && String(r.country_code || '').toUpperCase() === hint.cc) return true;
  const want = key(hint.om), got = key(r.country);
  return !!want && !!got && (got.startsWith(want) || want.startsWith(got));
}
function pickOM(results, hint) {
  if (!Array.isArray(results) || !results.length) return null;
  const pool = hint ? results.filter((r) => matchesCountry(r, hint)) : results;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => {
    const sa = Math.log10((a.population || 0) + 10) + (String(a.feature_code || '').startsWith('PPL') ? 3 : 0);
    const sb = Math.log10((b.population || 0) + 10) + (String(b.feature_code || '').startsWith('PPL') ? 3 : 0);
    return sb - sa;
  })[0];
}
async function openMeteo(q, language, hint) {
  const url = `${OM_URL}?name=${encodeURIComponent(q)}&count=10&language=${language || 'de'}&format=json`;
  const j = await getJson(url);
  const hit = pickOM(j && j.results, hint);
  if (!hit) return null;
  return {
    lat: Number(hit.latitude),
    lon: Number(hit.longitude),
    display: [hit.name, hit.admin1, hit.country].filter(Boolean).join(', '),
    timezone: hit.timezone || null,
    country: hit.country || null,
    countryCode: (hit.country_code || '').toUpperCase() || null,
    source: 'open-meteo',
  };
}

// ── Hauptfunktion ──────────────────────────────────────────────────────────
export async function geocodePlace(raw, opts) {
  const language = (opts && opts.language) || 'de';
  const variants = placeVariants(raw).slice(0, 8);
  if (!variants.length) return null;
  const hint = countryHint(raw);

  // 1+2) Nominatim: erst voller Freitext, dann bereinigte Varianten.
  //  Ein echter Ort (Stadt/Gemeinde) schlaegt einen ungefaehren Strassen-
  //  treffer — deshalb wird bei "approx" weitergesucht und nur als Rueckfall
  //  behalten, falls keine Variant einen echten Ort liefert.
  let fallback = null;
  for (const v of variants) {
    const n = await nominatim(v, hint);
    if (!n) continue;
    if (n.quality === 'place') return n;
    if (!fallback) fallback = n;
  }

  // 3) Open-Meteo (schnell, mit Zeitzone) — mit Laenderfilter, wenn Land bekannt.
  if (hint) {
    for (const v of variants) {
      const m = await openMeteo(v, language, hint);
      if (m) return m;
    }
  }
  // 4) Open-Meteo ohne Filter.
  for (const v of variants) {
    const m = await openMeteo(v, language, null);
    if (m) return m;
  }

  // 5) Notfalls der ungefaehre Nominatim-Treffer (z.B. Strassenadresse) —
  //    Koordinaten stimmen aufs Dorf genau, Zeitzone bleibt korrekt.
  return fallback;
}

export default geocodePlace;
