// Web host: the shared Leaflet document in an isolated iframe (srcDoc). Stateless.
import { createElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { buildMapHtml } from './mapHtml';
import { parseMapEvent, type MapCanvasProps } from './mapProtocol';

export default function MapCanvas({ scene, onTap, onReady, onError, onZoom, accessibilityLabel }: MapCanvasProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const sceneRef = useRef(scene);
  const html = useMemo(() => buildMapHtml(), []);

  const post = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!readyRef.current || !target) return;
    // Opaque origin (iframe is isolated): '*' is the only valid target.
    target.postMessage({ scene: sceneRef.current }, '*');
  }, []);

  useEffect(() => {
    sceneRef.current = scene;
    post();
  }, [scene, post]);

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const event = parseMapEvent(e.data);
      if (!event) return;
      if (event.type === 'ready') {
        readyRef.current = true;
        post();
        onReady();
      } else if (event.type === 'tap') {
        onTap({ lat: event.lat, lng: event.lng });
      } else if (event.type === 'zoom') {
        onZoom?.({ zoom: event.zoom, minZoom: event.minZoom, maxZoom: event.maxZoom });
      } else {
        onError(event.message);
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onReady, onTap, onZoom, onError, post]);

  return (
    <View style={styles.root} accessible accessibilityLabel={accessibilityLabel}>
      {createElement('iframe', {
        ref: frameRef,
        srcDoc: html,
        title: 'Mapa',
        sandbox: 'allow-scripts',
        style: { border: 0, width: '100%', height: '100%' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
