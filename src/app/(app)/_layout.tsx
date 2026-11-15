import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useProducer } from '@/hooks/useProducer';
import { queryClient } from '@/lib/queryClient';
import { spacing } from '@/theme/tokens';

export default function AppLayout() {
  const producer = useProducer();
  const { colors } = useTheme();
  const { signOut } = useAuth();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          gap: spacing.md,
          backgroundColor: colors.background,
        },
      }),
    [colors],
  );

  if (producer.isLoading) {
    return (
      <View style={styles.center}>
        <LoadingState message="Preparando sua propriedade…" />
      </View>
    );
  }

  if (producer.isError || !producer.data) {
    return (
      <View style={styles.center}>
        <ErrorState onRetry={() => void producer.refetch()} retrying={producer.isFetching} />
        <Button
          variant="ghost"
          onPress={async () => {
            await signOut();
            queryClient.clear();
          }}
        >
          Sair da conta
        </Button>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="alerta/[id]" />
      <Stack.Screen name="analises" />
      <Stack.Screen name="adicionar" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
