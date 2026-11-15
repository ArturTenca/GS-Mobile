import CloudOff from 'lucide-react-native/icons/cloud-off';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry: () => void;
  retrying?: boolean;
};

export function ErrorState({
  title = 'Sem conexão com o servidor',
  description = 'Verifique sua internet e toque em tentar novamente.',
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xl },
        circle: {
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.errorSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        center: { textAlign: 'center' },
        desc: { textAlign: 'center', maxWidth: 280 },
      }),
    [colors],
  );
  return (
    <View style={styles.root}>
      <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
        <CloudOff size={24} color={colors.error} />
      </View>
      <Text variant="heading" weight="semibold" accessibilityRole="alert" style={styles.center}>
        {title}
      </Text>
      <Text variant="label" tone="muted" style={styles.desc}>
        {description}
      </Text>
      <Button variant="primary" loading={retrying} loadingLabel="Tentando…" onPress={onRetry}>
        Tentar novamente
      </Button>
    </View>
  );
}
