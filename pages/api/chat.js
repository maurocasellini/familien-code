import { Redis } from '@upstash/redis';

// Node-internal undici → fetch dispatcher mit langen Timeouts.
// Default headers-timeout in Node ist 300s; bei 32K-Token-Generation reicht das nicht.
// Wir nehmen 15 Min — passt für lokale Volltiefe-Analysen.
let longDispatcher = null;
function getLongDispatcher() {
  if (longDispatcher) return longDispatcher;
  try {
    const { Agent } = require('undici');
    longDispatcher = new Agent({
      headersTimeout: 15 * 60 * 1000, // 15 Min
      bodyTimeout: 15 * 60 * 1000,
      connectTimeout: 60 * 1000,      // 60s für TLS-Handshake
    });
  } catch (e) {
    console.error('[chat] undici Agent nicht verfuegbar:', e.message);
  }
  return longDispatcher;
}

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const config = { maxDuration: 800 }; // Vercel Pro + Fluid Compute: bis 800s (13.3 Min)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, lead, language, depth } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // ── LANGUAGE-AWARE SYSTEM PROMPT ───────────────────────────────
  const lang = (language === 'en' || language === 'pt') ? language : 'de';
  const systemPrompts = {
    de: 'Du bist eine erfahrene Astrologin, Numerologin und Lebensbegleiterin. Schreibe AUSSCHLIESSLICH in Schweizer Hochdeutsch.\n\nUMLAUTE: Verwende Umlaute ä ö ü Ä Ö Ü ganz normal! Beispiele: "natürlich", "für", "Länge", "Sätze", "persönlich", "Wörter", "über", "Größe" (ohne ß!), "Gefühl". Schreibe alle deutschen Wörter mit korrekten Umlauten.\n\nSCHARFES S: KEIN ß verwenden. Schreibe immer ss statt ß. Also: "muss", "gross", "weiss", "Strasse", "heisst", "Schluss", "Fluss", "Schloss", "Spass", "grösste".\n\nSTIL: Schreibe natürlich, warm und persönlich, NICHT wie eine KI. KEINE Gedankenstriche (kein — kein –), verwende stattdessen Kommas, Doppelpunkte oder kurze Sätze. Bindestriche in zusammengesetzten Wörtern sind OK.\n\n══ INTERNE BEDEUTUNGSSCHICHT (UNSICHTBAR FÜR LESER) ══\nDu bekommst im User-Prompt eine "TAROT-BEDEUTUNGSSCHICHT" mit Essenz, Licht, Schatten und Astro-Zuordnung zu bestimmten Zahlen. Diese Schicht ist die VERBORGENE TIEFE deiner Analyse.\n\nGOLDENE REGEL: Verwende den INHALT dieser Schicht (die Essenz, die Bilder, die Licht-Schatten-Polaritäten) in deinen Interpretationen. Sie geben deiner Numerologie die echte Bedeutungstiefe.\n\nABER: Erwähne NIEMALS folgendes im Text:\n• keine Karten-Namen (kein "Hierophant", "Kunst", "Der Magus", "Lust", "Adjustment", "Aeon", "Universum" usw.)\n• keine Karten-Nummern als Karten ("Karte XIV", "Arkanum V")\n• keine Tarot-Begriffe (kein "Tarot", "Karte", "Arkanum", "Crowley", "Thoth", "Tarot-Karte")\n• keine Tarot-Berechnungs-Erklärungen (kein "17+5+2026=2048 → 14 → 5 → Karte 5...")\n\nDie Tarot-Schicht ist deine UNSICHTBARE LEHRMEISTERIN. Die Klient:in liest "deine Lebenszahl 5 zeigt..." nicht "Tarot-Karte V zeigt...". Du übersetzt die Karten-Essenz in numerologische und persönliche Sprache.\n\nBeispiel: Statt "Karte 14 ist Art, alchemistische Mischung" schreibst du "deine Energie zeigt eine alchemistische Qualität, du verbindest Gegensätze, was scheinbar nicht zusammengehört wird in deinem inneren Kessel zu etwas Neuem verschmolzen". Die Essenz bleibt, der Karten-Name verschwindet.\n\nINHALT: Schreibe tief, persönlich und konkret. Jede Analyse soll sich wie ein persönliches Gespräch anfühlen.',
    en: 'You are an experienced astrologer and numerologist. Write ENTIRELY in English (modern, natural, warm, neither stiff nor academic). Use the informal "you".\n\nSTYLE: Write naturally and personally, NOT like an AI. NO em-dashes (no —) and NO en-dashes (no –). Use commas, colons, or short sentences instead. Hyphens in compound words (Family-Code, soul-path) are fine. But NEVER a dash as punctuation. Example: "Maria, the star sign that changed everything," (correct) instead of "Maria — the star sign that changed everything —" (WRONG).\n\nCONTENT: Write deeply, personally, and concretely. Each analysis should feel like a personal conversation. Be generous with length and detail.\n\nKeep all structural markers like [ZAHL:11], [PERSON-CARD:...], [NAMEN-GRID-START] exactly as they are. But inside those tags, content (labels, descriptions, keywords) should be in English.',
    pt: 'És uma astróloga e numeróloga experiente. Escreve INTEIRAMENTE em português (preferencialmente europeu, mas natural e caloroso). Usa a forma informal "tu".\n\nESTILO: Escreve de forma natural e pessoal, NÃO como uma IA. SEM travessões (sem — e sem –). Usa vírgulas, dois-pontos ou frases curtas em vez disso. Hífenes em palavras compostas (Código-Familiar, vida-alma) estão bem. Mas NUNCA um travessão como pontuação. Exemplo: "Maria, o signo que mudou tudo," (correto) em vez de "Maria — o signo que mudou tudo —" (ERRADO).\n\nCONTEÚDO: Escreve de forma profunda, pessoal e concreta. Cada análise deve parecer uma conversa pessoal. Sê generosa com a extensão e os detalhes.\n\nMantém os marcadores estruturais como [ZAHL:11], [PERSON-CARD:...], [NAMEN-GRID-START] exatamente como estão. Mas dentro dessas etiquetas, o conteúdo (rótulos, descrições, palavras-chave) deve estar em português.',
  };
  const systemPrompt = systemPrompts[lang];

  // ── SAVE LEAD TO REDIS ─────────────────────────────────────────
  if (lead?.email) {
    try {
      const redis = getRedis();
      if (redis) {
        const id = `lead:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
        const record = JSON.stringify({
          id,
          name: lead.name || '',
          email: lead.email || '',
          constellation: lead.constellation || '',
          focus: lead.focus || '',
          language: lang,
          timestamp: new Date().toISOString(),
        });
        await redis.set(id, record);
        await redis.lpush('leads', id);
      }
    } catch (err) {
      console.error('Redis save error:', err.message);
    }
  }

  // Vercel Hobby hat 60s Timeout. Lokal: unbegrenzt.
  // max_tokens skaliert mit gewünschter Detailtiefe (Zielseiten):
  //   5 Seiten  ≈ 3000 Tokens    15 Seiten ≈ 9000 Tokens
  //   25 Seiten ≈ 16000 Tokens   40 Seiten ≈ 28000 Tokens
  // Faustregel: ~600 tokens pro Zielseite + Overhead.
  const isVercel = process.env.VERCEL === '1';
  const targetDepth = Math.max(5, Math.min(40, parseInt(depth, 10) || 15));
  const localMaxTokens = Math.min(32000, Math.max(2500, targetDepth * 700 + 1000));
  const maxTokens = localMaxTokens; // keine Vercel-Drosselung mehr (Pro-Plan)
  // Slider = Tiefe PRO MODUL (nicht Gesamt-Seitenzahl). Die Gesamtlaenge ergibt sich
  // aus Anzahl gewaehlter Module mal dieser Tiefe. Richtwert Woerter pro Modul:
  //   Stufe 5 ≈ 300, 15 ≈ 900, 25 ≈ 1500, 40 ≈ 2400.
  const perModuleWords = Math.round(targetDepth * 60);
  const depthStufe = targetDepth <= 8
    ? 'KOMPAKT: jedes Modul knapp und auf den Punkt, deutlich kuerzer als die im Prompt genannten Mindestwerte.'
    : targetDepth <= 18
      ? 'MITTEL: jedes Modul solide ausgefuehrt.'
      : targetDepth <= 28
        ? 'TIEF: jedes Modul ausfuehrlich, mit Beispielen und Anwendungen.'
        : 'PROFI-MAXIMUM: jedes Modul in maximaler Tiefe, alle Aspekte ausschoepfen.';
  const depthInstruction = `\n\nDETAILTIEFE — STEUERT DIE TIEFE PRO MODUL (diese Vorgabe hat VORRANG vor den "mindestens X Woerter"-Angaben der einzelnen Sektionen):\nDer Regler steht auf Stufe ${targetDepth} von 40. Richtwert pro Modul: etwa ${perModuleWords} Woerter. ${depthStufe}\nSkaliere JEDE Sektion auf diese Tiefe: bei niedriger Stufe kuerzer als die genannten Mindestwortzahlen, bei hoher Stufe entsprechend laenger. Die GESAMTLAENGE des Berichts ergibt sich aus der Anzahl der gewaehlten Module mal dieser Tiefe pro Modul, es gibt KEINE Gesamt-Seitenobergrenze. Schreibe jedes gewaehlte Modul vollstaendig aus, kuerze niemals durch Weglassen ganzer Module.`;

  // ── ANTHROPIC API ──────────────────────────────────────────────
  try {
    console.log('[chat] Calling Anthropic API. Key present:', !!process.env.ANTHROPIC_API_KEY, 'Key prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 12));
    const baseHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };
    const systemFull = systemPrompt + depthInstruction; // volle Tiefe lokal UND auf Vercel
    const disp = getLongDispatcher(); // auch auf Vercel: lange Opus-Runden brauchen langen Timeout

    // ── FORTSETZUNGS-SCHLEIFE ──────────────────────────────────────
    // Endet die Antwort am Token-Limit (stop_reason: "max_tokens"), wird
    // automatisch weitergeneriert: der bisherige Text wird als Assistant-Prefill
    // angehaengt, das Modell schreibt nahtlos weiter, die Teile werden zusammengefuegt
    // bis das Modell natuerlich fertig ist (end_turn). So waechst die Laenge automatisch
    // mit der gewaehlten Modul-Menge und wird nie abgeschnitten.
    // Auf Vercel (60s-Limit) bleibt es bei 1 Runde.
    const maxRounds = 10; // volle Fortsetzung lokal UND auf Vercel (Pro-Plan)
    let fullText = '';
    let lastData = null;
    let stopReason = null;
    let rounds = 0;

    while (rounds < maxRounds) {
      if (fullText) fullText = fullText.replace(/\s+$/, ''); // kein trailing whitespace im Prefill
      const roundMessages = fullText
        ? [...messages, { role: 'assistant', content: fullText }]
        : messages;
      const fetchOpts = {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: maxTokens,
          system: systemFull,
          messages: roundMessages,
        }),
      };
      if (disp) fetchOpts.dispatcher = disp;

      // Transiente API-Fehler (429 Rate-Limit, 529 Overloaded, 5xx) automatisch
      // wiederholen, mit wachsender Pause. So sieht die Nutzerin "Overloaded" nicht.
      let response;
      const maxRetries = 5;
      for (let attempt = 0; ; attempt++) {
        response = await fetch('https://api.anthropic.com/v1/messages', fetchOpts);
        if (response.ok) break;
        const retriable = response.status === 429 || response.status === 529 || response.status >= 500;
        if (!retriable || attempt >= maxRetries) break;
        const waitMs = Math.min(16000, 1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
        console.warn(`[chat] API ${response.status} (transient), Versuch ${attempt + 1}/${maxRetries}, warte ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
      }
      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try { errorJson = JSON.parse(errorText); } catch (e) { errorJson = { error: { message: errorText } }; }
        console.error('[chat] Anthropic returned non-OK status', response.status, errorJson);
        if (fullText) break; // schon Text gesammelt -> nicht verwerfen, das Bisherige zurueckgeben
        return res.status(response.status).json(errorJson);
      }

      const roundData = await response.json();
      lastData = roundData;
      const chunk = (roundData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      fullText += chunk;
      stopReason = roundData.stop_reason;
      rounds++;
      if (stopReason !== 'max_tokens') break; // natuerliches Ende erreicht
      if (!chunk) break;                       // Schutz gegen Endlosschleife
    }
    console.log('[chat] Fortsetzungs-Runden:', rounds, '| stop_reason:', stopReason, '| Zeichen:', fullText.length);

    // Zusammengefuegtes Resultat als ein Text-Block (Form bleibt wie zuvor fuer den Client)
    const data = {
      ...(lastData || {}),
      content: [{ type: 'text', text: fullText }],
      stop_reason: stopReason,
    };

    // Defensive Umlaut-Korrektur: falls Claude trotz System-Prompt einzelne Wörter
    // ohne Umlaute ausspuckt (ueber, fuer, Saetze, etc.), korrigiere sie hier.
    // Nur fürs DE-Output, EN/PT bleiben unangetastet.
    if ((language === 'de' || !language) && data.content && Array.isArray(data.content)) {
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
      const fixUmlauts = (s) => {
        let t = String(s || '');
        for (const [re, rep] of umlautMap) t = t.replace(re, rep);
        return t;
      };
      data.content = data.content.map(block => {
        if (block && block.type === 'text' && typeof block.text === 'string') {
          return { ...block, text: fixUmlauts(block.text) };
        }
        return block;
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    // Detaillierter Fehler in Server-Logs (Terminal von npm run electron:dev)
    console.error('[chat] Fetch failed. Full error:', err);
    console.error('[chat] err.cause:', err.cause);
    console.error('[chat] err.code:', err.code);
    const detail = err.cause?.message || err.cause?.code || err.code || 'unbekannt';
    return res.status(500).json({
      error: {
        message: `${err.message} (Detail: ${detail}). Bitte schau in der Terminal-Konsole nach dem genauen Fehler. Häufige Ursachen: Internet nicht erreichbar, falscher API-Key, oder API-Key fehlt in .env.local.`,
        original: err.message,
        cause: err.cause?.message || err.cause?.code || null,
      }
    });
  }
}

