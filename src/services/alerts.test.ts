import { getAlert } from '@/services/alerts';
import { ServiceError } from '@/services/ServiceError';

type Result = { data?: unknown; error?: unknown };

const mockResults: Record<string, Result[]> = {};
let mockQueryCount = 0;

function mockBuilder(table: string) {
  mockQueryCount += 1;
  const b: Record<string, unknown> = {};
  const next = (): Promise<Result> =>
    Promise.resolve(mockResults[table]?.shift() ?? { data: null, error: null });
  for (const m of ['select', 'order', 'limit', 'eq']) b[m] = () => b;
  b.maybeSingle = next;
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
