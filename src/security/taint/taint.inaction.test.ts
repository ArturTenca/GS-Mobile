// Evidencia "em acao" (D-05): fluxos reais com valores sinteticos gerados.
import { resetGeocodingCache, resolveLocation } from '@/services/geocoding';
import { ServiceError } from '@/services/ServiceError';
import { getForecast } from '@/services/weather';

import { fakeEmail, formatCpf, makeCpf, makeRng } from '../pii/fixtures.ts';
import { clearEvents, drainEvents } from './events.ts';
import { TaintBlockedError, guardSink, safeLog } from './sinks.ts';

const cpf = formatCpf(makeCpf(makeRng(21)));
const cpfDigits = cpf.replace(/\D/g, '');
const email = fakeEmail();

beforeEach(() => {
  clearEvents();
  resetGeocodingCache();
});

describe('taint em acao', () => {
  it('blocks a CPF typed in Endereco before Nominatim and continues the chain', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [{ lat: '-21.42', lon: '-45.95' }],
    }));
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    const res = await resolveLocation({ street: `Rua X ${cpf}`, city: 'Alfenas', state: 'MG' });
    const urls = fetchMock.mock.calls.map((c) => String((c as unknown[])[0]));
    for (const u of urls) {
      expect(u).not.toContain(cpfDigits);
      expect(decodeURIComponent(u)).not.toContain(cpf);
    }
    // a etapa da rua foi pulada; a cidade resolveu
    expect(res.precision).toBe('city');
    const events = drainEvents();
    const blocked = events.find((e) => e.ruleId === 'cpf');
    expect(blocked).toMatchObject({ action: 'blocked', origin: 'farm.street', sink: 'geocode_http' });
    expect(JSON.stringify(events)).not.toContain(cpfDigits);
  });

  it('redacts e-mail in safeLog', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    safeLog('warn', `contato ${email}`, { owner: email });
    const printed = JSON.stringify(spy.mock.calls);
    expect(printed).not.toContain(email);
    expect(printed).toContain('***');
    spy.mockRestore();
  });

  it('strips ServiceError cause to name only', () => {
    const err = new ServiceError('Falha', new Error(`detalhe ${cpf} ${email}`));
    expect(err.cause).toEqual({ name: 'Error' });
    expect(JSON.stringify(err.cause)).not.toContain(cpfDigits);
  });

  it('rounds weather coordinates and records a location event', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    await getForecast(-21.123456, -45.987654).catch(() => undefined);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('latitude=-21.12&longitude=-45.99');
    expect(url).not.toContain('123456');
    const events = drainEvents();
    expect(events.some((e) => e.category === 'location' && e.action === 'redacted')).toBe(true);
  });

  it('blocks LLM prompt with PII and records only a masked preview', () => {
    expect(() => guardSink('llm_prompt', `Explique ${cpf}`, { origin: 'prompt' })).toThrow(TaintBlockedError);
    const events = drainEvents();
    expect(events[0].preview).toBe(`***.***.***-${cpfDigits.slice(-2)}`);
    expect(JSON.stringify(events)).not.toContain(cpfDigits);
  });
});
