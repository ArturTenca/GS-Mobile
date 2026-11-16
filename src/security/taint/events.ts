import type { Category, Severity } from '../pii/engine.ts';
import type { SinkId } from './policy.ts';

// Eventos de seguranca (D-06): so previa mascarada e impressao digital de
// metadados (regra|sink|origem). Nunca o valor, nem hash do valor.

export type SecurityAction = 'blocked' | 'redacted' | 'detected' | 'resolved';

export type SecurityEvent = {
  ruleId: string;
  category: Category;
  severity: Severity;
  sink: SinkId;
  origin: string;
  action: SecurityAction;
  fingerprint: string;
  preview: string;
  occurrences: number;
};

export type EventInput = Omit<SecurityEvent, 'fingerprint' | 'occurrences'>;

export const MAX_BUFFER = 100;

// FNV-1a de 32 bits em duas passadas (sementes diferentes) -> 16 hex.
function fnv(input: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function fingerprintOf(ruleId: string, sink: string, origin: string): string {
  const input = `${ruleId}|${sink}|${origin}`;
  return fnv(input, 2166136261) + fnv(input, 0x9e3779b9);
}

let buffer: SecurityEvent[] = [];

export function recordEvent(input: EventInput): SecurityEvent {
  const fingerprint = fingerprintOf(input.ruleId, input.sink, input.origin);
  const existing = buffer.find((e) => e.fingerprint === fingerprint && e.action === input.action);
  if (existing) {
    existing.occurrences += 1;
    return existing;
  }
  const event: SecurityEvent = { ...input, fingerprint, occurrences: 1 };
  buffer.push(event);
  if (buffer.length > MAX_BUFFER) buffer = buffer.slice(buffer.length - MAX_BUFFER);
  return event;
}

export function peekEvents(): SecurityEvent[] {
  return buffer.map((e) => ({ ...e }));
}

export function drainEvents(): SecurityEvent[] {
  const out = buffer;
  buffer = [];
  return out;
}

export function clearEvents(): void {
  buffer = [];
}

type Flusher = (events: SecurityEvent[]) => Promise<unknown> | unknown;
let flusher: Flusher | null = null;

export function setEventFlusher(fn: Flusher | null): void {
  flusher = fn;
}

// Nunca lanca. Em falha, os eventos permanecem no buffer.
export async function flushEvents(): Promise<void> {
  if (!flusher || buffer.length === 0) return;
  const batch = buffer.map((e) => ({ ...e }));
  try {
    await flusher(batch);
    buffer = buffer.slice(batch.length);
  } catch {
    // mantem o buffer para a proxima tentativa
  }
}
