import { ChevronRight, ExternalLink, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

type Trailing = 'none' | 'chevron' | 'external' | 'switch';

type SettingsRowProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  trailing?: Trailing;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  stateLabels?: { on: string; off: string };
  isLast?: boolean;
  /** Dims the row and blocks interaction (e.g. category switches while the master is off). */
  disabled?: boolean;
  /** Allow selecting the value text (e.g. e-mail). */
  valueSelectable?: boolean;
};

const DEFAULT_STATE_LABELS = { on: 'Ligado', off: 'Desligado' };

export function SettingsRow({
  icon: Icon,
  label,
  description,
  value,
  onPress,
  trailing = 'none',
  switchValue = false,
  onSwitchChange,
  stateLabels = DEFAULT_STATE_LABELS,
  isLast = false,
  disabled = false,
  valueSelectable = false,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
        },
        body: { flex: 1, minWidth: 0 },
        value: { flexShrink: 1, maxWidth: '55%', textAlign: 'right' },
        trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        switchWrap: { pointerEvents: 'none' },
        disabled: { opacity: 0.5 },
      }),
    [colors, isLast],
  );

  const isSwitch = trailing === 'switch';
  const stateText = switchValue ? stateLabels.on : stateLabels.off;

  const content = (
    <>
      <View importantForAccessibility="no" accessibilityElementsHidden>
        <Icon size={20} color={colors.textMuted} />
      </View>
      <View style={styles.body}>
        <Text variant="body">{label}</Text>
        {description ? (
          <Text variant="label" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {value && !isSwitch ? (
        <Text variant="body" weight="semibold" numberOfLines={1} selectable={valueSelectable} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {trailing === 'chevron' ? (
        <View importantForAccessibility="no" accessibilityElementsHidden>
          <ChevronRight size={20} color={colors.textMuted} />
        </View>
      ) : null}
      {trailing === 'external' ? (
        <View importantForAccessibility="no" accessibilityElementsHidden>
          <ExternalLink size={20} color={colors.textMuted} />
        </View>
      ) : null}
      {isSwitch ? (
        <View style={styles.trailing}>
          <Text variant="label" tone="muted">
            {stateText}
          </Text>
          {/* The whole row is the touch target; the Switch is visual only. */}
          <View style={styles.switchWrap} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Switch
              value={switchValue}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={switchValue ? colors.onPrimary : colors.card}
              disabled={disabled}
              accessible={false}
            />
          </View>
        </View>
      ) : null}
    </>
  );

  if (isSwitch) {
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: switchValue, disabled }}
        disabled={disabled}
        accessibilityLabel={description ? `${label}, ${description}` : label}
        accessibilityValue={{ text: stateText }}
        onPress={disabled ? undefined : () => onSwitchChange?.(!switchValue)}
        style={({ pressed }) => [
          styles.row,
          disabled ? styles.disabled : null,
          pressed && !disabled ? { backgroundColor: colors.background } : null,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${value}` : label}
        accessibilityHint={description}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.background } : null]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}
