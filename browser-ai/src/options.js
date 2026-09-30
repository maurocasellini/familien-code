// Eckblick AI – Einstellungsseite inkl. Wissensbasis
// Wird nach extension/options.js gebündelt (npm run build).

import Anthropic from "@anthropic-ai/sdk";

const DEFAULTS = {
  apiKey: "",
  model: "claude-opus-5-5",
  trigger: "shortcut",
  webSearch: false,
  language: "de",
  showPanel: false,
  minChars: 3,
  cornerDelay: 120,
};

const $ = (id) => document.getElementById(id);
const fields = Object.keys(DEFAULTS);
const savedEl = document.querySelector(".saved");
let savedTimer;

function flashSaved(text = "Gespeichert") {
  savedEl.textContent = text;
  savedEl.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => savedEl.classList.remove("show"), 1200);
}

function readField(key) {
  const el = $(key);
  if (el.type === "checkbox") return el.checked;
  if (el.type === "number") return Math.max(Number(el.min) || 0, Number(el.value) || 0);
  return el.value.trim();
}

chrome.storage.local.get(fields, (stored) => {
  const s = { ...DEFAULTS, ...stored };
  for (const key of fields) {
    const el = $(key);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = s[key];
    else el.value = s[key];
    el.addEventListener("change", () => {
      chrome.storage.local.set({ [key]: readField(key) }, () => flashSaved());
      if (key === "apiKey" || key === "model") $("status").textContent = "";
    });
  }
  if (!s.apiKey) $("apiKey").focus();
});

$("toggleKey").addEventListener("click", () => {
  const el = $("apiKey");
  el.type = el.type === "password" ? "text" : "password";
  $("toggleKey").textContent = el.type === "password" ? "Zeigen" : "Verbergen";
});

$("test").addEventListener("click", () => {
  const status = $("status");
  const apiKey = $("apiKey").value.trim();
  if (!apiKey) {
    status.className = "bad";
    status.textContent = "Bitte zuerst einen Key eintragen.";
    return;
  }
  chrome.storage.local.set({ apiKey });
  status.className = "";
  status.textContent = "Teste …";
  chrome.runtime.sendMessage({ type: "test-key", apiKey, model: $("model").value }, (res) => {
    status.className = res?.ok ? "ok" : "bad";
    status.textContent = res?.text ?? "Keine Antwort vom Hintergrunddienst.";
  });
});

// ---------------------------------------------------------------------------
// Wissensbasis: Dateien werden über die Files API in das eigene API-Konto
// hochgeladen und bei jeder neuen Frage als Dokumente mitgeschickt.
// PDFs gehen direkt hoch (Claude sieht auch Folien-Layouts und Grafiken),
// PPTX/DOCX werden hier im Browser in Text umgewandelt.
// ---------------------------------------------------------------------------

async function client() {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) throw new Error("Bitte zuerst oben den API-Key eintragen.");
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

async function getDocs() {
  const { docs = [] } = await chrome.storage.local.get("docs");
  return docs;
}
const setDocs = (docs) => chrome.storage.local.set({ docs });

// Minimaler ZIP-Leser (PPTX/DOCX sind ZIP-Archive) ohne externe Bibliothek.
async function unzip(buffer, wanted) {
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Datei ist kein gültiges Office-Dokument.");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map();
  for (let n = 0; n < count; n++) {
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buffer, p + 46, nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!wanted(name)) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = new Uint8Array(buffer, start, size);
    let bytes = data;
    if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (method !== 0) continue;
    out.set(name, dec.decode(bytes));
  }
  return out;
}

function paragraphs(xml, pTag, tTag) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.getElementsByTagName(pTag)]
    .map((p) => [...p.getElementsByTagName(tTag)].map((t) => t.textContent).join(""))
    .filter((t) => t.trim());
}

const num = (name) => Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0);

async function pptxToText(buffer) {
  const files = await unzip(buffer, (n) => /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(n));
  const slides = [...files.keys()].filter((n) => n.includes("/slides/")).sort((a, b) => num(a) - num(b));
  return slides
    .map((name) => {
      const i = num(name);
      const text = paragraphs(files.get(name), "a:p", "a:t").join("\n");
      const notesXml = files.get(`ppt/notesSlides/notesSlide${i}.xml`);
      const notes = notesXml ? paragraphs(notesXml, "a:p", "a:t").filter((t) => !/^\d+$/.test(t.trim())).join("\n") : "";
      return `Folie ${i}:\n${text}${notes ? `\nNotizen: ${notes}` : ""}`;
    })
    .join("\n\n");
}

async function docxToText(buffer) {
  const files = await unzip(buffer, (n) => n === "word/document.xml");
  return paragraphs(files.get("word/document.xml") ?? "", "w:p", "w:t").join("\n");
}

async function prepare(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf") return { upload: file, kind: "pdf" };
  let text;
  if (ext === "pptx") text = await pptxToText(await file.arrayBuffer());
  else if (ext === "docx") text = await docxToText(await file.arrayBuffer());
  else if (["txt", "md", "markdown", "csv", "json", "html", "htm"].includes(ext)) text = await file.text();
  else throw new Error(`${file.name}: Format .${ext} wird nicht unterstützt. Tipp: als PDF exportieren.`);
  if (!text.trim()) throw new Error(`${file.name}: kein Text gefunden. Tipp: als PDF exportieren.`);
  const base = file.name.replace(/\.[^.]+$/, "");
  return { upload: new File([text], `${base}.txt`, { type: "text/plain" }), kind: "text" };
}

const SUPPORTED = /\.(pdf|pptx|docx|txt|md|markdown|csv|json|html?)$/i;

// Eine Datei vorbereiten, hochladen und ihren Umfang messen → Eintrag für die Liste
async function uploadOne(api, model, file, label = file.name) {
  const status = $("kbStatus");
  status.textContent = `${label}: wird vorbereitet …`;
  const { upload, kind } = await prepare(file);
  status.textContent = `${label}: wird hochgeladen …`;
  const meta = await api.files.upload({ file: upload });
  let tokens = null;
  try {
    const count = await api.messages.countTokens({
      model,
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "file", file_id: meta.id } },
        { type: "text", text: "." },
      ] }],
    });
    tokens = count.input_tokens;
  } catch {
    // Zählen ist optional
  }
  return { fileId: meta.id, name: file.name, kind, tokens, enabled: true, addedAt: Date.now() };
}

async function apiAndModel() {
  const api = await client();
  const { model = DEFAULTS.model } = await chrome.storage.local.get("model");
  return { api, model };
}

async function addFiles(fileList) {
  const status = $("kbStatus");
  status.className = "";
  let ctx;
  try {
    ctx = await apiAndModel();
  } catch (err) {
    status.className = "bad";
    status.textContent = err.message;
    return;
  }
  for (const file of fileList) {
    try {
      const doc = await uploadOne(ctx.api, ctx.model, file);
      const docs = await getDocs();
      docs.push(doc);
      await setDocs(docs);
      renderDocs();
      flashSaved("Hinzugefügt");
    } catch (err) {
      status.className = "bad";
      status.textContent = `${file.name}: ${err.message ?? err}`;
      return;
    }
  }
  status.textContent = "";
}

// ---------------------------------------------------------------------------
// Ordner verbinden: Chrome merkt sich den Ordner (File System Access API).
// "Synchronisieren" lädt neue/geänderte Dateien hoch und entfernt gelöschte.
// ---------------------------------------------------------------------------

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("eckblick", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function kv(key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", value === undefined ? "readonly" : "readwrite");
    const store = tx.objectStore("kv");
    const req = value === undefined ? store.get(key) : value === null ? store.delete(key) : store.put(value, key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Ordner-Handle merken (IndexedDB, dauerhaft) mit Speicher-Fallback
let memFolder = null;
async function getFolder() {
  try { return (await kv("folder")) ?? memFolder; } catch { return memFolder; }
}
async function setFolder(dir) {
  memFolder = dir;
  try { await kv("folder", dir); } catch { /* Handle nicht speicherbar: nur für diese Sitzung */ }
}

async function* walk(dir, prefix = "", depth = 0) {
  for await (const [name, handle] of dir.entries()) {
    if (name.startsWith(".") || name.startsWith("~$")) continue;
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      if (depth < 4) yield* walk(handle, path, depth + 1);
    } else if (SUPPORTED.test(name)) {
      yield { path, handle };
    }
  }
}

const MAX_FOLDER_FILES = 60;

async function syncFolder({ interactive = true } = {}) {
  const status = $("kbStatus");
  status.className = "";
  const dir = await getFolder();
  if (!dir) return;
  let perm = await dir.queryPermission({ mode: "read" });
  if (perm !== "granted" && interactive) perm = await dir.requestPermission({ mode: "read" });
  if (perm !== "granted") {
    status.textContent = `Ordner „${dir.name}“: Zugriff bestätigen mit „Synchronisieren“.`;
    return;
  }
  let ctx;
  try {
    ctx = await apiAndModel();
  } catch (err) {
    status.className = "bad";
    status.textContent = err.message;
    return;
  }

  const found = [];
  for await (const entry of walk(dir)) {
    found.push(entry);
    if (found.length > MAX_FOLDER_FILES) break;
  }
  if (found.length > MAX_FOLDER_FILES) {
    status.className = "bad";
    status.textContent = `Mehr als ${MAX_FOLDER_FILES} Dateien im Ordner. Bitte einen kleineren Ordner nur mit den wichtigsten Unterlagen wählen.`;
    return;
  }

  let docs = await getDocs();
  const seen = new Set();
  let added = 0, updated = 0, removed = 0, failed = 0;
  for (const { path, handle } of found) {
    seen.add(path);
    const file = await handle.getFile();
    const old = docs.find((d) => d.folderPath === path);
    if (old && old.lastModified === file.lastModified && old.size === file.size) continue;
    try {
      const doc = await uploadOne(ctx.api, ctx.model, file, path);
      Object.assign(doc, { folderPath: path, lastModified: file.lastModified, size: file.size, name: path });
      if (old) {
        doc.enabled = old.enabled;
        ctx.api.files.delete(old.fileId).catch(() => {});
        docs = docs.map((d) => (d === old ? doc : d));
        updated++;
      } else {
        docs.push(doc);
        added++;
      }
      await setDocs(docs);
      renderDocs();
    } catch {
      failed++;
    }
  }
  for (const d of docs.filter((x) => x.folderPath && !seen.has(x.folderPath))) {
    ctx.api.files.delete(d.fileId).catch(() => {});
    removed++;
  }
  docs = docs.filter((x) => !x.folderPath || seen.has(x.folderPath));
  await setDocs(docs);
  await chrome.storage.local.set({ folderSyncedAt: Date.now() });
  renderDocs();
  renderFolder();
  const parts = [];
  if (added) parts.push(`${added} neu`);
  if (updated) parts.push(`${updated} aktualisiert`);
  if (removed) parts.push(`${removed} entfernt`);
  if (failed) parts.push(`${failed} nicht lesbar (Tipp: als PDF speichern)`);
  status.textContent = `Ordner „${dir.name}“ synchronisiert${parts.length ? `: ${parts.join(", ")}` : ", alles aktuell"}.`;
}

async function connectFolder() {
  if (!window.showDirectoryPicker) {
    $("kbStatus").textContent = "Dieser Browser unterstützt keine Ordner-Verbindung. Bitte Chrome, Edge oder Brave nutzen.";
    return;
  }
  let dir;
  try {
    dir = await window.showDirectoryPicker({ id: "eckblick-kb", mode: "read" });
  } catch {
    return; // abgebrochen
  }
  await setFolder(dir);
  renderFolder();
  syncFolder();
}

async function disconnectFolder() {
  await setFolder(null);
  let docs = await getDocs();
  const fromFolder = docs.filter((d) => d.folderPath);
  try {
    const { api } = await apiAndModel();
    for (const d of fromFolder) api.files.delete(d.fileId).catch(() => {});
  } catch {
    // ohne Key nur lokal entfernen
  }
  docs = docs.filter((d) => !d.folderPath);
  await setDocs(docs);
  renderDocs();
  renderFolder();
  $("kbStatus").textContent = "Ordner getrennt.";
}

async function renderFolder() {
  const dir = await getFolder();
  const { folderSyncedAt } = await chrome.storage.local.get("folderSyncedAt");
  $("folderInfo").textContent = dir
    ? `Verbunden: „${dir.name}“${folderSyncedAt ? `, zuletzt synchronisiert ${new Date(folderSyncedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}` : ""}`
    : "Kein Ordner verbunden.";
  $("folderConnect").textContent = dir ? "Anderen Ordner wählen" : "Ordner verbinden";
  $("folderSync").hidden = !dir;
  $("folderDisconnect").hidden = !dir;
}

$("folderConnect").addEventListener("click", connectFolder);
$("folderSync").addEventListener("click", () => syncFolder());
$("folderDisconnect").addEventListener("click", disconnectFolder);
renderFolder();
// Beim Öffnen der Einstellungen still nachziehen, falls Chrome den Zugriff noch erlaubt
syncFolder({ interactive: false }).catch(() => {});

async function removeDoc(fileId) {
  const docs = (await getDocs()).filter((d) => d.fileId !== fileId);
  await setDocs(docs);
  renderDocs();
  try {
    await (await client()).files.delete(fileId);
  } catch {
    // Datei war evtl. schon gelöscht; lokal ist sie entfernt
  }
}

async function toggleDoc(fileId, enabled) {
  const docs = await getDocs();
  const d = docs.find((x) => x.fileId === fileId);
  if (d) d.enabled = enabled;
  await setDocs(docs);
  renderDocs();
}

const fmt = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

async function renderDocs() {
  const docs = await getDocs();
  const list = $("kbList");
  list.replaceChildren();
  for (const d of docs) {
    const row = document.createElement("div");
    row.className = "doc";
    const label = document.createElement("label");
    label.className = "switch small";
    label.innerHTML = `<input type="checkbox" ${d.enabled ? "checked" : ""}><span></span>`;
    label.querySelector("input").addEventListener("change", (e) => toggleDoc(d.fileId, e.target.checked));
    const name = document.createElement("div");
    name.className = "docname";
    name.textContent = d.name;
    const meta = document.createElement("small");
    meta.textContent = `${d.kind === "pdf" ? "PDF" : "Text"}${d.tokens ? ` · ${fmt(d.tokens)} Tokens` : ""}`;
    name.appendChild(meta);
    const del = document.createElement("button");
    del.className = "ghost";
    del.type = "button";
    del.textContent = "Entfernen";
    del.addEventListener("click", () => removeDoc(d.fileId));
    row.append(label, name, del);
    list.appendChild(row);
  }
  const active = docs.filter((d) => d.enabled);
  const total = active.reduce((s, d) => s + (d.tokens ?? 0), 0);
  $("kbSummary").textContent = docs.length
    ? `${active.length} von ${docs.length} aktiv${total ? `, zusammen ca. ${fmt(total)} Tokens pro neuer Frage` : ""}.` +
      (total > 300000 ? " Das ist viel: Antworten werden langsamer und teurer. Nur das Nötige aktiv lassen." : "")
    : "Noch keine Dokumente.";
}

const drop = $("kbDrop");
const picker = $("kbFile");
drop.addEventListener("click", () => picker.click());
picker.addEventListener("change", () => { addFiles([...picker.files]); picker.value = ""; });
drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  addFiles([...e.dataTransfer.files]);
});
renderDocs();
