import Droplets from 'lucide-react-native/icons/droplets';
import Sprout from 'lucide-react-native/icons/sprout';
import Thermometer from 'lucide-react-native/icons/thermometer';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import type { FarmSensor } from '@/services/sensors';
import { radius, spacing } from '@/theme/tokens';
import type { SensorType } from '@/types/database';

const TYPE_META: Record<SensorType, { label: string; icon: LucideIcon }> = {
  temperature: { label: 'Temperatura', icon: Thermometer },
  air_humidity: { label: 'Umidade do ar', icon: Droplets },
  soil_moisture: { label: 'Umidade do solo', icon: Sprout },
};

type SensorRowProps = {
  sensor: FarmSensor;
  isLast?: boolean;
};

export function SensorRow({ sensor, isLast = false }: SensorRowProps) {
  const { colors } = useTheme();
  const meta = TYPE_META[sensor.type];
  const Icon = meta.icon;
  const r = sensor.coverageRadiusM;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          minHeight: 72,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
        },
        circle: {
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        texts: { flex: 1 },
      }),
    [colors, isLast],
  );

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={
        r != null ? `${sensor.name}, ${meta.label}, raio de ${r} metros` : `${sensor.name}, ${meta.label}`
      }
    >
      <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
        <Icon size={20} color={colors.textMuted} />
      </View>
      <View style={styles.texts}>
        <Text variant="body" weight="semibold" numberOfLines={2}>
          {sensor.name}
        </Text>
        <Text variant="label" tone="muted">
          {r != null ? `${meta.label} · raio de ${r} m` : meta.label}
        </Text>
      </View>
    </View>
  );
}
