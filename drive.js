// drive.js
// Archiviert generierte Analyse-Dokumente in Google Drive.
// Ein Ordner pro Kunde (K-0001_Nachname_Vorname), Datei mit allen Feldern im Namen.
//
// Auth: OAuth als eigenes Archiv-Konto (nicht Service-Konto), Scope drive.file.
// Das Modul sieht ausschliesslich Dateien, die es selbst anlegt.
// Der Kontoinhaber (du) sieht in der Drive-Oberflaeche trotzdem alles normal.
//
// Benoetigte Env-Vars (serverseitig, in Vercel):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REFRESH_TOKEN
//   DRIVE_ARCHIVE_FOLDER_NAME  (optional, Default "Kunden")
//
// Abhaengigkeit: npm install googleapis   (luxon ist bereits im Projekt)

const { google } = require('googleapis');
const { Readable } = require('stream');
const { DateTime } = require('luxon');

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ZONE = 'Europe/Zurich';

// Root-Ordner-ID wird pro Warm-Lambda gecacht, um wiederholte Lookups zu sparen.
let cachedRootId = null;

// --- Auth ---------------------------------------------------------------

function getDrive() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } =
    process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      'Drive-Archiv: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN fehlen.'
    );
  }
  const oauth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth2 });
}

// --- Namen --------------------------------------------------------------

// Entfernt nur die auf Drive/Dateisystemen verbotenen Zeichen.
// Umlaute (ä ö ü) und Namen wie "von Arx", "D'Amico", "François" bleiben erhalten.
function sanitize(part) {
  return String(part == null ? '' : part)
    .replace(/[\/\\:*?"<>|]/g, '') // verbotene Zeichen
    .replace(/\s+/g, ' ') // Mehrfach-Whitespace zusammenfassen
    .trim();
}

// Baut den Ordnernamen: K-0001_Nachname_Vorname
function buildFolderName({ kundennummer, nachname, vorname }) {
  return [kundennummer, nachname, vorname].map(sanitize).join('_');
}

// Baut den Dateinamen ohne Kollisionssuffix (das kommt spaeter dazu).
// typ:        'vollständige-analyse' | 'individuelle-analyse' | 'human-design'
// auftragstyp: optional, nur bei individueller Analyse (z. B. 'beziehung')
function buildBaseName({
  kundennummer,
  nachname,
  vorname,
  typ,
  auftragstyp,
  datum,
}) {
  const folder = buildFolderName({ kundennummer, nachname, vorname });
  const parts = [folder, datum, sanitize(typ)];
  const at = sanitize(auftragstyp);
  if (at) parts.push(at);
  return parts.join('_');
}

// --- Drive-Helfer -------------------------------------------------------

// Escaped einfache Anfuehrungszeichen fuer Drive-Query-Strings.
function q(value) {
  return String(value).replace(/'/g, "\\'");
}

// Sucht einen Ordner nach exaktem Namen unter parentId, sonst null.
async function findFolder(drive, name, parentId) {
  const parents = parentId ? `and '${q(parentId)}' in parents ` : '';
  const res = await drive.files.list({
    q: `mimeType='${FOLDER_MIME}' and name='${q(name)}' ${parents}and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1,
    spaces: 'drive',
  });
  const f = res.data.files && res.data.files[0];
  return f ? f.id : null;
}

async function createFolder(drive, name, parentId) {
  const requestBody = { name, mimeType: FOLDER_MIME };
  if (parentId) requestBody.parents = [parentId];
  const res = await drive.files.create({ requestBody, fields: 'id' });
  return res.data.id;
}

async function findOrCreateFolder(drive, name, parentId) {
  const existing = await findFolder(drive, name, parentId);
  if (existing) return existing;
  return createFolder(drive, name, parentId);
}

// Archiv-Wurzel holen/anlegen, zweistufig:  herzbewegung / Kunden
// Beide Ordner legt das Modul selbst an, daher unter Scope drive.file sichtbar.
// Als Kontoinhaber siehst du sie in der Drive-Oberflaeche ganz normal.
// Ueber Env-Vars anpassbar:
//   DRIVE_TOP_FOLDER_NAME      (Default "herzbewegung"; leer = Ebene weglassen)
//   DRIVE_ARCHIVE_FOLDER_NAME  (Default "Kunden")
// Ergebnis (die Kunden-Ordner-ID) wird pro Warm-Lambda gecacht.
async function getRootFolderId(drive) {
  if (cachedRootId) return cachedRootId;
  const topName = (process.env.DRIVE_TOP_FOLDER_NAME ?? 'herzbewegung').trim();
  const archiveName = process.env.DRIVE_ARCHIVE_FOLDER_NAME || 'Kunden';

  // Obere Ebene (herzbewegung), sofern gesetzt
  const parentForArchive = topName
    ? await findOrCreateFolder(drive, topName, null)
    : null;

  // Kunden-Ordner darin (oder direkt in der Ablage, falls keine obere Ebene)
  cachedRootId = await findOrCreateFolder(drive, archiveName, parentForArchive);
  return cachedRootId;
}

// Prueft, ob im Ordner bereits eine Datei mit exakt diesem Namen liegt.
async function fileExists(drive, name, parentId) {
  const res = await drive.files.list({
    q: `name='${q(name)}' and '${q(parentId)}' in parents and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
    spaces: 'drive',
  });
  return !!(res.data.files && res.data.files.length);
}

// Findet einen freien Dateinamen: base.docx, sonst base_HH-mm.docx,
// sonst base_HH-mm-2.docx usw. So geht nie ein Dokument verloren.
async function resolveFreeName(drive, base, parentId, now) {
  let candidate = `${base}.docx`;
  if (!(await fileExists(drive, candidate, parentId))) return candidate;

  const time = now.toFormat('HH-mm');
  candidate = `${base}_${time}.docx`;
  let n = 2;
  while (await fileExists(drive, candidate, parentId)) {
    candidate = `${base}_${time}-${n}.docx`;
    n += 1;
  }
  return candidate;
}

// --- Oeffentliche API ---------------------------------------------------

/**
 * Laedt einen fertigen docx-Buffer ins Kundenarchiv.
 * @returns {Promise<{id:string, name:string, folderId:string, webViewLink:string}>}
 */
async function uploadAnalysis({
  buffer,
  kundennummer,
  nachname,
  vorname,
  typ,
  auftragstyp,
  datum, // optional; Default heutiges Datum in Europe/Zurich
}) {
  if (!buffer || !buffer.length) throw new Error('Drive-Archiv: leerer Buffer.');
  if (!kundennummer) throw new Error('Drive-Archiv: kundennummer fehlt.');

  const drive = getDrive();
  const now = DateTime.now().setZone(ZONE);
  const dateStr = datum || now.toFormat('yyyy-LL-dd');

  const rootId = await getRootFolderId(drive);
  const folderName = buildFolderName({ kundennummer, nachname, vorname });
  const folderId = await findOrCreateFolder(drive, folderName, rootId);

  const base = buildBaseName({
    kundennummer,
    nachname,
    vorname,
    typ,
    auftragstyp,
    datum: dateStr,
  });
  const name = await resolveFreeName(drive, base, folderId, now);

  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: DOCX_MIME, body: Readable.from(buffer) },
    fields: 'id,name,webViewLink',
  });

  return {
    id: res.data.id,
    name: res.data.name,
    folderId,
    webViewLink: res.data.webViewLink,
  };
}

module.exports = {
  uploadAnalysis,
  // exportiert fuer Tests / Kontrolle:
  buildFolderName,
  buildBaseName,
  sanitize,
};
