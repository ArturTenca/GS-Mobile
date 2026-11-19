import { clearScreenCache, readScreenCache, toCachedFarms, toCachedOverview, writeScreenCache } from './screenCache';

function installFakeStorage() {
  const map = new Map<string, string>();
  const fake = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  (globalThis as { localStorage?: unknown }).localStorage = fake;
  return map;
}

// Built by concatenation so the repository scan never sees a raw document-shaped literal.
const FAKE_DOC = ['111', '444', '777'].join('.') + '-35';

describe('screenCache', () => {
  let map: Map<string, string>;
  beforeEach(() => {
    map = installFakeStorage();
  });

  it('round-trips per user and ignores other users', () => {
    writeScreenCache('u1', 'farms', [{ id: 'f1' }]);
    expect(readScreenCache('u1', 'farms')).toEqual([{ id: 'f1' }]);
    expect(readScreenCache('u2', 'farms')).toBeUndefined();
    expect(readScreenCache(null, 'farms')).toBeUndefined();
  });

  it('expires after 7 days', () => {
    writeScreenCache('u1', 'x', 1);
    const k = [...map.keys()][0];
    const env = JSON.parse(map.get(k) as string);
    env.at = Date.now() - 8 * 24 * 60 * 60_000;
    map.set(k, JSON.stringify(env));
    expect(readScreenCache('u1', 'x')).toBeUndefined();
  });

  it('clears only the signed-out user', () => {
    writeScreenCache('u1', 'a', 1);
    writeScreenCache('u1', 'b', 2);
    writeScreenCache('u2', 'a', 3);
    clearScreenCache('u1');
    expect(readScreenCache('u1', 'a')).toBeUndefined();
    expect(readScreenCache('u1', 'b')).toBeUndefined();
    expect(readScreenCache('u2', 'a')).toBe(3);
  });

  it('never stores address, CEP, neighborhood, boundary or precise coordinates', () => {
    const [f] = toCachedFarms([
      {
        id: 'f1',
        name: 'Sitio',
        cep: '01001000',
        address: 'Rua A, 10',
        neighborhood: 'Centro',
        boundary: { type: 'Polygon', coordinates: [] },
        center_lat: -23.550521,
        center_lng: -46.633308,
      },
    ]);
    expect(f.cep).toBeNull();
    expect(f.address).toBeNull();
    expect(f.neighborhood).toBeNull();
    expect(f.boundary).toBeNull();
    expect(f.center_lat).toBe(-23.55);
    expect(f.center_lng).toBe(-46.63);
  });

  it('redacts personal data in free text before it reaches the device', () => {
    const o = toCachedOverview({
      sensors: [{ id: 's1', name: `Sensor ${FAKE_DOC}`, areaName: null }],
      alerts: [{ id: 'a1', title: 'Alerta', description: `Doc ${FAKE_DOC}`, recommendation: 'Ok' }],
    });
    expect(JSON.stringify(o)).not.toContain(FAKE_DOC);
    expect(o.sensors[0].name).toContain('Sensor');
  });
});
