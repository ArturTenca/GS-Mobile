import { useRouter } from 'expo-router';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FindingRow, categoryLabel, severityLabel } from '@/components/security/FindingRow';
import { AiAlertCard } from '@/components/security/AiAlertCard';
import { RiskGauge } from '@/components/security/RiskGauge';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MetricTile } from '@/components/ui/MetricTile';
import { Notice } from '@/components/ui/Notice';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useRunAudit } from '@/hooks/useRunAudit';
import { useSecurityOverview } from '@/hooks/useSecurityOverview';
import { spacing } from '@/theme/tokens';

const MAX_FINDINGS = 10;
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

function countBy<T>(list: readonly T[], key: (item: T) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const item of list) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return [...map.entries()];
}

function auditMessage(found: number, resolved: number): string {
  const f = found === 1 ? '1 item sensível encontrado' : `${found} itens sensíveis encontrados`;
  const r = resolved === 1 ? '1 resolvido' : `${resolved} resolvidos`;
  return `Auditoria concluída: ${f} e ${r}.`;
}

export default function SegurancaScreen() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

  const overview = useSecurityOverview();
  const audit = useRunAudit();
  const [result, setResult] = useState<{ found: number; resolved: number } | null>(null);
  const [auditFailed, setAuditFailed] = useState(false);

  const runAudit = async () => {
    setResult(null);
    setAuditFailed(false);
    const r = await audit.run();
    if (r) setResult(r);
    else if (!audit.isRunning) setAuditFailed(true);
  };

  const data = overview.data;
  const active = (data?.events ?? []).filter((e) => e.action !== 'resolved');
  const blocked = (data?.events ?? []).filter((e) => e.action === 'blocked').slice(0, MAX_FINDINGS);

  let body;
  if (overview.isLoading) {
    body = <LoadingState message="Carregando segurança…" />;
  } else if (overview.isError || !data) {
    body = <ErrorState onRetry={() => void overview.refetch()} />;
  } else {
    const byCategory = countBy(active, (e) => e.category);
    const bySeverity = countBy(active, (e) => e.severity).sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a[0] as (typeof SEVERITY_ORDER)[number]) -
        SEVERITY_ORDER.indexOf(b[0] as (typeof SEVERITY_ORDER)[number]),
    );
    body = (
      <View style={styles.stack}>
        <Text variant="label" tone="muted">
          A análise cobre somente os dados do seu próprio aplicativo: nome, propriedades e sensores.
        </Text>

        <RiskGauge score={data.score} level={data.level} />

        <View style={styles.section}>
          <Button
            icon={ShieldCheck}
            loading={audit.isRunning}
            loadingLabel="Auditando…"
            disabled={audit.isRunning}
            onPress={() => void runAudit()}
          >
            Rodar auditoria
          </Button>
          {result ? <Notice variant="success">{auditMessage(result.found, result.resolved)}</Notice> : null}
          {auditFailed || audit.isError ? (
            <Notice variant="error">Não foi possível concluir a auditoria. Tente de novo.</Notice>
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Resumo" />
          {active.length === 0 ? (
            <Text tone="muted">Nenhum item sensível ativo.</Text>
          ) : (
            <>
              <Text variant="label" weight="semibold">
                Por categoria
              </Text>
              <View style={styles.tiles}>
                {byCategory.map(([k, n]) => (
                  <View key={k} style={styles.tile}>
                    <MetricTile label={categoryLabel(k)} value={n} fill />
                  </View>
                ))}
              </View>
              <Text variant="label" weight="semibold">
                Por gravidade
              </Text>
              <View style={styles.tiles}>
                {bySeverity.map(([k, n]) => (
                  <View key={k} style={styles.tile}>
                    <MetricTile label={severityLabel(k)} value={n} fill />
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Vazamentos bloqueados" />
          {blocked.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Nenhum vazamento bloqueado"
              description="Quando o aplicativo impedir o envio de um dado pessoal, ele aparece aqui."
            />
          ) : (
            <View style={styles.list}>
              {blocked.map((e) => (
                <FindingRow key={e.id} event={e} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="O que isso significa" />
          {data.explanations.length === 0 ? (
            <Text tone="muted">Sem alertas para explicar agora.</Text>
          ) : (
            <View style={styles.list}>
              {data.explanations.map((item) => (
                <AiAlertCard key={`${item.rule_id}-${item.nivel}-${item.titulo}`} item={item} />
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <ScreenHeader title="Segurança e privacidade" onBack={goBack} />
      <ScreenContainer>{body}</ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
  section: { gap: spacing.sm },
  list: { gap: spacing.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexGrow: 1, flexBasis: '45%' },
});
