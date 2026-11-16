// explain-risk Edge Function (Deno). Explains PII findings in plain pt-BR using Claude.
//
// Secrets to set (names only, never commit values):
//   ANTHROPIC_API_KEY          optional; without it the function answers with fixed templates
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by the runtime.
//
// Privacy: the request carries only allowlisted ids ({rule_id, severity, sink, action, count}).
// No user text, preview or identifier ever reaches the prompt. Bodies, prompts and model
// output are never logged.
//
// This file is excluded from the app's tsconfig (Deno runtime, jsr/npm imports).

import Anthropic from 'npm:@anthropic-ai/sdk@1';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  MAX_AI_ITEMS,
  MODEL,
  PROMPT_VERSION,
  SCHEMA,
  SYSTEM_PT_BR,
  buildPrompt,
  cacheKey,
  containsSensitive,
  parseRequest,
  templateFor,
  validateModelJson,
  type ExplainItem,
  type RuleItem,
} from './logic.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

type AiResult = { items: ExplainItem[]; servedByFallback: boolean } | null;

async function askClaude(apiKey: string, misses: RuleItem[]): Promise<AiResult> {
  const prompt = buildPrompt(misses);
  if (containsSensitive(prompt)) return null;
  try {
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20000 });
    const params = {
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PT_BR,
      messages: [{ role: 'user', content: prompt }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01'],
    };
    // deno-lint-ignore no-explicit-any
    const res: any = await (client.beta.messages as any).create(params);
    if (res?.stop_reason === 'refusal') return null;
    const block = Array.isArray(res?.content) ? res.content.find((b: { type: string }) => b.type === 'text') : null;
    if (!block || typeof block.text !== 'string') return null;
    const valid = validateModelJson(block.text, misses);
    if (!valid) return null;
    const iterations = Array.isArray(res?.usage?.iterations) ? res.usage.iterations : [];
    const servedByFallback = iterations.some((i: { type?: string }) => i?.type === 'fallback_message');
    return { items: valid, servedByFallback };
  } catch {
    console.error('explain-risk: chamada ao modelo falhou');
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'metodo nao permitido' });

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization');
  if (!url || !anon || !authHeader) return json(401, { error: 'nao autenticado' });

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json(401, { error: 'nao autenticado' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'corpo invalido' });
  }
  const parsed = parseRequest(body);
  if (!parsed.ok) return json(400, { error: parsed.error });

  // um item representativo por rule_id (a explicacao e por regra)
  const byRule = new Map<string, RuleItem>();
  for (const it of parsed.items) if (!byRule.has(it.rule_id)) byRule.set(it.rule_id, it);
  const reps = [...byRule.values()];

  const results = new Map<string, ExplainItem>();
  const admin = service ? createClient(url, service) : null;

  if (admin) {
    try {
      const keys = reps.map((r) => cacheKey(r));
      const { data } = await admin.from('security_ai_cache').select('fingerprint,payload').in('fingerprint', keys);
      for (const row of data ?? []) {
        const rep = reps.find((r) => cacheKey(r) === row.fingerprint);
        const p = row.payload as ExplainItem | null;
        if (rep && p && typeof p.titulo === 'string') results.set(rep.rule_id, { ...p, source: 'ai' });
      }
    } catch {
      console.error('explain-risk: leitura do cache falhou');
    }
  }

  const misses = reps.filter((r) => !results.has(r.rule_id));
  const toAsk = misses.slice(0, MAX_AI_ITEMS);
  let model: string | undefined;
  let servedByFallback = false;

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (apiKey && toAsk.length > 0) {
    const ai = await askClaude(apiKey, toAsk);
    if (ai) {
      model = MODEL;
      servedByFallback = ai.servedByFallback;
      for (const it of ai.items) results.set(it.rule_id, it);
      if (admin) {
        try {
          const rows = ai.items.map((it) => {
            const rep = toAsk.find((r) => r.rule_id === it.rule_id)!;
            return {
              fingerprint: cacheKey(rep),
              rule_id: it.rule_id,
              payload: it,
              model: MODEL,
              source: 'ai',
              prompt_version: PROMPT_VERSION,
            };
          });
          await admin.from('security_ai_cache').upsert(rows, { onConflict: 'fingerprint' });
        } catch {
          console.error('explain-risk: gravacao do cache falhou');
        }
      }
    }
  }

  const items = reps.map((r) => results.get(r.rule_id) ?? templateFor(r));
  return json(200, { items, model, servedByFallback });
});
