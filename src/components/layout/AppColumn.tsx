import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';

// Mobile-first column centered on wide screens; the app background extends to the sides.
export function AppColumn({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
        inner: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
      }),
    [colors],
  );

  // Keep the page behind the app (overscroll, resize) the same color on web.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = colors.background;
    document.body.style.backgroundColor = colors.background;
  }, [colors.background]);

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}
