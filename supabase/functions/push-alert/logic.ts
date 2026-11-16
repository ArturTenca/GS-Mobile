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

// ---------------------------------------------------------------------------
// Redacao de dados pessoais para a notificacao (D-04, sink push_payload).
// Subconjunto compacto do motor src/security/pii (a funcao nao pode importar de
// src/); o teste pushParity.test.ts garante concordancia com o motor.
// Redige, nao bloqueia: o alerta precisa chegar ao produtor.
// ---------------------------------------------------------------------------

const DDDS = new Set(
  '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(
    ' ',
  ),
);

function onlyDigits(v: string): number[] {
  return v
    .replace(/\D/g, '')
    .split('')
    .filter((c) => c !== '')
    .map(Number);
}

function validCpf(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 11 || d.every((x) => x === d[0])) return false;
  for (let t = 9; t < 11; t += 1) {
    let sum = 0;
    for (let i = 0; i < t; i += 1) sum += d[i] * (t + 1 - i);
    if (((sum * 10) % 11) % 10 !== d[t]) return false;
  }
  return true;
}

function validCnpj(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 14 || d.every((x) => x === d[0])) return false;
  const calc = (w: number[]): number => {
    let sum = 0;
    for (let i = 0; i < w.length; i += 1) sum += d[i] * w[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === d[12] && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === d[13];
}

function validCard(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i -= 1) {
    let x = d[i];
    if (dbl) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    sum += x;
    dbl = !dbl;
  }
  if (sum % 10 !== 0) return false;
  const p2 = Number(d.slice(0, 2).join(''));
  const p4 = Number(d.slice(0, 4).join(''));
  return (
    d[0] === 4 ||
    (p2 >= 51 && p2 <= 55) ||
    (p4 >= 2221 && p4 <= 2720) ||
    [34, 37, 36, 38, 35, 50, 65, 63].includes(p2) ||
    p4 === 6011
  );
}

function validPhone(v: string): boolean {
  let digits = v.replace(/\D/g, '');
  if (/^\+?55/.test(v.trim()) && digits.length >= 12) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (!DDDS.has(digits.slice(0, 2))) return false;
  return digits.length === 10 || digits[2] === '9';
}

function validEmailTld(v: string): boolean {
  return /^[A-Za-z]{2,}$/.test(v.slice(v.lastIndexOf('.') + 1));
}

export function redactForPush(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return '';
  let out = text.normalize('NFKC').slice(0, 2000);
  const when = (re: RegExp, ok: (m: string) => boolean, label: string) => {
    out = out.replace(re, (m) => (ok(m) ? label : m));
  };
  const SECRET = '[segredo oculto]';
  out = out.replace(/eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, SECRET);
  out = out.replace(/sk-ant-[A-Za-z0-9_-]{20,}/g, SECRET);
  out = out.replace(/\bsk-(?:proj-)?[A-Za-z0-9]{20,}\b|\bAKIA[0-9A-Z]{16}\b|\bsb_secret_[A-Za-z0-9_-]{20,}/g, SECRET);
  when(/[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,3}/g, validEmailTld, '[e-mail oculto]');
  when(/(?<!\d)\d{2}[. ]?\d{3}[. ]?\d{3}[/ ]?\d{4}[- ]?\d{2}(?!\d)/g, validCnpj, '[documento oculto]');
  when(/(?<!\d)\d{3}[. ]?\d{3}[. ]?\d{3}[- ]?\d{2}(?!\d)/g, validCpf, '[documento oculto]');
  when(/(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g, validCard, '[cartão oculto]');
  when(/(?<!\d)(?:\+?55[ ]?)?\(?[1-9][0-9]\)?[ ]?9?\d{4}[- ]?\d{4}(?!\d)/g, validPhone, '[telefone oculto]');
  return out;
}

export function buildMessage(input: {
  token: string;
  alert: AlertForPush;
  propertyName: string;
  placeName: string;
}): PushMessage {
  const { token, alert } = input;
  const propertyName = redactForPush(input.propertyName);
  const placeName = redactForPush(input.placeName);
  const alertTitle = redactForPush(alert.title);
  const label = SEVERITY_LABEL[alert.severity] ?? 'Atenção';
  let body = `${propertyName} · ${placeName}. Toque para ver o que fazer.`;
  if (alert.is_demo) body += ' (dados demonstrativos)';
  return {
    to: token,
    title: `${label}: ${alertTitle}`,
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
