import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  stacked?: boolean;
};

export function Logo({ size = 32, withWordmark = false, stacked = false }: LogoProps) {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="AgroAlerta"
      style={[styles.container, stacked ? styles.stacked : styles.horizontal]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Leaf */}
          <Path d="M4 20C4 11 9 6 17 5c0 8-4 13-11 13.5L4 20Z" fill={colors.primaryText} />
          {/* Signal waves */}
          <Path
            d="M16 11a4 4 0 0 1 4 4"
            stroke={colors.primaryText}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M16 7.5a7.5 7.5 0 0 1 7.5 7.5"
            stroke={colors.primaryText}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      {withWordmark ? (
        <Text variant="heading" weight="semibold" accessibilityElementsHidden>
          AgroAlerta
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  horizontal: { flexDirection: 'row', gap: spacing.sm },
  stacked: { flexDirection: 'column', gap: spacing.md },
});
