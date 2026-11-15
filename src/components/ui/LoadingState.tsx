import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export function LoadingState({ message = 'Carregando…' }: { message?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
      }),
    [],
  );
  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.primaryText} />
      <Text variant="label" tone="muted">
        {message}
      </Text>
    </View>
  );
}
