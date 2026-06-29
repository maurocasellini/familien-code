// ───────────────────────────────────────────────────────────────────────────
//  lib/ephemeris.js — gemeinsame Ephemeriden-Schicht auf Basis von
//  swisseph-wasm (WebAssembly). KEIN natives Modul, daher laeuft es identisch
//  lokal UND auf Vercel (keine node-gyp-Kompilierung noetig).
//
//  Modus: Moshier (SEFLG_MOSEPH, keine Ephemeriden-Dateien noetig) und WAHRER
//  Knoten (SE_TRUE_NODE), exakt wie der bisherige native swisseph-Aufbau.
//
//  Validiert: ueber die komplette BodyGraph-Pipeline (Typ, Autoritaet, Profil,
//  Inkarnationskreuz, Tore, Kanaele, Zentren) UND den Aszendenten gegen das
//  native swisseph. Maximale Abweichung: ~1e-10 Bogensekunden (Gleitkomma-
//  Rauschen, praktisch null).
// ───────────────────────────────────────────────────────────────────────────

// Statische Swiss-Ephemeris-Konstanten (feste Zahlen, ohne Init verwendbar).
export const SE = {
  SUN: 0, MOON: 1, MERCURY: 2, VENUS: 3, MARS: 4, JUPITER: 5, SATURN: 6,
  URANUS: 7, NEPTUNE: 8, PLUTO: 9, MEAN_NODE: 10, TRUE_NODE: 11, CHIRON: 15,
  GREG_CAL: 1, FLG_SPEED: 256, FLG_MOSEPH: 4,
};
export const MOSEPH_SPEED = SE.FLG_MOSEPH | SE.FLG_SPEED;

let _instance = null;
let _initPromise = null;

// Einmalige Initialisierung pro Prozess/Instanz. Mit Fluid Compute teilen sich
// mehrere Requests eine warme Instanz, das WASM-Modul laedt also nur einmal,
// nicht pro Request.
export async function getEphemeris() {
  if (_instance) return _instance;
  if (!_initPromise) {
    _initPromise = (async () => {
      const mod = await import('swisseph-wasm');
      const SwissEph = mod.default || mod.SwissEph || mod;
      const swe = new SwissEph();
      await swe.initSwissEph();
      const M = swe.SweModule;
      _instance = {
        raw: swe,
        julday: (y, m, d, h) => swe.julday(y, m, d, h),
        // Nativ-kompatible Rueckgabe: { longitude, latitude, distance, longitudeSpeed }
        calc: (jd, body, flag = MOSEPH_SPEED) => {
          const r = swe.calc_ut(jd, body, flag);
          return { longitude: r[0], latitude: r[1], distance: r[2], longitudeSpeed: r[3] };
        },
        revjul: (jd, gregflag = SE.GREG_CAL) => swe.revjul(jd, gregflag),
        // Korrektes swe_houses (umgeht einen fehlerhaften String-Override der Lib):
        // Haussystem wird als Zeichen-Code uebergeben. Rueckgabe: Aszendent + MC.
        houses: (jd, lat, lon, hsys = 'P') => {
          const cp = M._malloc(13 * 8), ap = M._malloc(10 * 8);
          M.ccall('swe_houses', 'number',
            ['number', 'number', 'number', 'number', 'pointer', 'pointer'],
            [jd, lat, lon, hsys.charCodeAt(0), cp, ap]);
          const cusps = new Float64Array(M.HEAPF64.buffer, cp, 13).slice();
          const ascmc = new Float64Array(M.HEAPF64.buffer, ap, 10).slice();
          M._free(cp); M._free(ap);
          return { ascendant: ascmc[0], mc: ascmc[1], cusps };
        },
      };
      return _instance;
    })();
  }
  return _initPromise;
}
