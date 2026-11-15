import { canContinue, farmMapSpoken, farmMapStatus, initialMapView, MAX_VERTICES } from '@/features/farm/farmMap';

const tri = [
  { lat: -20, lng: -45 },
  { lat: -20, lng: -44.99 },
  { lat: -19.99, lng: -45 },
];

describe('farmMapStatus', () => {
  it('describes the point count and area', () => {
    expect(farmMapStatus(0, 0)).toBe('Nenhum ponto marcado');
    expect(farmMapStatus(1, 0)).toBe('1 ponto marcado');
    expect(farmMapStatus(2, 0)).toBe('2 pontos marcados');
    expect(farmMapStatus(5, 2.345)).toBe('5 pontos · 2,35 ha');
  });
});

describe('farmMapSpoken', () => {
  it('spells out the area for screen readers', () => {
    expect(farmMapSpoken(4, 2.35)).toBe('4 pontos marcados. Área de 2,35 hectares.');
    expect(farmMapSpoken(0, 0)).toBe('Nenhum ponto marcado.');
  });
});

describe('initialMapView', () => {
  const at = { lat: -21.5, lng: -45.2 };
  it('zooms to street level without notice', () => {
    expect(initialMapView({ ...at, precision: 'street' }, 'Lavras')).toEqual({
      center: at,
      zoom: 16,
      notice: null,
    });
  });
  it('warns on approximate and postcode precision', () => {
    const notice = 'Localização aproximada. Arraste o mapa até a sua fazenda antes de marcar os pontos.';
    expect(initialMapView({ ...at, precision: 'approx' }, 'Lavras')).toEqual({ center: at, zoom: 15, notice });
    expect(initialMapView({ ...at, precision: 'postcode' }, 'Lavras')).toEqual({ center: at, zoom: 15, notice });
  });
  it('shows the city center on city precision', () => {
    expect(initialMapView({ ...at, precision: 'city' }, 'Lavras')).toEqual({
      center: at,
      zoom: 13,
      notice: 'Mostrando o centro de Lavras. Arraste e aproxime o mapa até a sua fazenda.',
    });
  });
  it('falls back to Brazil when nothing is known', () => {
    const fallback = {
      center: { lat: -14.2, lng: -51.9 },
      zoom: 4,
      notice: 'Não encontramos o local do CEP. Aproxime o mapa até a sua fazenda.',
    };
    expect(initialMapView({ lat: null, lng: null, precision: 'none' }, 'Lavras')).toEqual(fallback);
    expect(initialMapView({ lat: null, lng: null, precision: 'street' }, 'Lavras')).toEqual(fallback);
    expect(initialMapView(null, '')).toEqual(fallback);
  });
});

describe('canContinue', () => {
  it('requires a simple polygon with area', () => {
    expect(canContinue([])).toBe(false);
    expect(canContinue(tri.slice(0, 2))).toBe(false);
    expect(canContinue(tri)).toBe(true);
    const bow = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 1 },
    ];
    expect(canContinue(bow)).toBe(false);
    const flat = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ];
    expect(canContinue(flat)).toBe(false);
  });
  it('caps vertices at 200', () => {
    expect(MAX_VERTICES).toBe(200);
  });
});
