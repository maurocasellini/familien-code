// Eckblick AI – Content-Script
// Hot-Corner unten links, Auto-Frage bei Textmarkierung, Panel im Shadow-DOM.
(() => {
  if (window.top !== window || window.__eckblick) return;
  window.__eckblick = true;

  const CORNER = 4; // px Abstand zur Ecke, der als "in der Ecke" gilt
  const HINT_RADIUS = 90; // ab hier leuchtet der Ecken-Hinweis auf
  const MAX_SELECTION = 8000;

  let settings = { autoAsk: true, webSearch: false, minChars: 3, cornerDelay: 120, hasKey: true, model: "" };
  let messages = []; // API-Verlauf der aktuellen Unterhaltung
  let port = null;
  let streaming = false;
  let pinned = false;
  let lastSelection = "";
  let answerText = "";
  let hideTimer = null;
  let cornerTimer = null;
  let renderQueued = false;
  let hintVisible = false;
  let selectTimer = null;
  let peek = false; // per Ecke geöffnet, noch nichts gefragt → verschwindet beim Wegziehen

  // ---------- DOM ----------
  const host = document.createElement("eckblick-ai");
  host.style.cssText = "all:initial;position:fixed;left:0;bottom:0;z-index:2147483647;";
  const root = host.attachShadow({ mode: "closed" });

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
:host { --bg: rgba(255,255,255,.93); --fg:#1b1d22; --muted:#6b7080; --line:rgba(20,24,40,.09);
  --accent:#d97757; --accent-soft:rgba(217,119,87,.13); --quote:rgba(20,24,40,.045); --code:rgba(20,24,40,.06);
  --shadow:0 18px 50px -12px rgba(15,20,40,.35), 0 2px 8px rgba(15,20,40,.08); }
@media (prefers-color-scheme: dark) {
  :host { --bg: rgba(28,29,34,.93); --fg:#ecedf0; --muted:#9a9eab; --line:rgba(255,255,255,.08);
    --accent:#e58b6b; --accent-soft:rgba(229,139,107,.16); --quote:rgba(255,255,255,.05); --code:rgba(255,255,255,.08);
    --shadow:0 18px 50px -12px rgba(0,0,0,.7), 0 2px 8px rgba(0,0,0,.3); }
}
* { box-sizing:border-box; }
svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }

.hint { position:fixed; left:-60px; bottom:-60px; width:120px; height:120px; border-radius:50%;
  background: radial-gradient(circle, var(--accent) 0%, rgba(217,119,87,.25) 35%, transparent 68%);
  opacity:0; pointer-events:none; transition: opacity .12s linear; }

.panel { position:fixed; left:12px; bottom:12px; width:min(410px, calc(100vw - 24px));
  max-height:min(72vh, 600px); display:flex; flex-direction:column;
  font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--fg);
  background:var(--bg); backdrop-filter: blur(22px) saturate(1.6); -webkit-backdrop-filter: blur(22px) saturate(1.6);
  border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow);
  transform-origin: bottom left; transform: translate(-8px, 8px) scale(.94); opacity:0; pointer-events:none;
  transition: transform .18s cubic-bezier(.2,.9,.3,1.2), opacity .14s ease; }
.panel.open { transform:none; opacity:1; pointer-events:auto; }

header { display:flex; align-items:center; gap:6px; padding:9px 10px 7px 13px; }
.brand { display:flex; align-items:center; gap:7px; font-weight:650; font-size:13px; letter-spacing:.01em; flex:1; min-width:0; }
.brand .dot { width:20px; height:20px; border-radius:6px; display:grid; place-items:center; color:#fff;
  background: linear-gradient(135deg, #e58b6b, #c9623f); }
.brand .dot svg { width:12px; height:12px; fill:#fff; stroke:none; }
.brand .model { font-weight:500; color:var(--muted); font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
button { all:unset; cursor:pointer; display:grid; place-items:center; width:28px; height:28px; border-radius:8px; color:var(--muted); transition: background .12s, color .12s; }
button:hover { background:var(--quote); color:var(--fg); }
button.on { color:var(--accent); background:var(--accent-soft); }
button:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }

.body { position:relative; overflow:auto; padding:2px 15px 10px; overscroll-behavior:contain; scrollbar-width:thin; }
.q { margin:2px 0 10px; padding:7px 10px; border-left:3px solid var(--accent); background:var(--quote); border-radius:0 8px 8px 0;
  color:var(--muted); font-size:12.5px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; white-space:pre-wrap; word-break:break-word; }
.q.user { border-left-color:var(--muted); }
.a { word-break:break-word; }
.a p { margin:0 0 .6em; } .a p:last-child { margin-bottom:0; }
.a ul, .a ol { margin:.2em 0 .6em; padding-left:1.25em; } .a li { margin:.15em 0; }
.a h1,.a h2,.a h3 { font-size:14px; margin:.7em 0 .3em; }
.a strong { font-weight:650; }
.a code { font: 12.5px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:var(--code); padding:.1em .35em; border-radius:5px; }
.a pre { background:var(--code); padding:9px 11px; border-radius:9px; overflow:auto; margin:.3em 0 .7em; }
.a pre code { background:none; padding:0; }
.a a { color:var(--accent); text-decoration:none; } .a a:hover { text-decoration:underline; }
.turn + .turn { margin-top:14px; padding-top:12px; border-top:1px solid var(--line); }
.caret::after { content:""; display:inline-block; width:7px; height:14px; margin-left:2px; vertical-align:-2px; background:var(--accent); border-radius:2px; animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity:0; } }
.status { color:var(--muted); font-size:12.5px; display:flex; align-items:center; gap:8px; }
.dots { display:inline-flex; gap:4px; } .dots i { width:6px; height:6px; border-radius:50%; background:var(--accent); animation: pulse 1s infinite ease-in-out; }
.dots i:nth-child(2){animation-delay:.15s} .dots i:nth-child(3){animation-delay:.3s}
@keyframes pulse { 0%,100% { opacity:.25; transform:scale(.8);} 50% { opacity:1; transform:none; } }
.sources { margin-top:8px; display:flex; flex-wrap:wrap; gap:5px; }
.sources a { font-size:11.5px; color:var(--muted); background:var(--quote); padding:2px 8px; border-radius:99px; text-decoration:none; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sources a:hover { color:var(--fg); }
.err { color:#d4493b; font-size:13px; }
.err button { display:inline-flex; width:auto; height:auto; padding:4px 10px; margin-top:6px; background:var(--accent); color:#fff; border-radius:8px; font-weight:600; font-size:12.5px; }

.chips { display:flex; gap:6px; padding:0 13px 8px; flex-wrap:wrap; }
.chips:empty { display:none; }
.chip { width:auto; height:auto; padding:3px 10px; border-radius:99px; font-size:12px; border:1px solid var(--line); color:var(--muted); }

footer { display:flex; align-items:flex-end; gap:6px; padding:8px 8px 8px 13px; border-top:1px solid var(--line); }
textarea { all:unset; display:block; flex:1; min-height:20px; max-height:110px; overflow:auto; font-family:inherit; font-size:14px; line-height:1.45; color:var(--fg); padding:4px 0; white-space:pre-wrap; word-break:break-word; }
textarea::placeholder { color:var(--muted); }
.send { background:var(--accent); color:#fff; }
.send:hover { background:var(--accent); color:#fff; filter:brightness(1.08); }
.empty { color:var(--muted); font-size:12.5px; padding:4px 0 8px; }
kbd { font: 11px ui-monospace, monospace; border:1px solid var(--line); border-bottom-width:2px; border-radius:4px; padding:0 4px; }
.toast { position:absolute; right:12px; top:-30px; background:var(--fg); color:var(--bg); font-size:12px; padding:3px 9px; border-radius:7px; opacity:0; transition:opacity .15s; pointer-events:none; }
.toast.show { opacity:1; }
</style>
<div class="hint"></div>
<div class="panel" role="dialog" aria-label="Eckblick AI">
  <div class="toast"></div>
  <header>
    <div class="brand"><span class="dot">${I.spark}</span>Eckblick <span class="model"></span></div>
    <button class="web" title="Websuche an/aus">${I.globe}</button>
    <button class="pin" title="Anheften (Panel bleibt offen)">${I.pin}</button>
    <button class="copy" title="Antwort kopieren">${I.copy}</button>
    <button class="opts" title="Einstellungen">${I.gear}</button>
    <button class="close" title="Schließen (Esc)">${I.close}</button>
  </header>
  <div class="body"></div>
  <div class="chips"></div>
  <footer>
    <textarea rows="1" placeholder="Frag etwas …  (Enter)"></textarea>
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

  // ---------- Panel-Zustand ----------
  const isOpen = () => panel.classList.contains("open");
  function open({ focus = false, viaCorner = false } = {}) {
    clearTimeout(hideTimer);
    hideTimer = null;
    peek = viaCorner;
    if (!isOpen()) {
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
    setTimeout(() => toast.classList.remove("show"), 1100);
  }

  function renderEmpty() {
    body.innerHTML = settings.hasKey
      ? `<div class="empty">Text auf der Seite markieren → Antwort erscheint hier.<br>Oder direkt fragen. <kbd>Esc</kbd> schließt, <kbd>Alt</kbd> beim Markieren unterdrückt die Auto-Frage.</div>`
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
    a.innerHTML = md(answerText);
    a.classList.toggle("caret", streaming);
    if (nearBottom) body.scrollTop = body.scrollHeight;
  }
  const queueRender = () => { if (!renderQueued) { renderQueued = true; requestAnimationFrame(renderAnswer); } };

  function setStreaming(on) {
    streaming = on;
    sendBtn.innerHTML = on ? I.stop : I.send;
    sendBtn.title = on ? "Stoppen" : "Senden";
  }

  function setChips() {
    const opts = ["Mehr Details", "Einfacher erklären", "Beispiel"];
    chips.innerHTML = opts.map((o) => `<button class="chip">${o}</button>`).join("");
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

  function ask(userContent, label, { fresh = false, kind = "" } = {}) {
    stop();
    peek = false;
    if (fresh) { messages = []; body.innerHTML = ""; }
    messages.push({ role: "user", content: userContent });
    answerText = "";
    chips.innerHTML = "";
    open();
    newTurn(label, kind);
    setStreaming(true);

    const myPort = chrome.runtime.connect({ name: "eckblick" });
    port = myPort;
    myPort.onMessage.addListener((m) => {
      if (port !== myPort) return;
      if (m.type === "delta") {
        answerText += m.text;
        queueRender();
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
            const a = document.createElement("a");
            a.href = src.url; a.target = "_blank"; a.rel = "noopener noreferrer";
            try { a.textContent = src.title || new URL(src.url).hostname; } catch { a.textContent = src.url; }
            a.title = src.url;
            s.appendChild(a);
          }
          currentTurn.appendChild(s);
        }
        setChips();
        myPort.disconnect();
        port = null;
      } else if (m.type === "error") {
        setStreaming(false);
        messages.pop();
        const a = currentTurn.querySelector(".a");
        a.classList.remove("caret");
        a.innerHTML = `<div class="err">${esc(m.text)}${m.code === "no-key" ? '<br><button class="setkey">API-Key eintragen</button>' : ""}</div>`;
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
      page: { title: document.title.slice(0, 200), url: location.href.slice(0, 500) },
    });
  }

  function askAbout(selection, surrounding) {
    const text = selection.length > MAX_SELECTION ? selection.slice(0, MAX_SELECTION) + " …" : selection;
    let content = `Markierter Text:\n"""\n${text}\n"""`;
    if (surrounding) content += `\n\nUmgebender Absatz (nur als Kontext):\n"""\n${surrounding}\n"""`;
    ask(content, selection, { fresh: true });
  }

  function askTyped() {
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    autosize();
    ask(q, q, { kind: "user" });
  }

  // ---------- Markierung ----------
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
  function currentSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;
    const text = sel.toString().trim();
    if (!text || inEditable(sel.anchorNode)) return null;
    return { text, surrounding: surroundingText(sel) };
  }

  document.addEventListener("mouseup", (e) => {
    if (e.button !== 0 || e.composedPath().includes(host)) return;
    const suppress = e.altKey;
    clearTimeout(selectTimer);
    selectTimer = setTimeout(() => {
      if (!settings.autoAsk || suppress) return;
      const s = currentSelection();
      if (!s || s.text.length < settings.minChars || s.text === lastSelection) return;
      lastSelection = s.text;
      askAbout(s.text, s.surrounding);
    }, 220);
  }, true);

  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (sel?.isCollapsed) lastSelection = "";
  });

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

  document.addEventListener("mousemove", (e) => {
    const x = e.clientX, y = e.clientY;
    const dist = Math.hypot(x, window.innerHeight - y);
    if (dist < HINT_RADIUS && !isOpen()) {
      hint.style.opacity = String(Math.max(0, 1 - dist / HINT_RADIUS) * 0.9);
      hintVisible = true;
    } else if (hintVisible) {
      hint.style.opacity = "0";
      hintVisible = false;
    }
    if (inCorner(x, y)) armCorner(); else disarmCorner();
    if (peek && isOpen() && !hideTimer) {
      const r = panel.getBoundingClientRect();
      const away = x > r.right + 60 || y < r.top - 60;
      if (away) scheduleHide(200);
    }
  }, { passive: true, capture: true });

  // Maus verlässt das Fenster genau in der Ecke (schneller Wisch)
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget && e.clientX <= 12 && e.clientY >= window.innerHeight - 12) armCorner();
  });

  // ---------- Panel-Interaktion ----------
  panel.addEventListener("mouseenter", () => { clearTimeout(hideTimer); hideTimer = null; });
  panel.addEventListener("mouseleave", () => scheduleHide());

  document.addEventListener("mousedown", (e) => {
    if (!isOpen() || pinned || e.composedPath().includes(host)) return;
    close();
  }, true);

  document.addEventListener("keydown", (e) => {
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
  $(".copy").addEventListener("click", async () => {
    if (!answerText) return;
    try { await navigator.clipboard.writeText(answerText); flash("Kopiert"); } catch { flash("Kopieren nicht erlaubt"); }
  });
  root.addEventListener("click", (e) => {
    const t = e.target.closest?.("button");
    if (!t) return;
    if (t.classList.contains("setkey")) chrome.runtime.sendMessage({ type: "open-options" });
    if (t.classList.contains("chip")) ask(t.textContent, t.textContent, { kind: "user" });
  });

  // ---------- Befehle & Einstellungen ----------
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "toggle-panel") {
      if (isOpen()) close(); else open({ focus: true });
    } else if (msg.type === "ask-selection") {
      const s = currentSelection();
      if (s) { lastSelection = s.text; askAbout(s.text, s.surrounding); }
      else open({ focus: true });
    }
  });

  const MODEL_LABEL = { "claude-opus-5-5": "Opus 5.5", "claude-sonnet-5-5": "Sonnet 5.5", "claude-haiku-4-5": "Haiku 4.5" };
  function loadSettings() {
    chrome.runtime.sendMessage({ type: "get-settings" }, (s) => {
      if (chrome.runtime.lastError || !s) return;
      settings = { ...settings, ...s };
      webBtn.classList.toggle("on", Boolean(settings.webSearch));
      $(".model").textContent = MODEL_LABEL[settings.model] ?? settings.model;
      if (!messages.length && !streaming) renderEmpty();
    });
  }
  loadSettings();
  chrome.storage.onChanged.addListener(loadSettings);
})();
