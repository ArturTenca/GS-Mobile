import MapIcon from 'lucide-react-native/icons/map';
import Satellite from 'lucide-react-native/icons/satellite';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing, touch } from '@/theme/tokens';

import type { MapBase } from './mapProtocol';

type Props = { value: MapBase; onChange: (value: MapBase) => void };

const OPTIONS = [
  { id: 'street' as const, label: 'Mapa', Icon: MapIcon },
  { id: 'satellite' as const, label: 'Satélite', Icon: Satellite },
];

export function MapLayerToggle({ value, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          position: 'absolute',
          top: spacing.md,
          left: spacing.md,
          flexDirection: 'row',
          gap: spacing.xs,
          padding: spacing.xs,
          borderRadius: radius.card,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.text,
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        segment: {
          minHeight: touch.min,
          paddingHorizontal: spacing.md,
          borderRadius: radius.button - 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        selected: { backgroundColor: colors.primarySoft },
      }),
    [colors],
  );

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de mapa" style={styles.root}>
      {OPTIONS.map(({ id, label, Icon }) => {
        const checked = id === value;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked }}
            onPress={() => onChange(id)}
            style={[styles.segment, checked ? styles.selected : null]}
          >
            <Icon size={16} color={checked ? colors.primaryText : colors.textMuted} />
            <Text variant="body" weight={checked ? 'semibold' : 'regular'} tone={checked ? 'primary' : 'default'}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
