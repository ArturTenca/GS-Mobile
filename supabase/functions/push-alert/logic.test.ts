import {
  buildMessage,
  chunk,
  extractAlertId,
  redactForPush,
  shouldNotify,
  type AlertForPush,
  type PushPrefs,
} from './logic';

import { fakeEmail, fakeJwt, fakeSupabaseSecret, formatCpf, makeCpf, makeLuhn, makeRng } from '../../../src/security/pii/fixtures';

const ID = '123e4567-e89b-12d3-a456-426614174000';

const alert: AlertForPush = {
  id: ID,
  category: 'soil_moisture_low',
  severity: 'critical',
  title: 'Umidade do solo baixa',
  notified_at: null,
  is_demo: false,
};
const prefs: PushPrefs = { notify_enabled: true, notify_categories: ['soil_moisture_low', 'heavy_rain'] };
const tokens = ['ExponentPushToken[abc]'];

describe('extractAlertId', () => {
  it('accepts the trigger shape', () => {
    expect(extractAlertId({ alert_id: ID })).toBe(ID);
  });
  it('accepts the webhook shape', () => {
    expect(extractAlertId({ type: 'INSERT', table: 'alerts', record: { id: ID } })).toBe(ID);
  });
  it('rejects non-uuid values', () => {
    expect(extractAlertId({ alert_id: 'nope' })).toBeNull();
  });
  it('rejects other shapes', () => {
    expect(extractAlertId(null)).toBeNull();
    expect(extractAlertId('x')).toBeNull();
    expect(extractAlertId({})).toBeNull();
    expect(extractAlertId({ record: 5 })).toBeNull();
  });
});

describe('shouldNotify', () => {
  it('is true for an eligible alert', () => {
    expect(shouldNotify({ alert, prefs, tokens })).toBe(true);
  });
  it('is true for warning', () => {
    expect(shouldNotify({ alert: { ...alert, severity: 'warning' }, prefs, tokens })).toBe(true);
  });
  it('is false for info', () => {
    expect(shouldNotify({ alert: { ...alert, severity: 'info' }, prefs, tokens })).toBe(false);
  });
  it('is false when already notified', () => {
    expect(shouldNotify({ alert: { ...alert, notified_at: '2026-01-01T00:00:00Z' }, prefs, tokens })).toBe(false);
  });
  it('is false when notifications disabled', () => {
    expect(shouldNotify({ alert, prefs: { ...prefs, notify_enabled: false }, tokens })).toBe(false);
  });
  it('is false when category not enabled', () => {
    expect(shouldNotify({ alert: { ...alert, category: 'temperature_high' }, prefs, tokens })).toBe(false);
  });
  it('is false without tokens or prefs', () => {
    expect(shouldNotify({ alert, prefs, tokens: [] })).toBe(false);
    expect(shouldNotify({ alert, prefs: null, tokens })).toBe(false);
  });
});

describe('buildMessage', () => {
  it('builds critical copy', () => {
    const m = buildMessage({ token: 't', alert, propertyName: 'Fazenda Boa Safra', placeName: 'Talhão Norte' });
    expect(m.to).toBe('t');
    expect(m.title).toBe('Crítico: Umidade do solo baixa');
    expect(m.body).toBe('Fazenda Boa Safra · Talhão Norte. Toque para ver o que fazer.');
    expect(m.data).toEqual({ alertId: ID });
    expect(m.channelId).toBe('alertas');
    expect(m.sound).toBe('default');
  });
  it('uses Atenção for warning', () => {
    const m = buildMessage({ token: 't', alert: { ...alert, severity: 'warning' }, propertyName: 'F', placeName: 'S' });
    expect(m.title.startsWith('Atenção: ')).toBe(true);
  });
  it('marks demo alerts', () => {
    const m = buildMessage({ token: 't', alert: { ...alert, is_demo: true }, propertyName: 'F', placeName: 'S' });
    expect(m.body).toBe('F · S. Toque para ver o que fazer. (dados demonstrativos)');
  });
});

describe('chunk', () => {
  it('splits into groups of at most 100', () => {
    const parts = chunk(Array.from({ length: 250 }, (_, i) => i), 100);
    expect(parts.map((p) => p.length)).toEqual([100, 100, 50]);
  });
  it('returns empty for empty', () => {
    expect(chunk([], 100)).toEqual([]);
  });
});

describe('push redaction (D-04)', () => {
  const rng = makeRng(99);
  const cpf = formatCpf(makeCpf(rng));
  const card = makeLuhn(rng);

  it('masks a phone in propertyName', () => {
    const m = buildMessage({ token: 't', alert, propertyName: 'Sítio 11 99999-8888', placeName: 'S' });
    expect(m.body).toContain('[telefone oculto]');
    expect(m.body).not.toContain('99999');
  });
  it('masks a CPF in the alert title', () => {
    const m = buildMessage({ token: 't', alert: { ...alert, title: `Alerta ${cpf}` }, propertyName: 'F', placeName: 'S' });
    expect(m.title).toBe('Crítico: Alerta [documento oculto]');
  });
  it('masks e-mail and card', () => {
    expect(redactForPush(`fale com ${fakeEmail()}`)).toBe('fale com [e-mail oculto]');
    expect(redactForPush(`cartao ${card}`)).toBe('cartao [cartão oculto]');
  });
  it('masks secrets', () => {
    expect(redactForPush(fakeJwt())).toBe('[segredo oculto]');
    expect(redactForPush(fakeSupabaseSecret())).toBe('[segredo oculto]');
    expect(redactForPush('sk-' + 'Zq8Lm2Xv9TrKp4Wd7NcHj3Bf6Ys1Ge5U')).toBe('[segredo oculto]');
  });
  it('leaves normal text untouched', () => {
    expect(redactForPush('Umidade do solo baixa 23,5°C 80%')).toBe('Umidade do solo baixa 23,5°C 80%');
    expect(redactForPush('111.111.111-11')).toBe('111.111.111-11');
  });
});
