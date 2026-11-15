import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing, touch } from '@/theme/tokens';

type TabsProps = {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  /** 'radio' exposes the segments as a radio group (settings choices); the look is unchanged. */
  semantics?: 'tabs' | 'radio';
  accessibilityLabel?: string;
};

export function Tabs({ tabs, active, onChange, semantics = 'tabs', accessibilityLabel }: TabsProps) {
  const isRadio = semantics === 'radio';
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          height: 56,
          padding: spacing.xs,
          borderRadius: radius.card,
          backgroundColor: colors.background,
          gap: spacing.xs,
        },
        segment: {
          flex: 1,
          minHeight: touch.min,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.button - 2,
          borderWidth: 1,
          borderColor: 'transparent',
        },
        segmentActive: { backgroundColor: colors.card, borderColor: colors.border },
        bar: {
          position: 'absolute',
          bottom: 0,
          left: 12,
          right: 12,
          height: 2,
          backgroundColor: colors.primary,
        },
      }),
    [colors],
  );

  return (
    <View
      accessibilityRole={isRadio ? 'radiogroup' : 'tablist'}
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole={isRadio ? 'radio' : 'tab'}
            accessibilityState={isRadio ? { checked: selected } : { selected }}
            onPress={() => onChange(tab.id)}
            style={[styles.segment, selected ? styles.segmentActive : null]}
          >
            <Text variant="label" weight="semibold" tone={selected ? 'default' : 'muted'}>
              {tab.label}
            </Text>
            {selected ? <View style={styles.bar} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
