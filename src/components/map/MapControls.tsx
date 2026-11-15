import Crosshair from 'lucide-react-native/icons/crosshair';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing, touch } from '@/theme/tokens';

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  centerLabel: string;
};

export function MapControls({ onZoomIn, onZoomOut, onCenter, canZoomIn, canZoomOut, centerLabel }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { position: 'absolute', top: spacing.md, right: spacing.md, gap: spacing.md },
        card: {
          borderRadius: radius.card,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          shadowColor: colors.text,
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        button: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
        divider: { height: 1, backgroundColor: colors.border },
      }),
    [colors],
  );

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aproximar mapa"
          accessibilityState={{ disabled: !canZoomIn }}
          disabled={!canZoomIn}
          onPress={onZoomIn}
          style={styles.button}
        >
          <Plus size={24} color={canZoomIn ? colors.text : colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Afastar mapa"
          accessibilityState={{ disabled: !canZoomOut }}
          disabled={!canZoomOut}
          onPress={onZoomOut}
          style={styles.button}
        >
          <Minus size={24} color={canZoomOut ? colors.text : colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={centerLabel} onPress={onCenter} style={styles.button}>
          <Crosshair size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}
