import { useMemo, type ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

type ScreenContainerProps = {
  children: ReactNode;
  centered?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function ScreenContainer({
  children,
  centered = false,
  refreshing = false,
  onRefresh,
}: ScreenContainerProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        content: {
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.xl,
        },
        centered: { justifyContent: 'center' },
      }),
    [colors],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // RN Web wraps RefreshControl in a View that breaks scrolling, so native only.
        refreshControl={
          onRefresh && Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryText}
              colors={[colors.primaryText]}
              progressBackgroundColor={colors.card}
            />
          ) : undefined
        }
        contentContainerStyle={[styles.content, centered ? styles.centered : null]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
