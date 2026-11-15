import { LandPlot, Pencil } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { maskCep, type FarmFormValues } from '@/features/farm/validate';
import { useTheme } from '@/features/theme/ThemeProvider';
import { formatHa, polygonAreaHa, type LatLng } from '@/lib/geo';
import { spacing } from '@/theme/tokens';

type FarmReviewStepProps = {
  values: FarmFormValues;
  points: LatLng[];
  onEditData: () => void;
  onEditBoundary: () => void;
  onSave: () => void;
  isSaving: boolean;
  errorMessage?: string | null;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text weight="semibold">{value}</Text>
    </View>
  );
}

export function FarmReviewStep({
  values,
  points,
  onEditData,
  onEditBoundary,
  onSave,
  isSaving,
  errorMessage,
}: FarmReviewStepProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { gap: spacing.lg },
        head: { gap: spacing.xs },
        card: { gap: spacing.md },
        titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        action: { alignSelf: 'flex-start' },
        cta: { marginTop: spacing.md },
      }),
    [],
  );

  const address = [values.street.trim(), values.neighborhood.trim()].filter(Boolean).join(', ');
  const crop = values.mainCrop.trim();
  const area = formatHa(polygonAreaHa(points));

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="heading" weight="semibold" accessibilityRole="header">
          Confira e salve
        </Text>
        <Text tone="muted">Você poderá ver esta fazenda no Início depois de salvar.</Text>
      </View>

      <Card>
        <View style={styles.card}>
          <Text weight="semibold">Dados</Text>
          <Row label="Fazenda" value={values.name.trim()} />
          <Row label="Endereço" value={address || 'Não informado'} />
          <Row label="Cidade" value={`${values.city.trim()}/${values.state}`} />
          <Row label="CEP" value={maskCep(values.cep)} />
          <Row label="Cultura principal" value={crop || 'Não informada'} />
          <View style={styles.action}>
            <Button variant="ghost" size="sm" icon={Pencil} disabled={isSaving} onPress={onEditData}>
              Editar dados
            </Button>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <LandPlot size={20} color={colors.primaryText} />
            <Text weight="semibold">Limite no mapa</Text>
          </View>
          <Text variant="caption" tone="muted">
            Área calculada
          </Text>
          <Text variant="heading" weight="semibold">
            {area}
          </Text>
          <Text variant="label" tone="muted">{`${points.length} pontos marcados`}</Text>
          <Text variant="caption" tone="muted">
            A área é calculada pelo mapa e pode ser um pouco diferente da escritura.
          </Text>
          <View style={styles.action}>
            <Button variant="ghost" size="sm" disabled={isSaving} onPress={onEditBoundary}>
              Editar limite
            </Button>
          </View>
        </View>
      </Card>

      {errorMessage ? <Notice variant="error">{errorMessage}</Notice> : null}

      <View style={styles.cta}>
        <Button variant="primary" size="md" fullWidth loading={isSaving} loadingLabel="Salvando…" onPress={onSave}>
          Salvar fazenda
        </Button>
      </View>
    </View>
  );
}
