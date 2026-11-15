import Droplets from 'lucide-react-native/icons/droplets';
import Sprout from 'lucide-react-native/icons/sprout';
import Thermometer from 'lucide-react-native/icons/thermometer';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import {
  REQUIRED_SIDE,
  SENSOR_TYPES,
  validateThresholds,
  type ThresholdFieldKey,
  type ThresholdInput,
} from '@/features/thresholds/validate';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useSaveThresholds } from '@/hooks/useSaveThresholds';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { useThresholds } from '@/hooks/useThresholds';
import { convertTemperature } from '@/lib/format';
import { formatDecimal } from '@/lib/formatNumber';
import { usePreferencesStore, type TempUnit } from '@/stores/preferences';
import { spacing } from '@/theme/tokens';
import type { ThresholdMap } from '@/features/condition/types';
import type { SensorType } from '@/types/database';

const GROUPS: { type: SensorType; title: string; icon: LucideIcon; helper: string }[] = [
  {
    type: 'temperature',
    title: 'Temperatura',
    icon: Thermometer,
    helper: 'Acima do máximo gera alerta de temperatura alta.',
  },
  {
    type: 'air_humidity',
    title: 'Umidade do ar',
    icon: Droplets,
    helper: 'Acima do máximo gera alerta de umidade do ar alta.',
  },
  {
    type: 'soil_moisture',
    title: 'Umidade do solo',
    icon: Sprout,
    helper: 'Abaixo do mínimo gera alerta de solo seco.',
  },
];

function unitLabel(type: SensorType, unit: TempUnit): string {
  if (type !== 'temperature') return '%';
  return unit === 'f' ? '°F' : '°C';
}

function fmt(value: number | null | undefined, type: SensorType, unit: TempUnit): string {
  if (value === null || value === undefined) return '';
  if (type === 'temperature') {
    const v = convertTemperature(value, unit);
    return v === null ? '' : formatDecimal(Math.round(v * 10) / 10, 1).replace(/,0$/, '');
  }
  return formatDecimal(value, 1).replace(/,0$/, '');
}

function toDraft(map: ThresholdMap, unit: TempUnit): ThresholdInput {
  const out = {} as ThresholdInput;
  for (const type of SENSOR_TYPES) {
    out[type] = { min: fmt(map[type]?.min, type, unit), max: fmt(map[type]?.max, type, unit) };
  }
  return out;
}

function sameDraft(a: ThresholdInput, b: ThresholdInput): boolean {
  return SENSOR_TYPES.every((t) => a[t].min.trim() === b[t].min.trim() && a[t].max.trim() === b[t].max.trim());
}

type FormProps = { farmId: string; farmName: string; thresholds: ThresholdMap; unit: TempUnit };

function ThresholdsForm({ farmId, farmName, thresholds, unit }: FormProps) {
  const { colors } = useTheme();
  const mutation = useSaveThresholds();
  const initial = useMemo(() => toDraft(thresholds, unit), [thresholds, unit]);
  const [draft, setDraft] = useState<ThresholdInput>(initial);
  const [touched, setTouched] = useState<Partial<Record<ThresholdFieldKey, boolean>>>({});
  const [saved, setSaved] = useState(false);
  const stacked = PixelRatio.getFontScale() >= 1.5;

  const validation = useMemo(() => validateThresholds(draft, unit), [draft, unit]);
  const initialValues = useMemo(() => validateThresholds(initial, unit).values, [initial, unit]);
  const dirty =
    validation.values && initialValues
      ? JSON.stringify(validation.values) !== JSON.stringify(initialValues)
      : !sameDraft(draft, initial);
  const canSave = dirty && validation.valid;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: { padding: spacing.lg, gap: spacing.lg },
        group: { gap: spacing.sm },
        divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg },
        titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        fields: { flexDirection: stacked ? 'column' : 'row', gap: spacing.sm },
        field: { flex: stacked ? undefined : 1 },
        saveRow: { alignItems: 'flex-start' },
      }),
    [colors, stacked],
  );

  function setField(type: SensorType, side: 'min' | 'max', text: string) {
    setDraft((d) => ({ ...d, [type]: { ...d[type], [side]: text } }));
    if (saved) setSaved(false);
    if (mutation.errorMessage) mutation.reset();
  }

  function touch(key: ThresholdFieldKey) {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  }

  async function handleSave() {
    const allTouched = {} as Record<ThresholdFieldKey, boolean>;
    for (const type of SENSOR_TYPES) {
      allTouched[`${type}.min`] = true;
      allTouched[`${type}.max`] = true;
    }
    setTouched(allTouched);
    if (!validation.valid || !validation.values) return;
    const rows = SENSOR_TYPES.map((type) => ({
      type,
      min: validation.values![type].min,
      max: validation.values![type].max,
    }));
    const ok = await mutation.save(farmId, rows);
    if (ok) setSaved(true);
  }

  return (
    <View style={styles.box}>
      <Text variant="label" tone="muted">
        {`Valem para a fazenda ${farmName}. Quando uma leitura passa do limite, a fazenda entra em Atenção e um alerta é criado.`}
      </Text>
      {GROUPS.map((g, i) => {
        const Icon = g.icon;
        const u = unitLabel(g.type, unit);
        const minKey: ThresholdFieldKey = `${g.type}.min`;
        const maxKey: ThresholdFieldKey = `${g.type}.max`;
        return (
          <View key={g.type} style={[styles.group, i > 0 ? styles.divider : null]}>
            <View style={styles.titleRow}>
              <Icon size={20} color={colors.textMuted} />
              <Text variant="body" weight="semibold">
                {g.title}
              </Text>
            </View>
            <View style={styles.fields}>
              <View style={styles.field}>
                <Input
                  label={`Mínimo (${u})`}
                  value={draft[g.type].min}
                  onChangeText={(t) => setField(g.type, 'min', t)}
                  onBlur={() => touch(minKey)}
                  placeholder={REQUIRED_SIDE[g.type] === 'min' ? undefined : 'Sem limite'}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  maxLength={8}
                  error={touched[minKey] ? (validation.errors[minKey] ?? null) : null}
                />
              </View>
              <View style={styles.field}>
                <Input
                  label={`Máximo (${u})`}
                  value={draft[g.type].max}
                  onChangeText={(t) => setField(g.type, 'max', t)}
                  onBlur={() => touch(maxKey)}
                  placeholder={REQUIRED_SIDE[g.type] === 'max' ? undefined : 'Sem limite'}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  maxLength={8}
                  error={touched[maxKey] ? (validation.errors[maxKey] ?? null) : null}
                />
              </View>
            </View>
            <Text variant="label" tone="muted">
              {g.helper}
            </Text>
          </View>
        );
      })}
      <View style={styles.saveRow}>
        <Button
          variant="primary"
          size="md"
          disabled={!canSave}
          loading={mutation.isSaving}
          loadingLabel="Salvando…"
          onPress={() => void handleSave()}
        >
          Salvar limites
        </Button>
      </View>
      {mutation.errorMessage ? <Notice variant="error">{mutation.errorMessage}</Notice> : null}
      {saved && !dirty ? (
        <Notice variant="success">Limites salvos. A condição da fazenda e os alertas foram atualizados.</Notice>
      ) : null}
    </View>
  );
}

export function ThresholdsSection() {
  const { colors } = useTheme();
  const { farm } = useSelectedFarm();
  const unit = usePreferencesStore((s) => s.tempUnit);
  const query = useThresholds(farm?.id);

  return (
    <SettingsSection title="Limites dos sensores">
      {!farm ? (
        <View style={{ padding: spacing.lg }}>
          <Text variant="label" style={{ color: colors.textMuted }}>
            Cadastre uma fazenda para definir os limites.
          </Text>
        </View>
      ) : query.isLoading ? (
        <LoadingState message="Carregando limites…" />
      ) : query.isError || !query.data ? (
        <ErrorState onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : (
        <ThresholdsForm
          key={`${farm.id}:${unit}`}
          farmId={farm.id}
          farmName={farm.name}
          thresholds={query.data}
          unit={unit}
        />
      )}
    </SettingsSection>
  );
}
