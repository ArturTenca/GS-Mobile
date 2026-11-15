import { useRouter } from 'expo-router';
import { ChartLine, ChevronRight, LandPlot, Radio } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { FarmSelector } from '@/components/farm/FarmSelector';
import { SensorRow } from '@/components/farm/SensorRow';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { DemoBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useFarmSensors } from '@/hooks/useFarmSensors';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { radius, spacing } from '@/theme/tokens';

export default function MonitoramentoScreen() {
  const router = useRouter();
  const { farms, farm, select, isLoading, isError, isFetching, refetch } = useSelectedFarm();
  const sensors = useFarmSensors(farm?.id);
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        stack: { gap: spacing.xl },
        section: { gap: spacing.sm },
        demo: { marginBottom: spacing.xs },
        entryRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        entryCircle: {
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        entryTexts: { flex: 1 },
      }),
    [colors],
  );

  const retry = () => {
    void refetch();
    void sensors.refetch();
  };

  let body;
  if (isLoading || (!!farm && sensors.isLoading)) {
    body = <LoadingState message="Carregando sensores…" />;
  } else if (isError || (!!farm && sensors.isError)) {
    body = <ErrorState onRetry={retry} retrying={isFetching || sensors.isFetching} />;
  } else if (!farm) {
    body = (
      <EmptyState
        icon={LandPlot}
        title="Cadastre sua primeira fazenda"
        description="Os sensores da fazenda aparecem aqui depois do cadastro."
        actionVariant="primary"
        actionLabel="Adicionar fazenda"
        onAction={() => router.push('/adicionar/fazenda' as never)}
      />
    );
  } else {
    const list = sensors.data ?? [];
    const hasBoundary = !!farm.boundary;
    const addSensor = () =>
      router.push({ pathname: '/adicionar/sensor', params: { farm: farm.id } });
    const location = farm.city
      ? `${farm.name} · ${farm.city}${farm.state ? `/${farm.state}` : ''}`
      : farm.name;
    body = (
      <View style={styles.stack} key={farm.id}>
        {farms.length >= 2 ? (
          <FarmSelector
            farms={farms}
            selectedId={farm.id}
            onSelect={select}
            onAddFarm={() => router.push('/adicionar/fazenda' as never)}
          />
        ) : (
          <Text variant="label" tone="muted">
            {location}
          </Text>
        )}

        <View style={styles.section}>
          <SectionHeader
            title="Sensores"
            actionLabel={hasBoundary ? 'Adicionar sensor' : undefined}
            onAction={hasBoundary ? addSensor : undefined}
          />
          {list.some((s) => s.isDemo) ? (
            <View style={styles.demo}>
              <DemoBadge size="sm" />
            </View>
          ) : null}
          <Card padded={false}>
            {list.length > 0 ? (
              list.map((s, i) => <SensorRow key={s.id} sensor={s} isLast={i === list.length - 1} />)
            ) : (
              <EmptyState
                icon={Radio}
                title="Nenhum sensor nesta fazenda"
                description={
                  hasBoundary
                    ? 'Coloque o primeiro sensor no mapa da fazenda.'
                    : 'Esta fazenda ainda não tem limite no mapa.'
                }
                actionLabel={hasBoundary ? 'Adicionar sensor' : undefined}
                onAction={hasBoundary ? addSensor : undefined}
              />
            )}
          </Card>
        </View>

        <Card onPress={() => router.push('/analises')} accessibilityLabel="Análises. Gráficos e avaliação de risco da propriedade.">
          <View style={styles.entryRow}>
            <View style={styles.entryCircle} importantForAccessibility="no" accessibilityElementsHidden>
              <ChartLine size={20} color={colors.textMuted} />
            </View>
            <View style={styles.entryTexts}>
              <Text variant="body" weight="semibold">
                Análises
              </Text>
              <Text variant="label" tone="muted">
                Gráficos e avaliação de risco da propriedade.
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <>
      <ScreenHeader title="Monitoramento" />
      <ScreenContainer centered={!farm}>{body}</ScreenContainer>
    </>
  );
}
