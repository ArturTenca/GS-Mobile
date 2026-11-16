import Sparkles from 'lucide-react-native/icons/sparkles';
import FileText from 'lucide-react-native/icons/file-text';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { LEVEL_LABEL } from '@/security/score';
import type { ExplainItem } from '@/services/security';
import { spacing } from '@/theme/tokens';

const LEVEL_VARIANT = {
  baixo: 'success',
  moderado: 'warning',
  alto: 'alert',
  critico: 'error',
} as const;

type AiAlertCardProps = {
  item: ExplainItem;
};

// Texto renderizado apenas por <Text> (sem HTML): a saida da IA e tratada como dado.
export function AiAlertCard({ item }: AiAlertCardProps) {
  const isAi = item.source === 'ai';
  return (
    <Card>
      <View style={styles.col}>
        <View style={styles.head}>
          <Text weight="semibold" style={styles.title}>
            {item.titulo}
          </Text>
          <Badge variant={LEVEL_VARIANT[item.nivel]}>{LEVEL_LABEL[item.nivel]}</Badge>
        </View>
        <Text variant="label" weight="semibold">
          Risco real
        </Text>
        <Text>{item.risco_real}</Text>
        <Text variant="label" weight="semibold">
          O que fazer
        </Text>
        <Text>{item.o_que_fazer}</Text>
        <View style={styles.badge}>
          <Badge
            variant={isAi ? 'primary' : 'default'}
            icon={isAi ? Sparkles : FileText}
            accessibilityLabel={isAi ? 'Texto explicado por inteligência artificial' : 'Texto padrão do aplicativo'}
          >
            {isAi ? 'Explicado por IA' : 'Texto padrão'}
          </Badge>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1 },
  badge: { flexDirection: 'row' },
});
