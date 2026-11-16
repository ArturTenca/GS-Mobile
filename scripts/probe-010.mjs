// Anon-key REST probe for migration 010. Never prints the URL, the key or any header.
// Usage: node --env-file-if-exists=.env scripts/probe-010.mjs

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

const missing = (r) => r.status === 404 || r.code === 'PGRST205' || r.code === 'PGRST202';
const denied = (r) => r.status === 401 || r.status === 403 || r.code === '42501';

const results = [];

// a/b) tabelas: anon ve [] ou e negado; 404/PGRST205 = 010 nao aplicada
for (const [label, table] of [
  ['a) security_events', 'security_events'],
  ['b) security_ai_cache', 'security_ai_cache'],
]) {
  const r = await call('GET', `${table}?select=*&limit=1`);
  if (missing(r)) results.push(report(label, false, r.status, '010 nao aplicada'));
  else if (denied(r)) results.push(report(label, true, r.status, 'negado para anon'));
  else if (r.status === 200 && Array.isArray(r.json) && r.json.length === 0)
    results.push(report(label, true, r.status, 'tabela existe; anon nao ve linhas'));
  else results.push(report(label, false, r.status, 'resposta inesperada'));
}

// c) RPC: anon deve ser negado (404 = funcao ausente = FAIL)
{
  const r = await call('POST', 'rpc/record_security_events', { p_events: [] });
  if (missing(r)) results.push(report('c) rpc record_security_events', false, r.status, '010 nao aplicada'));
  else if (denied(r)) results.push(report('c) rpc record_security_events', true, r.status, 'negado para anon'));
  else results.push(report('c) rpc record_security_events', false, r.status, 'SEGURANCA ou resposta inesperada'));
}

// d) insert direto negado
{
  const r = await call('POST', 'security_events', {
    owner_id: '00000000-0000-0000-0000-000000000000',
    rule_id: 'email',
    category: 'contact',
    severity: 'low',
    sink: 'console',
    origin: 'probe',
    action: 'detected',
    fingerprint: 'probe-fingerprint',
  });
  if (denied(r)) results.push(report('d) insert direto negado', true, r.status, 'negado para anon'));
  else if (missing(r)) results.push(report('d) insert direto negado', false, r.status, '010 nao aplicada'));
  else results.push(report('d) insert direto negado', false, r.status, 'SEGURANCA: anon conseguiu escrever'));
}

// e) properties continua legivel em formato (anon sem linhas ou negado)
{
  const r = await call('GET', 'properties?select=city&limit=1');
  if (r.status === 200 && Array.isArray(r.json)) results.push(report('e) properties.city', true, r.status, 'consulta funciona'));
  else if (denied(r)) results.push(report('e) properties.city', true, r.status, 'negado para anon'));
  else results.push(report('e) properties.city', false, r.status, 'resposta inesperada'));
}

process.exit(results.every(Boolean) ? 0 : 1);
