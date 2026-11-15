import {
  buildMessage,
  chunk,
  extractAlertId,
  shouldNotify,
  type AlertForPush,
  type PushPrefs,
} from './logic';

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
