import { lookupCep, resetGeocodingCache, resolveLocation } from './geocoding';
import { ServiceError } from './ServiceError';

type Handler = (url: string) => { status?: number; body?: unknown } | 'network';

let requested: string[] = [];
let inNominatim = 0;
let maxParallelNominatim = 0;

function mockFetch(handler: Handler) {
  requested = [];
  inNominatim = 0;
  maxParallelNominatim = 0;
  globalThis.fetch = jest.fn(async (url: string) => {
    requested.push(String(url));
    const isNom = String(url).includes('nominatim');
    if (isNom) {
      inNominatim++;
      maxParallelNominatim = Math.max(maxParallelNominatim, inNominatim);
      await new Promise((r) => setTimeout(r, 1));
    }
    try {
      const res = handler(String(url));
      if (res === 'network') throw new TypeError('network');
      const status = res.status ?? 200;
      return { ok: status >= 200 && status < 300, status, json: async () => res.body } as Response;
    } finally {
      if (isNom) inNominatim--;
    }
  }) as unknown as typeof fetch;
}

const brasilFull = {
  cep: '01310100',
  state: 'SP',
  city: 'São Paulo',
  neighborhood: 'Bela Vista',
  street: 'Avenida Paulista',
  location: { coordinates: { longitude: '-46.65', latitude: '-23.56' } },
};

beforeEach(() => resetGeocodingCache());

describe('lookupCep', () => {
  it('street precision from Nominatim when found', async () => {
    mockFetch((url) => {
      if (url.includes('brasilapi')) return { body: brasilFull };
      return { body: [{ lat: '-23.5614', lon: '-46.6559' }] };
    });
    const r = await lookupCep('01310100');
    expect(r.precision).toBe('street');
    expect(r.lat).toBeCloseTo(-23.5614, 4);
    expect(r.lng).toBeCloseTo(-46.6559, 4);
    expect(requested.filter((u) => u.includes('nominatim'))).toHaveLength(1);
    expect(requested.join(' ')).not.toMatch(/user|email|farm/i);
  });

  it('falls back to BrasilAPI coords (approx) when Nominatim finds nothing', async () => {
    mockFetch((url) => (url.includes('brasilapi') ? { body: brasilFull } : { body: [] }));
    const r = await lookupCep('01310100');
    expect(r.precision).toBe('approx');
    expect(r.lat).toBeCloseTo(-23.56, 2);
    expect(r.lng).toBeCloseTo(-46.65, 2);
  });

  it('BrasilAPI 404 falls to ViaCEP, then postcode/city/none chain', async () => {
    mockFetch((url) => {
      if (url.includes('brasilapi')) return { status: 404, body: {} };
      if (url.includes('viacep')) return { body: { logradouro: '', bairro: '', localidade: 'Ibiúna', uf: 'SP' } };
      if (url.includes('postalcode')) return { body: [] };
      if (url.includes('city=')) return { body: [{ lat: '-23.65', lon: '-47.22' }] };
      return { body: [] };
    });
    const r = await lookupCep('18150000');
    expect(r.found).toBe(true);
    expect(r.city).toBe('Ibiúna');
    expect(r.street).toBeNull();
    expect(r.precision).toBe('city');
  });

  it('postcode precision and none precision', async () => {
    mockFetch((url) => {
      if (url.includes('brasilapi')) return { body: { ...brasilFull, street: null, location: {} } };
      return { body: [{ lat: '-23.5', lon: '-46.6' }] };
    });
    expect((await lookupCep('01310100')).precision).toBe('postcode');
    resetGeocodingCache();
    mockFetch((url) => (url.includes('brasilapi') ? { body: { ...brasilFull, street: null, location: {} } } : { body: [] }));
    const none = await lookupCep('01310100');
    expect(none.precision).toBe('none');
    expect(none.lat).toBeNull();
    expect(none.lng).toBeNull();
  });

  it('ViaCEP erro plus BrasilAPI 404 resolves found false', async () => {
    mockFetch((url) => (url.includes('brasilapi') ? { status: 404, body: {} } : { body: { erro: 'true' } }));
    const r = await lookupCep('99999999');
    expect(r.found).toBe(false);
  });

  it('caches per CEP and sequences Nominatim calls', async () => {
    mockFetch((url) => (url.includes('brasilapi') ? { body: { ...brasilFull, location: {} } } : { body: [] }));
    await lookupCep('01310100');
    const count = requested.length;
    await lookupCep('01310100');
    expect(requested).toHaveLength(count);
    expect(maxParallelNominatim).toBe(1);
  });

  it('throws ServiceError when every provider fails with network errors', async () => {
    mockFetch(() => 'network');
    await expect(lookupCep('01310100')).rejects.toThrow(ServiceError);
    await expect(lookupCep('01310100')).rejects.toThrow('Não foi possível buscar o CEP. Verifique sua internet.');
  });

  it('rejects a malformed cep without any request', async () => {
    mockFetch(() => ({ body: {} }));
    await expect(lookupCep('123')).rejects.toThrow(ServiceError);
    expect(requested).toHaveLength(0);
  });
});

describe('resolveLocation', () => {
  it('returns coordinates, caches, and never throws', async () => {
    mockFetch(() => ({ body: [{ lat: '-22.9', lon: '-47.06' }] }));
    const input = { cep: '13500000', street: null, city: 'Rio Claro', state: 'SP' };
    const a = await resolveLocation(input);
    expect(a.precision).toBe('postcode');
    const n = requested.length;
    await resolveLocation(input);
    expect(requested).toHaveLength(n);
    resetGeocodingCache();
    mockFetch(() => 'network');
    const b = await resolveLocation(input);
    expect(b).toEqual({ lat: null, lng: null, precision: 'none' });
  });
});
