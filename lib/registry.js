// ───────────────────────────────────────────────────────────────────────────
//  lib/registry.js — die EINZIGE Wahrheit fuer den Funnel.
//
//  Drei Tabellen (REPORTS, KONSTELLATIONEN, THEMEN) plus Helfer. Aus ihnen
//  rendern sich alle vier Stufen:
//    1. System    -> verschiedene .system in REPORTS
//    2. Art       -> .art je System (nur ein Eintrag -> Stufe entfaellt)
//    3. Fuer wen  -> .konstellationen des gewaehlten Reports (Einzel/Mehrere)
//    4. Worauf    -> THEMEN; empfohlene zuerst und vorausgewaehlt, Rest frei
//
//  Wichtig: die Registry BEFUELLT nur den bestehenden state
//  (mode, constellation, relationshipType, themes). buildPrompt und die
//  Engine-Aufrufe bleiben unveraendert.
// ───────────────────────────────────────────────────────────────────────────

// ── 1. REPORTS (System x Art) ───────────────────────────────────────────────
export const REPORTS = [
  {
    id: 'num_standard',
    system: 'numerologie',
    art: 'standard',
    mode: 'full',                 // bestehender state.mode-Wert
    titel: { de: 'Deine Seelenlandschaft', en: 'Your Soul Landscape' },
    dateiPrefix: { de: 'Seelenlandschaft', en: 'SoulLandscape' },
    engine: { numerologie: true, astrologie: true, crowley: true, humandesign: false },
    konstellationen: ['einzel', 'paar', 'geschaeftspartner', 'chef_ma', 'kollegium',
                      'geschwister', 'elternkind', 'familie', 'solo_kinder'],
  },
  {
    id: 'num_individuell',
    system: 'numerologie',
    art: 'individuell',
    mode: 'individual',
    titel: { de: 'Deine persönliche Analyse', en: 'Your Personal Analysis' },
    dateiPrefix: { de: 'Analyse', en: 'Analysis' },
    engine: { numerologie: true, astrologie: true, crowley: true, humandesign: false },
    konstellationen: ['einzel'],   // heute bewusst nur Einzel
  },
  {
    id: 'num_kurzprofil',
    system: 'numerologie',
    art: 'kurzprofil',
    mode: 'kurzprofil',
    titel: { de: 'Kurzprofil', en: 'Short Profile' },
    dateiPrefix: { de: 'Kurzprofil', en: 'ShortProfile' },
    engine: { numerologie: true, astrologie: true, crowley: true, humandesign: false },
    konstellationen: ['einzel'],   // Werkzeug fuer dich, nur Datum noetig, eine Person
  },
  {
    id: 'hd_bodygraph',
    system: 'humandesign',
    art: 'standard',
    mode: 'humandesign',
    titel: { de: { einzel: 'Dein BodyGraph', mehrere: 'Euer BodyGraph' },
             en: { einzel: 'Your BodyGraph', mehrere: 'Your Shared BodyGraph' } },
    dateiPrefix: { de: 'BodyGraph', en: 'BodyGraph' },
    engine: { numerologie: false, astrologie: false, crowley: false, humandesign: true },
    konstellationen: ['einzel', 'paar', 'geschaeftspartner', 'chef_ma',
                      'kollegium', 'geschwister', 'elternkind'],  // noch keine Familie/Penta
  },
  {
    id: 'hd_individuell',
    system: 'humandesign',
    art: 'individuell',
    mode: 'humandesign_individual',
    titel: { de: 'Deine persönliche Analyse', en: 'Your Personal Analysis' },
    dateiPrefix: { de: 'Analyse', en: 'Analysis' },
    engine: { numerologie: false, astrologie: false, crowley: false, humandesign: true },
    konstellationen: ['einzel'],   // freie HD-Frage, vorerst eine Person
  },
];

// Labels fuer Stufe 1 und 2 (UI-Texte).
export const SYSTEM_LABELS = {
  numerologie: { de: 'Numerologie', en: 'Numerology', icon: '✶',
    desc: { de: 'Zahlen, Namen, Lebenszyklen und Astrologie als Fundament.',
            en: 'Numbers, names, life cycles and astrology as foundation.' } },
  humandesign: { de: 'Human Design', en: 'Human Design', icon: '✦',
    desc: { de: 'Der vollstaendige BodyGraph aus exakter Geburtszeit. Eigenstaendig.',
            en: 'The full BodyGraph from exact birth time. Standalone.' } },
};
export const ART_LABELS = {
  standard: { de: 'Vollständige Analyse', en: 'Full analysis', icon: '◎',
    desc: { de: 'Die komplette Tiefenanalyse mit allen Sektionen.',
            en: 'The complete in-depth analysis with all sections.' } },
  individuell: { de: 'Individuelle Analyse', en: 'Individual analysis', icon: '✎',
    desc: { de: 'Ein gezielter, frei formulierter Auftrag. Zahlen und Astro laufen als Fundament mit.',
            en: 'A focused, freely worded commission. Numbers and astro run as foundation.' } },
  kurzprofil: { de: 'Kurzprofil', en: 'Short profile', icon: '⚡',
    desc: { de: 'Kompakt auf zwei Seiten: Muster, Verhalten, Umgang. Nur Geburtsdatum noetig.',
            en: 'Compact, two pages: patterns, behaviour, how to engage. Only birth date needed.' } },
};

// ── 2. KONSTELLATIONEN (Stufe 3 — setzt intern constellation + relationshipType) ──
export const KONSTELLATIONEN = [
  { id: 'einzel', gruppe: 'einzel', constellation: 'solo', relType: null,
    label: { de: 'Einzelperson', en: 'Single person' }, empfohleneThemen: [] },

  { id: 'paar', gruppe: 'mehrere', constellation: 'pair', relType: 'partnerschaft',
    label: { de: 'Paar (Liebe)', en: 'Couple (love)' },
    empfohleneThemen: ['beziehung', 'kommunikation', 'werte', 'zukunft'] },

  { id: 'geschaeftspartner', gruppe: 'mehrere', constellation: 'pair', relType: 'geschaeftspartnerschaft',
    label: { de: 'Geschäftspartner', en: 'Business partners' },
    empfohleneThemen: ['zusammenarbeit', 'geld', 'konflikt', 'werte'] },

  { id: 'chef_ma', gruppe: 'mehrere', constellation: 'pair', relType: 'vorgesetzte',
    label: { de: 'Chef & Mitarbeiter', en: 'Manager & employee' },
    empfohleneThemen: ['zusammenarbeit', 'kommunikation', 'konflikt'] },

  { id: 'kollegium', gruppe: 'mehrere', constellation: 'pair', relType: 'kollegium',
    label: { de: 'Kollegium / Team', en: 'Team' },
    empfohleneThemen: ['zusammenarbeit', 'kommunikation', 'konflikt'] },

  { id: 'geschwister', gruppe: 'mehrere', constellation: 'pair', relType: 'geschwister',
    label: { de: 'Geschwister', en: 'Siblings' },
    empfohleneThemen: ['beziehung', 'familie', 'konflikt'] },

  { id: 'elternkind', gruppe: 'mehrere', constellation: 'pair', relType: 'elternkind',
    label: { de: 'Eltern & Kind', en: 'Parent & child' },
    empfohleneThemen: ['beziehung', 'familie', 'kommunikation'] },

  { id: 'familie', gruppe: 'mehrere', constellation: 'family', relType: null,
    label: { de: 'Familie', en: 'Family' },
    empfohleneThemen: ['beziehung', 'familie', 'kommunikation'] },

  { id: 'solo_kinder', gruppe: 'mehrere', constellation: 'solo_children', relType: null,
    label: { de: 'Alleinerziehend + Kind(er)', en: 'Single parent + child(ren)' },
    empfohleneThemen: ['beziehung', 'familie', 'zukunft'] },
];

// ── 3. THEMEN (Stufe 4 — freie Mehrfachauswahl) ─────────────────────────────
export const THEMEN = [
  { id: 'beziehung',      label: { de: 'Beziehung & Nähe',        en: 'Relationship & closeness' } },
  { id: 'kommunikation',  label: { de: 'Kommunikation',           en: 'Communication' } },
  { id: 'zusammenarbeit', label: { de: 'Beruf & Zusammenarbeit',  en: 'Work & collaboration' } },
  { id: 'geld',           label: { de: 'Geld & Verbindlichkeit',  en: 'Money & commitment' } },
  { id: 'konflikt',       label: { de: 'Konflikt & Spannung',     en: 'Conflict & tension' } },
  { id: 'werte',          label: { de: 'Werte & Lebenssinn',      en: 'Values & meaning' } },
  { id: 'familie',        label: { de: 'Familie & Herkunft',      en: 'Family & origin' } },
  { id: 'zukunft',        label: { de: 'Zukunft & Timing',        en: 'Future & timing' } },
];

// ── HELFER (die Funnel-Logik, damit index.js duenn bleibt) ──────────────────

// Stufe 1: alle Systeme in stabiler Reihenfolge.
export function getSystems() {
  const seen = [];
  for (const r of REPORTS) if (!seen.includes(r.system)) seen.push(r.system);
  return seen;
}

// Stufe 2: Arten eines Systems. Leer/Einzel -> Stufe entfaellt.
export function getArten(system) {
  return REPORTS.filter(r => r.system === system && r.art).map(r => r.art);
}
export function artStufeEntfaellt(system) {
  return getArten(system).length <= 1;
}

// Report aufloesen. Bei Systemen ohne Art (HD) wird art ignoriert.
export function getReport(system, art) {
  const arten = getArten(system);
  if (arten.length <= 1) return REPORTS.find(r => r.system === system) || null;
  return REPORTS.find(r => r.system === system && r.art === art) || null;
}

// Stufe 3: erlaubte Konstellationen eines Reports, fertig gruppiert.
export function getKonstellationen(report) {
  if (!report) return { einzel: [], mehrere: [] };
  const ids = report.konstellationen || [];
  const list = KONSTELLATIONEN.filter(k => ids.includes(k.id));
  return {
    einzel: list.filter(k => k.gruppe === 'einzel'),
    mehrere: list.filter(k => k.gruppe === 'mehrere'),
  };
}
export function getKonstellation(id) {
  return KONSTELLATIONEN.find(k => k.id === id) || null;
}

// Stufe 4: THEMEN, empfohlene zuerst. preselected = die empfohlenen.
export function getThemenSortiert(konstId) {
  const k = getKonstellation(konstId);
  const empf = (k && k.empfohleneThemen) || [];
  const rest = THEMEN.filter(t => !empf.includes(t.id)).map(t => t.id);
  const order = [...empf, ...rest];
  return {
    order,
    preselected: empf,
    map: Object.fromEntries(THEMEN.map(t => [t.id, t])),
  };
}

// Auswahl -> bestehender state. Das ist die ganze Bruecke zum alten Code.
export function applyToState(state, { system, art, konstId, themen }, lang = 'de') {
  const report = getReport(system, art);
  if (report) state.mode = report.mode;
  const k = getKonstellation(konstId);
  if (k) {
    state.constellation = k.constellation;
    if (k.relType) state.relationshipType = k.relType;
  }
  if (Array.isArray(themen)) state.themes = themen.slice();
  return report;
}

// Titel/Dateiname aufloesen (HD hat einzel/mehrere-Varianten).
export function resolveTitel(report, konstId, lang = 'de') {
  if (!report) return '';
  const t = report.titel[lang] || report.titel.de;
  if (typeof t === 'string') return t;
  const k = getKonstellation(konstId);
  const gruppe = (k && k.gruppe === 'mehrere') ? 'mehrere' : 'einzel';
  return t[gruppe] || t.einzel;
}
