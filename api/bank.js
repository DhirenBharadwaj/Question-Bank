const { Redis } = require('@upstash/redis');

// Uses the env vars Upstash adds when you click "Connect to Project"
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
  automaticDeserialization: false,
});

module.exports = async (req, res) => {
  // Optional passcode: add SYNC_KEY in Vercel > Settings > Environment Variables
  if (process.env.SYNC_KEY && req.headers['x-key'] !== process.env.SYNC_KEY) {
    return res.status(401).json({ error: 'locked' });
  }
  try {
    if (req.method === 'GET') {
      const k = req.query.k;
      if (typeof k !== 'string' || !k || k.length > 300) return res.status(400).json({});
      const v = await redis.get('hsc:' + k);
      return res.json({ v: v ?? null });
    }
    const { k, v } = req.body || {};
    if (typeof k !== 'string' || !k || k.length > 300) return res.status(400).json({});
    if (v === null) await redis.del('hsc:' + k);
    else await redis.set('hsc:' + k, v);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'db' });
  }
};
