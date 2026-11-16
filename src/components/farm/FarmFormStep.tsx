import CircleCheck from 'lucide-react-native/icons/circle-check';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, type InputRef } from '@/components/ui/Input';
import { sanitizeFreeText } from '@/lib/security/sanitize';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Text } from '@/components/ui/Text';
import { UF_OPTIONS } from '@/features/farm/ufs';
import { maskCep, onlyDigits, type FarmField, type FarmFormErrors, type FarmFormValues } from '@/features/farm/validate';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useCepLookup } from '@/hooks/useCepLookup';
import type { CepResult } from '@/services/geocoding';
import { spacing } from '@/theme/tokens';

type FarmFormStepProps = {
  values: FarmFormValues;
  onChange: (patch: Partial<FarmFormValues>) => void;
  errors: FarmFormErrors;
  formError?: string | null;
  isResolving: boolean;
  focusRequest: { field: FarmField; nonce: number } | null;
  onLookupDone: (cep: string, result: CepResult | null) => void;
  onContinue: () => void;
};

export function FarmFormStep({
  values,
  onChange,
  errors,
  formError,
  isResolving,
  focusRequest,
  onLookupDone,
  onContinue,
}: FarmFormStepProps) {
  const { colors } = useTheme();
  const { status, lookup, reset } = useCepLookup();
  const [looked, setLooked] = useState(false);
  const lastCep = useRef<string | null>(null);
  const currentCep = useRef(onlyDigits(values.cep));

  const nameRef = useRef<InputRef>(null);
  const cepRef = useRef<InputRef>(null);
  const cityRef = useRef<InputRef>(null);
  const streetRef = useRef<InputRef>(null);
  const neighborhoodRef = useRef<InputRef>(null);
  const cropRef = useRef<InputRef>(null);

  useEffect(() => {
    if (!focusRequest) return;
    const map: Partial<Record<FarmField, typeof nameRef>> = {
      name: nameRef,
      cep: cepRef,
      city: cityRef,
      street: streetRef,
      neighborhood: neighborhoodRef,
      mainCrop: cropRef,
    };
    map[focusRequest.field]?.current?.focus();
  }, [focusRequest]);

  async function runLookup(cep: string) {
    lastCep.current = cep;
    const result = await lookup(cep);
    if (currentCep.current !== cep) return;
    setLooked(true);
    if (result?.found) {
      onChange({
        // Texto de API externa e fonte nao confiavel: higieniza antes do estado.
        city: sanitizeFreeText(result.city, { max: 80 }),
        state: result.state,
        street: sanitizeFreeText(result.street ?? '', { max: 160 }),
        neighborhood: sanitizeFreeText(result.neighborhood ?? '', { max: 120 }),
      });
    }
    onLookupDone(cep, result);
  }

  function handleCepChange(text: string) {
    const digits = onlyDigits(text).slice(0, 8);
    currentCep.current = digits;
    onChange({ cep: digits });
    if (digits.length === 8) {
      if (lastCep.current !== digits) void runLookup(digits);
    } else if (lastCep.current !== null) {
      lastCep.current = null;
      reset();
    }
  }

  function handleCepBlur() {
    const digits = onlyDigits(values.cep);
    if (digits.length === 8 && lastCep.current !== digits) void runLookup(digits);
  }

  const revealed =
    looked || values.city.length > 0 || Boolean(errors.city || errors.state || errors.street || errors.neighborhood);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { gap: spacing.lg },
        head: { gap: spacing.xs },
        card: { gap: spacing.lg },
        cepBlock: { gap: spacing.sm },
        helper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        helperText: { flex: 1 },
        retry: { alignSelf: 'flex-start' },
        cta: { marginTop: spacing.md },
      }),
    [],
  );

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="heading" weight="semibold" accessibilityRole="header">
          Dados da fazenda
        </Text>
        <Text tone="muted">Comece pelo nome e pelo CEP. Depois você marca o limite no mapa.</Text>
      </View>

      <Card>
        <View style={styles.card}>
          <Input
            ref={nameRef}
            label="Nome da fazenda"
            placeholder="Ex.: Sítio Boa Vista"
            autoCapitalize="words"
            value={values.name}
            maxLength={120}
            error={errors.name}
            editable={!isResolving}
            returnKeyType="next"
            onChangeText={(name) => onChange({ name })}
            onSubmitEditing={() => cepRef.current?.focus()}
          />

          <View style={styles.cepBlock}>
            <Input
              ref={cepRef}
              label="CEP"
              placeholder="00000-000"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={9}
              value={maskCep(values.cep)}
              error={errors.cep}
              editable={!isResolving}
              onChangeText={handleCepChange}
              onBlur={handleCepBlur}
            />
            <View accessibilityLiveRegion="polite" style={styles.cepBlock}>
              {status === 'idle' ? (
                <Text variant="caption" tone="muted">
                  Digite o CEP para achar a fazenda no mapa.
                </Text>
              ) : null}
              {status === 'loading' ? (
                <View style={styles.helper}>
                  <ActivityIndicator size="small" color={colors.primaryText} />
                  <Text variant="caption" tone="muted" style={styles.helperText}>
                    Buscando endereço…
                  </Text>
                </View>
              ) : null}
              {status === 'found' ? (
                <View style={styles.helper}>
                  <CircleCheck size={16} color={colors.success} />
                  <Text variant="caption" tone="success" style={styles.helperText}>
                    Endereço encontrado. Confira os dados abaixo.
                  </Text>
                </View>
              ) : null}
              {status === 'notFound' ? (
                <Text variant="caption" tone="error">
                  CEP não encontrado. Confira os números ou preencha a cidade e o estado abaixo.
                </Text>
              ) : null}
              {status === 'error' ? (
                <>
                  <Text variant="caption" tone="error">
                    Não foi possível buscar o CEP. Verifique sua internet.
                  </Text>
                  <View style={styles.retry}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        const digits = onlyDigits(values.cep);
                        if (digits.length === 8) void runLookup(digits);
                      }}
                    >
                      Buscar de novo
                    </Button>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          {revealed ? (
            <>
              <Input
                ref={streetRef}
                label="Endereço (opcional)"
                value={values.street}
                maxLength={160}
                error={errors.street}
                editable={!isResolving}
                autoComplete="street-address"
                onChangeText={(street) => onChange({ street })}
              />
              <Input
                ref={neighborhoodRef}
                label="Bairro ou localidade (opcional)"
                value={values.neighborhood}
                maxLength={120}
                error={errors.neighborhood}
                editable={!isResolving}
                onChangeText={(neighborhood) => onChange({ neighborhood })}
              />
              <Input
                ref={cityRef}
                label="Cidade"
                value={values.city}
                maxLength={80}
                error={errors.city}
                editable={!isResolving}
                autoCapitalize="words"
                onChangeText={(city) => onChange({ city })}
              />
              <Select
                label="Estado"
                options={UF_OPTIONS}
                value={values.state}
                error={errors.state}
                disabled={isResolving}
                onChange={(state) => onChange({ state })}
              />
            </>
          ) : null}

          <Input
            ref={cropRef}
            label="Cultura principal (opcional)"
            placeholder="Ex.: Café"
            autoCapitalize="sentences"
            value={values.mainCrop}
            maxLength={60}
            error={errors.mainCrop}
            editable={!isResolving}
            onChangeText={(mainCrop) => onChange({ mainCrop })}
          />
        </View>
      </Card>

      {formError ? <Notice variant="error">{formError}</Notice> : null}

      <View style={styles.cta}>
        <Button
          variant="primary"
          size="md"
          fullWidth
          loading={isResolving}
          loadingLabel="Buscando localização…"
          onPress={onContinue}
        >
          Continuar para o mapa
        </Button>
      </View>
    </View>
  );
}
