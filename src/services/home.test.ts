import { getHomeOverview } from '@/services/home';
import { ServiceError } from '@/services/ServiceError';

type Result = { data?: unknown; error?: unknown };

const mockResults: Record<string, Result[]> = {};
const mockEqCalls: Record<string, [string, unknown][]> = {};

function mockBuilder(table: string) {
  const b: Record<string, unknown> = {};
  const next = (): Promise<Result> => {
    const r = mockResults[table]?.shift() ?? { data: null, error: null };
    if (r.error === 'throw') return Promise.reject(new Error('network'));
    return Promise.resolve(r);
  };
  for (const m of ['select', 'order', 'limit', 'neq']) b[m] = () => b;
  b.eq = (col: string, val: unknown) => {
    (mockEqCalls[table] ??= []).push([col, val]);
    return b;
  };
  b.maybeSingle = next;
  b.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) => next().then(res, rej);
  return b;
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => mockBuilder(t) },
}));

const NOW = Date.parse('2026-11-12T12:00:00.000Z');
const H = 3_600_000;
const iso = (t: number) => new Date(t).toISOString();

function seed(over: Partial<Record<string, Result>> = {}) {
  mockResults.sensors = [
    over.sensors ?? {
      data: [
        {
          id: 's1',
          name: 'Temp',
          type: 'temperature',
          unit: 'C',
          area_id: 'a1',
          last_seen_at: iso(NOW - 10 * H),
          is_demo: true,
          planting_areas: { name: 'Horta' },
        },
        {
          id: 's2',
          name: 'Solo Pomar',
          type: 'soil_moisture',
          unit: '%',
          area_id: 'a2',
          last_seen_at: iso(NOW - 62 * H),
          is_demo: true,
          planting_areas: [{ name: 'Pomar' }],
        },
        { id: 's3', name: 'Real', type: 'air_humidity', unit: '%', area_id: null,
          last_seen_at: iso(NOW - 5 * H), is_demo: false, planting_areas: null },
      ],
      error: null,
    },
  ];
  mockResults.latest_readings = [
    over.latest_readings ?? {
      data: [
        { sensor_id: 's1', recorded_at: iso(NOW - 10 * H), value: '28.5', is_demo: true },
        { sensor_id: 's2', recorded_at: iso(NOW - 62 * H), value: 30, is_demo: true },
        { sensor_id: 's3', recorded_at: iso(NOW - 5 * H), value: 70, is_demo: false },
      ],
      error: null,
    },
  ];
  mockResults.thresholds = [
    over.thresholds ?? {
      data: [{ sensor_type: 'temperature', min_value: '10', max_value: '35' }],
      error: null,
    },
  ];
  mockResults.alerts = [
    over.alerts ?? {
      data: [
        { id: 'a-info', sensor_id: null, category: 'heavy_rain', severity: 'info', status: 'novo',
          title: 'i', description: '', recommendation: null, triggered_at: iso(NOW - 1 * H), is_demo: true },
        { id: 'a-crit', sensor_id: 's1', category: 'temperature_high', severity: 'critical', status: 'novo',
          title: 'c', description: '', recommendation: 'x', triggered_at: iso(NOW - 20 * H), is_demo: true },
      ],
      error: null,
    },
  ];
  mockResults.climate_snapshots = [
    over.climate_snapshots ?? {
      data: {
        condition: 'sol', description: 'Ensolarado', temperature_c: '27.5', humidity_pct: 60,
        rain_probability_pct: 10, observed_at: iso(NOW - 10 * H), is_demo: true,
      },
      error: null,
    },
  ];
}

beforeEach(() => {
  for (const k of Object.keys(mockResults)) delete mockResults[k];
  for (const k of Object.keys(mockEqCalls)) delete mockEqCalls[k];
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => jest.restoreAllMocks());

describe('getHomeOverview', () => {
  it('shifts demo rows once with one offset and leaves non-demo rows alone', async () => {
    seed();
    const o = await getHomeOverview('p1');
    expect(o.asOf).toBe(NOW);
    // freshest demo reading is 10h old -> offset = 10h - 3min
    const s1 = o.sensors.find((s) => s.id === 's1')!;
    expect(Date.parse(s1.latest!.recordedAt)).toBe(NOW - 3 * 60_000);
    expect(s1.latest!.value).toBe(28.5);
    const s3 = o.sensors.find((s) => s.id === 's3')!;
    expect(s3.lastSeenAt).toBe(iso(NOW - 5 * H));
    expect(s3.latest!.recordedAt).toBe(iso(NOW - 5 * H));
    expect(s3.areaName).toBeNull();
    expect(typeof s3.isDemo).toBe('boolean');
    expect(o.thresholds.temperature).toEqual({ min: 10, max: 35 });
  });

  it('keeps the Pomar-style sensor more than 2h behind asOf', async () => {
    seed();
    const o = await getHomeOverview('p1');
    const s2 = o.sensors.find((s) => s.id === 's2')!;
    expect(s2.areaName).toBe('Pomar');
    expect(o.asOf - Date.parse(s2.latest!.recordedAt)).toBeGreaterThan(2 * H);
    expect(o.asOf - Date.parse(s2.lastSeenAt!)).toBeGreaterThan(2 * H);
  });

  it('resolves with climate error when only the climate query fails', async () => {
    seed({ climate_snapshots: { data: null, error: { message: 'boom' } } });
    const o = await getHomeOverview('p1');
    expect(o.climate).toEqual({ status: 'error' });
    expect(o.sensors).toHaveLength(3);
  });

  it('treats a thrown climate query as climate error', async () => {
    seed({ climate_snapshots: { error: 'throw' } });
    const o = await getHomeOverview('p1');
    expect(o.climate).toEqual({ status: 'error' });
  });

  it('throws a ServiceError without raw text when latest_readings is missing', async () => {
    seed({
      latest_readings: { data: null, error: { message: 'relation "latest_readings" does not exist' } },
    });
    const err = await getHomeOverview('p1').catch((e) => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.message).not.toMatch(/relation|latest_readings/);
    expect((err as ServiceError).cause).toBeDefined();
  });

  it('sorts unresolved alerts critical first', async () => {
    seed();
    const o = await getHomeOverview('p1');
    expect(o.alerts.map((a) => a.id)).toEqual(['a-crit', 'a-info']);
    expect(o.alerts[0].sensorId).toBe('s1');
  });

  it('shifts nothing when there is no demo reading', async () => {
    seed({
      sensors: {
        data: [
          { id: 's3', name: 'Real', type: 'air_humidity', unit: '%', area_id: null,
            last_seen_at: iso(NOW - 5 * H), is_demo: false, planting_areas: null },
        ],
        error: null,
      },
      latest_readings: {
        data: [{ sensor_id: 's3', recorded_at: iso(NOW - 5 * H), value: 70, is_demo: false }],
        error: null,
      },
      alerts: { data: [], error: null },
      climate_snapshots: { data: null, error: null },
    });
    const o = await getHomeOverview('p1');
    expect(o.sensors[0].lastSeenAt).toBe(iso(NOW - 5 * H));
    expect(o.sensors[0].latest!.recordedAt).toBe(iso(NOW - 5 * H));
    expect(o.climate).toEqual({ status: 'ok', data: null });
  });

  it('filters thresholds and climate_snapshots by property_id explicitly', async () => {
    seed();
    await getHomeOverview('prop-9');
    expect(mockEqCalls.thresholds).toContainEqual(['property_id', 'prop-9']);
    expect(mockEqCalls.climate_snapshots).toContainEqual(['property_id', 'prop-9']);
    expect(mockEqCalls.alerts).toContainEqual(['property_id', 'prop-9']);
  });
});
