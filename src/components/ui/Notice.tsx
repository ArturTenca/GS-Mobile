import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type NoticeProps = {
  variant: 'warning' | 'error' | 'success';
  children: string;
};

export function Notice({ variant, children }: NoticeProps) {
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(children);
    }
  }, [children]);

  const { bg, fg, Icon } = useMemo(() => {
    switch (variant) {
      case 'error':
        return { bg: colors.errorSoft, fg: colors.error, Icon: CircleAlert };
      case 'success':
        return { bg: colors.successSoft, fg: colors.successText, Icon: CircleCheck };
      default:
        return { bg: colors.warningSoft, fg: colors.warningText, Icon: TriangleAlert };
    }
  }, [colors, variant]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.card,
          backgroundColor: bg,
        },
      }),
    [bg],
  );

  return (
    <View style={styles.box} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Icon size={20} color={fg} />
      <Text variant="label" style={{ color: fg, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}
