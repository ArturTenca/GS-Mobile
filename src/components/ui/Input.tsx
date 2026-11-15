import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { forwardRef, useMemo, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { fonts, radius, spacing, touch } from '@/theme/tokens';

export type InputRef = ComponentRef<typeof TextInput>;

type InputProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  helper?: string;
};

export const Input = forwardRef<InputRef, InputProps>(function Input(
  { label, error, helper, secureTextEntry, editable = true, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecret = Boolean(secureTextEntry);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: spacing.xs },
        field: {
          minHeight: touch.min,
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: radius.button,
          backgroundColor: editable ? colors.card : colors.background,
          borderWidth: focused || error ? 2 : 1,
          borderColor: error ? colors.error : focused ? colors.primaryText : colors.inputBorder,
          opacity: editable ? 1 : 0.5,
        },
        input: {
          flex: 1,
          minHeight: touch.min - 4,
          paddingHorizontal: spacing.md,
          color: colors.text,
          fontFamily: fonts.regular,
          fontSize: 16,
          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
        },
        toggle: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
        errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
      }),
    [colors, focused, error, editable],
  );

  return (
    <View style={styles.wrap}>
      <Text variant="label" weight="semibold">
        {label}
      </Text>
      <View style={styles.field}>
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          secureTextEntry={isSecret && !revealed}
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
        {isSecret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            disabled={!editable}
            onPress={() => setRevealed((v) => !v)}
            style={styles.toggle}
          >
            {revealed ? (
              <EyeOff size={20} color={colors.textMuted} />
            ) : (
              <Eye size={20} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}
      </View>
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
