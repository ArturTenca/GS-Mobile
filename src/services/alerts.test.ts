import { getAlert, listAlerts, updateAlertStatus } from '@/services/alerts';
import { ServiceError } from '@/services/ServiceError';

type Result = { data?: unknown; error?: unknown };

const mockResults: Record<string, Result[]> = {};
let mockCalls: Array<[string, unknown[]]> = [];
let mockQueryCount = 0;

function mockBuilder(table: string) {
  mockQueryCount += 1;
  const b: Record<string, unknown> = {};
  const next = (): Promise<Result> =>
    Promise.resolve(mockResults[table]?.shift() ?? { data: null, error: null });
  for (const m of ['select', 'order', 'limit', 'eq', 'update', 'neq', 'in']) {
    b[m] = (...args: unknown[]) => {
      mockCalls.push([m, args]);
      return b;
    };
  }
  b.maybeSingle = next;
  b.single = next;
  b.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) => next().then(res, rej);
  return b;
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => mockBuilder(t) },
}));

const NOW = Date.parse('2026-11-12T12:00:00.000Z');
const H = 3_600_000;
const iso = (t: number) => new Date(t).toISOString();
const ID = '123e4567-e89b-42d3-a456-426614174000';

function alertRow(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    property_id: 'p1',
    category: 'temperature_high',
    severity: 'critical',
    status: 'novo',
    title: 'Temperatura alta',
    description: 'desc',
    recommendation: 'rec',
    triggered_at: iso(NOW - 20 * H),
    is_demo: true,
    sensors: { name: 'Temp', planting_areas: { name: 'Horta' } },
    ...over,
  };
}

beforeEach(() => {
  for (const k of Object.keys(mockResults)) delete mockResults[k];
  mockQueryCount = 0;
  mockCalls = [];
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => jest.restoreAllMocks());

describe('getAlert', () => {
  it('returns null without querying for a malformed id', async () => {
    expect(await getAlert('not-a-uuid')).toBeNull();
    expect(await getAlert("1' or '1'='1")).toBeNull();
    expect(mockQueryCount).toBe(0);
  });

  it('returns null when no row is visible', async () => {
    mockResults.alerts = [{ data: null, error: null }];
    expect(await getAlert(ID)).toBeNull();
  });

  it('shifts the triggered_at of a demo alert by the demo offset', async () => {
    mockResults.alerts = [{ data: alertRow(), error: null }];
    // freshest demo reading is 10h old -> offset = 10h - 3min
    mockResults.readings = [{ data: { recorded_at: iso(NOW - 10 * H) }, error: null }];
    const a = await getAlert(ID);
    expect(a!.triggeredAt).toBe(iso(NOW - 20 * H + 10 * H - 3 * 60_000));
    expect(a!.sensorName).toBe('Temp');
    expect(a!.areaName).toBe('Horta');
  });

  it('does not shift a non-demo alert', async () => {
    mockResults.alerts = [{ data: alertRow({ is_demo: false, sensors: null }), error: null }];
    const a = await getAlert(ID);
    expect(a!.triggeredAt).toBe(iso(NOW - 20 * H));
    expect(a!.sensorName).toBeNull();
    expect(a!.areaName).toBeNull();
    expect(mockQueryCount).toBe(1);
  });

  it('throws a ServiceError without raw text on query error', async () => {
    mockResults.alerts = [{ data: null, error: { message: 'permission denied for table alerts' } }];
    const err = await getAlert(ID).catch((e) => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.message).not.toMatch(/permission|table/);
    expect((err as ServiceError).cause).toBeDefined();
  });
});

describe('listAlerts', () => {
  const PID = '123e4567-e89b-42d3-a456-426614174001';

  it('returns [] for a malformed property id without querying', async () => {
    await expect(listAlerts('nope')).resolves.toEqual([]);
    expect(mockQueryCount).toBe(0);
  });

  it('sorts critical before warning, then newest first', async () => {
    mockResults.alerts = [
      {
        data: [
          alertRow({ id: 'w', severity: 'warning', is_demo: false, triggered_at: iso(NOW - H) }),
          alertRow({ id: 'c1', severity: 'critical', is_demo: false, triggered_at: iso(NOW - 5 * H) }),
          alertRow({ id: 'c2', severity: 'critical', is_demo: false, triggered_at: iso(NOW - 2 * H) }),
        ],
        error: null,
      },
    ];
    const out = await listAlerts(PID);
    expect(out.map((x) => x.id)).toEqual(['c2', 'c1', 'w']);
  });

  it('shifts demo rows by the demo offset and leaves real rows untouched', async () => {
    mockResults.alerts = [
      {
        data: [
          alertRow({ id: 'd', is_demo: true, triggered_at: iso(NOW - 20 * H) }),
          alertRow({ id: 'r', is_demo: false, severity: 'warning', triggered_at: iso(NOW - 20 * H) }),
        ],
        error: null,
      },
    ];
    mockResults.readings = [{ data: { recorded_at: iso(NOW - 10 * H) }, error: null }];
    const out = await listAlerts(PID);
    expect(out.find((x) => x.id === 'd')!.triggeredAt).toBe(iso(NOW - 20 * H + 10 * H - 3 * 60_000));
    expect(out.find((x) => x.id === 'r')!.triggeredAt).toBe(iso(NOW - 20 * H));
  });

  it('flattens sensor and area names', async () => {
    mockResults.alerts = [{ data: [alertRow({ is_demo: false, sensor_id: 's1' })], error: null }];
    const [item] = await listAlerts(PID);
    expect(item.sensorId).toBe('s1');
    expect(item.sensorName).toBe('Temp');
    expect(item.areaName).toBe('Horta');
  });

  it('wraps a Supabase error in a ServiceError', async () => {
    mockResults.alerts = [{ data: null, error: { message: 'boom' } }];
    await expect(listAlerts(PID)).rejects.toBeInstanceOf(ServiceError);
  });
});

describe('updateAlertStatus', () => {
  const MSG = 'Não foi possível atualizar o alerta. Verifique sua internet e tente de novo.';

  it('guards visualizado with status = novo', async () => {
    mockResults.alerts = [{ data: null, error: null }];
    await updateAlertStatus(ID, 'visualizado');
    expect(mockCalls).toContainEqual(['eq', ['status', 'novo']]);
    expect(mockCalls).toContainEqual(['update', [{ status: 'visualizado' }]]);
  });

  it('resolves resolvido when a row comes back', async () => {
    mockResults.alerts = [{ data: { id: ID }, error: null }];
    await expect(updateAlertStatus(ID, 'resolvido')).resolves.toBeUndefined();
    expect(mockCalls).not.toContainEqual(['eq', ['status', 'novo']]);
  });

  it('fails resolvido with a ServiceError on zero rows', async () => {
    mockResults.alerts = [{ data: null, error: null }];
    const err = await updateAlertStatus(ID, 'resolvido').catch((e) => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.message).toBe(MSG);
  });

  it('rejects an invalid uuid without calling supabase', async () => {
    await expect(updateAlertStatus('x', 'resolvido')).rejects.toBeInstanceOf(ServiceError);
    expect(mockQueryCount).toBe(0);
  });
});

describe('getAlert evidence', () => {
  it('maps the violating reading, current threshold and shifted times', async () => {
    mockResults.alerts = [
      {
        data: alertRow({
          sensor_id: 's1',
          reading_id: 7,
          sensors: {
            name: 'Temp',
            type: 'temperature',
            unit: '°C',
            last_seen_at: iso(NOW - 15 * H),
            planting_areas: { name: 'Horta' },
          },
        }),
        error: null,
      },
    ];
    mockResults.readings = [
      { data: { recorded_at: iso(NOW - 10 * H) }, error: null },
      { data: { value: '38.5', recorded_at: iso(NOW - 12 * H) }, error: null },
    ];
    mockResults.thresholds = [
      { data: [{ sensor_type: 'temperature', min_value: null, max_value: '35' }], error: null },
    ];
    const a = await getAlert(ID);
    expect(a!.readingValue).toBe(38.5);
    expect(a!.readingAt).toBe(iso(NOW - 12 * H + 10 * H - 3 * 60_000));
    expect(a!.unit).toBe('°C');
    expect(a!.threshold).toEqual({ min: null, max: 35 });
    expect(a!.sensorType).toBe('temperature');
    expect(a!.lastSeenAt).toBe(iso(NOW - 15 * H + 10 * H - 3 * 60_000));
  });

  it('returns null evidence when no reading is found', async () => {
    mockResults.alerts = [
      {
        data: alertRow({
          is_demo: false,
          sensor_id: 's1',
          sensors: { name: 'Temp', type: 'temperature', planting_areas: null },
        }),
        error: null,
      },
    ];
    mockResults.readings = [{ data: null, error: null }];
    mockResults.thresholds = [{ data: [], error: null }];
    const a = await getAlert(ID);
    expect(a!.readingValue).toBeNull();
    expect(a!.readingAt).toBeNull();
    expect(a!.threshold).toBeNull();
  });
});
