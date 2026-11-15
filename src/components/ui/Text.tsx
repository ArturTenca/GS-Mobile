import { useMemo } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import { fonts, typography, type TypographyVariant } from '@/theme/tokens';

type Tone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'error';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  weight?: 'regular' | 'semibold';
  tone?: Tone;
  numeric?: boolean;
};

export function Text({
  variant = 'body',
  weight = 'regular',
  tone = 'default',
  numeric = false,
  style,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const color = useMemo(() => {
    const map: Record<Tone, string> = {
      default: colors.text,
      muted: colors.textMuted,
      primary: colors.primaryText,
      success: colors.successText,
      warning: colors.warningText,
      error: colors.error,
    };
    return map[tone];
  }, [colors, tone]);

  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color, fontFamily: weight === 'semibold' ? fonts.semibold : fonts.regular },
        numeric ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
