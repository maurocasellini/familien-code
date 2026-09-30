// Eckblick AI – Einstellungsseite inkl. Wissensbasis
// Wird nach extension/options.js gebündelt (npm run build).

import Anthropic from "@anthropic-ai/sdk";

const DEFAULTS = {
  apiKey: "",
  model: "claude-opus-5-5",
  trigger: "shortcut",
  webSearch: false,
  language: "de",
  autoCopy: false,
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

async function addFiles(fileList) {
  const status = $("kbStatus");
  status.className = "";
  let api;
  try {
    api = await client();
  } catch (err) {
    status.className = "bad";
    status.textContent = err.message;
    return;
  }
  const { model = DEFAULTS.model } = await chrome.storage.local.get("model");
  for (const file of fileList) {
    try {
      status.textContent = `${file.name}: wird vorbereitet …`;
      const { upload, kind } = await prepare(file);
      status.textContent = `${file.name}: wird hochgeladen …`;
      const meta = await api.files.upload({ file: upload });
      let tokens = null;
      try {
        status.textContent = `${file.name}: Umfang wird gemessen …`;
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
      const docs = await getDocs();
      docs.push({ fileId: meta.id, name: file.name, kind, tokens, enabled: true, addedAt: Date.now() });
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
