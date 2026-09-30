// Eckblick AI – Content-Script
// Läuft in jedem Frame. Erkennt Fragen (Markieren + ⌘C bzw. Markieren) und
// zeigt im obersten Frame das Panel samt Hot-Corner unten links.
(() => {
  // Eine ältere Instanz (z. B. nach einem Update der Erweiterung) räumt sich selbst ab.
  const ac = new AbortController();
  const teardown = [];
  document.dispatchEvent(new CustomEvent("eckblick:teardown"));
  document.addEventListener("eckblick:teardown", () => { ac.abort(); teardown.forEach((fn) => fn()); }, { signal: ac.signal });
  const on = (target, type, fn, opts = {}) =>
    target.addEventListener(type, fn, { ...(typeof opts === "boolean" ? { capture: opts } : opts), signal: ac.signal });
  const alive = () => { try { return Boolean(chrome.runtime?.id); } catch { return false; } };

  const isTop = window.top === window;
  const MAX_SELECTION = 8000;
  let settings = { trigger: "shortcut", showPanel: false, webSearch: false, minChars: 3, cornerDelay: 120, hasKey: true, model: "" };
  let hostEl = null; // Panel-Host (nur im obersten Frame)
  let lastSelection = "";

  // Frage weiterreichen: im obersten Frame direkt ans Panel, sonst über den Service-Worker.
  let onQuestion = (text, surrounding) => {
    if (alive()) chrome.runtime.sendMessage({ type: "frame-ask", text, surrounding }).catch(() => {});
  };

  // ---------- Erkennung ----------
  function inEditable(node) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    return Boolean(el?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
  }
  function surroundingText(sel) {
    if (sel.toString().length > 200) return "";
    const el = sel.anchorNode?.parentElement?.closest("p, li, td, dd, blockquote, h1, h2, h3, h4, article, section, div");
    const t = el?.innerText?.replace(/\s+/g, " ").trim() ?? "";
    if (!t || t.length <= sel.toString().trim().length + 10) return "";
    return t.length > 700 ? t.slice(0, 700) + " …" : t;
  }
  function deepActive() {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }
  // allowEditable: beim bewussten Kopieren auch Text aus Eingabefeldern nehmen
  function currentSelection({ allowEditable = false } = {}) {
    const ae = deepActive();
    if (allowEditable && ae && ae !== hostEl && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT")) {
      try {
        const t = ae.value.slice(ae.selectionStart, ae.selectionEnd).trim();
        if (t) return { text: t, surrounding: "" };
      } catch { /* Feldtyp ohne Auswahl */ }
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;
    const text = sel.toString().trim();
    if (!text || (!allowEditable && inEditable(sel.anchorNode))) return null;
    return { text, surrounding: surroundingText(sel) };
  }
  const fromPanel = (e) => hostEl && e.composedPath().includes(hostEl);

  // Auslöser 1 (Standard): markieren + ⌘C / Strg+C
  on(window, "copy", (e) => {
    if (settings.trigger !== "copy" || fromPanel(e)) return;
    const s = currentSelection({ allowEditable: true });
    if (!s || s.text.length < settings.minChars) return;
    lastSelection = s.text;
    setTimeout(() => onQuestion(s.text, s.surrounding), 0);
  }, true);

  // Auslöser 2 (optional): nur markieren, mit Maus oder Tastatur
  let pointerDown = false;
  let selectTimer = null;
  function checkSelection(suppress) {
    if (settings.trigger !== "select" || suppress) return;
    const s = currentSelection();
    if (!s || s.text.length < settings.minChars || s.text === lastSelection) return;
    lastSelection = s.text;
    onQuestion(s.text, s.surrounding);
  }
  on(window, "pointerdown", () => { pointerDown = true; }, true);
  on(window, "pointerup", (e) => {
    pointerDown = false;
    if (e.button !== 0 || fromPanel(e)) return;
    const suppress = e.altKey;
    clearTimeout(selectTimer);
    selectTimer = setTimeout(() => checkSelection(suppress), 220);
  }, true);
  on(document, "selectionchange", () => {
    const sel = window.getSelection();
    if (sel?.isCollapsed) { lastSelection = ""; return; }
    if (pointerDown || settings.trigger !== "select") return;
    clearTimeout(selectTimer); // Tastatur-Markierung (Shift+Pfeile, ⌘A): kurz warten bis sie steht
    selectTimer = setTimeout(() => checkSelection(false), 700);
  });

  // KI-Antwort am Cursor einfügen (in dem Frame, der gerade den Fokus hat)
  function insertIntoFocused(text) {
    if (!document.hasFocus()) return false;
    const el = deepActive();
    if (!el || el === hostEl || el.tagName === "IFRAME" || el.tagName === "FRAME") return false;
    const isField = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|search|email|url|tel|)$/i.test(el.type));
    if (!isField && !el.isContentEditable) return false;
    el.focus();
    if (document.execCommand("insertText", false, text)) return true;
    if (isField) {
      el.setRangeText(text, el.selectionStart, el.selectionEnd, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    // Rich-Text-Editoren: simuliertes Einfügen mit eigenem Inhalt.
    // Berührt die echte Zwischenablage nicht.
    try {
      const data = new DataTransfer();
      data.setData("text/plain", text);
      return !el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    } catch {
      return false;
    }
  }
  let onNoSelection = () => {};
  let onInsertFailed = () => {};

  if (alive()) chrome.runtime.onMessage.addListener((msg) => {
    if (ac.signal.aborted) return;
    if (msg.type === "ask-selection") {
      // Nur der Frame, in dem der Fokus gerade liegt (andere können alte Markierungen haben).
      if (!document.hasFocus() || /^I?FRAME$/.test(document.activeElement?.tagName ?? "")) return;
      const s = currentSelection({ allowEditable: true });
      if (s && s.text.length >= 1) { lastSelection = s.text; onQuestion(s.text, s.surrounding); }
      else if (isTop && !/^I?FRAME$/.test(document.activeElement?.tagName ?? "")) onNoSelection();
    } else if (msg.type === "insert-text") {
      const ok = insertIntoFocused(msg.text);
      if (!ok && isTop && !/^I?FRAME$/.test(document.activeElement?.tagName ?? "")) onInsertFailed(msg.text);
    }
  });

  function loadSettings(after) {
    if (!alive()) return;
    chrome.runtime.sendMessage({ type: "get-settings" }, (s) => {
      if (chrome.runtime.lastError || !s) return;
      settings = { ...settings, ...s };
      after?.();
    });
  }

  if (!isTop) {
    loadSettings();
    chrome.storage.onChanged.addListener(() => loadSettings());
    return;
  }

  // ======================= ab hier nur oberster Frame =======================
  const CORNER = 4; // px Abstand zur Ecke, der als "in der Ecke" gilt
  const HINT_RADIUS = 90; // ab hier leuchtet der Ecken-Hinweis auf
  let messages = []; // API-Verlauf der aktuellen Unterhaltung
  let port = null;
  let streaming = false;
  let pinned = false;
  let answerText = "";
  let hideTimer = null;
  let cornerTimer = null;
  let renderQueued = false;
  let hintVisible = false;
  let silentTurn = false;
  let peek = false; // per Ecke geöffnet, noch nichts gefragt → verschwindet beim Wegziehen

  // ---------- DOM ----------
  const host = document.createElement("eckblick-ai");
  host.style.cssText = "all:initial;position:fixed;left:0;bottom:0;z-index:2147483647;";
  const root = host.attachShadow({ mode: "closed" });
  hostEl = host;
  teardown.push(() => host.remove());

  const I = {
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M9 4h6l-1 6 4 4H6l4-4z"/><path d="M12 14v6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
  };

  root.innerHTML = `
<style>
:host { --bg: rgba(255,255,255,.62); --fg:#2b2d30; --faint:#8a8f94; --line:rgba(0,0,0,.05);
  --accent:#5f6368; --soft:rgba(0,0,0,.04); --code:rgba(0,0,0,.04);
  --shadow:0 4px 18px -8px rgba(0,0,0,.14); }
/* Farbe folgt der Webseite (nicht dem System): helle Seite → weiß, dunkle Seite → dunkel */
:host([data-theme="dark"]) { --bg: rgba(30,31,34,.6); --fg:#e8eaed; --faint:#9aa0a6; --line:rgba(255,255,255,.06);
  --accent:#dadce0; --soft:rgba(255,255,255,.06); --code:rgba(255,255,255,.06);
  --shadow:0 4px 18px -8px rgba(0,0,0,.45); }
* { box-sizing:border-box; }
svg { width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }

.hint { position:fixed; left:-40px; bottom:-40px; width:80px; height:80px; border-radius:50%;
  background: radial-gradient(circle, rgba(128,128,128,.45) 0%, rgba(128,128,128,.12) 45%, transparent 70%);
  opacity:0; pointer-events:none; transition: opacity .12s linear; }

.panel { position:fixed; left:10px; bottom:10px; width:min(340px, calc(100vw - 20px));
  max-height:min(62vh, 520px); display:flex; flex-direction:column;
  font: 12.5px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color:var(--fg);
  -webkit-font-smoothing:antialiased;
  background:var(--bg); backdrop-filter: blur(30px) saturate(1.2); -webkit-backdrop-filter: blur(30px) saturate(1.2);
  border:1px solid var(--line); border-radius:12px; box-shadow:var(--shadow);
  transform: translateY(6px); opacity:0; pointer-events:none;
  transition: transform .16s ease, opacity .14s ease; }
.panel.open { transform:none; opacity:1; pointer-events:auto; }
/* Bedienelemente nur bei Maus über dem Panel */
.panel:not(:hover) .tools, .panel:not(:hover) .chips, .panel:not(:hover) .copied { opacity:0; }
.chips, .copied { transition:opacity .15s; }
.panel:not(:hover) footer { border-top-color:transparent; }

header { display:flex; align-items:center; gap:2px; padding:6px 6px 2px 12px; }
.brand { display:flex; align-items:center; gap:6px; font-weight:400; font-size:10.5px; color:var(--faint); opacity:.8; flex:1; min-width:0; letter-spacing:.02em; }
.brand .dot { display:grid; place-items:center; }
.brand .dot svg { width:10px; height:10px; fill:currentColor; stroke:none; }
.brand .model { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.brand .model::before { content:"· "; }
.brand .model:empty { display:none; }
.tools { display:flex; gap:1px; transition:opacity .15s; }
button { all:unset; cursor:pointer; display:grid; place-items:center; width:24px; height:24px; border-radius:6px; color:var(--faint); transition: background .12s, color .12s; }
button:hover { background:var(--soft); color:var(--fg); }
button.on { color:var(--fg); background:var(--soft); }
button:focus-visible { outline:1px solid var(--accent); outline-offset:1px; }

.body { position:relative; overflow:auto; padding:2px 12px 8px; overscroll-behavior:contain; scrollbar-width:thin; }
.q { margin:2px 0 7px; padding:0 0 0 8px; border-left:2px solid var(--line);
  color:var(--faint); font-size:11.5px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:pre-wrap; word-break:break-word; }
.a { word-break:break-word; }
.a p { margin:0 0 .5em; } .a p:last-child { margin-bottom:0; }
.a ul, .a ol { margin:.2em 0 .5em; padding-left:1.2em; } .a li { margin:.1em 0; }
.a .li { margin:.1em 0; padding-left:.8em; text-indent:-.8em; }
.a h1,.a h2,.a h3 { font-size:12.5px; font-weight:600; margin:.6em 0 .2em; }
.a strong { font-weight:600; }
.a code { font: 11.5px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:var(--code); padding:.05em .3em; border-radius:4px; }
.a pre { background:var(--code); padding:7px 9px; border-radius:7px; overflow:auto; margin:.3em 0 .6em; }
.a pre code { background:none; padding:0; }
.a a { color:inherit; text-decoration:underline; text-decoration-color:var(--faint); }
.turn + .turn { margin-top:10px; padding-top:9px; border-top:1px solid var(--line); }
.caret::after { content:""; display:inline-block; width:5px; height:11px; margin-left:2px; vertical-align:-1px; background:var(--faint); border-radius:1px; animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity:0; } }
.status { color:var(--faint); font-size:11.5px; display:flex; align-items:center; gap:7px; }
.dots { display:inline-flex; gap:3px; } .dots i { width:4px; height:4px; border-radius:50%; background:var(--faint); animation: pulse 1s infinite ease-in-out; }
.dots i:nth-child(2){animation-delay:.15s} .dots i:nth-child(3){animation-delay:.3s}
@keyframes pulse { 0%,100% { opacity:.25; } 50% { opacity:1; } }
.copied { margin-top:6px; font-size:10.5px; color:var(--faint); }
.sources { margin-top:6px; display:flex; flex-wrap:wrap; gap:4px; }
.sources a, .sources span { font-size:10.5px; color:var(--faint); background:var(--soft); padding:1px 7px; border-radius:99px; text-decoration:none; max-width:170px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sources a:hover { color:var(--fg); }
.err { color:#c5503f; font-size:12px; }
.err button { display:inline-flex; width:auto; height:auto; padding:3px 9px; margin-top:6px; background:var(--soft); color:var(--fg); border-radius:6px; font-weight:500; font-size:11.5px; }

.chips { display:flex; gap:4px; padding:0 12px 6px; flex-wrap:wrap; }
.chips:empty { display:none; }
.chip { width:auto; height:auto; padding:1px 8px; border-radius:99px; font-size:11px; border:1px solid var(--line); color:var(--faint); }

footer { display:flex; align-items:flex-end; gap:4px; padding:5px 6px 5px 12px; border-top:1px solid var(--line); }
textarea { all:unset; display:block; flex:1; min-height:18px; max-height:100px; overflow:auto; font-family:inherit; font-size:12.5px; line-height:1.45; color:var(--fg); padding:3px 0; white-space:pre-wrap; word-break:break-word; }
textarea::placeholder { color:var(--faint); }
.send { color:var(--faint); }
.send:hover { color:var(--fg); }
.empty { color:var(--faint); font-size:11.5px; padding:2px 0 6px; line-height:1.6; }
kbd { font: 10px ui-monospace, monospace; border:1px solid var(--line); border-radius:3px; padding:0 3px; background:var(--soft); }
.toast { position:absolute; right:8px; top:-26px; background:rgba(32,33,36,.85); color:#fff; font-size:11px; padding:2px 8px; border-radius:6px; opacity:0; transition:opacity .15s; pointer-events:none; }
.toast.show { opacity:1; }
</style>
<div class="hint"></div>
<div class="panel" role="dialog" aria-label="Eckblick AI">
  <div class="toast"></div>
  <header>
    <div class="brand"><span class="dot">${I.spark}</span>Eckblick <span class="model"></span></div>
    <div class="tools">
      <button class="web" title="Websuche an/aus">${I.globe}</button>
      <button class="pin" title="Anheften (Panel bleibt offen)">${I.pin}</button>
      <button class="copy" title="Antwort kopieren">${I.copy}</button>
      <button class="opts" title="Einstellungen">${I.gear}</button>
      <button class="close" title="Schließen (Esc)">${I.close}</button>
    </div>
  </header>
  <div class="body"></div>
  <div class="chips"></div>
  <footer>
    <textarea rows="1" placeholder="Frage …"></textarea>
    <button class="send" title="Senden">${I.send}</button>
  </footer>
</div>`;

  const $ = (s) => root.querySelector(s);
  const panel = $(".panel");
  const hint = $(".hint");
  const body = $(".body");
  const chips = $(".chips");
  const input = $("textarea");
  const sendBtn = $(".send");
  const webBtn = $(".web");
  const pinBtn = $(".pin");
  const toast = $(".toast");

  document.documentElement.appendChild(host);

  // ---------- Markdown (klein & sicher) ----------
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function inline(s) {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
    s = esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
  }
  function md(src) {
    const out = [];
    const lines = src.split("\n");
    let list = null;
    let para = [];
    const flushPara = () => { if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; };
    const closeList = () => { if (list) out.push(`</${list}>`); list = null; };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*```/.test(line)) {
        flushPara(); closeList();
        const code = [];
        while (++i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i]);
        out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
        continue;
      }
      const h = line.match(/^(#{1,4})\s+(.*)/);
      const ul = line.match(/^\s*[-*•]\s+(.*)/);
      if (ul) {
        flushPara(); closeList();
        out.push(`<div class="li">- ${inline(ul[1])}</div>`);
        continue;
      }
      const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
      if (h) { flushPara(); closeList(); out.push(`<h3>${inline(h[2])}</h3>`); }
      else if (ul || ol) {
        flushPara();
        const type = ul ? "ul" : "ol";
        if (list !== type) { closeList(); out.push(`<${type}>`); list = type; }
        out.push(`<li>${inline((ul || ol)[1])}</li>`);
      } else if (!line.trim()) { flushPara(); closeList(); }
      else { closeList(); para.push(line); }
    }
    flushPara(); closeList();
    return out.join("");
  }

  // Gedankenstriche raus (Zahlenbereiche wie 1990–2000 bleiben), außer in Code.
  function clean(text) {
    if (text.includes("```")) return text;
    return text
      .replace(/\s+[–—]\s+/g, ", ")
      .replace(/(\S)—(\S)/g, "$1, $2")
      .replace(/(\S) - /g, "$1, ")
      .replace(/^(\s*)[•*]\s+/gm, "$1- ")
      .replace(/,\s*([.,;:!?])/g, "$1");
  }
  // Reiner Text für die Zwischenablage
  function plain(text) {
    return clean(text)
      .replace(/^\s*```.*$/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1$2")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,4}\s+/gm, "")
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 ($2)")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
  const PASTE_KEY = IS_MAC ? "⌘V" : "Strg+V";
  const ASK_KEY = IS_MAC ? "⌃C" : "Alt+Shift+C";
  const INSERT_KEY = IS_MAC ? "⌃V" : "Alt+Shift+V";

  // Nur per Klick auf das Kopieren-Symbol im Panel, nie automatisch.
  function copyAnswer() {
    const text = plain(answerText);
    if (!text) return;
    chrome.runtime.sendMessage({ type: "copy", text }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) flash("Kopieren fehlgeschlagen");
      else flash(`Kopiert. ${PASTE_KEY} zum Einfügen`);
    });
  }

  // ---------- Panel-Zustand ----------
  const isOpen = () => panel.classList.contains("open");

  // Hintergrundfarbe der Seite dort messen, wo das Panel erscheint
  function parseColor(c) {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  }
  function bgAt(x, y) {
    let el = document.elementsFromPoint(x, y).find((e) => e !== host && !host.contains(e));
    while (el && el.nodeType === 1) {
      const c = parseColor(getComputedStyle(el).backgroundColor);
      if (c && c.a > 0.5) return c;
      el = el.parentElement;
    }
    return null;
  }
  function pageTheme() {
    const h = window.innerHeight;
    const c = bgAt(40, h - 40) ?? bgAt(200, h - 150) ?? parseColor(getComputedStyle(document.body ?? document.documentElement).backgroundColor);
    if (!c || c.a <= 0.5) {
      // Kein Hintergrund gesetzt: Browser-Standard ist weiß, außer die Seite nutzt ihr dunkles Farbschema
      const dark = /dark/.test(getComputedStyle(document.documentElement).colorScheme) && matchMedia("(prefers-color-scheme: dark)").matches;
      return dark ? "dark" : "light";
    }
    const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    return lum < 128 ? "dark" : "light";
  }
  function open({ focus = false, viaCorner = false } = {}) {
    clearTimeout(hideTimer);
    hideTimer = null;
    peek = viaCorner;
    if (!isOpen()) {
      host.dataset.theme = pageTheme();
      panel.classList.add("open");
      hint.style.opacity = "0";
      hintVisible = false;
      if (!body.childElementCount) renderEmpty();
    }
    if (focus) setTimeout(() => input.focus({ preventScroll: true }), 30);
  }
  function close() {
    clearTimeout(hideTimer);
    hideTimer = null;
    peek = false;
    panel.classList.remove("open");
    input.blur();
  }
  function scheduleHide(ms = 650) {
    clearTimeout(hideTimer);
    if (pinned) return;
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (pinned || input.value.trim()) return;
      if (!peek && root.activeElement === input) return;
      close();
    }, ms);
  }
  function flash(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(flash.t);
    flash.t = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function renderEmpty() {
    body.innerHTML = settings.hasKey
      ? `<div class="empty">Text markieren und <kbd>${settings.trigger === "copy" ? PASTE_KEY.replace("V", "C") : ASK_KEY}</kbd> → Frage geht an die KI.<br><kbd>${INSERT_KEY}</kbd> fügt die Antwort am Cursor ein. Oder hier direkt fragen.</div>`
      : `<div class="err">Noch kein API-Key hinterlegt.<br><button class="setkey">API-Key eintragen</button></div>`;
    chips.innerHTML = "";
  }

  let currentTurn = null;
  function newTurn(label, kind) {
    if (body.querySelector(".empty, .err:only-child")) body.innerHTML = "";
    const turn = document.createElement("div");
    turn.className = "turn";
    turn.innerHTML = `<div class="q ${kind}"></div><div class="a"><div class="status"><span class="dots"><i></i><i></i><i></i></span><span class="st"></span></div></div>`;
    turn.querySelector(".q").textContent = label;
    body.appendChild(turn);
    currentTurn = turn;
    body.scrollTop = turn.offsetTop - 4;
    return turn;
  }

  function renderAnswer() {
    renderQueued = false;
    if (!currentTurn) return;
    const a = currentTurn.querySelector(".a");
    const nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
    a.innerHTML = md(clean(answerText));
    a.classList.toggle("caret", streaming);
    if (nearBottom) body.scrollTop = body.scrollHeight;
  }
  const queueRender = () => { if (!renderQueued) { renderQueued = true; requestAnimationFrame(renderAnswer); } };

  function setStreaming(on) {
    streaming = on;
    sendBtn.innerHTML = on ? I.stop : I.send;
    sendBtn.title = on ? "Stoppen" : "Senden";
  }

  const CHIPS = {
    "Kürzer": "Bitte noch kürzer, in ein bis zwei Sätzen.",
    "Einfacher": "Bitte einfacher erklären, ohne Fachwörter.",
    "Mehr Details": "Bitte etwas ausführlicher.",
  };
  function setChips() {
    chips.innerHTML = Object.keys(CHIPS).map((o) => `<button class="chip">${o}</button>`).join("");
  }

  // ---------- Anfrage ----------
  function stop() {
    if (port) { port.disconnect(); port = null; }
    if (streaming) {
      setStreaming(false);
      if (answerText) {
        messages.push({ role: "assistant", content: answerText + " …" });
        renderAnswer();
      } else {
        messages.pop();
        currentTurn?.querySelector(".a").replaceChildren();
      }
    }
  }

  function ask(userContent, label, { fresh = false, kind = "", silent = false } = {}) {
    stop();
    peek = false;
    if (fresh) { messages = []; body.innerHTML = ""; }
    messages.push({ role: "user", content: messages.length ? userContent : withPage(userContent) });
    answerText = "";
    chips.innerHTML = "";
    silentTurn = silent && !settings.showPanel;
    if (!silentTurn) open();
    newTurn(label, kind);
    setStreaming(true);

    let myPort;
    try {
      if (!alive()) throw new Error("invalidated");
      myPort = chrome.runtime.connect({ name: "eckblick" });
    } catch {
      setStreaming(false);
      messages.pop();
      currentTurn.querySelector(".a").innerHTML = `<div class="err">Eckblick wurde aktualisiert. Bitte diese Seite einmal neu laden.</div>`;
      return;
    }
    port = myPort;
    myPort.onMessage.addListener((m) => {
      if (port !== myPort) return;
      if (m.type === "delta") {
        answerText += m.text;
        queueRender();
      } else if (m.type === "first-user") {
        messages[0] = m.message; // inkl. Wissensbasis, bleibt für Folgefragen gleich
      } else if (m.type === "status") {
        const st = currentTurn?.querySelector(".st");
        if (st) st.textContent = m.text;
      } else if (m.type === "done") {
        setStreaming(false);
        messages.push({ role: "assistant", content: m.content });
        if (m.truncated) answerText += "\n\n*(gekürzt)*";
        renderAnswer();
        if (m.sources?.length) {
          const s = document.createElement("div");
          s.className = "sources";
          for (const src of m.sources) {
            if (!src.url) {
              const tag = document.createElement("span");
              tag.textContent = `📄 ${src.title}`;
              tag.title = src.title;
              s.appendChild(tag);
              continue;
            }
            const a = document.createElement("a");
            a.href = src.url; a.target = "_blank"; a.rel = "noopener noreferrer";
            try { a.textContent = src.title || new URL(src.url).hostname; } catch { a.textContent = src.url; }
            a.title = src.url;
            s.appendChild(a);
          }
          currentTurn.appendChild(s);
        }
        setChips();
        chrome.runtime.sendMessage({ type: "answer-ready" }, () => void chrome.runtime.lastError);
        const tag = document.createElement("div");
        tag.className = "copied";
        tag.textContent = `✓ Fertig. ${INSERT_KEY} fügt die Antwort am Cursor ein`;
        currentTurn.appendChild(tag);
        myPort.disconnect();
        port = null;
      } else if (m.type === "error") {
        setStreaming(false);
        messages.pop();
        const a = currentTurn.querySelector(".a");
        a.classList.remove("caret");
        a.innerHTML = `<div class="err">${esc(m.text)}${m.code === "no-key" ? '<br><button class="setkey">API-Key eintragen</button>' : ""}</div>`;
        if (!silentTurn) open(); // still gestellte Fragen: Fehler nur am Icon (!)
        myPort.disconnect();
        port = null;
      }
    });
    myPort.onDisconnect.addListener(() => {
      if (port === myPort && streaming) {
        setStreaming(false);
        port = null;
        messages.pop();
        currentTurn.querySelector(".a").innerHTML = `<div class="err">Verbindung zur Erweiterung unterbrochen – Seite neu laden.</div>`;
      }
    });
    myPort.postMessage({
      type: "ask",
      messages,
      webSearch: settings.webSearch,
    });
  }

  function askAbout(selection, surrounding) {
    const text = selection.length > MAX_SELECTION ? selection.slice(0, MAX_SELECTION) + " …" : selection;
    let content = `Markierter Text:\n"""\n${text}\n"""`;
    if (surrounding) content += `\n\nUmgebender Absatz (nur als Kontext):\n"""\n${surrounding}\n"""`;
    ask(content, selection, { fresh: true, silent: true });
  }

  // Seitenkontext gehört in die erste Frage (nicht in den System-Prompt), damit der Cache hält.
  const withPage = (text) => `${text}\n\n(Ich lese gerade: "${document.title.slice(0, 200)}", ${location.href.slice(0, 300)})`;

  function askTyped() {
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    autosize();
    ask(q, q, { kind: "user" });
  }

  onQuestion = askAbout;
  onNoSelection = () => {}; // ⌃C ohne Markierung: nichts tun
  // Kein Textfeld gefunden: nichts kopieren, nur dezent melden.
  onInsertFailed = () => {
    chrome.runtime.sendMessage({ type: "insert-failed" }, () => void chrome.runtime.lastError);
    if (isOpen()) flash("Kein Textfeld gefunden. Erst ins Feld klicken, dann " + INSERT_KEY);
  };

  // ⌃V: fertige Antwort sofort am Cursor einfügen, sonst nichts.
  function pasteAnswer() {
    // Nur sofortiges Einfügen: läuft die Antwort noch, passiert nichts (später erneut ⌃V).
    if (streaming) { if (isOpen()) flash("Antwort lädt noch. Nach dem ✓ nochmal " + INSERT_KEY); return; }
    const text = plain(answerText);
    if (!text) { if (isOpen()) flash("Noch keine Antwort"); return; }
    chrome.runtime.sendMessage({ type: "insert-answer", text }, () => void chrome.runtime.lastError);
  }

  // ---------- Hot-Corner ----------
  function inCorner(x, y) { return x <= CORNER && y >= window.innerHeight - CORNER; }
  function armCorner() {
    if (isOpen() || cornerTimer) return;
    cornerTimer = setTimeout(() => {
      cornerTimer = null;
      open({ focus: true, viaCorner: true });
    }, settings.cornerDelay);
  }
  function disarmCorner() { clearTimeout(cornerTimer); cornerTimer = null; }

  on(document, "mousemove", (e) => {
    const x = e.clientX, y = e.clientY;
    const dist = Math.hypot(x, window.innerHeight - y);
    lastX = x; lastY = y;
    // Panel nur mit gedrückter Control-Taste über die Ecke, sonst nie
    if (dist < HINT_RADIUS && !isOpen() && e.ctrlKey) {
      hint.style.opacity = String(Math.max(0, 1 - dist / HINT_RADIUS) * 0.9);
      hintVisible = true;
    } else if (hintVisible) {
      hint.style.opacity = "0";
      hintVisible = false;
    }
    if (inCorner(x, y) && e.ctrlKey) armCorner(); else disarmCorner();
    if (peek && isOpen() && !hideTimer) {
      const r = panel.getBoundingClientRect();
      const away = x > r.right + 60 || y < r.top - 60;
      if (away) scheduleHide(200);
    }
  }, { passive: true, capture: true });

  // Maus verlässt das Fenster genau in der Ecke (schneller Wisch)
  on(document, "mouseout", (e) => {
    if (e.ctrlKey && !e.relatedTarget && e.clientX <= 12 && e.clientY >= window.innerHeight - 12) armCorner();
  });
  // Control erst drücken, wenn die Maus schon in der Ecke ist
  let lastX = -1, lastY = -1;
  on(document, "keydown", (e) => {
    if (e.key === "Control" && !e.repeat && lastX >= 0 && lastX <= 12 && lastY >= window.innerHeight - 12) armCorner();
  }, true);
  on(document, "keyup", (e) => {
    if (e.key === "Control") { disarmCorner(); if (hintVisible) { hint.style.opacity = "0"; hintVisible = false; } }
  }, true);

  // ---------- Panel-Interaktion ----------
  panel.addEventListener("mouseenter", () => { clearTimeout(hideTimer); hideTimer = null; });
  panel.addEventListener("mouseleave", () => scheduleHide());

  on(document, "mousedown", (e) => {
    if (!isOpen() || pinned || e.composedPath().includes(host)) return;
    close();
  }, true);

  on(document, "keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      if (streaming) stop(); else close();
    }
  }, true);

  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 110) + "px";
  }
  input.addEventListener("input", () => { autosize(); if (input.value.trim()) peek = false; });
  input.addEventListener("keydown", (e) => {
    e.stopPropagation(); // Seiten-Shortcuts nicht auslösen
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); askTyped(); }
  });
  input.addEventListener("keyup", (e) => e.stopPropagation());
  input.addEventListener("keypress", (e) => e.stopPropagation());

  sendBtn.addEventListener("click", () => (streaming ? stop() : askTyped()));
  $(".close").addEventListener("click", close);
  $(".opts").addEventListener("click", () => chrome.runtime.sendMessage({ type: "open-options" }));
  pinBtn.addEventListener("click", () => {
    pinned = !pinned;
    pinBtn.classList.toggle("on", pinned);
    flash(pinned ? "Angeheftet" : "Lösen");
  });
  webBtn.addEventListener("click", () => {
    settings.webSearch = !settings.webSearch;
    webBtn.classList.toggle("on", settings.webSearch);
    chrome.storage.local.set({ webSearch: settings.webSearch });
    flash(settings.webSearch ? "Websuche an" : "Websuche aus");
  });
  $(".copy").addEventListener("click", () => copyAnswer());
  root.addEventListener("click", (e) => {
    const t = e.target.closest?.("button");
    if (!t) return;
    if (t.classList.contains("setkey")) chrome.runtime.sendMessage({ type: "open-options" });
    if (t.classList.contains("chip")) ask(CHIPS[t.textContent] ?? t.textContent, t.textContent, { kind: "user" });
  });

  // ---------- Befehle & Einstellungen ----------
  chrome.runtime.onMessage.addListener((msg) => {
    if (ac.signal.aborted) return;
    if (msg.type === "toggle-panel") {
      if (isOpen()) close(); else open({ focus: true });
    } else if (msg.type === "ask-text") {
      askAbout(msg.text, msg.surrounding);
    } else if (msg.type === "paste-answer") {
      pasteAnswer();
    }
  });

  const refreshSettings = () => loadSettings(() => {
    webBtn.classList.toggle("on", Boolean(settings.webSearch));
    // Kein Modellname, nur dezent die Zahl aktiver Dokumente
    $(".model").textContent = settings.docCount ? `${settings.docCount} Dok.` : "";
    if (!messages.length && !streaming) renderEmpty();
  });
  refreshSettings();
  chrome.storage.onChanged.addListener(refreshSettings);
})();
