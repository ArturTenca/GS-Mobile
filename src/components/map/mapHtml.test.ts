import { LEAFLET_ASSETS, MAP_TILE_FILTERS } from '@/lib/mapTiles';

import { buildMapHtml } from './mapHtml';

describe('buildMapHtml', () => {
  const html = buildMapHtml();

  it('pins Leaflet with SRI', () => {
    expect(html).toContain('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    expect(html).toContain(LEAFLET_ASSETS.jsIntegrity);
    expect(html).toContain(LEAFLET_ASSETS.cssIntegrity);
  });

  it('has a CSP and the scene entry point', () => {
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain('__setScene');
    expect(html).toContain('zoomControl:false');
  });

  it('avoids unsafe DOM sinks and hex literals', () => {
    expect(html).not.toContain('innerHTML');
    expect(html).not.toContain('eval(');
    expect(html).not.toContain('document.write');
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });

  it('injects the monochrome filter rules for both layers and both themes', () => {
    expect(html).toContain(`.base-street { filter: ${MAP_TILE_FILTERS.street.light}; }`);
    expect(html).toContain(`.base-satellite { filter: ${MAP_TILE_FILTERS.satellite.light}; }`);
    expect(html).toContain(`html[data-theme="dark"] .base-street { filter: ${MAP_TILE_FILTERS.street.dark}; }`);
    expect(html).toContain(`html[data-theme="dark"] .base-satellite { filter: ${MAP_TILE_FILTERS.satellite.dark}; }`);
    for (const layer of Object.values(MAP_TILE_FILTERS)) {
      expect(layer.light).toContain('grayscale(1)');
      expect(layer.dark).toContain('grayscale(1)');
    }
  });

  it('sets data-theme from the scene with a dark whitelist and switches the tile pane class', () => {
    expect(html).toContain("setAttribute('data-theme', s.theme === 'dark' ? 'dark' : 'light')");
    expect(html).toContain("getPane('tilePane')");
    expect(html).toContain('classList');
    expect(html).toContain('s.style.mapBg');
  });

  it('keeps the CSP limited to the OSM, Esri and Leaflet CDN hosts with no CARTO', () => {
    const csp = /content="(default-src[^"]*)"/.exec(html)?.[1] ?? '';
    const img = /img-src ([^;]*)/.exec(csp)?.[1].split(' ') ?? [];
    expect([...img].sort()).toEqual(
      [
        'data:',
        'https://cdn.jsdelivr.net',
        'https://server.arcgisonline.com',
        'https://tile.openstreetmap.org',
        'https://unpkg.com',
      ].sort(),
    );
    expect(csp).toContain("connect-src 'none'");
    expect(html).not.toContain('cartocdn');
    expect(html).not.toContain('carto.com');
  });
});
