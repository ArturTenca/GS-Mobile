// Native host: the shared Leaflet document inside a WebView. Stateless; scene in, events out.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildMapHtml } from './mapHtml';
import { parseMapEvent, type MapCanvasProps } from './mapProtocol';

const BASE_URL = 'https://agroalerta.app';

function sceneScript(scene: unknown): string {
  const json = JSON.stringify(scene)
    .split(String.fromCharCode(0x2028))
    .join('\\u2028')
    .split(String.fromCharCode(0x2029))
    .join('\\u2029');
  return `window.__setScene(${json});true;`;
}

export default function MapCanvas({ scene, onTap, onReady, onError, onZoom, accessibilityLabel }: MapCanvasProps) {
  const ref = useRef<WebView<object>>(null);
  const readyRef = useRef(false);
  const sceneRef = useRef(scene);
  const lastSent = useRef<string | null>(null);
  const source = useMemo(() => ({ html: buildMapHtml(), baseUrl: BASE_URL }), []);

  const push = useCallback(() => {
    if (!readyRef.current || !ref.current) return;
    const script = sceneScript(sceneRef.current);
    if (script === lastSent.current) return;
    lastSent.current = script;
    ref.current.injectJavaScript(script);
  }, []);

  useEffect(() => {
    sceneRef.current = scene;
    push();
  }, [scene, push]);

  const handleMessage = useCallback(
    (e: WebViewMessageEvent) => {
      const event = parseMapEvent(e.nativeEvent.data);
      if (!event) return;
      if (event.type === 'ready') {
        readyRef.current = true;
        lastSent.current = null;
        push();
        onReady();
      } else if (event.type === 'tap') {
        onTap({ lat: event.lat, lng: event.lng });
      } else if (event.type === 'zoom') {
        onZoom?.({ zoom: event.zoom, minZoom: event.minZoom, maxZoom: event.maxZoom });
      } else {
        onError(event.message);
      }
    },
    [onReady, onTap, onZoom, onError, push],
  );

  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Toque no mapa para marcar pontos"
    >
      <WebView<object>
        ref={ref}
        style={styles.web}
        source={source}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) =>
          req.url === 'about:blank' || req.url.startsWith('data:') || req.url.startsWith(BASE_URL)
        }
        onMessage={handleMessage}
        onError={() => onError('Falha ao carregar o mapa')}
        onHttpError={() => onError('Falha ao carregar o mapa')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
});
