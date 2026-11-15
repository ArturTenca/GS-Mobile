import { useRouter } from 'expo-router';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Droplets from 'lucide-react-native/icons/droplets';
import LandPlot from 'lucide-react-native/icons/land-plot';
import MapPin from 'lucide-react-native/icons/map-pin';
import Radio from 'lucide-react-native/icons/radio';
import Sprout from 'lucide-react-native/icons/sprout';
import Thermometer from 'lucide-react-native/icons/thermometer';
import { useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AlertRow } from '@/components/alerts/AlertRow';
import { ClimateCard } from '@/components/home/ClimateCard';
import { ConditionHero } from '@/components/home/ConditionHero';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { FarmSelector } from '@/components/farm/FarmSelector';
import { DemoBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricTile } from '@/components/ui/MetricTile';
import { Notice } from '@/components/ui/Notice';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { WeatherCard } from '@/components/weather/WeatherCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { deriveCondition } from '@/features/condition/deriveCondition';
import { selectMetric } from '@/features/condition/selectMetric';
import { useTheme } from '@/features/theme/ThemeProvider';
import { usePendingAlertCount } from '@/hooks/usePendingAlertCount';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { useHomeOverview } from '@/hooks/useHomeOverview';
import { useNow } from '@/hooks/useNow';
import { useWeatherForecast } from '@/hooks/useWeatherForecast';
import { convertTemperature, firstName } from '@/lib/format';
import { extraReasonsLabel, formatDecimal, pendingAlertsLabel, sensorsActiveLabel } from '@/lib/formatNumber';
import { usePreferencesStore } from '@/stores/preferences';
import { radius, spacing } from '@/theme/tokens';
import type { SensorType } from '@/types/database';

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

const METRICS: { type: SensorType; label: string; icon: typeof Thermometer }[] = [
  { type: 'temperature', label: 'Temperatura', icon: Thermometer },
  { type: 'air_humidity', label: 'Umidade do ar', icon: Droplets },
  { type: 'soil_moisture', label: 'Umidade do solo', icon: Sprout },
];

const isFiniteCoord = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n);

export default function InicioScreen() {
  const { user } = useAuth();
  const tempUnit = usePreferencesStore((s) => s.tempUnit);
  const { colors } = useTheme();
  const router = useRouter();
  const now = useNow();
  const { width } = useWindowDimensions();
  const propertyQuery = useSelectedFarm();
  const property = propertyQuery.farm;
  const overviewQuery = useHomeOverview(property?.id);
  const overview = overviewQuery.data;
  const pendingCount = usePendingAlertCount(property?.id);
  // Warm the forecast cache at screen top so WeatherCard (same key) renders from cache.
  useWeatherForecast(property?.center_lat, property?.center_lng);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([propertyQuery.refetch(), overviewQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const condition = useMemo(
    () =>
      overview
        ? deriveCondition({
            sensors: overview.sensors,
            thresholds: overview.thresholds,
            alerts: overview.alerts,
            now: overview.asOf,
          })
        : null,
    [overview],
  );

  const pendingAlerts = useMemo(
    () =>
      (overview?.alerts ?? [])
        .filter((a) => a.status !== 'resolvido')
        .sort((a, b) => {
          const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
          return sev !== 0 ? sev : Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt);
        }),
    [overview],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        greeting: { gap: spacing.xs },
        propertyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
        propertyText: { flex: 1 },
        demoBadge: { marginBottom: spacing.sm, alignSelf: 'flex-start' },
        section: {},
        farmContent: { gap: spacing.xl },
        tiles: { flexDirection: 'row', gap: spacing.sm },
        tilesStacked: { flexDirection: 'column', gap: spacing.sm },
        tile: { flex: 1 },
        countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
        countText: { flex: 1 },
        countLine: { marginBottom: spacing.md },
        emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        emptyCircle: {
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: colors.successSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        emptyBody: { flex: 1 },
        noCoordCircle: {
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors],
  );

  const query = {
    isLoading: propertyQuery.isLoading || (!!property && overviewQuery.isLoading),
    isError:
      (propertyQuery.isError && !propertyQuery.farm) || (overviewQuery.isError && !overviewQuery.data),
    refetch: () => {
      void propertyQuery.refetch();
      void overviewQuery.refetch();
    },
  };
  const refreshFailed = (propertyQuery.isError || overviewQuery.isError) && !!overview;
  const stacked = PixelRatio.getFontScale() >= 1.3 || width < 360;

  const noFarm = !propertyQuery.isLoading && !propertyQuery.isError && !property;

  const hasBoundary = !!property?.boundary;
  const hasDemoSensors = (overview?.sensors ?? []).some((s) => s.isDemo);

  const goMonitoring = () => router.navigate('/monitoramento');
  const goAlerts = () => router.navigate('/alertas');

  const location = property
    ? property.city
      ? `${property.name} · ${property.city}${property.state ? `/${property.state}` : ''}`
      : property.name
    : '';

  const weatherPlace = property
    ? [
        property.neighborhood?.trim(),
        property.city?.trim()
          ? `${property.city.trim()}${property.state?.trim() ? `/${property.state.trim()}` : ''}`
          : null,
      ]
        .filter(Boolean)
        .join(', ') || null
    : null;

  return (
    <>
      <ScreenHeader brand />
      <ScreenContainer refreshing={refreshing} onRefresh={() => void handleRefresh()}>
        {noFarm ? (
          <>
            <View style={styles.greeting}>
              <Text variant="heading" weight="semibold" accessibilityRole="header">
                {`Olá, ${firstName(user?.user_metadata?.name)}`}
              </Text>
            </View>
            <Card>
              <EmptyState
                icon={LandPlot}
                title="Cadastre sua primeira fazenda"
                description="Marque no mapa o limite da sua terra. Depois, coloque os sensores para acompanhar a lavoura."
                actionVariant="primary"
                actionLabel="Adicionar fazenda"
                onAction={() => router.push('/adicionar/fazenda' as never)}
              />
            </Card>
          </>
        ) : (
        <AsyncBoundary
          query={query}
          isEmpty={!property || !overview || !condition}
          loadingMessage="Preparando sua propriedade…"
          empty={null}
        >
          {property && overview && condition ? (
            <View key={property.id} style={styles.farmContent}>
              {refreshFailed ? (
                <Notice variant="error">Não foi possível atualizar. Mostrando os últimos dados recebidos.</Notice>
              ) : null}

              <View style={styles.greeting}>
                <Text variant="heading" weight="semibold" accessibilityRole="header">
                  {`Olá, ${firstName(user?.user_metadata?.name)}`}
                </Text>
                {propertyQuery.farms.length >= 2 ? (
                  <FarmSelector
                    farms={propertyQuery.farms}
                    selectedId={property.id}
                    onSelect={propertyQuery.select}
                    onAddFarm={() => router.push('/adicionar/fazenda' as never)}
                  />
                ) : (
                  <View style={styles.propertyRow}>
                    <MapPin size={16} color={colors.textMuted} />
                    <Text variant="label" tone="muted" numberOfLines={2} style={styles.propertyText}>
                      {location}
                    </Text>
                  </View>
                )}
              </View>

              <ConditionHero
                status={condition.status}
                line={condition.primary?.line ?? condition.normalCopy?.line ?? ''}
                action={condition.primary?.action ?? condition.normalCopy?.action ?? ''}
                extraLabel={condition.extraCount > 0 ? extraReasonsLabel(condition.extraCount) : null}
                lastReadingAt={condition.lastReadingAt}
                now={now}
                primaryKind={condition.primary?.kind ?? null}
                sensorCount={condition.sensorCount}
                onViewAlert={() => {
                  const id = condition.primary?.alertId;
                  if (id) router.push({ pathname: '/alerta/[id]', params: { id } });
                }}
                onViewMonitoring={goMonitoring}
                onRefresh={() => void handleRefresh()}
                refreshing={refreshing}
              />

              <View style={styles.section}>
                <SectionHeader title="Clima agora" />
                {isFiniteCoord(property.center_lat) && isFiniteCoord(property.center_lng) ? (
                  <WeatherCard
                    farmCity={weatherPlace}
                    lat={property.center_lat}
                    lng={property.center_lng}
                  />
                ) : overview.climate.status === 'ok' && overview.climate.data ? (
                  <>
                    <View style={styles.demoBadge}>
                      <DemoBadge size="sm" />
                    </View>
                    <ClimateCard
                      climate={overview.climate.data}
                      error={false}
                      onRetry={() => void overviewQuery.refetch()}
                    />
                  </>
                ) : (
                  <Card>
                    <View style={styles.emptyRow}>
                      <View style={styles.noCoordCircle} importantForAccessibility="no" accessibilityElementsHidden>
                        <MapPin size={24} color={colors.textMuted} />
                      </View>
                      <View style={styles.emptyBody}>
                        <Text variant="body" weight="semibold">
                          Previsão indisponível para esta fazenda
                        </Text>
                        <Text variant="label" tone="muted">
                          Esta fazenda não tem localização cadastrada.
                        </Text>
                      </View>
                    </View>
                  </Card>
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Indicadores"
                  actionLabel="Ver monitoramento"
                  onAction={goMonitoring}
                />
                {hasDemoSensors ? (
                  <View style={styles.demoBadge}>
                    <DemoBadge size="sm" />
                  </View>
                ) : null}
                {condition.sensorCount === 0 ? (
                  <Card>
                    {hasBoundary ? (
                      <EmptyState
                        icon={Radio}
                        title="Nenhum sensor nesta fazenda"
                        description="Coloque sensores no mapa da fazenda para ver as leituras aqui."
                        actionLabel="Adicionar sensor"
                        onAction={() =>
                          router.push({ pathname: '/adicionar/sensor', params: { farm: property.id } })
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={Radio}
                        title="Nenhum sensor nesta fazenda"
                        description="Esta fazenda ainda não tem limite no mapa."
                      />
                    )}
                  </Card>
                ) : (
                  <>
                    <View style={stacked ? styles.tilesStacked : styles.tiles}>
                      {METRICS.map((m) => {
                        const r = selectMetric(m.type, overview.sensors, overview.thresholds, overview.asOf);
                        const converted =
                          m.type === 'temperature' && r.value !== null
                            ? convertTemperature(r.value, tempUnit)
                            : null;
                        return (
                          <View key={m.type} style={stacked ? undefined : styles.tile}>
                            <MetricTile
                              label={m.label}
                              icon={m.icon}
                              value={converted !== null ? formatDecimal(converted, 1) : r.display}
                              unit={converted !== null ? (tempUnit === 'f' ? '°F' : '°C') : r.unit}
                              status={r.status}
                              context={r.context}
                              onPress={goMonitoring}
                              fill={!stacked}
                            />
                          </View>
                        );
                      })}
                    </View>
                    <View style={styles.countRow}>
                      <Radio size={16} color={colors.textMuted} />
                      <Text variant="label" tone="muted" numeric style={styles.countText}>
                        {`${sensorsActiveLabel(condition.onlineCount)}${
                          condition.offlineCount > 0 ? ` · ${condition.offlineCount} sem comunicação` : ''
                        }`}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Alertas recentes"
                  actionLabel="Ver todos"
                  onAction={goAlerts}
                />
                {pendingAlerts.length > 0 ? (
                  <>
                    <Text variant="label" tone="muted" numeric style={styles.countLine}>
                      {pendingAlertsLabel(pendingCount)}
                    </Text>
                    <Card padded={false}>
                      {pendingAlerts.slice(0, 3).map((a, i, arr) => (
                        <AlertRow
                          key={a.id}
                          title={a.title}
                          severity={a.severity}
                          status={a.status}
                          areaName={
                            overview.sensors.find((s) => s.id === a.sensorId)?.areaName ?? null
                          }
                          triggeredAt={a.triggeredAt}
                          now={now}
                          isLast={i === arr.length - 1}
                          onPress={() => router.push({ pathname: '/alerta/[id]', params: { id: a.id } })}
                        />
                      ))}
                    </Card>
                  </>
                ) : (
                  <Card>
                    <View style={styles.emptyRow}>
                      <View style={styles.emptyCircle} importantForAccessibility="no" accessibilityElementsHidden>
                        <CircleCheck size={20} color={colors.success} />
                      </View>
                      <View style={styles.emptyBody}>
                        <Text variant="body" weight="semibold">
                          Nenhum alerta pendente
                        </Text>
                        <Text variant="label" tone="muted">
                          Quando algo precisar de atenção, o aviso aparece aqui.
                        </Text>
                      </View>
                    </View>
                  </Card>
                )}
              </View>
            </View>
          ) : null}
        </AsyncBoundary>
        )}
      </ScreenContainer>
    </>
  );
}
