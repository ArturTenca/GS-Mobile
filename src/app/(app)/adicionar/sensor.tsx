import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import LandPlot from 'lucide-react-native/icons/land-plot';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { SensorFormStep } from '@/components/farm/SensorFormStep';
import { SensorMapStep } from '@/components/farm/SensorMapStep';
import { SensorNameStep } from '@/components/farm/SensorNameStep';
import { FlowSuccess } from '@/components/flow/FlowSuccess';
import { StepHeader } from '@/components/flow/StepHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { DemoBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Text } from '@/components/ui/Text';
import { DEFAULT_RADIUS_M, defaultSensorName, SENSOR_TYPE_LABELS } from '@/features/sensor/sensorFlow';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useFarmSensors } from '@/hooks/useFarmSensors';
import { useRegisterSensor } from '@/hooks/useRegisterSensor';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { fromGeoJsonPolygon, type LatLng } from '@/lib/geo';
import { spacing } from '@/theme/tokens';
import type { SensorType } from '@/types/database';

// Minimal structural type for the navigation object.
type RemoveEvent = { preventDefault: () => void; data: { action: unknown } };
type GuardNavigation = {
  addListener: (type: 'beforeRemove', cb: (e: RemoveEvent) => void) => () => void;
  dispatch: (action: never) => void;
};

type Step = 'form' | 'map' | 'name' | 'success';
type FlowStep = Exclude<Step, 'success'>;

const STEP_NAMES = ['Fazenda e tipo', 'Local e alcance', 'Nome e revisão'] as const;
const STEP_INDEX: Record<FlowStep, number> = { form: 1, map: 2, name: 3 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function NovoSensorScreen() {
  const router = useRouter();
  const navigation = useNavigation() as unknown as GuardNavigation;
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ farm?: string | string[] }>();
  const { farms, farm: selectedFarm, select, isLoading, isError, refetch, isFetching } = useSelectedFarm();
  const { submit, isSaving, error: saveError, reset } = useRegisterSensor();

  const [step, setStep] = useState<Step>('form');
  const [chosenFarmId, setChosenFarmId] = useState<string | null>(null);
  const [type, setType] = useState<SensorType | null>(null);
  const [typeError, setTypeError] = useState(false);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [registered, setRegistered] = useState<{ name: string; farmName: string; farmId: string } | null>(null);

  const allowLeave = useRef(false);
  const pendingAction = useRef<unknown>(null);

  // Only farms with a drawn boundary can host sensors; newest first.
  const eligible = useMemo(() => {
    const list: { farm: (typeof farms)[number]; ring: LatLng[] }[] = [];
    for (const f of farms) {
      const ring = fromGeoJsonPolygon(f.boundary);
      if (ring && ring.length >= 3) list.push({ farm: f, ring });
    }
    return list.sort((a, b) => b.farm.created_at.localeCompare(a.farm.created_at));
  }, [farms]);
  const excludedCount = farms.length - eligible.length;

  // The deep-link param is untrusted: UUID shape and an eligible (RLS-filtered) farm are both required.
  const rawParam = Array.isArray(params.farm) ? params.farm[0] : params.farm;
  const paramFarmId = rawParam && UUID.test(rawParam) && eligible.some((e) => e.farm.id === rawParam) ? rawParam : null;
  const selectedEligibleId = selectedFarm && eligible.some((e) => e.farm.id === selectedFarm.id) ? selectedFarm.id : null;
  const farmId =
    chosenFarmId && eligible.some((e) => e.farm.id === chosenFarmId)
      ? chosenFarmId
      : (paramFarmId ?? selectedEligibleId ?? eligible[0]?.farm.id ?? '');
  const current = eligible.find((e) => e.farm.id === farmId) ?? null;

  const sensorsQuery = useFarmSensors(farmId || null);
  const existingSensors = useMemo(() => sensorsQuery.data ?? [], [sensorsQuery.data]);

  const guarded = (type !== null || point !== null) && step !== 'success';

  const goHome = useCallback(() => {
    allowLeave.current = true;
    router.replace('/');
  }, [router]);

  const leaveFlow = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const handleBack = useCallback(() => {
    if (isSaving) return;
    if (step === 'success') {
      goHome();
    } else if (step === 'name') {
      setStep('map');
    } else if (step === 'map') {
      setStep('form');
    } else if (guarded) {
      pendingAction.current = null;
      setDiscardOpen(true);
    } else {
      leaveFlow();
    }
  }, [step, guarded, isSaving, goHome, leaveFlow]);

  // Android hardware back follows the header back.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  // Browser back / any navigation that removes this screen while data would be lost.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (allowLeave.current || !guarded) return;
      e.preventDefault();
      pendingAction.current = e.data.action;
      setDiscardOpen(true);
    });
  }, [navigation, guarded]);

  function confirmDiscard() {
    setDiscardOpen(false);
    allowLeave.current = true;
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) navigation.dispatch(action as never);
    else leaveFlow();
  }

  function handleFarmChange(id: string) {
    if (id === farmId) return;
    setChosenFarmId(id);
    setPoint(null);
    setRadiusM(DEFAULT_RADIUS_M);
  }

  function handleContinueForm() {
    if (!type) {
      setTypeError(true);
      return;
    }
    setTypeError(false);
    setStep('map');
  }

  async function handleRegister(name: string) {
    if (isSaving || !current || !type || !point) return;
    setSubmitFailed(false);
    const id = await submit({
      propertyId: current.farm.id,
      name,
      type,
      lat: point.lat,
      lng: point.lng,
      radiusM,
    });
    if (id) {
      allowLeave.current = true;
      setRegistered({ name, farmName: current.farm.name, farmId: current.farm.id });
      setStep('success');
    } else {
      setSubmitFailed(true);
    }
  }

  function addAnother() {
    allowLeave.current = false;
    reset();
    setSubmitFailed(false);
    setChosenFarmId(registered?.farmId ?? null);
    setType(null);
    setTypeError(false);
    setPoint(null);
    setRadiusM(DEFAULT_RADIUS_M);
    setRegistered(null);
    setStep('form');
  }

  function viewOnHome() {
    if (registered) select(registered.farmId);
    goHome();
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        flex: { flex: 1 },
        successBody: { alignItems: 'center', gap: spacing.sm },
        center: { textAlign: 'center' },
      }),
    [colors],
  );

  let body;
  if (step === 'success') {
    body = (
      <ScreenContainer>
        <FlowSuccess
          title="Sensor registrado"
          primary={{ label: 'Adicionar outro sensor', onPress: addAnother }}
          secondary={{ label: 'Ver no Início', onPress: viewOnHome }}
        >
          <View style={styles.successBody}>
            <Text weight="semibold" style={styles.center}>{`${registered?.name ?? ''} · ${registered?.farmName ?? ''}`}</Text>
            <DemoBadge size="md" />
            <Text tone="muted" style={styles.center}>
              As leituras simuladas já aparecem no Início.
            </Text>
          </View>
        </FlowSuccess>
      </ScreenContainer>
    );
  } else if (isLoading) {
    body = (
      <ScreenContainer>
        <LoadingState message="Carregando fazendas…" />
      </ScreenContainer>
    );
  } else if (isError) {
    body = (
      <ScreenContainer>
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      </ScreenContainer>
    );
  } else if (!current) {
    body = (
      <ScreenContainer>
        <EmptyState
          icon={LandPlot}
          title="Nenhuma fazenda com limite no mapa"
          description="Cadastre uma fazenda e marque o limite dela no mapa para adicionar sensores."
          actionLabel="Adicionar fazenda"
          onAction={() => router.replace('/adicionar/fazenda')}
        />
      </ScreenContainer>
    );
  } else if (step === 'map' && type) {
    body = (
      <View style={styles.flex}>
        <SensorMapStep
          farmName={current.farm.name}
          ring={current.ring}
          existingSensors={existingSensors}
          point={point}
          onPointChange={setPoint}
          radiusM={radiusM}
          onRadiusChange={setRadiusM}
          onContinue={() => setStep('name')}
        />
      </View>
    );
  } else if (step === 'name' && type && point) {
    const defaultName = defaultSensorName(type, existingSensors);
    body = (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenContainer>
          <SensorNameStep
            key={`${current.farm.id}-${type}-${defaultName}`}
            defaultName={defaultName}
            farmName={current.farm.name}
            typeLabel={SENSOR_TYPE_LABELS[type]}
            radiusM={radiusM}
            onChangePoint={() => setStep('map')}
            onRegister={(n) => void handleRegister(n)}
            isSaving={isSaving}
            errorMessage={submitFailed ? (saveError ?? 'Não foi possível registrar o sensor. Tente de novo.') : null}
          />
        </ScreenContainer>
      </KeyboardAvoidingView>
    );
  } else {
    body = (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenContainer>
          <SensorFormStep
            farms={eligible.map((e) => e.farm)}
            excludedCount={excludedCount}
            farmId={farmId}
            onFarmChange={handleFarmChange}
            type={type}
            onTypeChange={(t) => {
              setType(t);
              setTypeError(false);
            }}
            typeError={typeError}
            onContinue={handleContinueForm}
          />
        </ScreenContainer>
      </KeyboardAvoidingView>
    );
  }

  const showHeader = step !== 'success' && !isLoading && !isError && current !== null;
  const flowStep: FlowStep = step === 'success' ? 'form' : step;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Novo sensor" onBack={handleBack} />
      {showHeader ? <StepHeader step={STEP_INDEX[flowStep]} total={3} name={STEP_NAMES[STEP_INDEX[flowStep] - 1]} /> : null}
      {body}

      <ConfirmDialog
        open={discardOpen}
        title="Descartar sensor?"
        message="O local e os dados do sensor não serão salvos."
        confirmLabel="Descartar sensor"
        cancelLabel="Continuar editando"
        tone="danger"
        onConfirm={confirmDiscard}
        onCancel={() => setDiscardOpen(false)}
      />
    </View>
  );
}
