// Bulut senkron API'si — tüm veriler tek dosyada (yks-data.json) tutulur.
// Kimlik doğrulama: x-sync-key başlığı, SYNC_SECRET ortam değişkeniyle karşılaştırılır.
const { put, list, del } = require('@vercel/blob');

const PATHNAME = 'yks-data.json';

function authorized(req) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;
  return req.headers['x-sync-key'] === secret;
}

module.exports = async (req, res) => {
  if (!authorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: PATHNAME });
      if (!blobs.length) return res.status(404).json({ error: 'empty' });
      const latest = blobs.sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      )[0];
      // özel (private) mağazadaki dosyayı okumak için token gerekli
      const r = await fetch(latest.url, {
        headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      if (!r.ok) return res.status(502).json({ error: 'blob read failed' });
      const data = await r.json();
      return res.status(200).json({ data, uploadedAt: latest.uploadedAt });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!body || !Array.isArray(body.exams)) {
        return res.status(400).json({ error: 'bad payload' });
      }
      const { blobs } = await list({ prefix: PATHNAME });
      await put(PATHNAME, JSON.stringify(body), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      if (blobs.length) {
        try { await del(blobs.map(b => b.url)); } catch (e) { /* eski sürüm silinemezse sorun değil */ }
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
