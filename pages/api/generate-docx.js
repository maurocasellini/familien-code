// pages/api/generate-docx.js
// Download-Endpunkt fuer das Word-Dokument (Knopf "Word herunterladen").
// Die eigentliche Dokument-Logik liegt in lib/docx-builder.js, damit der
// Hintergrund-Job (/api/report) exakt dasselbe Dokument erzeugt.

import { buildDocxBuffer } from '../../lib/docx-builder';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { rawText, name, language, title, subtitle, kundennummer, geburtsdatum, nachname, vorname, analyseTyp, auftragstyp, skipDrive } = req.body || {};
  if (!rawText || typeof rawText !== 'string') return res.status(400).json({ error: 'Missing rawText' });

  try {
    const { buffer, safeName } = await buildDocxBuffer({ rawText, name, language, title, subtitle });

    // --- Google-Drive-Archiv (Fehler blockieren den Download nie) ---
    // skipDrive: wenn der Hintergrund-Job die Datei bereits abgelegt hat,
    // laedt der manuelle Download sie nicht ein zweites Mal hoch.
    if (!skipDrive && (nachname || vorname)) {
      try {
        let nr = kundennummer;
        try {
          const { resolveKundennummer } = require('../../lib/kundenregister');
          const r = await resolveKundennummer({ nachname, vorname, geburtsdatum, override: kundennummer });
          nr = r.kundennummer;
        } catch (e) {
          console.error('Kundennummer nicht aufloesbar:', e.message);
        }
        const { uploadAnalysis } = require('../../drive');
        await uploadAnalysis({
          buffer, kundennummer: nr, geburtsdatum, nachname, vorname,
          typ: analyseTyp || 'analyse',
          auftragstyp: auftragstyp || undefined,
        });
      } catch (e) {
        console.error('Drive-Archiv fehlgeschlagen:', e.message);
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Familien-Code_${safeName}.docx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('DOCX generation error:', err);
    return res.status(500).json({ error: err.message || 'DOCX generation failed' });
  }
}
