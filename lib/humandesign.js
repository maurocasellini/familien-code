// ───────────────────────────────────────────────────────────────────────────
//  Human Design – deterministischer Rechner-Kern (KEINE Ephemeride hier drin)
//  Eingabe:  Planeten-Laengengrade (geozentrisch ekliptikal, 0..360) fuer
//            Persoenlichkeit (Geburtsmoment) und Design (88 Grad Sonnenbogen
//            davor). Ausgabe: vollstaendiger BodyGraph als JSON.
//
//  Quelle Tor-Rad: Rave Mandala, verifiziert gegen veroeffentlichte
//  Grad-Tabellen (Gate 41 startet exakt bei 2°00'00" Wassermann = 302.0°,
//  Gate 25 ueberspannt 0° Widder, Gate 60 endet bei 302.0°).
// ───────────────────────────────────────────────────────────────────────────

const { getInkarnationskreuz, WINKEL_KURZ } = require('./inkarnationskreuze');

// Tor-Rad in aufsteigender Laenge, beginnend bei Gate 41 @ 302.0 Grad.
const WHEEL = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
];
const WHEEL_START = 302.0;            // Laengengrad des Anfangs von Gate 41
const GATE_SIZE = 360 / 64;           // 5.625 Grad
const LINE_SIZE = GATE_SIZE / 6;      // 0.9375 Grad
const COLOR_SIZE = LINE_SIZE / 6;     // 0.15625 Grad
const TONE_SIZE = COLOR_SIZE / 6;     // 0.0260416... Grad
const BASE_SIZE = TONE_SIZE / 5;      // 0.0052083... Grad

// Die 9 Zentren und ihre Tore (Summe = 64 Tore).
const CENTERS = {
  Head:        [64, 61, 63],
  Ajna:        [47, 24, 4, 17, 43, 11],
  Throat:      [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  G:           [7, 1, 13, 10, 25, 15, 46, 2],
  Heart:       [21, 40, 26, 51],
  Sacral:      [34, 5, 14, 29, 59, 9, 3, 42, 27],
  Spleen:      [48, 57, 44, 50, 32, 28, 18],
  SolarPlexus: [6, 37, 22, 36, 30, 55, 49],
  Root:        [58, 38, 54, 53, 60, 52, 19, 39, 41],
};

const CENTER_DE = {
  Head: 'Kopf (Krone)', Ajna: 'Ajna', Throat: 'Kehle', G: 'G-Zentrum (Selbst)',
  Heart: 'Herz (Ego/Wille)', Sacral: 'Sakral', Spleen: 'Milz',
  SolarPlexus: 'Solarplexus (Emotion)', Root: 'Wurzel',
};

const MOTORS = ['Sacral', 'Heart', 'SolarPlexus', 'Root'];

// Die 36 Kanaele als Tor-Paare (Zentren werden aus der Tor->Zentrum-Zuordnung
// abgeleitet, damit hier keine zweite, fehleranfaellige Tabelle noetig ist).
const CHANNELS = [
  [1, 8],   [2, 14],  [3, 60],  [4, 63],  [5, 15],  [6, 59],  [7, 31],
  [9, 52],  [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33],
  [16, 48], [17, 62], [18, 58], [19, 49], [20, 34], [20, 57], [21, 45],
  [23, 43], [24, 61], [25, 51], [26, 44], [27, 50], [28, 38], [29, 46],
  [30, 41], [32, 54], [34, 57], [35, 36], [37, 40], [39, 55], [42, 53],
  [47, 64],
];

const CHANNEL_NAMES = {
  '1-8': 'Inspiration', '2-14': 'Schlagzahl', '3-60': 'Mutation',
  '4-63': 'Logik', '5-15': 'Rhythmus', '6-59': 'Fortpflanzung',
  '7-31': 'Der Alpha', '9-52': 'Konzentration', '10-20': 'Erwachen',
  '10-34': 'Erkundung', '10-57': 'Vollendete Form', '11-56': 'Neugier',
  '12-22': 'Offenheit', '13-33': 'Der Heimkehrer', '16-48': 'Die Wellenlaenge',
  '17-62': 'Akzeptanz', '18-58': 'Urteil', '19-49': 'Synthese',
  '20-34': 'Charisma', '20-57': 'Die Gehirnwelle', '21-45': 'Geld',
  '23-43': 'Strukturierung', '24-61': 'Bewusstwerdung', '25-51': 'Initiation',
  '26-44': 'Hingabe', '27-50': 'Bewahrung', '28-38': 'Der Kampf',
  '29-46': 'Entdeckung', '30-41': 'Erkennen', '32-54': 'Wandlung',
  '34-57': 'Kraft', '35-36': 'Verlust', '37-40': 'Gemeinschaft',
  '39-55': 'Stimmung', '42-53': 'Reifung', '47-64': 'Abstraktion',
};

const PLANETS = [
  'sun', 'earth', 'moon', 'northNode', 'southNode', 'mercury', 'venus',
  'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
];
const PLANET_DE = {
  sun: 'Sonne', earth: 'Erde', moon: 'Mond', northNode: 'Nordknoten',
  southNode: 'Suedknoten', mercury: 'Merkur', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun',
  pluto: 'Pluto',
};
const PLANET_GLYPH = {
  sun: '☉', earth: '⊕', moon: '☽', northNode: '☊', southNode: '☋',
  mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
  uranus: '♅', neptune: '♆', pluto: '♇',
};

// gate-> center lookup
const GATE_TO_CENTER = {};
for (const [c, gates] of Object.entries(CENTERS)) gates.forEach(g => { GATE_TO_CENTER[g] = c; });

function norm360(x) { return ((x % 360) + 360) % 360; }

// Laengengrad -> {gate, line, color, tone, base}
function decode(longitude) {
  const off = norm360(longitude - WHEEL_START);
  const idx = Math.floor(off / GATE_SIZE);
  const gate = WHEEL[idx];
  const inGate = off - idx * GATE_SIZE;
  const line = Math.floor(inGate / LINE_SIZE) + 1;
  const inLine = inGate - (line - 1) * LINE_SIZE;
  const color = Math.floor(inLine / COLOR_SIZE) + 1;
  const inColor = inLine - (color - 1) * COLOR_SIZE;
  const tone = Math.floor(inColor / TONE_SIZE) + 1;
  const inTone = inColor - (tone - 1) * TONE_SIZE;
  const base = Math.floor(inTone / BASE_SIZE) + 1;
  return { gate, line, color, tone, base };
}

// Tone 1-3 => linker Pfeil, 4-6 => rechter Pfeil
function arrow(tone) { return tone <= 3 ? 'links' : 'rechts'; }

const PROFILE_ANGLE = {
  '1/3': 'Rechtswinkel', '1/4': 'Rechtswinkel', '2/4': 'Rechtswinkel',
  '2/5': 'Rechtswinkel', '3/5': 'Rechtswinkel', '3/6': 'Rechtswinkel',
  '4/6': 'Rechtswinkel', '4/1': 'Juxtaposition', '5/1': 'Linkswinkel',
  '5/2': 'Linkswinkel', '6/2': 'Linkswinkel', '6/3': 'Linkswinkel',
};

const TYPE_STRATEGY = {
  Generator: 'Warten und reagieren (auf das Leben antworten)',
  'Manifesting Generator': 'Warten, reagieren, dann informieren bevor du handelst',
  Projector: 'Auf die Einladung warten (Anerkennung abwarten)',
  Manifestor: 'Informieren bevor du handelst (initiieren)',
  Reflector: 'Einen Mondzyklus (rund 28 Tage) abwarten vor grossen Entscheidungen',
};
const TYPE_DE = {
  Generator: 'Generator', 'Manifesting Generator': 'Manifestierender Generator',
  Projector: 'Projektor', Manifestor: 'Manifestor', Reflector: 'Reflektor',
};
const TYPE_NOTSELF = {
  Generator: 'Frustration', 'Manifesting Generator': 'Frustration und Aerger',
  Projector: 'Verbitterung', Manifestor: 'Aerger', Reflector: 'Enttaeuschung',
};
const TYPE_SIGNATURE = {
  Generator: 'Zufriedenheit', 'Manifesting Generator': 'Zufriedenheit',
  Projector: 'Erfolg', Manifestor: 'Frieden', Reflector: 'Ueberraschung',
};

const AUTHORITY_DE = {
  Emotional: 'Emotionale Autoritaet (Solarplexus) – Klarheit ueber die Welle, keine Entscheidung im Moment',
  Sacral: 'Sakrale Autoritaet – die Bauchantwort im Hier und Jetzt',
  Splenic: 'Milz-Autoritaet – der leise, einmalige Impuls im Augenblick',
  Ego: 'Ego-/Herz-Autoritaet – was will ich wirklich, woraus schoepfe ich Willenskraft',
  SelfProjected: 'Selbst-projizierte Autoritaet – ueber die eigene Stimme im Gespraech hoeren, was stimmt',
  Mental: 'Mentale Projektor-Autoritaet (keine innere Autoritaet) – im Austausch mit vertrauten Menschen klar werden',
  Lunar: 'Lunare Autoritaet – einen vollen Mondzyklus abwarten',
};

// ── Hauptfunktion ────────────────────────────────────────────────────────────
// personality / design: { sun: deg, earth: deg, moon: deg, ... } fuer alle PLANETS
function buildChart({ personality, design }) {
  const activations = { personality: {}, design: {} };
  for (const side of ['personality', 'design']) {
    const src = side === 'personality' ? personality : design;
    for (const pl of PLANETS) {
      if (typeof src[pl] !== 'number') continue;
      activations[side][pl] = { longitude: norm360(src[pl]), ...decode(src[pl]) };
    }
  }

  // aktivierte Tore (egal ob Persoenlichkeit oder Design)
  const activeGates = new Set();
  const gateSources = {}; // gate -> [{side, planet, line}]
  for (const side of ['personality', 'design']) {
    for (const [pl, a] of Object.entries(activations[side])) {
      activeGates.add(a.gate);
      (gateSources[a.gate] = gateSources[a.gate] || []).push({ side, planet: pl, line: a.line });
    }
  }

  // definierte Kanaele: beide Tore aktiv
  const definedChannels = [];
  for (const [a, b] of CHANNELS) {
    if (activeGates.has(a) && activeGates.has(b)) {
      const key = `${a}-${b}`;
      definedChannels.push({
        key, gates: [a, b], name: CHANNEL_NAMES[key] || key,
        centers: [GATE_TO_CENTER[a], GATE_TO_CENTER[b]],
      });
    }
  }

  // definierte Zentren: mind. ein definierter Kanal beruehrt sie
  const definedCenters = new Set();
  for (const ch of definedChannels) ch.centers.forEach(c => definedCenters.add(c));

  // Graph der definierten Zentren ueber definierte Kanaele
  const adj = {};
  Object.keys(CENTERS).forEach(c => { adj[c] = new Set(); });
  for (const ch of definedChannels) {
    const [c1, c2] = ch.centers;
    if (c1 !== c2) { adj[c1].add(c2); adj[c2].add(c1); }
  }

  // Zusammenhangskomponenten unter den definierten Zentren -> Definition
  const seen = new Set();
  const components = [];
  for (const c of definedCenters) {
    if (seen.has(c)) continue;
    const stack = [c]; const comp = [];
    while (stack.length) {
      const x = stack.pop();
      if (seen.has(x)) continue;
      seen.add(x); comp.push(x);
      for (const nb of adj[x]) if (definedCenters.has(nb) && !seen.has(nb)) stack.push(nb);
    }
    components.push(comp);
  }
  const DEFINITION_DE = ['Keine Definition', 'Einfache Definition', 'Geteilte Definition (Split)', 'Dreifach-Split', 'Vierfach-Split'];
  const definition = DEFINITION_DE[Math.min(components.length, 4)];

  // Motor-zur-Kehle-Verbindung (per Graph-Erreichbarkeit)
  function reachable(from, to) {
    if (!definedCenters.has(from) || !definedCenters.has(to)) return false;
    const st = [from]; const vis = new Set();
    while (st.length) {
      const x = st.pop();
      if (x === to) return true;
      if (vis.has(x)) continue; vis.add(x);
      for (const nb of adj[x]) st.push(nb);
    }
    return false;
  }
  const throatDefined = definedCenters.has('Throat');
  const motorToThroat = throatDefined && MOTORS.some(m => definedCenters.has(m) && reachable(m, 'Throat'));

  // TYP
  let type;
  if (definedCenters.size === 0) type = 'Reflector';
  else if (definedCenters.has('Sacral')) type = motorToThroat ? 'Manifesting Generator' : 'Generator';
  else if (motorToThroat) type = 'Manifestor';
  else type = 'Projector';

  // AUTORITAET (Hierarchie)
  let authority;
  if (definedCenters.has('SolarPlexus')) authority = 'Emotional';
  else if (definedCenters.has('Sacral')) authority = 'Sacral';
  else if (definedCenters.has('Spleen')) authority = 'Splenic';
  else if (definedCenters.has('Heart')) authority = 'Ego';
  else if (definedCenters.has('G') && reachable('G', 'Throat')) authority = 'SelfProjected';
  else if (type === 'Reflector') authority = 'Lunar';
  else authority = 'Mental';

  // PROFIL aus den Linien der Persoenlichkeits-Sonne (bewusst) und Design-Sonne (unbewusst)
  const persSun = activations.personality.sun;
  const desSun = activations.design.sun;
  const profile = `${persSun.line}/${desSun.line}`;

  // INKARNATIONSKREUZ: 4 Tore (Pers. Sonne/Erde, Design Sonne/Erde) + Winkel
  // Name und Deutungsmaterial kommen aus lib/inkarnationskreuze.js
  // (eindeutiger Schluessel: Persoenlichkeits-Sonnentor + Winkel aus dem Profil).
  const kreuz = getInkarnationskreuz({ sonneTorPersoenlichkeit: persSun.gate, profil: profile });
  const cross = {
    angle: PROFILE_ANGLE[profile] || 'unbestimmt',
    gates: {
      personalitySun: persSun.gate, personalityEarth: activations.personality.earth.gate,
      designSun: desSun.gate, designEarth: activations.design.earth.gate,
    },
    notation: `(${persSun.gate}/${activations.personality.earth.gate} | ${desSun.gate}/${activations.design.earth.gate})`,
    name: kreuz ? kreuz.name : null,
    winkel: kreuz ? kreuz.winkel : null,
    winkelBedeutung: kreuz ? WINKEL_KURZ[kreuz.winkel].de : null,
    torNamen: kreuz ? kreuz.torNamen : [],
    deutung: kreuz ? kreuz.quelle : '',
  };

  // VARIABLEN / Pfeile (Determination, Umgebung, Motivation, Perspektive)
  const persNode = activations.personality.southNode || activations.personality.northNode;
  const desNode = activations.design.southNode || activations.design.northNode;
  const variables = {
    digestion:   { source: 'Design-Sonne', tone: desSun.tone, color: desSun.color, arrow: arrow(desSun.tone) },       // links oben
    environment: { source: 'Design-Knoten', tone: desNode.tone, color: desNode.color, arrow: arrow(desNode.tone) },   // links unten
    motivation:  { source: 'Persoenlichkeits-Sonne', tone: persSun.tone, color: persSun.color, arrow: arrow(persSun.tone) }, // rechts oben
    perspective: { source: 'Persoenlichkeits-Knoten', tone: persNode.tone, color: persNode.color, arrow: arrow(persNode.tone) }, // rechts unten
  };
  // PHHL-Kurzform z.B. "LL DR" (Determination/Umgebung | Motivation/Perspektive)
  const four = `${variables.digestion.arrow[0].toUpperCase()}${variables.environment.arrow[0].toUpperCase()} ${variables.motivation.arrow[0].toUpperCase()}${variables.perspective.arrow[0].toUpperCase()}`;

  // offene/undefinierte Zentren
  const openCenters = Object.keys(CENTERS).filter(c => !definedCenters.has(c));

  return {
    type, typeDe: TYPE_DE[type], strategy: TYPE_STRATEGY[type],
    notSelfTheme: TYPE_NOTSELF[type], signature: TYPE_SIGNATURE[type],
    authority, authorityDe: AUTHORITY_DE[authority],
    profile, profileAngle: PROFILE_ANGLE[profile] || 'unbestimmt',
    definition,
    incarnationCross: cross,
    centers: {
      defined: [...definedCenters], definedDe: [...definedCenters].map(c => CENTER_DE[c]),
      open: openCenters, openDe: openCenters.map(c => CENTER_DE[c]),
    },
    channels: definedChannels.map(c => ({ ...c, centersDe: c.centers.map(x => CENTER_DE[x]) })),
    gates: [...activeGates].sort((a, b) => a - b).map(g => ({
      gate: g, center: GATE_TO_CENTER[g], centerDe: CENTER_DE[GATE_TO_CENTER[g]],
      sources: gateSources[g],
    })),
    variables, variablesShort: four,
    activations: {
      personality: Object.fromEntries(Object.entries(activations.personality).map(
        ([k, v]) => [k, { de: PLANET_DE[k], glyph: PLANET_GLYPH[k], gate: v.gate, line: v.line, longitude: +v.longitude.toFixed(4) }])),
      design: Object.fromEntries(Object.entries(activations.design).map(
        ([k, v]) => [k, { de: PLANET_DE[k], glyph: PLANET_GLYPH[k], gate: v.gate, line: v.line, longitude: +v.longitude.toFixed(4) }])),
    },
  };
}

module.exports = { buildChart, decode, WHEEL, WHEEL_START, GATE_SIZE, CENTERS, CHANNELS, PLANETS, norm360 };
