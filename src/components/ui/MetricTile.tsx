import CircleCheck from 'lucide-react-native/icons/circle-check';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

type MetricStatus = 'normal' | 'atencao' | 'critico' | 'semDados';

const STATUS: Record<
  MetricStatus,
  { word: string; variant: 'default' | 'success' | 'warning' | 'error'; icon: LucideIcon }
> = {
  normal: { word: 'Normal', variant: 'success', icon: CircleCheck },
  atencao: { word: 'Atenção', variant: 'warning', icon: TriangleAlert },
  critico: { word: 'Crítico', variant: 'error', icon: TriangleAlert },
  semDados: { word: 'Sem dados', variant: 'default', icon: WifiOff },
};

type MetricTileProps = {
  label: string;
  value: string | number;
  unit?: string;
  status?: MetricStatus;
  icon?: LucideIcon;
  context?: string;
  onPress?: () => void;
  /** Stretch to the parent's height (equal-height rows). */
  fill?: boolean;
};

export function MetricTile({ label, value, unit, status, icon: Icon, context, onPress, fill = false }: MetricTileProps) {
  const { colors } = useTheme();
  const s = status ? STATUS[status] : null;
  const accessibilityLabel = `${label}: ${value}${unit ? ` ${unit}` : ''}${s ? `, ${s.word}` : ''}${
    context ? `, ${context}` : ''
  }`;

  const inner = (
    <View style={[styles.col, fill && styles.fill]}>
      <View style={styles.labelRow}>
        {Icon ? (
          <View importantForAccessibility="no" accessibilityElementsHidden>
            <Icon size={20} color={colors.textMuted} />
          </View>
        ) : null}
        <Text variant="label" tone="muted" style={styles.label}>
          {label}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <Text variant="heading" weight="semibold" numeric>
          {String(value)}
        </Text>
        {unit ? (
          <Text variant="label" tone="muted">
            {unit}
          </Text>
        ) : null}
      </View>
      {context ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {context}
        </Text>
      ) : null}
      {s ? (
        <View style={styles.badge}>
          <Badge variant={s.variant} icon={s.icon}>
            {s.word}
          </Badge>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Card onPress={onPress} accessibilityLabel={accessibilityLabel} style={fill && styles.fill}>
        {inner}
      </Card>
    );
  }
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={fill && styles.fill}>
      <Card style={fill && styles.fill}>{inner}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  badge: { marginTop: 'auto', paddingTop: spacing.xs },
  fill: { flex: 1 },
});
