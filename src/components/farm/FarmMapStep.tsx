import { Eraser, Undo2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapPanel } from '@/components/map/MapPanel';
import { MapStage } from '@/components/map/MapStage';
import type { MapBase } from '@/components/map/mapProtocol';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import {
  canContinue,
  farmMapSpoken,
  farmMapStatus,
  initialMapView,
  MAX_VERTICES,
} from '@/features/farm/farmMap';
import { polygonAreaHa, ringIsSimple, type LatLng } from '@/lib/geo';
import type { LocationPrecision } from '@/services/geocoding';
import { spacing } from '@/theme/tokens';

type FarmMapStepProps = {
  points: LatLng[];
  onPointsChange: (points: LatLng[]) => void;
  location: { lat: number | null; lng: number | null; precision: LocationPrecision } | null;
  cityName: string;
  cepChangedNotice: boolean;
  onContinue: () => void;
};

export function FarmMapStep({
  points,
  onPointsChange,
  location,
  cityName,
  cepChangedNotice,
  onContinue,
}: FarmMapStepProps) {
  const [base, setBase] = useState<MapBase>('street');
  const [rev, setRev] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);

  const initial = useMemo(() => initialMapView(location, cityName), [location, cityName]);
  const closed = points.length >= 3;
  const simple = !closed || ringIsSimple(points);
  const areaHa = closed ? polygonAreaHa(points) : 0;
  const atCap = points.length >= MAX_VERTICES;

  const scene = useMemo(
    () => ({
      view: closed ? { fit: points, paddingPx: 48 } : { center: initial.center, zoom: initial.zoom },
      interactive: 'draw' as const,
      polygon: { points, closed, invalid: !simple },
      markers: points.map((at, i) => ({
        id: `v${i}`,
        at,
        kind: i === 0 ? ('vertexFirst' as const) : ('vertex' as const),
      })),
      rev,
    }),
    [points, closed, simple, initial, rev],
  );

  function handleTap(p: LatLng) {
    if (points.length >= MAX_VERTICES) return;
    onPointsChange([...points, p]);
  }

  function handleClear() {
    if (points.length >= 3) setConfirmClear(true);
    else onPointsChange([]);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        row: { flexDirection: 'row', gap: spacing.sm },
      }),
    [],
  );

  const notice = points.length === 0 ? (cepChangedNotice ? 'O CEP mudou. Marque o limite da fazenda de novo.' : initial.notice) : null;
  const instruction =
    points.length < 3
      ? 'Toque no mapa nos cantos da fazenda, um de cada vez. Marque pelo menos 3 pontos.'
      : 'Continue marcando para ajustar o limite ou toque em Continuar.';

  return (
    <View style={styles.root}>
      <MapStage
        scene={scene}
        base={base}
        onBaseChange={setBase}
        onTap={handleTap}
        onCenter={() => setRev((r) => r + 1)}
        centerLabel={closed ? 'Centralizar na fazenda' : 'Centralizar no CEP'}
        accessibilityLabel="Mapa para marcar o limite da fazenda. Toque nos cantos da fazenda."
      />
      <MapPanel>
        {notice ? <Notice variant="warning">{notice}</Notice> : null}
        <Text
          weight="semibold"
          accessibilityLiveRegion="polite"
          accessibilityLabel={farmMapSpoken(points.length, areaHa)}
        >
          {farmMapStatus(points.length, areaHa)}
        </Text>
        <Text variant="label" tone="muted">
          {instruction}
        </Text>
        {!simple ? <Notice variant="error">As linhas do limite se cruzam. Desfaça o último ponto.</Notice> : null}
        {atCap ? <Notice variant="warning">Limite de 200 pontos atingido.</Notice> : null}
        <View style={styles.row}>
          <Button
            variant="secondary"
            size="sm"
            icon={Undo2}
            disabled={points.length === 0}
            accessibilityLabel="Desfazer último ponto"
            onPress={() => onPointsChange(points.slice(0, -1))}
          >
            Desfazer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Eraser}
            disabled={points.length === 0}
            accessibilityLabel="Limpar todos os pontos"
            onPress={handleClear}
          >
            Limpar
          </Button>
        </View>
        <Button variant="primary" size="md" fullWidth disabled={!canContinue(points)} onPress={onContinue}>
          Continuar
        </Button>
      </MapPanel>

      <ConfirmDialog
        open={confirmClear}
        title="Limpar todos os pontos?"
        message="Você vai marcar o limite da fazenda do começo."
        confirmLabel="Limpar pontos"
        cancelLabel="Manter pontos"
        tone="danger"
        onConfirm={() => {
          setConfirmClear(false);
          onPointsChange([]);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </View>
  );
}
