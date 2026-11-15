import CircleAlert from 'lucide-react-native/icons/circle-alert';
import { forwardRef, useMemo, useState, type ComponentRef } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { fonts, radius, spacing } from '@/theme/tokens';

export type TextareaRef = ComponentRef<typeof TextInput>;

type TextareaProps = Omit<TextInputProps, 'style' | 'multiline'> & {
  label: string;
  error?: string | null;
  helper?: string;
};

export const Textarea = forwardRef<TextareaRef, TextareaProps>(function Textarea(
  { label, error, helper, editable = true, numberOfLines = 4, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: spacing.xs },
        input: {
          minHeight: 96,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderRadius: radius.button,
          backgroundColor: editable ? colors.card : colors.background,
          borderWidth: focused || error ? 2 : 1,
          borderColor: error ? colors.error : focused ? colors.primaryText : colors.inputBorder,
          color: colors.text,
          fontFamily: fonts.regular,
          fontSize: 16,
          textAlignVertical: 'top',
          opacity: editable ? 1 : 0.5,
          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
        },
        errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
      }),
    [colors, focused, error, editable],
  );

  return (
    <View style={styles.wrap}>
      <Text variant="label" weight="semibold">
        {label}
      </Text>
      <TextInput
        ref={ref}
        {...rest}
        multiline
        numberOfLines={numberOfLines}
        editable={editable}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <CircleAlert size={16} color={colors.error} />
          <Text variant="caption" tone="error" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text variant="caption" tone="muted">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});
