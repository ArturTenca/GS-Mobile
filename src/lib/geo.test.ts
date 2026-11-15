import {
  bbox,
  centroid,
  circleAreaHa,
  formatHa,
  fromGeoJsonPolygon,
  pointInPolygon,
  polygonAreaHa,
  polygonAreaM2,
  ringIsSimple,
  toGeoJsonPolygon,
  type LatLng,
} from './geo';

const lat0 = -23.6;
const lng0 = -46.6;
// ~100 m x 100 m square near lat -23.6
const dLat = 100 / 111320;
const dLng = 100 / (111320 * Math.cos((lat0 * Math.PI) / 180));
const square: LatLng[] = [
  { lat: lat0, lng: lng0 },
  { lat: lat0, lng: lng0 + dLng },
  { lat: lat0 + dLat, lng: lng0 + dLng },
  { lat: lat0 + dLat, lng: lng0 },
];

describe('geo area', () => {
  it('100 m square is about 1 ha', () => {
    expect(Math.abs(polygonAreaHa(square) - 1)).toBeLessThan(0.01);
  });
  it('1 deg box at the equator', () => {
    const box: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    expect(Math.abs(polygonAreaM2(box) / 1.2364e10 - 1)).toBeLessThan(0.005);
  });
  it('ignores a duplicated closing point and returns 0 for fewer than 3', () => {
    expect(polygonAreaHa([...square, square[0]])).toBeCloseTo(polygonAreaHa(square), 8);
    expect(polygonAreaM2(square.slice(0, 2))).toBe(0);
  });
  it('circleAreaHa(50) is about 0.785', () => {
    expect(circleAreaHa(50)).toBeCloseTo(0.785, 3);
  });
});

describe('pointInPolygon', () => {
  // U shape with a notch at the top middle
  const u: LatLng[] = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 3 },
    { lat: 3, lng: 3 },
    { lat: 3, lng: 2 },
    { lat: 1, lng: 2 },
    { lat: 1, lng: 1 },
    { lat: 3, lng: 1 },
    { lat: 3, lng: 0 },
  ];
  it('inside body true, notch false, outside false', () => {
    expect(pointInPolygon({ lat: 0.5, lng: 1.5 }, u)).toBe(true);
    expect(pointInPolygon({ lat: 2, lng: 0.5 }, u)).toBe(true);
    expect(pointInPolygon({ lat: 2, lng: 1.5 }, u)).toBe(false);
    expect(pointInPolygon({ lat: 5, lng: 5 }, u)).toBe(false);
  });
});

describe('ringIsSimple', () => {
  it('square simple, bow-tie not, fewer than 3 not', () => {
    expect(ringIsSimple(square)).toBe(true);
    const bow: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    expect(ringIsSimple(bow)).toBe(false);
    expect(ringIsSimple(square.slice(0, 2))).toBe(false);
  });
});

describe('GeoJSON', () => {
  it('writes a closed [lng, lat] ring and round-trips', () => {
    const g = toGeoJsonPolygon(square);
    expect(g.type).toBe('Polygon');
    expect(g.coordinates[0][0][0]).toBe(square[0].lng);
    expect(g.coordinates[0][0][1]).toBe(square[0].lat);
    const ring = g.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring).toHaveLength(square.length + 1);
    expect(fromGeoJsonPolygon(g)).toEqual(square);
  });
  it('returns null for malformed input', () => {
    expect(fromGeoJsonPolygon(null)).toBeNull();
    expect(fromGeoJsonPolygon({ type: 'Point', coordinates: [0, 0] })).toBeNull();
    expect(fromGeoJsonPolygon({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] })).toBeNull();
    expect(fromGeoJsonPolygon({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 'x'], [0, 0]]] })).toBeNull();
    expect(fromGeoJsonPolygon({ type: 'Polygon', coordinates: [[[0, 0], [200, 0], [1, 1], [0, 0]]] })).toBeNull();
  });
});

describe('bbox, centroid, formatHa', () => {
  it('bbox and centroid', () => {
    const b = bbox(square);
    expect(b.south).toBe(lat0);
    expect(b.west).toBe(lng0);
    const c = centroid(square);
    expect(c.lat).toBeCloseTo(lat0 + dLat / 2, 8);
  });
  it('formatHa pt-BR', () => {
    expect(formatHa(2.345)).toMatch(/^2,3[45] ha$/);
    expect(formatHa(1250.4)).toBe('1.250,40 ha');
    expect(formatHa(0.004)).toBe('menos de 0,01 ha');
  });
});
