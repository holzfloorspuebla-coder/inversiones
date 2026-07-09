const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY;
const API_KEY          = process.env.API_KEY;
const GMAIL_USER       = process.env.GMAIL_USER;
const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const RESEND_TO        = process.env.RESEND_TO || GMAIL_USER;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── GET /data ─────────────────────────────────────────────────────────────────
app.get('/data', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('portfolio')
      .select('data, updated_at')
      .eq('id', 'main')
      .single();
    if (error) throw error;
    res.json({ data: data.data, updated_at: data.updated_at });
  } catch (err) {
    console.error('GET /data error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /data ─────────────────────────────────────────────────────────────────
app.put('/data', auth, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const { error } = await supabase
      .from('portfolio')
      .upsert({ id: 'main', data: payload, updated_at: new Date().toISOString() });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /data error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Backup por email vía Resend ───────────────────────────────────────────────
async function sendBackup() {
  try {
    const { data, error } = await supabase
      .from('portfolio')
      .select('data, updated_at')
      .eq('id', 'main')
      .single();
    if (error) throw error;

    const date = new Date().toISOString().slice(0, 10);
    const json = JSON.stringify(data.data, null, 2);
    const base64 = Buffer.from(json).toString('base64');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'backup@resend.dev',
        to: [process.env.RESEND_TO || GMAIL_USER],
        subject: `📊 Backup Portfolio ${date}`,
        text: `Backup automático del ${date}.\nÚltima actualización: ${data.updated_at}`,
        attachments: [{
          filename: `portfolio_${date}.json`,
          content: base64
        }]
      })
    });

    const result = await res.json();
    if (res.ok) {
      console.log(`✅ Backup enviado: ${date}`);
    } else {
      console.error('❌ Error Resend:', result);
    }
  } catch (err) {
    console.error('❌ Error en backup:', err);
  }
}

// Cron: todos los días a las 23:00 hora Ciudad de México
cron.schedule('0 23 * * *', sendBackup, { timezone: 'America/Mexico_City' });

// ── GET /backup — trigger manual ──────────────────────────────────────────────
app.get('/backup', auth, async (req, res) => {
  await sendBackup();
  res.json({ ok: true, message: 'Backup enviado' });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
