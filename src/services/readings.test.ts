import { getDemoOffset, listSensorHistory } from '@/services/readings';
import { listThresholds } from '@/services/thresholds';

type Result = { data?: unknown; error?: unknown };
const mockResults: Result[] = [];
const mockCalls: { table: string; method: string; args: unknown[] }[] = [];

function mockBuilder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'gte', 'limit']) {
    b[m] = (...args: unknown[]) => {
      mockCalls.push({ table, method: m, args });
      return b;
    };
  }
  b.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(mockResults.shift() ?? { data: null, error: null }).then(res, rej);
  return b;
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => mockBuilder(t), rpc: jest.fn() },
}));

const NOW = Date.parse('2026-11-12T12:00:00.000Z');
const H = 3_600_000;

beforeEach(() => {
  mockResults.length = 0;
  mockCalls.length = 0;
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getDemoOffset', () => {
  it('uses the freshest demo reading of the property', async () => {
    mockResults.push({
      data: [
        { sensor_id: 's1', recorded_at: '2026-11-10T10:00:00.000Z', is_demo: true },
        { sensor_id: 's2', recorded_at: '2026-11-10T11:00:00.000Z', is_demo: true },
        { sensor_id: 's3', recorded_at: '2026-11-12T11:59:00.000Z', is_demo: false },
      ],
      error: null,
    });
    const offset = await getDemoOffset('p1');
    // now - 3 min freshness - latest demo
    expect(offset).toBe(NOW - 3 * 60_000 - Date.parse('2026-11-10T11:00:00.000Z'));
    expect(mockCalls).toContainEqual({ table: 'latest_readings', method: 'eq', args: ['property_id', 'p1'] });
  });

  it('returns 0 without demo rows', async () => {
    mockResults.push({ data: [{ sensor_id: 's3', recorded_at: '2026-11-01T00:00:00.000Z', is_demo: false }], error: null });
    await expect(getDemoOffset('p1')).resolves.toBe(0);
    mockResults.push({ data: [], error: null });
    await expect(getDemoOffset('p1')).resolves.toBe(0);
  });

  it('throws a friendly error', async () => {
    mockResults.push({ data: null, error: { message: 'boom' } });
    await expect(getDemoOffset('p1')).rejects.toThrow('Não foi possível carregar as leituras.');
  });
});

describe('listSensorHistory', () => {
  it('queries one sensor ascending with a 1000-row cap and an anchored window', async () => {
    mockResults.push({ data: [], error: null });
    await listSensorHistory('s1', 24 * H, 2 * H);
    expect(mockCalls).toEqual([
      { table: 'readings', method: 'select', args: ['recorded_at,value,is_demo'] },
      { table: 'readings', method: 'eq', args: ['sensor_id', 's1'] },
      { table: 'readings', method: 'gte', args: ['recorded_at', new Date(NOW - 24 * H - 2 * H).toISOString()] },
      { table: 'readings', method: 'order', args: ['recorded_at', { ascending: true }] },
      { table: 'readings', method: 'limit', args: [1000] },
    ]);
  });

  it('maps, coerces, shifts demo rows, drops invalid values and sorts', async () => {
    const offset = 2 * H;
    mockResults.push({
      data: [
        { recorded_at: new Date(NOW - 5 * H).toISOString(), value: '21.5', is_demo: true },
        { recorded_at: new Date(NOW - 4 * H).toISOString(), value: 'abc', is_demo: true },
        { recorded_at: new Date(NOW - 4 * H).toISOString(), value: null, is_demo: true },
        { recorded_at: new Date(NOW - 1 * H).toISOString(), value: 30, is_demo: true },
        { recorded_at: new Date(NOW - 4 * H).toISOString(), value: 18, is_demo: false },
      ],
      error: null,
    });
    const pts = await listSensorHistory('s1', 24 * H, offset);
    expect(pts).toEqual([
      { t: NOW - 4 * H, v: 18, isDemo: false },
      { t: NOW - 3 * H, v: 21.5, isDemo: true },
      // NOW - 1h + 2h would be in the future: clamped to now
      { t: NOW, v: 30, isDemo: true },
    ]);
  });

  it('throws a friendly error', async () => {
    mockResults.push({ data: null, error: { message: 'boom' } });
    await expect(listSensorHistory('s1', H, 0)).rejects.toThrow('Não foi possível carregar as leituras.');
  });
});

describe('listThresholds', () => {
  it('builds a ThresholdMap with numeric coercion', async () => {
    mockResults.push({
      data: [
        { sensor_type: 'temperature', min_value: '10', max_value: 32 },
        { sensor_type: 'humidity', min_value: null, max_value: '85.5' },
      ],
      error: null,
    });
    await expect(listThresholds('p1')).resolves.toEqual({
      temperature: { min: 10, max: 32 },
      humidity: { min: null, max: 85.5 },
    });
    expect(mockCalls).toContainEqual({ table: 'thresholds', method: 'eq', args: ['property_id', 'p1'] });
  });

  it('throws a friendly error', async () => {
    mockResults.push({ data: null, error: { message: 'boom' } });
    await expect(listThresholds('p1')).rejects.toThrow('Não foi possível carregar os limites.');
  });
});
