// lib/jobs.js
// Auftragsspeicher fuer Hintergrund-Reports — abgelegt in Google Drive.
//
// Warum Drive und keine Datenbank: die kostenlose Upstash-Redis wird nach
// 14 Tagen Inaktivitaet automatisch geloescht. Genau das ist hier schon einmal
// passiert. Drive ist ohnehin eingerichtet, laeuft nicht ab und braucht keine
// zusaetzlichen Zugangsdaten — es nutzt dieselben drei Env-Vars wie drive.js:
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN
//
// Ablage:  herzbewegung / _Auftraege / job_<id>.json   (Status)
//                                      job_<id>.txt    (fertiger Analysetext)
// Scope drive.file genuegt, weil das Modul die Dateien selbst anlegt.

import { google } from 'googleapis';
import { Readable } from 'stream';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

// Pro warmem Lambda gecacht: Ordner-ID und aktueller Stand je Auftrag.
// Dadurch braucht ein Fortschritts-Update waehrend des Laufs nur EINEN
// Drive-Aufruf statt Suchen + Lesen + Schreiben.
let cachedFolderId = null;
const cache = new Map(); // id -> { fileId, data }

export function isStoreConfigured() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN);
}

function getDrive() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Auftragsspeicher: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN fehlen.');
  }
  const oauth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth2 });
}

export function newJobId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Einfache Anfuehrungszeichen fuer Drive-Query-Strings entschaerfen.
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

// herzbewegung / _Auftraege  (obere Ebene identisch zu drive.js)
async function getJobsFolderId(drive) {
  if (cachedFolderId) return cachedFolderId;
  const topName = (process.env.DRIVE_TOP_FOLDER_NAME ?? 'herzbewegung').trim();
  const jobsName = process.env.DRIVE_JOBS_FOLDER_NAME || '_Auftraege';
  const parent = topName ? await findOrCreateFolder(drive, topName, null) : null;
  cachedFolderId = await findOrCreateFolder(drive, jobsName, parent);
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

async function readFileText(drive, fileId) {
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
}

async function writeFile(drive, { name, parentId, fileId, content, mimeType }) {
  const media = { mimeType, body: Readable.from([content]) };
  if (fileId) {
    const res = await drive.files.update({ fileId, media, fields: 'id' });
    return res.data.id;
  }
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media,
    fields: 'id',
  });
  return res.data.id;
}

const statusName = (id) => `job_${id}.json`;
const textName = (id) => `job_${id}.txt`;

/** Status anlegen bzw. teilweise aktualisieren. */
export async function setJob(id, patch) {
  if (!isStoreConfigured()) return null;
  const drive = getDrive();
  const folderId = await getJobsFolderId(drive);
  const name = statusName(id);

  let entry = cache.get(id);
  if (!entry) {
    const fileId = await findFileId(drive, name, folderId);
    let data = {};
    if (fileId) {
      try { data = JSON.parse(await readFileText(drive, fileId)); } catch (e) { data = {}; }
    }
    entry = { fileId, data };
  }

  const next = { ...entry.data, ...patch, id, updatedAt: new Date().toISOString() };
  const fileId = await writeFile(drive, {
    name, parentId: folderId, fileId: entry.fileId,
    content: JSON.stringify(next), mimeType: 'application/json',
  });
  cache.set(id, { fileId, data: next });
  return next;
}

export async function getJob(id) {
  if (!isStoreConfigured()) return null;
  const drive = getDrive();
  const folderId = await getJobsFolderId(drive);
  const fileId = await findFileId(drive, statusName(id), folderId);
  if (!fileId) return null;
  try { return JSON.parse(await readFileText(drive, fileId)); }
  catch (e) { return null; }
}

export async function setJobText(id, text) {
  if (!isStoreConfigured()) return;
  const drive = getDrive();
  const folderId = await getJobsFolderId(drive);
  const name = textName(id);
  const existing = await findFileId(drive, name, folderId);
  await writeFile(drive, {
    name, parentId: folderId, fileId: existing,
    content: String(text), mimeType: 'text/plain',
  });
}

export async function getJobText(id) {
  if (!isStoreConfigured()) return null;
  const drive = getDrive();
  const folderId = await getJobsFolderId(drive);
  const fileId = await findFileId(drive, textName(id), folderId);
  if (!fileId) return null;
  try { return await readFileText(drive, fileId); }
  catch (e) { return null; }
}
