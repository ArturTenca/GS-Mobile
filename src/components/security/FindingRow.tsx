import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { TEMPLATES } from '@/security/remediation/templates';
import type { SecurityEventRow } from '@/services/security';
import { spacing } from '@/theme/tokens';

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'alert' | 'error';

const SEVERITY: Record<string, { label: string; variant: Variant }> = {
  low: { label: 'Baixa', variant: 'default' },
  medium: { label: 'Média', variant: 'warning' },
  high: { label: 'Alta', variant: 'alert' },
  critical: { label: 'Crítica', variant: 'error' },
};

const CATEGORY: Record<string, string> = {
  identity: 'Identidade',
  contact: 'Contato',
  financial: 'Financeiro',
  credential: 'Credencial',
  health: 'Saúde',
  location: 'Localização',
  address: 'Endereço',
};

export const ACTION_LABEL: Record<string, string> = {
  blocked: 'Bloqueado',
  redacted: 'Ocultado',
  detected: 'Detectado',
  resolved: 'Resolvido',
};

export const categoryLabel = (c: string): string => CATEGORY[c] ?? c;
export const severityLabel = (s: string): string => SEVERITY[s]?.label ?? s;

type FindingRowProps = {
  event: SecurityEventRow;
};

export function FindingRow({ event }: FindingRowProps) {
  const sev = SEVERITY[event.severity] ?? { label: event.severity, variant: 'default' as Variant };
  const title = TEMPLATES[event.ruleId]?.titulo ?? 'Dado sensível';
  const action = ACTION_LABEL[event.action] ?? event.action;
  const occ = event.occurrences === 1 ? '1 ocorrência' : `${event.occurrences} ocorrências`;
  const a11y = `${title}. ${action}. Gravidade ${sev.label.toLowerCase()}. ${occ}. Origem ${event.origin}.`;

  return (
    <Card>
      <View accessible accessibilityLabel={a11y} style={styles.col}>
        <View style={styles.head}>
          <Text weight="semibold" style={styles.title}>
            {title}
          </Text>
          <Badge variant={sev.variant}>{sev.label}</Badge>
        </View>
        <View style={styles.badges}>
          <Badge>{categoryLabel(event.category)}</Badge>
          <Badge variant={event.action === 'blocked' ? 'success' : 'default'}>{action}</Badge>
        </View>
        {event.preview ? (
          <Text variant="label" tone="muted" numeric>
            {`Prévia: ${event.preview}`}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          {`${occ} · origem: ${event.origin}`}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
