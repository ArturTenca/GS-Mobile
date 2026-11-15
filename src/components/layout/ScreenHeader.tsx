import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing, touch } from '@/theme/tokens';

type ScreenHeaderProps = {
  title?: string;
  brand?: boolean;
  onBack?: () => void;
};

export function ScreenHeader({ title, brand = false, onBack }: ScreenHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          height: 56,
          backgroundColor: colors.background,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        },
        back: {
          width: touch.min,
          height: touch.min,
          borderRadius: radius.button,
          alignItems: 'center',
          justifyContent: 'center',
        },
        backPressed: { backgroundColor: colors.background },
      }),
    [colors],
  );

  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed ? styles.backPressed : null]}
        >
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
      ) : null}
      {brand ? (
        <Logo size={32} withWordmark />
      ) : (
        <Text variant="heading" weight="semibold" accessibilityRole="header">
          {title}
        </Text>
      )}
    </View>
  );
}
