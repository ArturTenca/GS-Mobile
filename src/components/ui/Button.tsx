import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing, touch } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  variant?: Variant;
  /** 'danger' on the secondary variant keeps card background + border with error text/icon (not a filled red button). */
  tone?: 'default' | 'danger';
  size?: 'md' | 'sm';
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  /** Square icon-only button (children is not rendered; use accessibilityLabel). */
  iconOnly?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  children: string;
};

export function Button({
  variant = 'primary',
  tone = 'default',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingLabel = 'Carregando…',
  disabled = false,
  icon: Icon,
  iconOnly = false,
  onPress,
  accessibilityLabel,
  children,
}: ButtonProps) {
  const { colors } = useTheme();

  const palette = useMemo(() => {
    const map: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
      primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary },
      secondary: { bg: colors.card, pressed: colors.background, fg: colors.text, border: colors.inputBorder },
      danger: { bg: colors.errorFill, pressed: colors.errorFill, fg: colors.onPrimary },
      ghost: { bg: 'transparent', pressed: colors.primarySoft, fg: colors.primaryText },
    };
    const base = map[variant];
    return variant === 'secondary' && tone === 'danger' ? { ...base, fg: colors.error } : base;
  }, [colors, variant, tone]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          minHeight: size === 'sm' ? 40 : touch.min,
          paddingHorizontal: iconOnly ? 0 : spacing.lg,
          minWidth: iconOnly ? touch.min : undefined,
          borderRadius: radius.button,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border,
        },
        full: { alignSelf: 'stretch' },
        disabled: { opacity: 0.5 },
      }),
    [palette, size, iconOnly],
  );

  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={size === 'sm' ? { top: 4, bottom: 4 } : undefined}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? palette.pressed : palette.bg },
        fullWidth ? styles.full : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator size={20} color={palette.fg} />
      ) : Icon ? (
        <View importantForAccessibility="no" accessibilityElementsHidden>
          <Icon size={20} color={palette.fg} />
        </View>
      ) : null}
      {iconOnly && !loading ? null : (
        <Text variant="body" weight="semibold" style={{ color: palette.fg }}>
          {loading ? loadingLabel : children}
        </Text>
      )}
    </Pressable>
  );
}
