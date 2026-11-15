import Pencil from 'lucide-react-native/icons/pencil';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DemoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { validateSensorName } from '@/features/sensor/sensorFlow';
import { spacing } from '@/theme/tokens';

type SensorNameStepProps = {
  defaultName: string;
  farmName: string;
  typeLabel: string;
  radiusM: number;
  onChangePoint: () => void;
  onRegister: (name: string) => void;
  isSaving: boolean;
  errorMessage: string | null;
};

export function SensorNameStep({
  defaultName,
  farmName,
  typeLabel,
  radiusM,
  onChangePoint,
  onRegister,
  isSaving,
  errorMessage,
}: SensorNameStepProps) {
  const [name, setName] = useState(defaultName);
  const [showError, setShowError] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { gap: spacing.lg },
        head: { gap: spacing.xs },
        card: { gap: spacing.md },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
        rowValue: { flexShrink: 1, textAlign: 'right' },
        demo: { gap: spacing.sm, alignItems: 'flex-start' },
      }),
    [],
  );

  const validation = validateSensorName(name);
  const nameError = showError && !validation.valid ? validation.error : null;

  function handleRegister() {
    if (isSaving) return;
    if (!validation.valid) {
      setShowError(true);
      return;
    }
    onRegister(validation.value);
  }

  const rows: [string, string][] = [
    ['Fazenda', farmName],
    ['Tipo', typeLabel],
    ['Raio de cobertura', `${radiusM} m`],
    ['Local', 'Dentro da fazenda'],
  ];

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="heading" weight="semibold" accessibilityRole="header">
          Dê um nome ao sensor
        </Text>
        <Text tone="muted">O nome ajuda a achar o sensor nas listas e nos alertas.</Text>
      </View>
      <Card>
        <View style={styles.card}>
          <Input
            label="Nome do sensor"
            value={name}
            onChangeText={(v) => {
              setName(v);
              setShowError(true);
            }}
            error={nameError}
            editable={!isSaving}
            maxLength={140}
            returnKeyType="done"
          />
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text variant="label" tone="muted">
                {label}
              </Text>
              <Text variant="label" weight="semibold" style={styles.rowValue}>
                {value}
              </Text>
            </View>
          ))}
          <Button variant="ghost" size="sm" icon={Pencil} disabled={isSaving} onPress={onChangePoint}>
            Mudar local
          </Button>
        </View>
      </Card>
      <Card>
        <View style={styles.demo}>
          <DemoBadge />
          <Text variant="label" tone="muted">
            Até um sensor de verdade enviar dados, este sensor mostra leituras simuladas.
          </Text>
        </View>
      </Card>
      {errorMessage ? <Notice variant="error">{errorMessage}</Notice> : null}
      <Button
        variant="primary"
        size="md"
        fullWidth
        loading={isSaving}
        loadingLabel="Registrando…"
        onPress={handleRegister}
      >
        Registrar sensor
      </Button>
    </View>
  );
}
