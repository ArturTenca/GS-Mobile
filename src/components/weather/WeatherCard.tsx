import { CircleAlert, CloudOff } from 'lucide-react-native';
import { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { spokenDegrees, WeatherDayColumn, WeatherIcon } from '@/components/weather/WeatherDayColumn';
import { wmoToWeather } from '@/features/weather/wmo';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useWeatherForecast } from '@/hooks/useWeatherForecast';
import { formatTemperature } from '@/lib/format';
import { formatDecimal } from '@/lib/formatNumber';
import { usePreferencesStore } from '@/stores/preferences';
import { radius, spacing } from '@/theme/tokens';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function clock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// CC BY 4.0 attribution: always visible under the card, also in the stale state.
const ATTRIBUTION = 'Dados do tempo: Open-Meteo.com';

const finiteOrNull = (n: number | null | undefined): number | null =>
  typeof n === 'number' && Number.isFinite(n) ? n : null;

type WeatherCardProps = {
  farmCity: string | null | undefined;
  lat: number;
  lng: number;
};

export function WeatherCard({ farmCity, lat, lng }: WeatherCardProps) {
  const { colors } = useTheme();
  const tempUnit = usePreferencesStore((s) => s.tempUnit);
  const query = useWeatherForecast(lat, lng);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        circle: {
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        col: { flex: 1 },
        divider: { height: 1, backgroundColor: colors.border, marginTop: spacing.lg, marginBottom: spacing.md },
        stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        stat: { flexGrow: 1, flexBasis: 88 },
        week: { marginTop: spacing.lg, gap: spacing.sm },
        strip: { marginHorizontal: -spacing.lg },
        stripContent: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
        footer: { marginTop: spacing.md },
        staleRow: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
        staleText: { flex: 1 },
        attribution: { marginTop: spacing.xs },
        errorBox: { gap: spacing.md, alignItems: 'flex-start' },
        bar: { height: 16, borderRadius: 4, backgroundColor: colors.background },
        skelBars: { flex: 1, gap: spacing.sm },
        skelStrip: { flexDirection: 'row', gap: spacing.sm, overflow: 'hidden' },
        skelDay: { width: 60, height: 112, borderRadius: 12, backgroundColor: colors.background },
      }),
    [colors],
  );

  const forecast = query.data;

  if (!forecast) {
    if (query.isError) {
      return (
        <Card>
          <View style={styles.errorBox}>
            <View style={styles.row}>
              <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
                <CloudOff size={24} color={colors.textMuted} />
              </View>
              <View style={styles.col}>
                <Text variant="body" weight="semibold">
                  Previsão indisponível
                </Text>
                <Text variant="label" tone="muted">
                  Não foi possível carregar a previsão. Verifique sua internet.
                </Text>
              </View>
            </View>
            <Button variant="secondary" size="sm" onPress={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </View>
        </Card>
      );
    }
    return (
      <Card>
        <View accessible accessibilityRole="progressbar" accessibilityLabel="Carregando previsão do tempo">
          <View style={styles.row}>
            <View style={styles.circle} />
            <View style={styles.skelBars}>
              <View style={[styles.bar, { width: '40%' }]} />
              <View style={[styles.bar, { width: '60%' }]} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.stats}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.stat, styles.bar]} />
            ))}
          </View>
          <View style={[styles.week, styles.skelStrip]}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skelDay} />
            ))}
          </View>
        </View>
      </Card>
    );
  }

  const { current, days } = forecast;
  const info = wmoToWeather(current.weatherCode);
  const city = farmCity?.trim() || null;
  const humidity = finiteOrNull(current.humidityPct);
  const wind = finiteOrNull(current.windKmh);
  const precip = finiteOrNull(current.precipitationMm);
  const updatedAt = query.dataUpdatedAt ? clock(query.dataUpdatedAt) : '—';
  const stale = query.isError;

  const nowA11y = `${city ? `Agora em ${city}` : 'Agora'}: ${spokenDegrees(current.temperatureC, tempUnit)}, ${info.label.toLowerCase()}`;

  return (
    <Card>
      <View style={styles.row} accessible accessibilityLabel={nowA11y}>
        <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
          <WeatherIcon icon={info.icon} size={24} color={colors[info.tone]} />
        </View>
        <View style={styles.col}>
          <Text variant="heading" weight="semibold" numeric>
            {formatTemperature(current.temperatureC, tempUnit)}
          </Text>
          <Text variant="body" weight="semibold">
            {info.label}
          </Text>
          <Text variant="label" tone="muted">
            {city ? `Agora · ${city}` : 'Agora'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text variant="label" tone="muted">
            Umidade
          </Text>
          <Text variant="body" weight="semibold" numeric>
            {humidity === null ? '—' : `${Math.round(humidity)}%`}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="label" tone="muted">
            Vento
          </Text>
          <Text variant="body" weight="semibold" numeric>
            {wind === null ? '—' : `${Math.round(wind)} km/h`}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="label" tone="muted">
            Chuva agora
          </Text>
          <Text variant="body" weight="semibold" numeric>
            {precip === null ? '—' : `${formatDecimal(precip, 1)} mm`}
          </Text>
        </View>
      </View>

      <View style={styles.week}>
        <Text variant="label" weight="semibold">
          Próximos dias
        </Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          style={styles.strip}
          contentContainerStyle={styles.stripContent}
          accessibilityLabel="Previsão dos próximos 7 dias"
        >
          {days.slice(0, 7).map((d, i) => (
            <WeatherDayColumn key={d.date} day={d} index={i} unit={tempUnit} />
          ))}
        </ScrollView>
      </View>

      {stale ? (
        <>
          <View style={styles.staleRow}>
            <View importantForAccessibility="no" accessibilityElementsHidden>
              <CircleAlert size={16} color={colors.warningText} />
            </View>
            <Text variant="caption" tone="warning" style={styles.staleText}>
              {`Não foi possível atualizar. Mostrando dados de ${updatedAt}.`}
            </Text>
          </View>
          <Text variant="caption" tone="muted" style={styles.attribution}>
            {ATTRIBUTION}
          </Text>
        </>
      ) : (
        <Text variant="caption" tone="muted" style={styles.footer}>
          {`Atualizado às ${updatedAt} · ${ATTRIBUTION}`}
        </Text>
      )}
    </Card>
  );
}
