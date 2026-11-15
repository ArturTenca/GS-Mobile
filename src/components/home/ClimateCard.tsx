import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Sun,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { formatTemperature } from '@/lib/format';
import type { ClimateSnapshotView } from '@/services/home';
import { usePreferencesStore } from '@/stores/preferences';
import { radius, spacing } from '@/theme/tokens';

type ClimateKey = 'storm' | 'rain' | 'partly' | 'cloudy' | 'sun';

function climateKey(condition: string): ClimateKey {
  const c = condition.toLowerCase();
  if (c.includes('tempest')) return 'storm';
  if (c.includes('chuv') || c.includes('garoa')) return 'rain';
  if (c.includes('parcial')) return 'partly';
  if (c.includes('sol') || c.includes('limpo') || c.includes('ensolarado')) return 'sun';
  return 'cloudy';
}

function ClimateIcon({ condition, color }: { condition: string | null; color: string }) {
  const key = condition ? climateKey(condition) : 'cloudy';
  switch (key) {
    case 'storm':
      return <CloudLightning size={24} color={color} />;
    case 'rain':
      return <CloudRain size={24} color={color} />;
    case 'partly':
      return <CloudSun size={24} color={color} />;
    case 'sun':
      return <Sun size={24} color={color} />;
    default:
      return <Cloud size={24} color={color} />;
  }
}

type ClimateCardProps = {
  climate: ClimateSnapshotView | null;
  error: boolean;
  onRetry: () => void;
};

export function ClimateCard({ climate, error, onRetry }: ClimateCardProps) {
  const { colors } = useTheme();
  const tempUnit = usePreferencesStore((s) => s.tempUnit);
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
        stats: { flexDirection: 'row', gap: spacing.sm },
        stat: { flex: 1 },
        errorBox: { gap: spacing.md, alignItems: 'flex-start' },
      }),
    [colors],
  );

  if (error) {
    return (
      <Card>
        <View style={styles.errorBox}>
          <Text variant="label" tone="error">
            Não foi possível carregar esta parte.
          </Text>
          <Button variant="secondary" size="sm" onPress={onRetry}>
            Tentar novamente
          </Button>
        </View>
      </Card>
    );
  }

  const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n)}%`);

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.circle} importantForAccessibility="no" accessibilityElementsHidden>
          <ClimateIcon condition={climate ? climate.condition : null} color={colors.text} />
        </View>
        <View style={styles.col}>
          <Text variant="body" weight="semibold">
            {climate ? climate.condition : 'Clima indisponível'}
          </Text>
          <Text variant="label" tone="muted">
            {climate ? climate.description : 'Ainda não há dados de clima para sua propriedade.'}
          </Text>
        </View>
      </View>
      {climate ? (
        <>
          <View style={styles.divider} />
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text variant="label" tone="muted">
                Temperatura
              </Text>
              <Text variant="body" weight="semibold" numeric>
                {formatTemperature(climate.temperatureC, tempUnit)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="label" tone="muted">
                Umidade
              </Text>
              <Text variant="body" weight="semibold" numeric>
                {pct(climate.humidityPct)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="label" tone="muted">
                Chuva
              </Text>
              <Text variant="body" weight="semibold" numeric>
                {pct(climate.rainProbabilityPct)}
              </Text>
            </View>
          </View>
        </>
      ) : null}
    </Card>
  );
}
