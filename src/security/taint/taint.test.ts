import { fakeEmail, fakePhone, formatCpf, makeCpf, makeRng } from '../pii/fixtures.ts';
import {
  MAX_BUFFER,
  clearEvents,
  drainEvents,
  fingerprintOf,
  flushEvents,
  peekEvents,
  recordEvent,
  setEventFlusher,
} from './events.ts';
import { SINK_IDS, SINK_POLICY } from './policy.ts';
import {
  TaintBlockedError,
  assertAllowedUrl,
  assertCoarseCoord,
  guardSink,
  safeLog,
  sanitizeCause,
  taint,
  unwrapFor,
} from './sinks.ts';

const cpf = formatCpf(makeCpf(makeRng(7)));
const cpfDigits = cpf.replace(/\D/g, '');
const email = fakeEmail();
const phone = fakePhone();

beforeEach(() => {
  clearEvents();
  setEventFlusher(null);
});

describe('guardSink', () => {
  it('blocks a CPF going to geocode_http and records a masked event', () => {
    let error: unknown;
    try {
      guardSink('geocode_http', `Rua A, CPF ${cpf}`, { origin: 'farm.street' });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(TaintBlockedError);
    const err = error as TaintBlockedError;
    expect(err.ruleIds).toContain('cpf');
    expect(JSON.stringify(err.ruleIds)).not.toContain(cpfDigits);
    expect(err.message).not.toContain(cpfDigits);
    const events = drainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ ruleId: 'cpf', action: 'blocked', origin: 'farm.street', sink: 'geocode_http' });
    expect(events[0].preview).toMatch(/^\*\*\*\.\*\*\*\.\*\*\*-\d{2}$/);
  });

  it('redacts a phone going to push_payload without blocking', () => {
    const res = guardSink('push_payload', `Sitio ${phone}`, { origin: 'alert.title' });
    expect(res.blocked).toBe(false);
    expect(res.payload).not.toContain('98765');
    const events = drainEvents();
    expect(events[0].action).toBe('redacted');
  });

  it('redacts objects deeply for redact sinks', () => {
    const res = guardSink('service_error', { a: { b: [`x ${email}`] } }, { origin: 'e' });
    expect(JSON.stringify(res.payload)).not.toContain(email);
  });

  it('blocks any PII category for llm_prompt and lets plain text pass', () => {
    expect(() => guardSink('llm_prompt', `contato ${email}`, { origin: 'p' })).toThrow(TaintBlockedError);
    expect(() => guardSink('llm_prompt', 'cpf, sensor_offline', { origin: 'p' })).not.toThrow();
  });

  it('lets plain address text through geocode_http and records nothing', () => {
    const res = guardSink('geocode_http', 'Rua das Flores, 45', { origin: 'farm.street' });
    expect(res.payload).toBe('Rua das Flores, 45');
    expect(peekEvents()).toHaveLength(0);
  });

  it('allows everything for db_at_rest', () => {
    expect(guardSink('db_at_rest', email, { origin: 'x' }).payload).toBe(email);
  });

  it('taint/unwrapFor goes through the guard', () => {
    expect(unwrapFor('geocode_http', taint('Rua B', 'user_input'), { origin: 'farm.street' })).toBe('Rua B');
    expect(() => unwrapFor('geocode_http', taint(cpf, 'user_input'), { origin: 'farm.street' })).toThrow(
      TaintBlockedError,
    );
  });

  it('has a policy for every sink id', () => {
    for (const id of SINK_IDS) expect(SINK_POLICY[id]).toBeDefined();
  });
});

describe('events', () => {
  it('merges events with same (rule, sink, origin) and counts occurrences', () => {
    for (let i = 0; i < 2; i += 1) {
      try {
        guardSink('geocode_http', cpf, { origin: 'farm.street' });
      } catch {
        // esperado
      }
    }
    const events = peekEvents();
    expect(events).toHaveLength(1);
    expect(events[0].occurrences).toBe(2);
  });

  it('fingerprintOf is 16 hex chars and depends only on metadata', () => {
    const a = fingerprintOf('cpf', 'console', 'x');
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprintOf('cpf', 'console', 'x')).toBe(a);
    expect(fingerprintOf('cpf', 'console', 'y')).not.toBe(a);
  });

  it('never keeps raw values in serialized events', () => {
    for (const text of [cpf, email, phone]) {
      try {
        guardSink('llm_prompt', text, { origin: 'raw' });
      } catch {
        // esperado
      }
    }
    guardSink('push_payload', `a ${phone} ${email}`, { origin: 'push' });
    const json = JSON.stringify(drainEvents());
    expect(json).not.toContain(cpfDigits);
    expect(json).not.toContain(cpf);
    expect(json).not.toContain(email);
    expect(json).not.toContain('98765-4321');
  });

  it('caps the buffer at MAX_BUFFER distinct events', () => {
    for (let i = 0; i < MAX_BUFFER + 20; i += 1) {
      recordEvent({
        ruleId: 'cpf',
        category: 'identity',
        severity: 'critical',
        sink: 'console',
        origin: `o${i}`,
        action: 'redacted',
        preview: '[REDACTED:cpf]',
      });
    }
    expect(peekEvents()).toHaveLength(MAX_BUFFER);
  });

  it('flushEvents never throws and keeps events when the flusher rejects', async () => {
    recordEvent({
      ruleId: 'cpf',
      category: 'identity',
      severity: 'critical',
      sink: 'console',
      origin: 'o',
      action: 'redacted',
      preview: '[REDACTED:cpf]',
    });
    setEventFlusher(() => Promise.reject(new Error('rede')));
    await expect(flushEvents()).resolves.toBeUndefined();
    expect(peekEvents()).toHaveLength(1);
    const sent: unknown[] = [];
    setEventFlusher((e) => {
      sent.push(...e);
    });
    await flushEvents();
    expect(sent).toHaveLength(1);
    expect(peekEvents()).toHaveLength(0);
  });
});

describe('safeLog', () => {
  it('masks e-mails and reduces Error arguments to the name', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    safeLog('error', 'falha', { email }, new TypeError('boom 123'));
    expect(spy).toHaveBeenCalledTimes(1);
    const printed = JSON.stringify(spy.mock.calls[0]);
    expect(printed).not.toContain(email);
    expect(printed).not.toContain('boom');
    expect(printed).toContain('TypeError');
    spy.mockRestore();
  });
});

describe('url, coordinates and causes', () => {
  const hosts = ['api.open-meteo.com', 'nominatim.openstreetmap.org'];

  it('assertAllowedUrl accepts allowlisted https hosts only', () => {
    expect(assertAllowedUrl('https://api.open-meteo.com/v1/forecast', hosts).hostname).toBe('api.open-meteo.com');
    expect(() => assertAllowedUrl('http://api.open-meteo.com/', hosts)).toThrow();
    expect(() => assertAllowedUrl('javascript:alert(1)', hosts)).toThrow();
    expect(() => assertAllowedUrl('https://evil.example/', hosts)).toThrow();
  });

  it('assertCoarseCoord rounds and records an event only for precise input', () => {
    expect(assertCoarseCoord(-21.12, 'weather.coords')).toBe(-21.12);
    expect(peekEvents()).toHaveLength(0);
    expect(assertCoarseCoord(-21.123456, 'weather.coords')).toBe(-21.12);
    const events = drainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ category: 'location', action: 'redacted' });
  });

  it('sanitizeCause keeps only name and string code', () => {
    expect(sanitizeCause(new Error('row (123.456.789-09)'))).toEqual({ name: 'Error' });
    expect(sanitizeCause({ name: 'PostgrestError', code: '23505', message: 'x', details: 'y' })).toEqual({
      name: 'PostgrestError',
      code: '23505',
    });
    expect(sanitizeCause(undefined)).toBeUndefined();
  });
});
