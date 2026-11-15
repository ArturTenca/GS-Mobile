import ChartLine from 'lucide-react-native/icons/chart-line';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Droplets from 'lucide-react-native/icons/droplets';
import Sprout from 'lucide-react-native/icons/sprout';
import Thermometer from 'lucide-react-native/icons/thermometer';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import type { LucideIcon } from 'lucide-react-native';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LineSeriesChart, type ChartRefLine } from '@/components/charts/LineSeriesChart';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { buildXLabels } from '@/features/charts/axis';
import { chartDomain } from '@/features/charts/domain';
import { PERIODS, type PeriodKey } from '@/features/charts/periods';
import { countOutOfRange, downsample, seriesStats, type SeriesPoint } from '@/features/charts/series';
import { SENSOR_TYPE_LABELS } from '@/features/sensor/sensorFlow';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { convertTemperature, formatTemperature } from '@/lib/format';
import { formatDecimal, formatHumidity } from '@/lib/formatNumber';
import type { FarmSensor } from '@/services/sensors';
import type { TempUnit } from '@/stores/preferences';
import type { SensorType } from '@/types/database';
import { spacing } from '@/theme/tokens';

const CHART_HEIGHT = 180;

const TYPE_ICONS: Record<SensorType, LucideIcon> = {
  temperature: Thermometer,
  air_humidity: Droplets,
  soil_moisture: Sprout,
};

type Range = { min: number | null; max: number | null };

export type SensorChartCardProps = {
  sensor: FarmSensor;
  propertyId: string;
  period: PeriodKey;
  offsetMs: number | undefined;
  /** Ideal range for the sensor type, in Celsius / percent (from useThresholds). */
  range: Range | undefined;
  unit: TempUnit;
};

function SensorChartCardImpl({ sensor, period, offsetMs, range, unit }: SensorChartCardProps) {
  const { colors } = useTheme();
  const history = useSensorHistory(sensor.id, period, offsetMs);
  const isTemp = sensor.type === 'temperature';
  const unitLabel = isTemp ? (unit === 'f' ? '°F' : '°C') : '%';

  // Convert once at the presentation edge (PRF-06): values, thresholds, domain, stats.
  const toDisplay = useCallback(
    (v: number): number => (isTemp ? (convertTemperature(v, unit) ?? v) : v),
    [isTemp, unit],
  );

  const fmtValue = useCallback(
    (v: number): string => (isTemp ? `${formatDecimal(v, 1)} ${unitLabel}` : `${formatHumidity(v)}%`),
    [isTemp, unitLabel],
  );

  const derived = useMemo(() => {
    const raw = history.data ?? [];
    const display: SeriesPoint[] = raw.map((p) => ({ t: p.t, v: toDisplay(p.v) }));
    const values = display.map((p) => p.v);
    const displayRange: Range | null =
      range && (range.min != null || range.max != null)
        ? {
            min: range.min != null ? toDisplay(range.min) : null,
            max: range.max != null ? toDisplay(range.max) : null,
          }
        : null;
    const stats = seriesStats(values);
    const outOfRange = countOutOfRange(values, displayRange);
    const drawn = downsample(display, PERIODS[period].bucketMs);
    const domain = chartDomain(
      drawn.map((p) => p.v),
      displayRange,
      { clampPercent: !isTemp },
    );
    const xLabels = buildXLabels(drawn, period);
    const latestRaw = raw.length > 0 ? raw[raw.length - 1].v : null;
    return { display, displayRange, stats, outOfRange, drawn, domain, xLabels, latestRaw };
  }, [history.data, range, period, isTemp, toDisplay]);

  const { displayRange, stats, outOfRange, drawn, domain, xLabels, latestRaw } = derived;

  const formatY = useCallback(
    (n: number) => {
      const step = (domain.max - domain.min) / domain.sections;
      const digits = Number.isInteger(step) && Number.isInteger(domain.min) ? 0 : 1;
      return formatDecimal(n, digits);
    },
    [domain],
  );

  const refLines = useMemo<ChartRefLine[]>(() => {
    const lines: ChartRefLine[] = [];
    if (displayRange?.max != null) lines.push({ value: displayRange.max, color: colors.warning });
    if (displayRange?.min != null) lines.push({ value: displayRange.min, color: colors.warning });
    return lines;
  }, [displayRange, colors.warning]);

  const seriesColor =
    sensor.type === 'temperature' ? colors.series2 : sensor.type === 'air_humidity' ? colors.series1 : colors.series3;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: { gap: spacing.md },
        header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        iconCircle: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        titleCol: { flex: 1, minWidth: 0 },
        valueCol: { alignItems: 'flex-end' },
        legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        swatch: { width: 16, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.warning },
        divider: { height: 1, backgroundColor: colors.border },
        statsRow: { flexDirection: 'row', gap: spacing.md },
        statCol: { flex: 1 },
        status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        emptyBlock: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
        skelCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background },
        skelLine: { height: 14, borderRadius: 4, backgroundColor: colors.background },
        skelChart: { height: CHART_HEIGHT, borderRadius: 8, backgroundColor: colors.background },
      }),
    [colors],
  );

  const Icon = TYPE_ICONS[sensor.type];
  const typeLabel = SENSOR_TYPE_LABELS[sensor.type];

  // Loading (also while the demo offset is still unknown): static skeleton, no animation.
  if (history.isPending && !history.isError) {
    return (
      <Card>
        <View style={styles.body} accessibilityLabel={`Carregando gráfico de ${sensor.name}`}>
          <View style={styles.header}>
            <View style={styles.skelCircle} />
            <View style={[styles.titleCol, { gap: spacing.xs }]}>
              <View style={[styles.skelLine, { width: '60%' }]} />
              <View style={[styles.skelLine, { width: '40%' }]} />
            </View>
          </View>
          <View style={styles.skelChart} />
          <View style={styles.statsRow}>
            <View style={[styles.statCol, styles.skelLine]} />
            <View style={[styles.statCol, styles.skelLine]} />
            <View style={[styles.statCol, styles.skelLine]} />
          </View>
        </View>
      </Card>
    );
  }

  const hasPoints = drawn.length > 0 && stats !== null;
  const latestText =
    latestRaw === null ? '—' : isTemp ? formatTemperature(latestRaw, unit, 1) : `${formatHumidity(latestRaw)}%`;
  const fmtBound = (v: number | null) => (v == null ? '—' : isTemp ? formatDecimal(v, 1) : formatHumidity(v));

  const a11yLabel = stats
    ? `Gráfico de ${sensor.name}, ${PERIODS[period].a11y}. Mínimo ${fmtValue(stats.min)}, média ${fmtValue(
        stats.mean,
      )}, máximo ${fmtValue(stats.max)}, última leitura ${latestText}.`
    : `Gráfico de ${sensor.name}, ${PERIODS[period].a11y}.`;

  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.iconCircle} importantForAccessibility="no" accessibilityElementsHidden>
            <Icon size={20} color={colors.textMuted} />
          </View>
          <View style={styles.titleCol}>
            <Text weight="semibold" numberOfLines={2}>
              {sensor.name}
            </Text>
            <Text variant="label" tone="muted">
              {typeLabel}
            </Text>
          </View>
          <View style={styles.valueCol}>
            <Text variant="heading" weight="semibold" numeric>
              {latestText}
            </Text>
            <Text variant="caption" tone="muted">
              Última leitura
            </Text>
          </View>
        </View>

        {history.isError || !hasPoints ? (
          <View style={styles.emptyBlock}>
            <View importantForAccessibility="no" accessibilityElementsHidden>
              <ChartLine size={24} color={colors.textMuted} />
            </View>
            <Text variant="label" tone="muted">
              {history.isError ? 'Não foi possível carregar este gráfico.' : 'Sem leituras neste período.'}
            </Text>
          </View>
        ) : (
          <>
            <LineSeriesChart
              points={drawn}
              domain={domain}
              color={seriesColor}
              height={CHART_HEIGHT}
              xLabels={xLabels}
              showDots={PERIODS[period].showDots}
              refLines={refLines}
              formatY={formatY}
              formatTooltipValue={fmtValue}
              accessibilityLabel={a11yLabel}
            />

            {displayRange ? (
              <View style={styles.legend}>
                <View style={styles.swatch} importantForAccessibility="no" accessibilityElementsHidden />
                <Text variant="caption" tone="muted">
                  {`Faixa ideal: ${fmtBound(displayRange.min)}–${fmtBound(displayRange.max)} ${unitLabel}`}
                </Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <StatCol label="Mínimo" value={fmtValue(stats.min)} style={styles.statCol} />
              <StatCol label="Média" value={fmtValue(stats.mean)} style={styles.statCol} />
              <StatCol label="Máximo" value={fmtValue(stats.max)} style={styles.statCol} />
            </View>

            {displayRange ? (
              outOfRange === 0 ? (
                <View style={styles.status}>
                  <View importantForAccessibility="no" accessibilityElementsHidden>
                    <CircleCheck size={16} color={colors.success} />
                  </View>
                  <Text variant="label" tone="success">
                    Dentro da faixa ideal no período
                  </Text>
                </View>
              ) : (
                <View style={styles.status}>
                  <View importantForAccessibility="no" accessibilityElementsHidden>
                    <TriangleAlert size={16} color={colors.warningText} />
                  </View>
                  <Text variant="label" tone="warning">
                    {outOfRange === 1 ? '1 leitura fora da faixa ideal' : `${outOfRange} leituras fora da faixa ideal`}
                  </Text>
                </View>
              )
            ) : null}
          </>
        )}
      </View>
    </Card>
  );
}

function StatCol({ label, value, style }: { label: string; value: string; style: object }) {
  return (
    <View style={style}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <Text weight="semibold" numeric>
        {value}
      </Text>
    </View>
  );
}

export const SensorChartCard = memo(SensorChartCardImpl);
