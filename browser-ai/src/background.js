// Eckblick AI – Service Worker
// Nimmt Fragen vom Content-Script über einen Port entgegen und streamt die
// Antwort von Claude zurück. Der API-Key verlässt nie den Extension-Kontext.

import Anthropic from "@anthropic-ai/sdk";

const DEFAULTS = {
  apiKey: "",
  model: "claude-sonnet-5-5",
  trigger: "shortcut",
  webSearch: false,
  language: "de",
  showPanel: false,
  minChars: 3,
  cornerDelay: 120,
};

const MODEL_INFO = {
  "claude-opus-5-5": { effort: true, fallbacks: true, webSearch: "web_search_20260209" },
  "claude-sonnet-5-5": { effort: true, fallbacks: true, webSearch: "web_search_20260209" },
  "claude-haiku-4-5": { effort: false, fallbacks: false, webSearch: "web_search_20250305" },
};

// Bleibt pro Einstellung gleich, damit der Prompt-Cache (inkl. Wissensbasis) greift.
function systemPrompt(language, hasDocs) {
  const lang =
    language === "en"
      ? "Schreibe auf Englisch."
      : language === "auto"
        ? "Schreibe in der Sprache der Frage. Bei deutschem oder unklarem Text schreibst du Deutsch nach deutscher Rechtschreibung (Deutschland, also mit ß)."
        : "Schreibe immer auf Deutsch nach deutscher Rechtschreibung (Deutschland, also mit ß und deutschen Anführungszeichen).";

  return `Du beantwortest Fragen, die jemand beim Lesen im Browser markiert. Deine Antwort wird direkt irgendwo eingefügt, zum Beispiel in eine Mail, ein Dokument oder einen Chat. Sie muss also ohne Nachbearbeitung passen.

So schreibst du:
Knapp und einfach, wie eine Notiz unter Kollegen. Kurze Hauptsätze, keine verschachtelten Nebensätze, keine Fachsprache, wo ein einfaches Wort reicht. Lieber Stichworte als ganze Sätze.
Keine Einleitung, keine Wiederholung der Frage, kein Fazit, keine Rückfrage am Ende.

Länge und Aufbau:
So kurz wie möglich. Ziel sind etwa 150 bis 300 Zeichen, auch bei komplexen Fragen höchstens etwa 500 Zeichen. Eine ausführliche oder „strukturiert“ formulierte Frage ist keine Bitte um eine lange Antwort.
Aufbau: ein kurzer Satz mit dem Kern. Wenn nötig, danach zwei bis vier Stichpunkte, jeweils eine Zeile im Format „- Stichwort: wenige Worte“.
Nur beantworten, was gefragt ist. Keine Zusatzthemen wie Kritik, Geschichte, Hintergrund, Ausnahmen oder Beispiele, wenn nicht danach gefragt wurde.
Nur wenn die Person danach ausdrücklich „ausführlicher“ oder „mehr Details“ schreibt, darfst du länger werden.

Form:
Schlichter Text ohne Markdown: keine Überschriften, kein Fettdruck, keine Sternchen, keine Emojis, keine Nummerierungen.
Stichpunkte beginnen immer mit einem einfachen Bindestrich und einem Leerzeichen, genau so:
- Stichwort: kurze Aussage
- Stichwort: kurze Aussage
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
Eine Rechnung: das Ergebnis mit einem Satz zur Erklärung.${
    hasDocs
      ? `

Wissensbasis:
Am Anfang der Unterhaltung liegen Dokumente der Person bei (Präsentationen, Zusammenfassungen, Unterlagen). Wenn sie zur Frage etwas enthalten, stützt du dich zuerst darauf und übernimmst deren Begriffe und Sichtweise. Nur was dort fehlt, ergänzt du aus deinem Wissen. Nenne die Quelle nicht im Text, sie wird separat angezeigt.`
      : ""
  }`;
}

// Aktive Dokumente der Wissensbasis als Content-Blöcke (mit Quellenangaben und
// 1-Stunden-Cache, damit Folgefragen günstig und schnell sind).
async function knowledgeBlocks() {
  const { docs = [] } = await chrome.storage.local.get("docs");
  const blocks = docs
    .filter((d) => d.enabled)
    .map((d) => ({
      type: "document",
      source: { type: "file", file_id: d.fileId },
      title: d.name,
      citations: { enabled: true },
    }));
  if (blocks.length) blocks.at(-1).cache_control = { type: "ephemeral", ttl: "1h" };
  return blocks;
}

function citationLabel(c) {
  const title = c.document_title ?? "Dokument";
  if (c.type === "page_location") {
    const from = c.start_page_number;
    const to = c.end_page_number - 1;
    return to > from ? `${title}, S. ${from}–${to}` : `${title}, S. ${from}`;
  }
  return title;
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

  const info = MODEL_INFO[settings.model] ?? MODEL_INFO["claude-sonnet-5-5"];
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });

  // Neue Unterhaltung: Wissensbasis vor die erste Frage hängen. Das Content-Script
  // übernimmt diese erste Nachricht, damit der Verlauf danach unverändert bleibt.
  const messages = msg.messages;
  let hasDocs = messages[0]?.content?.[0]?.type === "document";
  if (messages.length === 1 && typeof messages[0].content === "string") {
    const docs = await knowledgeBlocks();
    if (docs.length) {
      messages[0] = { role: "user", content: [...docs, { type: "text", text: messages[0].content }] };
      port.postMessage({ type: "first-user", message: messages[0] });
      hasDocs = true;
    }
  }

  const useWeb = msg.webSearch ?? settings.webSearch;
  const params = {
    model: settings.model,
    max_tokens: 8000,
    system: systemPrompt(settings.language, hasDocs),
    messages,
  };
  // Schnelle, knappe Antworten: niedrige Effort-Stufe (Haiku kennt kein effort).
  if (info.effort) params.output_config = { effort: "low" };
  if (info.fallbacks) {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }
  if (useWeb) params.tools = [{ type: info.webSearch, name: "web_search", max_uses: 3 }];

  setBadge(port.sender?.tab?.id, "…", "#80868b");
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

  // Quellen aus der Wissensbasis (Zitate) und aus der Websuche
  const docSources = new Set();
  for (const block of final.content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const c of block.citations) {
      if (c.type === "page_location" || c.type === "char_location" || c.type === "content_block_location") {
        docSources.add(citationLabel(c));
      }
    }
  }

  port.postMessage({
    type: "done",
    content: final.content,
    truncated: final.stop_reason === "max_tokens",
    sources: [
      ...[...docSources].slice(0, 4).map((title) => ({ title })),
      ...[...sources].slice(0, 4).map(([url, title]) => ({ url, title })),
    ],
  });
}

function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return { code: "no-key", text: "API-Key ungültig." };
  if (err instanceof Anthropic.PermissionDeniedError) return { text: "Kein Zugriff auf dieses Modell mit diesem Key." };
  if (err instanceof Anthropic.RateLimitError) return { text: "Rate-Limit erreicht – kurz warten." };
  if ((err instanceof Anthropic.NotFoundError || err instanceof Anthropic.BadRequestError) && /file/i.test(err.message)) {
    return { text: "Ein Dokument der Wissensbasis ist nicht mehr verfügbar. Bitte in den Einstellungen entfernen und neu hochladen." };
  }
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
      if (e) setBadge(port.sender?.tab?.id, "!", "#c5503f", 6000);
      else setBadge(port.sender?.tab?.id, "");
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
  if (tabId != null) showBadge(tabId);
}

// Dezente Rückmeldung am Erweiterungs-Icon: … = arbeitet, ✓ = fertig, ! = Fehler
const badgeTimers = new Map();
function setBadge(tabId, text, color, clearAfter) {
  if (tabId == null) return;
  clearTimeout(badgeTimers.get(tabId));
  if (color) chrome.action.setBadgeBackgroundColor({ color, tabId }).catch(() => {});
  chrome.action.setBadgeText({ text, tabId }).catch(() => {});
  if (clearAfter) badgeTimers.set(tabId, setTimeout(() => chrome.action.setBadgeText({ text: "", tabId }).catch(() => {}), clearAfter));
}
const showBadge = (tabId) => setBadge(tabId, "✓", "#2f8a5b", 4000);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.target === "offscreen") return;
  if (msg?.type === "copy") {
    copyToClipboard(msg.text, sender.tab?.id)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  const tabId = sender.tab?.id;
  if (msg?.type === "frame-ask" && tabId != null) {
    chrome.tabs.sendMessage(tabId, { type: "ask-text", text: msg.text, surrounding: msg.surrounding }, { frameId: 0 }).catch(() => {});
  }
  if (msg?.type === "insert-answer" && tabId != null) {
    chrome.tabs.sendMessage(tabId, { type: "insert-text", text: msg.text }).catch(() => {});
  }
  if (msg?.type === "answer-ready" && tabId != null) showBadge(tabId);
  if (msg?.type === "insert-failed" && tabId != null) setBadge(tabId, "?", "#80868b", 3000);
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
    Promise.all([getSettings(), chrome.storage.local.get("docs")]).then(([{ apiKey, ...rest }, { docs = [] }]) =>
      sendResponse({ ...rest, hasKey: Boolean(apiKey), docCount: docs.filter((d) => d.enabled).length }),
    );
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  const target = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!target?.id) return;
  // ask-selection geht an alle Frames (die Markierung kann in einem iframe liegen),
  // Panel-Befehle nur an den obersten Frame.
  const opts = command === "ask-selection" ? {} : { frameId: 0 };
  chrome.tabs.sendMessage(target.id, { type: command }, opts).catch(() => {});
});

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "toggle-panel" }).catch(() => chrome.runtime.openOptionsPage());
});

// Nach Installation oder Update das Content-Script in alle offenen Tabs laden,
// sonst reagieren bereits offene Seiten erst nach einem Neuladen.
async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*", "file:///*"] });
  await Promise.all(
    tabs.map((tab) =>
      chrome.scripting
        .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["content.js"] })
        .catch(() => {}),
    ),
  );
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  injectIntoOpenTabs();
  chrome.storage.local.remove("autoCopy"); // automatisches Kopieren gibt es nicht mehr
  // Einmalig: Standardmodell ist jetzt Sonnet 5.5 (auch wenn vorher Opus gespeichert war)
  const { model, modelMigrated } = await chrome.storage.local.get(["model", "modelMigrated"]);
  if (!modelMigrated) {
    if (model === "claude-opus-5-5") await chrome.storage.local.set({ model: "claude-sonnet-5-5" });
    await chrome.storage.local.set({ modelMigrated: true });
  }
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (reason === "install" && !apiKey) chrome.runtime.openOptionsPage();
});
