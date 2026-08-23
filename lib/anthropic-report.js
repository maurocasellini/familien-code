// lib/anthropic-report.js
// Gemeinsame Text-Engine fuer Familien-Code.
// Wird von /api/chat (Live-Stream) UND /api/report (Hintergrund-Job) benutzt,
// damit Prompt, Fortsetzungs-Logik und Umlaut-Korrektur nur EINMAL existieren.

// Node-interner undici-Dispatcher mit langen Timeouts.
// Default headers-timeout in Node ist 300s; bei 32K-Token-Generation reicht das nicht.
let longDispatcher = null;
function getLongDispatcher() {
  if (longDispatcher) return longDispatcher;
  try {
    const { Agent } = require('undici');
    longDispatcher = new Agent({
      headersTimeout: 15 * 60 * 1000,
      bodyTimeout: 15 * 60 * 1000,
      connectTimeout: 60 * 1000,
    });
  } catch (e) {
    console.error('[report] undici Agent nicht verfuegbar:', e.message);
  }
  return longDispatcher;
}

// Der Regler ist ein ZIELSEITEN-Wert (5-40). Daraus wird ein HARTES Gesamt-Wortbudget
// abgeleitet, das gleichmaessig auf die enthaltenen Module verteilt wird. Ziel: die
// gewuenschte Seitenzahl zuverlaessig treffen, ohne je mitten im Satz/Modul abzuschneiden.
const WORDS_PER_PAGE = 450; // effektive Dichte im herzbewegung-Layout (A4, Georgia 11pt, mit Titeln/Tabellen/Weissraum)

function buildDepth(depth) {
  const targetPages = Math.max(5, Math.min(40, parseInt(depth, 10) || 15));
  const totalWords = targetPages * WORDS_PER_PAGE;
  // Deutsch ≈ 1.9 Tokens/Wort inkl. Marker/Struktur-Overhead, plus Puffer fuers saubere Beenden.
  const budgetTokens = Math.round(totalWords * 1.9) + 800;
  const maxTokens = Math.min(32000, Math.max(2500, budgetTokens));
  // Runden so decken, dass das Gesamtbudget grob eingehalten wird (+1 Turn Puffer zum runden Abschluss).
  const maxRounds = Math.min(10, Math.max(1, Math.ceil(budgetTokens / maxTokens)) + 1);
  const dichte = targetPages <= 8
    ? 'KOMPAKT: jedes Modul knapp und auf den Punkt.'
    : targetPages <= 18
      ? 'MITTEL: jedes Modul solide, fokussiert ausgefuehrt.'
      : targetPages <= 28
        ? 'TIEF: jedes Modul ausfuehrlich, mit Beispielen und Anwendungen.'
        : 'MAXIMUM: jedes Modul in grosser Tiefe, aber ohne Fuellwerk.';
  const instruction = `\n\nUMFANG — HARTES GESAMTBUDGET (hat VORRANG vor allen "mindestens X Woerter"-Angaben der einzelnen Sektionen):\nDer GANZE Report zielt auf etwa ${targetPages} Seiten, also insgesamt rund ${totalWords} Woerter. ${dichte}\nVerteile dieses Gesamtbudget GLEICHMAESSIG auf die tatsaechlich enthaltenen Module. Schreibe jedes gewaehlte Modul vollstaendig, aber so dicht und fokussiert, dass die SUMME ungefaehr das Seitenziel trifft. Wird der Platz knapp, fasse dich kuerzer statt laenger, aber schliesse JEDES Modul sauber und rund ab. Breche NIEMALS mitten in einem Satz, einer Tabelle oder einem Modul ab und haenge keine Fuellabsaetze an, nur um Laenge zu erzeugen. Lieber praezise und vollstaendig als aufgeblaeht. Kuerze niemals durch Weglassen ganzer gewaehlter Module.`;
  return { maxTokens, maxRounds, instruction, targetPages, totalWords };
}

export function resolveLang(language) {
  return (language === 'en' || language === 'pt') ? language : 'de';
}

// Defensive Umlaut-Korrektur, falls das Modell einzelne Woerter ohne Umlaute ausgibt.
export function fixUmlauts(s) {
  const umlautMap = [
    // Längere Strings zuerst (sonst überschreiben kürzere falsch)
    [/\bUebernaechstes\b/g, 'Übernächstes'], [/\buebernaechstes\b/g, 'übernächstes'],
    [/\bUebernaechste\b/g, 'Übernächste'], [/\buebernaechste\b/g, 'übernächste'],
    [/\bAusfuehrlich\b/g, 'Ausführlich'], [/\bausfuehrlich\b/g, 'ausführlich'],
    [/\bAusfuehrung\b/g, 'Ausführung'], [/\bausfuehrung\b/g, 'ausführung'],
    [/\bPersoenlichkeit\b/g, 'Persönlichkeit'], [/\bpersoenlichkeit\b/g, 'persönlichkeit'],
    [/\bPersoenliche\b/g, 'Persönliche'], [/\bpersoenliche\b/g, 'persönliche'],
    [/\bPersoenlicher\b/g, 'Persönlicher'], [/\bpersoenlicher\b/g, 'persönlicher'],
    [/\bPersoenliches\b/g, 'Persönliches'], [/\bpersoenliches\b/g, 'persönliches'],
    [/\bpersoenlich\b/g, 'persönlich'], [/\bPersoenlich\b/g, 'Persönlich'],
    [/\bnatuerlich\b/g, 'natürlich'], [/\bNatuerlich\b/g, 'Natürlich'],
    [/\bSuedknoten\b/g, 'Südknoten'], [/\bsuedknoten\b/g, 'südknoten'],
    [/\bNordknoten\b/g, 'Nordknoten'],
    [/\bSchuetze\b/g, 'Schütze'], [/\bschuetze\b/g, 'schütze'],
    [/\bLoewe\b/g, 'Löwe'], [/\bloewe\b/g, 'löwe'],
    [/\bSchluessel\b/g, 'Schlüssel'], [/\bschluessel\b/g, 'schlüssel'],
    [/\bGespraech\b/g, 'Gespräch'], [/\bgespraech\b/g, 'gespräch'],
    [/\bGespraeche\b/g, 'Gespräche'], [/\bgespraeche\b/g, 'gespräche'],
    [/\bGefuehl\b/g, 'Gefühl'], [/\bgefuehl\b/g, 'gefühl'],
    [/\bGefuehle\b/g, 'Gefühle'], [/\bgefuehle\b/g, 'gefühle'],
    [/\bSaetze\b/g, 'Sätze'], [/\bsaetze\b/g, 'sätze'],
    [/\bWoerter\b/g, 'Wörter'], [/\bwoerter\b/g, 'wörter'],
    [/\bWoertern\b/g, 'Wörtern'], [/\bwoertern\b/g, 'wörtern'],
    [/\bWaehrend\b/g, 'Während'], [/\bwaehrend\b/g, 'während'],
    [/\bSchoenheit\b/g, 'Schönheit'], [/\bschoenheit\b/g, 'schönheit'],
    [/\bschoen\b/g, 'schön'], [/\bSchoen\b/g, 'Schön'],
    [/\bMaedchen\b/g, 'Mädchen'], [/\bmaedchen\b/g, 'mädchen'],
    [/\bBuecher\b/g, 'Bücher'], [/\bbuecher\b/g, 'bücher'],
    [/\bMaerz\b/g, 'März'],
    [/\bGlueck\b/g, 'Glück'], [/\bglueck\b/g, 'glück'],
    [/\bgluecklich\b/g, 'glücklich'], [/\bGluecklich\b/g, 'Glücklich'],
    [/\bSchaetze\b/g, 'Schätze'], [/\bschaetze\b/g, 'schätze'],
    [/\bspueren\b/g, 'spüren'], [/\bspuerst\b/g, 'spürst'],
    [/\bspuert\b/g, 'spürt'], [/\bgespuert\b/g, 'gespürt'],
    [/\bpraezise\b/g, 'präzise'], [/\bPraezise\b/g, 'Präzise'],
    [/\berklaeren\b/g, 'erklären'], [/\bErklaeren\b/g, 'Erklären'],
    [/\bErklaerung\b/g, 'Erklärung'], [/\berklaerung\b/g, 'erklärung'],
    [/\bAnnaeherung\b/g, 'Annäherung'], [/\bannaeherung\b/g, 'annäherung'],
    [/\bAende/g, 'Ände'], [/\baende/g, 'ände'],
    [/\bgehoert\b/g, 'gehört'], [/\bGehoert\b/g, 'Gehört'],
    [/\bberueck/g, 'berück'], [/\bBerueck/g, 'Berück'],
    [/\bberuehr/g, 'berühr'], [/\bBeruehr/g, 'Berühr'],
    [/\bdurchgaengig\b/g, 'durchgängig'],
    [/\bnaechste\b/g, 'nächste'], [/\bNaechste\b/g, 'Nächste'],
    [/\bnaechster\b/g, 'nächster'], [/\bNaechster\b/g, 'Nächster'],
    [/\bnaechsten\b/g, 'nächsten'],
    [/\bzurueck\b/g, 'zurück'], [/\bZurueck\b/g, 'Zurück'],
    [/\bfuehrt\b/g, 'führt'], [/\bgefuehrt\b/g, 'geführt'],
    [/\bfuehren\b/g, 'führen'], [/\bgefuehren\b/g, 'geführen'],
    [/\bfuehlt\b/g, 'fühlt'], [/\bfuehl/g, 'fühl'],
    [/\bFuehl/g, 'Fühl'],
    [/\baussen\b/g, 'aussen'],
    [/\baeusser/g, 'äusser'], [/\bAeusser/g, 'Äusser'],
    [/\baehnlich\b/g, 'ähnlich'], [/\bAehnlich\b/g, 'Ähnlich'],
    [/\baehnliche\b/g, 'ähnliche'], [/\bAehnliche\b/g, 'Ähnliche'],
    [/\bunterstuetz/g, 'unterstütz'], [/\bUnterstuetz/g, 'Unterstütz'],
    [/\bmoechte\b/g, 'möchte'], [/\bMoechte\b/g, 'Möchte'],
    [/\bmoeglich\b/g, 'möglich'], [/\bMoeglich\b/g, 'Möglich'],
    [/\bmoeglicher\b/g, 'möglicher'], [/\bmoeglichkeit\b/g, 'möglichkeit'],
    [/\bMoeglichkeit\b/g, 'Möglichkeit'],
    [/\bAbsaetze\b/g, 'Absätze'], [/\babsaetze\b/g, 'absätze'],
    [/\bBloecke\b/g, 'Blöcke'], [/\bbloecke\b/g, 'blöcke'],
    [/\bUebersicht\b/g, 'Übersicht'], [/\buebersicht\b/g, 'übersicht'],
    [/\bUebung\b/g, 'Übung'], [/\buebung\b/g, 'übung'],
    [/\bUeber\b/g, 'Über'], [/\bueber\b/g, 'über'],
    // letzten: kurze Wörter (jetzt wo längere alle ersetzt sind)
    [/\bFuer\b/g, 'Für'], [/\bfuer\b/g, 'für'],
    [/\bLaenge\b/g, 'Länge'], [/\blaenge\b/g, 'länge'],
    [/\blaenger\b/g, 'länger'], [/\bLaenger\b/g, 'Länger'],
    [/\bMaennlich\b/g, 'Männlich'], [/\bmaennlich\b/g, 'männlich'],
    [/\bweiblich\b/g, 'weiblich'],
  ];
  let t = String(s || '');
  for (const [re, rep] of umlautMap) t = t.replace(re, rep);
  return t;
}

/**
 * Erzeugt den vollstaendigen Report-Text.
 * Fortsetzungs-Schleife (continue-turn), weil claude-opus-4-8 kein Assistant-Prefill kann.
 * onDelta(textStueck) wird bei jedem Token-Delta aufgerufen (optional).
 * @returns {Promise<{text:string, stopReason:string|null, rounds:number}>}
 */
export async function generateReportText({ messages, language, depth, onDelta }) {
  const lang = resolveLang(language);
  const systemPrompts = {
    de: 'Du bist eine erfahrene Astrologin, Numerologin und Lebensbegleiterin. Schreibe AUSSCHLIESSLICH in Schweizer Hochdeutsch.\n\nUMLAUTE: Verwende Umlaute ä ö ü Ä Ö Ü ganz normal! Beispiele: "natürlich", "für", "Länge", "Sätze", "persönlich", "Wörter", "über", "Größe" (ohne ß!), "Gefühl". Schreibe alle deutschen Wörter mit korrekten Umlauten.\n\nSCHARFES S: KEIN ß verwenden. Schreibe immer ss statt ß. Also: "muss", "gross", "weiss", "Strasse", "heisst", "Schluss", "Fluss", "Schloss", "Spass", "grösste".\n\nSTIL: Schreibe natürlich, warm und persönlich, NICHT wie eine KI. KEINE Gedankenstriche (kein — kein –), verwende stattdessen Kommas, Doppelpunkte oder kurze Sätze. Bindestriche in zusammengesetzten Wörtern sind OK.\n\n══ INTERNE BEDEUTUNGSSCHICHT (UNSICHTBAR FÜR LESER) ══\nDu bekommst im User-Prompt eine "TAROT-BEDEUTUNGSSCHICHT" mit Essenz, Licht, Schatten und Astro-Zuordnung zu bestimmten Zahlen. Diese Schicht ist die VERBORGENE TIEFE deiner Analyse.\n\nGOLDENE REGEL: Verwende den INHALT dieser Schicht (die Essenz, die Bilder, die Licht-Schatten-Polaritäten) in deinen Interpretationen. Sie geben deiner Numerologie die echte Bedeutungstiefe.\n\nABER: Erwähne NIEMALS folgendes im Text:\n• keine Karten-Namen (kein "Hierophant", "Kunst", "Der Magus", "Lust", "Adjustment", "Aeon", "Universum" usw.)\n• keine Karten-Nummern als Karten ("Karte XIV", "Arkanum V")\n• keine Tarot-Begriffe (kein "Tarot", "Karte", "Arkanum", "Crowley", "Thoth", "Tarot-Karte")\n• keine Tarot-Berechnungs-Erklärungen (kein "17+5+2026=2048 → 14 → 5 → Karte 5...")\n\nDie Tarot-Schicht ist deine UNSICHTBARE LEHRMEISTERIN. Die Klient:in liest "deine Lebenszahl 5 zeigt..." nicht "Tarot-Karte V zeigt...". Du übersetzt die Karten-Essenz in numerologische und persönliche Sprache.\n\nBeispiel: Statt "Karte 14 ist Art, alchemistische Mischung" schreibst du "deine Energie zeigt eine alchemistische Qualität, du verbindest Gegensätze, was scheinbar nicht zusammengehört wird in deinem inneren Kessel zu etwas Neuem verschmolzen". Die Essenz bleibt, der Karten-Name verschwindet.\n\nINHALT: Schreibe tief, persönlich und konkret. Jede Analyse soll sich wie ein persönliches Gespräch anfühlen.',
    en: 'You are an experienced astrologer and numerologist. Write ENTIRELY in English (modern, natural, warm, neither stiff nor academic). Use the informal "you".\n\nSTYLE: Write naturally and personally, NOT like an AI. NO em-dashes (no —) and NO en-dashes (no –). Use commas, colons, or short sentences instead. Hyphens in compound words (Family-Code, soul-path) are fine. But NEVER a dash as punctuation. Example: "Maria, the star sign that changed everything," (correct) instead of "Maria — the star sign that changed everything —" (WRONG).\n\nCONTENT: Write deeply, personally, and concretely. Each analysis should feel like a personal conversation. Be generous with length and detail.\n\nKeep all structural markers like [ZAHL:11], [PERSON-CARD:...], [NAMEN-GRID-START] exactly as they are. But inside those tags, content (labels, descriptions, keywords) should be in English.',
    pt: 'És uma astróloga e numeróloga experiente. Escreve INTEIRAMENTE em português (preferencialmente europeu, mas natural e caloroso). Usa a forma informal "tu".\n\nESTILO: Escreve de forma natural e pessoal, NÃO como uma IA. SEM travessões (sem — e sem –). Usa vírgulas, dois-pontos ou frases curtas em vez disso. Hífenes em palavras compostas (Código-Familiar, vida-alma) estão bem. Mas NUNCA um travessão como pontuação. Exemplo: "Maria, o signo que mudou tudo," (correto) em vez de "Maria — o signo que mudou tudo —" (ERRADO).\n\nCONTEÚDO: Escreve de forma profunda, pessoal e concreta. Cada análise deve parecer uma conversa pessoal. Sê generosa com a extensão e os detalhes.\n\nMantém os marcadores estruturais como [ZAHL:11], [PERSON-CARD:...], [NAMEN-GRID-START] exatamente como estão. Mas dentro dessas etiquetas, o conteúdo (rótulos, descrições, palavras-chave) deve estar em português.',
  };
  const { maxTokens, maxRounds, instruction } = buildDepth(depth);
  const systemFull = systemPrompts[lang] + instruction;
  // Fortsetzungs-Aufforderung in der Ausgabesprache — ein deutscher Turn wuerde
  // die Ausgabe bei en/pt zurueck ins Deutsche ziehen.
  const continueTurn = {
    de: 'Fahre exakt dort fort, wo du aufgehört hast. Wiederhole nichts, schreibe keine neue Einleitung und keine bereits gesetzte Überschrift erneut, setze den laufenden Text unmittelbar und nahtlos fort. Schreibe weiterhin AUSSCHLIESSLICH auf Deutsch.',
    en: 'Continue exactly where you left off. Repeat nothing, write no new introduction and no heading you have already written, resume the running text immediately and seamlessly. Keep writing ENTIRELY in English.',
    pt: 'Continua exatamente onde paraste. Não repitas nada, não escrevas nova introdução nem nenhum título já escrito, retoma o texto de forma imediata e contínua. Continua a escrever INTEIRAMENTE em português.',
  }[lang];
  const disp = getLongDispatcher();
  const baseHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  };

  // maxRounds kommt jetzt aus buildDepth (an das Seitenbudget gekoppelt) statt fix 10.
  let fullText = '';
  let stopReason = null;
  let rounds = 0;

  while (rounds < maxRounds) {
    if (fullText) fullText = fullText.replace(/\s+$/, '');
    const roundMessages = fullText
      ? [...messages, { role: 'assistant', content: fullText }, { role: 'user', content: continueTurn }]
      : messages;
    const fetchOpts = {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: maxTokens,
        system: systemFull,
        messages: roundMessages,
        stream: true,
      }),
    };
    if (disp) fetchOpts.dispatcher = disp;

    // Transiente Fehler (429/529/5xx) mit exponentiellem Backoff wiederholen.
    let response;
    const maxRetries = 5;
    for (let attempt = 0; ; attempt++) {
      response = await fetch('https://api.anthropic.com/v1/messages', fetchOpts);
      if (response.ok) break;
      const retriable = response.status === 429 || response.status === 529 || response.status >= 500;
      if (!retriable || attempt >= maxRetries) break;
      const waitMs = Math.min(16000, 1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
      console.warn(`[report] API ${response.status} (transient), Versuch ${attempt + 1}/${maxRetries}, warte ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let msg = errorText;
      try { msg = JSON.parse(errorText).error?.message || errorText; } catch (e) {}
      if (fullText) break; // schon Text gesammelt -> das Bisherige liefern
      throw new Error(`API-Fehler ${response.status}: ${msg}`);
    }

    let roundChunk = '';
    let roundStop = null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nlIdx;
      while ((nlIdx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nlIdx);
        buf = buf.slice(nlIdx + 1);
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let evt;
        try { evt = JSON.parse(payload); } catch (e) { continue; }
        if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta' && evt.delta.text) {
          roundChunk += evt.delta.text;
          if (onDelta) { try { onDelta(evt.delta.text); } catch (e) {} }
        } else if (evt.type === 'message_delta' && evt.delta && evt.delta.stop_reason) {
          roundStop = evt.delta.stop_reason;
        }
      }
    }

    fullText += roundChunk;
    stopReason = roundStop;
    rounds++;
    if (stopReason !== 'max_tokens') break; // natuerliches Ende
    if (!roundChunk) break;                  // Schutz gegen Endlosschleife
  }

  const finalText = (lang === 'de') ? fixUmlauts(fullText) : fullText;
  return { text: finalText, stopReason, rounds };
}
