// Anon-key REST probe for migration 006. Never prints the URL, the key or any header.
// Usage: node --env-file-if-exists=.env scripts/probe-006.mjs
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

function selectCheck(label, r) {
  if (r.status === 200) return report(label, true, r.status, 'colunas novas legiveis');
  if (r.code === '42703') return report(label, false, r.status, '006 nao aplicada (coluna ausente)');
  return report(label, false, r.status, 'resposta inesperada');
}

function denyCheck(label, r) {
  if (r.status === 404 || r.code === 'PGRST202') return report(label, false, r.status, 'funcao ausente (006 nao aplicada)');
  if (r.status === 401 || r.status === 403 || r.code === '42501') return report(label, true, r.status, 'negado para anon');
  if (r.status === 200) return report(label, false, r.status, 'SEGURANCA: anon conseguiu executar');
  return report(label, false, r.status, 'resposta inesperada');
}

const results = [];

results.push(
  selectCheck(
    'a) properties novas colunas',
    await call(
      'GET',
      'properties?select=id,cep,address,neighborhood,main_crop,boundary,center_lat,center_lng,area_ha&limit=1',
    ),
  ),
);
results.push(
  selectCheck('b) sensors novas colunas', await call('GET', 'sensors?select=id,lat,lng,coverage_radius_m&limit=1')),
);
results.push(
  denyCheck(
    'c) register_sensor negado para anon',
    await call('POST', 'rpc/register_sensor', {
      p_property: crypto.randomUUID(),
      p_name: 'probe',
      p_type: 'temperature',
      p_lat: 0,
      p_lng: 0,
      p_radius_m: 50,
    }),
  ),
);
results.push(denyCheck('d) ensure_demo_farm negado para anon', await call('POST', 'rpc/ensure_demo_farm', {})));

process.exit(results.every(Boolean) ? 0 : 1);
