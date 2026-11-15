import { chartDomain } from '@/features/charts/domain';

function step(d: { min: number; max: number; sections: number }) {
  return (d.max - d.min) / d.sections;
}

describe('chartDomain', () => {
  it('includes thresholds and pads 10% on each side', () => {
    const d = chartDomain([20, 30], { min: 10, max: 32 });
    expect(d.sections).toBe(4);
    expect(d.min).toBeLessThanOrEqual(10 - 2.2);
    expect(d.max).toBeGreaterThanOrEqual(32 + 2.2);
    expect(Number.isInteger(step(d))).toBe(true);
  });

  it('uses only values when there is no range', () => {
    const d = chartDomain([20, 30], undefined);
    expect(d.min).toBeLessThanOrEqual(19);
    expect(d.max).toBeGreaterThanOrEqual(31);
    expect(d.min).toBeGreaterThan(0);
    expect(d.sections).toBe(4);
  });

  it('ignores null bounds', () => {
    const d = chartDomain([20, 30], { min: null, max: 50 });
    expect(d.max).toBeGreaterThanOrEqual(50 + 3);
    expect(d.min).toBeLessThanOrEqual(20 - 3);
  });

  it('clamps percent domains to 0..100', () => {
    const d = chartDomain([2, 99], { min: 30, max: 80 }, { clampPercent: true });
    expect(d.min).toBe(0);
    expect(d.max).toBe(100);
    const e = chartDomain([40, 95], undefined, { clampPercent: true });
    expect(e.min).toBeGreaterThanOrEqual(0);
    expect(e.max).toBeLessThanOrEqual(100);
    expect(e.min).toBeLessThanOrEqual(40);
    expect(e.max).toBeGreaterThanOrEqual(95);
    expect(e.sections).toBe(4);
  });

  it('gives a constant series a non-zero span', () => {
    const d = chartDomain([20, 20, 20], undefined);
    expect(d.max - d.min).toBeGreaterThan(0);
    expect(d.min).toBeLessThan(20);
    expect(d.max).toBeGreaterThan(20);
  });

  it('uses thresholds when there are no values', () => {
    const d = chartDomain([], { min: 10, max: 30 });
    expect(d.min).toBeLessThanOrEqual(10);
    expect(d.max).toBeGreaterThanOrEqual(30);
  });

  it('handles negative values', () => {
    const d = chartDomain([-5, 3], undefined);
    expect(d.min).toBeLessThanOrEqual(-5.8);
    expect(d.max).toBeGreaterThanOrEqual(3.8);
  });

  it('returns a finite default for no data at all', () => {
    const d = chartDomain([], undefined);
    expect(Number.isFinite(d.min)).toBe(true);
    expect(d.max).toBeGreaterThan(d.min);
  });
});
