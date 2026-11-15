import { listFarmSensors, registerSensor } from '@/services/sensors';

type Result = { data?: unknown; error?: unknown };
const mockResults: Result[] = [];
const mockRpc = jest.fn();

function mockBuilder() {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq']) b[m] = () => b;
  b.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(mockResults.shift() ?? { data: null, error: null }).then(res, rej);
  return b;
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => mockBuilder(), rpc: (...a: unknown[]) => mockRpc(...a) },
}));

const input = { propertyId: 'p1', name: 'S1', type: 'temperature' as const, lat: -22.9, lng: -47.1, radiusM: 100 };

beforeEach(() => {
  mockResults.length = 0;
  mockRpc.mockReset();
});

describe('listFarmSensors', () => {
  it('maps to camelCase with numeric coercion', async () => {
    mockResults.push({
      data: [
        { id: 's1', name: 'A', type: 'temperature', unit: '°C', last_seen_at: null, is_demo: false, lat: '-22.9', lng: -47, coverage_radius_m: '100' },
        { id: 's2', name: 'B', type: 'soil_moisture', unit: '%', last_seen_at: null, is_demo: true, lat: null, lng: null, coverage_radius_m: null },
      ],
      error: null,
    });
    const r = await listFarmSensors('p1');
    expect(r[0]).toMatchObject({ lat: -22.9, lng: -47, coverageRadiusM: 100, isDemo: false });
    expect(r[1]).toMatchObject({ lat: null, lng: null, coverageRadiusM: null });
  });
  it('throws friendly error', async () => {
    mockResults.push({ data: null, error: { message: 'x' } });
    await expect(listFarmSensors('p1')).rejects.toThrow('Não foi possível carregar os sensores.');
  });
});

describe('registerSensor', () => {
  it('calls the rpc and returns the uuid', async () => {
    mockRpc.mockResolvedValue({ data: 'uuid-1', error: null });
    await expect(registerSensor(input)).resolves.toBe('uuid-1');
    expect(mockRpc).toHaveBeenCalledWith('register_sensor', {
      p_property: 'p1',
      p_name: 'S1',
      p_type: 'temperature',
      p_lat: -22.9,
      p_lng: -47.1,
      p_radius_m: 100,
    });
  });
  it('maps 23514', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '23514' } });
    await expect(registerSensor(input)).rejects.toThrow('O ponto precisa estar dentro da fazenda.');
  });
  it('maps 54000', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '54000' } });
    await expect(registerSensor(input)).rejects.toThrow('máximo de 30 sensores');
  });
  it('maps other errors and thrown exceptions to generic', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    await expect(registerSensor(input)).rejects.toThrow('Não foi possível registrar o sensor.');
    mockRpc.mockRejectedValue(new Error('network'));
    await expect(registerSensor(input)).rejects.toThrow('Não foi possível registrar o sensor.');
  });
});
