import Head from 'next/head'
import { useEffect } from 'react'
import { getReport, artStufeEntfaellt } from '../lib/registry'

export default function Home() {
  useEffect(() => {
    // ── STATE ──────────────────────────────────────────────────────
    const state = {
      constellation: '',
      focus: '',
      childCount: 1,
      lead: { name: '', email: '' },  // Lead-Gate
      ancestry: { include: false },    // Ahnenlinie (optional, Mutter + Vater)
      language: 'de',                  // Output-Sprache: 'de' | 'en' | 'pt' (UI bleibt Deutsch)
      depth: 15,                       // Zielseiten 5-40, beeinflusst Token-Budget + Sektionslängen
      relationshipType: 'partnerschaft', // Personenvergleich: Beziehungstyp (nur bei Konstellation 'pair')
      themes: [],                      // Personenvergleich: gewählte Vergleichs-Themen (max 5, Presets + eigene)
      disabledSections: [],            // Vollanalyse: optional abgewählte Sektionen (default: alle an)
      ritual: false,                   // Optionales Add-on: Ritual & Affirmationen anhängen
      mode: 'full',                    // 'full' = vollständige Analyse | 'individual' = freier Auftrag
      system: '',                      // Stufe 1: 'numerologie' | 'humandesign' (befuellt mode via Registry)
      art: '',                         // Stufe 2: 'standard' | 'individuell' (nur Numerologie)
      auftragPreset: '',               // gewähltes Preset im Individuell-Modus
      auftragAstro: true,              // Astrologie-Layer im Individuell-Modus
      analysisDate: '',                // zentrales Stichdatum der Analyse (leer = heute); steuert PJ, PM, Persönlicher Tag, Alter, Zyklen
    };

    // ── PERSONENVERGLEICH: BEZIEHUNGSTYPEN (nur bei Konstellation 'pair') ──
    // "gerichtet" = Du-Form-Gebrauchsanweisung an Person 1 ueber Person 2.
    const BEZ_TYPEN = {
      partnerschaft: {
        label: 'Liebespartnerschaft', gerichtet: false,
        fokus: 'Intimitaet, Naehe und Freiheit, gemeinsamer Alltag, langfristige Bindung',
        frage: 'Wie nah duerfen sie sich kommen, ohne sich selbst zu verlieren?',
        sektionTitel: 'Beziehungsdynamik der Partnerschaft',
        unterAbschnitte: [
          ['Resonanz und Anziehung', 'Was die beiden numerologisch zueinander zieht (Seelendrang, Lebenszahl).'],
          ['Naehe und Freiraum', 'Wie viel Verschmelzung, wie viel Eigenraum jede Person braucht (Persoenlichkeit, Ausdruck).'],
          ['Reibung und Wachstum', 'Wo die Zahlen aneinander reiben und was daraus reifen kann.'],
          ['Gemeinsame Richtung', 'Welches gemeinsame Thema die Verbindung traegt (Kompatibilitaetszahl, Schluesseldaten).'],
        ],
      },
      geschaeftspartnerschaft: {
        label: 'Geschaeftspartnerschaft', gerichtet: false,
        fokus: 'Rollenteilung, Entscheidungsfindung, Geld und Wachstum, Verbindlichkeit und Liefern',
        frage: 'Wer treibt, wer sichert, und wie treffen sie gemeinsam Entscheidungen?',
        sektionTitel: 'Dynamik der Geschaeftspartnerschaft',
        unterAbschnitte: [
          ['Rollenteilung', 'Wer Motor, wer Struktur ist (Lebenszahl, Ausdruck beider).'],
          ['Entscheidungen und Geld', 'Wie die beiden Entscheidungen faellen und mit Risiko und Geld umgehen.'],
          ['Liefern und dranbleiben', 'Wer anfaengt, wer abschliesst, wo Projekte versanden koennen.'],
          ['Bruchstellen', 'Die wahrscheinlichsten Konfliktpunkte und wie sie sich entschaerfen lassen.'],
        ],
      },
      freundschaft: {
        label: 'Freundschaft', gerichtet: false,
        fokus: 'Vertrauen, Gegenseitigkeit, gemeinsame Werte, Freiraum, Verlaesslichkeit ueber die Zeit',
        frage: 'Was haelt sie verbunden, wenn der Alltag an ihnen zieht?',
        sektionTitel: 'Dynamik der Freundschaft',
        unterAbschnitte: [
          ['Gemeinsamer Boden', 'Welche geteilten Werte und Resonanzen die Freundschaft tragen.'],
          ['Was jede einbringt', 'Was jede Person numerologisch in die Freundschaft einbringt.'],
          ['Reibung und Distanz', 'Wo Spannungen entstehen und wie viel Naehe oder Distanz gut tut.'],
          ['Ueber die Zeit', 'Was die Freundschaft langfristig traegt oder gefaehrdet.'],
        ],
      },
      vorgesetzte: {
        label: 'Vorgesetzte Person', gerichtet: true,
        fokus: 'Umgang mit der vorgesetzten Person, Erwartungen lesen, Anerkennung, Spielraum, Konflikt',
        frage: 'Wie gehst du klug mit dieser vorgesetzten Person um?',
        sektionTitel: 'Umgang mit deiner vorgesetzten Person',
        unterAbschnitte: [
          ['Wer deine vorgesetzte Person wirklich ist', 'Lebenszahl und Seelendrang der zweiten Person als Schluessel zu ihrem Wesen.'],
          ['Wie du auf sie zugehst', 'Konkrete Hinweise, wie du dich verstaendlich machst und Vertrauen aufbaust.'],
          ['Was bei ihr nicht funktioniert', 'Welche Verhaltensweisen bei ihr auf Widerstand stossen.'],
          ['Anerkennung und Spielraum', 'Wie du Anerkennung bekommst und dir Freiraum sicherst.'],
          ['Im Konflikt', 'Wie du Spannungen mit ihr deeskalierst.'],
        ],
      },
      mitarbeitende: {
        label: 'Mitarbeitende Person', gerichtet: true,
        fokus: 'Fuehrung, Motivation, Staerken nutzen, Feedback, Grenzen setzen',
        frage: 'Wie fuehrst und motivierst du diese Person am besten?',
        sektionTitel: 'Fuehrung dieser mitarbeitenden Person',
        unterAbschnitte: [
          ['Wer diese Person wirklich ist', 'Lebenszahl und Seelendrang als Schluessel zu ihrer Motivation.'],
          ['Wie du sie motivierst', 'Was sie antreibt und wie du das nutzt.'],
          ['Wo ihre Staerken liegen', 'Welche Aufgaben ihr liegen (Ausdruck, Persoenlichkeit).'],
          ['Feedback und Grenzen', 'Wie du Rueckmeldung gibst und klar fuehrst, ohne sie zu verlieren.'],
          ['Im Konflikt', 'Wie du Spannungen mit ihr klaerst.'],
        ],
      },
      kollegium: {
        label: 'Kollegium / Team', gerichtet: false,
        fokus: 'Zusammenarbeit auf Augenhoehe, Rollen im Team, Reibung, gemeinsame Wirksamkeit',
        frage: 'Wie arbeiten die beiden auf Augenhoehe am besten zusammen?',
        sektionTitel: 'Dynamik im Kollegium',
        unterAbschnitte: [
          ['Rollen im Zusammenspiel', 'Welche Rolle jede Person natuerlich einnimmt.'],
          ['Wo es rund laeuft', 'Welche Aufgaben die beiden gut gemeinsam stemmen.'],
          ['Reibungsflaechen', 'Wo Arbeitsstile kollidieren und wie sich das loesen laesst.'],
          ['Gemeinsame Wirksamkeit', 'Was die beiden zusammen erreichen koennen.'],
        ],
      },
      geschwister: {
        label: 'Geschwister', gerichtet: false,
        fokus: 'Gewachsene Bindung, Rollen aus der Kindheit, Loyalitaet, Abgrenzung, Familienthemen',
        frage: 'Welche Rollen tragen sie aus der gemeinsamen Geschichte weiter?',
        sektionTitel: 'Geschwisterdynamik',
        unterAbschnitte: [
          ['Geteilte Wurzeln', 'Was die beiden aus dem gemeinsamen System teilen.'],
          ['Rollen aus der Kindheit', 'Welche Rollen jede Person eingenommen hat und heute noch traegt.'],
          ['Naehe und Abgrenzung', 'Wie Loyalitaet und eigener Weg sich ausbalancieren.'],
          ['Was heilen will', 'Welche Themen zwischen ihnen reifen oder sich loesen koennen.'],
        ],
      },
      elternkind: {
        label: 'Eltern und Kind', gerichtet: true,
        fokus: 'Wesen des Kindes verstehen, Beduerfnisse lesen, Begleitung, Reibung, Foerderung',
        frage: 'Wie begleitest du dieses Kind seinem Wesen gemaess?',
        sektionTitel: 'Begleitung dieses Kindes',
        unterAbschnitte: [
          ['Wer dieses Kind wirklich ist', 'Lebenszahl und Seelendrang als Schluessel zum Wesen des Kindes.'],
          ['Was es braucht', 'Welche Beduerfnisse aus seinen Zahlen sprechen.'],
          ['Wie du es begleitest', 'Konkrete Hinweise zur Begleitung im Alltag.'],
          ['Wo Reibung entsteht', 'Wo eure Energien sich reiben und wie du damit umgehst.'],
          ['Was du foerderst', 'Welche Begabungen du staerken kannst.'],
        ],
      },
    };

    function bezDynamikSektion(relType, nameA, nameB) {
      const bt = BEZ_TYPEN[relType] || BEZ_TYPEN.partnerschaft;
      const subs = bt.unterAbschnitte.map(([t, a]) => '   - ' + t + ': ' + a).join('\n');
      const minLen = Math.max(1500, bt.unterAbschnitte.length * 350);
      const anrede = bt.gerichtet
        ? ('Schreibe diese Sektion durchgehend in der Du-Form an ' + nameA + ' als Gebrauchsanweisung fuer den Umgang mit ' + nameB + '. KEINE gleichwertige Doppelbeschreibung, der Fokus liegt auf ' + nameA + 's Umgang mit ' + nameB + '.')
        : ('Beschreibe beide Personen (' + nameA + ' und ' + nameB + ') gleichwertig und gleich ausfuehrlich.');
      return '3. ' + bt.sektionTitel + ', mindestens ' + minLen + ' Woerter, mit [DYNAMIK:' + nameA + '|Zahl|' + nameB + '|Zahl|Resonanz-Text] und ausfuehrlichem Fliesstext. Gliedere in folgende Unterabschnitte mit eigenen Zwischenueberschriften:\n' + subs + '\n' + anrede;
    }

    // ── PERSONENVERGLEICH: THEMEN (Mehrfachauswahl, max 5, + eigene) ──
    const THEME_PRESETS = [
      'Beziehung & Naehe', 'Kommunikation', 'Beruf & Zusammenarbeit', 'Geld & Verbindlichkeit',
      'Konflikt & Spannung', 'Werte & Lebenssinn', 'Familie & Herkunft', 'Zukunft & Timing',
    ];
    const MAX_THEMES = 5;

    // ── OPTIONALE MODUL-ABWAHL (Vollanalyse) — default alles AN ──
    // Gruppe 1 (Fundament & Kern: zentraler Code, Lebensweg, Namen-Numerologie,
    // Herausforderung & Schluessel, Essenz) bleibt IMMER aktiv und ist hier
    // bewusst nicht gelistet. Label = exakter Sektionstitel (fuer die Abwahl-Instruktion).
    const SECTION_OPTIONS = [
      ['pinnacles', 'Pinnacles & Challenges'],
      ['layer_a', 'Erweiterte Zahlenebenen (Layer A)'],
      ['layer_b', 'Essence Transit (Layer B)'],
      ['astro_tiefe', 'Astrologische Tiefe (Layer C)'],
      ['achsen', 'Die vier Achsen (AC/DC/MC/IC)'],
      ['layer_g', 'Lebensaufgabe & Seelenauftrag (Layer G)'],
      ['layer_h', 'Beruf & Berufung (Layer H)'],
      ['layer_i', 'Beziehungen & Partnerschaft (Layer I)'],
      ['layer_j', 'Geld & Wohlstand (Layer J)'],
      ['layer_m', 'Schatten & Wachstum (Layer M)'],
      ['pj', ['Aktuelles Persönliches Jahr im Detail', 'Nächstes Persönliches Jahr']],
      ['jahresenergien', 'Jahresenergien-Tabelle über 6 Jahre'],
      ['tag_heute', 'Persönlicher Tag am Analysedatum (Layer E)'],
      ['kosmische_zyklen', 'Kosmische Zyklen: Saturn & Jupiter (Layer F)'],
      ['layer_k', 'Aktuelle Transite, 12 Monate (Layer K)'],
      ['layer_l', 'Lebenszyklen & Wendepunkte (Layer L)'],
      ['layer_o', 'Entscheidungsradar (Layer O)'],
    ];

    function updateThemeUI() {
      const counter = document.getElementById('theme-counter');
      if (counter) counter.textContent = state.themes.length + ' von ' + MAX_THEMES;
      document.querySelectorAll('#theme-grid .select-card').forEach(c => {
        c.classList.toggle('selected', state.themes.includes(c.dataset.value));
      });
      const full = state.themes.length >= MAX_THEMES;
      const addBtn = document.getElementById('btn-add-theme');
      const input = document.getElementById('theme-custom-input');
      if (addBtn) addBtn.disabled = full;
      if (input) input.disabled = full;
    }

    function renderThemeChips() {
      const wrap = document.getElementById('theme-chips');
      if (!wrap) return;
      const customs = state.themes.filter(t => !THEME_PRESETS.includes(t));
      wrap.innerHTML = customs.map(t =>
        '<span class="theme-chip" style="display:inline-flex;align-items:center;gap:6px;background:var(--rose-pale);border:1px solid var(--rose-light);border-radius:999px;padding:6px 14px;font-size:0.9rem;color:var(--ink);">'
        + esc(t)
        + '<button class="theme-chip-x" data-remove-theme="' + esc(t) + '" style="background:none;border:none;cursor:pointer;font-size:1.05rem;line-height:1;color:var(--rose);padding:0;">×</button></span>'
      ).join('');
    }

    function toggleThemePreset(card) {
      const v = card.dataset.value;
      const i = state.themes.indexOf(v);
      if (i >= 0) state.themes.splice(i, 1);
      else { if (state.themes.length >= MAX_THEMES) return; state.themes.push(v); }
      updateThemeUI();
    }

    function addCustomTheme() {
      const input = document.getElementById('theme-custom-input');
      if (!input) return;
      const v = input.value.trim().replace(/["'<>]/g, '');
      if (!v) return;
      if (state.themes.length >= MAX_THEMES) return;
      if (state.themes.includes(v)) { input.value = ''; return; }
      state.themes.push(v);
      input.value = '';
      renderThemeChips();
      updateThemeUI();
    }

    function removeTheme(label) {
      const i = state.themes.indexOf(label);
      if (i >= 0) state.themes.splice(i, 1);
      renderThemeChips();
      updateThemeUI();
    }

    // ── AUFTRAGS-PRESETS (Individuelle Analyse) ────────────────────
    const AUFTRAG_PRESETS = {
      individual:    { label: 'Individueller Auftrag', icon: '✎', desc: 'Frei formulieren, was analysiert werden soll', prefill: '' },
      frage:         { label: 'Persönliche Frage', icon: '?', desc: 'Eine konkrete Frage der Person zu sich selbst — frei eintragen', prefill: '' },
      jahresprognose:{ label: 'Jahresprognose', icon: '◬', desc: 'Das kommende Persönliche Jahr, Monat für Monat', prefill: 'Erstelle eine ausführliche Jahresprognose für das kommende Persönliche Jahr, Monat für Monat: die Hauptthemen, Chancen, Achtsamkeiten und günstige Zeitfenster.' },
      berufung:      { label: 'Berufung & Karriere', icon: '◈', desc: 'Welcher Weg zu Zahlen, Stärken & Timing passt', prefill: 'Analysiere Berufung und beruflicher Weg: welche Tätigkeiten und Umfelder zu den Zahlen und Stärken dieser Person passen, und was das aktuelle Timing nahelegt.' },
      entscheidung:  { label: 'Entscheidungshilfe', icon: '⟁', desc: 'Eine konkrete Weggabelung durchleuchten', prefill: 'Beleuchte die folgende Entscheidung durch die aktuellen Zyklen und die Kernzahlen: ' },
      timing:        { label: 'Günstiges Timing', icon: '◷', desc: 'Bester Zeitpunkt für ein Vorhaben', prefill: 'Bestimme das günstigste Timing für das folgende Vorhaben anhand der Jahres-, Monats- und Tageszyklen: ' },
      namen:         { label: 'Namensanalyse / Namenswahl', icon: '✦', desc: 'Baby-, Künstler- oder Firmenname', prefill: 'Analysiere den folgenden Namen numerologisch (Klang, Zahlen, Wirkung) und bewerte seine Eignung: ' },
      beziehung:     { label: 'Beziehungsfrage', icon: '♡', desc: 'Eine fokussierte Frage zu einer Beziehung', prefill: 'Beantworte die folgende Frage zu einer bestimmten Beziehung dieser Person: ' },
      lebensthema:   { label: 'Lebensthema / Muster', icon: '↻', desc: 'Warum etwas immer wiederkehrt', prefill: 'Analysiere ein wiederkehrendes Lebensmuster über Karma-Lektionen und Pinnacles: ' },
      bestimmung:    { label: 'Seelenaufgabe & Bestimmung', icon: '✶', desc: 'Tiefen-Dive Lebenssinn', prefill: 'Erstelle einen Tiefen-Dive zu Seelenaufgabe und Bestimmung dieser Person (Meisterzahlen, Mondknoten, Lebensthema).' },
      uebergang:     { label: 'Übergang & Neuanfang', icon: '◠', desc: 'Begleitung durch eine Lebensphase', prefill: 'Begleite diese Person durch einen aktuellen Übergang (Abschluss, Krise oder Neuanfang) über den 9er-Zyklus und die aktuellen Energien: ' },
    };

    // ── FLOW ───────────────────────────────────────────────────────
    function getFlow() {
      // Stufe 1 = System (Screen 'mode'), Stufe 2 = Art (Screen 'art', entfaellt bei HD).
      let front = ['splash', 'mode'];
      if (state.system && !artStufeEntfaellt(state.system)) front.push('art');

      // mode aus System+Art ableiten; solange unvollstaendig: nur die Frontstufen zeigen.
      const report = getReport(state.system, state.art);
      const mode = report ? report.mode : null;
      if (!report) return front;

      if (mode === 'humandesign') {
        // HD kann Einzel oder Paar (Connection Chart). Familie/Alleinerziehend
        // noch nicht (Penta/Composite kuenftig). Konstellation waehlbar.
        const hdPair = state.constellation === 'pair';
        let f = [...front, 'constellation', 'person1'];
        if (hdPair) f.push('person2', 'vergleich');
        f.push('loading', 'result');
        return f;
      }
      if (mode === 'individual') {
        return [...front, 'person1', 'auftrag', 'loading', 'result'];
      }
      if (mode === 'humandesign_individual') {
        return [...front, 'person1', 'auftrag', 'loading', 'result'];
      }
      if (mode === 'kurzprofil') {
        return [...front, 'person1', 'loading', 'result'];
      }
      const hasPair = state.constellation === 'pair' || state.constellation === 'family';
      const hasKids = state.constellation === 'family' || state.constellation === 'solo_children';
      let f = [...front, 'constellation', 'person1'];
      if (hasPair) f.push('person2');
      if (state.constellation === 'pair') f.push('vergleich');
      if (hasPair) f.push('couple');
      if (hasKids) f.push('children');
      f.push('ancestry', 'depth', 'focus', 'loading', 'result');
      return f;
    }

    let cur = 'splash';

    function showScreen(id) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const el = document.getElementById('screen-' + id);
      if (!el) return;
      el.classList.add('active');
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
      cur = id;
      window.scrollTo(0, 0);
      // Person 2 heisst beim Personenvergleich "Vergleichsperson"
      if (id === 'person2') {
        const isCmp = state.constellation === 'pair';
        const set = (elId, txt) => { const e2 = document.getElementById(elId); if (e2) e2.textContent = txt; };
        set('p2-eyebrow', isCmp ? 'Schritt 3 · Vergleichsperson' : 'Schritt 3 von 6 · Partner:in');
        set('p2-h2', isCmp ? 'Vergleichsperson' : 'Partner:in');
        set('p2-sectitle', isCmp ? 'Angaben Vergleichsperson' : 'Angaben Partner:in');
        set('p2-nc-label', isCmp ? 'Vergleichsperson hat den Namen geändert (z. B. nach Heirat)' : 'Partner:in hat den Namen geändert (z. B. nach Heirat)');
      }
      // Human Design kann (noch) nur Einzel oder Paar: Familie/Alleinerziehend
      // auf dem Konstellations-Screen ausblenden, sonst wieder einblenden.
      // Kurzprofil gibt es nur fuer Numerologie -> Karte bei Human Design ausblenden.
      if (id === 'art') {
        const isHd = state.system === 'humandesign';
        const kp = document.querySelector('#screen-art .select-card[data-value="kurzprofil"]');
        if (kp) kp.style.display = isHd ? 'none' : '';
      }
      if (id === 'constellation') {
        const hd = state.mode === 'humandesign';
        ['family', 'solo_children'].forEach(v => {
          const card = document.querySelector(`#screen-constellation .select-card[data-value="${v}"]`);
          if (card) card.style.display = hd ? 'none' : '';
        });
        // Falls bei HD eine nicht erlaubte Konstellation aktiv war: zuruecksetzen.
        if (hd && (state.constellation === 'family' || state.constellation === 'solo_children')) {
          state.constellation = '';
          document.querySelectorAll('#screen-constellation .select-card').forEach(c => c.classList.remove('selected'));
          const btn = document.getElementById('btn-constellation-next');
          if (btn) btn.disabled = true;
        }
      }
      // Vergleichs-Auswahl beim Betreten synchronisieren
      if (id === 'vergleich') { updateThemeUI(); renderThemeChips(); }
      // Bei mehreren Personen: Persönliches Jahr ist nicht waehlbar (entfaellt komplett)
      if (id === 'depth') {
        const multi = state.constellation === 'pair' || state.constellation === 'family' || state.constellation === 'solo_children';
        const pjRow = document.querySelector('.toggle-row[data-section="pj"]');
        if (pjRow) pjRow.style.display = multi ? 'none' : '';
        if (multi && !state.disabledSections.includes('pj')) state.disabledSections.push('pj');
        if (!multi) { const i = state.disabledSections.indexOf('pj'); if (i >= 0) state.disabledSections.splice(i, 1); }
      }
      updateNav();
    }

    function updateNav() {
      const flow = getFlow();
      const idx = flow.indexOf(cur);
      const prog = document.getElementById('nav-progress');
      if (!prog) return; // Defensive: falls Element noch nicht da, später nochmal
      const steps = flow.filter(s => !['splash', 'loading', 'result'].includes(s));
      if (['splash', 'loading', 'result'].includes(cur)) {
        prog.innerHTML = '';
      } else {
        prog.innerHTML = steps.map((s) => {
          const si = flow.indexOf(s);
          let cls = 'nav-step';
          if (si < idx) cls += ' done';
          else if (si === idx) cls += ' active';
          return `<div class="${cls}"></div>`;
        }).join('');
      }
      const resetBtn = document.getElementById('nav-reset');
      if (resetBtn) resetBtn.style.display = (cur !== 'splash' && cur !== 'lead') ? '' : 'none';
    }

    function goNext() {
      try {
        const f = getFlow(), i = f.indexOf(cur);
        console.log('[FC] goNext from', cur, '→', f[i+1] || '(end)');
        if (i < f.length - 1) {
          if (f[i + 1] === 'loading') { startAnalysis(); return; }
          showScreen(f[i + 1]);
        }
      } catch (err) {
        console.error('[FC] goNext crash:', err);
        alert('Navigation-Fehler: ' + err.message);
      }
    }

    function goBack() {
      try {
        const f = getFlow(), i = f.indexOf(cur);
        if (i > 0) showScreen(f[i - 1]);
      } catch (err) {
        console.error('[FC] goBack crash:', err);
      }
    }

    // ── CARDS ──────────────────────────────────────────────────────
    function selectCard(el, type) {
      el.closest('[class*="card-grid"]').querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      if (type === 'constellation') {
        state.constellation = el.dataset.value;
        const btn = document.getElementById('btn-constellation-next');
        if (btn) btn.disabled = false;
      } else if (type === 'focus') {
        state.focus = el.dataset.value;
        const btn = document.getElementById('btn-focus-next');
        if (btn) btn.disabled = false;
      } else if (type === 'system') {
        state.system = el.dataset.value;
        state.art = '';
        // Art-Screen zuruecksetzen (falls vorher schon eine Art gewaehlt war)
        document.querySelectorAll('#screen-art .select-card').forEach(c => c.classList.remove('selected'));
        const artBtn = document.getElementById('btn-art-next');
        if (artBtn) artBtn.disabled = true;
        // Bei Systemen ohne Art (HD): mode sofort ableiten. Sonst erst nach Art-Wahl.
        if (artStufeEntfaellt(state.system)) {
          const rep = getReport(state.system, null);
          state.mode = rep ? rep.mode : state.mode;
        } else {
          state.mode = '';
        }
        const btn = document.getElementById('btn-mode-next');
        if (btn) btn.disabled = false;
      } else if (type === 'art') {
        state.art = el.dataset.value;
        const rep = getReport(state.system, state.art);
        state.mode = rep ? rep.mode : state.mode;
        // Einzel-only Report (Individuell): Konstellation fix auf solo, kein Paar-Rest.
        if (rep && (rep.konstellationen || []).length === 1 && rep.konstellationen[0] === 'einzel') {
          state.constellation = 'solo';
        }
        const btn = document.getElementById('btn-art-next');
        if (btn) btn.disabled = false;
      } else if (type === 'reltype') {
        state.relationshipType = el.dataset.value;
      } else if (type === 'auftrag-preset') {
        state.auftragPreset = el.dataset.value;
        const ta = document.getElementById('auftrag-text');
        const preset = AUFTRAG_PRESETS[el.dataset.value];
        if (ta && preset) {
          if (el.dataset.value !== 'individual' && el.dataset.value !== 'frage') ta.value = preset.prefill;
          else ta.focus();
        }
        updateAuftragBtn();
      }
    }

    function updateAuftragBtn() {
      const btn = document.getElementById('btn-auftrag-next');
      if (!btn) return;
      const hasText = (document.getElementById('auftrag-text')?.value || '').trim().length > 0;
      const presetNeedsNoText = state.auftragPreset && state.auftragPreset !== 'individual' && state.auftragPreset !== 'frage';
      btn.disabled = !(hasText || presetNeedsNoText);
    }

    // ── LEAD GATE ──────────────────────────────────────────────────
    function validateLead() {
      const name = document.getElementById('lead-name')?.value.trim();
      const email = document.getElementById('lead-email')?.value.trim();
      const btn = document.getElementById('btn-lead-next');
      if (!btn) return;
      const valid = name && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      btn.disabled = !valid;
    }

    function submitLead() {
      const name = document.getElementById('lead-name')?.value.trim();
      const email = document.getElementById('lead-email')?.value.trim();
      if (!name || !email) return;
      state.lead = { name, email };
      goNext();
    }

    // ── COMPATIBILITY NUMBER ────────────────────────────────────────
    function compatNum(lz1, lz2) {
      if (!lz1 || !lz2 || lz1 === 'n/a' || lz2 === 'n/a') return 'n/a';
      const sum = Number(lz1) + Number(lz2);
      return red(sum);
    }

    // ── NAME CHANGE ANALYSIS ────────────────────────────────────────
    const NAME_OCCASIONS = {
      adoption: 'Adoption',
      scheidung_eltern: 'Namensaenderung nach Scheidung der Eltern',
      wiederheirat_eltern: 'Wiederheirat eines Elternteils (Stiefname)',
      legitimation: 'Legitimation / Anerkennung (nachtraegliche Vaterschaft)',
      heirat_partnername: 'Heirat · Annahme des Partnernamens',
      heirat_doppelname: 'Heirat · Doppelname / Namensvereinigung',
      rueckkehr_geburtsname: 'Rueckkehr zum Geburtsnamen (Scheidung / Verwitwung)',
      behoerdlich_frei: 'Freie behoerdliche Namensaenderung',
      einbuergerung: 'Einbuergerung / Migration (neue Schreibweise)',
      transition: 'Geschlechtsangleichung / Transition',
      spitzname: 'Spitzname / Kosename im Alltag',
      kuenstlername: 'Kuenstlername / Pseudonym',
      kurzform: 'Kurzform des Vornamens',
      taufname: 'Tauf- oder Firmname',
      ordensname: 'Ordens-, Kloster- oder spiritueller Name',
    };
    function nameChangeBlock(prefix, label) {
      const firstName = val(`${prefix}-newname-first`);
      const middleName = val(`${prefix}-newname-middle`);
      const lastName = val(`${prefix}-newname-last`);
      if (!firstName && !middleName && !lastName) return '';
      const occKey = val(`${prefix}-newname-occasion`);
      const occLabel = NAME_OCCASIONS[occKey] || '';
      const full = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim();
      const n = nameNums(full);
      return `\n${label} — NEUER NAME: ${full}${occLabel ? `\n- Anlass: ${occLabel}` : ''}\n- Neue Ausdruckszahl: ${n.expression}\n- Neue Persönlichkeitszahl: ${n.personality}\n- Neue Seelendrang-Zahl: ${n.soul}`;
    }
    function toggleField(inputId, toggleId) {
      const input = document.getElementById(inputId);
      const box = document.getElementById(toggleId);
      if (!input || !box) return;
      const on = box.classList.toggle('on');
      input.disabled = on;
      if (on) input.value = '';
    }

    // ── FORMS ──────────────────────────────────────────────────────
    function personFormHTML(prefix) {
      return `
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Vorname/n (Taufname)</label>
            <input class="field-input" id="${prefix}-firstname" placeholder="Taufname/n" />
          </div>
          <div class="field-group">
            <label class="field-label">Nachname (Geburtsname)</label>
            <input class="field-input" id="${prefix}-lastname" placeholder="Nachname bei Geburt" />
          </div>
        </div>
        <div class="field-row-3">
          <div class="field-group">
            <label class="field-label">Geburtsdatum (TT.MM.JJJJ)</label>
            <input class="field-input" id="${prefix}-birthdate" placeholder="15.03.1988" />
          </div>
          <div class="field-group">
            <label class="field-label">Geburtszeit (HH:MM)</label>
            <input class="field-input" id="${prefix}-birthtime" placeholder="14:30" />
            <div class="toggle-row" data-toggle-input="${prefix}-birthtime" data-toggle-id="${prefix}-notime">
              <div class="toggle-box" id="${prefix}-notime"></div>
              <span class="toggle-label">Unbekannt</span>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Geburtsort</label>
            <input class="field-input" id="${prefix}-birthplace" placeholder="Stadt, Land" />
          </div>
        </div>`;
    }

    function childBlockHTML(i) {
      const p = `child${i}`;
      return `
        <div class="child-block" id="child-block-${i}">
          <div class="child-block-header">
            <div class="child-block-title">Kind ${i + 1}</div>
            ${i > 0 ? `<button class="btn-remove" data-remove-child="${i}">×</button>` : ''}
          </div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Vorname/n (Taufname)</label>
              <input class="field-input" id="${p}-firstname" placeholder="Taufname/n" />
            </div>
            <div class="field-group">
              <label class="field-label">Nachname (Geburtsname)</label>
              <input class="field-input" id="${p}-lastname" placeholder="Nachname bei Geburt" />
            </div>
          </div>
          <div class="field-row-3">
            <div class="field-group">
              <label class="field-label">Geburtsdatum (TT.MM.JJJJ)</label>
              <input class="field-input" id="${p}-birthdate" placeholder="15.03.2015" />
            </div>
            <div class="field-group">
              <label class="field-label">Geburtszeit (HH:MM)</label>
              <input class="field-input" id="${p}-birthtime" placeholder="14:30" />
              <div class="toggle-row" data-toggle-input="${p}-birthtime" data-toggle-id="${p}-notime">
                <div class="toggle-box" id="${p}-notime"></div>
                <span class="toggle-label">Unbekannt</span>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Geburtsort</label>
              <input class="field-input" id="${p}-birthplace" placeholder="Stadt, Land" />
            </div>
          </div>
        </div>`;
    }

    function addChild() {
      if (state.childCount >= 5) return;
      const container = document.getElementById('children-container');
      if (container) {
        container.insertAdjacentHTML('beforeend', childBlockHTML(state.childCount));
      }
      state.childCount++;
      const btn = document.getElementById('btn-add-child');
      if (btn) btn.style.display = state.childCount >= 5 ? 'none' : '';
    }

    function removeChild(i) {
      const block = document.getElementById('child-block-' + i);
      if (block) block.remove();
      state.childCount = Math.max(1, state.childCount - 1);
      const btn = document.getElementById('btn-add-child');
      if (btn) btn.style.display = '';
    }

    // ── HELPERS ────────────────────────────────────────────────────
    function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
    function isOn(id) { const el = document.getElementById(id); return el ? el.classList.contains('on') : false; }
    // Zentrales Stichdatum der Analyse. Liest das Feld 'analysis-date' (YYYY-MM-DD)
    // oder state.analysisDate; faellt auf heute zurueck. Steuert alles Zeitbezogene.
    function getRefDate() {
      const raw = val('analysis-date') || state.analysisDate || '';
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [y, m, d] = raw.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        if (!isNaN(dt)) return dt;
      }
      return new Date();
    }
    function getPerson(prefix) {
      return {
        firstName: val(`${prefix}-firstname`),
        lastName: val(`${prefix}-lastname`),
        birthName: val(`${prefix}-birthname`),
        birthDate: val(`${prefix}-birthdate`),
        birthTime: isOn(`${prefix}-notime`) ? 'unbekannt' : (val(`${prefix}-birthtime`) || 'unbekannt'),
        birthPlace: val(`${prefix}-birthplace`)
      };
    }
    function getChildren() {
      const out = [];
      for (let i = 0; i < state.childCount; i++) {
        if (document.getElementById(`child-block-${i}`)) out.push(getPerson(`child${i}`));
      }
      return out;
    }

    // ── AHNENLINIE ──────────────────────────────────────────────────
    function getAncestor(prefix) {
      // prefix: 'mother' or 'father'
      return {
        firstName: val(`anc-${prefix}-first`),
        birthName: val(`anc-${prefix}-birth`),     // Geburtsname / Mädchenname
        birthDate: val(`anc-${prefix}-date`),
        birthPlace: val(`anc-${prefix}-place`),
      };
    }
    function getAncestry() {
      const include = isOn('ancestry-include-toggle');
      if (!include) return { include: false };
      const m = getAncestor('mother');
      const f = getAncestor('father');
      const hasAny = (m.firstName || m.birthName || m.birthDate) || (f.firstName || f.birthName || f.birthDate);
      return { include: hasAny, mother: m, father: f };
    }
    function ancestorLine(label, a) {
      if (!a) return '';
      if (!a.firstName && !a.birthName && !a.birthDate) return '';
      const fullForNums = `${a.firstName || ''} ${a.birthName || ''}`.trim();
      const nn = fullForNums ? nameNums(fullForNums) : null;
      const lz = a.birthDate ? lifeNum(a.birthDate) : 'n/a';
      const py = a.birthDate ? persYear(a.birthDate) : 'n/a';
      const zd = a.birthDate ? zodiac(a.birthDate) : 'unbekannt';
      return `
${label}:
- Vorname: ${a.firstName || '—'}
- Geburtsname: ${a.birthName || '—'}
- Geburtsdatum: ${a.birthDate || '—'}
- Geburtsort: ${a.birthPlace || '—'}
- Lebenszahl: ${lz}
- Persönliches Jahr: ${py}
- Sternzeichen: ${zd}${nn ? `
- Namens-Numerologie (Vorname + Geburtsname): Seelendrang=${nn.soul}, Persönlichkeit=${nn.personality}, Ausdruck=${nn.expression}` : ''}`;
    }
    function buildAncestryBlock() {
      const a = getAncestry();
      if (!a.include) return '';
      const mLine = ancestorLine('MUTTER (Mutterlinie — die naehrende, empfangende Frequenz)', a.mother);
      const fLine = ancestorLine('VATER (Vaterlinie — die schuetzende, strukturierende Frequenz)', a.father);
      if (!mLine && !fLine) return '';
      // Pattern detection: matching life numbers between mother/father and main person
      const mLz = a.mother?.birthDate ? lifeNum(a.mother.birthDate) : null;
      const fLz = a.father?.birthDate ? lifeNum(a.father.birthDate) : null;
      const p1Lz = lifeNum(val('p1-date'));
      let pattern = '';
      if (mLz && fLz && p1Lz && p1Lz !== 'n/a') {
        const matches = [];
        if (mLz === p1Lz) matches.push(`Mutter (${mLz}) und Hauptperson (${p1Lz}) teilen dieselbe Lebenszahl — eine starke energetische Resonanz`);
        if (fLz === p1Lz) matches.push(`Vater (${fLz}) und Hauptperson (${p1Lz}) teilen dieselbe Lebenszahl — der vaeterliche Auftrag schwingt direkt mit`);
        if (mLz === fLz) matches.push(`Mutter und Vater teilen dieselbe Lebenszahl (${mLz}) — das Familienthema ist verdoppelt im System`);
        if (matches.length) pattern = `\n\nMUSTER-ERKENNUNG:\n- ${matches.join('\n- ')}`;
      }
      return `

AHNENLINIE — was aus der Familie mitschwingt (optional eingegeben):${mLine}${fLine}${pattern}`;
    }

    // ── NUMEROLOGIE ────────────────────────────────────────────────
    const LM = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 };
    const VO = new Set(['A', 'E', 'I', 'O', 'U']);
    function red(n) { if (n === 11 || n === 22 || n === 33) return n; if (n < 10) return n; return red(String(n).split('').reduce((a, d) => a + parseInt(d), 0)); }
    // Helfer: pythagoräische Reduktion ohne Master (für Buchstaben-Zahlen)
    function redPlain(n) { if (n < 10) return n; return redPlain(String(n).split('').reduce((a, d) => a + parseInt(d), 0)); }
    function nameNums(full) { const c = full.toUpperCase().replace(/[^A-Z]/g, ''); let s = 0, p = 0, e = 0; for (const ch of c) { const v = LM[ch] || 0; e += v; if (VO.has(ch)) s += v; else p += v; } return { soul: red(s) || 'n/a', personality: red(p) || 'n/a', expression: red(e) || 'n/a' }; }

    // ── CROWLEY THOTH TAROT ──────────────────────────────────────────
    // Die 22 Grossen Arkana mit Crowley-spezifischen Namen (NICHT Rider-Waite):
    //   8 = Adjustment (nicht Strength), 11 = Lust (nicht Justice),
    //   14 = Art (nicht Temperance), 20 = Aeon (nicht Judgement),
    //   21 = Universe (nicht World)
    const CROWLEY = {
      0:  { name: 'Der Narr', en: 'The Fool', essence: 'Heiliger Sprung ins Unbekannte. Reine Möglichkeit. Vertrauen vor jeder Form.', light: 'Mut, Vertrauen, kindliche Offenheit, schöpferischer Ursprung, freier Geist', shadow: 'Naivität, Verantwortungsflucht, Beliebigkeit', astro: 'Uranus / Luft' },
      1:  { name: 'Der Magus', en: 'The Magus', essence: 'Wille in die Welt übersetzt. Das Wort, das schöpft.', light: 'Klarer Wille, Sprachmacht, Vermittlung, Konzentration', shadow: 'Manipulation, Trickserei, Worte ohne Substanz', astro: 'Merkur' },
      2:  { name: 'Die Hohepriesterin', en: 'The Priestess', essence: 'Der innere Mond. Wissen, das nicht durch Worte kommt.', light: 'Intuition, Empfänglichkeit, inneres Hören, Mysterium', shadow: 'Verschlossenheit, Abkapselung, Misstrauen', astro: 'Mond' },
      3:  { name: 'Die Herrscherin', en: 'The Empress', essence: 'Schöpferische Fülle. Liebe als Form gebende Kraft.', light: 'Fruchtbarkeit, Schönheit, sinnliche Wärme, schöpferischer Überfluss', shadow: 'Übermass, Verstrickung in Genuss, übergriffige Fürsorge', astro: 'Venus' },
      4:  { name: 'Der Herrscher', en: 'The Emperor', essence: 'Ordnung im Chaos. Strukturgebende Vater-Erfahrung.', light: 'Klare Grenzen, Verantwortung, innere Autorität, Stabilität', shadow: 'Tyrannei, Starrheit, Kontrolle aus Angst', astro: 'Widder' },
      5:  { name: 'Der Hierophant', en: 'The Hierophant', essence: 'Brücke zwischen Himmel und Erde. Lehrer, der das Sakrale ins Alltägliche bringt.', light: 'Spirituelle Tradition, Weisheitsweitergabe, Initiation, das Heilige im Gewöhnlichen', shadow: 'Dogma, blinder Gehorsam, religiöse Erstarrung', astro: 'Stier' },
      6:  { name: 'Die Liebenden', en: 'The Lovers', essence: 'Entscheidung aus dem Herzen. Vereinigung der Gegensätze.', light: 'Tiefe Bindung, bewusste Wahl, Liebe als Erkenntnis', shadow: 'Unentschiedenheit, Verschmelzung, Selbstverlust', astro: 'Zwillinge' },
      7:  { name: 'Der Wagen', en: 'The Chariot', essence: 'Bewegtes Gleichgewicht. Der Heilige Gral als Gefäss.', light: 'Zielstrebigkeit, emotionale Stärke, schützender Panzer', shadow: 'Verbissenheit, emotionale Härte, Triebkraft ohne Richtung', astro: 'Krebs' },
      8:  { name: 'Anpassung', en: 'Adjustment', essence: 'Karmisches Gleichgewicht. Wahrheit jenseits aller Wertung.', light: 'Fairness, klares Urteil, schwingendes Gleichgewicht', shadow: 'Selbstgerechtigkeit, kaltes Richten, Schwarz-Weiss-Denken', astro: 'Waage', note: 'Crowley: 8 = Adjustment (NICHT Strength). Crowley vertauschte 8 und 11 aus kabbalistischen Gründen.' },
      9:  { name: 'Der Eremit', en: 'The Hermit', essence: 'Inneres Licht in der Stille. Der Weise, der gegangen ist um zu sehen.', light: 'Innere Reise, Selbstkenntnis, Lampe für andere', shadow: 'Isolation, Weltflucht, sich verstecken', astro: 'Jungfrau' },
      10: { name: 'Das Glücksrad', en: 'Fortune', essence: 'Das ewige Drehen. Karma als Spirale.', light: 'Wandel, Schicksalsöffnung, Vertrauen in den Lauf', shadow: 'Schicksalsgläubigkeit als Ausrede, Passivität', astro: 'Jupiter' },
      11: { name: 'Lust', en: 'Lust', essence: 'Heilige Lebenskraft. Die Frau auf dem Löwen. Mut der Lebensbejahung.', light: 'Sinnliche Lebenslust, schöpferische Wildheit, Lebensjubel', shadow: 'Gier, Sucht, Lust als Flucht, Konsumzwang', astro: 'Löwe', note: 'Crowley: 11 = Lust (NICHT Justice). Crowley vertauschte 8 und 11 aus kabbalistischen Gründen.' },
      12: { name: 'Der Gehängte', en: 'The Hanged Man', essence: 'Umkehrung der Sicht. Initiation durch Stillstand.', light: 'Perspektivwechsel, Hingabe, geistige Initiation', shadow: 'Märtyrertum, Stillstand, Selbstmitleid', astro: 'Neptun / Wasser' },
      13: { name: 'Tod', en: 'Death', essence: 'Transformation durch Loslassen. Wandlung jenseits der Form.', light: 'Tiefe Wandlung, Befreiung vom Überholten, neue Phase', shadow: 'Festhalten am Toten, Angst vor Wandel, Stagnation', astro: 'Skorpion', karmic: true },
      14: { name: 'Kunst', en: 'Art', essence: 'Alchemie der Gegensätze. Im Kessel werden Feuer und Wasser zur dritten Substanz.', light: 'Integration, richtige Mischung, Synthese, schöpferische Verbindung', shadow: 'Lauwarme Mitte, übermässige Vermittlung, Konfliktvermeidung', astro: 'Schütze', note: 'Crowley: 14 = Art (NICHT Temperance). Bei Crowley kraftvoll alchemistisch.', karmic: true },
      15: { name: 'Der Teufel', en: 'The Devil', essence: 'Schöpferische Kraft in Materie gebunden. Das Lachen des Pan.', light: 'Verkörperung, schöpferische Materie, Sinnlichkeit, Humor', shadow: 'Materialismus, Sucht, Schatten-Verstrickung', astro: 'Steinbock' },
      16: { name: 'Der Turm', en: 'The Tower', essence: 'Blitzschlag in falsche Strukturen. Plötzliche Wahrheit.', light: 'Befreiung durch Zusammenbruch, Wahrheit die Lügen zerstört', shadow: 'Zerstörerische Wut, Trauma, plötzlicher Verlust', astro: 'Mars', karmic: true },
      17: { name: 'Der Stern', en: 'The Star', essence: 'Heilige Hoffnung. Wasser des Lebens. Göttin Nuit.', light: 'Hoffnung, Erneuerung, Vertrauen, kosmische Inspiration', shadow: 'Realitätsflucht in Hoffnungsbilder, schwammige Visionen', astro: 'Wassermann' },
      18: { name: 'Der Mond', en: 'The Moon', essence: 'Der Weg durch die Nacht. Das Unbewusste, die Tiefe der Seele.', light: 'Traumweisheit, intuitive Tiefen, Schatten-Konfrontation', shadow: 'Verwirrung, Täuschung, Verlorenheit, Depression', astro: 'Fische' },
      19: { name: 'Die Sonne', en: 'The Sun', essence: 'Strahlendes Bewusstsein. Das Kind, das die Welt mit klaren Augen sieht.', light: 'Freude, Klarheit, Lebenslust, schöpferische Frische', shadow: 'Naivität, fehlende Tiefe, oberflächliche Heiterkeit', astro: 'Sonne', karmic: true },
      20: { name: 'Das Äon', en: 'The Aeon', essence: 'Neues Zeitalter. Krönung des Horus. Wiedergeburt in Verantwortung.', light: 'Geistige Wiedergeburt, finale Initiation, kosmische Verantwortung', shadow: 'Apokalyptisches Denken, Endzeit-Drama', astro: 'Pluto / Feuer', note: 'Crowley: 20 = The Aeon (NICHT Judgement). Nicht Gericht, sondern Neuzeitalter (Horus).' },
      21: { name: 'Das Universum', en: 'The Universe', essence: 'Vollendung. Die tanzende Göttin. Ganzheit jenseits aller Polaritäten.', light: 'Vollendung, kosmische Erfüllung, integrierte Ganzheit', shadow: 'Stillstand nach Erfüllung, Saturn-Schwere', astro: 'Saturn', note: 'Crowley: 21 = The Universe (NICHT The World). Umfassender — Saturn als Schwellenhüter.' },
    };

    // Crowley Block-Summe + Reduktion: Reduziere bis ≤21 (NICHT weiter!).
    // Was rauskommt, ist die Karte. Beispiele:
    //   14 → 14 (Karte XIV)
    //   15 → 15 (Karte XV)
    //   22 → 4 (weiterreduzieren auf 2+2=4 = Kaiser)
    //   30 → 3 (3+0=3 = Herrscherin)
    //   21 → 21 (Universum, Endpunkt)
    function tarotReduce(num) {
      const steps = [num];
      let cur = num;
      while (cur > 21) {
        cur = String(cur).split('').reduce((a, b) => a + parseInt(b, 10), 0);
        steps.push(cur);
      }
      return { steps, card: cur };
    }

    // Lebenszahl via Block-Summe (Crowley-Methode): EINE Karte
    function lifeNumTarot(birthDate) {
      if (!birthDate) return null;
      const m = birthDate.match(/^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{4})$/);
      if (!m) return null;
      const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
      const sum = d + mo + y;
      const r = tarotReduce(sum);
      return {
        blockSum: sum,
        ...r,
        cardData: CROWLEY[r.card],
        calcString: `${d} + ${mo} + ${y} = ${sum}${r.steps.length > 1 ? ' → ' + r.steps.slice(1).join(' → ') : ''}`,
      };
    }

    // PJ via Block-Summe (Crowley-Methode): EINE Karte
    function pjTarot(birthDate, refYear) {
      if (!birthDate) return null;
      const m = birthDate.match(/^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{4})$/);
      if (!m) return null;
      const d = parseInt(m[1], 10), mo = parseInt(m[2], 10);
      const sum = d + mo + refYear;
      const r = tarotReduce(sum);
      return {
        blockSum: sum,
        ...r,
        cardData: CROWLEY[r.card],
        calcString: `${d} + ${mo} + ${refYear} = ${sum}${r.steps.length > 1 ? ' → ' + r.steps.slice(1).join(' → ') : ''}`,
      };
    }

    // ── PERSOENLICHES JAHR (CROWLEY/BLOCK-METHODE) ──────────────────
    // Tag + Monat + KOMPLETTES Jahr (nicht Quersumme), dann tarotReduce bis ≤21
    function calcPJ(birthDay, birthMonth, startYear) {
      return tarotReduce(birthDay + birthMonth + startYear).card;
    }

    // Lebenszahl per Crowley/Block-Methode: Tag + Monat + Jahr, reduzieren bis ≤21
    function lifeNum(d) {
      if (!d) return 'n/a';
      const m = String(d).match(/^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{4})$/);
      if (!m) return 'n/a';
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      return tarotReduce(day + month + year).card;
    }

    // Liefert reichhaltige Info zum aktuellen PJ basierend auf heute
    function getPersonalYearInfo(birthDate) {
      if (!birthDate) return null;
      const pt = birthDate.split('.');
      if (pt.length < 2) return null;
      const day = parseInt(pt[0], 10);
      const month = parseInt(pt[1], 10);
      if (!day || !month || month < 1 || month > 12) return null;

      const today = getRefDate();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();

      // Hatte der Geburtstag dieses Kalenderjahr schon stattgefunden?
      const hadBirthday = (todayMonth > month) || (todayMonth === month && todayDay >= day);
      const startYear = hadBirthday ? todayYear : todayYear - 1;
      const endYear = startYear + 1;

      // Daten als String formatieren (TT.MM.JJJJ)
      const fmt = (d, m, y) => `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
      const startDate = fmt(day, month, startYear);
      const endDate = fmt(day, month, endYear);

      // Uebergangsphase: ±6 Wochen (42 Tage) um Geburtstag
      const todayDate = new Date(todayYear, todayMonth - 1, todayDay);
      const lastBirthday = new Date(startYear, month - 1, day);
      const nextBirthday = new Date(endYear, month - 1, day);
      const daysSinceBirthday = Math.floor((todayDate - lastBirthday) / 86400000);
      const daysUntilNextBirthday = Math.floor((nextBirthday - todayDate) / 86400000);
      const inTransitionAfter = daysSinceBirthday >= 0 && daysSinceBirthday <= 42;
      const inTransitionBefore = daysUntilNextBirthday >= 0 && daysUntilNextBirthday <= 42;
      const inTransition = inTransitionAfter || inTransitionBefore;

      const currentPJ = calcPJ(day, month, startYear);
      const previousPJ = calcPJ(day, month, startYear - 1);
      const nextPJ = calcPJ(day, month, startYear + 1);
      const nextPJ2 = calcPJ(day, month, startYear + 2);

      return {
        currentPJ, previousPJ, nextPJ, nextPJ2,
        startYear, endYear, startDate, endDate,
        inTransition, inTransitionAfter, inTransitionBefore,
        daysSinceBirthday, daysUntilNextBirthday,
        birthDay: day, birthMonth: month,
      };
    }
    // Backward-compatible: gibt nur die Zahl zurück (für alte Aufrufe)
    function persYear(birthDate) {
      const info = getPersonalYearInfo(birthDate);
      return info ? info.currentPJ : 'n/a';
    }

    // ── PERSOENLICHE MONATE ─────────────────────────────────────────
    // Liefert die 12 Monate des aktuellen PJ (vom Geburtsmonat des aktuellen PJ-Starts ab)
    function getPersonalMonths(birthDate) {
      const info = getPersonalYearInfo(birthDate);
      if (!info) return [];
      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      const out = [];
      // Beginne mit dem Monat des PJ-Starts (= Geburtsmonat)
      for (let i = 0; i < 12; i++) {
        const monthIdx = ((info.birthMonth - 1 + i) % 12); // 0-11
        const calendarMonth = monthIdx + 1;
        const year = info.startYear + Math.floor((info.birthMonth - 1 + i) / 12);
        // PM = PJ + Kalendermonat-Zahl, reduziert mit Master-Erhalt
        const pm = red(info.currentPJ + calendarMonth);
        out.push({ name: monthNames[monthIdx], calendarMonth, year, pm });
      }
      return out;
    }
    // Schwellenmonate identifizieren (PM == PJ, Master Number, oder PM == LZ)
    function identifyKeyMonths(months, currentPJ, lifeNumber) {
      return months.map(m => {
        const flags = [];
        if (m.pm === currentPJ) flags.push('Verdichtungsmonat (PM = PJ)');
        if (m.pm === 11 || m.pm === 22 || m.pm === 33) flags.push('Meistermonat');
        if (lifeNumber && m.pm === lifeNumber) flags.push('Lebensaufgabe-Echo (PM = LZ)');
        return { ...m, flags };
      });
    }
    // Aktueller Persönlicher Monat (in welchem PM ist die Person heute)
    function getCurrentPersonalMonth(birthDate) {
      const info = getPersonalYearInfo(birthDate);
      if (!info) return null;
      const today = getRefDate();
      const calendarMonth = today.getMonth() + 1;
      const pm = red(info.currentPJ + calendarMonth);
      return { calendarMonth, pm };
    }

    // ── PARSE DATE HELPER ──────────────────────────────────────────
    function parseDate(dateStr) {
      if (!dateStr) return null;
      const pt = dateStr.split('.');
      if (pt.length < 3) return null;
      return new Date(parseInt(pt[2], 10), parseInt(pt[1], 10) - 1, parseInt(pt[0], 10));
    }

    // ── A) ERWEITERTE NUMEROLOGIE ──────────────────────────────────
    // Geburtstagszahl (nur der Tag, reduziert mit Master-Erhalt)
    function birthDayNum(birthDate) {
      if (!birthDate) return null;
      const pt = birthDate.split('.');
      if (!pt[0]) return null;
      return red(parseInt(pt[0], 10));
    }
    // Reifezahl (Maturity) = Lebenszahl + Ausdruckszahl, reduziert. Ab ~35 dominant.
    function maturityNum(birthDate, fullName) {
      const lz = lifeNum(birthDate);
      if (lz === 'n/a' || !fullName) return null;
      const nn = nameNums(fullName);
      if (nn.expression === 'n/a') return null;
      return red(parseInt(lz, 10) + parseInt(nn.expression, 10));
    }
    // Rationale Denkzahl = Lebenszahl + Persönlichkeit (Vorname), reduziert.
    function rationalThinkingNum(birthDate, firstName) {
      const lz = lifeNum(birthDate);
      if (lz === 'n/a' || !firstName) return null;
      const nn = nameNums(firstName);
      if (nn.personality === 'n/a') return null;
      return red(parseInt(lz, 10) + parseInt(nn.personality, 10));
    }
    // Karmische Schulden: 13, 14, 16, 19 in den Hauptberechnungen vor Reduktion
    function karmicDebts(birthDate, fullName) {
      const debts = [];
      const KARMIC = [13, 14, 16, 19];
      // Geburtstag
      if (birthDate) {
        const pt = birthDate.split('.');
        const day = parseInt(pt[0], 10);
        if (KARMIC.includes(day)) debts.push({ source: 'Geburtstagszahl', value: day });
      }
      // Lebenszahl: rohe Summe aller Geburtsdatumsziffern, falls vor letzter Reduktion karmische Zahl
      if (birthDate) {
        const dg = birthDate.replace(/\D/g, '');
        let s = dg.split('').reduce((a, c) => a + parseInt(c, 10), 0);
        while (s > 22 && !KARMIC.includes(s)) s = String(s).split('').reduce((a, d) => a + parseInt(d, 10), 0);
        if (KARMIC.includes(s)) debts.push({ source: 'Lebenszahl-Pfad', value: s });
      }
      // Ausdruckszahl
      if (fullName) {
        const c = fullName.toUpperCase().replace(/[^A-Z]/g, '');
        let s = 0; for (const ch of c) s += LM[ch] || 0;
        while (s > 22 && !KARMIC.includes(s)) s = String(s).split('').reduce((a, d) => a + parseInt(d, 10), 0);
        if (KARMIC.includes(s)) debts.push({ source: 'Ausdruckszahl', value: s });
        // Seelendrang (Vokale)
        let sv = 0; for (const ch of c) if (VO.has(ch)) sv += LM[ch] || 0;
        while (sv > 22 && !KARMIC.includes(sv)) sv = String(sv).split('').reduce((a, d) => a + parseInt(d, 10), 0);
        if (KARMIC.includes(sv)) debts.push({ source: 'Seelendrang', value: sv });
        // Persönlichkeit (Konsonanten)
        let sp = 0; for (const ch of c) if (!VO.has(ch)) sp += LM[ch] || 0;
        while (sp > 22 && !KARMIC.includes(sp)) sp = String(sp).split('').reduce((a, d) => a + parseInt(d, 10), 0);
        if (KARMIC.includes(sp)) debts.push({ source: 'Persönlichkeit', value: sp });
      }
      return debts;
    }
    // Karma-Lektionen: welche Zahlen 1-9 fehlen in den Namensbuchstaben
    function karmicLessons(fullName) {
      if (!fullName) return [];
      const c = fullName.toUpperCase().replace(/[^A-Z]/g, '');
      const present = new Set();
      for (const ch of c) {
        const v = LM[ch];
        if (v >= 1 && v <= 9) present.add(v);
      }
      const missing = [];
      for (let i = 1; i <= 9; i++) if (!present.has(i)) missing.push(i);
      return missing;
    }
    // Hidden Passion: welche Zahl(en) 1-9 am häufigsten in Namensbuchstaben
    function hiddenPassion(fullName) {
      if (!fullName) return { passions: [], count: 0 };
      const c = fullName.toUpperCase().replace(/[^A-Z]/g, '');
      const counts = {};
      for (const ch of c) {
        const v = LM[ch];
        if (v >= 1 && v <= 9) counts[v] = (counts[v] || 0) + 1;
      }
      let max = 0;
      for (const k in counts) if (counts[k] > max) max = counts[k];
      const passions = Object.keys(counts).filter(k => counts[k] === max).map(Number).sort((a, b) => a - b);
      return { passions, count: max };
    }

    // ── B) ESSENCE TRANSIT (Buchstaben-Zyklen) ─────────────────────
    // Jeder Buchstabe ist für "Buchstabenwert" Jahre aktiv. Die Buchstaben des vollen Namens
    // bilden eine fortlaufende Sequenz. Im aktuellen Lebensjahr ist EIN Buchstabe aktiv.
    function essenceTransit(fullName, birthDate, today) {
      if (!birthDate || !fullName) return null;
      const birth = parseDate(birthDate);
      if (!birth) return null;
      const ageInDays = Math.floor((today - birth) / 86400000);
      const ageInYears = ageInDays / 365.25;
      const c = fullName.toUpperCase().replace(/[^A-Z]/g, '');
      let cumYears = 0;
      for (let i = 0; i < c.length; i++) {
        const letterValue = LM[c[i]] || 1;
        const start = cumYears;
        const end = cumYears + letterValue;
        if (ageInYears < end) {
          const yearsIntoLetter = ageInYears - start;
          const yearsRemaining = end - ageInYears;
          // Essenz-Zahl: aktueller Buchstabe + ggf. parallele (Erweiterung)
          // Vereinfacht: nur dieser eine Buchstabe
          return {
            letter: c[i],
            value: letterValue,
            position: i,
            startAge: Math.floor(start),
            endAge: Math.ceil(end),
            yearsRemaining: yearsRemaining.toFixed(1),
            essence: red(letterValue),
          };
        }
        cumYears = end;
      }
      return null;
    }

    // Quersumme einer Zahl (für interne Berechnungen wo nötig)
    function digitSum(n) { return String(n).split('').reduce((a, d) => a + parseInt(d || 0, 10), 0); }

    // ── D) PINNACLE-MECHANIK VERTIEFT (CROWLEY-METHODE: Block + ≤21) ─
    function pinnacleDetails(birthDate, today) {
      if (!birthDate) return null;
      const pt = birthDate.split('.');
      if (pt.length < 3) return null;
      const day = parseInt(pt[0], 10);
      const month = parseInt(pt[1], 10);
      const year = parseInt(pt[2], 10);
      const lzVal = parseInt(lifeNum(birthDate), 10);
      if (!day || !month || !year || isNaN(lzVal)) return null;

      // Erste Pinnacle endet bei Alter (36 - LZ). LZ bei Crowley schon klein (≤21).
      const lzReduced = lzVal > 9 ? digitSum(lzVal) : lzVal;
      const p1End = 36 - lzReduced;
      const p2End = p1End + 9;
      const p3End = p2End + 9;

      // Pinnacle-Werte (Crowley/Block-Methode, Reduktion ≤21)
      const p1val = tarotReduce(day + month).card;
      const p2val = tarotReduce(day + year).card;
      const p3val = tarotReduce(p1val + p2val).card;
      const p4val = tarotReduce(month + year).card;

      // Wechseldaten
      const fmt = (d, m, y) => `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
      const wechsel1 = fmt(day, month, year + p1End);
      const wechsel2 = fmt(day, month, year + p2End);
      const wechsel3 = fmt(day, month, year + p3End);

      const todayYear = today.getFullYear();
      const ageNow = Math.floor((today - new Date(year, month - 1, day)) / 31557600000);

      function statusOf(startAge, endAge) {
        if (endAge === Infinity) return ageNow >= startAge ? 'aktuell' : 'kommend';
        if (ageNow >= startAge && ageNow < endAge) {
          const yearsIntoIt = ageNow - startAge;
          const yearsLeft = endAge - ageNow;
          return `aktuell (Jahr ${yearsIntoIt + 1}/${endAge - startAge}, noch ${yearsLeft} Jahre)`;
        }
        return ageNow < startAge ? 'kommend' : 'vergangen';
      }

      return [
        { nr: 1, value: p1val, startAge: 0, endAge: p1End,
          ageRange: `0 bis ${p1End} Jahre`, yearRange: `${year} bis ${year + p1End}`,
          wechselDatum: wechsel1, status: statusOf(0, p1End) },
        { nr: 2, value: p2val, startAge: p1End, endAge: p2End,
          ageRange: `${p1End} bis ${p2End} Jahre`, yearRange: `${year + p1End} bis ${year + p2End}`,
          wechselDatum: wechsel2, status: statusOf(p1End, p2End) },
        { nr: 3, value: p3val, startAge: p2End, endAge: p3End,
          ageRange: `${p2End} bis ${p3End} Jahre`, yearRange: `${year + p2End} bis ${year + p3End}`,
          wechselDatum: wechsel3, status: statusOf(p2End, p3End) },
        { nr: 4, value: p4val, startAge: p3End, endAge: Infinity,
          ageRange: `ab ${p3End} Jahre`, yearRange: `ab ${year + p3End}`,
          wechselDatum: null, status: statusOf(p3End, Infinity) },
      ];
    }

    // ── E) PERSOENLICHER TAG ───────────────────────────────────────
    function personalDayNum(birthDate, today) {
      const info = getPersonalYearInfo(birthDate);
      if (!info) return null;
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const pm = red(info.currentPJ + todayMonth);
      return red(pm + todayDay);
    }

    // ── F) SATURN- / JUPITER-RETURNS (approximativ, für Lebenszyklen) ──
    // Saturn: ~29.5 Jahre. Jupiter: ~12 Jahre. Exakte Daten brauchten Ephemeris;
    // diese Approximation reicht für Lebensphasen-Markierungen.
    function saturnReturns(birthDate, today) {
      const birth = parseDate(birthDate);
      if (!birth) return [];
      const out = [];
      for (let i = 1; i <= 3; i++) {
        const yearsLater = 29.5 * i;
        const returnYear = birth.getFullYear() + Math.round(yearsLater);
        const ageAtReturn = Math.round(yearsLater);
        const todayYear = today.getFullYear();
        let status = 'kommend';
        if (returnYear < todayYear - 2) status = 'vergangen';
        else if (Math.abs(returnYear - todayYear) <= 2) status = 'aktuell oder nahe';
        out.push({ number: i, year: returnYear, ageAtReturn, status });
      }
      return out;
    }
    function jupiterReturns(birthDate, today) {
      const birth = parseDate(birthDate);
      if (!birth) return [];
      const out = [];
      for (let i = 1; i <= 7; i++) {
        const ageAtReturn = 12 * i;
        const returnYear = birth.getFullYear() + ageAtReturn;
        if (returnYear > 2100) break;
        const todayYear = today.getFullYear();
        let status = 'kommend';
        if (returnYear < todayYear - 1) status = 'vergangen';
        else if (Math.abs(returnYear - todayYear) <= 1) status = 'aktuell oder nahe';
        out.push({ number: i, year: returnYear, ageAtReturn, status });
      }
      return out;
    }

    // ── MONDKNOTEN approximativ (18.6 Jahre Zyklus) ────────────────
    // Der Nordknoten bewegt sich rueckwaerts durch die Sternzeichen.
    // Referenz: Am 01.01.2000 stand der Nordknoten ungefaehr im Krebs (ca. Grad 5).
    // Approximation reicht für Zeichen-Bestimmung.
    function moonNodeSign(birthDate) {
      const birth = parseDate(birthDate);
      if (!birth) return null;
      const signs = ['Widder','Stier','Zwillinge','Krebs','Löwe','Jungfrau','Waage','Skorpion','Schütze','Steinbock','Wassermann','Fische'];
      // Referenz: 01.01.2000, Nordknoten in Krebs (Index 3, ca. 8 Grad)
      const ref = new Date(2000, 0, 1);
      const daysFromRef = (birth - ref) / 86400000;
      const yearsFromRef = daysFromRef / 365.25;
      // Nordknoten: ~18.6 Jahre für 360 Grad rueckwaerts
      const degPerYear = -360 / 18.6;
      const startDeg = 3 * 30 + 8; // Krebs 8 Grad
      let deg = (startDeg + yearsFromRef * degPerYear) % 360;
      while (deg < 0) deg += 360;
      const signIdx = Math.floor(deg / 30);
      return { north: signs[signIdx], south: signs[(signIdx + 6) % 12] };
    }

    function zodiac(d) {
      if (!d) return 'unbekannt';
      const pt = d.split('.'); if (pt.length < 2) return 'unbekannt';
      const day = parseInt(pt[0]), mo = parseInt(pt[1]);
      // [cutoff_day, month, sign_if_day_<=_cutoff, sign_if_day_>_cutoff]
      const s = [
        [19, 1, 'Steinbock', 'Wassermann'],
        [18, 2, 'Wassermann', 'Fische'],
        [20, 3, 'Fische', 'Widder'],
        [19, 4, 'Widder', 'Stier'],
        [20, 5, 'Stier', 'Zwillinge'],
        [20, 6, 'Zwillinge', 'Krebs'],
        [22, 7, 'Krebs', 'Löwe'],
        [22, 8, 'Löwe', 'Jungfrau'],
        [22, 9, 'Jungfrau', 'Waage'],
        [22, 10, 'Waage', 'Skorpion'],
        [21, 11, 'Skorpion', 'Schütze'],
        [21, 12, 'Schütze', 'Steinbock'],
      ];
      const row = s.find(r => r[1] === mo);
      if (!row) return 'unbekannt';
      return day <= row[0] ? row[2] : row[3];
    }
    function personBlock(p, label) {
      if (!p.firstName) return '';
      const full = `${p.firstName} ${p.lastName}`.trim();
      const n = nameNums(full);
      const pjInfo = getPersonalYearInfo(p.birthDate);
      const pjStr = pjInfo
        ? `${pjInfo.currentPJ} (aktiv vom ${pjInfo.startDate} bis ${pjInfo.endDate})`
        : 'n/a';
      // Crowley Thoth Tarot — INTERNE Bedeutungsschicht (Namen NICHT in Analyse erwähnen!)
      const lt = lifeNumTarot(p.birthDate);
      const tarotLine = lt
        ? `\n\n  TAROT-BEDEUTUNGSSCHICHT (INTERN — verwende den INHALT, NIE die Karten-Namen oder Nummern explizit nennen!):\n  Block-Berechnung: ${lt.calcString}\n  Reduzierte Crowley-Zahl: ${lt.card}\n  Essenz dieser Schwingung: ${lt.cardData?.essence || ''}\n  Licht: ${lt.cardData?.light || ''}\n  Schatten: ${lt.cardData?.shadow || ''}\n  Astro-Zuordnung: ${lt.cardData?.astro || ''}\n  → Verwebe DIESE Bedeutungen in deine Lebenszahl-Interpretation. Nenne aber NIE Tarot, Karten, Crowley, Aleister oder Karten-Namen.`
        : '';
      const pjt = pjInfo ? pjTarot(p.birthDate, pjInfo.startYear) : null;
      const pjTarotLine = pjt
        ? `\n  TAROT-BEDEUTUNGSSCHICHT für Persönliches Jahr (INTERN — Namen nicht nennen!):\n  Block-Berechnung: ${pjt.calcString}\n  Reduzierte Crowley-Zahl: ${pjt.card}\n  Essenz: ${pjt.cardData?.essence || ''}\n  Licht: ${pjt.cardData?.light || ''}\n  Schatten: ${pjt.cardData?.shadow || ''}`
        : '';
      return `\n${label}: ${full}\n- Geburtsdatum: ${p.birthDate || 'unbekannt'}\n- Geburtszeit: ${p.birthTime || 'unbekannt'}\n- Geburtsort: ${p.birthPlace || 'unbekannt'}\n- Lebenszahl: ${lifeNum(p.birthDate)}\n- Seelendrang: ${n.soul}\n- Persönlichkeitszahl: ${n.personality}\n- Ausdruckszahl: ${n.expression}\n- Persönliches Jahr (aktuell aktiv): ${pjStr}\n- Sternzeichen: ${zodiac(p.birthDate)}${tarotLine}${pjTarotLine}`;
    }

    // Erweiterter Numerologie-Block: Geburtstagszahl, Maturity, Rationale, Karmic, Hidden Passion, Essence, Pinnacles, Personal Day, Returns, Mondknoten
    function extendedNumerologyBlock(p, label) {
      if (!p.firstName || !p.birthDate) return '';
      const today = getRefDate();
      const full = `${p.firstName} ${p.lastName}`.trim();
      const birth = parseDate(p.birthDate);
      const birthYear = birth ? birth.getFullYear() : null;
      const age = birth ? Math.floor((today - birth) / 31557600000) : null;

      const bd = birthDayNum(p.birthDate);
      const mat = maturityNum(p.birthDate, full);
      const rt = rationalThinkingNum(p.birthDate, p.firstName);
      const kd = karmicDebts(p.birthDate, full);
      const kl = karmicLessons(full);
      const hp = hiddenPassion(full);
      const et = essenceTransit(full, p.birthDate, today);
      const pin = pinnacleDetails(p.birthDate, today);
      const pd = personalDayNum(p.birthDate, today);
      const sat = saturnReturns(p.birthDate, today);
      const jup = jupiterReturns(p.birthDate, today);
      const mn = moonNodeSign(p.birthDate);

      const kdStr = kd.length ? kd.map(d => `${d.value} in ${d.source}`).join(', ') : 'keine';
      const klStr = kl.length ? kl.join(', ') : 'alle Zahlen 1-9 vertreten (selten)';
      const hpStr = hp.passions.length ? `${hp.passions.join(', ')} (je ${hp.count} mal im Namen)` : 'keine';
      const etStr = et ? `Buchstabe "${et.letter}" (Wert ${et.value}, Essenz ${et.essence}) aktiv von Alter ${et.startAge} bis ${et.endAge}, noch ${et.yearsRemaining} Jahre` : 'n/a';
      const pinStr = pin ? pin.map(p => `Pinnacle ${p.nr}: Zahl ${p.value}, ${p.ageRange} (${p.yearRange})${p.wechselDatum ? ', Wechsel am ' + p.wechselDatum : ''} [${p.status}]`).join('\n  ') : 'n/a';
      const satStr = sat.length ? sat.map(s => `${s.number}. Saturn-Return ${s.year} (Alter ${s.ageAtReturn}, ${s.status})`).join('\n  ') : 'n/a';
      const jupStr = jup.length ? jup.map(j => `Jupiter-Return ${j.year} (Alter ${j.ageAtReturn}, ${j.status})`).join('\n  ') : 'n/a';
      const mnStr = mn ? `Nordknoten approximativ in ${mn.north}, Südknoten in ${mn.south}` : 'n/a';

      return `

ERWEITERTE NUMEROLOGIE-DATEN — ${label} (Analysedatum/Stichtag: ${today.getDate()}.${today.getMonth()+1}.${today.getFullYear()}, Alter ${age}):

A) ZAHLENSCHATZ (klassische pythagoreische Tiefe):
- Geburtstagszahl (Tag ${p.birthDate.split('.')[0]}): ${bd}
- Reifezahl/Maturity (LZ + Ausdruck): ${mat} - ab Alter ~35 dominant
- Rationale Denkzahl (LZ + Persönlichkeit Vorname): ${rt}
- Karmische Schulden (13/14/16/19 in Berechnungen): ${kdStr}
- Karma-Lektionen (fehlende Zahlen im Namen): ${klStr}
- Hidden Passion / Versteckte Leidenschaft: ${hpStr}

B) ESSENCE TRANSIT (Buchstaben-Zyklus):
- ${etStr}

D) PINNACLES & CHALLENGES (mit Wechsel-Daten):
  ${pinStr}

E) PERSOENLICHER TAG am Analysedatum: ${pd} (Tagesenergie am Stichtag der Analyse)

F) KOSMISCHE ZYKLEN:
  Saturn-Returns:
  ${satStr}
  Jupiter-Returns:
  ${jupStr}
  Mondknoten-Achse: ${mnStr}

C) ASTROLOGIE-TIEFE — verwende AUSSCHLIESSLICH die exakt vorberechneten Werte aus dem PROFI-ASTROLOGIE (Swiss Ephemeris)-Block weiter unten. NICHT selbst rechnen, NICHT approximieren:
- Sonnenzeichen, Mondzeichen, Aszendent, MC und Mondknoten stehen dort exakt berechnet (inkl. korrekter Zeitzone).
- Falls dort kein Aszendent steht (Geburtszeit oder Ort fehlt), lasse den Aszendenten weg und weise kurz darauf hin.`;
    }

    // Baut den detaillierten PJ-Block für den Prompt (12 Monate, Schwellen, nächste PJs, Uebergangsphase)
    function pjDetailBlock(p, label) {
      if (!p.firstName || !p.birthDate) return '';
      const info = getPersonalYearInfo(p.birthDate);
      if (!info) return '';
      const lz = lifeNum(p.birthDate);
      const months = identifyKeyMonths(getPersonalMonths(p.birthDate), info.currentPJ, lz);
      const cm = getCurrentPersonalMonth(p.birthDate);
      const today = getRefDate();
      const todayStr = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;

      const monthLines = months.map(m => {
        const flag = m.flags.length ? ` [${m.flags.join(' · ')}]` : '';
        return `  ${String(m.calendarMonth).padStart(2,'0')}/${m.year} ${m.name.padEnd(10)} → PM ${m.pm}${flag}`;
      }).join('\n');

      const transitionNote = info.inTransition
        ? (info.inTransitionAfter
          ? `\n⚠ UEBERGANGSPHASE (innerhalb 6 Wochen NACH Geburtstag, Tag ${info.daysSinceBirthday}/42 nach Wechsel): Die neue PJ-Energie ${info.currentPJ} ist noch frisch, alte Energie ${info.previousPJ} klingt nach. Das verdient eine explizite Erwähnung.`
          : `\n⚠ UEBERGANGSPHASE (innerhalb 6 Wochen VOR Geburtstag, noch ${info.daysUntilNextBirthday} Tage bis Wechsel): Aktuelles PJ ${info.currentPJ} klingt aus, kommendes PJ ${info.nextPJ} ist energetisch schon spuerbar. Das verdient eine explizite Erwähnung.`)
        : '';

      // Crowley Tarot: Bedeutungsschicht für aktuelles + nächstes PJ (INTERN — Namen nicht nennen!)
      const pjtCur = pjTarot(p.birthDate, info.startYear);
      const pjtNext = pjTarot(p.birthDate, info.startYear + 1);
      const tarotBlock = pjtCur ? `

TAROT-BEDEUTUNGSSCHICHT für aktuelles + nächstes Persönliches Jahr (INTERN — verwende INHALT, niemals Karten-Namen oder Nummern explizit erwähnen):

- Aktuelles PJ ${info.startYear}/${info.endYear}: ${pjtCur.calcString} → Crowley-Zahl ${pjtCur.card}
  Essenz: ${pjtCur.cardData?.essence || ''}
  Licht: ${pjtCur.cardData?.light || ''}
  Schatten: ${pjtCur.cardData?.shadow || ''}
  Astro-Zuordnung: ${pjtCur.cardData?.astro || ''}` : '';
      const tarotNext = pjtNext ? `

- Nächstes PJ ${info.startYear + 1}/${info.endYear + 1}: ${pjtNext.calcString} → Crowley-Zahl ${pjtNext.card}
  Essenz: ${pjtNext.cardData?.essence || ''}
  Licht: ${pjtNext.cardData?.light || ''}
  Schatten: ${pjtNext.cardData?.shadow || ''}` : '';

      return `

PERSOENLICHES JAHR IM DETAIL — ${label} (heute: ${todayStr}):
- Aktuelles PJ: ${info.currentPJ} (aktiv vom ${info.startDate} bis ${info.endDate})
- Aktueller Persönlicher Monat (${todayStr.slice(3,5)}/${today.getFullYear()}): PM ${cm ? cm.pm : 'n/a'}
- Nächstes PJ ab ${info.endDate}: ${info.nextPJ}
- Übernächstes PJ ab ${String(info.birthDay).padStart(2,'0')}.${String(info.birthMonth).padStart(2,'0')}.${info.endYear + 1}: ${info.nextPJ2}
${tarotBlock}${tarotNext}

12 PERSOENLICHE MONATE DES AKTUELLEN PJ ${info.currentPJ}:
${monthLines}${transitionNote}`;
    }

    // ── PROMPT ─────────────────────────────────────────────────────
    function buildPrompt(astroData, hdData) {
      astroData = astroData || {};
      const hasPair = state.constellation === 'pair' || state.constellation === 'family';
      const hasKids = state.constellation === 'family' || state.constellation === 'solo_children';
      const multiPerson = hasPair || hasKids; // Paar, Familie, Alleinerziehend: kein Persönliches Jahr, Fokus auf Gemeinsames
      const p1 = getPerson('p1'), p2 = hasPair ? getPerson('p2') : null;
      // Alle Mitglieder (für kompakte Sektionen bei Familie/Paar: Namen-Numerologie, Persönlicher Tag, Jahresenergien)
      const memberNames = [p1.firstName, hasPair && p2 ? p2.firstName : null, ...(hasKids ? getChildren().map(c => c.firstName) : [])].filter(Boolean);
      const memberNamesStr = memberNames.join(', ');

      // Kompatibilitätszahl
      let compatBlock = '';
      if (hasPair && p2) {
        const lz1 = lifeNum(p1.birthDate);
        const lz2 = lifeNum(p2.birthDate);
        const compat = compatNum(lz1, lz2);
        compatBlock = `\nKOMPATIBILITÄTSZAHL (Beziehungscode): ${compat} (${lz1} + ${lz2} → ${compat})`;
      }

      // Namenswechsel
      const nc1 = nameChangeBlock('p1', 'PERSON 1');
      const nc2 = hasPair ? nameChangeBlock('p2', 'PERSON 2') : '';
      const hasNameChange = nc1 || nc2;

      let coupleBlock = '';
      if (hasPair) {
        const meet = val('meet-date'), wed = val('wedding-date');
        if (meet || wed) {
          coupleBlock = '\nSCHLÜSSELDATEN:';
          if (meet) coupleBlock += `\n- Kennenlernen: ${meet} → Code: ${lifeNum(meet.replace(/\./g, ''))}`;
          if (wed) coupleBlock += `\n- Hochzeit: ${wed} → Code: ${lifeNum(wed.replace(/\./g, ''))}`;
        }
      }
      const kids = hasKids ? getChildren().map((c, i) => personBlock(c, `KIND ${i + 1}`)).join('\n') : '';

      // Pre-compute name numerology (vollständig, Vorname, Nachname einzeln)
      function calcNameNums(firstName, lastName) {
        if (!firstName) return null;
        const full = `${firstName} ${lastName}`.trim();
        const nFull = nameNums(full);
        const nVor = nameNums(firstName);
        const nNach = lastName ? nameNums(lastName) : null;
        return { firstName, lastName, full, nFull, nVor, nNach };
      }
      function nameNumsText(nn, label) {
        if (!nn) return '';
        return `NAMEN-NUMEROLOGIE ${label}:
- Vollständiger Name (${nn.full}): Seelendrang=${nn.nFull.soul}, Persönlichkeit=${nn.nFull.personality}, Ausdruck=${nn.nFull.expression}
- Vorname (${nn.firstName}): Seelendrang=${nn.nVor.soul}, Persönlichkeit=${nn.nVor.personality}, Ausdruck=${nn.nVor.expression}${nn.nNach ? `\n- Nachname (${nn.lastName}): Seelendrang=${nn.nNach.soul}, Persönlichkeit=${nn.nNach.personality}, Ausdruck=${nn.nNach.expression}` : ''}`;
      }
      const nn1 = calcNameNums(p1.firstName, p1.lastName);
      const nn2 = hasPair && p2 ? calcNameNums(p2.firstName, p2.lastName) : null;
      const nnKids = hasKids ? getChildren().map(c => calcNameNums(c.firstName, c.lastName)) : [];

      const ancestryBlock = buildAncestryBlock();
      const hasAncestry = ancestryBlock !== '';

      // PJ-Detailblöcke für alle Personen
      const pj1Block = multiPerson ? '' : pjDetailBlock(p1, 'PERSON 1');
      const pj2Block = '';
      const pjKidsBlocks = '';

      // Erweiterte Numerologie-Blöcke (A, B, D, E, F + C-Hinweis für Astrologie)
      const ext1Block = extendedNumerologyBlock(p1, 'PERSON 1');
      const ext2Block = hasPair && p2 ? extendedNumerologyBlock(p2, 'PERSON 2') : '';
      const extKidsBlocks = hasKids ? getChildren().map((c, i) => extendedNumerologyBlock(c, `KIND ${i+1}`)).join('\n') : '';

      // Profi-Astrologie-Blöcke (Swiss Ephemeris). Falls swisseph nicht verfuegbar war (Vercel), Hinweis.
      function astroBlock(label, data) {
        if (!data) return '';
        if (!data.available) return `\nASTROLOGIE-DATEN — ${label}: Swiss Ephemeris nicht verfuegbar in dieser Umgebung. ${data.reason || ''} Bitte App lokal starten für Profi-Astrologie. Approximationen aus Geburtsdatum verwenden.`;
        const p = data.planets || {};
        const n = data.nodes || {};
        const asc = data.ascendant;
        const mc = data.mc;
        let s = `\nPROFI-ASTROLOGIE (Swiss Ephemeris) — ${label}:`;
        if (data.coords) s += `\n- Geburtsort geocodiert: ${data.coords.display} (${data.coords.lat.toFixed(2)}, ${data.coords.lon.toFixed(2)})`;
        s += `\n- Sonne: ${p.sun?.formatted}`;
        s += `\n- Mond: ${p.moon?.formatted}`;
        s += `\n- Merkur: ${p.mercury?.formatted}`;
        s += `\n- Venus: ${p.venus?.formatted}`;
        s += `\n- Mars: ${p.mars?.formatted}`;
        s += `\n- Jupiter: ${p.jupiter?.formatted}`;
        s += `\n- Saturn: ${p.saturn?.formatted}`;
        s += `\n- Uranus: ${p.uranus?.formatted}`;
        s += `\n- Neptun: ${p.neptune?.formatted}`;
        s += `\n- Pluto: ${p.pluto?.formatted}`;
        if (p.chiron) s += `\n- Chiron: ${p.chiron.formatted}`;
        s += `\n- Nordknoten: ${n.north?.formatted}`;
        s += `\n- Südknoten: ${n.south?.formatted}`;
        if (asc) s += `\n- Aszendent: ${asc.formatted}`;
        else s += `\n- Aszendent: nicht berechnet (Geburtszeit oder Geburtsort fehlt)`;
        if (mc) s += `\n- MC (Medium Coeli): ${mc.formatted}`;
        if (data.note) s += `\n- HINWEIS: ${data.note}`;
        return s;
      }
      const astro1Block = astroBlock('PERSON 1', astroData['PERSON 1']);
      const astro2Block = hasPair && p2 ? astroBlock('PERSON 2', astroData['PERSON 2']) : '';
      const astroKidsBlocks = hasKids ? getChildren().map((c, i) => astroBlock(`KIND ${i+1}`, astroData[`KIND ${i+1}`])).join('\n') : '';

      const langInstructions = {
        de: 'SPRACHE: Schweizer Hochdeutsch mit korrekten Umlauten (ä ö ü Ä Ö Ü). KEIN ß, immer ss schreiben (gross/muss/heisst/Schluss/Strasse/Spass). Aber Umlaute normal verwenden (für, über, Größe→Grösse, natürlich, persönlich). STIL: KEINE Gedankenstriche (kein — kein –), verwende stattdessen Kommas, Doppelpunkte oder kurze Sätze. Bindestriche in zusammengesetzten Wörtern sind OK.',
        en: 'LANGUAGE: Write the entire analysis in English (modern, warm, informal "you"). STYLE: NO em-dashes (—) and NO en-dashes (–), use commas, colons, or short sentences instead. Hyphens in compound words are fine. Keep structural markers as technical tags, but content inside markers in English.',
        pt: 'IDIOMA: Escreve a análise inteira em português (preferencialmente europeu, caloroso, forma informal). ESTILO: SEM travessões (sem — e sem –), usa vírgulas, dois-pontos ou frases curtas. Hífenes em palavras compostas estão bem. Mantém marcadores estruturais como etiquetas técnicas, mas conteúdo dentro em português.',
      };
      const langInstr = langInstructions[state.language] || langInstructions.de;

      const intros = {
        de: 'Du bist ein erfahrener Astrologe und Numerologe. Erstelle eine tiefe, persönliche Analyse auf Deutsch, direkt ansprechend (du).',
        en: 'You are an experienced astrologer and numerologist. Create a deep, personal analysis in English, addressing the reader directly (you).',
        pt: 'És um astrólogo e numerólogo experiente. Cria uma análise profunda e pessoal em português, falando diretamente com a pessoa (tu).',
      };
      const intro = intros[state.language] || intros.de;

      // ── HUMAN DESIGN INDIVIDUELL: freie Frage durch den BodyGraph ──
      if (state.mode === 'humandesign_individual') {
        const hd = hdData || {};
        const auftragText = (val('auftrag-text') || '').trim();
        const detailText = (val('auftrag-detail') || '').trim();
        const presetI = AUFTRAG_PRESETS[state.auftragPreset] || null;
        const presetLabelI = presetI ? presetI.label : 'Individuelle Frage';
        const auftragI = auftragText || (presetI ? presetI.prefill : '') || presetLabelI;
        if (!hd.available) {
          return `${intro}\n\n${langInstr}\n\nMODUS: Human Design (individuelle Frage). Die Berechnung des BodyGraphs war nicht moeglich (${hd.reason || 'Geburtszeit oder Geburtsort fehlen'}). Erklaere der Person in zwei, drei warmen Saetzen, dass Human Design zwingend das exakte Geburtsdatum, die GENAUE Geburtszeit (auf die Minute) und den Geburtsort braucht, und bitte sie, diese zu ergaenzen. Keine weitere Analyse.`;
        }
        const ci = hd;
        const channelsI = ci.channels.length
          ? ci.channels.map(ch => `${ch.key} «${ch.name}»`).join('; ')
          : 'keine durchgehend definierten Kanaele (Reflektor-naehe)';
        const hdSummaryI = `BERECHNETER BODYGRAPH (Swiss Ephemeris, exakt, NICHT nachrechnen, NICHTS hinzufuegen oder weglassen):
- Typ: ${ci.typeDe} — Strategie: ${ci.strategy}
- Innere Autoritaet: ${ci.authorityDe}
- Profil: ${ci.profile} (${ci.profileAngle}) — Definition: ${ci.definition}
- Signatur: ${ci.signature} | Not-Self-Thema: ${ci.notSelfTheme}
- Definierte Zentren: ${ci.centers.definedDe.join(', ') || 'keine'}
- Offene Zentren: ${ci.centers.openDe.join(', ') || 'keine'}
- Kanaele: ${channelsI}
- Aktivierte Tore: ${ci.gates.map(g => g.gate).join(', ')}
- Inkarnationskreuz: ${ci.incarnationCross.notation}, ${ci.incarnationCross.angle}`;

        return `${intro}

${langInstr}

MODUS: Human Design — individuelle Frage (eigenstaendig, KEINE Numerologie, kein Tarot, keine Methodik offenlegen). Du bist ein erfahrener, warmer Human-Design-Reader in der Synthese-Tradition. Du beantwortest die Frage unten DIREKT, tief und konkret, ausschliesslich gestuetzt auf den unten exakt berechneten BodyGraph dieser Person. Keine feste Rundum-Struktur, keine generische Profil-Analyse. Du sprichst die Person direkt an (du), warm, ehrlich, ermutigend, nie dogmatisch.

PERSON: ${p1.firstName || 'Diese Person'}${p1.birthDate ? `, geboren am ${p1.birthDate}` : ''}${(p1.birthTime && p1.birthTime !== 'unbekannt') ? ` um ${p1.birthTime}` : ''}${p1.birthPlace ? ` in ${p1.birthPlace}` : ''}.

${hdSummaryI}

AUFTRAGSART: ${presetLabelI}
FRAGE / AUFTRAG (zentrale Frage):
${auftragI}${detailText ? `\n\nZUSAETZLICHER KONTEXT der beratenden Person (unbedingt einbeziehen, das ist die konkrete Situation):\n${detailText}` : ''}

AUSGABE-REGELN:
- Beginne mit «Auf einen Blick» (ca. 120 bis 180 Woerter): die Kernantwort vorweg, warm und konkret, danach die Vertiefung.
- Gehe DIREKT auf die Frage ein, ueber Typ, Strategie, Autoritaet und die fuer die Frage RELEVANTEN Zentren, Tore und Kanaele. Keine vollstaendige Chart-Abhandlung, sondern fokussiert auf das Gefragte.
- Stuetze JEDE Aussage auf den berechneten BodyGraph oben. Erfinde keine Tore, Kanaele oder Zentren dazu.
- Jede Sektion wird mit ~~~ abgetrennt, erste Zeile ist der Sektionstitel, dann der Inhalt; danach lueckenlos nummerieren.
- Verwende wo passend [ESSENZ:Text] als abschliessenden Kernsatz.
- Titel der Analyse ist «Deine persönliche Analyse».
- Zieltiefe etwa ${state.depth} Seiten, lieber dicht und konkret als aufgeblasen.`;
      }

      // ── HUMAN DESIGN: komplett eigenstaendiger Zweig (keine Numerologie, kein Crowley) ──
      if (state.mode === 'humandesign') {
        const hd = hdData || {};
        if (!hd.available) {
          return `${intro}\n\n${langInstr}\n\nMODUS: Human Design. Die Berechnung des BodyGraphs war nicht moeglich (${(hd.reason || 'Geburtszeit oder Geburtsort fehlen')}). Erklaere der Person in zwei, drei warmen Saetzen, dass Human Design zwingend das exakte Geburtsdatum, die GENAUE Geburtszeit (auf die Minute) und den Geburtsort braucht, weil der ganze Chart auf der Minute beruht, und bitte sie, diese Angaben zu ergaenzen. Keine weitere Analyse.`;
        }
        // ── HD PAAR (Connection Chart): zwei BodyGraphs + Verbindung ──
        if (state.constellation === 'pair' && hd.a && hd.b && hd.connection) {
          const conn = hd.connection;
          const btP = BEZ_TYPEN[state.relationshipType] || BEZ_TYPEN.partnerschaft;
          const themen = (state.themes && state.themes.length) ? state.themes.join(', ') : '';
          const nA = hd.a.name, nB = hd.b.name;

          const fmtChart = (c, label) => {
            const channelsList = c.channels.length
              ? c.channels.map(ch => `${ch.key} «${ch.name}»`).join('; ')
              : 'keine durchgehend definierten Kanaele (Reflektor-naehe)';
            return `${label} (${c.name || ''}):
- Typ: ${c.typeDe} — Strategie: ${c.strategy}
- Innere Autoritaet: ${c.authorityDe}
- Profil: ${c.profile} (${c.profileAngle}) — Definition: ${c.definition}
- Definierte Zentren: ${c.centers.definedDe.join(', ') || 'keine'}
- Offene Zentren: ${c.centers.openDe.join(', ') || 'keine'}
- Kanaele: ${channelsList}
- Aktivierte Tore: ${c.gates.map(g => g.gate).join(', ')}`;
          };

          const byType = (t) => conn.channels.filter(ch => ch.type === t);
          const fmtCh = (ch) => `${ch.channel} «${ch.name}» (${ch.centers.join(' – ')})`;
          const fmtDom = (ch) => `${ch.channel} «${ch.name}»: ${ch.holders.full[0]} praegt ${ch.holders.full[0] === nA ? nB : nA}`;
          const em = byType('elektromagnetisch');
          const comp = byType('gefaehrtenschaft');
          const dom = byType('dominanz');
          const kom = byType('kompromiss');

          const connBlock = `
BERECHNETE VERBINDUNG (Connection Chart, exakt — NICHT nachrechnen, NICHTS hinzufuegen):

ELEKTROMAGNETISCH (Anziehung mit Reibung — jeder bringt eine Haelfte, zusammen entsteht der ganze Kanal; magnetische Anziehung und zugleich Reibungspunkte):
${em.length ? em.map(fmtCh).join('\n') : '  keine'}

GEFAEHRTENSCHAFT (beide haben denselben ganzen Kanal — tiefe Vertrautheit und Gleichklang, aber wenig Funke/Spannung an dieser Stelle):
${comp.length ? comp.map(fmtCh).join('\n') : '  keine'}

DOMINANZ (einer hat den ganzen Kanal, der andere kein Tor davon — einseitige, konstante energetische Praegung in diesem Thema):
${dom.length ? dom.map(fmtDom).join('\n') : '  keine'}

KOMPROMISS (einer hat den ganzen Kanal, der andere nur ein Tor — Anpassung noetig, der Teil-Habende wird vom Voll-Habenden konditioniert):
${kom.length ? kom.map(fmtCh).join('\n') : '  keine'}

IM PAAR NEU DEFINIERTE ZENTREN (entstehen NUR durch eure Verbindung — keiner von beiden hat sie allein; hier erschafft die Beziehung etwas Neues): ${conn.newlyDefined.length ? conn.newlyDefined.join(', ') : 'keine'}
VERBUNDENE ZENTREN INSGESAMT: ${conn.connectedCenters.join(', ') || 'keine'}`;

          return `${intro}

${langInstr}

MODUS: Human Design — VERBINDUNG ZWEIER MENSCHEN (Connection Chart, Synthese-Tradition). Du bist ein erfahrener, warmer Human-Design-Reader. Du deutest AUSSCHLIESSLICH die unten exakt berechneten zwei BodyGraphs und ihre berechnete Verbindung. Keine Methodik-Schau, keine Numerologie, kein Tarot. Sprich warm, konkret, ermutigend, nie dogmatisch. Sprich beide Personen mit Vornamen an und das Paar als «ihr».

BEZIEHUNGSTYP: ${btP.label}. Fokus: ${btP.fokus || ''}. Leitfrage: ${btP.frage || ''}${themen ? `\nGEWAEHLTE SCHWERPUNKTE (besonders beruecksichtigen): ${themen}` : ''}

${fmtChart(hd.a, 'PERSON A')}

${fmtChart(hd.b, 'PERSON B')}
${connBlock}

AUSGABE-STRUKTUR (jede Sektion mit ~~~ abgetrennt, erste Zeile ist der Sektionstitel, dann der Inhalt; lueckenlos nummerieren):
1. «Auf einen Blick»: die Essenz dieser Verbindung in warmen, klaren Saetzen — was zwischen ${nA} und ${nB} energetisch passiert, das Wichtigste vorweg.
2. «${nA} im Kern»: Typ, Strategie, Autoritaet, Profil — kurz und lebensnah, damit die Dynamik verstaendlich wird.
3. «${nB} im Kern»: dasselbe fuer ${nB}.
4. «Wie ihr euch anzieht und reibt»: deute die ELEKTROMAGNETISCHEN Kanaele als Orte von Anziehung UND Reibung. Konkret, an den genannten Kanaelen entlang.
5. «Wo ihr euch tief versteht»: die GEFAEHRTENSCHAFTS-Kanaele als Vertrautheit und Gleichklang — und der ehrliche Hinweis, wo dadurch der Funke fehlen kann.
6. «Wo einer den anderen praegt»: die DOMINANZ-Kanaele als einseitige energetische Praegung, mit Richtung (wer praegt wen) und wie sich das im Alltag anfuehlt — fuer beide Seiten.
7. «Wo ihr euch anpasst»: die KOMPROMISS-Kanaele als Anpassungsfelder, einfuehlsam und ohne Wertung.
8. «Was eure Verbindung neu erschafft»: die im Paar NEU definierten Zentren — das Besondere, das nur zwischen euch entsteht und das keiner solo hat. Das ist oft das Herz der Beziehung.
9. «Eure Dynamik als ${btP.label}»: alles zusammenfuehren durch die Linse dieses Beziehungstyps${themen ? `, mit besonderem Blick auf: ${themen}` : ''}.
10. «Reibung und Wachstum»: wo es energetisch hakt und wie ihr typgerecht (ueber eure Strategien und Autoritaeten) gut damit umgeht.
11. «Konkrete Schritte fuer eure Verbindung»: drei bis fuenf warme, umsetzbare Impulse fuer den Alltag zu zweit.
Zum Schluss [ESSENZ:Text] als ein warmer Kernsatz ueber diese Verbindung.

WICHTIG:
- Stuetze JEDE Aussage auf die berechneten Charts und die berechnete Verbindung oben. Erfinde keine Kanaele, Tore oder Zentren dazu, lasse nichts weg.
- Wenn eine Verbindungsart «keine» hat, sage das ehrlich und kurz, statt etwas zu erfinden.
- Du darfst [ESSENZ:Text] fuer den Schlusssatz verwenden.
- Titel der Analyse ist «Euer BodyGraph».
- Zieltiefe etwa ${state.depth} Seiten, lieber dicht und konkret als aufgeblasen.${state.ritual ? `\n- Haenge als letzte Sektion «Ritual & Affirmationen» an: kurze Hinfuehrung, genau 7 Wir-Affirmationen (jede eigene Zeile, Leerzeile dazwischen, mit «✦ »), passend zur Verbindung.` : ''}`;
        }

        const c = hd;
        const fmtAct = (side) => Object.entries(c.activations[side])
          .map(([k, v]) => `  ${v.glyph} ${v.de}: Tor ${v.gate}.${v.line}`).join('\n');
        const gatesList = c.gates.map(g => `Tor ${g.gate} (${g.centerDe})`).join(', ');
        const channelsList = c.channels.length
          ? c.channels.map(ch => `${ch.key} «${ch.name}» (${ch.centersDe.join(' – ')})`).join('; ')
          : 'keine durchgehend definierten Kanaele (Reflektor-naehe)';
        const v = c.variables;
        const hdChart = `
BERECHNETER BODYGRAPH (Swiss Ephemeris, exakt, NICHT selbst nachrechnen, NICHTS hinzufuegen oder weglassen):

GRUNDGERUEST
- Typ: ${c.typeDe}
- Strategie: ${c.strategy}
- Innere Autoritaet: ${c.authorityDe}
- Profil: ${c.profile} (${c.profileAngle})
- Definition: ${c.definition}
- Signatur (im Flow): ${c.signature} | Not-Self-Thema (aus dem Flow): ${c.notSelfTheme}

ZENTREN
- Definiert (konsistente, verlaessliche Energie): ${c.centers.definedDe.join(', ') || 'keine'}
- Offen/undefiniert (Konditionierung, Lernfelder, Weisheit): ${c.centers.openDe.join(', ') || 'keine'}

KANAELE (definiert): ${channelsList}

AKTIVIERTE TORE: ${gatesList}

AKTIVIERUNGEN
 Persoenlichkeit (bewusst, Geburtsmoment):
${fmtAct('personality')}
 Design (unbewusst, 88 Grad Sonnenbogen vor Geburt):
${fmtAct('design')}

INKARNATIONSKREUZ: ${c.incarnationCross.notation}, ${c.incarnationCross.angle}
 (Tore: Persoenlichkeit Sonne ${c.incarnationCross.gates.personalitySun} / Erde ${c.incarnationCross.gates.personalityEarth}, Design Sonne ${c.incarnationCross.gates.designSun} / Erde ${c.incarnationCross.gates.designEarth})

VARIABLEN / PFEILE (Determination, Umgebung, Motivation, Perspektive): ${c.variablesShort}
- Determination/Verdauung (links oben, ${v.digestion.arrow}-Pfeil)
- Umgebung (links unten, ${v.environment.arrow}-Pfeil)
- Motivation (rechts oben, ${v.motivation.arrow}-Pfeil)
- Perspektive (rechts unten, ${v.perspective.arrow}-Pfeil)`;

        return `${intro}

${langInstr}

MODUS: Human Design (eigenstaendige Analyse, KEINE Numerologie, KEINE Astrologie-Deutung im klassischen Sinn, KEIN Tarot, keine Methodik offenlegen). Du bist ein erfahrener, warmer Human-Design-Reader in der Synthese-Tradition (Typ, Strategie, Autoritaet, Profil, Zentren, Tore, Kanaele, Inkarnationskreuz, Variablen). Du deutest AUSSCHLIESSLICH den unten exakt berechneten BodyGraph dieser Person. Du sprichst die Person direkt an (du), warm, konkret, ermutigend, nie dogmatisch.

PERSON: ${p1.firstName || 'Diese Person'}${p1.birthDate ? `, geboren am ${p1.birthDate}` : ''}${(p1.birthTime && p1.birthTime !== 'unbekannt') ? ` um ${p1.birthTime}` : ''}${p1.birthPlace ? ` in ${p1.birthPlace}` : ''}.
${hdChart}

AUSGABE-STRUKTUR (jede Sektion mit ~~~ abgetrennt, erste Zeile ist der Sektionstitel, dann der Inhalt; danach lueckenlos nummerieren):
1. «Auf einen Blick» (ca. 150 bis 200 Woerter): Typ, Strategie, Autoritaet und Profil dieser Person in warmen, klaren Saetzen auf den Punkt gebracht, das Wichtigste vorweg.
2. «Dein Typ und deine Strategie»: was der Typ ${c.typeDe} bedeutet, wie Energie bei dieser Person wirkt, wie die Strategie im Alltag konkret aussieht, was Signatur und Not-Self-Thema im Erleben heissen.
3. «Deine innere Autoritaet»: wie diese Person richtig entscheidet, mit konkreten Alltagsbeispielen.
4. «Dein Profil ${c.profile}»: die beiden Linien, ihre Rollen, wie sie zusammenspielen, der Lebensbogen.
5. «Deine Zentren»: zuerst die definierten (verlaessliche Energie), dann die offenen (wo die Person konditioniert wird, lernt und Weisheit entwickelt). Pro Zentrum konkret und lebensnah.
6. «Deine Kanaele und Tore»: die definierten Kanaele als Lebensthemen, die wichtigsten Tore. Verstaendlich, nicht als Aufzaehlung.
7. «Dein Inkarnationskreuz»: das groessere Lebensthema, getragen von den vier Sonnen- und Erd-Toren.
8. «Deine Variablen»: Determination, Umgebung, Motivation und Perspektive als feine Hinweise zur Lebensfuehrung (kurz und zugaenglich halten).
9. «Dein Gesundheitskompass» (energetische Lebensfuehrung, im Geist der typgerechten Vitalitaetsarbeit): leite aus Typ, Strategie, Autoritaet, definierten vs. offenen Zentren und der Determination Hinweise zu Energiehaushalt, Erholung, Ernaehrungs-Rhythmus und Stressmustern ab. Deute die OFFENEN Zentren als koerperlich-seelische Lernfelder (z.B. offene Wurzel: Druck und Hetze; offener Solarplexus: fremde Emotionen; offene Milz: Umgang mit Aengsten und Gesundheitssignalen). KEINE Diagnosen, KEINE Heilversprechen, keine konkreten Praeparate oder Dosierungen, keine Symptom-Tabellen. Beginne diese Sektion mit dem Satz: «Dieser Gesundheitskompass ist energetische Selbsterkenntnis, keine medizinische Diagnose oder Therapie. Bei gesundheitlichen Anliegen wende dich an aerztlichen Rat.»
10. «Wie du dein Design lebst»: drei bis fuenf konkrete, ermutigende Schritte fuer den Alltag.
Zum Schluss [ESSENZ:Text] als ein warmer Kernsatz.

WICHTIG:
- Stuetze JEDE Aussage auf den berechneten Chart oben. Erfinde keine Tore, Kanaele oder Zentren dazu, lasse nichts weg.
- Du darfst [ZAHL:X] fuer ein hervorgehobenes Tor oder einen Schluesselwert verwenden und [ESSENZ:Text] fuer den Schlusssatz.
- Titel der Analyse ist «Dein BodyGraph».
- Zieltiefe etwa ${state.depth} Seiten, lieber dicht und konkret als aufgeblasen.${state.ritual ? `\n- Haenge als letzte Sektion «Ritual & Affirmationen» an: kurze Hinfuehrung, genau 7 Ich-Affirmationen (jede eigene Zeile, Leerzeile dazwischen, mit «✦ »), passend zu Typ und Strategie.` : ''}`;
      }

      // Personenvergleich (nur bei 'pair'): Beziehungstyp-Linse, typ-spezifische Sektion 3, Themen
      const isPersonenvergleich = state.constellation === 'pair';
      const bt = BEZ_TYPEN[state.relationshipType] || BEZ_TYPEN.partnerschaft;
      const nameA = p1.firstName || 'Person 1';
      const nameB = (p2 && p2.firstName) || 'Person 2';
      const bezLens = isPersonenvergleich
        ? `\nBEZIEHUNGSTYP: ${bt.label}. Fokus dieser Beziehung: ${bt.fokus}. Leitfrage: ${bt.frage}`
        : '';
      const bezSek3 = isPersonenvergleich
        ? bezDynamikSektion(state.relationshipType, nameA, nameB)
        : '3. Beziehungsdynamik, mindestens 1500 Wörter, mit [DYNAMIK:...] und Erklärungstext, führt durch Resonanz, Reibung und Wachstumsfelder.';
      const themenBlock = (isPersonenvergleich && state.themes.length)
        ? `\nSCHWERPUNKTE DES VERGLEICHS (von der Beraterin gewaehlt): ${state.themes.join(', ')}. Gewichte die gesamte Analyse so, dass diese Anliegen besonders beleuchtet werden, und beziehe sie konkret auf die Zahlen und astrologischen Fakten beider Personen.`
        : '';

      // Optionale Modul-Abwahl (Vollanalyse)
      const omitNames = (state.disabledSections || [])
        .map(k => (SECTION_OPTIONS.find(o => o[0] === k) || [])[1])
        .filter(Boolean)
        .flatMap(v => Array.isArray(v) ? v : [v]);
      const omitBlock = omitNames.length
        ? `\n\n⚠️ ABGEWAEHLTE MODULE (von der Beraterin bewusst weggelassen): ${omitNames.join('; ')}.\nERSTELLE DIESE SEKTIONEN NICHT und erwaehne sie auch nicht. Ueberspringe sie vollstaendig und nummeriere die verbleibenden Sektionen lueckenlos und fortlaufend neu (1, 2, 3, ...). Der zentrale Code und die Essenz bleiben immer erhalten.\n`
        : '';
      // Abhaengigkeit: Lebensthemen G/H/I brauchen die Achsen MC/IC/DC (auch ohne Achsen-Modul)
      const lebensthemenAktiv = ['layer_g', 'layer_h', 'layer_i'].some(k => !(state.disabledSections || []).includes(k));
      const axisNote = lebensthemenAktiv
        ? `\nACHSEN-HINWEIS: Die Module Lebensaufgabe (G), Beruf (H) und Beziehungen (I) nutzen die Achsen MC, IC und DC. Leite DC als Gegenpol des Aszendenten (AC + 180 Grad) und IC als Gegenpol des MC ab und verwende sie, auch wenn das Modul «Die vier Achsen» nicht erstellt wird.`
        : '';
      // Reihenfolge der Sektionen im Output (zwingend)
      const orderBlock = `\nSEKTIONS-REIHENFOLGE im Output (zwingend einhalten, danach lueckenlos nummerieren): zuerst «Auf einen Blick»; dann Fundament & Kern (zentraler Code, Lebensweg/Schluesseldaten, Namen-Numerologie, Herausforderung & Schluessel); dann Numerologische Tiefe (Pinnacles, Layer A, Layer B); dann das astrologische Geburtsbild (Astrologische Tiefe Layer C, Die vier Achsen); dann die Lebensthemen (Lebensaufgabe G, Beruf H, Beziehungen I, Geld J, Schatten & Wachstum M); dann Timing & Zyklen (${multiPerson ? 'Jahresenergien-Tabelle, Persoenlicher Tag E' : 'Persoenliches Jahr, Jahresenergien, Persoenlicher Tag E'}, Saturn & Jupiter F, Transite K, Lebenszyklen L); dann Ahnenlinie und Namenswechsel falls vorhanden; dann GANZ AM ENDE der Entscheidungsradar (Layer O) als Synthese; und als allerletztes die Essenz.`;


      if (state.mode === 'kurzprofil') {
        const anrede = p1.firstName || 'Diese Person';
        const lz = lifeNum(p1.birthDate);
        return `${intro}

${langInstr}

MODUS: KURZPROFIL — ein kompaktes Werkzeug FUER DICH (die beratende Person), nicht fuer die analysierte Person selbst. Es hilft dir, im Umgang mit ${anrede} schnell zu erfassen, wie dieser Mensch tickt. Geschrieben in der DRITTEN Person ueber ${anrede}, durchgehend im vorsichtigen Tendenz-Ton («kann dazu neigen», «zeigt sich oft», «tendiert dazu»). NIEMALS absolute Etikettierung, NIEMALS Diagnose. Es sind Tendenzen aus Zahlen und grober Astrologie, keine Gewissheiten.

PERSON:
${personBlock(p1, 'PERSON 1')}

VORBERECHNETE NAMEN-NUMEROLOGIE (exakt so verwenden):
${nameNumsText(nn1, 'PERSON 1')}
${pj1Block}
${ext1Block}
${astro1Block}

HARTE LAENGENGRENZE: maximal knapp ZWEI A4-Seiten gesamt. Lieber dicht und treffsicher als lang. Keine Wiederholungen, keine Fuellsaetze, keine generischen Phrasen. Jeder Block ist EIN dichter, kurzer Absatz (etwa 60 bis 110 Woerter), nicht mehr.

AUSGABE-STRUKTUR (genau diese 7 Bloecke, jeder mit ~~~ abgetrennt, erste Zeile ist der Titel, dann der Absatz):
1. «Im Kern»: das Wesen von ${anrede} in einem bis zwei Saetzen. Nutze [ESSENZ:Text] fuer diesen Kernsatz.
2. «Grundmuster & Antrieb»: was diesen Menschen im Innersten bewegt und antreibt.
3. «Typisches Verhalten»: wie sich das im Alltag und im Umgang konkret zeigt.
4. «Kommunikationsstil»: wie ${anrede} im Austausch tickt, wie man sie oder ihn am besten erreicht und anspricht.
5. «Staerken»: worauf man bei ${anrede} bauen kann.
6. «Trigger & Reibungspunkte»: was Stress ausloest, in die Defensive bringt oder zu Reibung fuehrt.
7. «So gehst du gut mit ${anrede} um»: drei bis vier konkrete, umsetzbare Hinweise fuer den Umgang, als kurze Aufzaehlung jeweils mit «• ».

REGELN:
- Schreibe ueber ${anrede} in der dritten Person, mit Vornamen wo es natuerlich klingt.
- Stuetze die Aussagen auf die berechneten Fakten oben (u.a. Lebenszahl ${lz}, Namenszahlen, grobe Astrologie), aber OHNE sie aufzuzaehlen oder die Methodik offenzulegen. Keine Zahlen-Vorlesung, keine Kartennamen, kein Tarot.
- Halte den vorsichtigen Tendenz-Ton in JEDEM Block durch.
- Bleibe wohlwollend und respektvoll, nie abwertend, nie schubladisierend.
- Titel der Analyse ist «Kurzprofil».`;
      }

      if (state.mode === 'individual') {
        const auftragText = (val('auftrag-text') || '').trim();
        const detailText = (val('auftrag-detail') || '').trim();
        const preset = AUFTRAG_PRESETS[state.auftragPreset] || null;
        const presetLabel = preset ? preset.label : 'Individueller Auftrag';
        const includeAstro = state.auftragAstro !== false;
        const isFrage = state.auftragPreset === 'frage';
        const auftrag = auftragText || (preset ? preset.prefill : '') || presetLabel;
        return `${intro}

${langInstr}

MODUS: Individuelle Analyse (freier Auftrag). Du erstellst KEINE feste Sektionsstruktur. Du beantwortest den Auftrag unten direkt, tief und konkret, immer gestuetzt auf die berechneten Zahlen und Astro-Fakten dieser Person.

PERSON:
${personBlock(p1, 'PERSON 1')}

VORBERECHNETE NAMEN-NUMEROLOGIE (exakt so verwenden):
${nameNumsText(nn1, 'PERSON 1')}
${pj1Block}
${ext1Block}${includeAstro ? `\n${astro1Block}` : ''}

AUFTRAGSART: ${presetLabel}
AUFTRAG (zentrale Frage/Aufgabe):
${auftrag}${detailText ? `\n\nZUSAETZLICHER KONTEXT der beratenden Person (unbedingt einbeziehen, das ist die konkrete Situation):\n${detailText}` : ''}${isFrage ? `\n\nDIES IST EINE PERSOENLICHE FRAGE der Person an sich selbst. Beantworte GENAU diese Frage, direkt, warm und in die Tiefe. Die Antwort ergibt sich vollstaendig aus den Zahlen und Astro-Fakten oben. Schreibe keine generische Rundum-Profil-Analyse, sondern eine fokussierte, ehrliche Antwort auf das, was die Person wissen will.` : ''}

AUSGABE-REGELN:
- Beginne mit einer kurzen Sektion «Auf einen Blick» (ca. 120 bis 180 Wörter): die Kernantwort bzw. das Wichtigste vorweg, warm und konkret, danach die Vertiefung.
- Gehe DIREKT auf den Auftrag ein. Keine generische Rundum-Analyse, sondern genau das Gefragte.
- Strukturiere frei und sinnvoll. Jede Sektion wird mit ~~~ abgetrennt, erste Zeile ist der Sektionstitel, dann der Inhalt.
- Stuetze JEDE Aussage auf die konkreten Zahlen und Astro-Fakten oben und benenne die relevanten Zahlen.
- Verwende wo passend [ZAHL:X] fuer einen hervorgehobenen Code und [ESSENZ:Text] als abschliessenden Kernsatz.
- ${includeAstro ? 'Beziehe die berechneten Astro-Werte (Mond, Aszendent, Knoten) ein, wo sie zum Auftrag beitragen.' : 'Astrologie ist fuer diesen Auftrag deaktiviert. Arbeite rein numerologisch.'}
- Kein Tarot, keine Kartennamen, keine Methodik offenlegen.
- Zieltiefe etwa ${state.depth} Seiten. Lieber dicht und praezise als aufgeblasen.${state.ritual ? `\n- Haenge als letzte Sektion "Ritual & Affirmationen" an: kurze Hinfuehrung, genau 7 Ich-Affirmationen (jede eigene Zeile, Leerzeile dazwischen, mit "✦ "), und ein kurzes Jahresritual zum aktuellen Persoenlichen Jahr.` : ''}`;
      }

      return `${intro}

${langInstr}

KONSTELLATION: ${state.constellation}
FOKUS: ${state.focus}${bezLens}${themenBlock}
${personBlock(p1, 'PERSON 1')}
${p2 ? personBlock(p2, 'PERSON 2') : ''}
${compatBlock}
${coupleBlock}
${kids}
${nc1}${nc2}

VORBERECHNETE NAMEN-NUMEROLOGIE (diese Zahlen sind korrekt — verwende sie exakt so):
${nameNumsText(nn1, 'PERSON 1')}
${nn2 ? nameNumsText(nn2, 'PERSON 2') : ''}
${nnKids.map((nn, i) => nameNumsText(nn, `KIND ${i+1}`)).join('\n')}
${ancestryBlock}
${pj1Block}
${pj2Block}
${pjKidsBlocks}
${ext1Block}
${ext2Block}
${extKidsBlocks}
${astro1Block}
${astro2Block}
${astroKidsBlocks}

Gib die Analyse als strukturierten Text zurück. Trenne Sektionen mit ~~~.
Jede Sektion beginnt mit dem Titel, dann einem Zeilenumbruch, dann dem Inhalt.

Verwende folgende spezielle Markierungen innerhalb der Sektionen:

Für grosse Zahlen / Codes: [ZAHL:11] oder [ZAHL:11/3]
Für Personen-Cards (2 nebeneinander): [PERSON-GRID-START] ... [PERSON-CARD:Label|Name|Datum · Zeit · Ort|Sternzeichen|Beschreibung|LZ:11|Pinnacle:9|PersJahr:4] ... [PERSON-GRID-END]
Für 2-spaltige Info-Karten: [KARTEN-GRID-START] ... [KARTE:Eyebrow|Titel|Untertitel|Beschreibung] ... [KARTEN-GRID-END]
Für Beziehungs-Dynamik: [DYNAMIK:SIE-Label|SIE-Zahl|ER-Label|ER-Zahl|Resonanz-Text]
Für astrologische Verbindungen als Karten: [ASTRO-START] ... [ASTRO:Symbol|Titel|Text] ... [ASTRO-END]
Für Herausforderung & Schlüssel 2-spaltig: [HS-START] ... [HERAUSFORDERUNG:Text] ... [SCHLUESSEL:Text] ... [HS-END]
Für Jahresenergien-Tabelle: Nur so viele Spalten wie tatsächlich Personen vorhanden sind. Verwende: [JAHRES-TABELLE:${[p1.firstName, hasPair && p2?.firstName, ...(hasKids ? getChildren().map(c => c.firstName) : [])].filter(Boolean).join('|')}] gefolgt von Zeilen: [JAHR:Jahr-Bereich|Zahl·Keyword${hasPair ? '|Zahl·Keyword' : ''}${hasKids ? getChildren().map(() => '|Zahl·Keyword').join('') : ''}]. Verwende die ECHTEN, vorberechneten PJ-Werte aus dem PERSOENLICHES JAHR IM DETAIL-Block oben (nicht halluzinieren). Jahr-Bereich-Format: gib den Geburtstag-zu-Geburtstag Zeitraum an, z.B. "11/2025 bis 11/2026" statt "2025". Liste 6 Jahre auf, beginnend mit dem aktuell aktiven PJ.
Für Pinnacles: [PINNACLE:Person|Nummer|Zeitraum|Zahl|Beschreibung|Challenge]. Im Zeitraum-Feld IMMER zwei Formate kombinieren: "0 bis 26 Jahre (1987 bis 2013)" oder "ab 36 Jahre (ab 2023)" oder "27 bis 35 Jahre (2014 bis 2022)". Berechne die Jahreszahlen exakt aus dem Geburtsjahr der Person + Alter.
Für Namen-Numerologie Cards: [NAMEN-GRID-START] ... [NAMEN-CARD:Name|Rolle|Seelendrang-Zahl|Seelendrang-Label|Pers-Zahl|Pers-Label|Ausdruck-Zahl|Ausdruck-Label|Beschreibung] ... [NAMEN-GRID-END]
PFLICHTREGELN für NAMEN-CARD:
- Name = vollständiger Name in normaler Schreibweise, KEINE Bindestriche zwischen Buchstaben (richtig: "Mauro Casellini", falsch: "M-A-U-R-O")
- Rolle = kurze Bezeichnung wie "Vollständiger Name · Lebenszahl 11" oder "Vorname" oder "Nachname"
- Alle drei Zahlenpaare (Seelendrang, Persönlichkeit, Ausdruck) MÜSSEN echte berechnete Zahlen enthalten — niemals "—" oder leer lassen
- Berechne die Zahlen selbst aus dem Namen nach dem pythagoreischen System (A=1,B=2,...,I=9,J=1,...)
- Beispiel korrekt: [NAMEN-CARD:Mauro Casellini|Vollständiger Name|1|Pionier|4|Struktur|5|Freiheit|Beschreibung hier]
Für Essenz (letzter Satz, gross): [ESSENZ:Text]
Für normalen Fliesstext: einfach Text ohne Markierung.

${omitBlock}
ERÖFFNUNG (PFLICHT, als allererste Sektion ganz am Anfang, vor den nummerierten Sektionen, mit ~~~ abgetrennt): Titel «Auf einen Blick». Gib in ca. 200 bis 300 Wörtern einen warmen, konkreten Überblick über die ganze Analyse${hasPair ? ' für beide Personen' : ''}: die wichtigsten Kernzahlen, das zentrale Lebensthema,${multiPerson ? ' die gemeinsame Dynamik' : ' das aktuell aktive Persönliche Jahr'} und zwei bis drei zentrale Botschaften, die sich durch die Analyse ziehen. Einladend und konkret, ohne die Details vorwegzunehmen. Danach folgen die Sektionen wie unten.
${multiPerson ? `\n🔗 FOKUS BEI MEHREREN PERSONEN (Paar/Familie/Alleinerziehend): KEINE Sektion «Persönliches Jahr» (weder aktuell noch nächstes) für irgendeine Person, das wird hier komplett weggelassen. Diese drei Sektionen MÜSSEN für ALLE Mitglieder (${memberNamesStr}) erscheinen, aber jeweils SAUBER UND KOMPAKT (kurze Karten/Zeilen, wenige Sätze pro Person): Namen-Numerologie, Jahresenergien-Tabelle, Persönlicher Tag. Halte generell ALLE individuellen Numerologie-Portraits knapp und lege das Gewicht klar auf die GEMEINSAME Ebene: Beziehungs- bzw. Familiendynamik, der verbindende Code, Resonanz und Reibung, gemeinsame Richtung und gemeinsame Themen. Nummeriere die Sektionen lueckenlos und fortlaufend (es gibt keine PJ-Sektion, lasse keine Luecke).\n` : ''}

Erstelle folgende Sektionen mit erheblicher Tiefe. ZIELLAENGE: durchschnittlich 1500 Wörter pro Sektion (Kurz-Sektionen wie Essenz ausgenommen). Schreibe wie eine erfahrene Beraterin mit 20 Jahren Erfahrung, die Zeit hat. Keine generischen Phrasen, jede Aussage muss an konkrete Daten der Person ankoppeln.${orderBlock}${axisNote}

${hasPair ? `🔑 MASTER-REGEL FÜR PAAR/FAMILIE: Bei den individuellen Sektionen (Lebensweg, Pinnacles, Layer A/B/C/E/F, Namens-Numerologie) MUSST DU EXPLIZIT FÜR JEDE EINZELNE PERSON eine eigene Sub-Sektion schreiben. NICHT NUR Person 1 detailliert beschreiben, dann Person 2 in einem Satz abhaken. Beide (bzw. alle) Personen werden GLEICHWERTIG, GLEICH LANG, GLEICH DETAILLIERT behandelt. Pro Sektion separate Unterüberschriften für ${p1.firstName || 'Person 1'}${hasPair && p2?.firstName ? ' und ' + p2.firstName : ''}${hasKids ? ' und jedes Kind' : ''}. Halte die individuellen Numerologie-Portraits dabei eher kompakt und gib der gemeinsamen Dynamik das groessere Gewicht.\n\n` : ''}1. Der zentrale Code, mindestens 1200 Wörter${hasPair ? ` — jede Person bekommt einen eigenen Hauptcode-Block. Schreibe einen Abschnitt fuer ${p1.firstName || 'Person 1'}, dann einen für ${p2?.firstName || 'Person 2'}. Beide mit [ZAHL:X] und ausführlicher Erklärung ihrer Lebenszahl, Mission, Schatten und Geschenke. Mindestens 600 Wörter pro Person` : ''}, mit [ZAHL:X] für den Haupt-Code, dann ausführliche Erklärung des Lebensthemas, der Mission, der Schatten und Geschenke.
${hasPair ? `2. Schlüsseldaten des Paares, mindestens 1500 Wörter, mit [KARTEN-GRID-START/END] für Kennenlernen & Hochzeit, dann [PERSON-GRID-START/END] für beide. Erwähne den Beziehungscode (Kompatibilitätszahl) tiefgehend.
${bezSek3}
4. Astrologische Kernverbindungen, mindestens 1500 Wörter, mit [ASTRO-START/END], inklusive Synastrie-Aspekte.
` : `2. Dein persönlicher Lebensweg, mindestens 1500 Wörter, ausführlicher Fliesstext mit den Lebensphasen, Mustern, Talenten, Schattenseiten.
3. Deine Namen-Energie, mindestens 1500 Wörter, mit [NAMEN-GRID-START/END], plus tiefe Interpretation jedes Aspekts (Seelendrang, Persönlichkeit, Ausdruck).
`}
${hasKids ? `5. Die Kinder, mindestens 1500 Wörter, mit [PERSON-GRID-START/END] pro Kind, ausführlicher Fliesstext pro Kind mit Lebensaufgabe, Begabungen, Erziehungshinweisen.
` : ''}
${state.constellation === 'family' ? `6. Das Familiensystem, mindestens 1500 Wörter, Fliesstext mit Rollen, Resonanzen, ungelösten und erlösten Themen.
` : ''}
7. Herausforderung & Schlüssel${hasPair ? ` — separate Sub-Sektionen für ${p1.firstName || 'Person 1'} und ${p2?.firstName || 'Person 2'}` : ''}, mindestens 1000 Wörter${hasPair ? ' (500 pro Person)' : ''}, mit [HS-START/END] und vertiefenden Absätzen zur Bedeutung beider Pole.

${multiPerson ? '' : `8. Aktuelles Persönliches Jahr im Detail${hasPair ? `. WICHTIG: Schreibe DIESE GANZE SEKTION zweimal — einmal für ${p1.firstName || 'Person 1'}, dann einmal für ${p2?.firstName || 'Person 2'}. Jeder Block separat strukturiert wie unten beschrieben, mit eigener Unterüberschrift "Persönliches Jahr von [Name]"` : ''}. DIE LAENGSTE Sektion, mindestens ${hasPair ? '2400 Wörter (1200 pro Person)' : '1800 Wörter'}. PFLICHT-AUFBAU pro Person:
   (a) Beginne mit [PJ-HEADER:Persönliches Jahr von [Name]|PJ-Zahl|Startdatum bis Enddatum]. Werte aus dem PERSOENLICHES JAHR IM DETAIL-Block oben übernehmen — pro Person die jeweils korrekten Werte.
   (b) Eröffnungs-Absatz von 250 bis 350 Wörtern zum Gesamt-Thema.
   (c) Vier Quartals-Blöcke mit [QUARTAL:Titel|Zeitraum]. Pro Quartal mindestens 250 Wörter Fliesstext, der die Bewegung des Quartals beschreibt.
   (d) Schwellenmonate als [HIGHLIGHT-MONAT:Monat Jahr|PM-Zahl|Was geschieht] einsetzen wo passend (Verdichtung, Master, LZ-Echo).
   (e) Abschluss-Absatz mit Übergangsphase / Wechsel zum nächsten PJ (mindestens 200 Wörter).

9. Nächstes Persönliches Jahr${hasPair ? ` — separat für ${p1.firstName || 'Person 1'} und ${p2?.firstName || 'Person 2'}` : ''}, mindestens ${hasPair ? '1200 Wörter (600 pro Person)' : '600 Wörter'}, mit [PJ-HEADER:Nächstes Persönliches Jahr von [Name]|PJ-Zahl|Startdatum bis Enddatum] und substanzieller Beschreibung des Hauptthemas, des Wechsel-Charakters und der konkreten Änderungen.`}

10. Jahresenergien-Tabelle über 6 Jahre, mit [JAHRES-TABELLE:...] und [JAHR:...] Zeilen, geburtstagsbasiert (Format "11/2025 bis 11/2026").${multiPerson ? ` Eine gemeinsame Tabelle mit einer SPALTE pro Mitglied (${memberNamesStr}). Einleitung kompakt halten (ca. 120 Wörter), die aktuell aktive Persönliche-Jahr-Zahl jeder Person steht in deren Personendaten (Feld «Persönliches Jahr (aktuell aktiv)»); die weiteren fünf Jahre leitest du daraus deterministisch ab (jeweils +1, bei 10 auf 1 reduziert, Meisterzahlen 11/22 wo passend stehen lassen). Bezugspunkt ist das Analysedatum. Der Erklärungs-Absatz erwähnt kurz resonante und divergente Jahre der Personen.` : ' Kurze einleitende Erklärung erlaubt (200 Wörter), dann die Tabelle.'}

11. Pinnacles & Challenges${hasPair ? ` — separate Sub-Abschnitte für ${p1.firstName || 'Person 1'} und ${p2?.firstName || 'Person 2'}` : ''}, mindestens ${hasPair ? '2400 Wörter (1200 pro Person)' : '1500 Wörter'}. Verwende [PINNACLE:Person|Nummer|Zeitraum|Zahl|Beschreibung|Challenge] für jeden der 4 Pinnacles pro Person. Zeitraum-Feld IMMER mit Alter UND Jahreszahlen, z.B. "0 bis 26 Jahre (1987 bis 2013)". Verwende die berechneten Pinnacle-Werte aus dem ERWEITERTE NUMEROLOGIE-DATEN-Block oben. Identifiziere welcher Pinnacle aktuell aktiv ist und ob bald ein Wechsel ansteht. Für den AKTUELL AKTIVEN Pinnacle: zwei separate Absätze, einer zur Energie, einer zur Challenge.

12. Namen-Numerologie${multiPerson ? ` — KOMPAKT für ALLE Mitglieder (${memberNamesStr}): pro Person ein eigener [NAMEN-GRID-START/END] Block mit den drei Kernzahlen (Seelendrang, Persönlichkeit, Ausdruck) und nur 2 bis 3 Sätzen Deutung. Sauber und knapp, keine langen Abhandlungen, ca. 120 bis 180 Wörter pro Person` : ` mit vertiefendem Fliesstext zur Bedeutung jedes Namensanteils, mindestens 1200 Wörter`}, mit [NAMEN-GRID-START/END].

13. Erweiterte Zahlenebenen (Layer A)${hasPair ? ` — separate Sub-Abschnitte mit Unterüberschriften für jede Person` : ''}, mindestens ${hasPair ? '2400 Wörter (1200 pro Person)' : '1500 Wörter'}. Verwende die Daten aus ERWEITERTE NUMEROLOGIE-DATEN-Block A:
   - Geburtstagszahl als eigenes Thema
   - Reifezahl/Maturity als Hinweis was nach Alter 35 erwacht
   - Rationale Denkzahl als Hinweis wie Entscheidungen getroffen werden
   - Karmische Schulden (falls vorhanden): jede einzeln behandeln
   - Karma-Lektionen (fehlende Zahlen): jede einzeln als Lernfeld
   - Hidden Passion: was die natürliche Begabung ist
   Strukturiere mit Sub-Headern als normaler Fliesstext, KEINE eigenen Marker nötig.

14. Essence Transit (Layer B)${hasPair ? ` — separat für jede Person` : ''}, mindestens ${hasPair ? '1400 Wörter (700 pro Person)' : '800 Wörter'}. Verwende den ESSENCE-Wert aus dem Datenblock. Erkläre:
   - Welcher Buchstabe aktuell die Energie des Lebensjahres färbt
   - Welche Essenz-Zahl daraus entsteht
   - Was diese Energie mit dem aktuellen PJ kombiniert ergibt
   - Wann der nächste Buchstabe einsetzt und welche Energie er bringt

15. Astrologische Tiefe (Layer C)${hasPair ? ` — separat für jede Person, plus zusammenführender Abschnitt zu Synastrie-Resonanzen` : ''}, mindestens ${hasPair ? '2000 Wörter (1000 pro Person + 400 Synastrie)' : '1200 Wörter'}. Auf Basis von Geburtsdatum, Geburtszeit, Geburtsort:
   - Mondzeichen
   - Aszendent (nur falls Zeit und Ort verfügbar)
   - Mondknoten (Nord/Süd)
   - Persönliche Astrologie-Resonanzen
   WICHTIG: Wenn Geburtszeit fehlt, erwähne dass Mondzeichen/Aszendent nur als Annäherung verfügbar sind.

16. Persönlicher Tag am Analysedatum (Layer E)${multiPerson ? ` — KOMPAKT für ALLE Mitglieder (${memberNamesStr}): pro Person die Tagesenergie am Stichtag in 2 bis 3 Sätzen, knapp und klar, ca. 80 bis 120 Wörter pro Person` : ', mindestens 400 Wörter'}. Welche Tagesenergie am Stichtag der Analyse, was sie empfiehlt.

17. Kosmische Zyklen: Saturn & Jupiter (Layer F)${hasPair ? ` — separate Sub-Sektionen für jede Person` : ''}, mindestens ${hasPair ? '2000 Wörter (1000 pro Person)' : '1200 Wörter'}. Verwende Saturn-Returns und Jupiter-Returns aus dem Datenblock:
   - Erster Saturn-Return (~Alter 29-30): wichtige Lebensschwelle
   - Zweiter Saturn-Return (~Alter 58-60): zweite Schwelle
   - Jupiter-Returns alle 12 Jahre: kleine Glückszyklen
   - Wie kombinieren sich diese Returns mit dem aktuellen PJ
   - Was bedeutet das für das aktuelle Lebensjahr

MODUL Die vier Achsen (AC/DC/MC/IC)${hasPair ? ' — separat für jede Person' : ''}, mindestens 800 Wörter. Deute die vier Grundachsen des Geburtsbildes: AC (Aszendent, Aussenwirkung und Auftritt), DC (Deszendent, Gegenpol des AC, das Du und Partnerschaft), MC (Medium Coeli, Beruf, Berufung, Richtung), IC (Imum Coeli, Gegenpol des MC, Wurzeln, Herkunft, Fundament). DC = Gegenpol des AC (AC + 180 Grad), IC = Gegenpol des MC. Falls Geburtszeit oder Geburtsort fehlen, weise darauf hin, dass AC und MC nur näherungsweise verfügbar sind.

MODUL Lebensaufgabe & Seelenauftrag (Layer G)${hasPair ? ' — separat für jede Person' : ''}, mindestens 1200 Wörter. Verbinde Nordknoten (Richtung, Seelenauftrag), Südknoten (Vertrautes, das losgelassen werden darf), den IC (Wurzeln, Herkunft) und die Lebenszahl. Was ist die zentrale Lebensaufgabe dieser Person, was darf sie loslassen, wohin wächst sie?

MODUL Beruf & Berufung (Layer H)${hasPair ? ' — separat für jede Person' : ''}, mindestens 1200 Wörter. Aus MC (öffentliche Rolle, Richtung), Ausdruckszahl und Stärken: welche Tätigkeiten und Umfelder passen, Führung versus Spezialist, konkrete Berufsfelder, und was das aktuelle Timing für berufliche Schritte nahelegt.

MODUL Beziehungen & Partnerschaft (Layer I)${hasPair ? ' — separat für jede Person, plus ein gemeinsamer Abschnitt zur Resonanz' : ''}, mindestens 1200 Wörter. Aus DC (das Du), Venus (Liebe, Werte) und Mars (Begehren, Antrieb): Bindungsmuster, was die Person in Beziehungen sucht und anzieht, Stärken und blinde Flecken in Partnerschaft.

MODUL Geld & Wohlstand (Layer J)${hasPair ? ' — separat für jede Person' : ''}, mindestens 1000 Wörter. Finanztalente, Verhältnis zu Geld und Sicherheit, Risikobereitschaft, mögliche Blockaden und Hebel, abgeleitet aus Lebenszahl, Ausdruckszahl und den Werte-Themen (Venus).

MODUL Schatten & Wachstum (Layer M)${hasPair ? ' — separat für jede Person' : ''}, mindestens 1000 Wörter. Blinde Flecken, Muster der Selbstsabotage, Schattenseiten der Kernzahlen und Aspekte, und der konkrete Hebel, wie aus dem Schatten Wachstum wird. Ehrlich und zugleich wertschätzend.

MODUL Aktuelle Transite, 12 Monate (Layer K)${hasPair ? ' — separat für jede Person' : ''}, mindestens 1000 Wörter. Die wichtigsten Themen der kommenden 12 Monate aus den Zyklen (Persönliches Jahr, Persönliche Monate, Saturn- und Jupiter-Bezüge): wann was ansteht, günstige und herausfordernde Fenster, quartals- oder monatsweise.

MODUL Lebenszyklen & Wendepunkte (Layer L)${hasPair ? ' — separat für jede Person' : ''}, mindestens 1000 Wörter. Die grossen Wendepunkte: Saturn-Return (~Alter 29 und ~58), Chiron-Return (~Alter 50), Midlife-Phase (~Alter 38 bis 45), Pinnacle-Wechsel. Wo steht die Person in diesen Zyklen, was ist die nächste Schwelle?

MODUL Entscheidungsradar (Layer O) — DIESE SEKTION STEHT IMMER GANZ AM ENDE, direkt vor der Essenz, mindestens 800 Wörter. Synthese ALLER vorherigen Sektionen zu einem praktischen Entscheidungsradar: was die Zahlen und Zyklen aktuell BEGÜNSTIGEN und wovor sie zu VORSICHT raten. Verwende [KARTEN-GRID-START/END] mit klaren Begünstigt- und Vorsicht-Karten. Diese Sektion fasst zusammen, sie wiederholt nicht.

${hasAncestry ? `18. Die Ahnenlinie, mindestens 1500 Wörter. Analysiere mit den ANGEGEBENEN Daten zu Mutter und/oder Vater: wiederholende Lebenszahlen, Mutterlinie vs. Vaterlinie, kulturelle Herkunftslinie, was die Hauptperson aus dem System weitertraegt. KEINE Aussagen über nicht angegebene Vorfahren. Schreibe als Fliesstext.
` : ''}${hasNameChange ? `19. Namenswechsel & seine Energie, mindestens 1000 Wörter. Analysiere den/die Namenswechsel: was veraendert sich numerologisch? Welche Energie kommt, welche geht? [NAMEN-GRID-START/END] für den Vergleich.
20. Die Essenz, ein einziger Satz, mit [ESSENZ:Text]` : `19. Die Essenz, ein einziger Satz, mit [ESSENZ:Text]`}

${state.ritual ? `\nZUSAETZLICHE SEKTION (PFLICHT) — platziere sie als VORLETZTE Sektion, direkt vor der Essenz, mit ~~~ abgetrennt wie alle anderen Sektionen. Titelzeile: Ritual & Affirmationen\nInhalt${hasPair ? ` — schreibe getrennte, gleichwertige Bloecke fuer ${p1.firstName || 'Person 1'} und ${p2?.firstName || 'Person 2'}` : ''}:\n(a) Kurze Hinfuehrung (ca. 120 Woerter): wie aus den persoenlichen Zahlen (Lebenszahl, Seelendrang, Persoenlichkeit, Ausdruck, aktuelles Persoenliches Jahr) Affirmationen und ein Ritual entstehen.\n(b) Genau 7 persoenliche Affirmationen, abgeleitet aus den KONKRETEN Zahlen dieser Person. Jede in Ich-Form, ein kraftvoller Satz, jede auf einer EIGENEN Zeile, mit einer Leerzeile dazwischen, beginnend mit "✦ ". Sie staerken die Lichtseiten der Zahlen und gleichen die Schatten sanft aus.\n(c) Ein persoenliches Jahresritual (2 bis 3 Absaetze), passend zum aktuellen Persoenlichen Jahr: konkret und einfach umsetzbar (Zeitpunkt, Ablauf, Bedeutung), die Energie des Jahres unterstuetzend.\nKein Tarot, keine Kartennamen, keine Methodik offenlegen. Warmer, ermutigender Ton.\n` : ''}Schreibe tief, präzise, persönlich. Keine generischen Aussagen. Zahlen und astrologische Fakten exakt aus den gegebenen Daten ableiten.
WICHTIG: Verwende die strukturierten Tags konsequent. Fliesstext darf **fett** und *kursiv* enthalten.
EXTREM WICHTIG: Sei grosszügig mit Länge und Tiefe. Diese Analyse wird für CHF 200+ verkauft, sie muss diesem Preis entsprechen. Lieber zu lang als zu kurz. Wenn du Token-Budget hast, nutze es.`;
    }

    // ── LOADING CYCLE ──────────────────────────────────────────────
    // Status-Texte zyklisch (alle 6 Sekunden)
    const LT = [
      'Lebenszahlen werden ermittelt…',
      'Astrologische Verbindungen werden gewoben…',
      'Pinnacles werden berechnet…',
      'Persönliches Jahr und Monate werden gelegt…',
      'Mondknoten und Aszendent werden positioniert…',
      'Seelenlandschaft entfaltet sich…',
      'Tiefe wird verdichtet…',
      'Worte werden geprüft, Sätze geschliffen…',
    ];
    let li = null, lx = 0, loaderStart = 0, loaderTimer = null;
    function startLoader() {
      lx = 0;
      loaderStart = Date.now();
      const sub = document.getElementById('loading-sub');
      if (sub) sub.textContent = LT[0];
      // Text-Zyklus
      li = setInterval(() => {
        const sub = document.getElementById('loading-sub');
        if (!sub) return;
        sub.classList.add('hidden');
        setTimeout(() => {
          lx = (lx + 1) % LT.length;
          sub.textContent = LT[lx];
          sub.classList.remove('hidden');
        }, 400);
      }, 6000);
      // Timer + Progress-Bar (jede Sekunde)
      // Annahme: typische Dauer skaliert mit depth. Faustregel: 8s pro Seite + 30s Overhead.
      const expectedSec = Math.max(60, (state.depth || 15) * 8 + 30);
      loaderTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - loaderStart) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        const t = document.getElementById('loading-timer');
        if (t) t.textContent = `${mm}:${ss}`;
        const bar = document.getElementById('loading-progress-bar');
        if (bar) {
          // Bar geht asymptotisch gegen 95% (nie 100% bevor fertig)
          const pct = Math.min(95, (elapsed / expectedSec) * 90);
          bar.style.width = `${pct}%`;
        }
        const hint = document.getElementById('loading-hint');
        if (hint) {
          if (elapsed < 30) hint.textContent = 'Tiefe Analysen brauchen Zeit. Wir generieren gerade tausende Wörter speziell für diese Person.';
          else if (elapsed < 120) hint.textContent = 'Die Sektionen werden jetzt geschrieben. Etwa die Hälfte ist gleich geschafft.';
          else if (elapsed < expectedSec) hint.textContent = 'Letzte Sektionen werden formuliert. Noch ein kleiner Moment.';
          else hint.textContent = 'Dauert heute etwas länger als üblich. Bitte einen Moment Geduld.';
        }
      }, 1000);
    }
    function stopLoader() {
      if (li) { clearInterval(li); li = null; }
      if (loaderTimer) { clearInterval(loaderTimer); loaderTimer = null; }
      const bar = document.getElementById('loading-progress-bar');
      if (bar) bar.style.width = '100%';
    }

    // Klartext-Beschreibung, WORUM es im Report geht (Konstellation, Beziehungstyp,
    // Themen bzw. die individuelle Frage). full=true fuer den Bildschirm (mit Themen/
    // Frage), full=false fuer den kompakten Word-Titel.
    function reportDescriptor(full = true) {
      const cLabels = { solo: 'Einzelanalyse', pair: 'Personenvergleich', family: 'Familie', solo_children: 'Alleinerziehend mit Kind(ern)' };
      if (state.mode === 'kurzprofil') return 'Kurzprofil · Einzelperson';
      if (state.mode === 'individual' || state.mode === 'humandesign_individual') {
        const preset = AUFTRAG_PRESETS[state.auftragPreset];
        const presetLabel = (preset && preset.label) ? preset.label : null;
        const q = (val('auftrag-text') || '').trim();
        const base = 'Individuelle Frage';
        if (presetLabel && presetLabel !== 'Individueller Auftrag') return `${base} · ${presetLabel}`;
        if (full && q) { const qs = q.length > 90 ? q.slice(0, 88) + '…' : q; return `${base}: ${qs}`; }
        return base;
      }
      const parts = [cLabels[state.constellation] || 'Einzelanalyse'];
      if (state.constellation === 'pair') {
        const bt = BEZ_TYPEN[state.relationshipType];
        if (bt && bt.label) parts.push(bt.label);
        if (full && state.themes && state.themes.length) parts.push('Themen: ' + state.themes.join(', '));
      }
      return parts.join(' · ');
    }

    // ── API CALL ───────────────────────────────────────────────────
    async function startAnalysis() {
      console.log('[FC] startAnalysis() called');
      try {
        showScreen('loading');
        startLoader();
      const p1 = getPerson('p1'), p2 = getPerson('p2');
      const hasPair = state.constellation === 'pair' || state.constellation === 'family';
      const hasKids = state.constellation === 'family' || state.constellation === 'solo_children';
      let name = p1.firstName || 'Deine Analyse';
      if (hasPair && p2.firstName) name += ` & ${p2.firstName}`;
      const nameEl = document.getElementById('result-name');
      if (nameEl) nameEl.textContent = name;

      // Titel pro Analyse-Modus
      const REPORT_TITLES = { full: 'Deine Seelenlandschaft', individual: 'Deine persönliche Analyse', humandesign: 'Dein BodyGraph', humandesign_individual: 'Deine persönliche Analyse', kurzprofil: 'Kurzprofil' };
      const reportTitle = (state.mode === 'humandesign' && state.constellation === 'pair') ? 'Euer BodyGraph' : (REPORT_TITLES[state.mode] || 'Deine Seelenlandschaft');
      const titleEl = document.getElementById('result-hero-title');
      if (titleEl) titleEl.textContent = reportTitle;
      const subEl = document.getElementById('result-subtitle');
      if (subEl) subEl.textContent = reportDescriptor(true);

      // ── HUMAN DESIGN: eigener Pfad (exakte Zeit zwingend; Standard Einzel/Paar oder Individuell) ──
      let hdData = null;
      if (state.mode === 'humandesign' || state.mode === 'humandesign_individual') {
        const hdPair = state.mode === 'humandesign' && state.constellation === 'pair';
        const missing = (p) => !p.birthDate || !p.birthPlace || !p.birthTime || p.birthTime === 'unbekannt';
        if (missing(p1) || (hdPair && missing(p2))) {
          stopLoader();
          alert('Human Design braucht von ' + (hdPair ? 'BEIDEN Personen' : 'der Person') + ' das Geburtsdatum, die EXAKTE Geburtszeit (auf die Minute) und den Geburtsort. Bitte alle Angaben ergänzen.');
          showScreen(hdPair && missing(p2) && !missing(p1) ? 'person2' : 'person1');
          return;
        }
        try {
          if (hdPair) {
            const r = await fetch('/api/connection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                personA: { firstName: p1.firstName, birthDate: p1.birthDate, birthTime: p1.birthTime, birthPlace: p1.birthPlace },
                personB: { firstName: p2.firstName, birthDate: p2.birthDate, birthTime: p2.birthTime, birthPlace: p2.birthPlace },
              }),
            });
            if (r.ok) hdData = await r.json();
          } else {
            const r = await fetch('/api/humandesign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ birthDate: p1.birthDate, birthTime: p1.birthTime, birthPlace: p1.birthPlace }),
            });
            if (r.ok) hdData = await r.json();
          }
        } catch (err) { /* buildPrompt behandelt fehlende Daten defensiv */ }
      }

      // Profi-Astrologie pro Person (Swiss Ephemeris, lokal verfuegbar, auf Vercel ggf. Fallback)
      const persons = [['PERSON 1', p1]];
      if (hasPair && p2) persons.push(['PERSON 2', p2]);
      if (hasKids) getChildren().forEach((c, i) => persons.push([`KIND ${i+1}`, c]));
      const astroData = {};
      if (state.mode !== 'humandesign' && state.mode !== 'humandesign_individual') {
        for (const [label, p] of persons) {
          if (!p.birthDate) continue;
          try {
            const r = await fetch('/api/astrology', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ birthDate: p.birthDate, birthTime: p.birthTime, birthPlace: p.birthPlace }),
            });
            if (r.ok) astroData[label] = await r.json();
          } catch (err) { /* fallback im Prompt */ }
        }
      }

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: buildPrompt(astroData, hdData) }],
            language: state.language,
            depth: state.depth,
          })
        });
        // Streaming: der Server schickt fortlaufend NDJSON-Zeilen
        // ({type:'start'|'delta'|'done'|'error'}). Das Lesen des Streams haelt die
        // Verbindung offen, auch bei langen Reports (kein "Failed to fetch" mehr).
        // Den finalen, umlaut-korrigierten Text nehmen wir aus dem 'done'-Ereignis.
        if (!res.ok || !res.body) {
          const t = await res.text().catch(() => '');
          if (res.status === 504 || t.includes('timed out') || t.includes('FUNCTION_INVOCATION_TIMEOUT')) {
            throw new Error('Die Generation hat das Zeit-Limit überschritten. Bitte erneut versuchen.');
          }
          throw new Error(`Server-Fehler (Status ${res.status}). ${String(t).slice(0, 200)}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamBuf = '';
        let finalText = '';
        let streamErr = '';
        let gotDone = false;
        let streamEnded = false;
        while (!streamEnded) {
          const { value, done } = await reader.read();
          if (done) break;
          streamBuf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = streamBuf.indexOf('\n')) >= 0) {
            const line = streamBuf.slice(0, nl).trim();
            streamBuf = streamBuf.slice(nl + 1);
            if (!line) continue;
            let evt;
            try { evt = JSON.parse(line); } catch (e) { continue; }
            if (evt.type === 'done') {
              finalText = evt.text || '';
              gotDone = true;
              streamEnded = true;
              break;
            } else if (evt.type === 'error') {
              streamErr = evt.message || 'Unbekannter Fehler bei der Generierung.';
              streamEnded = true;
              break;
            }
            // {type:'start'} und {type:'delta'} halten nur die Verbindung offen.
          }
        }
        if (streamErr) throw new Error(streamErr);
        if (!gotDone) throw new Error('Verbindung unterbrochen, bevor der Text vollständig war. Bitte erneut versuchen.');
        stopLoader();
        renderResult(finalText);
      } catch (err) {
        stopLoader();
        renderError(err.message);
      }
      showScreen('result');
      } catch (outerErr) {
        // Catch alles was im startAnalysis schief geht VOR dem inneren try-catch
        console.error('[FC] startAnalysis OUTER crash:', outerErr);
        alert('Analyse-Fehler:\n\n' + (outerErr.message || outerErr) + '\n\nDevTools → Console für mehr Info.');
        stopLoader();
        showScreen(state.mode === 'humandesign' ? 'person1' : (state.mode === 'individual' ? 'auftrag' : 'focus'));
      }
    }

    // ── RENDER RESULT ──────────────────────────────────────────────
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // Parses inline markdown AFTER escaping — works on already-escaped text
    // so we inject safe HTML tags back in
    function parseMarkdown(escapedText) {
      return escapedText
        // **bold** → <strong>
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // *italic* or _italic_ (not double-star)
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // ~~strikethrough~~ (uncommon but possible)
        .replace(/~~(.+?)~~/g, '<del>$1</del>');
    }

    function parseInlineMarkers(text) {
      // [ZAHL:X] → big number display
      text = text.replace(/\[ZAHL:([^\]]+)\]/g, (_, z) =>
        `<div class="res-big-zahl">${esc(z)}</div>`);
      // [PJ-HEADER:Titel|Zahl|Zeitraum] → prominent block header
      text = text.replace(/\[PJ-HEADER:([^|]+)\|([^|]+)\|([^\]]+)\]/g, (_, titel, zahl, zeitraum) =>
        `<div class="res-pj-header"><div class="res-pj-header-eyebrow">${esc(titel)}</div><div class="res-pj-header-zahl">${esc(zahl)}</div><div class="res-pj-header-zeitraum">${esc(zeitraum)}</div></div>`);
      // [QUARTAL:Titel|Zeitraum] → subtle quarterly sub-header
      text = text.replace(/\[QUARTAL:([^|]+)\|([^\]]+)\]/g, (_, titel, zeitraum) =>
        `<div class="res-quartal"><span class="res-quartal-titel">${esc(titel)}</span><span class="res-quartal-zeit">${esc(zeitraum)}</span></div>`);
      // [HIGHLIGHT-MONAT:Monat|PM-Zahl|Label] → highlighted month chip
      text = text.replace(/\[HIGHLIGHT-MONAT:([^|]+)\|([^|]+)\|([^\]]+)\]/g, (_, monat, zahl, label) =>
        `<div class="res-highlight-monat"><span class="res-hm-zahl">${esc(zahl)}</span><div class="res-hm-body"><div class="res-hm-monat">${esc(monat)}</div><div class="res-hm-label">${esc(label)}</div></div></div>`);
      return text;
    }

    function parseBlock(block) {
      let out = '';
      const lines = block.split('\n');
      let i = 0;

      while (i < lines.length) {
        const line = lines[i].trim();

        // PERSON-GRID
        if (line === '[PERSON-GRID-START]') {
          let cards = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[PERSON-GRID-END]') {
            const m = lines[i].trim().match(/^\[PERSON-CARD:(.+)\]$/);
            if (m) {
              const [label, name, datum, stern, desc, lz, pin, pj] = m[1].split('|');
              const lzNum = (lz||'').replace('LZ:','');
              const pinNum = (pin||'').replace('Pinnacle:','');
              const pjNum = (pj||'').replace('PersJahr:','');
              cards.push(`<div class="res-person-card">
                <div class="res-pc-label">${esc(label||'')}</div>
                <div class="res-pc-zahl">${esc(lzNum)}</div>
                <div class="res-pc-datum">${esc(datum||'')}</div>
                <div class="res-pc-stern">${esc(stern||'')}</div>
                <div class="res-pc-desc">${parseMarkdown(esc(desc||''))}</div>
                <div class="res-pc-stats">
                  ${lzNum ? `<div class="res-pc-stat"><div class="res-pc-stat-val">${esc(lzNum)}</div><div class="res-pc-stat-label">Lebenszahl</div></div>` : ''}
                  ${pinNum ? `<div class="res-pc-stat"><div class="res-pc-stat-val">${esc(pinNum)}</div><div class="res-pc-stat-label">Pinnacle (Jetzt)</div></div>` : ''}
                  ${pjNum ? `<div class="res-pc-stat"><div class="res-pc-stat-val">${esc(pjNum)}</div><div class="res-pc-stat-label">Pers. Jahr 2025</div></div>` : ''}
                </div>
              </div>`);
            }
            i++;
          }
          out += `<div class="res-person-grid">${cards.join('')}</div>`;
          i++;
          continue;
        }

        // KARTEN-GRID
        if (line === '[KARTEN-GRID-START]') {
          let cards = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[KARTEN-GRID-END]') {
            const m = lines[i].trim().match(/^\[KARTE:(.+)\]$/);
            if (m) {
              const [eyebrow, titel, untertitel, desc] = m[1].split('|');
              cards.push(`<div class="res-karte">
                <div class="res-karte-eyebrow">${esc(eyebrow||'')}</div>
                <div class="res-karte-zahl">${esc(untertitel||'')}</div>
                <div class="res-karte-titel">${esc(titel||'')}</div>
                <div class="res-karte-desc">${esc(desc||'')}</div>
              </div>`);
            }
            i++;
          }
          out += `<div class="res-karten-grid">${cards.join('')}</div>`;
          i++;
          continue;
        }

        // DYNAMIK
        if (line.startsWith('[DYNAMIK:')) {
          const m = line.match(/^\[DYNAMIK:(.+)\]$/);
          if (m) {
            const [sieLabel, sieZahl, erLabel, erZahl, resonanz] = m[1].split('|');
            out += `<div class="res-dynamik">
              <div class="res-dyn-pole">
                <div class="res-dyn-pole-item">
                  <div class="res-dyn-zahl">${esc(sieZahl||'')}</div>
                  <div class="res-dyn-label">${esc(sieLabel||'')}</div>
                </div>
                <div class="res-dyn-arrows">⇅<div class="res-dyn-resonanz">${esc(resonanz||'RESONANZ')}</div>⇅</div>
                <div class="res-dyn-pole-item">
                  <div class="res-dyn-zahl">${esc(erZahl||'')}</div>
                  <div class="res-dyn-label">${esc(erLabel||'')}</div>
                </div>
              </div>
            </div>`;
          }
          i++;
          continue;
        }

        // ASTRO
        if (line === '[ASTRO-START]') {
          let items = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[ASTRO-END]') {
            const m = lines[i].trim().match(/^\[ASTRO:(.+)\]$/);
            if (m) {
              const [symbol, titel, text] = m[1].split('|');
              items.push(`<div class="res-astro-item">
                <div class="res-astro-symbol">${esc(symbol||'')}</div>
                <div class="res-astro-body">
                  <div class="res-astro-titel">${esc(titel||'')}</div>
                  <div class="res-astro-text">${parseMarkdown(esc(text||''))}</div>
                </div>
              </div>`);
            }
            i++;
          }
          out += `<div class="res-astro-list">${items.join('')}</div>`;
          i++;
          continue;
        }

        // HS (Herausforderung & Schlüssel)
        if (line === '[HS-START]') {
          let heraus = [], schluessel = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[HS-END]') {
            const l = lines[i].trim();
            const mh = l.match(/^\[HERAUSFORDERUNG:(.+)\]$/);
            const ms = l.match(/^\[SCHLUESSEL:(.+)\]$/);
            if (mh) heraus.push(mh[1]);
            if (ms) schluessel.push(ms[1]);
            i++;
          }
          out += `<div class="res-hs-grid">
            <div class="res-hs-col res-hs-challenge">
              <div class="res-hs-header">Herausforderung</div>
              ${heraus.map(h => `<div class="res-hs-item">— ${parseMarkdown(esc(h))}</div>`).join('')}
            </div>
            <div class="res-hs-col res-hs-key">
              <div class="res-hs-header">Schlüssel</div>
              ${schluessel.map(s => `<div class="res-hs-item">— ${parseMarkdown(esc(s))}</div>`).join('')}
            </div>
          </div>`;
          i++;
          continue;
        }

        // JAHRES-TABELLE
        if (line.startsWith('[JAHRES-TABELLE:')) {
          const m = line.match(/^\[JAHRES-TABELLE:(.+)\]$/);
          // Filter out empty header slots (empty string or just whitespace)
          const allHeaders = m ? m[1].split('|') : [];
          const headers = allHeaders.filter(h => h.trim() !== '');
          const activeCols = headers.length; // how many real person columns
          let rows = [];
          i++;
          while (i < lines.length && lines[i].trim().startsWith('[JAHR:')) {
            const rm = lines[i].trim().match(/^\[JAHR:(.+)\]$/);
            if (rm) {
              const allCells = rm[1].split('|');
              // Keep year + only as many data cells as we have headers
              const year = allCells[0];
              const cells = allCells.slice(1, activeCols + 1)
                .filter((c, idx) => {
                  // Only include if header exists for this column
                  return headers[idx] && headers[idx].trim() !== '';
                });
              rows.push([year, ...cells]);
            }
            i++;
          }
          out += `<div class="res-tabelle-wrap"><table class="res-tabelle">
            <thead><tr>
              <th>Jahr</th>
              ${headers.map(h => `<th>${esc(h)}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${rows.map((r, ri) => `<tr class="${ri === 0 ? 'res-row-now' : ''}">
                <td class="res-jahr-cell">${esc(r[0]||'')}</td>
                ${r.slice(1).map(cell => {
                  const trimmed = cell.trim();
                  // Skip dash-only cells
                  if (!trimmed || trimmed === '—' || trimmed === '-' || trimmed === '–') {
                    return '<td><span class="res-tab-zahl" style="color:var(--gold-pale)">—</span></td>';
                  }
                  const parts = trimmed.split('·');
                  const num = parts[0] ? parts[0].trim() : '';
                  const kw = parts[1] ? parts[1].trim() : '';
                  return `<td><span class="res-tab-zahl">${esc(num)}</span>${kw ? `<span class="res-tab-kw">${esc(kw)}</span>` : ''}</td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table></div>`;
          continue;
        }

        // PINNACLE
        if (line.startsWith('[PINNACLE:')) {
          const m = line.match(/^\[PINNACLE:(.+)\]$/);
          if (m) {
            const [person, nummer, zeitraum, zahl, beschreibung, challenge] = m[1].split('|');
            out += `<div class="res-pinnacle">
              <div class="res-pin-zahl">${esc(zahl||'')}</div>
              <div class="res-pin-body">
                <div class="res-pin-header">
                  <span class="res-pin-num">${esc(nummer||'')}. Pinnacle</span>
                  <span class="res-pin-zeit">${esc(zeitraum||'')}</span>
                  ${person ? `<span class="res-pin-person">${esc(person)}</span>` : ''}
                </div>
                <div class="res-pin-desc">${parseMarkdown(esc(beschreibung||''))}</div>
                ${challenge ? `<div class="res-pin-challenge">Challenge: ${esc(challenge)}</div>` : ''}
              </div>
            </div>`;
          }
          i++;
          continue;
        }

        // NAMEN-GRID
        if (line === '[NAMEN-GRID-START]') {
          let cards = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[NAMEN-GRID-END]') {
            const m = lines[i].trim().match(/^\[NAMEN-CARD:(.+)\]$/);
            if (m) {
              const [nameRaw, rolle, sdZ, sdL, pZ, pL, ausZ, ausL, desc] = m[1].split('|');
              // Strip letter-by-letter hyphens ("M-A-U-R-O" → "MAURO"), keep normal word hyphens
              const name = (nameRaw||'').replace(/(?<=[A-ZÄÖÜ])-(?=[A-ZÄÖÜ])/g, '').replace(/(?<=[a-zäöü])-(?=[a-zäöü])/g, '');
              const isDash = v => !v || v.trim() === '—' || v.trim() === '-' || v.trim() === '';
              const zahlenItems = [
                { z: sdZ, zl: 'Seelendrang', ll: sdL },
                { z: pZ, zl: 'Persönlichkeit', ll: pL },
                { z: ausZ, zl: 'Ausdruck', ll: ausL },
              ].filter(item => !isDash(item.z)); // skip empty/dash slots
              cards.push(`<div class="res-namen-card">
                <div class="res-nc-name">${esc(name)}</div>
                <div class="res-nc-rolle">${esc(rolle||'')}</div>
                <div class="res-nc-zahlen" style="grid-template-columns: repeat(${zahlenItems.length || 3}, 1fr)">
                  ${zahlenItems.map(item => `<div class="res-nc-zahl-item">
                    <div class="res-nc-z">${esc(item.z)}</div>
                    <div class="res-nc-zl">${esc(item.zl)}</div>
                    <div class="res-nc-ll">${esc(item.ll||'')}</div>
                  </div>`).join('')}
                </div>
                ${desc ? `<div class="res-nc-desc">${esc(desc)}</div>` : ''}
              </div>`);
            }
            i++;
          }
          out += `<div class="res-namen-grid">${cards.join('')}</div>`;
          i++;
          continue;
        }

        // ESSENZ
        if (line.startsWith('[ESSENZ:')) {
          const m = line.match(/^\[ESSENZ:(.+)\]$/);
          if (m) out += `<div class="res-essenz">${esc(m[1])}</div>`;
          i++;
          continue;
        }

        // Normal text — group consecutive lines into paragraphs, apply markdown
        if (line && !line.startsWith('[')) {
          // Collect consecutive non-empty, non-tag lines as one paragraph
          let paraLines = [line];
          while (i + 1 < lines.length) {
            const next = lines[i + 1].trim();
            if (next && !next.startsWith('[')) {
              paraLines.push(next);
              i++;
            } else {
              break;
            }
          }
          const paraText = paraLines.join(' ');
          out += `<p class="res-p">${parseMarkdown(parseInlineMarkers(esc(paraText)))}</p>`;
        } else if (!line) {
          // empty line = paragraph break (already handled by grouping above)
        }
        i++;
      }

      return out;
    }

    // ── SECTION GLOSSARY ───────────────────────────────────────────
    const SECTION_INFO = {
      'Der zentrale Code': 'In der Numerologie ist der "zentrale Code" die verdichtete Kernformel einer Person oder Familie — die Lebenszahl kombiniert mit den wichtigsten Schlüsselzahlen. Er zeigt auf einen Blick, welche Energien das Leben am stärksten prägen.',
      'Schlüsseldaten des Paares': 'Jedes Datum trägt eine numerologische Schwingung. Das Datum des Kennenlernens, der Hochzeit oder anderer Schlüsselereignisse wird auf eine Kernzahl reduziert (Quersumme) und gibt Auskunft darüber, unter welcher Energie dieses Ereignis stand.',
      'Beziehungsdynamik': 'Die Beziehungsdynamik beschreibt das energetische Zusammenspiel zweier Menschen — wie ihre Lebenszahlen, Sternzeichen und Namen-Energien miteinander resonieren, sich ergänzen oder reiben. Sie zeigt keine Urteile, sondern Muster.',
      'Astrologische Kernverbindungen': 'Die Astrologie betrachtet, wie die Planetenpositionen zum Geburtszeitpunkt (Sonne, Mond, Aszendent) zweier Menschen miteinander interagieren. Verbindungen zwischen denselben Zeichen oder Planeten zeigen tiefe Resonanz.',
      'Dein persönlicher Lebensweg': 'Die Lebenszahl (errechnet aus dem vollständigen Geburtsdatum) ist die wichtigste Zahl in der Numerologie. Sie beschreibt den übergeordneten Weg, die Lebensaufgabe und die Qualitäten, die eine Person entwickeln soll — nicht das, was man ist, sondern wohin man wächst.',
      'Deine Namen-Energie': 'Der Name trägt eigene numerologische Energie. Seelendrang (Vokale) zeigt das innere Verlangen; Persönlichkeit (Konsonanten) zeigt, wie man nach aussen wirkt; Ausdruckszahl (alle Buchstaben) zeigt das Gesamtpotenzial. Basis ist die Taufname-Zuweisung nach dem pythagoreischen System.',
      'Die Kinder': 'Jedes Kind bringt seine eigene numerologische und astrologische Signatur mit. Die Analyse zeigt, welche Energien das Kind trägt, wie es sich im Familiensystem positioniert und welche Verbindungen zu den Eltern bestehen.',
      'Das Familiensystem': 'Das Familiensystem betrachtet die Familie als energetisches Ganzes — welche Zahlen und Qualitäten dominieren, welche fehlen, wie die einzelnen Mitglieder sich gegenseitig spiegeln und ergänzen. Muster wiederholen sich oft über Generationen.',
      'Herausforderung & Schlüssel': 'Jede Lebenszahl bringt spezifische Herausforderungen mit — wiederkehrende Themen, die das Leben immer wieder aufwirft. Der Schlüssel ist der bewusste Umgang damit: nicht Widerstand, sondern Integration. Herausforderungen sind keine Schwächen, sondern Wachstumsfelder.',
      'Jahresenergien': 'Das Persönliche Jahr wird errechnet aus Geburtstag + Geburtsmonat + aktuellem Kalenderjahr. Es beschreibt, unter welchem energetischen Thema ein Jahr steht — von 1 (Neubeginn) bis 9 (Abschluss). Die neunjährigen Zyklen wiederholen sich lebenslang.',
      'Deine Deine Jahresenergien — Vorausschau': 'Das Persönliche Jahr wird errechnet aus Geburtstag + Geburtsmonat + aktuellem Kalenderjahr. Es beschreibt, unter welchem energetischen Thema ein Jahr steht — von 1 (Neubeginn) bis 9 (Abschluss). Die neunjährigen Zyklen wiederholen sich lebenslang.',
      'Pinnacles & Challenges': 'Pinnacles sind längere Lebenszyklen (ca. 7–27 Jahre), die bestimmte Qualitäten in den Vordergrund bringen. Sie werden aus Geburtstag, -monat und -jahr errechnet. Challenges sind die spezifischen Lernthemen innerhalb jedes Pinnacles — die Reibungspunkte, die bewusste Entwicklung verlangen.',
      'Namen-Numerologie': 'Eine detaillierte Aufschlüsselung der Namen-Energie aller Familienmitglieder. Seelendrang, Persönlichkeit und Ausdruck zusammen zeigen, wie inneres Verlangen, äussere Wirkung und Gesamtpotenzial zueinander stehen — und wie die Mitglieder sich numerologisch spiegeln.',
      'Die Essenz': 'Ein einziger Satz, der das Wesen dieser Analyse zusammenfasst — die verdichtete Quintessenz aller Zahlen, Zeichen und Verbindungen.',
    };

    function getSectionInfo(title) {
      // fuzzy match
      for (const key of Object.keys(SECTION_INFO)) {
        if (title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(title.toLowerCase())) {
          return SECTION_INFO[key];
        }
      }
      return null;
    }

    function renderResult(text) {
      text = String(text || '');
      // Defensiv: ß → ss nur bei Deutsch (Schweizer Hochdeutsch)
      if (state.language === 'de') text = text.replace(/ß/g, 'ss');
      // Defensiv: AI-typische Em-Dashes / En-Dashes raus.
      // Em-Dash (—) → Komma. En-Dash (–) → Hyphen.
      text = text.replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, '-');
      const secs = text.split('~~~').map(s => s.trim()).filter(Boolean);
      const body = document.getElementById('result-body');
      if (!body) return;
      body.dataset.rawText = text;  // store for DOCX export
      body.innerHTML = secs.map((sec, idx) => {
        const lines = sec.split('\n');
        const titleRaw = lines[0].replace(/^#+\s*/, '').trim();
        const bodyText = lines.slice(1).join('\n').trim();
        const orn = idx < secs.length - 1 ? `<div class="result-ornament">✦ ✦ ✦</div>` : '';
        const info = getSectionInfo(titleRaw);
        const infoHtml = info
          ? `<button class="sec-info-btn" onclick="this.nextElementSibling.classList.toggle('open')" title="Was bedeutet das?">i</button>
             <div class="sec-info-panel">${esc(info)}</div>`
          : '';
        return `<div class="result-section">
          <div class="result-section-title-row">
            <div class="result-section-title">${esc(titleRaw)}</div>
            ${infoHtml}
          </div>
          <div class="result-body-inner">${parseBlock(bodyText)}</div>
        </div>${orn}`;
      }).join('');
    }
    function renderError(msg) {
      const body = document.getElementById('result-body');
      if (body) body.innerHTML = `<div class="error-box">⚠ ${esc(msg)}<br><small>Bitte versuche es erneut.</small></div>`;
    }

    async function downloadDocx() {
      const body = document.getElementById('result-body');
      const rawText = body?.dataset.rawText || '';
      if (!rawText) { alert('Noch keine Analyse vorhanden.'); return; }
      const nameEl = document.getElementById('result-name');
      const name = nameEl?.textContent?.trim() || 'Deine Analyse';
      const btn = document.getElementById('btn-docx');
      const originalLabel = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Wird vorbereitet…'; }
      try {
        const res = await fetch('/api/generate-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText, name, language: state.language, title: ((state.mode === 'humandesign' && state.constellation === 'pair') ? 'Euer BodyGraph' : ({ full: 'Deine Seelenlandschaft', individual: 'Deine persönliche Analyse', humandesign: 'Dein BodyGraph', humandesign_individual: 'Deine persönliche Analyse', kurzprofil: 'Kurzprofil' })[state.mode]) || undefined, subtitle: reportDescriptor(true) }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safe = name.replace(/[^a-zA-Z0-9_\- ]+/g, '').replace(/\s+/g, '_') || 'Analyse';
        const filePrefix = ({ full: 'Seelenlandschaft', individual: 'Analyse', humandesign: 'BodyGraph', humandesign_individual: 'Analyse', kurzprofil: 'Kurzprofil' })[state.mode] || 'Analyse';
        a.download = `${filePrefix}_${safe}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Word-Export fehlgeschlagen: ' + err.message);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
      }
    }

    // ── RESET ──────────────────────────────────────────────────────
    function resetAll() {
      state.constellation = ''; state.focus = ''; state.childCount = 1;
      state.ritual = false;
      state.relationshipType = 'partnerschaft'; state.themes = [];
      state.mode = 'full'; state.system = ''; state.art = ''; state.auftragPreset = ''; state.auftragAstro = true;
      state.lead = { name: '', email: '' };
      document.querySelectorAll('.field-input').forEach(el => { el.value = ''; el.disabled = false; });
      document.querySelectorAll('.toggle-box').forEach(el => el.classList.remove('on'));
      // Astrologie-Toggle (Individuell-Modus) ist standardmäßig aktiv -> visuell wieder einschalten
      const astroTog = document.getElementById('auftrag-astro-toggle');
      if (astroTog) { astroTog.classList.add('on'); const b = astroTog.querySelector('.toggle-box'); if (b) b.classList.add('on'); }
      document.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
      ['btn-mode-next', 'btn-art-next'].forEach(bid => { const b = document.getElementById(bid); if (b) b.disabled = true; });
      const defRel = document.querySelector('#reltype-grid .select-card[data-value="partnerschaft"]');
      if (defRel) defRel.classList.add('selected');
      const themeChips = document.getElementById('theme-chips');
      if (themeChips) themeChips.innerHTML = '';
      const themeInput = document.getElementById('theme-custom-input');
      if (themeInput) { themeInput.value = ''; themeInput.disabled = false; }
      const themeCounter = document.getElementById('theme-counter');
      if (themeCounter) themeCounter.textContent = '0 von ' + MAX_THEMES;
      state.disabledSections = [];
      document.querySelectorAll('#sections-fields .toggle-box').forEach(el => el.classList.add('on'));
      const secToggle = document.getElementById('sections-include-toggle');
      if (secToggle) { secToggle.classList.remove('on'); const sb = secToggle.querySelector('.toggle-box'); if (sb) sb.classList.remove('on'); }
      const secFields = document.getElementById('sections-fields');
      if (secFields) secFields.classList.add('hidden');
      const btn1 = document.getElementById('btn-constellation-next');
      const btn2 = document.getElementById('btn-focus-next');
      const btn3 = document.getElementById('btn-lead-next');
      if (btn1) btn1.disabled = true;
      if (btn2) btn2.disabled = true;
      if (btn3) btn3.disabled = true;
      const btnMode = document.getElementById('btn-mode-next');
      const btnAuf = document.getElementById('btn-auftrag-next');
      if (btnMode) btnMode.disabled = true;
      if (btnAuf) btnAuf.disabled = true;
      const aufText = document.getElementById('auftrag-text');
      const aufDetail = document.getElementById('auftrag-detail');
      if (aufText) aufText.value = '';
      if (aufDetail) aufDetail.value = '';
      const leadName = document.getElementById('lead-name');
      const leadEmail = document.getElementById('lead-email');
      if (leadName) leadName.value = '';
      if (leadEmail) leadEmail.value = '';
      const resultBody = document.getElementById('result-body');
      if (resultBody) resultBody.innerHTML = '';
      const childContainer = document.getElementById('children-container');
      if (childContainer) childContainer.innerHTML = childBlockHTML(0);
      const addBtn = document.getElementById('btn-add-child');
      if (addBtn) addBtn.style.display = '';
      showScreen('splash');
    }

    // ── INIT FORMS ─────────────────────────────────────────────────
    const p1form = document.getElementById('person1-form');
    if (p1form) p1form.innerHTML = personFormHTML('p1');
    const p2form = document.getElementById('person2-form');
    if (p2form) p2form.innerHTML = personFormHTML('p2');
    const childContainer = document.getElementById('children-container');
    if (childContainer) childContainer.innerHTML = childBlockHTML(0);
    updateNav();

    // Lead gate input listeners
    document.addEventListener('input', (e) => {
      if (e.target.id === 'lead-name' || e.target.id === 'lead-email') validateLead();
      if (e.target.id === 'auftrag-text') updateAuftragBtn();
      if (e.target.id === 'depth-slider') {
        const v = parseInt(e.target.value, 10);
        state.depth = v;
        const pagesEl = document.getElementById('depth-pages');
        if (pagesEl) pagesEl.textContent = v;
        const metaEl = document.getElementById('depth-meta');
        if (metaEl) {
          let txt;
          if (v <= 8) txt = 'Kompakt · ca. 300 Wörter pro Modul · knapp und auf den Punkt';
          else if (v <= 18) txt = 'Mittel · ca. 900 Wörter pro Modul · solide ausgeführt';
          else if (v <= 28) txt = 'Tief · ca. 1500 Wörter pro Modul · ausführlich mit Beispielen';
          else txt = 'Profi · ca. 2400 Wörter pro Modul · maximale Tiefe pro Modul';
          metaEl.textContent = txt;
        }
      }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.target.id === 'lead-name' || e.target.id === 'lead-email') && e.key === 'Enter') {
        const btn = document.getElementById('btn-lead-next');
        if (btn && !btn.disabled) submitLead();
      }
    });

    // ── EVENT DELEGATION ───────────────────────────────────────────
    document.addEventListener('click', (e) => {
      // Language pills
      const langPill = e.target.closest('.lang-pill');
      if (langPill) {
        const lang = langPill.dataset.lang;
        if (lang) {
          state.language = lang;
          document.querySelectorAll('.lang-pill').forEach(p => p.classList.toggle('active', p.dataset.lang === lang));
          const sw = document.getElementById('lang-switch');
          if (sw) sw.dataset.lang = lang;
        }
        return;
      }
      // Personenvergleich: Themen (Mehrfachauswahl) — vor der generischen Karten-Logik abfangen
      const themeCard = e.target.closest('#theme-grid .select-card');
      if (themeCard) { toggleThemePreset(themeCard); return; }
      const themeRemove = e.target.closest('[data-remove-theme]');
      if (themeRemove) { removeTheme(themeRemove.dataset.removeTheme); return; }
      // Select cards
      const card = e.target.closest('.select-card');
      if (card) {
        const grid = card.closest('[class*="card-grid"]');
        if (grid) {
          const type = card.dataset.cardType;
          selectCard(card, type || (card.closest('#screen-constellation') ? 'constellation' : 'focus'));
        }
      }
      // Toggle rows
      const toggleRow = e.target.closest('.toggle-row');
      if (toggleRow) {
        // Special: ancestry include toggle (shows/hides the fields)
        if (toggleRow.id === 'ancestry-include-toggle') {
          const on = toggleRow.classList.toggle('on');
          const box = toggleRow.querySelector('.toggle-box');
          if (box) box.classList.toggle('on', on);
          const fields = document.getElementById('ancestry-fields');
          if (fields) fields.classList.toggle('hidden', !on);
          return;
        }
        // Special: Ritual & Affirmationen add-on (reiner State-Toggle)
        if (toggleRow.id === 'ritual-toggle') {
          const on = toggleRow.classList.toggle('on');
          const box = toggleRow.querySelector('.toggle-box');
          if (box) box.classList.toggle('on', on);
          state.ritual = on;
          return;
        }
        // Special: Astrologie-Layer im Individuell-Modus
        if (toggleRow.id === 'auftrag-astro-toggle') {
          const on = toggleRow.classList.toggle('on');
          const box = toggleRow.querySelector('.toggle-box');
          if (box) box.classList.toggle('on', on);
          state.auftragAstro = on;
          return;
        }
        // Sektions-Abwahl: Panel auf/zu
        if (toggleRow.id === 'sections-include-toggle') {
          const on = toggleRow.classList.toggle('on');
          const box = toggleRow.querySelector('.toggle-box');
          if (box) box.classList.toggle('on', on);
          const fields = document.getElementById('sections-fields');
          if (fields) fields.classList.toggle('hidden', !on);
          return;
        }
        // Sektions-Abwahl: einzelne Sektion an/aus (default an)
        if (toggleRow.dataset.section) {
          const box = toggleRow.querySelector('.toggle-box');
          const nowOn = box ? box.classList.toggle('on') : false;
          const key = toggleRow.dataset.section;
          const i = state.disabledSections.indexOf(key);
          if (nowOn) { if (i >= 0) state.disabledSections.splice(i, 1); }
          else { if (i < 0) state.disabledSections.push(key); }
          return;
        }
        const inputId = toggleRow.dataset.toggleInput;
        const toggleId = toggleRow.dataset.toggleId;
        if (inputId && toggleId) toggleField(inputId, toggleId);
      }
      // Remove child buttons
      const removeBtn = e.target.closest('[data-remove-child]');
      if (removeBtn) removeChild(parseInt(removeBtn.dataset.removeChild));
      // Nav actions — use closest() so clicks on child elements (spans, icons) still register
      const btn = e.target.closest('button, [role="button"]');
      if (btn) {
        const id = btn.id;
        console.log('[FC] Click on button:', id, 'classes:', btn.className);
        if (id === 'nav-reset') resetAll();
        if (id === 'btn-add-child') addChild();
        if (id === 'btn-add-theme') addCustomTheme();
        if (id === 'btn-lead-next') submitLead();
        if (id === 'btn-constellation-next') goNext();
        if (id === 'btn-mode-next') goNext();
        if (id === 'btn-art-next') goNext();
        if (id === 'btn-auftrag-next') startAnalysis();
        if (id === 'btn-focus-next') startAnalysis();
        if (btn.classList.contains('btn-back')) goBack();
        if (btn.classList.contains('btn-next-generic')) goNext();
        if (id === 'hero-cta-btn') goNext();
        if (id === 'btn-print') window.print();
        if (id === 'btn-docx') downloadDocx();
        if (id === 'btn-reset-result') resetAll();
      }
    });

  }, []);

  return (
    <>
      <Head>
        <title>Familien-Code · herzbewegung von Susana</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Raleway:wght@300;400;500&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --cream: #fdf8f2;
            --paper: #f7efe4;
            --paper-deep: #f0e5d6;
            --gold: #a07828;
            --gold-light: #c49840;
            --gold-pale: #ecddb8;
            --gold-faint: #fdf5e8;
            --rose: #9e5472;
            --rose-light: #c4849e;
            --rose-pale: #f5e8ef;
            --ink: #2a1f18;
            --muted: #7a6358;
            --silver: #a89080;
            --mauve: #8a6070;
          }

          /* ── BASE ─────────────────────────────────────────────── */
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { font-size: 16px; }
          body {
            font-family: 'Raleway', sans-serif;
            font-weight: 300;
            color: var(--ink);
            background: var(--cream);
          }

          /* ── TOPNAV ───────────────────────────────────────────── */
          .topnav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: rgba(253,248,242,0.95);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--gold-pale);
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 56px; height: 68px;
          }
          .nav-brand { display: flex; align-items: center; gap: 12px; }
          .nav-symbol { font-size: 20px; color: var(--rose-light); }
          .nav-name {
            font-family: 'Playfair Display', serif;
            font-size: 18px; font-weight: 400;
            color: var(--ink); letter-spacing: 0.3px;
          }
          .nav-by {
            font-size: 9px; letter-spacing: 2.5px;
            text-transform: uppercase; color: var(--rose-light); margin-left: 4px;
          }
          .nav-progress { display: flex; align-items: center; gap: 6px; }
          .nav-step { width: 24px; height: 2px; background: var(--gold-pale); border-radius: 2px; transition: background 0.3s; }
          .nav-step.done { background: var(--rose-light); }
          .nav-step.active { background: var(--rose); }
          .nav-cta {
            font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
            color: var(--muted); cursor: pointer; padding: 8px 0;
            background: none; border: none;
            font-family: 'Raleway', sans-serif; transition: color 0.2s;
          }
          .nav-cta:hover { color: var(--rose); }

          /* ── SCREENS ──────────────────────────────────────────── */
          .screen { display: none; padding-top: 68px; }
          .screen.active { display: block; animation: fadeUp 0.45s ease forwards; }
          @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }

          /* ── HERO / SPLASH ────────────────────────────────────── */
          #screen-splash { min-height: 100vh; display: none; flex-direction: column; }
          #screen-splash.active { display: flex; }

          .hero {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: calc(100vh - 68px);
          }

          /* Left — warm cream with rose gradient, no dark background */
          .hero-left {
            background: linear-gradient(145deg, var(--paper-deep) 0%, var(--paper) 60%, var(--rose-pale) 100%);
            padding: 80px 72px;
            display: flex; flex-direction: column; justify-content: center;
            position: relative; overflow: hidden;
          }
          .hero-left::before {
            content: '';
            position: absolute; top: -80px; right: -80px;
            width: 360px; height: 360px; border-radius: 50%;
            background: radial-gradient(circle, rgba(196,152,64,0.12) 0%, transparent 70%);
          }
          .hero-left::after {
            content: '';
            position: absolute; bottom: -60px; left: 40px;
            width: 260px; height: 260px; border-radius: 50%;
            background: radial-gradient(circle, rgba(158,84,114,0.10) 0%, transparent 70%);
          }
          /* decorative top line */
          .hero-left-inner { position: relative; z-index: 1; }

          .hero-eyebrow {
            font-size: 9px; letter-spacing: 4px; text-transform: uppercase;
            color: var(--rose); margin-bottom: 28px; font-weight: 400;
          }
          .hero-symbol {
            font-size: 32px; color: var(--rose-light);
            margin-bottom: 20px; display: block;
            animation: float 6s ease-in-out infinite;
          }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

          .hero-h1 {
            font-family: 'Playfair Display', serif;
            font-size: 68px; font-weight: 400;
            line-height: 0.98; color: var(--ink);
            margin-bottom: 28px; letter-spacing: -0.5px;
          }
          .hero-h1 em {
            font-style: italic; color: var(--rose);
          }

          .hero-rule {
            width: 40px; height: 1px;
            background: linear-gradient(90deg, var(--rose-light), transparent);
            margin-bottom: 24px;
          }
          .hero-sub {
            font-family: 'Playfair Display', serif;
            font-style: italic; font-size: 18px;
            color: var(--muted); line-height: 1.7;
            max-width: 380px; margin-bottom: 48px;
          }
          .hero-cta {
            display: inline-flex; align-items: center; gap: 12px;
            background: var(--rose); color: white;
            font-family: 'Raleway', sans-serif; font-weight: 400;
            font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase;
            padding: 16px 40px; border-radius: 40px; border: none; cursor: pointer;
            transition: background 0.22s, transform 0.12s; width: fit-content;
            box-shadow: 0 4px 20px rgba(158,84,114,0.25);
          }
          .hero-cta:hover { background: var(--mauve); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(158,84,114,0.30); }
          .hero-cta-arrow { font-size: 15px; transition: transform 0.2s; }
          .hero-cta:hover .hero-cta-arrow { transform: translateX(4px); }

          /* tagline under CTA */
          .hero-tagline {
            margin-top: 20px;
            font-size: 10px; color: var(--silver);
            letter-spacing: 0.5px; font-style: italic;
            font-family: 'Playfair Display', serif;
          }

          /* Right side */
          .hero-right {
            background: var(--cream);
            padding: 80px 64px;
            display: flex; flex-direction: column; justify-content: center;
            border-left: 1px solid var(--gold-pale);
          }
          .hero-features-title {
            font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
            color: var(--rose-light); margin-bottom: 28px; font-weight: 400;
          }
          .feature-list { display: flex; flex-direction: column; gap: 0; }
          .feature-item {
            display: grid; grid-template-columns: 44px 1fr;
            align-items: start; gap: 0;
            padding: 20px 0; border-bottom: 1px solid var(--gold-pale);
          }
          .feature-item:first-child { border-top: 1px solid var(--gold-pale); }
          .feature-num {
            font-family: 'Playfair Display', serif;
            font-size: 28px; font-weight: 400;
            color: var(--rose-pale); line-height: 1; padding-top: 3px;
          }
          .feature-title {
            font-family: 'Playfair Display', serif;
            font-size: 18px; color: var(--ink); margin-bottom: 4px;
          }
          .feature-desc { font-size: 11px; color: var(--muted); line-height: 1.6; }

          /* ── GLOSSAR ──────────────────────────────────────────── */
          .hero-glossar { margin-top: 36px; padding-top: 28px; border-top: 1px solid var(--gold-pale); }
          .hero-glossar-title { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 16px; font-weight: 400; }
          .hero-glossar-grid { display: flex; flex-direction: column; gap: 0; }
          .hero-glossar-item { display: grid; grid-template-columns: 130px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--gold-pale); align-items: baseline; }
          .hero-glossar-item:last-child { border-bottom: none; }
          .hero-glossar-term { font-family: 'Playfair Display', serif; font-size: 14px; color: var(--ink); }
          .hero-glossar-def { font-size: 10.5px; color: var(--muted); line-height: 1.55; }

          /* ── LEAD GATE ────────────────────────────────────────── */
          #screen-lead {
            min-height: 100vh; display: none;
            align-items: center; justify-content: center;
            background: linear-gradient(145deg, var(--paper-deep) 0%, var(--paper) 50%, var(--rose-pale) 100%);
            padding-top: 68px;
          }
          #screen-lead.active { display: flex; }
          .lead-wrap { width: 100%; max-width: 500px; padding: 48px 32px; }
          .lead-eyebrow { font-size: 9px; letter-spacing: 3.5px; text-transform: uppercase; color: var(--rose); margin-bottom: 16px; font-weight: 400; }
          .lead-title {
            font-family: 'Playfair Display', serif;
            font-size: 44px; font-weight: 400; color: var(--ink);
            line-height: 1.08; margin-bottom: 14px;
          }
          .lead-title em { font-style: italic; color: var(--rose); }
          .lead-sub {
            font-family: 'Playfair Display', serif;
            font-style: italic; font-size: 17px; color: var(--muted);
            line-height: 1.7; margin-bottom: 44px;
          }
          .lead-field { margin-bottom: 28px; }
          .lead-label { display: block; font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; font-weight: 400; }
          .lead-input {
            width: 100%; background: transparent; border: none;
            border-bottom: 1px solid var(--gold-pale);
            padding: 6px 0 14px;
            font-family: 'Playfair Display', serif; font-size: 22px;
            color: var(--ink); outline: none;
            transition: border-color 0.2s;
          }
          .lead-input:focus { border-bottom-color: var(--rose); }
          .lead-input::placeholder { color: var(--silver); font-style: italic; }
          .lead-privacy { font-size: 10.5px; color: var(--silver); margin-top: 18px; line-height: 1.55; }
          .lead-btn {
            width: 100%; margin-top: 36px;
            background: var(--rose); color: white; border: none;
            font-family: 'Raleway', sans-serif; font-weight: 400; font-size: 10px;
            letter-spacing: 2.5px; text-transform: uppercase;
            padding: 18px; border-radius: 40px; cursor: pointer;
            transition: background 0.22s, transform 0.12s;
            box-shadow: 0 4px 20px rgba(158,84,114,0.22);
          }
          .lead-btn:hover { background: var(--mauve); transform: translateY(-1px); }
          .lead-btn:disabled { opacity: 0.3; cursor: default; pointer-events: none; }

          /* ── FORM ─────────────────────────────────────────────── */
          .form-page { max-width: 820px; margin: 0 auto; padding: 68px 56px 96px; }
          .form-page-header { margin-bottom: 52px; padding-bottom: 36px; border-bottom: 1px solid var(--gold-pale); }
          .form-eyebrow { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 12px; font-weight: 400; }
          .form-h2 {
            font-family: 'Playfair Display', serif;
            font-size: 48px; font-weight: 400; line-height: 1.05;
            color: var(--ink); margin-bottom: 12px; letter-spacing: -0.3px;
          }
          .form-sub {
            font-family: 'Playfair Display', serif;
            font-style: italic; font-size: 17px;
            color: var(--muted); line-height: 1.65; max-width: 540px;
          }

          /* ── CARDS ────────────────────────────────────────────── */
          .card-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 48px; }
          .card-grid-2-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 48px; }
          .select-card {
            background: white; border: 1.5px solid var(--gold-pale); border-radius: 18px; padding: 26px;
            cursor: pointer; display: flex; flex-direction: column; gap: 10px;
            position: relative; overflow: hidden;
            transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          }
          .select-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: transparent; transition: background 0.2s; border-radius: 18px 18px 0 0; }
          .select-card:hover { border-color: var(--rose-pale); box-shadow: 0 8px 32px rgba(158,84,114,0.10); transform: translateY(-2px); }
          .select-card.selected { border-color: var(--rose-light); background: var(--rose-pale); box-shadow: 0 8px 28px rgba(158,84,114,0.14); }
          .select-card.selected::before { background: var(--rose); }
          .card-top { display: flex; align-items: center; justify-content: space-between; }
          .card-icon { font-size: 22px; color: var(--rose-light); }
          .card-check { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--gold-pale); display: flex; align-items: center; justify-content: center; font-size: 9px; color: transparent; transition: all 0.2s; }
          .select-card.selected .card-check { background: var(--rose); border-color: var(--rose); color: white; }
          .card-title { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--ink); }
          .card-desc { font-size: 11px; color: var(--muted); line-height: 1.55; }

          /* ── INPUTS ───────────────────────────────────────────── */
          .field-group { margin-bottom: 32px; }
          .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; }
          .field-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
          .field-label { display: block; font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; font-weight: 400; }
          .field-hint { display: inline; font-size: 10px; letter-spacing: 0.5px; text-transform: none; color: var(--rose-light); font-style: italic; margin-left: 6px; }
          .field-input {
            width: 100%; background: transparent; border: none;
            border-bottom: 1px solid #ddd0c0;
            padding: 4px 0 14px;
            font-family: 'Playfair Display', serif; font-size: 21px;
            color: var(--ink); outline: none; transition: border-color 0.2s; -webkit-appearance: none;
          }
          .field-input:focus { border-bottom-color: var(--rose); }
          .field-input::placeholder { color: #c8bcb0; font-style: italic; }
          .field-input:disabled { opacity: 0.25; }
          .toggle-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; cursor: pointer; }
          .toggle-label { font-size: 11px; color: var(--silver); user-select: none; }
          .toggle-box { width: 34px; height: 19px; border-radius: 10px; background: #d8cec8; position: relative; flex-shrink: 0; transition: background 0.2s; }
          .toggle-box.on { background: var(--rose); }
          .toggle-box::after { content: ''; position: absolute; width: 15px; height: 15px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
          .toggle-box.on::after { transform: translateX(15px); }

          /* ── AHNENLINIE ──────────────────────────────────────────── */
          .ancestor-block {
            background: white; border: 1px solid var(--gold-pale); border-radius: 18px;
            padding: 32px 36px; margin-top: 24px;
          }
          .ancestor-block:first-of-type { margin-top: 32px; }
          .form-h3 {
            font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 500;
            color: var(--rose-light); margin: 0 0 24px 0; padding-bottom: 12px;
            border-bottom: 1px solid var(--gold-pale);
          }
          #ancestry-include-toggle { margin-top: 24px; padding: 14px 18px; background: var(--gold-faint); border: 1px solid var(--gold-pale); border-radius: 14px; }
          #ancestry-include-toggle .toggle-label { font-size: 13px; color: var(--ink); }
          #ancestry-fields.hidden { display: none; }

          /* ── LANGUAGE SWITCH ─────────────────────────────────────── */
          .lang-switch {
            margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--gold-pale);
            display: flex; flex-direction: column; align-items: flex-start; gap: 10px;
          }
          .lang-switch-label {
            font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
            color: var(--silver); font-weight: 400;
          }
          .lang-pills { display: flex; gap: 8px; }
          .lang-pill {
            font-family: 'Raleway', sans-serif; font-size: 12px; font-weight: 400;
            letter-spacing: 0.5px; padding: 8px 16px;
            background: white; color: var(--muted); border: 1px solid var(--gold-pale);
            border-radius: 999px; cursor: pointer; transition: all 0.15s;
          }
          .lang-pill:hover { border-color: var(--rose-light); color: var(--rose-light); }
          .lang-pill.active {
            background: var(--rose-light); color: white; border-color: var(--rose-light);
          }
          .lang-switch-note {
            font-size: 11px; color: var(--silver); font-style: italic; line-height: 1.5;
            max-width: 380px;
          }

          /* ── PERSON SECTION ───────────────────────────────────── */
          .person-section { background: white; border: 1px solid var(--gold-pale); border-radius: 18px; padding: 36px 40px; margin-bottom: 20px; }
          .person-section-title {
            font-family: 'Playfair Display', serif; font-size: 13px; font-weight: 500;
            letter-spacing: 1.5px; text-transform: uppercase; color: var(--rose-light);
            margin-bottom: 28px; padding-bottom: 14px; border-bottom: 1px solid var(--gold-pale);
          }

          /* ── NAMENSWECHSEL ────────────────────────────────────── */
          .namechange-section { background: var(--gold-faint); border: 1px dashed var(--gold-pale); border-radius: 14px; padding: 24px 32px; margin-top: 20px; }
          .namechange-toggle { display: flex; align-items: center; gap: 12px; cursor: pointer; }
          .namechange-toggle-label { font-size: 12px; color: var(--muted); }
          .namechange-fields { margin-top: 24px; display: none; }
          .namechange-fields.open { display: block; }

          /* ── CHILD BLOCK ──────────────────────────────────────── */
          .child-block { background: white; border: 1px solid var(--gold-pale); border-radius: 18px; padding: 36px 40px; margin-bottom: 18px; }
          .child-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
          .child-block-title { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--rose-light); }
          .btn-remove { background: transparent; border: none; color: var(--silver); cursor: pointer; font-size: 22px; padding: 0; line-height: 1; transition: color 0.2s; }
          .btn-remove:hover { color: var(--rose); }

          /* ── BUTTONS ──────────────────────────────────────────── */
          .form-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 52px; padding-top: 32px; border-top: 1px solid var(--gold-pale); }
          .btn-primary {
            background: var(--ink); border: none; color: var(--cream);
            font-family: 'Raleway', sans-serif; font-weight: 400; font-size: 10px;
            letter-spacing: 2.5px; text-transform: uppercase;
            padding: 16px 48px; border-radius: 40px; cursor: pointer;
            transition: background 0.22s, transform 0.12s;
          }
          .btn-primary:hover { background: var(--rose); transform: translateY(-1px); }
          .btn-primary:disabled { opacity: 0.3; cursor: default; pointer-events: none; }
          .btn-primary.gold { background: var(--rose); box-shadow: 0 4px 20px rgba(158,84,114,0.22); }
          .btn-primary.gold:hover { background: var(--mauve); }
          .btn-back { background: transparent; border: none; color: var(--silver); font-family: 'Raleway', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; padding: 0; transition: color 0.2s; }
          .btn-back:hover { color: var(--rose); }
          .btn-add {
            background: transparent; border: 1px dashed var(--rose-light); color: var(--rose);
            font-family: 'Raleway', sans-serif; font-weight: 400; font-size: 10px;
            letter-spacing: 2px; text-transform: uppercase;
            padding: 14px 28px; border-radius: 10px; cursor: pointer;
            width: 100%; margin-top: 4px; margin-bottom: 4px; transition: background 0.2s;
          }
          .btn-add:hover { background: var(--rose-pale); border-style: solid; }

          /* ── LOADING ──────────────────────────────────────────── */
          #screen-loading { display: none; align-items: center; justify-content: center; min-height: calc(100vh - 68px); background: var(--cream); }
          #screen-loading.active { display: flex; }
          .loading-inner { text-align: center; max-width: 440px; padding: 60px; }
          .loading-symbol { font-size: 56px; color: var(--rose-light); display: block; animation: spin 12s linear infinite; margin-bottom: 36px; }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .loading-h { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 400; color: var(--ink); margin-bottom: 14px; line-height: 1.2; }
          .loading-sub { font-family: 'Playfair Display', serif; font-style: italic; font-size: 17px; color: var(--muted); min-height: 28px; transition: opacity 0.4s; }
          .loading-sub.hidden { opacity: 0; }
          .loading-timer { font-family: 'Playfair Display', serif; font-size: 64px; font-weight: 400; color: var(--rose); letter-spacing: 0.04em; margin: 28px 0 6px; font-variant-numeric: tabular-nums; }
          .loading-eta { font-size: 12px; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 22px; }
          .loading-progress { width: 100%; height: 3px; background: var(--rose-pale); border-radius: 2px; overflow: hidden; margin-bottom: 18px; }
          .loading-progress-bar { height: 100%; background: linear-gradient(90deg, var(--rose-light), var(--gold)); width: 0%; transition: width 0.8s ease-out; }
          .loading-hint { font-size: 13px; color: var(--muted); line-height: 1.5; max-width: 360px; margin: 0 auto; font-style: italic; }

          /* ── DEPTH SCREEN ───────────────────────────────────────── */
          .depth-control { background: var(--paper-deep); border-radius: 14px; padding: 48px 56px; margin-top: 8px; }
          .depth-value-display { text-align: center; margin-bottom: 36px; }
          .depth-pages { font-family: 'Playfair Display', serif; font-size: 84px; font-weight: 400; color: var(--rose); line-height: 1; display: inline-block; vertical-align: baseline; }
          .depth-label { font-family: 'Raleway', sans-serif; font-size: 14px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); display: inline-block; vertical-align: baseline; margin-left: 12px; }
          .depth-slider { width: 100%; -webkit-appearance: none; appearance: none; height: 4px; background: var(--rose-pale); border-radius: 2px; outline: none; }
          .depth-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 28px; height: 28px; border-radius: 50%; background: var(--rose); cursor: pointer; box-shadow: 0 2px 8px rgba(155, 79, 102, 0.3); transition: transform 0.15s; }
          .depth-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
          .depth-slider::-moz-range-thumb { width: 28px; height: 28px; border-radius: 50%; background: var(--rose); cursor: pointer; border: none; box-shadow: 0 2px 8px rgba(155, 79, 102, 0.3); }
          .depth-scale { display: flex; justify-content: space-between; margin-top: 14px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
          .depth-meta { margin-top: 32px; padding: 16px 20px; background: rgba(255,255,255,0.5); border-radius: 8px; font-style: italic; color: var(--ink); font-size: 14px; line-height: 1.5; text-align: center; }

          .loading-dots { display: flex; gap: 8px; justify-content: center; margin-top: 44px; }
          .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rose-pale); animation: dp 1.6s ease-in-out infinite; }
          .dot:nth-child(2){animation-delay:0.3s} .dot:nth-child(3){animation-delay:0.6s}
          @keyframes dp { 0%,100%{background:var(--rose-pale);transform:scale(1)} 50%{background:var(--rose-light);transform:scale(1.4)} }

          /* ── RESULT ───────────────────────────────────────────── */
          #screen-result { min-height: calc(100vh - 68px); }
          .result-hero {
            background: linear-gradient(145deg, var(--paper-deep) 0%, var(--paper) 60%, var(--rose-pale) 100%);
            padding: 68px 56px; position: relative; overflow: hidden;
          }
          .result-hero::before { content: ''; position: absolute; top: -60px; right: -60px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(196,152,64,0.10) 0%, transparent 70%); }
          .result-hero-eyebrow { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 12px; font-weight: 400; }
          .result-hero-title { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 400; color: var(--ink); margin-bottom: 8px; }
          .result-hero-name { font-family: 'Playfair Display', serif; font-style: italic; font-size: 21px; color: var(--rose); }
          .result-hero-sub { font-size: 13px; letter-spacing: 0.5px; color: var(--rose-light); margin-top: 10px; font-weight: 400; }

          .result-content { max-width: 820px; margin: 0 auto; padding: 68px 56px 80px; }

          /* ── SECTION TITLES WITH INFO ─────────────────────────── */
          .result-section { margin-bottom: 52px; }
          .result-section-title-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--gold-pale); }
          .result-section-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 500; color: var(--rose); flex: 1; }
          .sec-info-btn {
            flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
            border: 1.5px solid var(--gold-pale); background: transparent;
            color: var(--silver); font-family: 'Georgia', serif; font-style: italic;
            font-size: 11px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            margin-top: 4px; transition: border-color 0.2s, color 0.2s, background 0.2s; line-height: 1;
          }
          .sec-info-btn:hover { border-color: var(--rose-light); color: var(--rose); background: var(--rose-pale); }
          .sec-info-panel {
            display: none; background: var(--rose-pale);
            border: 1px solid rgba(196,132,158,0.3); border-left: 3px solid var(--rose-light);
            border-radius: 10px; padding: 14px 18px;
            font-family: 'Raleway', sans-serif; font-size: 12.5px; font-weight: 300;
            color: var(--muted); line-height: 1.7; margin-bottom: 16px; letter-spacing: 0.1px;
          }
          .sec-info-panel.open { display: block; animation: fadeUp 0.25s ease forwards; }

          .result-text { font-family: 'Playfair Display', serif; font-size: 18px; line-height: 1.9; color: var(--ink); white-space: pre-wrap; }
          .result-body-inner { }
          .res-p { font-family: 'Playfair Display', serif; font-size: 18px; line-height: 1.9; color: var(--ink); margin-bottom: 14px; }

          .result-ornament { text-align: center; color: var(--rose-pale); font-size: 14px; letter-spacing: 16px; margin: 10px 0 52px; }
          .result-actions { background: var(--paper-deep); border-top: 1px solid var(--gold-pale); padding: 36px 56px; display: flex; align-items: center; gap: 24px; }
          .btn-ghost { background: transparent; border: none; color: var(--muted); font-family: 'Raleway', sans-serif; font-weight: 300; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; padding: 0; transition: color 0.2s; }
          .btn-ghost:hover { color: var(--rose); }
          .error-box { background: #fff5f5; border: 1px solid #f0c0c8; border-radius: 12px; padding: 22px 26px; color: var(--rose); font-size: 14px; line-height: 1.6; }

          /* ── RESULT COMPONENTS ────────────────────────────────── */
          .res-big-zahl { font-family: 'Playfair Display', serif; font-size: 96px; font-weight: 400; color: var(--rose); line-height: 1; margin: 14px 0 22px; letter-spacing: -3px; font-style: italic; }

          .res-person-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 20px 0; }
          .res-person-card { background: white; border: 1px solid var(--gold-pale); border-radius: 18px; padding: 28px; border-top: 3px solid var(--rose-light); }
          .res-pc-label { font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 6px; font-weight: 400; }
          .res-pc-zahl { font-family: 'Playfair Display', serif; font-size: 64px; font-weight: 400; color: var(--rose); line-height: 1; margin-bottom: 8px; font-style: italic; }
          .res-pc-datum { font-size: 11px; color: var(--silver); margin-bottom: 6px; }
          .res-pc-stern { font-size: 11px; color: var(--muted); margin-bottom: 14px; }
          .res-pc-desc { font-family: 'Playfair Display', serif; font-style: italic; font-size: 14px; color: var(--ink); line-height: 1.65; margin-bottom: 18px; border-top: 1px solid var(--gold-pale); padding-top: 14px; }
          .res-pc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .res-pc-stat { background: var(--rose-pale); border-radius: 10px; padding: 10px 6px; text-align: center; }
          .res-pc-stat-val { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 400; color: var(--rose); line-height: 1; }
          .res-pc-stat-label { font-size: 7.5px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }

          .res-karten-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
          .res-karte { background: white; border: 1px solid var(--gold-pale); border-radius: 16px; padding: 26px; border-top: 3px solid var(--rose-light); }
          .res-karte-eyebrow { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 6px; font-weight: 400; }
          .res-karte-zahl { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 400; color: var(--rose); line-height: 1; margin-bottom: 8px; font-style: italic; }
          .res-karte-titel { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--ink); margin-bottom: 8px; }
          .res-karte-desc { font-family: 'Playfair Display', serif; font-style: italic; font-size: 13px; color: var(--muted); line-height: 1.65; }

          .res-dynamik { background: var(--rose-pale); border: 1px solid rgba(196,132,158,0.3); border-radius: 18px; padding: 32px; margin: 18px 0; }
          .res-dyn-pole { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
          .res-dyn-pole-item { text-align: center; flex: 1; }
          .res-dyn-zahl { font-family: 'Playfair Display', serif; font-size: 60px; font-weight: 400; color: var(--rose); line-height: 1; font-style: italic; }
          .res-dyn-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-top: 8px; font-weight: 400; }
          .res-dyn-arrows { font-size: 26px; color: var(--rose-light); text-align: center; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
          .res-dyn-resonanz { font-size: 8.5px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose); font-weight: 400; }

          .res-astro-list { display: flex; flex-direction: column; gap: 0; margin: 14px 0; }
          .res-astro-item { display: grid; grid-template-columns: 44px 1fr; gap: 0; padding: 18px 0; border-bottom: 1px solid var(--gold-pale); align-items: start; }
          .res-astro-item:first-child { border-top: 1px solid var(--gold-pale); }
          .res-astro-symbol { font-size: 22px; color: var(--rose-light); padding-top: 2px; }
          .res-astro-titel { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 5px; font-weight: 400; }
          .res-astro-text { font-family: 'Playfair Display', serif; font-size: 16px; color: var(--ink); line-height: 1.75; font-style: italic; }

          .res-hs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 14px 0; }
          .res-hs-col { background: white; border-radius: 16px; padding: 26px; border: 1px solid var(--gold-pale); }
          .res-hs-challenge { border-left: 3px solid var(--rose-light); }
          .res-hs-key { border-left: 3px solid var(--gold); }
          .res-hs-header { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; font-weight: 400; }
          .res-hs-item { font-family: 'Playfair Display', serif; font-size: 16px; color: var(--ink); line-height: 1.65; margin-bottom: 10px; }

          .res-tabelle-wrap { overflow-x: auto; margin: 14px 0; border-radius: 14px; border: 1px solid var(--gold-pale); }
          .res-tabelle { width: 100%; border-collapse: collapse; font-family: 'Raleway', sans-serif; }
          .res-tabelle thead th { background: var(--mauve); color: white; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; padding: 14px 16px; text-align: left; font-weight: 400; }
          .res-tabelle tbody tr { border-bottom: 1px solid var(--gold-pale); }
          .res-tabelle tbody tr:last-child { border-bottom: none; }
          .res-tabelle tbody td { padding: 13px 16px; vertical-align: top; }
          .res-row-now { background: var(--rose-pale); }
          .res-jahr-cell { font-family: 'Playfair Display', serif; font-size: 19px; font-weight: 400; color: var(--rose); white-space: nowrap; font-style: italic; }
          .res-tab-zahl { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 400; color: var(--ink); display: block; }
          .res-tab-kw { font-size: 10px; color: var(--muted); display: block; margin-top: 2px; }

          .res-pinnacle { display: grid; grid-template-columns: 60px 1fr; gap: 0; padding: 18px 0; border-bottom: 1px solid var(--gold-pale); align-items: start; }
          .res-pin-zahl { font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 400; color: var(--rose-pale); line-height: 1; padding-top: 4px; font-style: italic; }
          .res-pin-header { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; flex-wrap: wrap; }
          .res-pin-num { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); font-weight: 400; }
          .res-pin-zeit { font-size: 11px; color: var(--silver); }
          .res-pin-person { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--rose); font-weight: 400; }
          .res-pin-desc { font-family: 'Playfair Display', serif; font-style: italic; font-size: 16px; color: var(--ink); line-height: 1.7; }
          .res-pin-challenge { font-size: 11px; color: var(--rose-light); margin-top: 5px; }

          .res-namen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
          .res-namen-card { background: white; border: 1px solid var(--gold-pale); border-radius: 16px; padding: 26px; border-top: 3px solid var(--rose-light); }
          .res-nc-name { font-family: 'Playfair Display', serif; font-size: 19px; color: var(--ink); margin-bottom: 2px; }
          .res-nc-rolle { font-size: 8.5px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 18px; font-weight: 400; }
          .res-nc-zahlen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px; }
          .res-nc-zahl-item { text-align: center; background: var(--rose-pale); border-radius: 10px; padding: 10px 5px; }
          .res-nc-z { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 400; color: var(--rose); line-height: 1; font-style: italic; }
          .res-nc-zl { font-size: 7.5px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-top: 3px; font-weight: 400; }
          .res-nc-ll { font-size: 9.5px; color: var(--muted); margin-top: 2px; }
          .res-nc-desc { font-family: 'Playfair Display', serif; font-style: italic; font-size: 13px; color: var(--muted); line-height: 1.65; border-top: 1px solid var(--gold-pale); padding-top: 12px; }

          .res-essenz {
            font-family: 'Playfair Display', serif; font-style: italic;
            font-size: 24px; line-height: 1.75; color: var(--ink);
            text-align: center; padding: 44px 28px;
            background: linear-gradient(135deg, var(--rose-pale) 0%, var(--gold-faint) 100%);
            border-radius: 18px; border: 1px solid rgba(196,132,158,0.25); margin: 14px 0;
          }

          /* ── PJ HEADER (Dein aktuelles Jahr) ───────────────────── */
          .res-pj-header {
            margin: 28px 0 18px 0; padding: 36px 32px;
            background: linear-gradient(135deg, var(--rose-pale) 0%, var(--gold-faint) 100%);
            border: 1px solid rgba(196,132,158,0.30); border-radius: 18px;
            display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 24px;
          }
          .res-pj-header-eyebrow {
            grid-column: 1; grid-row: 1;
            font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase;
            color: var(--rose-light); font-weight: 400; margin-bottom: 6px;
          }
          .res-pj-header-zeitraum {
            grid-column: 1; grid-row: 2;
            font-family: 'Playfair Display', serif; font-size: 22px; font-style: italic;
            color: var(--ink); line-height: 1.3;
          }
          .res-pj-header-zahl {
            grid-column: 2; grid-row: 1 / 3;
            font-family: 'Playfair Display', serif; font-size: 88px; font-weight: 400;
            color: var(--rose); line-height: 1; font-style: italic;
            display: flex; align-items: center;
          }

          /* ── QUARTAL Sub-Header ──────────────────────────────── */
          .res-quartal {
            margin: 32px 0 14px 0; padding-bottom: 10px;
            border-bottom: 1px solid var(--gold-pale);
            display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
          }
          .res-quartal-titel {
            font-family: 'Playfair Display', serif; font-size: 20px; color: var(--ink); font-style: italic;
          }
          .res-quartal-zeit {
            font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
            color: var(--silver); font-weight: 400;
          }

          /* ── HIGHLIGHT MONAT ─────────────────────────────────── */
          .res-highlight-monat {
            display: grid; grid-template-columns: 60px 1fr; gap: 18px;
            margin: 14px 0; padding: 14px 18px;
            background: white; border-left: 3px solid var(--rose-light);
            border-radius: 8px; align-items: center;
          }
          .res-hm-zahl {
            font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 400;
            color: var(--rose); font-style: italic; text-align: center; line-height: 1;
          }
          .res-hm-monat { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 3px; }
          .res-hm-label { font-family: 'Playfair Display', serif; font-style: italic; font-size: 15px; color: var(--ink); line-height: 1.5; }

          /* ── MOBILE ───────────────────────────────────────────── */
          @media (max-width: 860px) {
            .topnav { padding: 0 20px; }
            .nav-progress { display: none; }
            .hero { grid-template-columns: 1fr; }
            .hero-left { padding: 52px 28px 44px; }
            .hero-h1 { font-size: 52px; }
            .hero-right { padding: 44px 28px; border-left: none; border-top: 1px solid var(--gold-pale); }
            .form-page { padding: 44px 20px 68px; }
            .form-h2 { font-size: 36px; }
            .card-grid-2, .card-grid-2-3 { grid-template-columns: 1fr; }
            .field-row, .field-row-3 { grid-template-columns: 1fr; gap: 0; }
            .person-section { padding: 24px 20px; }
            .child-block { padding: 24px 20px; }
            .result-hero { padding: 44px 20px; }
            .result-hero-title { font-size: 36px; }
            .result-content { padding: 44px 20px 56px; }
            .result-actions { padding: 24px 20px; flex-direction: column; align-items: flex-start; }
            .form-footer { flex-direction: column-reverse; gap: 18px; align-items: flex-start; }
            .res-person-grid, .res-karten-grid, .res-hs-grid, .res-namen-grid { grid-template-columns: 1fr; }
            .res-big-zahl { font-size: 72px; }
            .res-dyn-pole { flex-direction: column; }
            .res-tabelle thead th, .res-tabelle tbody td { padding: 10px 12px; }
            .lead-wrap { padding: 32px 20px; }
            .lead-title { font-size: 36px; }
          }

          @media print {
            .topnav, .result-actions { display: none !important; }
            .result-content { padding: 20px; }
          }
        `}</style>
      </Head>

      {/* TOP NAV */}
      <nav className="topnav">
        <div className="nav-brand">
          <span className="nav-symbol">✦</span>
          <div>
            <span className="nav-name">Familien-Code</span>
            <span className="nav-by"> · von Susana</span>
          </div>
        </div>
        <div className="nav-progress" id="nav-progress"></div>
        <button className="nav-cta" id="nav-reset" style={{display:'none'}}>Neue Analyse</button>
      </nav>

      {/* SCREEN 0: SPLASH */}
      <div className="screen active" id="screen-splash">
        <div className="hero">
          <div className="hero-left">
            <div className="hero-left-inner">
              <div className="hero-eyebrow">herzbewegung · Numerologie & Astrologie</div>
              <span className="hero-symbol">✦</span>
              <h1 className="hero-h1">Familien-<br/><em>Code</em></h1>
              <div className="hero-rule"></div>
              <p className="hero-sub">Tiefgehende Seelenanalysen für deine Klient:innen, in Zahlen und Zeichen.</p>
              <button className="hero-cta" id="hero-cta-btn">
                Neue Analyse erstellen
                <span className="hero-cta-arrow">→</span>
              </button>
              <p className="hero-tagline">Für Einzelpersonen, Paare, Familien & Alleinerziehende</p>

              <div className="lang-switch" id="lang-switch" data-lang="de">
                <span className="lang-switch-label">Sprache der Analyse</span>
                <div className="lang-pills">
                  <button className="lang-pill active" data-lang="de" type="button">Deutsch</button>
                  <button className="lang-pill" data-lang="en" type="button">English</button>
                  <button className="lang-pill" data-lang="pt" type="button">Português</button>
                </div>
                <span className="lang-switch-note">Die Webseite bleibt auf Deutsch — nur die Analyse und das Word-Dokument folgen der gewählten Sprache.</span>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-features-title">Was diese Analyse umfasst</div>
            <div className="feature-list">
              {[
                ['01', 'Numerologie', 'Lebenszahl, Seelendrang, Persönlichkeit & Ausdruckskraft — aus Taufname und Geburtsdatum'],
                ['02', 'Astrologie', 'Sternzeichen, kosmische Verbindungen & astrologische Resonanzen im System'],
                ['03', 'Beziehungen', 'Dynamiken zwischen Partnern, Eltern & Kindern — das Familiensystem als Ganzes'],
                ['04', 'Jahresprognosen', 'Persönliche Jahresenergien, Pinnacles & Challenges für die kommenden Jahre'],
              ].map(([num, title, desc]) => (
                <div className="feature-item" key={num}>
                  <div className="feature-num">{num}</div>
                  <div className="feature-body">
                    <div className="feature-title">{title}</div>
                    <div className="feature-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hero-glossar">
              <div className="hero-glossar-title">Begriffe auf einen Blick</div>
              <div className="hero-glossar-grid">
                {[
                  ['Lebenszahl', 'Die wichtigste Zahl — errechnet aus dem vollständigen Geburtsdatum. Zeigt die Lebensaufgabe.'],
                  ['Seelendrang', 'Aus den Vokalen des Taufnamens. Was die Seele innerlich antreibt und ersehnt.'],
                  ['Persönlichkeit', 'Aus den Konsonanten. Wie man nach aussen wirkt — das erste Bild, das andere empfangen.'],
                  ['Ausdruckszahl', 'Alle Buchstaben des Namens. Das Gesamtpotenzial — was gelebt werden kann.'],
                  ['Persönliches Jahr', 'Jährlicher Energiezyklus von 1–9. Zeigt das Thema des laufenden Jahres.'],
                  ['Pinnacle', 'Längere Lebensphase (7–27 Jahre) mit spezifischer Energie und Lernaufgabe.'],
                  ['Challenge', 'Das Reibungsthema innerhalb eines Pinnacles — das Wachstumsfeld.'],
                  ['Meisterzahl', '11, 22 oder 33. Werden nicht reduziert — tragen erhöhtes Potenzial und erhöhte Anforderung.'],
                ].map(([term, def]) => (
                  <div className="hero-glossar-item" key={term}>
                    <div className="hero-glossar-term">{term}</div>
                    <div className="hero-glossar-def">{def}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCREEN LEAD: LEAD GATE */}
      <div className="screen" id="screen-lead">
        <div className="lead-wrap">
          <div className="lead-eyebrow">herzbewegung · Familien-Code</div>
          <h2 className="lead-title">Bevor wir beginnen</h2>
          <p className="lead-sub">Deine Analyse wird persönlich auf dich berechnet. Wo sollen wir sie hinschicken?</p>
          <div className="lead-field">
            <label className="lead-label">Vorname</label>
            <input className="lead-input" id="lead-name" type="text" placeholder="Dein Vorname" autoComplete="given-name" />
          </div>
          <div className="lead-field">
            <label className="lead-label">E-Mail-Adresse</label>
            <input className="lead-input" id="lead-email" type="email" placeholder="deine@email.com" autoComplete="email" />
          </div>
          <button className="lead-btn" id="btn-lead-next" disabled>
            Weiter zur Analyse →
          </button>
          <p className="lead-privacy">Deine Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.</p>
        </div>
      </div>

      {/* SCREEN 1: KONSTELLATION */}
      {/* SCREEN: MODUS */}
      <div className="screen" id="screen-mode">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 1 · System</div>
            <h2 className="form-h2">Welche Methode<br/>möchtest du nutzen?</h2>
            <p className="form-sub">Die numerologische Analyse oder Human Design. Sie bestimmt, welche Berechnungen laufen.</p>
          </div>
          <div className="card-grid-2">
            {[
              ['numerologie', '✶', 'Numerologie', 'Zahlen, Namen, Lebenszyklen und Astrologie als Fundament. Standard- oder individuelle Analyse.'],
              ['humandesign', '✦', 'Human Design', 'Der vollständige BodyGraph aus Geburtsdatum, exakter Zeit und Ort. Eigenständig, ohne Numerologie.'],
            ].map(([value, icon, title, desc]) => (
              <div className="select-card" data-card-type="system" data-value={value} key={value}>
                <div className="card-top"><div className="card-icon">{icon}</div><div className="card-check">✓</div></div>
                <div className="card-title">{title}</div>
                <div className="card-desc">{desc}</div>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary" id="btn-mode-next" disabled>Weiter →</button>
          </div>
        </div>
      </div>

      <div className="screen" id="screen-art">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 2 · Art der Analyse</div>
            <h2 className="form-h2">Welche Art von<br/>Analyse?</h2>
            <p className="form-sub">Die vollständige Tiefenanalyse oder ein gezielter, frei formulierter Auftrag.</p>
          </div>
          <div className="card-grid-2">
            {[
              ['standard', '◎', 'Vollständige Analyse', 'Die komplette Tiefenanalyse mit allen Sektionen.'],
              ['individuell', '✎', 'Individuelle Analyse', 'Eine gezielte, frei formulierte Frage. Die Berechnungen laufen als Fundament mit.'],
              ['kurzprofil', '⚡', 'Kurzprofil', 'Kompakt auf zwei Seiten: Muster, Verhalten, Umgang. Werkzeug für dich, nur Geburtsdatum nötig.'],
            ].map(([value, icon, title, desc]) => (
              <div className="select-card" data-card-type="art" data-value={value} key={value}>
                <div className="card-top"><div className="card-icon">{icon}</div><div className="card-check">✓</div></div>
                <div className="card-title">{title}</div>
                <div className="card-desc">{desc}</div>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary" id="btn-art-next" disabled>Weiter →</button>
          </div>
        </div>
      </div>

      <div className="screen" id="screen-constellation">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 1 von 6 · Konstellation</div>
            <h2 className="form-h2">Für wen erstellst du<br/>diese Analyse?</h2>
            <p className="form-sub">Wähle die Konstellation der Klient:in. Sie bestimmt Tiefe und Sektionen der Analyse.</p>
          </div>
          <div className="card-grid-2">
            {[
              ['solo', '✦', 'Einzelperson', 'Einzelanalyse — Lebensweg, Seele, Namen-Energie & Jahresprognosen für eine Person'],
              ['pair', '✦✦', 'Personenvergleich', 'Zwei Personen im Vergleich — Dynamik & Resonanz je nach Beziehungstyp (Liebe, Geschäft, Freundschaft, Vorgesetzte u.a.)'],
              ['family', '✦✦✦', 'Familie', 'Paar & Kinder — das vollständige Familiensystem mit allen Verbindungen'],
              ['solo_children', '✦◇', 'Alleinerziehende:r mit Kind/ern', 'Eine Person mit ihren Kindern im Zentrum der Analyse'],
            ].map(([value, icon, title, desc]) => (
              <div className="select-card" data-value={value} key={value}>
                <div className="card-top"><div className="card-icon">{icon}</div><div className="card-check">✓</div></div>
                <div className="card-title">{title}</div>
                <div className="card-desc">{desc}</div>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary" id="btn-constellation-next" disabled>Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 2: PERSON 1 */}
      <div className="screen" id="screen-person1">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 2 von 6 · Klient:in</div>
            <h2 className="form-h2">Die Person</h2>
            <p className="form-sub">Der vollständige Taufname, also der Name den die Person bei der Geburt erhalten hat, ist für die Numerologie entscheidend.</p>
          </div>
          <div className="person-section">
            <div className="person-section-title">Persönliche Angaben</div>
            <div id="person1-form"></div>
          </div>
          <div className="namechange-section">
            <div className="namechange-toggle" onClick={(e) => {
              const fields = e.currentTarget.parentElement.querySelector('.namechange-fields');
              if (fields) fields.classList.toggle('open');
            }}>
              <div className="toggle-box" id="nc-p1-toggle"></div>
              <span className="namechange-toggle-label">Person hat den Namen geändert (z. B. nach Heirat)</span>
            </div>
            <div className="namechange-fields">
              <div className="field-group" style={{marginTop: '8px'}}>
                <label className="field-label">Anlass der Namensänderung</label>
                <select className="field-input" id="p1-newname-occasion" defaultValue="">
                  <option value="">Anlass wählen …</option>
                  <optgroup label="Kindheit / Familie">
                    <option value="adoption">Adoption</option>
                    <option value="scheidung_eltern">Nach Scheidung der Eltern</option>
                    <option value="wiederheirat_eltern">Wiederheirat eines Elternteils (Stiefname)</option>
                    <option value="legitimation">Legitimation / Anerkennung</option>
                  </optgroup>
                  <optgroup label="Partnerschaft">
                    <option value="heirat_partnername">Heirat · Partnername</option>
                    <option value="heirat_doppelname">Heirat · Doppelname</option>
                    <option value="rueckkehr_geburtsname">Rückkehr zum Geburtsnamen</option>
                  </optgroup>
                  <optgroup label="Behördlich / rechtlich">
                    <option value="behoerdlich_frei">Freie behördliche Namensänderung</option>
                    <option value="einbuergerung">Einbürgerung / Migration</option>
                    <option value="transition">Geschlechtsangleichung / Transition</option>
                  </optgroup>
                  <optgroup label="Gelebter Name">
                    <option value="spitzname">Spitzname / Kosename</option>
                    <option value="kuenstlername">Künstlername / Pseudonym</option>
                    <option value="kurzform">Kurzform des Vornamens</option>
                  </optgroup>
                  <optgroup label="Spirituell / religiös">
                    <option value="taufname">Tauf- oder Firmname</option>
                    <option value="ordensname">Ordens- / Klostername</option>
                  </optgroup>
                </select>
              </div>
              <div className="field-row-3" style={{marginTop: '8px'}}>
                <div className="field-group">
                  <label className="field-label">Neuer Vorname</label>
                  <input className="field-input" id="p1-newname-first" placeholder="Vorname" />
                </div>
                <div className="field-group">
                  <label className="field-label">Weitere Vornamen</label>
                  <input className="field-input" id="p1-newname-middle" placeholder="optional" />
                </div>
                <div className="field-group">
                  <label className="field-label">Neuer Nachname</label>
                  <input className="field-input" id="p1-newname-last" placeholder="Nachname" />
                </div>
              </div>
            </div>
          </div>
          <div className="person-section" style={{ marginTop: '18px' }}>
            <div className="person-section-title">Analysedatum</div>
            <div className="field-group">
              <label className="field-label">Stichtag des Reports (Standard: heute)</label>
              <input className="field-input" id="analysis-date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              <p className="form-sub" style={{ marginTop: '6px', fontSize: '13px' }}>Auf dieses Datum bezieht sich alles Aktuelle: Persönliches Jahr, Persönlicher Monat und Tag, Alter und Zyklen. Setze es auf den Tag, an dem du die Analyse abgibst, nicht zwingend heute.</p>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 3: PERSON 2 */}
      <div className="screen" id="screen-person2">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow" id="p2-eyebrow">Schritt 3 von 6 · Partner:in</div>
            <h2 className="form-h2" id="p2-h2">Partner:in</h2>
            <p className="form-sub">Auch hier ist der Taufname massgebend, der Name bei der Geburt, nicht der spätere Alltagsname.</p>
          </div>
          <div className="person-section">
            <div className="person-section-title" id="p2-sectitle">Angaben Partner:in</div>
            <div id="person2-form"></div>
          </div>
          <div className="namechange-section">
            <div className="namechange-toggle" onClick={(e) => {
              const fields = e.currentTarget.parentElement.querySelector('.namechange-fields');
              if (fields) fields.classList.toggle('open');
            }}>
              <div className="toggle-box" id="nc-p2-toggle"></div>
              <span className="namechange-toggle-label" id="p2-nc-label">Partner:in hat den Namen geändert (z. B. nach Heirat)</span>
            </div>
            <div className="namechange-fields">
              <div className="field-group" style={{marginTop: '8px'}}>
                <label className="field-label">Anlass der Namensänderung</label>
                <select className="field-input" id="p2-newname-occasion" defaultValue="">
                  <option value="">Anlass wählen …</option>
                  <optgroup label="Kindheit / Familie">
                    <option value="adoption">Adoption</option>
                    <option value="scheidung_eltern">Nach Scheidung der Eltern</option>
                    <option value="wiederheirat_eltern">Wiederheirat eines Elternteils (Stiefname)</option>
                    <option value="legitimation">Legitimation / Anerkennung</option>
                  </optgroup>
                  <optgroup label="Partnerschaft">
                    <option value="heirat_partnername">Heirat · Partnername</option>
                    <option value="heirat_doppelname">Heirat · Doppelname</option>
                    <option value="rueckkehr_geburtsname">Rückkehr zum Geburtsnamen</option>
                  </optgroup>
                  <optgroup label="Behördlich / rechtlich">
                    <option value="behoerdlich_frei">Freie behördliche Namensänderung</option>
                    <option value="einbuergerung">Einbürgerung / Migration</option>
                    <option value="transition">Geschlechtsangleichung / Transition</option>
                  </optgroup>
                  <optgroup label="Gelebter Name">
                    <option value="spitzname">Spitzname / Kosename</option>
                    <option value="kuenstlername">Künstlername / Pseudonym</option>
                    <option value="kurzform">Kurzform des Vornamens</option>
                  </optgroup>
                  <optgroup label="Spirituell / religiös">
                    <option value="taufname">Tauf- oder Firmname</option>
                    <option value="ordensname">Ordens- / Klostername</option>
                  </optgroup>
                </select>
              </div>
              <div className="field-row-3" style={{marginTop: '8px'}}>
                <div className="field-group">
                  <label className="field-label">Neuer Vorname</label>
                  <input className="field-input" id="p2-newname-first" placeholder="Vorname" />
                </div>
                <div className="field-group">
                  <label className="field-label">Weitere Vornamen</label>
                  <input className="field-input" id="p2-newname-middle" placeholder="optional" />
                </div>
                <div className="field-group">
                  <label className="field-label">Neuer Nachname</label>
                  <input className="field-input" id="p2-newname-last" placeholder="Nachname" />
                </div>
              </div>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 3b: VERGLEICH (nur bei Personenvergleich) */}
      <div className="screen" id="screen-vergleich">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Vergleich</div>
            <h2 className="form-h2">Was möchtest du<br/>vergleichen?</h2>
            <p className="form-sub">Lege fest, in welcher Beziehung die beiden Personen stehen und worauf der Vergleich besonders schauen soll.</p>
          </div>
          <div className="person-section">
            <div className="person-section-title">In welcher Beziehung stehen die beiden?</div>
            <div className="card-grid-2-3" id="reltype-grid">
              {[
                ['partnerschaft', 'Liebespartnerschaft'],
                ['geschaeftspartnerschaft', 'Geschäftspartnerschaft'],
                ['freundschaft', 'Freundschaft'],
                ['vorgesetzte', 'Vorgesetzte Person'],
                ['mitarbeitende', 'Mitarbeitende Person'],
                ['kollegium', 'Kollegium / Team'],
                ['geschwister', 'Geschwister'],
                ['elternkind', 'Eltern & Kind'],
              ].map(([value, title]) => (
                <div className={'select-card' + (value === 'partnerschaft' ? ' selected' : '')} data-card-type="reltype" data-value={value} key={value}>
                  <div className="card-top"><div className="card-check">✓</div></div>
                  <div className="card-title" style={{ fontSize: '1.02rem' }}>{title}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="person-section">
            <div className="person-section-title">Worauf soll der Vergleich schauen? <span id="theme-counter" style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--rose)' }}>0 von 5</span></div>
            <p className="form-sub" style={{ marginTop: '-4px', marginBottom: '18px' }}>Mehrfachauswahl, maximal 5. Eigene Themen kannst du unten hinzufügen.</p>
            <div className="card-grid-2-3" id="theme-grid">
              {[
                'Beziehung & Naehe', 'Kommunikation', 'Beruf & Zusammenarbeit', 'Geld & Verbindlichkeit',
                'Konflikt & Spannung', 'Werte & Lebenssinn', 'Familie & Herkunft', 'Zukunft & Timing',
              ].map((label) => (
                <div className="select-card" data-card-type="theme" data-value={label} key={label}>
                  <div className="card-top"><div className="card-check">✓</div></div>
                  <div className="card-title" style={{ fontSize: '1.02rem' }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="field-group" style={{ marginTop: '20px' }}>
              <label className="field-label">Eigenes Thema hinzufügen</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <input className="field-input" id="theme-custom-input" placeholder="z. B. Umgang mit Geld, Zukunftsplanung …" style={{ flex: 1 }} />
                <button className="btn-add" id="btn-add-theme" type="button" style={{ whiteSpace: 'nowrap' }}>+ Hinzufügen</button>
              </div>
              <div id="theme-chips" style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}></div>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 4: COUPLE */}
      <div className="screen" id="screen-couple">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 4 von 6 · Schlüsseldaten</div>
            <h2 className="form-h2">Gemeinsame Geschichte</h2>
            <p className="form-sub">Diese Daten fliessen als numerologische Energiepunkte in die Analyse ein. Beide Angaben sind vollständig optional.</p>
          </div>
          <div className="person-section">
            <div className="person-section-title">Gemeinsame Daten</div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Kennenlernen (TT.MM.JJJJ)</label>
                <input className="field-input" id="meet-date" placeholder="Optional" />
                <div className="toggle-row" data-toggle-input="meet-date" data-toggle-id="no-meet">
                  <div className="toggle-box" id="no-meet"></div>
                  <span className="toggle-label">Datum unbekannt oder überspringen</span>
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Hochzeit / Zusammenzug (TT.MM.JJJJ)</label>
                <input className="field-input" id="wedding-date" placeholder="Optional" />
                <div className="toggle-row" data-toggle-input="wedding-date" data-toggle-id="no-wedding">
                  <div className="toggle-box" id="no-wedding"></div>
                  <span className="toggle-label">Datum unbekannt oder überspringen</span>
                </div>
              </div>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 5: KINDER */}
      <div className="screen" id="screen-children">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 5 von 6 · Kinder</div>
            <h2 className="form-h2">Die Kinder</h2>
            <p className="form-sub">Bis zu 5 Kinder können erfasst werden. Die Geburtszeit ist optional, aber wertvoll für die Analyse.</p>
          </div>
          <div id="children-container"></div>
          <button className="btn-add" id="btn-add-child">+ Weiteres Kind hinzufügen</button>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 5b: AHNENLINIE (optional) */}
      <div className="screen" id="screen-ancestry">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Optional · Ahnenlinie</div>
            <h2 className="form-h2">Was aus dem Familiensystem<br/>mitschwingt</h2>
            <p className="form-sub">Optional: Daten von Mutter und/oder Vater der Person eingeben, um wiederkehrende Muster und Themen aus dem Familiensystem in die Analyse einfliessen zu lassen. Alle Felder freiwillig, was nicht bekannt ist, leer lassen.</p>
          </div>

          <div className="toggle-row" id="ancestry-include-toggle">
            <span className="toggle-label">Ahnenlinie einbeziehen</span>
            <span className="toggle-box"></span>
          </div>

          <div id="ancestry-fields" className="hidden">
            <div className="ancestor-block">
              <h3 className="form-h3">Mutter</h3>
              <div className="field-group">
                <label className="field-label">Vorname (Taufname)</label>
                <input className="field-input" id="anc-mother-first" type="text" placeholder="z.B. Maria" />
              </div>
              <div className="field-group">
                <label className="field-label">Geburtsname (Mädchenname)</label>
                <input className="field-input" id="anc-mother-birth" type="text" placeholder="Der numerologisch reinste Name der Mutterlinie" />
              </div>
              <div className="field-group">
                <label className="field-label">Geburtsdatum</label>
                <input className="field-input" id="anc-mother-date" type="text" placeholder="TT.MM.JJJJ" />
              </div>
              <div className="field-group">
                <label className="field-label">Geburtsort (Stadt, Land)</label>
                <input className="field-input" id="anc-mother-place" type="text" placeholder="z.B. Lugano, Schweiz" />
              </div>
            </div>

            <div className="ancestor-block">
              <h3 className="form-h3">Vater</h3>
              <div className="field-group">
                <label className="field-label">Vorname (Taufname)</label>
                <input className="field-input" id="anc-father-first" type="text" placeholder="z.B. Giovanni" />
              </div>
              <div className="field-group">
                <label className="field-label">Geburtsname</label>
                <input className="field-input" id="anc-father-birth" type="text" placeholder="Nachname bei Geburt" />
              </div>
              <div className="field-group">
                <label className="field-label">Geburtsdatum</label>
                <input className="field-input" id="anc-father-date" type="text" placeholder="TT.MM.JJJJ" />
              </div>
              <div className="field-group">
                <label className="field-label">Geburtsort (Stadt, Land)</label>
                <input className="field-input" id="anc-father-place" type="text" placeholder="z.B. Bellinzona, Schweiz" />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 6: DETAILTIEFE */}
      <div className="screen" id="screen-depth">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 6 · Detailtiefe</div>
            <h2 className="form-h2">Wie ausführlich<br/>soll die Analyse werden?</h2>
            <p className="form-sub">Der Regler bestimmt die Tiefe pro Modul. Die Gesamtlänge ergibt sich aus der Anzahl gewählter Module mal dieser Tiefe, der Bericht wird nie abgeschnitten.</p>
          </div>
          <div className="depth-control">
            <div className="depth-value-display">
              <span className="depth-pages" id="depth-pages">15</span>
              <span className="depth-label">Tiefe</span>
            </div>
            <input type="range" min="5" max="40" defaultValue="15" step="5" id="depth-slider" className="depth-slider"/>
            <div className="depth-scale">
              <span>5 · Kompakt</span>
              <span>15 · Mittel</span>
              <span>25 · Tief</span>
              <span>40 · Profi</span>
            </div>
            <div className="depth-meta" id="depth-meta">Mittel · ca. 900 Wörter pro Modul · solide ausgeführt</div>
          </div>
          <div className="toggle-row" id="sections-include-toggle" style={{ marginTop: '28px', padding: '14px 18px', background: 'var(--gold-faint)', border: '1px solid var(--gold-pale)', borderRadius: '14px' }}>
            <span className="toggle-box"></span>
            <span className="toggle-label" style={{ marginLeft: '12px' }}>Sektionen anpassen (optional) — einzelne Kapitel abwählen</span>
          </div>
          <div id="sections-fields" className="hidden" style={{ marginTop: '16px' }}>
            <p className="form-sub" style={{ marginBottom: '12px' }}>Standardmässig ist alles aktiv. Schalte gezielt ab, was für diese:n Klient:in nicht gebraucht wird.</p>
            <div style={{ marginBottom: '22px', padding: '12px 16px', background: 'var(--gold-faint)', borderRadius: '10px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--ink)' }}>Immer enthalten (Fundament &amp; Kern):</strong> Zentraler Code, Persönlicher Lebensweg, Namen-Numerologie, Herausforderung &amp; Schlüssel, Essenz.
            </div>
            {[
              ['Numerologische Tiefe', [['pinnacles', 'Pinnacles & Challenges'], ['layer_a', 'Erweiterte Zahlenebenen (Layer A)'], ['layer_b', 'Essence Transit (Layer B)']]],
              ['Astrologisches Geburtsbild', [['astro_tiefe', 'Astrologische Tiefe (Layer C)'], ['achsen', 'Die vier Achsen (AC/DC/MC/IC)']]],
              ['Lebensthemen', [['layer_g', 'Lebensaufgabe & Seelenauftrag (G)'], ['layer_h', 'Beruf & Berufung (H)'], ['layer_i', 'Beziehungen & Partnerschaft (I)'], ['layer_j', 'Geld & Wohlstand (J)'], ['layer_m', 'Schatten & Wachstum (M)']]],
              ['Timing & Zyklen', [['pj', 'Persönliches Jahr (aktuell & nächstes)'], ['jahresenergien', 'Jahresenergien (6 Jahre)'], ['tag_heute', 'Persönlicher Tag am Analysedatum (E)'], ['kosmische_zyklen', 'Saturn & Jupiter Zyklen (F)'], ['layer_k', 'Aktuelle Transite, 12 Monate (K)'], ['layer_l', 'Lebenszyklen & Wendepunkte (L)']]],
              ['Synthese', [['layer_o', 'Entscheidungsradar (O) — läuft immer zuletzt']]],
            ].map(([groupTitle, items]) => (
              <div key={groupTitle} style={{ marginBottom: '20px' }}>
                <div className="form-eyebrow" style={{ marginBottom: '10px' }}>{groupTitle}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                  {items.map(([key, label]) => (
                    <div className="toggle-row" data-section={key} key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: 0 }}>
                      <span className="toggle-box on"></span>
                      <span className="toggle-label">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 7: FOKUS */}
      <div className="screen" id="screen-focus">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 7 · Fokus</div>
            <h2 className="form-h2">Worauf soll der<br/>Schwerpunkt liegen?</h2>
            <p className="form-sub">Wähle das Thema, das aktuell am stärksten bewegt. Die Analyse bleibt vollständig, dieser Fokus bestimmt wo sie am tiefsten geht.</p>
          </div>
          <div className="card-grid-2-3">
            {[
              ['overview', '◎', 'Das grosse Gesamtbild', 'Alle Dimensionen — vollständige Tiefenanalyse'],
              ['relationship', '♡', 'Beziehungsdynamik', 'Verbindung, Resonanz & Partnerschaft'],
              ['personal', '◈', 'Persönlicher Lebensweg', 'Seele, Bestimmung & innere Kraft'],
              ['children_focus', '✧', 'Die Kinder', 'Seelenbild & Energien der Kinder'],
              ['future', '◬', 'Zukunft & Jahresprognosen', 'Energien & Pinnacles für die kommenden Jahre'],
            ].map(([value, icon, title, desc]) => (
              <div className="select-card" data-value={value} key={value}>
                <div className="card-top"><div className="card-icon">{icon}</div><div className="card-check">✓</div></div>
                <div className="card-title">{title}</div>
                <div className="card-desc">{desc}</div>
              </div>
            ))}
          </div>
          <div className="ritual-addon" style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="toggle-row" id="ritual-toggle">
              <div className="toggle-box"></div>
              <span className="toggle-label">Ritual &amp; Affirmationen anhängen</span>
            </div>
            <p className="form-sub" style={{ marginTop: '8px' }}>Ein persönliches Schluss-Kapitel: sieben Affirmationen und ein Jahresritual, abgeleitet aus den Zahlen.</p>
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary gold" id="btn-focus-next" disabled>Analyse generieren ✦</button>
          </div>
        </div>
      </div>

      {/* SCREEN 7: LOADING */}
      {/* SCREEN: AUFTRAG (Individuelle Analyse) */}
      <div className="screen" id="screen-auftrag">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Auftrag</div>
            <h2 className="form-h2">Was soll ich<br/>analysieren?</h2>
            <p className="form-sub">Wähle eine Auftragsart oder formuliere frei. Die berechneten Zahlen & Astro-Fakten dieser Person bilden das Fundament.</p>
          </div>
          <div className="card-grid-2-3">
            {[
              ['individual', '✎', 'Individuell', 'Frei formulieren, was analysiert werden soll'],
              ['frage', '?', 'Persönliche Frage', 'Eine konkrete Frage der Person zu sich selbst — frei eintragen'],
              ['jahresprognose', '◬', 'Jahresprognose', 'Das kommende Persönliche Jahr, Monat für Monat'],
              ['berufung', '◈', 'Berufung & Karriere', 'Welcher Weg zu Zahlen, Stärken & Timing passt'],
              ['entscheidung', '⟁', 'Entscheidungshilfe', 'Eine konkrete Weggabelung durchleuchten'],
              ['timing', '◷', 'Günstiges Timing', 'Bester Zeitpunkt für ein Vorhaben'],
              ['namen', '✦', 'Namensanalyse / Namenswahl', 'Baby-, Künstler- oder Firmenname'],
              ['beziehung', '♡', 'Beziehungsfrage', 'Eine fokussierte Frage zu einer Beziehung'],
              ['lebensthema', '↻', 'Lebensthema / Muster', 'Warum etwas immer wiederkehrt'],
              ['bestimmung', '✶', 'Seelenaufgabe & Bestimmung', 'Tiefen-Dive Lebenssinn'],
              ['uebergang', '◠', 'Übergang & Neuanfang', 'Begleitung durch eine Lebensphase'],
            ].map(([value, icon, title, desc]) => (
              <div className="select-card" data-card-type="auftrag-preset" data-value={value} key={value}>
                <div className="card-top"><div className="card-icon">{icon}</div><div className="card-check">✓</div></div>
                <div className="card-title">{title}</div>
                <div className="card-desc">{desc}</div>
              </div>
            ))}
          </div>

          <div className="field-block" style={{ marginTop: '28px' }}>
            <label className="field-label">Auftrag oder Frage — frei formulieren</label>
            <textarea id="auftrag-text" rows={4} placeholder="z.B. eine Jahresprognose mit Fokus Jobwechsel — oder eine persönliche Frage wie: Warum ziehe ich immer denselben Beziehungstyp an?"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid rgba(0,0,0,0.18)', borderRadius: '10px', font: 'inherit', fontSize: '15px', resize: 'vertical', background: '#fff', boxSizing: 'border-box' }} />
          </div>

          <div className="field-block" style={{ marginTop: '18px' }}>
            <label className="field-label">Detaillierte Informationen (optional)</label>
            <textarea id="auftrag-detail" rows={3} placeholder="Konkreter Kontext zur Situation: Namen, Daten, Orte, Hintergrund. Je präziser, desto treffender die Analyse."
              style={{ width: '100%', padding: '12px 14px', border: '1px solid rgba(0,0,0,0.18)', borderRadius: '10px', font: 'inherit', fontSize: '15px', resize: 'vertical', background: '#fff', boxSizing: 'border-box' }} />
          </div>

          <div className="ritual-addon" style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="toggle-row on" id="auftrag-astro-toggle">
              <div className="toggle-box on"></div>
              <span className="toggle-label">Astrologie einbeziehen (Mond, Aszendent, Knoten)</span>
            </div>
          </div>

          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary gold" id="btn-auftrag-next" disabled>Analyse generieren ✦</button>
          </div>
        </div>
      </div>

      <div className="screen" id="screen-loading">
        <div className="loading-inner">
          <span className="loading-symbol">✦</span>
          <div className="loading-h">Analyse wird<br/>erstellt…</div>
          <div className="loading-sub" id="loading-sub">Lebenszahlen werden ermittelt…</div>
          <div className="loading-timer" id="loading-timer">00:00</div>
          <div className="loading-eta" id="loading-eta">Geschätzte Dauer: 3–6 Minuten</div>
          <div className="loading-progress">
            <div className="loading-progress-bar" id="loading-progress-bar"></div>
          </div>
          <div className="loading-hint" id="loading-hint">Tiefe Analysen brauchen Zeit. Wir generieren gerade tausende Wörter speziell für diese Person.</div>
        </div>
      </div>

      {/* SCREEN 8: RESULT */}
      <div className="screen" id="screen-result">
        <div className="result-hero">
          <div className="result-hero-eyebrow">herzbewegung · Familien-Code · Deine persönliche Analyse</div>
          <div className="result-hero-title" id="result-hero-title">Deine Seelenlandschaft</div>
          <div className="result-hero-name" id="result-name"></div>
          <div className="result-hero-sub" id="result-subtitle"></div>
        </div>
        <div className="result-content" id="result-body"></div>
        <div className="result-actions">
          <button className="btn-primary gold" id="btn-docx">↓ Als Word herunterladen</button>
          <button className="btn-primary" id="btn-print">↓ Als PDF speichern</button>
          <button className="btn-ghost" id="btn-reset-result">Neue Analyse starten</button>
        </div>
      </div>
    </>
  )
}
