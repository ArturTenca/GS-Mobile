import { getProducer } from '@/services/producers';
import { getCurrentProperty } from '@/services/properties';
import { ServiceError } from '@/services/ServiceError';

type Result = { data?: unknown; error?: unknown; count?: number | null };

const mockResults: Record<string, Result[]> = {};
const mockRpc = jest.fn();
const mockGetUser = jest.fn();

function mockBuilder(table: string) {
  const b: Record<string, unknown> = {};
  const next = (): Promise<Result> => {
    const r = mockResults[table]?.shift() ?? { data: null, error: null };
    if (r.error === 'throw') return Promise.reject(new Error('network'));
    return Promise.resolve(r);
  };
  for (const m of ['select', 'order', 'limit', 'neq', 'eq']) b[m] = () => b;
  b.maybeSingle = next;
  b.then = (res: (v: Result) => unknown, rej: (e: unknown) => unknown) => next().then(res, rej);
  return b;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => mockBuilder(t),
    rpc: (...a: unknown[]) => mockRpc(...a),
    auth: { getUser: () => mockGetUser() },
  },
}));

const prop = { id: 'p1', name: 'Minha Propriedade', is_demo: true };

beforeEach(() => {
  for (const k of Object.keys(mockResults)) delete mockResults[k];
  mockRpc.mockReset();
  mockGetUser.mockReset();
});

describe('getCurrentProperty', () => {
  it('returns the existing row without calling the rpc', async () => {
    mockResults.properties = [{ data: prop, error: null }];
    await expect(getCurrentProperty()).resolves.toEqual(prop);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns null for zero farms and never calls ensure_demo_farm (D-01)', async () => {
    mockResults.properties = [{ data: null, error: null }];
    await expect(getCurrentProperty()).resolves.toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('throws a friendly error when the query fails, keeping a sanitized cause', async () => {
    const raw = { message: 'secret db detail' };
    mockResults.properties = [{ data: null, error: raw }];
    const err = await getCurrentProperty().catch((e) => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.message).toBe('Não foi possível carregar a propriedade.');
    expect(err.message).not.toContain('secret');
    expect(err.cause).toEqual({ name: 'Error' });
    expect(JSON.stringify(err.cause)).not.toContain('secret');
  });

  it('maps thrown network exceptions to the friendly error', async () => {
    mockResults.properties = [{ error: 'throw' }];
    await expect(getCurrentProperty()).rejects.toThrow('Não foi possível carregar a propriedade.');
  });
});

describe('getProducer', () => {
  it('returns id and fullName', async () => {
    mockResults.producers = [{ data: { id: 'u1', full_name: 'Maria da Silva' }, error: null }];
    await expect(getProducer('u1')).resolves.toEqual({
      id: 'u1',
      fullName: 'Maria da Silva',
      onboardingCompletedAt: null,
    });
  });

  it('throws friendly error on failure', async () => {
    mockResults.producers = [{ data: null, error: { message: 'x' } }];
    await expect(getProducer('u1')).rejects.toThrow('Não foi possível carregar o perfil.');
  });

  it('throws friendly error on network exception', async () => {
    mockResults.producers = [{ error: 'throw' }];
    await expect(getProducer('u1')).rejects.toThrow('Não foi possível carregar o perfil.');
  });

  it('does not call auth.getUser (no network round-trip)', async () => {
    mockGetUser.mockClear();
    mockResults.producers = [{ data: { id: 'u1', full_name: 'Maria' }, error: null }];
    await getProducer('u1');
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});
