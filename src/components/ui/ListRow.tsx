import ChevronRight from 'lucide-react-native/icons/chevron-right';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing, touch } from '@/theme/tokens';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
  isLast?: boolean;
};

export function ListRow({
  title,
  subtitle,
  icon: Icon,
  trailing,
  onPress,
  showChevron = false,
  accessibilityLabel,
  isLast = false,
}: ListRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          minHeight: Math.max(56, touch.min),
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
        },
        lead: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primarySoft,
        },
        body: { flex: 1, minWidth: 0 },
      }),
    [colors, isLast],
  );

  const content = (
    <>
      {Icon ? (
        <View style={styles.lead} importantForAccessibility="no" accessibilityElementsHidden>
          <Icon size={20} color={colors.primaryText} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text variant="body">{title}</Text>
        {subtitle ? (
          <Text variant="label" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? (
        <View importantForAccessibility="no" accessibilityElementsHidden>
          <ChevronRight size={20} color={colors.textMuted} />
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.background } : null]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View style={styles.row} accessible accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}
