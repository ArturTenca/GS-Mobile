import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'secondary';
};

export function EmptyState({ title, description, icon: Icon, actionLabel, onAction, actionVariant }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xl },
        circle: {
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        center: { textAlign: 'center' },
        desc: { textAlign: 'center', maxWidth: 280 },
      }),
    [colors],
  );
  return (
    <View style={styles.root}>
      {Icon ? (
        <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
          <Icon size={24} color={colors.textMuted} />
        </View>
      ) : null}
      <Text variant="heading" weight="semibold" accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      {description ? (
        <Text variant="label" tone="muted" style={styles.desc}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant={actionVariant ?? 'secondary'} size={actionVariant === 'primary' ? 'md' : 'sm'} onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
