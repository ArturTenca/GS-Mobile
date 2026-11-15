import ArrowDown from 'lucide-react-native/icons/arrow-down';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_META } from '@/components/alerts/alertMeta';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { formatTemperature } from '@/lib/format';
import { formatDecimal, formatHumidity } from '@/lib/formatNumber';
import { formatDateTime } from '@/lib/formatTime';
import type { AlertDetail } from '@/services/alerts';
import { usePreferencesStore } from '@/stores/preferences';
import { spacing } from '@/theme/tokens';

type Props = { alert: AlertDetail };

export function ReadingEvidence({ alert }: Props) {
  const { colors } = useTheme();
  const tempUnit = usePreferencesStore((s) => s.tempUnit);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: { gap: spacing.sm },
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
      }),
    [],
  );

  const { category } = alert;
  if (category === 'heavy_rain' || category === 'unfavorable_weather') return null;

  const Icon = CATEGORY_META[category].icon;

  if (category === 'sensor_offline') {
    if (!alert.lastSeenAt) return null;
    return (
      <Card>
        <View style={styles.body}>
          <View style={styles.row}>
            <Icon size={20} color={colors.textMuted} />
            <Text variant="body" weight="semibold">
              Leitura que gerou o alerta
            </Text>
          </View>
          <View style={styles.row}>
            <WifiOff size={16} color={colors.warningText} />
            <Text variant="body" weight="semibold" numeric>
              {`Sem sinal desde ${formatDateTime(alert.lastSeenAt)}`}
            </Text>
          </View>
          <Text variant="label" tone="muted">
            Sensores sem envio há mais de 2 horas geram este alerta.
          </Text>
        </View>
      </Card>
    );
  }

  if (alert.readingValue === null || alert.readingAt === null) return null;

  const isSoil = category === 'soil_moisture_low';
  const value = alert.readingValue;
  const valueText =
    category === 'temperature_high'
      ? formatTemperature(value, tempUnit, 1)
      : `${isSoil ? formatDecimal(value, 0) : formatHumidity(value)} %`;
  const limit = isSoil ? alert.threshold?.min : alert.threshold?.max;
  const limitText =
    limit === null || limit === undefined
      ? null
      : category === 'temperature_high'
        ? formatTemperature(limit, tempUnit, 0)
        : `${formatDecimal(limit, 0)} %`;
  const DirIcon = isSoil ? ArrowDown : ArrowUp;
  const tone = alert.severity === 'critical' ? 'error' : 'warning';
  const toneColor = alert.severity === 'critical' ? colors.error : colors.warningText;

  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.row}>
          <Icon size={20} color={colors.textMuted} />
          <Text variant="body" weight="semibold">
            Leitura que gerou o alerta
          </Text>
        </View>
        <View style={styles.row}>
          <Text variant="heading" weight="semibold" numeric tone={tone}>
            {valueText}
          </Text>
          <DirIcon size={16} color={toneColor} />
          <Text variant="label" weight="semibold" tone={tone}>
            {isSoil ? 'Abaixo do limite' : 'Acima do limite'}
          </Text>
        </View>
        {limitText ? (
          <Text variant="label" tone="muted" numeric>
            {`${isSoil ? 'Limite mínimo' : 'Limite máximo'}: ${limitText}`}
          </Text>
        ) : null}
        <Text variant="label" tone="muted" numeric>
          {`Medido em ${formatDateTime(alert.readingAt)}${alert.sensorName ? ` · ${alert.sensorName}` : ''}`}
        </Text>
      </View>
    </Card>
  );
}
