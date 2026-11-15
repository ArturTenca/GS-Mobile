import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';

import { Text } from '@/components/ui/Text';
import type { ChartDomain } from '@/features/charts/domain';
import type { SeriesPoint } from '@/features/charts/series';
import { useTheme } from '@/features/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

const Y_GUTTER = 40;
const X_LABEL_WIDTH = 48;
const TOOLTIP_WIDTH = 120;
const TOOLTIP_HEIGHT = 56;

export type ChartRefLine = { value: number; color: string };

export type LineSeriesChartProps = {
  /** Points already converted to DISPLAY units (e.g. °F). */
  points: SeriesPoint[];
  domain: ChartDomain;
  color: string;
  height?: number;
  /** One entry per point; '' means no label. */
  xLabels: string[];
  showDots?: boolean;
  refLines?: ChartRefLine[];
  /** Y-axis label formatter; the unit is not drawn on the axis. */
  formatY: (n: number) => string;
  formatTooltipValue: (v: number) => string;
  accessibilityLabel: string;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatPointTime(t: number): string {
  const d = new Date(t);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * gifted-charts LineChart with a measured width (no horizontal scroll, no overflow
 * on narrow cards), no animation and a y axis shifted by domain.min instead of
 * yAxisOffset (its interplay with maxValue and reference lines is unverified).
 */
export function LineSeriesChart({
  points,
  domain,
  color,
  height = 180,
  xLabels,
  showDots = false,
  refLines = [],
  formatY,
  formatTooltipValue,
  accessibilityLabel,
}: LineSeriesChartProps) {
  const { colors } = useTheme();
  const [measured, setMeasured] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    setMeasured((prev) => (prev === w ? prev : w));
  }, []);

  const chartWidth = Math.max(0, measured - Y_GUTTER);
  const span = Math.max(domain.max - domain.min, Number.EPSILON);
  // Single-point safe: never divide by zero.
  const pointSpacing = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { width: '100%' },
        axisText: { ...typography.caption, color: colors.textMuted },
        xLabelBox: {
          position: 'absolute',
          width: X_LABEL_WIDTH,
          left: pointSpacing / 2 - X_LABEL_WIDTH / 2,
          alignItems: 'center',
        },
        tooltip: {
          width: TOOLTIP_WIDTH,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          padding: spacing.sm,
          shadowColor: colors.text,
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
      }),
    [colors, pointSpacing],
  );

  const data = useMemo<lineDataItem[]>(
    () =>
      points.map((p, i) => {
        const label = xLabels[i] ?? '';
        const item: lineDataItem = { value: p.v - domain.min };
        if (label) {
          // Labels are wider than the per-point spacing; render a centered fixed-width box.
          item.labelComponent = () => (
            <View style={styles.xLabelBox}>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        }
        return item;
      }),
    [points, xLabels, domain.min, styles.xLabelBox],
  );

  const formatYLabel = useCallback(
    (label: string) => {
      const n = Number(label);
      return Number.isFinite(n) ? formatY(n + domain.min) : label;
    },
    [formatY, domain.min],
  );

  const pointerLabel = useCallback(
    (_items: lineDataItem[], _secondary: unknown, index: number) => {
      const p = points[index];
      if (!p) return null;
      return (
        <View style={styles.tooltip}>
          <Text weight="semibold" numeric numberOfLines={1}>
            {formatTooltipValue(p.v)}
          </Text>
          <Text variant="caption" tone="muted" numeric numberOfLines={1}>
            {formatPointTime(p.t)}
          </Text>
        </View>
      );
    },
    [points, formatTooltipValue, styles.tooltip],
  );

  const [ref1, ref2] = refLines;
  const refConfig = (c: string) => ({ color: c, dashWidth: 6, dashGap: 4, thickness: 1, type: 'dashed' });

  return (
    <View
      style={styles.wrapper}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {chartWidth > 0 && data.length > 0 ? (
          <LineChart
            data={data}
            width={chartWidth}
            height={height}
            disableScroll
            initialSpacing={0}
            endSpacing={0}
            spacing={pointSpacing}
            hideDataPoints={!showDots}
            dataPointsRadius={3}
            dataPointsColor={color}
            isAnimated={false}
            thickness={2}
            color={color}
            maxValue={span}
            noOfSections={domain.sections}
            yAxisLabelWidth={Y_GUTTER}
            showFractionalValues
            roundToDigits={4}
            formatYLabel={formatYLabel}
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colors.border}
            rulesType="solid"
            rulesColor={colors.border}
            rulesThickness={1}
            showVerticalLines={false}
            showReferenceLine1={!!ref1}
            referenceLine1Position={ref1 ? ref1.value - domain.min : 0}
            referenceLine1Config={refConfig(ref1?.color ?? colors.warning)}
            showReferenceLine2={!!ref2}
            referenceLine2Position={ref2 ? ref2.value - domain.min : 0}
            referenceLine2Config={refConfig(ref2?.color ?? colors.warning)}
            pointerConfig={{
              showPointerStrip: true,
              pointerStripColor: colors.border,
              pointerStripWidth: 1,
              pointerStripUptoDataPoint: false,
              pointerColor: color,
              radius: 4,
              pointerLabelWidth: TOOLTIP_WIDTH,
              pointerLabelHeight: TOOLTIP_HEIGHT,
              autoAdjustPointerLabelPosition: true,
              activatePointersOnLongPress: false,
              pointerLabelComponent: pointerLabel,
            }}
          />
        ) : (
          <View style={{ height: height + 24 }} />
        )}
      </View>
    </View>
  );
}
