import ChevronDown from 'lucide-react-native/icons/chevron-down';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Modal } from '@/components/ui/Modal';
import { OptionList } from '@/components/ui/OptionList';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing, touch } from '@/theme/tokens';

export type SelectOption = { value: string; label: string };

type SelectProps = {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  placeholder?: string;
  disabled?: boolean;
};

export function Select({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = 'Selecione',
  disabled = false,
}: SelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: spacing.xs },
        field: {
          minHeight: touch.min,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.button,
          backgroundColor: disabled ? colors.background : colors.card,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.error : colors.inputBorder,
          opacity: disabled ? 0.5 : 1,
        },
        errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
      }),
    [colors, error, disabled],
  );

  return (
    <View style={styles.wrap}>
      <Text variant="label" weight="semibold">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? selected.label : placeholder}`}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={styles.field}
      >
        <Text style={{ flex: 1 }} tone={selected ? 'default' : 'muted'} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={20} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <CircleAlert size={16} color={colors.error} />
          <Text variant="caption" tone="error" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}

      <Modal open={open} title={label} onClose={() => setOpen(false)}>
        <OptionList
          options={options}
          value={value}
          accessibilityLabel={label}
          onChange={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </Modal>
    </View>
  );
}
