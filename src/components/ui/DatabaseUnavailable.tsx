import { CloudOff } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type DatabaseUnavailableProps = {
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  description?: string;
  retryLabel?: string;
};

export function DatabaseUnavailable({
  onRetry,
  retrying = false,
  title = 'Não foi possível conectar',
  description = 'O app abriu, mas o servidor não respondeu. Verifique sua internet e tente de novo.',
  retryLabel = 'Tentar novamente',
}: DatabaseUnavailableProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          backgroundColor: colors.background,
        },
        column: { width: '100%', maxWidth: 390, gap: spacing.xxl },
        brand: { alignItems: 'center' },
        content: { alignItems: 'center', gap: spacing.md, padding: spacing.sm },
        circle: {
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.errorSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        center: { textAlign: 'center' },
      }),
    [colors],
  );

  return (
    <View style={styles.root}>
      <View style={styles.column}>
        <View style={styles.brand}>
          <Logo size={56} withWordmark stacked />
        </View>
        <Card variant="important">
          <View style={styles.content}>
            <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
              <CloudOff size={24} color={colors.error} />
            </View>
            <Text variant="heading" weight="semibold" accessibilityRole="alert" style={styles.center}>
              {title}
            </Text>
            <Text variant="label" tone="muted" style={styles.center}>
              {description}
            </Text>
            {onRetry ? (
              <Button fullWidth loading={retrying} loadingLabel="Tentando…" onPress={onRetry}>
                {retryLabel}
              </Button>
            ) : null}
          </View>
        </Card>
      </View>
    </View>
  );
}
