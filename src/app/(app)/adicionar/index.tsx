import { useRouter } from 'expo-router';
import { LandPlot, Radio } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoiceCard } from '@/components/flow/ChoiceCard';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { spacing } from '@/theme/tokens';

const SENSOR_HINT = 'Primeiro cadastre uma fazenda com o limite no mapa.';

export default function AdicionarScreen() {
  const router = useRouter();
  const { farms, isLoading, isError } = useSelectedFarm();

  const styles = useMemo(() => StyleSheet.create({ content: { gap: spacing.lg } }), []);

  const hasBoundary = farms.some((f) => f.boundary != null);
  // While loading the press is ignored; on error the card stays enabled (D-03).
  const sensorDisabled = !isLoading && !isError && !hasBoundary;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <>
      <ScreenHeader title="Adicionar" onBack={goBack} />
      <ScreenContainer>
        <View style={styles.content}>
          <Text variant="body">O que você quer cadastrar?</Text>
          <ChoiceCard
            icon={LandPlot}
            title="Fazenda"
            description="Marque no mapa o limite da sua terra."
            accessibilityLabel="Fazenda. Marque no mapa o limite da sua terra."
            onPress={() => router.push('/adicionar/fazenda' as never)}
          />
          <ChoiceCard
            icon={Radio}
            title="Sensor"
            description={sensorDisabled ? SENSOR_HINT : 'Coloque um sensor dentro de uma fazenda.'}
            accessibilityLabel={
              sensorDisabled ? `Sensor, indisponível. ${SENSOR_HINT}` : 'Sensor. Coloque um sensor dentro de uma fazenda.'
            }
            disabled={sensorDisabled}
            onPress={() => {
              if (isLoading || sensorDisabled) return;
              router.push('/adicionar/sensor');
            }}
          />
        </View>
      </ScreenContainer>
    </>
  );
}
