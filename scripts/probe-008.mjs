// Anon-key REST probe for migration 008. Never prints the URL, the key or any header.
// Usage: node --env-file-if-exists=.env scripts/probe-008.mjs
// (Node loads the .env file into the process; this script does not echo it.)

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !key) {
  console.error('Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no ambiente');
  process.exit(2);
}

const base = url.replace(/\/+$/, '');
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function call(method, path, body) {
  try {
    const res = await fetch(`${base}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, code: json && typeof json === 'object' ? json.code : undefined, json };
  } catch {
    return { status: 0, code: 'NETWORK', json: null };
  }
}

function report(label, pass, status, reason) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label} (HTTP ${status}) - ${reason}`);
  return pass;
}

const results = [];

// a) alerts: anon sees nothing (RLS) -> 200 with [] or 401
{
  const r = await call('GET', 'alerts?select=id,notified_at&limit=1');
  if (r.code === '42703') results.push(report('a) alerts.notified_at', false, r.status, '008 nao aplicada (coluna ausente)'));
  else if (r.status === 401 || r.status === 403) results.push(report('a) alerts.notified_at', true, r.status, 'negado para anon'));
  else if (r.status === 200 && Array.isArray(r.json) && r.json.length === 0)
    results.push(report('a) alerts.notified_at', true, r.status, 'coluna existe; anon nao ve linhas'));
  else results.push(report('a) alerts.notified_at', false, r.status, 'resposta inesperada'));
}

// b) producers.notify_enabled: column exists, anon sees no rows
{
  const r = await call('GET', 'producers?select=notify_enabled,notify_categories&limit=1');
  if (r.status === 404 || r.code === '42703') results.push(report('b) producers.notify_*', false, r.status, '008 nao aplicada (coluna ausente)'));
  else if (r.status === 401 || r.status === 403) results.push(report('b) producers.notify_*', true, r.status, 'negado para anon'));
  else if (r.status === 200 && Array.isArray(r.json) && r.json.length === 0)
    results.push(report('b) producers.notify_*', true, r.status, 'colunas existem; anon nao ve linhas'));
  else results.push(report('b) producers.notify_*', false, r.status, 'resposta inesperada'));
}

// c) PATCH alerts.notified_at must be rejected (no grant / RLS)
{
  const r = await call('PATCH', 'alerts?id=eq.00000000-0000-0000-0000-000000000000', { notified_at: new Date().toISOString() });
  if (r.status === 401 || r.status === 403 || r.code === '42501')
    results.push(report('c) PATCH alerts.notified_at negado', true, r.status, 'negado para anon'));
  else if (r.status === 200 || r.status === 204) results.push(report('c) PATCH alerts.notified_at negado', false, r.status, 'SEGURANCA: anon conseguiu escrever'));
  else results.push(report('c) PATCH alerts.notified_at negado', false, r.status, 'resposta inesperada'));
}

// d) thresholds readable endpoint, anon sees nothing
{
  const r = await call('GET', 'thresholds?select=id&limit=1');
  if (r.status === 200 && Array.isArray(r.json) && r.json.length === 0) results.push(report('d) thresholds', true, r.status, 'anon nao ve linhas'));
  else if (r.status === 401 || r.status === 403) results.push(report('d) thresholds', true, r.status, 'negado para anon'));
  else results.push(report('d) thresholds', false, r.status, 'resposta inesperada'));
}

process.exit(results.every(Boolean) ? 0 : 1);
