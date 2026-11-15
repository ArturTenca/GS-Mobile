import { CloudOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import type { LatLng } from '@/lib/geo';
import { spacing } from '@/theme/tokens';

import MapCanvas from './MapCanvas';
import { MapControls } from './MapControls';
import { MapLayerToggle } from './MapLayerToggle';
import { sceneStyleFromColors, type MapBase, type MapScene } from './mapProtocol';

type Props = {
  scene: Omit<MapScene, 'base' | 'theme' | 'zoomCmd' | 'style' | 'animate'>;
  base: MapBase;
  onBaseChange: (base: MapBase) => void;
  onTap: (p: LatLng) => void;
  onCenter: () => void;
  centerLabel: string;
  accessibilityLabel: string;
};

type ZoomInfo = { zoom: number; minZoom: number; maxZoom: number };

export function MapStage({ scene, base, onBaseChange, onTap, onCenter, centerLabel, accessibilityLabel }: Props) {
  const { colors, theme } = useTheme();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [zoomInfo, setZoomInfo] = useState<ZoomInfo | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [zoomCmd, setZoomCmd] = useState<MapScene['zoomCmd']>(undefined);
  const nonce = useRef(0);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (active) setReduceMotion(v);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const style = useMemo(() => sceneStyleFromColors(colors), [colors]);
  const fullScene = useMemo<MapScene>(
    () => ({ ...scene, base, theme, style, animate: !reduceMotion, zoomCmd }),
    [scene, base, theme, style, reduceMotion, zoomCmd],
  );

  const zoom = useCallback((delta: 1 | -1) => {
    nonce.current += 1;
    setZoomCmd({ delta, nonce: nonce.current });
  }, []);
  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => setError(true), []);
  const retry = useCallback(() => {
    setError(false);
    setReady(false);
    setZoomInfo(null);
    setAttempt((n) => n + 1);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, minHeight: 200, backgroundColor: colors.background },
        overlay: {
          ...StyleSheet.absoluteFill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
          gap: spacing.md,
          padding: spacing.lg,
        },
        center: { textAlign: 'center' },
      }),
    [colors],
  );

  return (
    <View style={styles.root}>
      <MapCanvas
        key={attempt}
        scene={fullScene}
        onTap={onTap}
        onReady={handleReady}
        onError={handleError}
        onZoom={setZoomInfo}
        accessibilityLabel={accessibilityLabel}
      />
      {ready && !error ? (
        <>
          <MapLayerToggle value={base} onChange={onBaseChange} />
          <MapControls
            onZoomIn={() => zoom(1)}
            onZoomOut={() => zoom(-1)}
            onCenter={onCenter}
            canZoomIn={!zoomInfo || zoomInfo.zoom < zoomInfo.maxZoom}
            canZoomOut={!zoomInfo || zoomInfo.zoom > zoomInfo.minZoom}
            centerLabel={centerLabel}
          />
        </>
      ) : null}
      {!ready && !error ? (
        <View style={styles.overlay} pointerEvents="none">
          <LoadingState message="Carregando mapa…" />
        </View>
      ) : null}
      {error ? (
        <View style={styles.overlay}>
          <CloudOff size={24} color={colors.textMuted} />
          <Text variant="heading" style={styles.center}>
            Não foi possível carregar o mapa
          </Text>
          <Text variant="label" tone="muted" style={styles.center}>
            Verifique sua internet e tente de novo.
          </Text>
          <Button variant="secondary" size="sm" onPress={retry}>
            Tentar novamente
          </Button>
        </View>
      ) : null}
    </View>
  );
}
