import { computeDemoOffset, DEMO_FRESHNESS_MS, shiftDemoRow, shiftTs } from './demoTime';

const now = Date.parse('2026-11-12T15:00:00.000Z');
const H = 3_600_000;

describe('demoTime (D-08)', () => {
  it('no demo reading -> offset 0 and rows unchanged', () => {
    expect(computeDemoOffset(null, now)).toBe(0);
    expect(computeDemoOffset('not-a-date', now)).toBe(0);
    const row = { is_demo: true, recorded_at: '2026-11-10T10:00:00.000Z' };
    expect(shiftDemoRow(row, ['recorded_at'], 0, now).recorded_at).toBe('2026-11-10T10:00:00.000Z');
  });

  it('freshest reading maps to now - 3 min', () => {
    const latest = new Date(now - 30 * H).toISOString();
    const offset = computeDemoOffset(latest, now);
    expect(Date.parse(shiftTs(latest, offset, now)!)).toBe(now - DEMO_FRESHNESS_MS);
  });

  it('a reading 52 h older than the freshest stays > 2 h old', () => {
    const latestMs = now - 30 * H;
    const offset = computeDemoOffset(new Date(latestMs).toISOString(), now);
    const pomar = shiftTs(new Date(latestMs - 52 * H).toISOString(), offset, now)!;
    expect(now - Date.parse(pomar)).toBeGreaterThan(2 * H);
  });

  it('clamps to now', () => {
    const latestMs = now - 30 * H;
    const offset = computeDemoOffset(new Date(latestMs).toISOString(), now);
    const future = shiftTs(new Date(latestMs + 5 * H).toISOString(), offset, now)!;
    expect(Date.parse(future)).toBe(now);
  });

  it('never shifts into the past', () => {
    expect(computeDemoOffset(new Date(now + H).toISOString(), now)).toBe(0);
  });

  it('non-demo rows are untouched', () => {
    const row = { is_demo: false, recorded_at: '2026-11-01T00:00:00.000Z' };
    const out = shiftDemoRow(row, ['recorded_at'], 5 * H, now);
    expect(out).toBe(row);
    expect(out.recorded_at).toBe('2026-11-01T00:00:00.000Z');
  });

  it('shifts demo rows and passes null/invalid through', () => {
    const row = { is_demo: true, a: '2026-11-11T00:00:00.000Z', b: null as string | null };
    const out = shiftDemoRow(row, ['a', 'b'], H, now);
    expect(out.a).toBe('2026-11-11T01:00:00.000Z');
    expect(out.b).toBeNull();
    expect(shiftTs('garbage', H, now)).toBe('garbage');
    expect(shiftTs(null, H, now)).toBeNull();
  });
});
