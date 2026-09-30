// Eckblick AI – Service Worker
// Nimmt Fragen vom Content-Script über einen Port entgegen und streamt die
// Antwort von Claude zurück. Der API-Key verlässt nie den Extension-Kontext.

import Anthropic from "@anthropic-ai/sdk";

const DEFAULTS = {
  apiKey: "",
  model: "claude-opus-5-5",
  autoAsk: true,
  webSearch: false,
  language: "de",
  autoCopy: true,
  length: "short",
  minChars: 3,
  cornerDelay: 120,
};

const MODEL_INFO = {
  "claude-opus-5-5": { effort: true, fallbacks: true, webSearch: "web_search_20260209" },
  "claude-sonnet-5-5": { effort: true, fallbacks: true, webSearch: "web_search_20260209" },
  "claude-haiku-4-5": { effort: false, fallbacks: false, webSearch: "web_search_20250305" },
};

const LENGTH = {
  xs: { words: 40, multi: 60 },
  short: { words: 70, multi: 110 },
  long: { words: 160, multi: 220 },
};

function systemPrompt(language, page, length) {
  const len = LENGTH[length] ?? LENGTH.short;
  const lang =
    language === "en"
      ? "Schreibe auf Englisch."
      : language === "auto"
        ? "Schreibe in der Sprache der Frage. Bei deutschem oder unklarem Text schreibst du Deutsch nach deutscher Rechtschreibung (Deutschland, also mit ß)."
        : "Schreibe immer auf Deutsch nach deutscher Rechtschreibung (Deutschland, also mit ß und deutschen Anführungszeichen).";

  return `Du beantwortest Fragen, die jemand beim Lesen im Browser markiert. Deine Antwort wird automatisch in die Zwischenablage kopiert und direkt irgendwo eingefügt, zum Beispiel in eine Mail, ein Dokument oder einen Chat. Sie muss also ohne Nachbearbeitung passen.

So schreibst du:
Kurz, klar und sprachlich einfach, wie ein kluger Mensch, der es jemandem in einer Minute erklärt. Die Antwort steht im ersten Satz. Keine Einleitung, keine Wiederholung der Frage, kein Fazit, keine Rückfrage am Ende.

Länge, streng:
Höchstens ${len.words} Wörter. Bei einer Frage mit mehreren Teilfragen oder Aspekten höchstens ${len.multi} Wörter insgesamt.
Diese Grenze gilt immer, auch wenn die Frage lang, ausführlich oder „strukturiert“ formuliert ist oder viele Punkte aufzählt. Eine ausführliche Frage ist keine Bitte um eine lange Antwort.
Bei mehreren Teilfragen: ein kurzer Einleitungssatz mit dem Kern, dann pro Teilfrage genau eine Zeile im Format „- Stichwort: Aussage in ein bis zwei kurzen Sätzen“.
Lass Beispiele, Zahlen und Nebenaspekte weg, wenn sie für die Kernaussage nicht nötig sind. Lieber eine klare Aussage als drei halbe.
Nur wenn die Person danach ausdrücklich „ausführlicher“ oder „mehr Details“ schreibt, darfst du die Grenze verdoppeln.
Schlichter Text ohne Markdown: keine Überschriften, kein Fettdruck, keine Sternchen, keine Emojis, keine Nummerierungen. Meist reicht Fließtext, bei Bedarf in zwei oder drei kurze Absätze geteilt.
Wenn eine Aufzählung wirklich klarer ist, beginnt jede Zeile mit einem einfachen Bindestrich und einem Leerzeichen, genau so:
- erster Punkt
- zweiter Punkt
Nie andere Aufzählungszeichen wie • oder *.
Innerhalb von Sätzen keine Gedankenstriche (– oder —) und keine Bindestriche als Satzzeichen. Nutze stattdessen Punkt, Komma oder Doppelpunkt.
Kein typischer KI-Stil: keine Floskeln wie „Gerne“, „Kurz gesagt“, „Wichtig ist“, „Es ist erwähnenswert“, keine Übertreibungen, keine Füllwörter, keine Dreierlisten aus Gewohnheit.
${lang}

Was du lieferst, hängt vom markierten Text ab:
Eine Frage beantwortest du direkt.
Ein Begriff oder Name: was es ist und warum es hier eine Rolle spielt.
Fremdsprachiger Text: nur die Übersetzung, sonst nichts.
Code oder Fehlermeldung: Ursache und Lösung in einfachen Worten. Code nur, wenn er zur Lösung nötig ist, dann als reiner Codeblock.
Eine Behauptung oder Zahl: ob sie stimmt und warum.
Ein längerer Absatz: die Kernaussage in wenigen Sätzen.
Eine Rechnung: das Ergebnis mit einem Satz zur Erklärung.

Die Person liest gerade: "${page?.title ?? ""}" (${page?.url ?? ""})`;
}

async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

async function runQuery(port, msg) {
  const settings = await getSettings();
  if (!settings.apiKey) {
    port.postMessage({ type: "error", code: "no-key", text: "Kein API-Key hinterlegt." });
    return;
  }

  const info = MODEL_INFO[settings.model] ?? MODEL_INFO["claude-opus-5-5"];
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });

  const useWeb = msg.webSearch ?? settings.webSearch;
  const params = {
    model: settings.model,
    max_tokens: 8000,
    system: systemPrompt(settings.language, msg.page, settings.length),
    messages: msg.messages,
  };
  // Schnelle, knappe Antworten: niedrige Effort-Stufe (Haiku kennt kein effort).
  if (info.effort) params.output_config = { effort: "low" };
  if (info.fallbacks) {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }
  if (useWeb) params.tools = [{ type: info.webSearch, name: "web_search", max_uses: 3 }];

  const stream = client.beta.messages.stream(params);
  port.onDisconnect.addListener(() => stream.abort());

  const sources = new Map();
  stream.on("streamEvent", (event) => {
    if (event.type === "content_block_start") {
      const block = event.content_block;
      if (block.type === "server_tool_use") {
        port.postMessage({ type: "status", text: "Suche im Web…" });
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === "web_search_result" && !sources.has(r.url)) sources.set(r.url, r.title);
        }
        port.postMessage({ type: "status", text: "" });
      }
    }
  });
  stream.on("text", (delta) => port.postMessage({ type: "delta", text: delta }));

  const final = await stream.finalMessage();

  if (final.stop_reason === "refusal") {
    port.postMessage({
      type: "error",
      code: "refusal",
      text: "Diese Anfrage wurde abgelehnt." + (final.stop_details?.explanation ? ` (${final.stop_details.explanation})` : ""),
    });
    return;
  }

  port.postMessage({
    type: "done",
    content: final.content,
    truncated: final.stop_reason === "max_tokens",
    sources: [...sources].slice(0, 4).map(([url, title]) => ({ url, title })),
  });
}

function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return { code: "no-key", text: "API-Key ungültig." };
  if (err instanceof Anthropic.PermissionDeniedError) return { text: "Kein Zugriff auf dieses Modell mit diesem Key." };
  if (err instanceof Anthropic.RateLimitError) return { text: "Rate-Limit erreicht – kurz warten." };
  if (err instanceof Anthropic.BadRequestError) return { text: `Anfrage abgelehnt: ${err.message}` };
  if (err instanceof Anthropic.APIUserAbortError) return null;
  if (err instanceof Anthropic.APIConnectionError) return { text: "Keine Verbindung zur API." };
  if (err instanceof Anthropic.APIError) return { text: `API-Fehler ${err.status ?? ""}: ${err.message}` };
  return { text: String(err?.message ?? err) };
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "eckblick") return;
  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "ask") return;
    try {
      await runQuery(port, msg);
    } catch (err) {
      const e = describeError(err);
      if (e) {
        try {
          port.postMessage({ type: "error", ...e });
        } catch {
          // Port bereits geschlossen
        }
      }
    }
  });
});

// ---------- Zwischenablage ----------
// Service-Worker haben keinen Clipboard-Zugriff; ein Offscreen-Dokument
// kopiert zuverlässig, auch ohne Klick und ohne dass die Seite Fokus hat.
let offscreenReady = null;
function ensureOffscreen() {
  offscreenReady ??= (async () => {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["CLIPBOARD"],
      justification: "Antwort automatisch in die Zwischenablage kopieren",
    });
  })().catch((err) => {
    offscreenReady = null;
    throw err;
  });
  return offscreenReady;
}

async function copyToClipboard(text, tabId) {
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage({ target: "offscreen", type: "copy", text });
  if (!res?.ok) throw new Error("copy failed");
  if (tabId != null) {
    chrome.action.setBadgeBackgroundColor({ color: "#2f9e6b", tabId });
    chrome.action.setBadgeText({ text: "✓", tabId });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId }), 2500);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.target === "offscreen") return;
  if (msg?.type === "copy") {
    copyToClipboard(msg.text, sender.tab?.id)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg?.type === "open-options") chrome.runtime.openOptionsPage();
  if (msg?.type === "test-key") {
    const client = new Anthropic({ apiKey: msg.apiKey, dangerouslyAllowBrowser: true });
    client.models
      .retrieve(msg.model)
      .then((m) => sendResponse({ ok: true, text: `Verbunden – ${m.display_name ?? m.id} verfügbar.` }))
      .catch((err) => sendResponse({ ok: false, text: describeError(err)?.text ?? "Fehler" }));
    return true;
  }
  if (msg?.type === "get-settings") {
    getSettings().then(({ apiKey, ...rest }) => sendResponse({ ...rest, hasKey: Boolean(apiKey) }));
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  const target = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!target?.id) return;
  chrome.tabs.sendMessage(target.id, { type: command }).catch(() => {});
});

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "toggle-panel" }).catch(() => chrome.runtime.openOptionsPage());
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (reason === "install" && !apiKey) chrome.runtime.openOptionsPage();
});
