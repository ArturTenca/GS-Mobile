import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type CardProps = {
  variant?: 'default' | 'important';
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Card({ variant = 'default', padded = true, onPress, accessibilityLabel, style, children }: CardProps) {
  const { colors } = useTheme();
  const base = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? spacing.lg : 0,
          borderRadius: variant === 'important' ? radius.cardLg : radius.card,
        },
      }).card,
    [colors, variant, padded],
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [base, style, pressed ? { backgroundColor: colors.background } : null]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
