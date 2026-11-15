// Pure geometry helpers for the map phase. No dependencies.
// GeoJSON order is [lng, lat]; LatLng objects are {lat, lng}. Never mix them.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

const EARTH_RADIUS_M = 6378137;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Removes a duplicated closing vertex, if present. */
function openRing(points: LatLng[]): LatLng[] {
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) return points.slice(0, -1);
  }
  return points;
}

export function polygonAreaM2(points: LatLng[]): number {
  const ring = openRing(points);
  const n = ring.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % n];
    sum += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  return Math.abs((sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function polygonAreaHa(points: LatLng[]): number {
  return polygonAreaM2(points) / 10000;
}

export function circleAreaHa(radiusM: number): number {
  return (Math.PI * radiusM * radiusM) / 10000;
}

export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const ring = openRing(polygon);
  const n = ring.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const crosses =
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (crosses) inside = !inside;
  }
  return inside;
}

function orient(a: LatLng, b: LatLng, c: LatLng): number {
  const v = (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

function onSegment(a: LatLng, b: LatLng, p: LatLng): boolean {
  return (
    Math.min(a.lng, b.lng) <= p.lng &&
    p.lng <= Math.max(a.lng, b.lng) &&
    Math.min(a.lat, b.lat) <= p.lat &&
    p.lat <= Math.max(a.lat, b.lat)
  );
}

function segmentsIntersect(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const o1 = orient(p1, p2, p3);
  const o2 = orient(p1, p2, p4);
  const o3 = orient(p3, p4, p1);
  const o4 = orient(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, p3)) return true;
  if (o2 === 0 && onSegment(p1, p2, p4)) return true;
  if (o3 === 0 && onSegment(p3, p4, p1)) return true;
  if (o4 === 0 && onSegment(p3, p4, p2)) return true;
  return false;
}

/** True when the ring has at least 3 vertices and no two non-adjacent edges cross. */
export function ringIsSimple(points: LatLng[]): boolean {
  const ring = openRing(points);
  const n = ring.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a1 = ring[i];
    const a2 = ring[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsIntersect(a1, a2, ring[j], ring[(j + 1) % n])) return false;
    }
  }
  return true;
}

export function bbox(points: LatLng[]): { south: number; west: number; north: number; east: number } {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return { south, west, north, east };
}

export function centroid(points: LatLng[]): LatLng {
  const ring = openRing(points);
  if (ring.length === 0) return { lat: 0, lng: 0 };
  let lat = 0;
  let lng = 0;
  for (const p of ring) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / ring.length, lng: lng / ring.length };
}

export function toGeoJsonPolygon(points: LatLng[]): GeoJsonPolygon {
  const ring = openRing(points).map((p): number[] => [p.lng, p.lat]);
  if (ring.length > 0) ring.push([ring[0][0], ring[0][1]]);
  return { type: 'Polygon', coordinates: [ring] };
}

function validPosition(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length >= 2 &&
    typeof v[0] === 'number' &&
    typeof v[1] === 'number' &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    v[0] >= -180 &&
    v[0] <= 180 &&
    v[1] >= -90 &&
    v[1] <= 90
  );
}

export function fromGeoJsonPolygon(input: unknown): LatLng[] | null {
  if (typeof input !== 'object' || input === null) return null;
  const g = input as { type?: unknown; coordinates?: unknown };
  if (g.type !== 'Polygon' || !Array.isArray(g.coordinates)) return null;
  const ring: unknown = g.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;
  if (!ring.every(validPosition)) return null;
  const first = ring[0] as [number, number];
  const last = ring[ring.length - 1] as [number, number];
  if (first[0] !== last[0] || first[1] !== last[1]) return null;
  return (ring as [number, number][]).slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
}

export function formatHa(ha: number): string {
  if (ha > 0 && ha < 0.01) return 'menos de 0,01 ha';
  return `${ha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
}
