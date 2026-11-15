import { CircleAlert, Droplets, Sprout, Thermometer, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';
import { Text } from '@/components/ui/Text';
import { SENSOR_TYPE_LABELS, SENSOR_TYPES } from '@/features/sensor/sensorFlow';
import { useTheme } from '@/features/theme/ThemeProvider';
import { formatHa } from '@/lib/geo';
import type { Farm } from '@/services/farms';
import { spacing } from '@/theme/tokens';
import type { SensorType } from '@/types/database';

const TYPE_ICONS: Record<SensorType, LucideIcon> = {
  temperature: Thermometer,
  air_humidity: Droplets,
  soil_moisture: Sprout,
};

type SensorFormStepProps = {
  farms: Farm[];
  excludedCount: number;
  farmId: string;
  onFarmChange: (id: string) => void;
  type: SensorType | null;
  onTypeChange: (type: SensorType) => void;
  typeError: boolean;
  onContinue: () => void;
};

export function SensorFormStep({
  farms,
  excludedCount,
  farmId,
  onFarmChange,
  type,
  onTypeChange,
  typeError,
  onContinue,
}: SensorFormStepProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { gap: spacing.lg },
        head: { gap: spacing.xs },
        card: { gap: spacing.lg },
        group: { gap: spacing.sm },
        chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm },
        error: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
        spacer: { height: spacing.xxl },
      }),
    [],
  );

  const options = farms.map((f) => ({
    value: f.id,
    label: `${f.name} · ${formatHa(f.area_ha ?? 0)}`,
  }));

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="heading" weight="semibold" accessibilityRole="header">
          Onde e o que medir
        </Text>
        <Text tone="muted">Escolha a fazenda e o tipo de sensor.</Text>
      </View>
      <Card>
        <View style={styles.card}>
          <View style={styles.group}>
            <Select label="Fazenda" options={options} value={farmId} onChange={onFarmChange} />
            {excludedCount > 0 ? (
              <Text variant="caption" tone="muted">
                Fazendas sem limite no mapa não aparecem aqui.
              </Text>
            ) : null}
          </View>
          <View style={styles.group}>
            <Text variant="label" weight="semibold">
              Tipo de sensor
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de sensor" style={styles.chips}>
              {SENSOR_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={SENSOR_TYPE_LABELS[t]}
                  icon={TYPE_ICONS[t]}
                  selected={type === t}
                  onPress={() => onTypeChange(t)}
                />
              ))}
            </View>
            {typeError ? (
              <View style={styles.error} accessibilityRole="alert">
                <CircleAlert size={16} color={colors.error} />
                <Text variant="label" tone="error">
                  Escolha o tipo de sensor.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
      <View style={styles.spacer} />
      <Button variant="primary" size="md" fullWidth onPress={onContinue}>
        Continuar
      </Button>
    </View>
  );
}
