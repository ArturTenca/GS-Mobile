import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { FarmFormStep } from '@/components/farm/FarmFormStep';
import { FarmMapStep } from '@/components/farm/FarmMapStep';
import { FarmReviewStep } from '@/components/farm/FarmReviewStep';
import { FlowSuccess } from '@/components/flow/FlowSuccess';
import { StepHeader } from '@/components/flow/StepHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Text } from '@/components/ui/Text';
import {
  validateFarmForm,
  onlyDigits,
  type FarmField,
  type FarmFormValues,
} from '@/features/farm/validate';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useCreateFarm } from '@/hooks/useCreateFarm';
import { useResolveLocation } from '@/hooks/useResolveLocation';
import { formatHa, polygonAreaHa, type LatLng } from '@/lib/geo';
import type { Farm } from '@/services/farms';
import type { CepResult, LocationPrecision } from '@/services/geocoding';
import { spacing } from '@/theme/tokens';

// Minimal structural type for the navigation object.
type RemoveEvent = { preventDefault: () => void; data: { action: unknown } };
type GuardNavigation = {
  addListener: (type: 'beforeRemove', cb: (e: RemoveEvent) => void) => () => void;
  dispatch: (action: never) => void;
};

type Step = 'form' | 'map' | 'review' | 'success';
type Location = { lat: number | null; lng: number | null; precision: LocationPrecision };

const EMPTY: FarmFormValues = { name: '', cep: '', street: '', neighborhood: '', city: '', state: '', mainCrop: '' };
const STEP_NAMES = ['Dados da fazenda', 'Limite no mapa', 'Revisar'] as const;
const STEP_INDEX: Record<Exclude<Step, 'success'>, number> = { form: 1, map: 2, review: 3 };

function locationKey(v: FarmFormValues): string {
  return `${onlyDigits(v.cep)}|${v.city.trim().toLowerCase()}|${v.state}`;
}

export default function NovaFazendaScreen() {
  const router = useRouter();
  const navigation = useNavigation() as unknown as GuardNavigation;
  const { colors } = useTheme();
  const { submit, isSaving, error: saveError } = useCreateFarm();
  const { resolve, isResolving } = useResolveLocation();

  const [step, setStep] = useState<Step>('form');
  const [values, setValues] = useState<FarmFormValues>(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ field: FarmField; nonce: number } | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [locatedKey, setLocatedKey] = useState<string | null>(null);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [pointsCep, setPointsCep] = useState<string | null>(null);
  const [cepChanged, setCepChanged] = useState(false);
  const [savedFarm, setSavedFarm] = useState<Farm | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  const allowLeave = useRef(false);
  const pendingAction = useRef<unknown>(null);

  const dirty =
    points.length > 0 ||
    values.name !== '' ||
    values.cep !== '' ||
    values.street !== '' ||
    values.neighborhood !== '' ||
    values.city !== '' ||
    values.state !== '' ||
    values.mainCrop !== '';

  const guarded = dirty && step !== 'success';

  const goHome = useCallback(() => {
    allowLeave.current = true;
    router.replace('/');
  }, [router]);

  const leaveFlow = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const handleBack = useCallback(() => {
    if (step === 'success') {
      goHome();
    } else if (step === 'review') {
      setStep('map');
    } else if (step === 'map') {
      setStep('form');
    } else if (guarded) {
      pendingAction.current = null;
      setDiscardOpen(true);
    } else {
      leaveFlow();
    }
  }, [step, guarded, goHome, leaveFlow]);

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

  function handleChange(patch: Partial<FarmFormValues>) {
    setValues((v) => ({ ...v, ...patch }));
  }

  function handleLookupDone(cep: string, result: CepResult | null) {
    if (result?.found && result.lat !== null && result.lng !== null) {
      setLocation({ lat: result.lat, lng: result.lng, precision: result.precision });
      setLocatedKey(`${cep}|${result.city.trim().toLowerCase()}|${result.state}`);
    }
  }

  async function handleContinueForm() {
    const result = validateFarmForm(values);
    setShowErrors(true);
    if (!result.valid) {
      if (result.firstInvalid) setFocusRequest((r) => ({ field: result.firstInvalid as FarmField, nonce: (r?.nonce ?? 0) + 1 }));
      return;
    }
    const cep = onlyDigits(values.cep);
    if (points.length > 0 && pointsCep !== cep) {
      setPoints([]);
      setCepChanged(true);
    } else {
      setCepChanged(false);
    }
    if (locatedKey !== locationKey(values)) {
      const found = await resolve({
        cep,
        street: values.street.trim() || null,
        city: values.city.trim(),
        state: values.state,
      });
      // Never block the flow (D-06): precision 'none' opens the wide map with a notice.
      setLocation({ lat: found.lat, lng: found.lng, precision: found.precision });
      setLocatedKey(locationKey(values));
    }
    setPointsCep(cep);
    setStep('map');
  }

  async function handleSave() {
    if (isSaving) return;
    setSubmitFailed(false);
    const farm = await submit({
      name: values.name.trim(),
      cep: onlyDigits(values.cep),
      address: values.street.trim(),
      neighborhood: values.neighborhood.trim(),
      city: values.city.trim(),
      state: values.state,
      mainCrop: values.mainCrop.trim(),
      points,
    });
    if (farm) {
      allowLeave.current = true;
      setSavedFarm(farm);
      setStep('success');
    } else {
      setSubmitFailed(true);
    }
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

  const errors = showErrors ? validateFarmForm(values).errors : {};
  const stepHeader =
    step === 'success' ? null : (
      <StepHeader step={STEP_INDEX[step]} total={3} name={STEP_NAMES[STEP_INDEX[step] - 1]} />
    );

  let body;
  if (step === 'map') {
    body = (
      <View style={styles.flex}>
        <FarmMapStep
          points={points}
          onPointsChange={setPoints}
          location={location}
          cityName={values.city.trim()}
          cepChangedNotice={cepChanged}
          onContinue={() => setStep('review')}
        />
      </View>
    );
  } else {
    let content;
    if (step === 'form') {
      content = (
        <FarmFormStep
          values={values}
          onChange={handleChange}
          errors={errors}
          formError={null}
          isResolving={isResolving}
          focusRequest={focusRequest}
          onLookupDone={handleLookupDone}
          onContinue={() => void handleContinueForm()}
        />
      );
    } else if (step === 'review') {
      content = (
        <FarmReviewStep
          values={values}
          points={points}
          onEditData={() => setStep('form')}
          onEditBoundary={() => setStep('map')}
          onSave={() => void handleSave()}
          isSaving={isSaving}
          errorMessage={submitFailed ? (saveError ?? 'Não foi possível salvar a fazenda. Tente de novo.') : null}
        />
      );
    } else {
      const area = formatHa(savedFarm?.area_ha ?? polygonAreaHa(points));
      content = (
        <FlowSuccess
          title="Fazenda salva"
          primary={{
            label: 'Adicionar sensor',
            onPress: () => {
              allowLeave.current = true;
              router.replace({ pathname: '/adicionar/sensor', params: { farm: savedFarm?.id ?? '' } });
            },
          }}
          secondary={{ label: 'Ir para o Início', onPress: goHome }}
        >
          <View style={styles.successBody}>
            <Text weight="semibold" style={styles.center}>{`${savedFarm?.name ?? values.name.trim()} · ${area}`}</Text>
            <Text tone="muted" style={styles.center}>
              Agora coloque os sensores no mapa para acompanhar a fazenda.
            </Text>
          </View>
        </FlowSuccess>
      );
    }
    body = (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenContainer>{content}</ScreenContainer>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Nova fazenda" onBack={handleBack} />
      {stepHeader}
      {body}

      <ConfirmDialog
        open={discardOpen}
        title="Descartar fazenda?"
        message="Os dados e os pontos marcados não serão salvos."
        confirmLabel="Descartar fazenda"
        cancelLabel="Continuar editando"
        tone="danger"
        onConfirm={confirmDiscard}
        onCancel={() => setDiscardOpen(false)}
      />
    </View>
  );
}
