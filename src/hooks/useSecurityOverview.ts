import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { computeRiscoCidadao } from '@/security/score';
import type { RiscoCidadao } from '@/security/score';
import { explainRisk, flushPendingSecurityEvents, listSecurityEvents } from '@/services/security';
import type { ExplainInput, ExplainItem, SecurityEventRow } from '@/services/security';

const MAX_EXPLAINED = 6;

/** Aggregates up to 6 items by (rule_id, severity, sink, action), skipping resolved ones. */
export function aggregateForExplain(events: readonly SecurityEventRow[]): ExplainInput[] {
  const map = new Map<string, ExplainInput>();
  for (const e of events) {
    if (e.action === 'resolved') continue;
    const key = `${e.ruleId}|${e.severity}|${e.sink}|${e.action}`;
    const cur = map.get(key);
    if (cur) cur.count += e.occurrences;
    else map.set(key, { rule_id: e.ruleId, severity: e.severity, sink: e.sink, action: e.action, count: e.occurrences });
  }
  return [...map.values()].slice(0, MAX_EXPLAINED);
}

export interface SecurityOverview extends RiscoCidadao {
  events: SecurityEventRow[];
  explanations: ExplainItem[];
  isAiAvailable: boolean;
}

export function useSecurityOverview() {
  const userId = useAuth().user?.id ?? null;

  const eventsQuery = useQuery({
    queryKey: ['security', userId],
    queryFn: async () => {
      try {
        await flushPendingSecurityEvents();
      } catch {
        // eventos ficam no buffer; a lista continua valida
      }
      return listSecurityEvents();
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const items = useMemo(() => aggregateForExplain(events), [events]);
  const itemKey = items.map((i) => `${i.rule_id}:${i.severity}:${i.sink}:${i.action}:${i.count}`).join(',');

  const explainQuery = useQuery({
    queryKey: ['security', userId, 'explain', itemKey],
    queryFn: () => explainRisk(items),
    enabled: !!userId && items.length > 0,
    staleTime: 10 * 60_000,
  });

  const risk = useMemo(() => computeRiscoCidadao(events), [events]);
  const explanations = explainQuery.data ?? [];

  const data: SecurityOverview | undefined = eventsQuery.data
    ? {
        ...risk,
        events,
        explanations,
        isAiAvailable: explanations.some((x) => x.source === 'ai'),
      }
    : undefined;

  return {
    data,
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    isExplaining: explainQuery.isLoading,
    refetch: eventsQuery.refetch,
  };
}
