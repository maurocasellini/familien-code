import { Redis } from '@upstash/redis';
import { generateReportText, resolveLang } from '../../lib/anthropic-report';

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const config = { maxDuration: 800 }; // Vercel Pro + Fluid Compute

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, lead, language, depth } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const lang = resolveLang(language);

  // ── SAVE LEAD TO REDIS ─────────────────────────────────────────
  if (lead?.email) {
    try {
      const redis = getRedis();
      if (redis) {
        const id = `lead:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
        const record = JSON.stringify({
          id,
          name: lead.name || '',
          email: lead.email || '',
          constellation: lead.constellation || '',
          focus: lead.focus || '',
          language: lang,
          timestamp: new Date().toISOString(),
        });
        await redis.set(id, record);
        await redis.lpush('leads', id);
      }
    } catch (err) {
      console.error('Redis save error:', err.message);
    }
  }

  // ── STREAMING (NDJSON) ─────────────────────────────────────────
  // Lange Generierungen werden auf Vercel abgebrochen, wenn ueber Minuten KEINE Bytes
  // fliessen. Wir streamen die Deltas live zum Browser. Die eigentliche Erzeugung
  // (inkl. Fortsetzungs-Schleife und Umlaut-Korrektur) liegt in lib/anthropic-report.
  try {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    const sse = (obj) => {
      res.write(JSON.stringify(obj) + '\n');
      if (typeof res.flush === 'function') res.flush();
    };
    sse({ type: 'start' });

    const { text, stopReason, rounds } = await generateReportText({
      messages,
      language: lang,
      depth,
      onDelta: (t) => sse({ type: 'delta', text: t }),
    });
    console.log('[chat] Runden:', rounds, '| stop_reason:', stopReason, '| Zeichen:', text.length);

    sse({ type: 'done', text, stop_reason: stopReason });
    return res.end();
  } catch (err) {
    console.error('[chat] Fehler:', err);
    const detail = err.cause?.message || err.cause?.code || err.code || 'unbekannt';
    const message = `${err.message} (Detail: ${detail}).`;
    if (res.headersSent) {
      try { res.write(JSON.stringify({ type: 'error', message }) + '\n'); } catch (e) {}
      return res.end();
    }
    return res.status(500).json({ error: { message, original: err.message, cause: err.cause?.message || err.cause?.code || null } });
  }
}
