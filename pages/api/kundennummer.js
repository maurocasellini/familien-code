// pages/api/kundennummer.js
// Liefert die Kundennummer fuer eine Person (Auto-Ausfuellen im Eingabefenster).
// Bekannte Person -> gespeicherte Nummer · neue Person -> naechste freie Nummer.

import { resolveKundennummer } from '../../lib/kundenregister';

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { nachname, vorname, geburtsdatum } = req.body || {};
  if (!nachname && !vorname) return res.status(400).json({ error: 'Name fehlt' });

  try {
    const result = await resolveKundennummer({ nachname, vorname, geburtsdatum });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[kundennummer] fehlgeschlagen:', err.message);
    // Nicht blockierend: das Frontend faellt auf leeres Feld zurueck.
    return res.status(200).json({ kundennummer: '', wiedererkannt: false, error: err.message });
  }
}
