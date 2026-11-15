import Check from 'lucide-react-native/icons/check';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export type OptionListItem = { value: string; label: string; subtitle?: string };

type OptionListProps = {
  options: OptionListItem[];
  value: string | null;
  onChange: (value: string) => void;
  rowMinHeight?: number;
  accessibilityLabel?: string;
};

export function OptionList({ options, value, onChange, rowMinHeight = 48, accessibilityLabel }: OptionListProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          minHeight: rowMinHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        texts: { flex: 1 },
      }),
    [colors, rowMinHeight],
  );

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            accessibilityLabel={option.subtitle ? `${option.label}, ${option.subtitle}` : option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.primarySoft } : null]}
          >
            <View style={styles.texts}>
              <Text weight={checked ? 'semibold' : 'regular'} numberOfLines={1}>
                {option.label}
              </Text>
              {option.subtitle ? (
                <Text variant="label" tone="muted" numberOfLines={1}>
                  {option.subtitle}
                </Text>
              ) : null}
            </View>
            {checked ? <Check size={20} color={colors.primaryText} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
