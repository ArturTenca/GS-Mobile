import CircleCheck from 'lucide-react-native/icons/circle-check';
import OctagonAlert from 'lucide-react-native/icons/octagon-alert';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { LEVEL_LABEL } from '@/security/score';
import type { RiskLevel } from '@/security/score';
import { radius, spacing } from '@/theme/tokens';

type RiskGaugeProps = {
  score: number;
  level: RiskLevel;
};

const ICON: Record<RiskLevel, LucideIcon> = {
  baixo: CircleCheck,
  moderado: TriangleAlert,
  alto: TriangleAlert,
  critico: OctagonAlert,
};

export function RiskGauge({ score, level }: RiskGaugeProps) {
  const { colors } = useTheme();
  const Icon = ICON[level];
  const fill = useMemo(() => {
    const map: Record<RiskLevel, string> = {
      baixo: colors.success,
      moderado: colors.warning,
      alto: colors.alert,
      critico: colors.errorFill,
    };
    return map[level];
  }, [colors, level]);
  const fg = useMemo(() => {
    const map: Record<RiskLevel, string> = {
      baixo: colors.successText,
      moderado: colors.warningText,
      alto: colors.alertText,
      critico: colors.error,
    };
    return map[level];
  }, [colors, level]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
        score: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
        big: { fontSize: 56, lineHeight: 64 },
        col: { flex: 1, gap: spacing.sm },
        level: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        track: {
          height: 12,
          borderRadius: radius.pill,
          backgroundColor: colors.border,
          overflow: 'hidden',
        },
        bar: { height: 12, borderRadius: radius.pill, backgroundColor: fill },
      }),
    [colors, fill],
  );

  const clamped = Math.max(0, Math.min(100, score));
  const label = `Risco Cidadão ${clamped} de 100, nível ${LEVEL_LABEL[level].toLowerCase()}`;

  return (
    <Card variant="important">
      <View accessible accessibilityRole="summary" accessibilityLabel={label} style={styles.row}>
        <View style={styles.col}>
          <Text variant="label" tone="muted">
            Risco Cidadão
          </Text>
          <View style={styles.score}>
            <Text weight="semibold" numeric style={[styles.big, { color: fg }]}>
              {String(clamped)}
            </Text>
            <Text tone="muted">de 100</Text>
          </View>
          <View style={styles.level}>
            <View importantForAccessibility="no" accessibilityElementsHidden>
              <Icon size={24} color={fg} />
            </View>
            <Text weight="semibold" style={{ color: fg }}>
              {`Nível ${LEVEL_LABEL[level]}`}
            </Text>
          </View>
          <View style={styles.track} importantForAccessibility="no" accessibilityElementsHidden>
            <View style={[styles.bar, { width: `${clamped}%` }]} />
          </View>
        </View>
      </View>
    </Card>
  );
}
