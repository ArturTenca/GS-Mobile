// push-alert Edge Function (Deno). Sends an Expo push for a new warning/critical alert.
//
// Secrets to set (names only, never commit values):
//   PUSH_SHARED_SECRET   required; must match the x-push-secret header sent by the DB trigger
//   EXPO_ACCESS_TOKEN    optional; Expo enhanced push security
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the runtime.
//
// This file is excluded from the app's tsconfig (Deno runtime, jsr imports).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildMessage,
  chunk,
  extractAlertId,
  shouldNotify,
  type AlertForPush,
  type PushPrefs,
} from './logic.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Constant-time comparison of two strings (length leak only).
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

type Named = { name: string } | null;
type AlertRow = AlertForPush & {
  properties: { name: string; owner_id: string } | null;
  sensors: { name: string; planting_areas: Named | Named[] } | null;
};

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // Secret gate: before any database access.
  const expected = Deno.env.get('PUSH_SHARED_SECRET');
  const provided = req.headers.get('x-push-secret');
  if (!expected || !provided || !safeEqual(provided, expected)) {
    return json(401, { error: 'unauthorized' });
  }

  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid_body' });
  }
  const alertId = extractAlertId(payload);
  if (!alertId) return json(400, { error: 'invalid_alert_id' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from('alerts')
    .select(
      'id, category, severity, title, notified_at, is_demo, properties(name, owner_id), sensors(name, planting_areas(name))',
    )
    .eq('id', alertId)
    .maybeSingle();
  if (error) {
    console.error('push-alert: alert load failed', alertId);
    return json(500, { error: 'load_failed' });
  }
  if (!data) return json(404, { error: 'alert_not_found' });

  const alert = data as unknown as AlertRow;
  const property = one(alert.properties);
  if (!property) return json(200, { skipped: true });
  const sensor = one(alert.sensors);
  const areaName = sensor ? one(one(sensor.planting_areas as Named | Named[]))?.name : undefined;
  const placeName = areaName ?? sensor?.name ?? 'sua propriedade';

  const [{ data: prefsRow }, { data: tokenRows }] = await Promise.all([
    supabase
      .from('producers')
      .select('notify_enabled, notify_categories')
      .eq('id', property.owner_id)
      .maybeSingle(),
    supabase.from('push_tokens').select('token').eq('user_id', property.owner_id),
  ]);

  const prefs = (prefsRow ?? null) as PushPrefs | null;
  const tokens = ((tokenRows ?? []) as { token: string }[]).map((t) => t.token);

  if (!shouldNotify({ alert, prefs, tokens })) {
    console.log(`push-alert: skipped alert=${alertId}`);
    return json(200, { skipped: true });
  }

  const messages = tokens.map((token) =>
    buildMessage({ token, alert, propertyName: property.name, placeName }),
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (expoToken) headers['Authorization'] = `Bearer ${expoToken}`;

  let sent = 0;
  const dead: string[] = [];
  for (const group of chunk(messages, 100)) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(group),
      });
      const result = await res.json().catch(() => null);
      const tickets: { status?: string; details?: { error?: string } }[] = result?.data ?? [];
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') sent++;
        else if (ticket.details?.error === 'DeviceNotRegistered') dead.push(group[i].to);
      });
    } catch {
      console.error(`push-alert: expo send failed alert=${alertId}`);
    }
  }

  if (dead.length > 0) {
    await supabase.from('push_tokens').delete().in('token', dead);
  }

  // Mark as notified only once, and only if something was delivered to Expo.
  if (sent > 0) {
    await supabase
      .from('alerts')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', alertId)
      .is('notified_at', null);
  }

  console.log(`push-alert: alert=${alertId} sent=${sent} removed=${dead.length}`);
  return json(200, { sent, removed: dead.length });
});
