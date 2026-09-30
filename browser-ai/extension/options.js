const DEFAULTS = {
  apiKey: "",
  model: "claude-opus-5-5",
  autoAsk: true,
  webSearch: false,
  language: "auto",
  minChars: 3,
  cornerDelay: 120,
};

const $ = (id) => document.getElementById(id);
const fields = Object.keys(DEFAULTS);
const savedEl = document.querySelector(".saved");
let savedTimer;

function flashSaved() {
  savedEl.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => savedEl.classList.remove("show"), 900);
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
    if (el.type === "checkbox") el.checked = s[key];
    else el.value = s[key];
    el.addEventListener("change", () => {
      chrome.storage.local.set({ [key]: readField(key) }, flashSaved);
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
