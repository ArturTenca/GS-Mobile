// Pure decision/message logic for the push-alert Edge Function.
// Plain TypeScript on purpose: no Deno, jsr or npm dependencies, so jest can run it.

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Duplicated from src/components/alerts/alertMeta.ts (the function cannot read src).
export const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico',
  warning: 'Atenção',
};

export type AlertForPush = {
  id: string;
  category: string;
  severity: string;
  title: string;
  notified_at: string | null;
  is_demo: boolean;
};

export type PushPrefs = {
  notify_enabled: boolean;
  notify_categories: string[] | null;
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { alertId: string };
  channelId: 'alertas';
  sound: 'default';
};

export function extractAlertId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  let candidate: unknown = b.alert_id;
  if (candidate === undefined && b.record && typeof b.record === 'object') {
    candidate = (b.record as Record<string, unknown>).id;
  }
  return typeof candidate === 'string' && UUID_RE.test(candidate) ? candidate : null;
}

export function shouldNotify(input: {
  alert: AlertForPush;
  prefs: PushPrefs | null;
  tokens: string[];
}): boolean {
  const { alert, prefs, tokens } = input;
  if (alert.severity !== 'warning' && alert.severity !== 'critical') return false;
  if (alert.notified_at) return false;
  if (!prefs || !prefs.notify_enabled) return false;
  if (!(prefs.notify_categories ?? []).includes(alert.category)) return false;
  return tokens.length > 0;
}

export function buildMessage(input: {
  token: string;
  alert: AlertForPush;
  propertyName: string;
  placeName: string;
}): PushMessage {
  const { token, alert, propertyName, placeName } = input;
  const label = SEVERITY_LABEL[alert.severity] ?? 'Atenção';
  let body = `${propertyName} · ${placeName}. Toque para ver o que fazer.`;
  if (alert.is_demo) body += ' (dados demonstrativos)';
  return {
    to: token,
    title: `${label}: ${alert.title}`,
    body,
    data: { alertId: alert.id },
    channelId: 'alertas',
    sound: 'default',
  };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
