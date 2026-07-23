// pages/api/report.js
// Startet einen Report im HINTERGRUND und antwortet sofort.
// Ablauf: Job anlegen -> 202 mit jobId zurueck -> Arbeit laeuft via waitUntil weiter
// (Text erzeugen -> docx bauen -> in Google Drive ablegen -> Status auf "fertig").
// Dadurch keine Wartezeit im Tool, und mehrere Reports koennen parallel laufen:
// jeder Aufruf ist eine eigene Function-Invocation.

import { generateReportText } from '../../lib/anthropic-report';
import { buildDocxBuffer } from '../../lib/docx-builder';
import { newJobId, setJob, setJobText, getRedis } from '../../lib/jobs';

export const config = { maxDuration: 800 }; // Vercel Pro + Fluid Compute

// waitUntil haelt die Function nach dem Senden der Antwort am Leben.
// Falls @vercel/functions fehlt (lokal), laufen wir ohne und warten die Arbeit ab.
function getWaitUntil() {
  try {
    const { waitUntil } = require('@vercel/functions');
    if (typeof waitUntil === 'function') return waitUntil;
  } catch (e) { /* nicht installiert */ }
  return null;
}

async function runJob(id, { messages, language, depth, meta }) {
  const started = Date.now();
  try {
    // 1) Text erzeugen. Fortschritt nur gedrosselt schreiben (max. alle 4s),
    //    sonst wird Redis bei jedem Token angefasst.
    let chars = 0;
    let lastWrite = 0;
    const { text } = await generateReportText({
      messages,
      language,
      depth,
      onDelta: (t) => {
        chars += t.length;
        const now = Date.now();
        if (now - lastWrite > 4000) {
          lastWrite = now;
          setJob(id, { status: 'running', label: 'Analyse wird geschrieben', chars }).catch(() => {});
        }
      },
    });
    if (!text || !text.trim()) throw new Error('Die Analyse kam leer zurueck.');
    await setJobText(id, text);
    await setJob(id, { status: 'building', label: 'Word-Dokument wird gebaut', chars: text.length });

    // 2) docx bauen
    const { buffer } = await buildDocxBuffer({
      rawText: text,
      name: meta.name,
      language,
      title: meta.title,
      subtitle: meta.subtitle,
    });

    // 3) In Google Drive ablegen
    let drive = null;
    if (meta.nachname || meta.vorname) {
      await setJob(id, { status: 'uploading', label: 'Wird im Google Drive abgelegt' });
      const { uploadAnalysis } = require('../../drive');
      drive = await uploadAnalysis({
        buffer,
        geburtsdatum: meta.geburtsdatum,
        nachname: meta.nachname,
        vorname: meta.vorname,
        typ: meta.analyseTyp || 'analyse',
        auftragstyp: meta.auftragstyp || undefined,
      });
    }

    await setJob(id, {
      status: 'done',
      label: drive ? 'Fertig, im Drive abgelegt' : 'Fertig',
      chars: text.length,
      driveLink: drive?.webViewLink || null,
      driveName: drive?.name || null,
      seconds: Math.round((Date.now() - started) / 1000),
      finishedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[report] Job', id, 'fehlgeschlagen:', err);
    await setJob(id, {
      status: 'error',
      label: 'Fehlgeschlagen',
      error: String(err?.message || err).slice(0, 400),
      seconds: Math.round((Date.now() - started) / 1000),
      finishedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, language, depth, meta } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  if (!getRedis()) {
    return res.status(500).json({ error: 'Job-Speicher nicht konfiguriert (KV_REST_API_URL / KV_REST_API_TOKEN fehlen).' });
  }

  const id = newJobId();
  const m = meta || {};
  await setJob(id, {
    status: 'running',
    label: 'Analyse wird geschrieben',
    chars: 0,
    name: m.name || '',
    title: m.title || '',
    analyseTyp: m.analyseTyp || '',
    language: language || 'de',
    startedAt: new Date().toISOString(),
  });

  const work = runJob(id, { messages, language, depth, meta: m });
  const waitUntil = getWaitUntil();
  if (waitUntil) {
    waitUntil(work);                    // Vercel: laeuft nach der Antwort weiter
    return res.status(202).json({ jobId: id });
  }
  // Lokal ohne @vercel/functions: Arbeit abwarten, damit sie nicht abbricht.
  work.catch(() => {});
  return res.status(202).json({ jobId: id, note: 'waitUntil nicht verfuegbar' });
}
