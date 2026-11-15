import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapPanel } from '@/components/map/MapPanel';
import { MapStage } from '@/components/map/MapStage';
import type { MapBase } from '@/components/map/mapProtocol';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { coverageSummary, isPointAllowed, RADIUS_PRESETS, stepRadius } from '@/features/sensor/sensorFlow';
import type { LatLng } from '@/lib/geo';
import type { FarmSensor } from '@/services/sensors';
import { spacing } from '@/theme/tokens';

const INVALID_MS = 1500;
const OUTSIDE_MESSAGE = 'O ponto precisa estar dentro da fazenda. Toque dentro da área destacada.';
const MIN_RADIUS = RADIUS_PRESETS[0];
const MAX_RADIUS = RADIUS_PRESETS[RADIUS_PRESETS.length - 1];

type SensorMapStepProps = {
  farmName: string;
  ring: LatLng[];
  existingSensors: FarmSensor[];
  point: LatLng | null;
  onPointChange: (point: LatLng) => void;
  radiusM: number;
  onRadiusChange: (radiusM: number) => void;
  onContinue: () => void;
};

export function SensorMapStep({
  farmName,
  ring,
  existingSensors,
  point,
  onPointChange,
  radiusM,
  onRadiusChange,
  onContinue,
}: SensorMapStepProps) {
  const [base, setBase] = useState<MapBase>('street');
  const [rev, setRev] = useState(0);
  const [invalidAt, setInvalidAt] = useState<LatLng | null>(null);
  const [outside, setOutside] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const placed = existingSensors.filter(
    (s): s is FarmSensor & { lat: number; lng: number } => s.lat !== null && s.lng !== null,
  );

  const scene = useMemo(() => {
    const markers: { id: string; at: LatLng; kind: 'existing' | 'pending' | 'invalid' }[] = placed.map((s) => ({
      id: `s-${s.id}`,
      at: { lat: s.lat, lng: s.lng },
      kind: 'existing',
    }));
    const circles: { id: string; at: LatLng; radiusM: number; kind: 'existing' | 'pending' }[] = [];
    for (const s of placed) {
      if (s.coverageRadiusM !== null) {
        circles.push({ id: `c-${s.id}`, at: { lat: s.lat, lng: s.lng }, radiusM: s.coverageRadiusM, kind: 'existing' });
      }
    }
    if (point) {
      markers.push({ id: 'pending', at: point, kind: 'pending' });
      circles.push({ id: 'pending-c', at: point, radiusM, kind: 'pending' });
    }
    if (invalidAt) markers.push({ id: 'invalid', at: invalidAt, kind: 'invalid' });
    return {
      view: { fit: ring, paddingPx: 32 },
      interactive: 'place' as const,
      polygon: { points: ring, closed: true },
      markers,
      circles,
      rev,
    };
    // placed is derived from existingSensors
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ring, existingSensors, point, radiusM, invalidAt, rev]);

  function handleTap(p: LatLng) {
    if (isPointAllowed(p, ring)) {
      setOutside(false);
      onPointChange(p);
      return;
    }
    setOutside(true);
    setInvalidAt(p);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setInvalidAt(null), INVALID_MS);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        radius: { gap: spacing.sm },
        radiusMuted: { opacity: 0.5 },
        stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        value: { flex: 1, alignItems: 'center' },
        center: { textAlign: 'center' },
        square: { width: 48 },
      }),
    [],
  );

  const hasPoint = point !== null;
  const instruction = hasPoint
    ? 'Toque em outro lugar para mudar o local. Ajuste o alcance abaixo.'
    : 'Toque dentro da fazenda para colocar o sensor.';

  return (
    <View style={styles.root}>
      <MapStage
        scene={scene}
        base={base}
        onBaseChange={setBase}
        onTap={handleTap}
        onCenter={() => setRev((r) => r + 1)}
        centerLabel="Centralizar na fazenda"
        accessibilityLabel={`Mapa da fazenda ${farmName}. Toque dentro da área para colocar o sensor.`}
      />
      <MapPanel>
        {outside ? <Notice variant="error">{OUTSIDE_MESSAGE}</Notice> : null}
        <Text weight="semibold" accessibilityLiveRegion="polite">
          {hasPoint ? 'Local escolhido' : 'Nenhum local escolhido'}
        </Text>
        <Text variant="label" tone="muted">
          {instruction}
        </Text>
        {placed.length > 0 ? (
          <Text variant="label" tone="muted">
            Sensores já instalados aparecem em cinza.
          </Text>
        ) : null}
        <View style={[styles.radius, hasPoint ? null : styles.radiusMuted]}>
          <Text variant="label" weight="semibold">
            Raio de cobertura
          </Text>
          <View style={styles.stepper}>
            <View style={styles.square}>
              <Button
                variant="secondary"
                size="md"
                icon={Minus}
                iconOnly
                disabled={!hasPoint || radiusM <= MIN_RADIUS}
                accessibilityLabel="Diminuir raio"
                onPress={() => onRadiusChange(stepRadius(radiusM, -1))}
              >
                {''}
              </Button>
            </View>
            <View
              style={styles.value}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`Raio de cobertura: ${radiusM} metros`}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => {
                if (!hasPoint) return;
                onRadiusChange(stepRadius(radiusM, e.nativeEvent.actionName === 'increment' ? 1 : -1));
              }}
            >
              <Text variant="heading" weight="semibold" numeric>{`${radiusM} m`}</Text>
            </View>
            <View style={styles.square}>
              <Button
                variant="secondary"
                size="md"
                icon={Plus}
                iconOnly
                disabled={!hasPoint || radiusM >= MAX_RADIUS}
                accessibilityLabel="Aumentar raio"
                onPress={() => onRadiusChange(stepRadius(radiusM, 1))}
              >
                {''}
              </Button>
            </View>
          </View>
          <Text variant="caption" tone="muted" style={styles.center}>
            {coverageSummary(radiusM)}
          </Text>
        </View>
        <Button variant="primary" size="md" fullWidth disabled={!hasPoint} onPress={onContinue}>
          Continuar
        </Button>
      </MapPanel>
    </View>
  );
}
