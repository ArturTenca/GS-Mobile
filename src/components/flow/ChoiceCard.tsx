import ChevronRight from 'lucide-react-native/icons/chevron-right';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type ChoiceCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function ChoiceCard({ icon: Icon, title, description, onPress, disabled = false, accessibilityLabel }: ChoiceCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          minHeight: 88,
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.card,
        },
        circle: {
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        texts: { flex: 1, gap: spacing.xs },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}. ${description}`}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: disabled || pressed ? colors.background : colors.card,
        },
      ]}
    >
      <View
        style={[styles.circle, { backgroundColor: disabled ? colors.card : colors.primarySoft }]}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        <Icon size={24} color={disabled ? colors.textMuted : colors.primaryText} />
      </View>
      <View style={styles.texts}>
        <Text variant="body" weight="semibold" tone={disabled ? 'muted' : undefined}>
          {title}
        </Text>
        <Text variant="label" tone="muted">
          {description}
        </Text>
      </View>
      {disabled ? null : <ChevronRight size={20} color={colors.textMuted} />}
    </Pressable>
  );
}
