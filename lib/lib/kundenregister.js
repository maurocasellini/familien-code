// lib/kundenregister.js
// Vergibt und merkt sich Kundennummern nach dem Schema  Cas + Mau + _ + Nummer.
//   - 3 Buchstaben Nachname + 3 Buchstaben Vorname als Praefix (z. B. CasMau)
//   - dahinter eine pro Praefix fortlaufende Nummer (CasMau_1, CasMau_2, ...)
//
// Wiedererkennung: dieselbe Person (Nachname|Vorname|Geburtsdatum) bekommt bei
// jeder weiteren Analyse dieselbe Nummer zurueck, statt einer neuen.
//
// Ablage bewusst in Google Drive, NICHT in Redis: das kostenlose Upstash-Redis
// wird nach 14 Tagen Inaktivitaet geloescht (ist schon passiert) — ein
// Kundenregister muss aber dauerhaft bestehen. Drive nutzt dieselben drei
// Env-Vars wie drive.js / jobs.js und laeuft nicht ab.
//   Ablage:  herzbewegung / _Register / kunden.json
//
// Nebenlaeufigkeit: Zwei gleichzeitige Anfragen sind hier extrem unwahrscheinlich
// (eine Praktikerin, ein Report nach dem anderen). Es gilt Last-Write-Wins.

import { google } from 'googleapis';
import { Readable } from 'stream';

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const JSON_MIME = 'application/json';
const REGISTRY_FILE = 'kunden.json';

let cachedFolderId = null;
let cachedFileId = null;

export function isRegistryConfigured() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN);
}

function getDrive() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Kundenregister: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN fehlen.');
  }
  const oauth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth2 });
}

function q(value) {
  return String(value).replace(/'/g, "\\'");
}

async function findOrCreateFolder(drive, name, parentId) {
  const parents = parentId ? `and '${q(parentId)}' in parents ` : '';
  const res = await drive.files.list({
    q: `mimeType='${FOLDER_MIME}' and name='${q(name)}' ${parents}and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
    spaces: 'drive',
  });
  const found = res.data.files && res.data.files[0];
  if (found) return found.id;
  const requestBody = { name, mimeType: FOLDER_MIME };
  if (parentId) requestBody.parents = [parentId];
  const created = await drive.files.create({ requestBody, fields: 'id' });
  return created.data.id;
}

// herzbewegung / _Register  (obere Ebene identisch zu drive.js / jobs.js)
async function getRegistryFolderId(drive) {
  if (cachedFolderId) return cachedFolderId;
  const topName = (process.env.DRIVE_TOP_FOLDER_NAME ?? 'herzbewegung').trim();
  const regName = process.env.DRIVE_REGISTRY_FOLDER_NAME || '_Register';
  const parent = topName ? await findOrCreateFolder(drive, topName, null) : null;
  cachedFolderId = await findOrCreateFolder(drive, regName, parent);
  return cachedFolderId;
}

async function findFileId(drive, name, parentId) {
  const res = await drive.files.list({
    q: `name='${q(name)}' and '${q(parentId)}' in parents and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
    spaces: 'drive',
  });
  const f = res.data.files && res.data.files[0];
  return f ? f.id : null;
}

// Liest das Register. Gibt bei fehlender Datei eine leere Struktur zurueck.
async function loadRegistry(drive, folderId) {
  const fileId = cachedFileId || (await findFileId(drive, REGISTRY_FILE, folderId));
  if (!fileId) return { byKey: {}, prefixCounters: {} };
  cachedFileId = fileId;
  try {
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
    const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const parsed = JSON.parse(raw);
    return {
      byKey: parsed.byKey || {},
      prefixCounters: parsed.prefixCounters || {},
    };
  } catch (e) {
    // Beschaedigte/leere Datei nicht toedlich: mit leerem Register weiterarbeiten.
    return { byKey: {}, prefixCounters: {} };
  }
}

async function saveRegistry(drive, folderId, data) {
  const content = JSON.stringify(data, null, 2);
  const media = { mimeType: JSON_MIME, body: Readable.from([content]) };
  if (cachedFileId) {
    await drive.files.update({ fileId: cachedFileId, media, fields: 'id' });
    return;
  }
  const res = await drive.files.create({
    requestBody: { name: REGISTRY_FILE, parents: [folderId] },
    media,
    fields: 'id',
  });
  cachedFileId = res.data.id;
}

// --- Namenslogik --------------------------------------------------------

// Nur Buchstaben (inkl. Umlaute/Akzente), erste gross, Rest klein, max 3.
// "Casellini" -> "Cas" · "Mauro" -> "Mau" · "Li" -> "Li" · "von Arx" -> "Von"
function prefix3(part) {
  const letters = String(part == null ? '' : part).replace(/[^a-zA-ZäöüÄÖÜà-ÿ]/g, '');
  const three = letters.slice(0, 3);
  if (!three) return '';
  return three.charAt(0).toUpperCase() + three.slice(1).toLowerCase();
}

// Praefix aus Nach- und Vorname: Cas + Mau = CasMau
export function buildPrefix(nachname, vorname) {
  return prefix3(nachname) + prefix3(vorname);
}

// Eindeutiger Personenschluessel fuer die Wiedererkennung.
function personKey({ nachname, vorname, geburtsdatum }) {
  const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
  return [norm(nachname), norm(vorname), norm(geburtsdatum)].join('|');
}

// --- Oeffentliche API ---------------------------------------------------

/**
 * Ermittelt die Kundennummer fuer eine Person.
 *   - kennt das Register die Person schon: gibt die gespeicherte Nummer zurueck
 *   - sonst: vergibt Praefix_N mit der naechsten freien Nummer und speichert sie
 *   - override (manuell eingetippt): wird uebernommen und mit der Person verknuepft
 *
 * @returns {Promise<{ kundennummer: string, wiedererkannt: boolean }>}
 */
export async function resolveKundennummer({ nachname, vorname, geburtsdatum, override }) {
  if (!isRegistryConfigured()) {
    // Ohne Drive-Zugang trotzdem eine sinnvolle Nummer liefern (nur ohne Merken).
    const nr = (override && String(override).trim())
      ? String(override).trim()
      : `${buildPrefix(nachname, vorname)}_1`;
    return { kundennummer: nr, wiedererkannt: false };
  }

  const drive = getDrive();
  const folderId = await getRegistryFolderId(drive);
  const reg = await loadRegistry(drive, folderId);
  const key = personKey({ nachname, vorname, geburtsdatum });

  // 1) Manueller Override hat immer Vorrang.
  const ov = override && String(override).trim();
  if (ov) {
    if (reg.byKey[key] !== ov) {
      reg.byKey[key] = ov;
      await saveRegistry(drive, folderId, reg);
    }
    return { kundennummer: ov, wiedererkannt: false };
  }

  // 2) Bekannte Person: gespeicherte Nummer zurueckgeben.
  if (reg.byKey[key]) {
    return { kundennummer: reg.byKey[key], wiedererkannt: true };
  }

  // 3) Neue Person: naechste freie Nummer fuer diesen Praefix.
  const prefix = buildPrefix(nachname, vorname) || 'XXX';
  const next = (reg.prefixCounters[prefix] || 0) + 1;
  const nr = `${prefix}_${next}`;
  reg.prefixCounters[prefix] = next;
  reg.byKey[key] = nr;
  await saveRegistry(drive, folderId, reg);
  return { kundennummer: nr, wiedererkannt: false };
}
