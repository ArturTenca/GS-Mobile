// The single Leaflet document used by the native WebView and the web iframe (D-10).
// No user text is ever interpolated here: the page only receives coordinates, radii, kinds and
// theme colours through window.__setScene(scene). Colours come from scene.style (D-11).

import { LEAFLET_ASSETS, MAP_TILE_FILTERS, TILE_LAYERS, type TileLayerKey } from '@/lib/mapTiles';

function hostOf(url: string): string {
  const m = /^https:\/\/[^/{]+/.exec(url);
  return m ? m[0] : '';
}

/** JSON that is safe to embed inside an inline script. */
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

/**
 * Monochrome tile filters (MAP-02). Applied to the Leaflet tile pane only, so the polygon,
 * circles and markers in the other panes keep their theme colours. Values are constants from
 * mapTiles.ts (never scene data), so nothing user-controlled reaches this CSS.
 */
function tileFilterCss(): string {
  return (Object.keys(MAP_TILE_FILTERS) as TileLayerKey[])
    .map((layer) => {
      const f = MAP_TILE_FILTERS[layer];
      return [
        `.base-${layer} { filter: ${f.light}; }`,
        `html[data-theme="dark"] .base-${layer} { filter: ${f.dark}; }`,
      ].join('\n');
    })
    .join('\n');
}

const PAGE_SCRIPT = `
(function () {
  var map = null, tiles = {}, currentBase = null, overlay = null;
  var pending = null, scene = null, lastRev = null, lastNonce = null;

  function emit(o) {
    var s = JSON.stringify(o);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(s);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(s, '*');
    }
  }

  function ll(p) { return [p.lat, p.lng]; }

  function emitZoom() {
    emit({ type: 'zoom', zoom: map.getZoom(), minZoom: map.getMinZoom(), maxZoom: map.getMaxZoom() });
  }

  function ensureBase(name) {
    if (name === currentBase) return;
    var cfg = TILE_LAYERS[name];
    if (!cfg) return;
    if (!tiles[name]) {
      tiles[name] = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxNativeZoom: cfg.maxNativeZoom,
        maxZoom: cfg.maxZoom
      });
    }
    if (currentBase && tiles[currentBase]) map.removeLayer(tiles[currentBase]);
    tiles[name].addTo(map);
    currentBase = name;
  }

  function dot(group, at, radius, fill, st) {
    L.circleMarker(ll(at), { radius: radius + 3, stroke: false, fill: true, fillColor: st.halo, fillOpacity: 1, interactive: false }).addTo(group);
    L.circleMarker(ll(at), { radius: radius, color: st.vertex, weight: 2, fill: true, fillColor: fill, fillOpacity: 1, interactive: false }).addTo(group);
  }

  function drawOverlay(s) {
    if (overlay) overlay.clearLayers(); else overlay = L.layerGroup().addTo(map);
    var st = s.style;
    var poly = s.polygon;
    if (poly && poly.points && poly.points.length > 1) {
      var pts = poly.points.map(ll);
      var line = poly.closed ? pts.concat([pts[0]]) : pts;
      var stroke = poly.invalid ? st.invalid : st.boundary;
      L.polyline(line, { color: st.halo, weight: 6, interactive: false }).addTo(overlay);
      if (poly.closed && pts.length > 2) {
        L.polygon(pts, { color: stroke, weight: 3, fill: true, fillColor: st.boundaryFill, fillOpacity: 1, interactive: false }).addTo(overlay);
      } else {
        L.polyline(pts, { color: stroke, weight: 3, interactive: false }).addTo(overlay);
      }
    }
    (s.circles || []).forEach(function (c) {
      if (c.kind === 'existing') {
        L.circle(ll(c.at), { radius: c.radiusM, color: st.sensorExisting, weight: 2, dashArray: '6 6', fill: false, interactive: false }).addTo(overlay);
      } else {
        L.circle(ll(c.at), { radius: c.radiusM, color: st.sensor, weight: 2, fill: true, fillColor: st.sensorFill, fillOpacity: 1, interactive: false }).addTo(overlay);
      }
    });
    (s.markers || []).forEach(function (m) {
      var r = 7, fill = st.boundary;
      if (m.kind === 'vertexFirst') { r = 9; fill = st.boundary; }
      else if (m.kind === 'vertex') { r = 7; fill = st.boundary; }
      else if (m.kind === 'existing') { r = 8; fill = st.sensorExisting; }
      else if (m.kind === 'pending') { r = 9; fill = st.sensor; }
      else if (m.kind === 'invalid') { r = 8; fill = st.invalid; }
      dot(overlay, m.at, r, fill, st);
    });
  }

  function applyView(s) {
    var v = s.view;
    if (!v) return;
    if (v.fit && v.fit.length > 0) {
      var pad = typeof v.paddingPx === 'number' ? v.paddingPx : 32;
      if (v.fit.length === 1) map.setView(ll(v.fit[0]), 16, { animate: !!s.animate });
      else map.fitBounds(L.latLngBounds(v.fit.map(ll)), { padding: [pad, pad], animate: !!s.animate, maxZoom: 18 });
    } else if (v.center) {
      map.setView(ll(v.center), v.zoom, { animate: !!s.animate });
    }
  }

  function applyTheme(s) {
    // Whitelist: anything other than 'dark' is light. Only selects a CSS attribute value.
    document.documentElement.setAttribute('data-theme', s.theme === 'dark' ? 'dark' : 'light');
    var bg = s.style && typeof s.style.mapBg === 'string' ? s.style.mapBg : '';
    document.body.style.background = bg;
    map.getContainer().style.background = bg;
    var pane = map.getPane('tilePane');
    if (pane) {
      Object.keys(TILE_LAYERS).forEach(function (k) { pane.classList.remove('base-' + k); });
      if (currentBase) pane.classList.add('base-' + currentBase);
    }
  }

  function apply(s) {
    scene = s;
    ensureBase(s.base);
    applyTheme(s);
    if (s.interactive === 'none') map.doubleClickZoom.enable(); else map.doubleClickZoom.disable();
    drawOverlay(s);
    if (s.rev !== lastRev) { lastRev = s.rev; applyView(s); }
    if (s.zoomCmd && s.zoomCmd.nonce !== lastNonce) {
      lastNonce = s.zoomCmd.nonce;
      if (s.zoomCmd.delta > 0) map.zoomIn(1); else map.zoomOut(1);
    }
  }

  window.__setScene = function (s) {
    if (!s || typeof s !== 'object') return;
    if (map) apply(s); else pending = s;
  };

  window.addEventListener('message', function (e) {
    if (window.ReactNativeWebView) return;
    if (e.source !== window.parent) return;
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
    if (d && typeof d === 'object' && d.scene) window.__setScene(d.scene);
  });

  window.__boot = function () {
    if (map || typeof L === 'undefined') return;
    map = L.map('map', { zoomControl:false, attributionControl: false, minZoom: 2, maxZoom: 19, zoomSnap: 1 });
    L.control.attribution({ position: 'bottomright', prefix: 'Leaflet' }).addTo(map);
    map.setView([-14.2, -51.9], 4);
    map.on('click', function (e) {
      if (!scene || scene.interactive === 'none') return;
      emit({ type: 'tap', lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('zoomend', emitZoom);
    window.addEventListener('resize', function () { map.invalidateSize(); });
    map.invalidateSize();
    emit({ type: 'ready' });
    emitZoom();
    if (pending) { var p = pending; pending = null; apply(p); }
  };

  window.__fail = function () {
    emit({ type: 'error', message: 'Falha ao carregar o mapa' });
  };

  window.__fallback = function () {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = LEAFLET.cssFallback;
    css.integrity = LEAFLET.cssIntegrity;
    css.crossOrigin = 'anonymous';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = LEAFLET.jsFallback;
    js.integrity = LEAFLET.jsIntegrity;
    js.crossOrigin = 'anonymous';
    js.onload = window.__boot;
    js.onerror = window.__fail;
    document.head.appendChild(js);
  };
})();
`;

export function buildMapHtml(): string {
  const tileHosts = Array.from(new Set(Object.values(TILE_LAYERS).map((t) => hostOf(t.url)))).filter(Boolean);
  const cdnHosts = Array.from(new Set([LEAFLET_ASSETS.css, LEAFLET_ASSETS.cssFallback].map(hostOf)));
  const cdn = cdnHosts.join(' ');
  const csp = [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${cdn}`,
    `style-src 'unsafe-inline' ${cdn}`,
    `img-src data: ${[...tileHosts, ...cdnHosts].join(' ')}`,
    "connect-src 'none'",
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<link rel="stylesheet" href="${LEAFLET_ASSETS.css}" integrity="${LEAFLET_ASSETS.cssIntegrity}" crossorigin="anonymous" />
<style>
html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }
#map { width: 100%; height: 100%; background: transparent; }
.leaflet-container { font-family: sans-serif; }
${tileFilterCss()}
</style>
</head>
<body>
<div id="map"></div>
<script>
var TILE_LAYERS = ${safeJson(TILE_LAYERS)};
var LEAFLET = ${safeJson(LEAFLET_ASSETS)};
</script>
<script>${PAGE_SCRIPT}</script>
<script src="${LEAFLET_ASSETS.js}" integrity="${LEAFLET_ASSETS.jsIntegrity}" crossorigin="anonymous" onload="window.__boot()" onerror="window.__fallback()"></script>
</body>
</html>`;
}
