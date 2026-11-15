import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppColumn } from '@/components/layout/AppColumn';
import { DatabaseGate } from '@/components/layout/DatabaseGate';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoadingState } from '@/components/ui/LoadingState';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { ThemeProvider, useTheme } from '@/features/theme/ThemeProvider';
import { queryClient } from '@/lib/queryClient';
import { useAppFonts } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { colors } = useTheme();
  const { session, loading } = useAuth();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
      }),
    [colors],
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <LoadingState />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* Outside both groups: the recovery link signs the user in mid-flow. */}
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}

export default function RootLayout() {
  const fontsReady = useAppFonts();

  // Hide the splash as soon as the first real UI can render (fonts only), so the
  // database gate's loading/unavailable states and the error boundary are visible.
  useEffect(() => {
    if (fontsReady) SplashScreen.hide();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <DatabaseGate>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AppColumn>
                  <Navigator />
                </AppColumn>
              </AuthProvider>
            </QueryClientProvider>
          </DatabaseGate>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
