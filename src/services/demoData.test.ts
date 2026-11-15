import { DemoDataError, generateDemoDataset, mapDemoDataError } from '@/services/demoData';
import { ServiceError } from '@/services/ServiceError';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: (...a: unknown[]) => mockRpc(...a) },
}));

const MSG_RATE = 'Os dados acabaram de ser gerados. Aguarde um minuto para gerar de novo.';
const MSG_NOT_FOUND = 'Não encontramos esta fazenda. Volte e escolha a fazenda de novo.';
const MSG_MIGRATION = 'Atualize o banco de dados (migração 007).';
const MSG_GENERIC = 'Não foi possível gerar os dados. Verifique sua internet e tente de novo.';

beforeEach(() => {
  mockRpc.mockReset();
});

describe('mapDemoDataError', () => {
  it('maps the known codes', () => {
    expect(mapDemoDataError({ code: 'AG429' })).toEqual({ kind: 'rate', message: MSG_RATE });
    expect(mapDemoDataError({ code: '42501' })).toEqual({ kind: 'notFound', message: MSG_NOT_FOUND });
    expect(mapDemoDataError({ code: 'PGRST202' })).toEqual({ kind: 'migration', message: MSG_MIGRATION });
  });
  it('falls back to generic', () => {
    expect(mapDemoDataError(null)).toEqual({ kind: 'generic', message: MSG_GENERIC });
    expect(mapDemoDataError(undefined)).toEqual({ kind: 'generic', message: MSG_GENERIC });
    expect(mapDemoDataError({ code: '23505' })).toEqual({ kind: 'generic', message: MSG_GENERIC });
    expect(mapDemoDataError(new Error('network'))).toEqual({ kind: 'generic', message: MSG_GENERIC });
  });
});

describe('generateDemoDataset', () => {
  it('calls the rpc and returns the counts', async () => {
    mockRpc.mockResolvedValue({
      data: { sensors: 4, readings: '2884', generated_at: '2026-11-12T12:00:00Z' },
      error: null,
    });
    await expect(generateDemoDataset('p1')).resolves.toEqual({ sensors: 4, readings: 2884 });
    expect(mockRpc).toHaveBeenCalledWith('generate_demo_dataset', { p_property_id: 'p1' });
  });

  it('defaults missing counts to 0', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(generateDemoDataset('p1')).resolves.toEqual({ sensors: 0, readings: 0 });
  });

  it.each([
    ['AG429', 'rate', MSG_RATE],
    ['42501', 'notFound', MSG_NOT_FOUND],
    ['PGRST202', 'migration', MSG_MIGRATION],
    ['XX000', 'generic', MSG_GENERIC],
  ])('throws a DemoDataError for %s', async (code, kind, message) => {
    mockRpc.mockResolvedValue({ data: null, error: { code, message: 'raw db text' } });
    const err = await generateDemoDataset('p1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DemoDataError);
    expect(err).toBeInstanceOf(ServiceError);
    expect((err as DemoDataError).kind).toBe(kind);
    expect((err as DemoDataError).message).toBe(message);
  });

  it('maps thrown exceptions to generic', async () => {
    mockRpc.mockRejectedValue(new Error('network'));
    const err = await generateDemoDataset('p1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DemoDataError);
    expect((err as DemoDataError).kind).toBe('generic');
    expect((err as DemoDataError).message).toBe(MSG_GENERIC);
  });
});
