import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type StepHeaderProps = {
  step: number;
  total: number;
  name: string;
};

export function StepHeader({ step, total, name }: StepHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.xs },
        bar: { flexDirection: 'row', gap: spacing.xs },
        segment: { flex: 1, height: 4, borderRadius: radius.pill },
      }),
    [],
  );

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Etapa ${step} de ${total}: ${name}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
    >
      <Text variant="label" weight="semibold">
        {`Etapa ${step} de ${total} · ${name}`}
      </Text>
      <View style={styles.bar}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < step ? colors.primary : colors.border }]}
          />
        ))}
      </View>
    </View>
  );
}
