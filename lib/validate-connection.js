// validate-connection.js
//
// Zwei Stufen:
//   1) Synthetischer Selbsttest gegen von Hand gerechnete Sollwerte (laeuft sofort).
//   2) Realer Abgleich gegen Genetic Matrix - Gate-Listen unten eintragen.
//
// Aufruf:  node validate-connection.js

const { connectionChart, TYPE } = require('./connectionChart');

function line(t = '') { console.log(t); }
function ok(b) { return b ? 'OK ' : 'FEHLER '; }

// ===========================================================================
// STUFE 1 - Synthetischer Selbsttest
// ===========================================================================
// Person A und B sind so konstruiert, dass jeder Klassifikationstyp vorkommt
// und am Ende zwei Zentren NEU im Paar entstehen (Wurzel + Solarplexus ueber
// den elektromagnetischen Kanal 19-49).

const A = [1, 8, 11, 56, 34, 57, 20, 25, 51, 19];
const B = [8, 43, 23, 57, 10, 25, 51, 49];

// Von Hand gerechnetes Soll:
//   1-8   : A voll(1,8), B halb(8)        -> kompromiss
//   11-56 : A voll, B nichts              -> dominanz (A)
//   20-57 : A voll(20,57), B halb(57)     -> kompromiss
//   34-57 : A voll(34,57), B halb(57)     -> kompromiss
//   10-57 : A halb(57), B voll(10,57)     -> kompromiss
//   20-34 : A voll, B nichts              -> dominanz (A)
//   10-20 : A halb(20), B halb(10), diff  -> elektromagnetisch
//   10-34 : A halb(34), B halb(10), diff  -> elektromagnetisch
//   23-43 : A nichts, B voll(23,43)       -> dominanz (B)
//   25-51 : A voll, B voll                -> gefaehrtenschaft
//   19-49 : A halb(19/Wurzel), B halb(49/SP), diff -> elektromagnetisch
//
// Erwartet: elektromagnetisch 3, gefaehrtenschaft 1, dominanz 3, kompromiss 4
//           newlyDefined: Solarplexus, Wurzel

const expected = {
  [TYPE.ELECTROMAGNETIC]: 3,
  [TYPE.COMPANIONSHIP]: 1,
  [TYPE.DOMINANCE]: 3,
  [TYPE.COMPROMISE]: 4,
};
const expectedNew = ['Solarplexus', 'Wurzel'].sort();

const res = connectionChart(A, B, { labelA: 'A', labelB: 'B' });

line('=== STUFE 1: Synthetischer Selbsttest ===');
line();
line('Kanaele (Typ):');
for (const ch of res.channels) {
  line(`  ${ch.channel.padEnd(7)} ${ch.name.padEnd(18)} ${ch.type}`);
}
line();

let allOk = true;
line('Zusammenfassung (Ist vs Soll):');
for (const t of Object.keys(expected)) {
  const got = res.summary[t];
  const want = expected[t];
  const good = got === want;
  allOk = allOk && good;
  line(`  ${ok(good)}${t.padEnd(18)} ist=${got} soll=${want}`);
}
line();

const gotNew = [...res.newlyDefined].sort();
const newOk = JSON.stringify(gotNew) === JSON.stringify(expectedNew);
allOk = allOk && newOk;
line(`  ${ok(newOk)}newlyDefined ist=[${gotNew.join(', ')}] soll=[${expectedNew.join(', ')}]`);
line();
line(`Verbundene Zentren: ${res.connectedCenters.join(', ')}`);
line(`Solo A: ${res.soloDefined.A.join(', ')}`);
line(`Solo B: ${res.soloDefined.B.join(', ')}`);
line();
line(allOk ? '>>> STUFE 1 BESTANDEN' : '>>> STUFE 1 FEHLGESCHLAGEN');
line();

// ===========================================================================
// STUFE 2 - Abgleich gegen Genetic Matrix
// ===========================================================================
// So gehst du vor:
//   1. Zwei bekannte Personen in Genetic Matrix als Connection Chart oeffnen.
//   2. Pro Person ALLE aktivierten Gates ablesen (Personality schwarz +
//      Design rot zusammen) und unten eintragen.
//   3. node validate-connection.js erneut laufen lassen.
//   4. Die ausgegebene Kanalliste mit den in Genetic Matrix hervorgehobenen
//      (durchgezogenen) Kanaelen vergleichen - Gate-Paare und Typ muessen
//      uebereinstimmen.
//
// WICHTIG fuer die true/mean-node Frage:
//   Node-Gates wandern je nach Einstellung. Kanaele, die ueber ein Node-Gate
//   laufen, sind der empfindlichste Test. Stimmt deine Engine hier mit Genetic
//   Matrix ueberein, stimmt deine Node-Einstellung.

const REAL_A = [];  // <- Gates Person 1 hier eintragen
const REAL_B = [];  // <- Gates Person 2 hier eintragen

if (REAL_A.length && REAL_B.length) {
  line('=== STUFE 2: Abgleich gegen Genetic Matrix ===');
  line();
  const real = connectionChart(REAL_A, REAL_B, { labelA: 'P1', labelB: 'P2' });
  line('Definierte Verbindungs-Kanaele laut Engine:');
  for (const ch of real.channels) {
    const who = ch.holders.full.length
      ? `voll: ${ch.holders.full.join('+')}`
      : `halb: ${ch.holders.half.join(' / ')}`;
    line(`  ${ch.channel.padEnd(7)} ${ch.type.padEnd(18)} (${who})`);
  }
  line();
  line('Zusammenfassung:');
  for (const [t, n] of Object.entries(real.summary)) line(`  ${t.padEnd(18)} ${n}`);
  line();
  line(`Verbundene Zentren: ${real.connectedCenters.join(', ')}`);
  line(`Neu im Paar:        ${real.newlyDefined.join(', ') || '(keine)'}`);
  line();
  line('-> Jetzt jede Zeile mit Genetic Matrix vergleichen.');
} else {
  line('(Stufe 2 uebersprungen - REAL_A / REAL_B noch leer.)');
}
