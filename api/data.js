const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
};

async function sb(path, method = 'GET', body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  const text = await r.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
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
