const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const Bucket = process.env.R2_BUCKET;

module.exports = async (req, res) => {
  // Optional passcode: add SYNC_KEY in Vercel > Settings > Environment Variables
  if (process.env.SYNC_KEY && req.headers['x-key'] !== process.env.SYNC_KEY) {
    return res.status(401).json({ error: 'locked' });
  }
  try {
    if (req.method === 'GET') {
      const k = req.query.k;
      if (typeof k !== 'string' || !k || k.length > 300) return res.status(400).json({});
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket, Key: 'hsc/' + k }));
        const v = await obj.Body.transformToString();
        return res.json({ v });
      } catch (e) {
        if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) {
          return res.json({ v: null });
        }
        throw e;
      }
    }

    const { k, v } = req.body || {};
    if (typeof k !== 'string' || !k || k.length > 300) return res.status(400).json({});
    if (v === null) {
      await s3.send(new DeleteObjectCommand({ Bucket, Key: 'hsc/' + k }));
    } else {
      await s3.send(new PutObjectCommand({
        Bucket,
        Key: 'hsc/' + k,
        Body: typeof v === 'string' ? v : JSON.stringify(v),
        ContentType: 'application/json',
      }));
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error(e); // shows the real error in Vercel's function logs
    return res.status(500).json({ error: 'db' });
  }
};
