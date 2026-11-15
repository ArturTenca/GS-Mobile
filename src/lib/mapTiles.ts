// Tile sources and Leaflet CDN assets, configured in ONE place with no API keys (D-10).
// NOTE: Esri's keyless endpoint and tile.openstreetmap.org are not SLA-backed commercial
// services. A commercial release should swap these URLs for a keyed provider
// (MapTiler, Stadia, Esri API key). Attribution must always stay visible on the map.

export const TILE_LAYERS = {
  satellite: {
    // Esri order is {z}/{y}/{x}
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxNativeZoom: 18,
    maxZoom: 19,
  },
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    maxZoom: 19,
  },
} as const;

export type TileLayerKey = keyof typeof TILE_LAYERS;

export type MapTheme = 'light' | 'dark';

// Monochrome look without a keyed provider (MAP-02, D-09/D-10). CARTO basemaps now require an
// API key, so we do NOT use CARTO: the OSM and Esri tiles above are turned grey by a CSS filter
// applied to the Leaflet tile pane (overlays live in other panes and keep their brand colours).
// Starting values; tune visually against colors.background in each theme.
export const MAP_TILE_FILTERS: Record<TileLayerKey, Record<MapTheme, string>> = {
  street: {
    light: 'grayscale(1) contrast(0.95) brightness(1.04)',
    dark: 'grayscale(1) invert(1) brightness(0.82) contrast(0.9)',
  },
  satellite: {
    light: 'grayscale(1) contrast(0.95) brightness(1.05)',
    dark: 'grayscale(1) contrast(1.05) brightness(0.65)',
  },
};

// Leaflet 1.9.4 (pinned; do not use the 2.0 beta snippets). Same files on both CDNs, same SRI.
export const LEAFLET_ASSETS = {
  css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  cssFallback: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  jsFallback: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  cssIntegrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
  jsIntegrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
} as const;
