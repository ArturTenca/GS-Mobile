import { darkColors, lightColors } from '@/theme/tokens';

import { parseMapEvent, sceneStyleFromColors } from './mapProtocol';

describe('parseMapEvent', () => {
  it('accepts valid events as objects or JSON strings', () => {
    expect(parseMapEvent({ type: 'ready' })).toEqual({ type: 'ready' });
    expect(parseMapEvent(JSON.stringify({ type: 'tap', lat: -23.5, lng: -46.6 }))).toEqual({
      type: 'tap',
      lat: -23.5,
      lng: -46.6,
    });
    expect(parseMapEvent({ type: 'zoom', zoom: 5, minZoom: 1, maxZoom: 19 })).toEqual({
      type: 'zoom',
      zoom: 5,
      minZoom: 1,
      maxZoom: 19,
    });
  });

  it('cuts error messages to 200 chars', () => {
    const e = parseMapEvent({ type: 'error', message: 'x'.repeat(500) });
    expect(e).toEqual({ type: 'error', message: 'x'.repeat(200) });
  });

  it('rejects unknown types and non-objects', () => {
    expect(parseMapEvent({ type: 'nope' })).toBeNull();
    expect(parseMapEvent(null)).toBeNull();
    expect(parseMapEvent(42)).toBeNull();
    expect(parseMapEvent([])).toBeNull();
    expect(parseMapEvent({})).toBeNull();
  });

  it('rejects invalid coordinates', () => {
    expect(parseMapEvent({ type: 'tap', lat: NaN, lng: 0 })).toBeNull();
    expect(parseMapEvent({ type: 'tap', lat: Infinity, lng: 0 })).toBeNull();
    expect(parseMapEvent({ type: 'tap', lat: 91, lng: 0 })).toBeNull();
    expect(parseMapEvent({ type: 'tap', lat: 0, lng: -181 })).toBeNull();
    expect(parseMapEvent({ type: 'tap', lat: '1', lng: 0 })).toBeNull();
    expect(parseMapEvent({ type: 'zoom', zoom: NaN, minZoom: 1, maxZoom: 2 })).toBeNull();
  });

  it('rejects oversized payloads and invalid JSON', () => {
    expect(parseMapEvent(JSON.stringify({ type: 'error', message: 'y'.repeat(5000) }))).toBeNull();
    expect(parseMapEvent('{not json')).toBeNull();
  });
});

describe('sceneStyleFromColors', () => {
  it('maps the eight map tokens and the map background', () => {
    expect(sceneStyleFromColors(lightColors)).toEqual({
      mapBg: lightColors.background,
      boundary: lightColors.mapBoundary,
      boundaryFill: lightColors.mapBoundaryFill,
      halo: lightColors.mapHalo,
      vertex: lightColors.mapVertex,
      sensor: lightColors.mapSensor,
      sensorFill: lightColors.mapSensorFill,
      sensorExisting: lightColors.mapSensorExisting,
      invalid: lightColors.mapInvalid,
    });
  });

  it('uses the dark palette values for the dark theme', () => {
    const st = sceneStyleFromColors(darkColors);
    expect(st.mapBg).toBe(darkColors.background);
    expect(st.boundary).toBe(darkColors.mapBoundary);
    expect(st.sensorExisting).toBe(darkColors.mapSensorExisting);
    expect(st.halo).toBe(darkColors.mapHalo);
  });
});
