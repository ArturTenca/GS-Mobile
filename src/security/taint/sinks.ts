import { redact, redactDeep, scan } from '../pii/engine.ts';
import type { Finding } from '../pii/engine.ts';
import { recordEvent } from './events.ts';
import { SINK_POLICY } from './policy.ts';
import type { SinkId } from './policy.ts';

// Guardas de runtime nos sinks (D-04/D-05). Nada aqui guarda o valor original:
// eventos e erros carregam apenas ids de regra e previas mascaradas.

export const BLOCKED_MESSAGE =
  'Esse texto parece conter um dado pessoal (CPF, telefone ou similar). Remova antes de continuar.';

export class TaintBlockedError extends Error {
  readonly sink: SinkId;
  readonly ruleIds: string[];

  constructor(sink: SinkId, ruleIds: string[]) {
    super(BLOCKED_MESSAGE);
    this.name = 'TaintBlockedError';
    this.sink = sink;
    this.ruleIds = ruleIds;
  }
}

export type GuardContext = { origin: string };
export type GuardResult<T> = { payload: T; blocked: boolean; findings: number };

function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (typeof value === 'string') out.push(value);
  else if (depth < 20 && value !== null && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) collectStrings(item, out, depth + 1);
  }
}

// Verifica o valor contra a politica do sink: bloqueia (lanca), mascara ou deixa passar.
export function guardSink<T>(sink: SinkId, payload: T, ctx: GuardContext): GuardResult<T> {
  const policy = SINK_POLICY[sink];
  if (policy.action === 'allow' || policy.categories.length === 0) {
    return { payload, blocked: false, findings: 0 };
  }
  const texts: string[] = [];
  collectStrings(payload, texts);
  const all: Finding[] = [];
  for (const text of texts) all.push(...scan(text, { categories: policy.categories }));
  if (all.length === 0) return { payload, blocked: false, findings: 0 };

  const action = policy.action === 'block' ? 'blocked' : 'redacted';
  for (const f of all) {
    recordEvent({
      ruleId: f.ruleId,
      category: f.category,
      severity: f.severity,
      sink,
      origin: ctx.origin,
      action,
      preview: f.preview,
    });
  }
  if (policy.action === 'block') {
    throw new TaintBlockedError(sink, Array.from(new Set(all.map((f) => f.ruleId))));
  }
  const cleaned =
    typeof payload === 'string'
      ? (redact(payload, undefined, { categories: policy.categories }) as unknown as T)
      : redactDeep(payload, { categories: policy.categories });
  return { payload: cleaned, blocked: false, findings: all.length };
}

export type Tainted<T> = { __tainted: true; value: T; source: string };

export function taint<T>(value: T, source: string): Tainted<T> {
  return { __tainted: true, value, source };
}

// Unico caminho para extrair um valor contaminado: passa pela guarda do sink.
export function unwrapFor<T>(sink: SinkId, tainted: Tainted<T>, ctx?: Partial<GuardContext>): T {
  return guardSink(sink, tainted.value, { origin: ctx?.origin ?? tainted.source }).payload;
}

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

function safeArg(arg: unknown): unknown {
  if (arg instanceof Error) return arg.name;
  if (typeof arg === 'string') return redact(arg);
  if (arg !== null && typeof arg === 'object') return redactDeep(arg);
  return arg;
}

// UNICO ponto autorizado a chamar console no app (regra no-console do ESLint).
export function safeLog(level: LogLevel, message: string, ...args: unknown[]): void {
  const safe = args.map(safeArg);
  const text = redact(message);
  console[level](text, ...safe);
}

export function assertAllowedUrl(url: string, hosts: readonly string[]): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('URL invalida.');
  }
  if (parsed.protocol !== 'https:') throw new Error('Somente https e permitido.');
  if (!hosts.includes(parsed.hostname)) throw new Error('Host nao permitido.');
  return parsed;
}

// Garante no maximo 2 casas decimais (cerca de 1 km) antes de enviar a um terceiro.
export function assertCoarseCoord(n: number, origin: string): number {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) > 1e-7) {
    recordEvent({
      ruleId: 'geo_precise',
      category: 'location',
      severity: 'high',
      sink: 'weather_http',
      origin,
      action: 'redacted',
      preview: '[REDACTED:geo_precise]',
    });
  }
  return rounded;
}

// Reduz a causa de um erro a {name, code}: sem mensagem, sem detalhes.
export function sanitizeCause(cause: unknown): { name: string; code?: string } | undefined {
  if (cause === undefined || cause === null) return undefined;
  const rec = typeof cause === 'object' ? (cause as Record<string, unknown>) : null;
  const name = rec && typeof rec.name === 'string' ? rec.name.slice(0, 60) : 'Error';
  const code = rec && typeof rec.code === 'string' ? rec.code.slice(0, 60) : undefined;
  return code !== undefined ? { name, code } : { name };
}
