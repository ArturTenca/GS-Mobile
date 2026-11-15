import { createFarm, listFarms } from '@/services/farms';
import { ServiceError } from '@/services/ServiceError';

type Result = { data?: unknown; error?: unknown };
type Call = { op: string; payload?: unknown };

const mockResults: Result[] = [];
const mockCalls: Call[] = [];
const mockGetUser = jest.fn();

function mockBuilder() {
  const b: Record<string, unknown> = {};
  const next = (): Promise<Result> => {
    const r = mockResults.shift() ?? { data: null, error: null };
    if (r.error === 'throw') return Promise.reject(new Error('network'));
    return Promise.resolve(r);
  };
  for (const m of ['select', 'order', 'eq']) b[m] = () => b;
  b.insert = (payload: unknown) => {
    mockCalls.push({ op: 'insert', payload });
    return b;
  };
  b.single = next;
  b.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) => next().then(res, rej);
  return b;
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => mockBuilder(), auth: { getUser: () => mockGetUser() } },
}));

const points = [
  { lat: -22.9, lng: -47.1 },
  { lat: -22.9, lng: -47.0 },
  { lat: -22.8, lng: -47.0 },
];
const input = {
  id: 'f1',
  name: 'Sítio',
  cep: '13000000',
  address: 'Rua A',
  neighborhood: 'Centro',
  city: 'Campinas',
  state: 'SP',
  mainCrop: 'Milho',
  points,
};
const SAVE = 'Não foi possível salvar a fazenda. Verifique sua internet e toque em Salvar fazenda de novo.';

beforeEach(() => {
  mockResults.length = 0;
  mockCalls.length = 0;
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
});

describe('listFarms', () => {
  it('coerces numeric fields and keeps boundary', async () => {
    const boundary = { type: 'Polygon', coordinates: [] };
    mockResults.push({
      data: [{ id: 'a', boundary, area_ha: '12.5', center_lat: '-22.9', center_lng: -47 }],
      error: null,
    });
    const r = await listFarms();
    expect(r[0].area_ha).toBe(12.5);
    expect(r[0].center_lat).toBe(-22.9);
    expect(r[0].boundary).toBe(boundary);
  });
  it('throws friendly error', async () => {
    mockResults.push({ data: null, error: { message: 'x' } });
    await expect(listFarms()).rejects.toBeInstanceOf(ServiceError);
  });
});

describe('createFarm', () => {
  it('inserts without server-computed fields and with [lng,lat] GeoJSON', async () => {
    mockResults.push({ data: { id: 'f1', area_ha: '3' }, error: null });
    const farm = await createFarm(input);
    expect(farm.area_ha).toBe(3);
    const payload = mockCalls[0].payload as Record<string, unknown>;
    expect(payload.is_demo).toBe(false);
    expect(payload.owner_id).toBe('u1');
    expect('area_ha' in payload).toBe(false);
    expect('center_lat' in payload).toBe(false);
    expect('center_lng' in payload).toBe(false);
    const b = payload.boundary as { coordinates: number[][][] };
    expect(b.coordinates[0][0][0]).toBe(-47.1);
    expect(b.coordinates[0][0][1]).toBe(-22.9);
  });
  it('throws save error on empty result', async () => {
    mockResults.push({ data: null, error: null });
    await expect(createFarm(input)).rejects.toThrow(SAVE);
  });
  it('maps 23514 to the boundary message', async () => {
    mockResults.push({ data: null, error: { code: '23514' } });
    await expect(createFarm(input)).rejects.toThrow('O limite da fazenda não é válido.');
  });
  it('re-reads the existing row on 23505', async () => {
    mockResults.push({ data: null, error: { code: '23505' } });
    mockResults.push({ data: { id: 'f1', name: 'Sítio' }, error: null });
    await expect(createFarm(input)).resolves.toMatchObject({ id: 'f1' });
  });
  it('wraps network exceptions', async () => {
    mockResults.push({ error: 'throw' });
    await expect(createFarm(input)).rejects.toThrow(SAVE);
  });
  it('fails without a signed-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(createFarm(input)).rejects.toThrow(SAVE);
  });
});
