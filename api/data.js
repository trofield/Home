import https from 'https';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

function httpsRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(data));
        else resolve(data ? JSON.parse(data) : []);
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const reqHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
};

async function sb(path, method = 'GET', body = null) {
  return httpsRequest(`${SUPABASE_URL}/rest/v1/${path}`, method, reqHeaders, body);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, table, id, data } = req.body || {};

  try {
    if (req.method === 'GET' || action === 'get') {
      const t = req.query?.table || table;
      const rows = await sb(`${t}?order=created_at.asc`);
      return res.status(200).json(rows);
    }
    if (action === 'insert') {
      const rows = await sb(table, 'POST', data);
      return res.status(200).json(rows);
    }
    if (action === 'update') {
      const rows = await sb(`${table}?id=eq.${id}`, 'PATCH', data);
      return res.status(200).json(rows);
    }
    if (action === 'delete') {
      await sb(`${table}?id=eq.${id}`, 'DELETE');
      return res.status(200).json({ ok: true });
    }
    if (action === 'upsert_state') {
      const rows = await sb('app_state', 'POST', { key: data.key, value: data.value, updated_at: new Date().toISOString() });
      return res.status(200).json(rows);
    }
    if (action === 'get_state') {
      const rows = await sb(`app_state?key=eq.${data.key}`);
      return res.status(200).json(rows[0] || null);
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
