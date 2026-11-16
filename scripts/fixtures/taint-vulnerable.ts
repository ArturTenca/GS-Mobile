// FIXTURE do detector de taint (Fase 04.2, D-05). Este arquivo vaza dados DE PROPOSITO para
// provar que o rastreador (scripts/taint-audit.mjs --self-test) os encontra. Nunca e importado
// pelo app. As funcoes `leaky*` devem gerar fluxos "unsafe"; as `guarded*` nao.
import { sanitizeFreeText } from '../../src/lib/security/sanitize.ts';
import { redact } from '../../src/security/pii/engine.ts';
import { sanitizeCause, taint, unwrapFor } from '../../src/security/taint/sinks.ts';

type FormValues = { street: string; city: string; name: string };

// Copia ingenua do ServiceError real: guarda a causa sem sanitizar.
class ServiceError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export function leakyConsole(values: FormValues): void {
  console.log('endereco', values.street);
}

export async function leakyFetch(values: FormValues): Promise<void> {
  await fetch(`https://example.invalid/search?q=${values.city}`);
}

export function leakyCause(values: FormValues): never {
  throw new ServiceError('falha ao salvar', values.name);
}

export function guardedConsole(values: FormValues): void {
  console.log('endereco', redact(values.street));
}

export async function guardedFetch(values: FormValues): Promise<void> {
  const safe = unwrapFor('geocode_http', taint(values.city, 'user_input'), { origin: 'fixture.city' });
  await fetch(`https://example.invalid/search?q=${safe}`);
}

export function guardedCause(values: FormValues): never {
  throw new ServiceError('falha ao salvar', sanitizeCause(values.name));
}

export async function guardedFreeText(values: FormValues): Promise<void> {
  await fetch(`https://example.invalid/search?q=${sanitizeFreeText(values.street, { max: 80 })}`);
}
