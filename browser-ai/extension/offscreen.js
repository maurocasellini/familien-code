// Kopiert Text in die Zwischenablage (vom Service-Worker angestoßen).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "offscreen" || msg.type !== "copy") return;
  const buf = document.getElementById("buf");
  buf.value = msg.text;
  buf.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  buf.value = "";
  sendResponse({ ok });
});
