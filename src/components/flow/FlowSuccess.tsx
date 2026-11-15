import CircleCheck from 'lucide-react-native/icons/circle-check';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type Action = { label: string; onPress: () => void };

type FlowSuccessProps = {
  title: string;
  children?: ReactNode;
  primary: Action;
  secondary: Action;
};

export function FlowSuccess({ title, children, primary, secondary }: FlowSuccessProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { paddingTop: spacing.xxxl, alignItems: 'center', gap: spacing.md },
        circle: {
          width: 64,
          height: 64,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.successSoft,
        },
        body: { alignItems: 'center', gap: spacing.sm },
        actions: { alignSelf: 'stretch', marginTop: spacing.xxl, gap: spacing.md },
      }),
    [colors],
  );

  return (
    <View style={styles.root}>
      <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
        <CircleCheck size={32} color={colors.success} />
      </View>
      <Text variant="heading" weight="semibold" accessibilityRole="header" accessibilityLiveRegion="polite">
        {title}
      </Text>
      <View style={styles.body}>{children}</View>
      <View style={styles.actions}>
        <Button variant="primary" size="md" fullWidth onPress={primary.onPress}>
          {primary.label}
        </Button>
        <Button variant="ghost" size="md" fullWidth onPress={secondary.onPress}>
          {secondary.label}
        </Button>
      </View>
    </View>
  );
}
