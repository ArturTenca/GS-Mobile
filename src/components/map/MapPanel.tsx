import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export function MapPanel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const maxHeight = height * 0.55;
  const overflow = contentHeight > maxHeight;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.lg + insets.bottom,
        },
        content: { gap: spacing.md },
      }),
    [colors, insets.bottom],
  );

  return (
    <View style={[styles.root, overflow ? { maxHeight } : null]}>
      <ScrollView scrollEnabled={overflow} showsVerticalScrollIndicator={overflow} keyboardShouldPersistTaps="handled">
        <View style={styles.content} onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
