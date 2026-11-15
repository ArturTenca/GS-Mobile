import Check from 'lucide-react-native/icons/check';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing, touch } from '@/theme/tokens';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  /** 'radio' inside a radiogroup (single-select); visuals are unchanged. */
  role?: 'button' | 'radio';
};

export function Chip({ label, selected = false, onPress, icon: Icon, disabled = false, role = 'button' }: ChipProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        hit: { minHeight: touch.min, minWidth: touch.min, justifyContent: 'center', opacity: disabled ? 0.5 : 1 },
        pill: {
          minHeight: 32,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          backgroundColor: selected ? colors.primarySoft : colors.card,
          borderColor: selected ? colors.primary : colors.inputBorder,
        },
      }),
    [colors, selected, disabled],
  );
  const LeadIcon = selected ? Check : Icon;

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'radio' ? { checked: selected, disabled } : { selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.hit, pressed ? { opacity: 0.7 } : null]}
    >
      <View style={styles.pill}>
        {LeadIcon ? (
          <View importantForAccessibility="no" accessibilityElementsHidden>
            <LeadIcon size={16} color={selected ? colors.primaryText : colors.text} />
          </View>
        ) : null}
        <Text variant="label" weight={selected ? 'semibold' : 'regular'} tone={selected ? 'primary' : 'default'}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
