import { useLocalSearchParams, useRouter } from 'expo-router';
import { Activity, BellOff, CircleCheck, Clock, ListChecks, MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_META, SEVERITY_META, STATUS_META } from '@/components/alerts/alertMeta';
import { ReadingEvidence } from '@/components/alerts/ReadingEvidence';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useAlert } from '@/hooks/useAlert';
import { useNow } from '@/hooks/useNow';
import { useUpdateAlertStatus } from '@/hooks/useUpdateAlertStatus';
import { formatDateTime, formatRelative } from '@/lib/formatTime';
import { spacing } from '@/theme/tokens';

const SENSOR_CATEGORIES = ['temperature_high', 'soil_moisture_low', 'air_humidity_high', 'sensor_offline'];

export default function AlertaDetalheScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { colors } = useTheme();
  const now = useNow();
  const query = useAlert(id);
  const alert = query.data ?? null;
  const { update, isUpdating, errorMessage, reset } = useUpdateAlertStatus();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resolvedNow, setResolvedNow] = useState(false);
  const markedRef = useRef<string | null>(null);

  // Opening a novo alert marks it visualizado exactly once; failures are silent.
  useEffect(() => {
    if (!alert || alert.status !== 'novo' || markedRef.current === alert.id) return;
    markedRef.current = alert.id;
    void update(alert.id, 'visualizado');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert?.id, alert?.status]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { gap: spacing.lg },
        badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
        cardBody: { gap: spacing.md },
        metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        metaText: { flexShrink: 1 },
        actions: { gap: spacing.md, marginTop: spacing.lg },
        titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
      }),
    [],
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/alertas'));
  const goAlerts = () => router.navigate('/alertas');
  const goMonitoring = () => router.navigate('/monitoramento');

  const closeDialog = () => {
    setConfirmOpen(false);
    reset();
  };
  const confirmResolve = async () => {
    if (!alert) return;
    const ok = await update(alert.id, 'resolvido');
    if (ok) {
      setConfirmOpen(false);
      setResolvedNow(true);
    }
  };

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
                    <Badge variant="default" icon={CATEGORY_META[alert.category].icon}>
                      {CATEGORY_META[alert.category].label}
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

              <ReadingEvidence alert={alert} />

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

              <View style={styles.actions}>
                {resolvedNow ? (
                  <Notice variant="success">Alerta resolvido.</Notice>
                ) : alert.status === 'resolvido' ? (
                  <Notice variant="success">Este alerta já foi resolvido.</Notice>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    icon={CircleCheck}
                    accessibilityLabel="Marcar como resolvido"
                    onPress={() => setConfirmOpen(true)}
                  >
                    Marcar como resolvido
                  </Button>
                )}
                {SENSOR_CATEGORIES.includes(alert.category) ? (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    icon={Activity}
                    accessibilityLabel="Ver no Monitoramento"
                    onPress={goMonitoring}
                  >
                    Ver no Monitoramento
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  accessibilityLabel="Ver todos os alertas"
                  onPress={goAlerts}
                >
                  Ver todos os alertas
                </Button>
              </View>

              <ConfirmDialog
                open={confirmOpen}
                tone="primary"
                title="Marcar como resolvido?"
                message="Use quando o problema já foi tratado na lavoura. O alerta sai da lista de pendentes."
                confirmLabel="Marcar como resolvido"
                loading={isUpdating}
                loadingLabel="Salvando…"
                cancelLabel="Agora não"
                error={errorMessage}
                onConfirm={() => void confirmResolve()}
                onCancel={closeDialog}
              />
            </View>
          ) : null}
        </AsyncBoundary>
      </ScreenContainer>
    </>
  );
}
