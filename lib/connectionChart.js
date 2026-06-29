// lib/connectionChart.js
//
// Human-Design Connection Chart (Composite) fuer zwei Personen.
// Rein kombinatorisch: KEINE neue Ephemeriden-Rechnung. Verarbeitet die
// bereits berechneten Gate-Aktivierungen (Personality + Design) pro Person.
//
// Klassifikation nach Ra Uru Hu:
//   - elektromagnetisch : jeder haelt genau eines der beiden Kanal-Gates
//                         (gegenueberliegende Haelften) -> Anziehung mit Reibung
//   - gefaehrtenschaft  : beide halten den ganzen Kanal -> Gleichklang
//   - dominanz          : einer haelt den ganzen Kanal, der andere KEIN Gate davon
//   - kompromiss        : einer haelt den ganzen Kanal, der andere GENAU EIN Gate davon
//
// Ein Kanal ist im verbundenen Graph nur dann definiert, wenn ueber das Paar
// hinweg BEIDE Gates aktiviert sind. Haengt nur ein einzelnes Gate ohne
// Gegenstueck, entsteht keine Verbindung (wird uebersprungen).

// ---------------------------------------------------------------------------
// Die 9 Zentren
// ---------------------------------------------------------------------------
const CENTERS = [
  'Kopf', 'Ajna', 'Kehle', 'G', 'Herz',
  'Sakral', 'Milz', 'Solarplexus', 'Wurzel',
];

// ---------------------------------------------------------------------------
// Gate -> Zentrum (alle 64 Tore)
// ---------------------------------------------------------------------------
const GATE_CENTER = {
  // Kopf
  64: 'Kopf', 61: 'Kopf', 63: 'Kopf',
  // Ajna
  47: 'Ajna', 24: 'Ajna', 4: 'Ajna', 17: 'Ajna', 11: 'Ajna', 43: 'Ajna',
  // Kehle
  62: 'Kehle', 23: 'Kehle', 56: 'Kehle', 16: 'Kehle', 20: 'Kehle',
  31: 'Kehle', 8: 'Kehle', 33: 'Kehle', 35: 'Kehle', 12: 'Kehle', 45: 'Kehle',
  // G (Identitaet)
  1: 'G', 2: 'G', 7: 'G', 13: 'G', 10: 'G', 15: 'G', 25: 'G', 46: 'G',
  // Herz (Ego / Willen)
  21: 'Herz', 40: 'Herz', 26: 'Herz', 51: 'Herz',
  // Milz
  48: 'Milz', 57: 'Milz', 44: 'Milz', 50: 'Milz', 32: 'Milz', 28: 'Milz', 18: 'Milz',
  // Sakral
  5: 'Sakral', 14: 'Sakral', 29: 'Sakral', 59: 'Sakral', 9: 'Sakral',
  3: 'Sakral', 42: 'Sakral', 27: 'Sakral', 34: 'Sakral',
  // Solarplexus (Emotional)
  6: 'Solarplexus', 37: 'Solarplexus', 22: 'Solarplexus', 36: 'Solarplexus',
  30: 'Solarplexus', 55: 'Solarplexus', 49: 'Solarplexus',
  // Wurzel
  58: 'Wurzel', 38: 'Wurzel', 54: 'Wurzel', 53: 'Wurzel', 60: 'Wurzel',
  52: 'Wurzel', 19: 'Wurzel', 41: 'Wurzel', 39: 'Wurzel',
};

// ---------------------------------------------------------------------------
// Die 36 Kanaele. Jeder verbindet zwei Gates zwischen zwei Zentren.
// name nur fuer Validierung/Debug - taucht NIE im Report auf.
// ---------------------------------------------------------------------------
const CHANNELS = [
  { gates: [1, 8],   name: 'Inspiration' },
  { gates: [2, 14],  name: 'Schlagrhythmus' },
  { gates: [3, 60],  name: 'Mutation' },
  { gates: [4, 63],  name: 'Logik' },
  { gates: [5, 15],  name: 'Rhythmus' },
  { gates: [6, 59],  name: 'Intimitaet' },
  { gates: [7, 31],  name: 'Alpha' },
  { gates: [9, 52],  name: 'Konzentration' },
  { gates: [10, 20], name: 'Erwachen' },
  { gates: [10, 34], name: 'Erforschung' },
  { gates: [10, 57], name: 'Vollkommene Form' },
  { gates: [11, 56], name: 'Neugier' },
  { gates: [12, 22], name: 'Offenheit' },
  { gates: [13, 33], name: 'Der Heimkehrer' },
  { gates: [16, 48], name: 'Talent' },
  { gates: [17, 62], name: 'Akzeptanz' },
  { gates: [18, 58], name: 'Urteil' },
  { gates: [19, 49], name: 'Synthese' },
  { gates: [20, 34], name: 'Charisma' },
  { gates: [20, 57], name: 'Gehirnwelle' },
  { gates: [21, 45], name: 'Geld' },
  { gates: [23, 43], name: 'Strukturierung' },
  { gates: [24, 61], name: 'Bewusstheit' },
  { gates: [25, 51], name: 'Initiation' },
  { gates: [26, 44], name: 'Hingabe' },
  { gates: [27, 50], name: 'Bewahrung' },
  { gates: [28, 38], name: 'Kampf' },
  { gates: [29, 46], name: 'Entdeckung' },
  { gates: [30, 41], name: 'Erkennung' },
  { gates: [32, 54], name: 'Transformation' },
  { gates: [34, 57], name: 'Kraft' },
  { gates: [35, 36], name: 'Verganglichkeit' },
  { gates: [37, 40], name: 'Gemeinschaft' },
  { gates: [39, 55], name: 'Emotionalitaet' },
  { gates: [42, 53], name: 'Reifung' },
  { gates: [47, 64], name: 'Abstraktion' },
];

const TYPE = {
  ELECTROMAGNETIC: 'elektromagnetisch',
  COMPANIONSHIP: 'gefaehrtenschaft',
  DOMINANCE: 'dominanz',
  COMPROMISE: 'kompromiss',
};

// ---------------------------------------------------------------------------
// Eingabe-Normalisierung
// ---------------------------------------------------------------------------
// Akzeptiert pro Person flexibel:
//   - Array von Zahlen:            [41, 30, 1, 8, ...]
//   - Array von Objekten:         [{ planet:'Sun', gate:41, line:1 }, ...]  (zieht .gate)
//   - Set von Zahlen
//   - Objekt mit .gates           { gates: [...] }
//   - Objekt mit .activations     { activations: [...] }
//   - Objekt mit .personality     und/oder .design (je Array von Zahlen ODER Objekten)
// Gibt ein Set eindeutiger Gate-Nummern (1..64) zurueck.
function normalizeGates(input, label) {
  const out = new Set();

  const pushItem = (item) => {
    let n;
    if (typeof item === 'number') n = item;
    else if (item && typeof item === 'object') n = item.gate ?? item.tor ?? item.number ?? item.g;
    else n = Number(item);
    n = Number(n);
    if (Number.isInteger(n) && n >= 1 && n <= 64) out.add(n);
  };

  const eat = (val) => {
    if (val == null) return;
    if (Array.isArray(val)) val.forEach(pushItem);
    else if (val instanceof Set) val.forEach(pushItem);
    else if (typeof val === 'number') pushItem(val);
    else if (typeof val === 'object') {
      // verschachtelte uebliche Felder einsammeln
      if (val.gates || val.activations || val.personality || val.design) {
        eat(val.gates);
        eat(val.activations);
        eat(val.personality);
        eat(val.design);
      } else {
        // letzter Versuch: Werte des Objekts
        Object.values(val).forEach((v) => {
          if (Array.isArray(v) || v instanceof Set) eat(v);
          else pushItem(v);
        });
      }
    }
  };

  eat(input);

  if (out.size === 0) {
    throw new Error(
      `connectionChart: keine gueltigen Gates fuer "${label}" gefunden. ` +
      `Erwartet ein Array von Zahlen, ein Array von {gate}-Objekten, ein Set, ` +
      `oder ein Objekt mit gates/activations/personality/design.`
    );
  }
  return out;
}

// Zentren, die eine Person ALLEIN definiert (haelt beide Gates eines Kanals).
function soloDefinedCenters(gateSet) {
  const centers = new Set();
  for (const ch of CHANNELS) {
    const [g1, g2] = ch.gates;
    if (gateSet.has(g1) && gateSet.has(g2)) {
      centers.add(GATE_CENTER[g1]);
      centers.add(GATE_CENTER[g2]);
    }
  }
  return centers;
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------
function connectionChart(chartA, chartB, opts = {}) {
  const labelA = opts.labelA || 'A';
  const labelB = opts.labelB || 'B';

  const A = normalizeGates(chartA, labelA);
  const B = normalizeGates(chartB, labelB);

  const channels = [];
  const connectedCenters = new Set();
  const summary = {
    [TYPE.ELECTROMAGNETIC]: 0,
    [TYPE.COMPANIONSHIP]: 0,
    [TYPE.DOMINANCE]: 0,
    [TYPE.COMPROMISE]: 0,
  };

  for (const ch of CHANNELS) {
    const [g1, g2] = ch.gates;

    const aG1 = A.has(g1), aG2 = A.has(g2);
    const bG1 = B.has(g1), bG2 = B.has(g2);

    const aFull = aG1 && aG2;
    const bFull = bG1 && bG2;
    const aHalf = (aG1 || aG2) && !aFull;   // genau eines
    const bHalf = (bG1 || bG2) && !bFull;
    const aNone = !aG1 && !aG2;
    const bNone = !bG1 && !bG2;

    let type = null;
    let holders = null;

    if (aFull && bFull) {
      type = TYPE.COMPANIONSHIP;
      holders = { full: [labelA, labelB], half: [], none: [] };
    } else if (aFull && bNone) {
      type = TYPE.DOMINANCE;
      holders = { full: [labelA], half: [], none: [labelB] };
    } else if (bFull && aNone) {
      type = TYPE.DOMINANCE;
      holders = { full: [labelB], half: [], none: [labelA] };
    } else if (aFull && bHalf) {
      type = TYPE.COMPROMISE;
      holders = { full: [labelA], half: [labelB], none: [] };
    } else if (bFull && aHalf) {
      type = TYPE.COMPROMISE;
      holders = { full: [labelB], half: [labelA], none: [] };
    } else if (aHalf && bHalf) {
      // nur ein Connection-Kanal, wenn sie GEGENUEBERLIEGENDE Haelften halten
      const aGate = aG1 ? g1 : g2;
      const bGate = bG1 ? g1 : g2;
      if (aGate !== bGate) {
        type = TYPE.ELECTROMAGNETIC;
        holders = {
          full: [],
          half: [`${labelA}:${aGate}`, `${labelB}:${bGate}`],
          none: [],
        };
      }
      // gleiche Haelfte (beide nur g1 oder beide nur g2): Kanal nicht definiert -> skip
    }
    // alle anderen Faelle (z.B. aHalf && bNone): keine Verbindung -> skip

    if (type) {
      const cA = GATE_CENTER[g1];
      const cB = GATE_CENTER[g2];
      connectedCenters.add(cA);
      connectedCenters.add(cB);
      summary[type] += 1;
      channels.push({
        channel: `${g1}-${g2}`,
        gates: [g1, g2],
        centers: [cA, cB],
        name: ch.name,
        type,
        holders,
      });
    }
  }

  // newlyDefined: im Paar verbundene Zentren, die KEINE Person allein definiert
  const soloA = soloDefinedCenters(A);
  const soloB = soloDefinedCenters(B);
  const newlyDefined = [...connectedCenters].filter(
    (c) => !soloA.has(c) && !soloB.has(c)
  );

  return {
    labels: { a: labelA, b: labelB },
    channels,
    connectedCenters: CENTERS.filter((c) => connectedCenters.has(c)),
    newlyDefined: CENTERS.filter((c) => newlyDefined.includes(c)),
    soloDefined: {
      [labelA]: CENTERS.filter((c) => soloA.has(c)),
      [labelB]: CENTERS.filter((c) => soloB.has(c)),
    },
    summary,
  };
}

module.exports = {
  connectionChart,
  normalizeGates,
  CHANNELS,
  GATE_CENTER,
  CENTERS,
  TYPE,
};
