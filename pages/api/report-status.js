// pages/api/report-status.js
// Fragt den Stand eines oder mehrerer Hintergrund-Reports ab.
//   GET /api/report-status?ids=a,b,c   -> [{id,status,label,...}]
//   GET /api/report-status?id=a&full=1 -> {..., text: '...'}  (fertiger Analysetext)

import { getJob, getJobText } from '../../lib/jobs';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, ids, full } = req.query || {};

  if (id) {
    const job = await getJob(String(id));
    if (!job) return res.status(404).json({ error: 'Unbekannter Auftrag' });
    if (full === '1' && job.status === 'done') {
      job.text = await getJobText(String(id));
    }
    return res.status(200).json(job);
  }

  const list = String(ids || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 25);
  const jobs = await Promise.all(list.map(async (jid) => {
    try { return await getJob(jid); } catch (e) { return null; }
  }));
  return res.status(200).json({ jobs: jobs.filter(Boolean) });
}
