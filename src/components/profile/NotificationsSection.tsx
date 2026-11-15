import { BellRing, Info, Settings } from 'lucide-react-native';
import { useMemo } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { CATEGORY_META, CATEGORY_ORDER } from '@/components/alerts/alertMeta';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import { spacing } from '@/theme/tokens';

export type DeviceStatus = 'ok' | 'denied' | 'unsupported';

type NotificationsSectionProps = {
  /** Supplied by device registration (plan 09); defaults to 'ok'. */
  deviceStatus?: DeviceStatus;
  /**
   * Optional hook to run permission/token work before the master pref is saved.
   * Return false to cancel the save. Default: save directly.
   */
  onMasterChange?: (next: boolean) => Promise<boolean>;
};

export function NotificationsSection({ deviceStatus = 'ok', onMasterChange }: NotificationsSectionProps) {
  const { colors } = useTheme();
  const { prefs, isLoading, isError, isFetching, refetch, setEnabled, setCategory, errorMessage } =
    useNotificationPrefs();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: { padding: spacing.lg, gap: spacing.md },
        footnote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
        footnoteIcon: { paddingTop: 2 },
        footnoteText: { flex: 1 },
        stack: { gap: spacing.sm },
        action: { alignItems: 'flex-start' },
      }),
    [],
  );

  async function handleMaster(next: boolean) {
    if (onMasterChange) {
      const ok = await onMasterChange(next);
      if (!ok) return;
    }
    setEnabled(next);
  }

  const isWeb = Platform.OS === 'web';

  const notice = isWeb ? (
    <Notice variant="warning">
      O navegador não recebe notificações push. Instale o app no celular para ser avisado com o app fechado. As
      escolhas abaixo valem para o celular.
    </Notice>
  ) : deviceStatus === 'denied' ? (
    <View style={styles.stack}>
      <Notice variant="warning">
        As notificações estão bloqueadas neste celular. Libere nos ajustes do aparelho para receber os alertas.
      </Notice>
      <View style={styles.action}>
        <Button variant="secondary" size="sm" icon={Settings} onPress={() => void Linking.openSettings()}>
          Abrir ajustes
        </Button>
      </View>
    </View>
  ) : deviceStatus === 'unsupported' ? (
    <Notice variant="warning">Este aparelho não pode receber notificações push. Use o app instalado em um celular.</Notice>
  ) : null;

  const footer = (
    <View style={styles.footnote}>
      <View style={styles.footnoteIcon} accessibilityElementsHidden importantForAccessibility="no">
        <Info size={16} color={colors.textMuted} />
      </View>
      <View style={styles.footnoteText}>
        <Text variant="label" tone="muted">
          Enviamos push só para alertas de Atenção e Crítico. Alertas informativos aparecem apenas na lista de
          Alertas.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.stack}>
      <SettingsSection title="Notificações" footer={footer}>
        {notice ? <View style={styles.box}>{notice}</View> : null}
        {isLoading ? (
          <LoadingState message="Carregando preferências…" />
        ) : isError || !prefs ? (
          <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
        ) : (
          <>
            <SettingsRow
              icon={BellRing}
              label="Receber notificações"
              description="Avisos no celular quando surgir um alerta de Atenção ou Crítico."
              trailing="switch"
              switchValue={prefs.enabled}
              onSwitchChange={(v) => void handleMaster(v)}
              stateLabels={{ on: 'Ligado', off: 'Desligado' }}
            />
            {CATEGORY_ORDER.map((cat, i) => {
              const meta = CATEGORY_META[cat];
              return (
                <SettingsRow
                  key={cat}
                  icon={meta.icon}
                  label={meta.label}
                  description={meta.notificationDescription}
                  trailing="switch"
                  switchValue={prefs.categories.includes(cat)}
                  onSwitchChange={(v) => setCategory(cat, v)}
                  disabled={!prefs.enabled}
                  isLast={i === CATEGORY_ORDER.length - 1}
                />
              );
            })}
          </>
        )}
      </SettingsSection>
      {errorMessage ? (
        <Notice variant="error">Não foi possível salvar a preferência. Verifique sua internet e tente de novo.</Notice>
      ) : null}
    </View>
  );
}
