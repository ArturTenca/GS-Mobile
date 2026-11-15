import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplet,
  Sun,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { weekdayLabel, weekdayLong } from '@/features/weather/forecast';
import { wmoToWeather, type WeatherIconKey } from '@/features/weather/wmo';
import { useTheme } from '@/features/theme/ThemeProvider';
import { convertTemperature, formatDegrees } from '@/lib/format';
import type { ForecastDay } from '@/services/weather';
import type { TempUnit } from '@/stores/preferences';
import { spacing } from '@/theme/tokens';

/** Lucide glyph for a WMO icon key (fallback Cloud). Decorative: callers hide it from a11y. */
export function WeatherIcon({ icon, size, color }: { icon: WeatherIconKey; size: number; color: string }) {
  switch (icon) {
    case 'sun':
      return <Sun size={size} color={color} />;
    case 'cloud-sun':
      return <CloudSun size={size} color={color} />;
    case 'cloud-fog':
      return <CloudFog size={size} color={color} />;
    case 'cloud-drizzle':
      return <CloudDrizzle size={size} color={color} />;
    case 'cloud-rain':
      return <CloudRain size={size} color={color} />;
    case 'cloud-snow':
      return <CloudSnow size={size} color={color} />;
    case 'cloud-lightning':
      return <CloudLightning size={size} color={color} />;
    default:
      return <Cloud size={size} color={color} />;
  }
}

/** Rounded value in the chosen unit, for screen-reader text ("27 graus"). */
export function spokenDegrees(celsius: number | null, unit: TempUnit): string {
  const v = convertTemperature(celsius, unit);
  return v === null ? 'sem dado' : `${Math.round(v)} graus`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

type WeatherDayColumnProps = {
  day: ForecastDay;
  index: number;
  unit: TempUnit;
};

export function WeatherDayColumn({ day, index, unit }: WeatherDayColumnProps) {
  const { colors } = useTheme();
  const isToday = index === 0;
  const info = wmoToWeather(day.weatherCode);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        col: {
          flex: 1,
          minWidth: 0,
          minHeight: 112,
          paddingVertical: spacing.sm,
          paddingHorizontal: 2,
          borderRadius: 12,
          alignItems: 'center',
          gap: spacing.xs,
          borderWidth: 1,
          borderColor: isToday ? colors.border : 'transparent',
          backgroundColor: isToday ? colors.background : 'transparent',
        },
        rain: { flexDirection: 'row', alignItems: 'center', gap: 2 },
        center: { textAlign: 'center' },
      }),
    [colors, isToday],
  );

  const rain = day.rainProbabilityPct == null ? null : Math.round(day.rainProbabilityPct);
  const dayName = isToday ? 'Hoje' : capitalize(weekdayLong(day.date));
  const a11y = `${dayName}, ${info.label.toLowerCase()}, máxima ${spokenDegrees(day.maxC, unit)}, mínima ${spokenDegrees(
    day.minC,
    unit,
  )}, ${rain === null ? 'chance de chuva sem dado' : `chance de chuva ${rain} por cento`}`;

  return (
    <View style={styles.col} accessible accessibilityLabel={a11y}>
      <Text variant="label" weight={isToday ? 'semibold' : 'regular'} style={styles.center}>
        {weekdayLabel(day.date, index)}
      </Text>
      <View importantForAccessibility="no" accessibilityElementsHidden>
        <WeatherIcon icon={info.icon} size={24} color={colors[info.tone]} />
      </View>
      <Text variant="body" weight="semibold" numeric>
        {formatDegrees(day.maxC, unit)}
      </Text>
      <Text variant="label" tone="muted" numeric>
        {formatDegrees(day.minC, unit)}
      </Text>
      <View style={styles.rain}>
        <View importantForAccessibility="no" accessibilityElementsHidden>
          <Droplet size={12} color={colors.weatherRain} />
        </View>
        <Text variant="caption" tone="muted" numeric>
          {rain === null ? '—' : `${rain}%`}
        </Text>
      </View>
    </View>
  );
}
