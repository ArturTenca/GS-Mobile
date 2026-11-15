import { DEFAULT_PERIOD, PERIODS } from '@/features/charts/periods';
import { countOutOfRange, downsample, seriesStats } from '@/features/charts/series';

const H = 3_600_000;

describe('PERIODS', () => {
  it('defines 24h, 7d and 30d with buckets, labels and a11y text', () => {
    expect(PERIODS['24h']).toMatchObject({ ms: 24 * H, bucketMs: H, label: '24 horas', a11y: 'últimas 24 horas', showDots: true });
    expect(PERIODS['7d']).toMatchObject({ ms: 7 * 24 * H, bucketMs: 3 * H, label: '7 dias', a11y: 'últimos 7 dias', showDots: false });
    expect(PERIODS['30d']).toMatchObject({ ms: 30 * 24 * H, bucketMs: 6 * H, label: '30 dias', a11y: 'últimos 30 dias', showDots: false });
    expect(DEFAULT_PERIOD).toBe('7d');
  });
});

describe('downsample', () => {
  it('returns empty for empty input', () => {
    expect(downsample([], H)).toEqual([]);
  });
  it('returns a single point unchanged', () => {
    expect(downsample([{ t: 5 * H, v: 7 }], 3 * H)).toEqual([{ t: 5 * H, v: 7 }]);
  });
  it('averages per bucket, keeps first t and order', () => {
    const pts = [0, 1, 2, 3, 4, 5].map((i) => ({ t: i * H, v: i * 10 }));
    expect(downsample(pts, 3 * H)).toEqual([
      { t: 0, v: 10 },
      { t: 3 * H, v: 40 },
    ]);
  });
  it('hourly data with hourly buckets is identity', () => {
    const pts = [0, 1, 2].map((i) => ({ t: i * H, v: i }));
    expect(downsample(pts, H)).toEqual(pts);
  });
});

describe('seriesStats', () => {
  it('is null for empty', () => {
    expect(seriesStats([])).toBeNull();
  });
  it('computes min, max, mean and latest', () => {
    expect(seriesStats([10, 20, 30])).toEqual({ min: 10, max: 30, mean: 20, latest: 30 });
    expect(seriesStats([30, 10, 20])).toEqual({ min: 10, max: 30, mean: 20, latest: 20 });
  });
});

describe('countOutOfRange', () => {
  it('counts values outside both bounds', () => {
    expect(countOutOfRange([5, 15, 25], { min: 10, max: 20 })).toBe(2);
  });
  it('treats bounds as inside', () => {
    expect(countOutOfRange([10, 20], { min: 10, max: 20 })).toBe(0);
  });
  it('ignores null bounds', () => {
    expect(countOutOfRange([5, 15, 25], { min: null, max: 20 })).toBe(1);
    expect(countOutOfRange([5, 15, 25], { min: 10, max: null })).toBe(1);
    expect(countOutOfRange([5, 15, 25], { min: null, max: null })).toBe(0);
    expect(countOutOfRange([5, 15, 25], undefined)).toBe(0);
  });
});
