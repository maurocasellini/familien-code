// Eckblick AI – Service Worker
// Nimmt Fragen vom Content-Script über einen Port entgegen und streamt die
// Antwort von Claude zurück. Der API-Key verlässt nie den Extension-Kontext.

import Anthropic from "@anthropic-ai/sdk";

const DEFAULTS = {
  apiKey: "",
  model: "claude-opus-5-5",
  autoAsk: true,
  webSearch: false,
  language: "auto",
  minChars: 3,
  cornerDelay: 120,
};

const MODEL_INFO = {
  "claude-opus-5-5": { effort: true, fallbacks: true, webSearch: "web_search_20260209" },
  "claude-sonnet-5-5": { effort: true, fallbacks: true, webSearch: "web_search_20260209" },
  "claude-haiku-4-5": { effort: false, fallbacks: false, webSearch: "web_search_20250305" },
};

function systemPrompt(language, page) {
  const lang =
    language === "de"
      ? "Antworte immer auf Deutsch."
      : language === "en"
        ? "Always answer in English."
        : "Antworte in der Sprache der Frage; bei reinem Markierungstext ohne Frage auf Deutsch.";

  return `Du bist ein Sofort-Assistent, der in einem kleinen Panel in der Bildschirmecke des Browsers erscheint. Der Nutzer liest gerade eine Webseite und will in Sekunden verstehen, nicht lesen.

Stil:
- Kernaussage im ersten Satz. Keine Einleitung, keine Wiederholung der Frage, keine Floskeln, kein Nachfragen am Ende.
- Standardlänge: 40–120 Wörter. Länger nur, wenn der Nutzer ausdrücklich Details verlangt.
- Markdown sparsam: **fett** für Schlüsselbegriffe, kurze Bullet-Listen wenn sie das Scannen erleichtern, \`code\` für Code. Keine Tabellen, keine Überschriften über ###.
- ${lang}

Wenn nur markierter Text ohne explizite Frage kommt, erkenne die Absicht:
- Einzelner Begriff/Name → was es ist + warum es hier relevant ist.
- Fremdsprachiger Text → Übersetzung + ggf. Nuance.
- Code / Fehlermeldung → was es tut bzw. Ursache + Fix.
- Behauptung / Zahl → kurze Einordnung, ob plausibel, mit Begründung.
- Längerer Absatz → Kernaussage in 2–3 Bullets.
- Mathe / Formel → Ergebnis bzw. Bedeutung.

Kontext – aktuelle Seite: "${page?.title ?? ""}" (${page?.url ?? ""})`;
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
    system: systemPrompt(settings.language, msg.page),
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
