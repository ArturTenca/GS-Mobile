import { useFocusEffect, useRouter } from 'expo-router';
import { LandPlot, Radio } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PeriodChips } from '@/components/charts/PeriodChips';
import { SensorChartCard } from '@/components/charts/SensorChartCard';
import { FarmSelector } from '@/components/farm/FarmSelector';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { DemoBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Notice } from '@/components/ui/Notice';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { generatedNotice, promptCopy, regenerateCopy, shouldPromptDemo } from '@/features/analyses/demoPrompt';
import { DEFAULT_PERIOD, type PeriodKey } from '@/features/charts/periods';
import { useDemoOffset } from '@/hooks/useDemoOffset';
import { useFarmSensors } from '@/hooks/useFarmSensors';
import { useGenerateDemoData } from '@/hooks/useGenerateDemoData';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { useThresholds } from '@/hooks/useThresholds';
import { usePreferencesStore } from '@/stores/preferences';
import { spacing } from '@/theme/tokens';

type DialogKind = 'prompt' | 'regenerate';
type GeneratedNotice = { farmId: string; count: number };

export default function AnalisesScreen() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/monitoramento'));

  const { farms, farm, select, isLoading, isError, isFetching, refetch } = useSelectedFarm();
  const sensors = useFarmSensors(farm?.id);
  const offset = useDemoOffset(farm?.id);
  const thresholds = useThresholds(farm?.id);
  const tempUnit = usePreferencesStore((s) => s.tempUnit);
  const demo = useGenerateDemoData();

  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  // Visit-scoped state (D-11): reset every time the screen gains focus, never persisted.
  const [focused, setFocused] = useState(false);
  const [dismissedFarmIds, setDismissedFarmIds] = useState<string[]>([]);
  const [manualDialog, setManualDialog] = useState<DialogKind | null>(null);
  const [notice, setNotice] = useState<GeneratedNotice | null>(null);

  const resetDemo = demo.reset;
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setDismissedFarmIds([]);
      setNotice(null);
      setManualDialog(null);
      resetDemo();
      return () => setFocused(false);
    }, [resetDemo]),
  );

  const sensorList = sensors.data ?? [];
  const autoPrompt =
    focused &&
    shouldPromptDemo({
      sensorsLoaded: !!farm && sensors.isSuccess,
      sensorCount: sensorList.length,
      generatedAt: farm?.demo_data_generated_at,
      farmId: farm?.id,
      dismissedFarmIds,
    });
  const dialog: DialogKind | null = manualDialog ?? (autoPrompt ? 'prompt' : null);
  const copy = dialog === 'regenerate' ? regenerateCopy() : promptCopy(farm?.name ?? '');

  const closeDialog = () => {
    if (demo.isGenerating) return;
    if (dialog === 'prompt' && farm) {
      const id = farm.id;
      setDismissedFarmIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    setManualDialog(null);
    demo.reset();
  };

  const confirmDialog = async () => {
    if (!farm || demo.isGenerating) return;
    const id = farm.id;
    const result = await demo.generate(id);
    if (!result) return; // error stays inside the dialog; retry allowed
    // Handled for this visit even if the farm row has not refreshed yet.
    setDismissedFarmIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setManualDialog(null);
    setNotice({ farmId: id, count: result.sensors });
  };

  const openManual = () => {
    if (!farm) return;
    demo.reset();
    setManualDialog(farm.demo_data_generated_at ? 'regenerate' : 'prompt');
  };

  const retry = () => {
    void refetch();
    void sensors.refetch();
    void offset.refetch();
  };

  let body;
  if (isLoading || (!!farm && sensors.isLoading)) {
    body = <LoadingState message="Carregando análises…" />;
  } else if (isError || (!!farm && (sensors.isError || offset.isError))) {
    body = (
      <ErrorState onRetry={retry} retrying={isFetching || sensors.isFetching || offset.isFetching} />
    );
  } else if (!farm) {
    body = (
      <EmptyState
        icon={LandPlot}
        title="Cadastre sua primeira fazenda"
        description="Os gráficos dos sensores aparecem aqui depois do cadastro."
        actionVariant="primary"
        actionLabel="Adicionar fazenda"
        onAction={() => router.push('/adicionar/fazenda' as never)}
      />
    );
  } else if (sensorList.length === 0) {
    const hasBoundary = !!farm.boundary;
    body = (
      <View style={styles.stack} key={farm.id}>
        {farms.length >= 2 ? (
          <FarmSelector
            farms={farms}
            selectedId={farm.id}
            onSelect={select}
            onAddFarm={() => router.push('/adicionar/fazenda' as never)}
          />
        ) : null}
        <EmptyState
          icon={Radio}
          title="Cadastre um sensor para ver análises"
          description={
            hasBoundary
              ? 'Os gráficos aparecem aqui depois que a fazenda tiver sensores.'
              : 'Esta fazenda ainda não tem limite no mapa.'
          }
          actionVariant={hasBoundary ? 'primary' : undefined}
          actionLabel={hasBoundary ? 'Adicionar sensor' : undefined}
          onAction={
            hasBoundary
              ? () => router.push({ pathname: '/adicionar/sensor', params: { farm: farm.id } })
              : undefined
          }
        />
      </View>
    );
  } else {
    const generated = !!farm.demo_data_generated_at;
    const showNotice = notice && notice.farmId === farm.id ? notice : null;
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
            {farm.name}
          </Text>
        )}

        <View style={styles.section}>
          <Text variant="label" weight="semibold">
            Período
          </Text>
          <PeriodChips value={period} onChange={setPeriod} />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Gráficos dos sensores"
            actionLabel={generated ? 'Regerar dados' : 'Gerar dados demonstrativos'}
            onAction={openManual}
          />
          {sensorList.some((s) => s.isDemo) ? (
            <View style={styles.demo}>
              <DemoBadge size="sm" />
            </View>
          ) : null}
          {showNotice ? <Notice variant="success">{generatedNotice(showNotice.count)}</Notice> : null}
          <View style={styles.cards}>
            {sensorList.map((s) => (
              <SensorChartCard
                key={s.id}
                sensor={s}
                propertyId={farm.id}
                period={period}
                offsetMs={offset.data}
                range={thresholds.data?.[s.type]}
                unit={tempUnit}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScreenHeader title="Análises" onBack={goBack} />
      <ScreenContainer centered={!farm}>{body}</ScreenContainer>
      <ConfirmDialog
        open={!!farm && dialog !== null}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.confirm}
        cancelLabel={copy.cancel}
        tone="primary"
        loading={demo.isGenerating}
        loadingLabel={copy.loading}
        error={demo.errorMessage}
        onConfirm={() => void confirmDialog()}
        onCancel={closeDialog}
      />
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
  section: { gap: spacing.sm },
  demo: { marginBottom: spacing.xs },
  cards: { gap: spacing.lg },
});
