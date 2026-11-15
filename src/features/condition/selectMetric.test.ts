import { selectMetric } from './selectMetric';
import type { DeriveSensor, ThresholdMap } from './types';

const now = Date.parse('2026-11-12T15:00:00.000Z');
const MIN = 60_000;
const H = 60 * MIN;
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

const thresholds: ThresholdMap = {
  temperature: { min: 10, max: 35 },
  soil_moisture: { min: 30, max: 80 },
  air_humidity: { min: 30, max: 85 },
};

function s(id: string, value: number | null, over: Partial<DeriveSensor> = {}): DeriveSensor {
  return {
    id,
    name: `Sensor ${id}`,
    type: 'temperature',
    areaName: `Area ${id}`,
    lastSeenAt: iso(MIN),
    latest: value == null ? null : { value, recordedAt: iso(MIN) },
    ...over,
  };
}

describe('selectMetric', () => {
  it('worst out-of-range online sensor wins, status atencao', () => {
    const r = selectMetric('temperature', [s('a', 36), s('b', 45), s('c', 25)], thresholds, now);
    expect(r.status).toBe('atencao');
    expect(r.value).toBe(45);
    expect(r.display).toBe('45,0');
    expect(r.unit).toBe('°C');
    expect(r.context).toBe('Area b');
  });

  it('falls back to sensor name when no area', () => {
    const r = selectMetric('temperature', [s('a', 50, { areaName: null })], thresholds, now);
    expect(r.context).toBe('Sensor a');
  });

  it('mean of online when all in range, "Média de n sensores"', () => {
    const r = selectMetric('temperature', [s('a', 20), s('b', 25)], thresholds, now);
    expect(r.status).toBe('normal');
    expect(r.value).toBeCloseTo(22.5);
    expect(r.display).toBe('22,5');
    expect(r.context).toBe('Média de 2 sensores');
  });

  it('n=1 uses area name', () => {
    const r = selectMetric('temperature', [s('a', 20)], thresholds, now);
    expect(r.status).toBe('normal');
    expect(r.context).toBe('Area a');
  });

  it('humidity is rounded to integer', () => {
    const r = selectMetric(
      'air_humidity',
      [s('a', 60.4, { type: 'air_humidity' }), s('b', 61.2, { type: 'air_humidity' })],
      thresholds,
      now,
    );
    expect(r.display).toBe('61');
    expect(r.unit).toBe('%');
  });

  it('none online -> semDados', () => {
    const stale = s('a', 99, { lastSeenAt: iso(50 * H), latest: { value: 99, recordedAt: iso(50 * H) } });
    const r = selectMetric('temperature', [stale], thresholds, now);
    expect(r).toEqual({
      value: null,
      display: '—',
      unit: '',
      status: 'semDados',
      context: 'Nenhum sensor online',
    });
  });

  it('ignores other sensor types and stale out-of-range values', () => {
    const stale = s('a', 99, { lastSeenAt: iso(50 * H), latest: { value: 99, recordedAt: iso(50 * H) } });
    const soil = s('b', 5, { type: 'soil_moisture' });
    const r = selectMetric('temperature', [stale, soil, s('c', 22)], thresholds, now);
    expect(r.status).toBe('normal');
    expect(r.value).toBe(22);
  });
});
