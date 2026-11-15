import { useLocalSearchParams, useRouter } from 'expo-router';
import { BellOff, Clock, ListChecks, MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SEVERITY_META, STATUS_META } from '@/components/alerts/alertMeta';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useAlert } from '@/hooks/useAlert';
import { useNow } from '@/hooks/useNow';
import { formatDateTime, formatRelative } from '@/lib/formatTime';
import { spacing } from '@/theme/tokens';

export default function AlertaDetalheScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { colors } = useTheme();
  const now = useNow();
  const query = useAlert(id);
  const alert = query.data ?? null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { gap: spacing.lg },
        badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
        cardBody: { gap: spacing.md },
        metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        metaText: { flexShrink: 1 },
        titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
      }),
    [],
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const goAlerts = () => router.navigate('/alertas');

  const severity = alert ? SEVERITY_META[alert.severity] : null;
  const status = alert ? STATUS_META[alert.status] : null;

  return (
    <>
      <ScreenHeader title="Detalhe do alerta" onBack={goBack} />
      <ScreenContainer>
        <AsyncBoundary
          query={query}
          isEmpty={!alert}
          loadingMessage="Carregando alerta…"
          empty={
            <EmptyState
              icon={BellOff}
              title="Alerta não encontrado"
              description="Ele pode ter sido removido. Veja a lista completa de alertas."
              actionLabel="Ver todos os alertas"
              onAction={goAlerts}
            />
          }
        >
          {alert && severity && status ? (
            <View style={styles.content}>
              <Card>
                <View style={styles.cardBody}>
                  <View style={styles.badges}>
                    <Badge variant={severity.badge} icon={severity.icon}>
                      {severity.label}
                    </Badge>
                    <Badge variant={status.badge} icon={status.icon}>
                      {status.label}
                    </Badge>
                  </View>
                  <Text variant="heading" weight="semibold" accessibilityRole="header">
                    {alert.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Clock size={16} color={colors.textMuted} />
                    <Text variant="label" tone="muted" numeric style={styles.metaText}>
                      {`${formatDateTime(alert.triggeredAt)} · ${formatRelative(alert.triggeredAt, now)}`}
                    </Text>
                  </View>
                  {alert.areaName ? (
                    <View style={styles.metaRow}>
                      <MapPin size={16} color={colors.textMuted} />
                      <Text variant="label" tone="muted" style={styles.metaText}>
                        {alert.sensorName ? `${alert.areaName} · ${alert.sensorName}` : alert.areaName}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>

              <Card>
                <View style={styles.cardBody}>
                  <Text variant="body" weight="semibold">
                    O que aconteceu
                  </Text>
                  <Text variant="body">{alert.description}</Text>
                </View>
              </Card>

              <Card variant="important">
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <ListChecks size={20} color={colors.primaryText} />
                    <Text variant="body" weight="semibold">
                      O que fazer
                    </Text>
                  </View>
                  <Text variant="body">
                    {alert.recommendation ?? 'Sem recomendação registrada.'}
                  </Text>
                </View>
              </Card>

              <Button
                variant="secondary"
                size="md"
                fullWidth
                accessibilityLabel="Ver todos os alertas"
                onPress={goAlerts}
              >
                Ver todos os alertas
              </Button>
            </View>
          ) : null}
        </AsyncBoundary>
      </ScreenContainer>
    </>
  );
}
