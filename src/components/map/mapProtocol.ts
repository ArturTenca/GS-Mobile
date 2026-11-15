// Scene protocol between React and the Leaflet document (WebView on native, iframe on web).
// React sends a full scene; the map only reports ready, tap, zoom and error. Everything coming
// back from the map is untrusted and must go through parseMapEvent.

import type { LatLng } from '@/lib/geo';
import type { MapTheme } from '@/lib/mapTiles';
import type { Colors } from '@/theme/tokens';

export type MapBase = 'satellite' | 'street';

export type { MapTheme };

export interface SceneStyle {
  /** Background behind tiles while they load (colors.background). */
  mapBg: string;
  boundary: string;
  boundaryFill: string;
  halo: string;
  vertex: string;
  sensor: string;
  sensorFill: string;
  sensorExisting: string;
  invalid: string;
}

export type MarkerKind = 'vertex' | 'vertexFirst' | 'existing' | 'pending' | 'invalid';

export interface MapScene {
  base: MapBase;
  /** Selects the tile filter only; never part of rev, so a theme flip does not re-fit the view. */
  theme: MapTheme;
  view: { center: LatLng; zoom: number } | { fit: LatLng[]; paddingPx?: number };
  interactive: 'draw' | 'place' | 'none';
  polygon?: { points: LatLng[]; closed: boolean; invalid?: boolean };
  markers?: { id: string; at: LatLng; kind: MarkerKind }[];
  circles?: { id: string; at: LatLng; radiusM: number; kind: 'existing' | 'pending' }[];
  style: SceneStyle;
  animate: boolean;
  rev: number;
  zoomCmd?: { delta: 1 | -1; nonce: number };
}

export type MapEvent =
  | { type: 'ready' }
  | { type: 'tap'; lat: number; lng: number }
  | { type: 'zoom'; zoom: number; minZoom: number; maxZoom: number }
  | { type: 'error'; message: string };

export interface MapCanvasProps {
  scene: MapScene;
  onTap(p: LatLng): void;
  onReady(): void;
  onError(message: string): void;
  onZoom?(z: { zoom: number; minZoom: number; maxZoom: number }): void;
  accessibilityLabel: string;
}

export function sceneStyleFromColors(colors: Colors): SceneStyle {
  return {
    mapBg: colors.background,
    boundary: colors.mapBoundary,
    boundaryFill: colors.mapBoundaryFill,
    halo: colors.mapHalo,
    vertex: colors.mapVertex,
    sensor: colors.mapSensor,
    sensorFill: colors.mapSensorFill,
    sensorExisting: colors.mapSensorExisting,
    invalid: colors.mapInvalid,
  };
}

const MAX_PAYLOAD = 4096;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseMapEvent(raw: unknown): MapEvent | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > MAX_PAYLOAD) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  switch (o.type) {
    case 'ready':
      return { type: 'ready' };
    case 'tap': {
      const { lat, lng } = o;
      if (!isNum(lat) || !isNum(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      return { type: 'tap', lat, lng };
    }
    case 'zoom': {
      const { zoom, minZoom, maxZoom } = o;
      if (!isNum(zoom) || !isNum(minZoom) || !isNum(maxZoom)) return null;
      return { type: 'zoom', zoom, minZoom, maxZoom };
    }
    case 'error':
      return { type: 'error', message: typeof o.message === 'string' ? o.message.slice(0, 200) : 'Erro no mapa' };
    default:
      return null;
  }
}
