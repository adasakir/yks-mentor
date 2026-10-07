// Gemini yapay zeka sohbet API'si.
// API anahtarı sunucuda tutulur (GEMINI_API_KEY), istemciye asla çıkmaz.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// basit hız sınırı: IP başına dakikada 30 istek (örnek başına bellek)
const hits = new Map();
function rateOk(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const h = hits.get(ip) || { n: 0, reset: now + 60000 };
  if (now > h.reset) { h.n = 0; h.reset = now + 60000; }
  h.n += 1;
  hits.set(ip, h);
  return h.n <= 30;
}

function toParts(m) {
  const parts = [];
  if (m.text) parts.push({ text: String(m.text).slice(0, 4000) });
  (m.images || []).slice(0, 2).forEach(img => {
    const mt = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(String(img));
    if (mt && mt[2].length < 6 * 1024 * 1024) {
      parts.push({ inlineData: { mimeType: mt[1], data: mt[2] } });
    }
  });
  return parts;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!rateOk(req)) return res.status(429).json({ error: 'Çok hızlısın, biraz bekle. 🙂' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Yapay zeka anahtarı eksik.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!msgs.length) return res.status(400).json({ error: 'empty' });
    const contents = [];
    msgs.forEach(m => {
      if (m.role !== 'user' && m.role !== 'model') return;
      const parts = toParts(m);
      if (parts.length) contents.push({ role: m.role === 'model' ? 'model' : 'user', parts });
    });
    if (!contents.length) return res.status(400).json({ error: 'empty' });
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'Sen YKS öğrencilerine yardım eden sabırlı bir koçsun. Her zaman Türkçe cevap ver. Soruları adım adım, sade ve anlaşılır şekilde çöz; sonunda kısa bir özet ve benzer sorular için bir ipucu ver. Kullanıcı soru fotoğrafı gönderirse görüntüyü dikkatle oku ve gördüğün soruyu çöz; okuyamadığın yer olursa bunu açıkça söyle.' }] },
          contents,
          generationConfig: Object.assign(
            { temperature: 0.7, maxOutputTokens: Math.min(Number(body.maxTokens) || 2048, 8192) },
            body.json ? { responseMimeType: 'application/json' } : {}
          ),
        }),
      }
    );
    const j = await r.json();
    if (!r.ok) {
      const msg = (j && j.error && j.error.message) || ('Gemini ' + r.status);
      return res.status(502).json({ error: String(msg).slice(0, 300) });
    }
    const parts = ((((j.candidates || [])[0] || {}).content || {}).parts || []);
    const text = parts.map(p => p.text || '').join('').trim();
    return res.status(200).json({ reply: text || 'Cevap alınamadı, tekrar dene.' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e).slice(0, 200) });
  }
};

module.exports.config = { maxDuration: 30 };
