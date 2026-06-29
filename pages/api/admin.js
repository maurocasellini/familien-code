import { Redis } from '@upstash/redis';

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  // ── AUTH ───────────────────────────────────────────────────────
  const pw = req.headers['x-admin-password'];
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ error: 'Storage not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel environment variables.' });
  }

  if (req.method === 'GET') {
    try {
      const ids = await redis.lrange('leads', 0, 499);
      if (!ids || ids.length === 0) return res.status(200).json({ leads: [] });

      const records = await Promise.all(
        ids.map(async (id) => {
          try {
            const raw = await redis.get(id);
            if (!raw) return null;
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
          } catch { return null; }
        })
      );

      return res.status(200).json({ leads: records.filter(Boolean) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const ids = await redis.lrange('leads', 0, -1);
      if (ids?.length) {
        await Promise.all(ids.map(id => redis.del(id)));
        await redis.del('leads');
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
