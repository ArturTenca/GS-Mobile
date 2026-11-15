import { isPending } from '@/features/condition/deriveCondition';
import { pendingAlertsLabel } from '@/lib/formatNumber';
import type { AlertCategory, AlertSeverity, AlertStatus } from '@/types/database';

export type AlertStatusFilter = 'pendentes' | 'resolvidos' | 'todos';

export type FilterableAlert = {
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  triggeredAt: string;
};

export type AlertFilterValues = {
  status: AlertStatusFilter;
  category: AlertCategory | null;
  severity: AlertSeverity | null;
};

const SEVERITY_RANK: Record<AlertSeverity, number> = { info: 0, warning: 1, critical: 2 };

export function countPending(alerts: ReadonlyArray<{ status: AlertStatus }>): number {
  return alerts.filter((a) => isPending(a as never)).length;
}

export function filterAlerts<T extends FilterableAlert>(alerts: readonly T[], f: AlertFilterValues): T[] {
  return alerts.filter((a) => {
    if (f.status === 'pendentes' && a.status === 'resolvido') return false;
    if (f.status === 'resolvidos' && a.status !== 'resolvido') return false;
    if (f.category && a.category !== f.category) return false;
    if (f.severity && a.severity !== f.severity) return false;
    return true;
  });
}

export function sortAlerts<T extends FilterableAlert>(alerts: readonly T[]): T[] {
  return [...alerts].sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;
    return Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt);
  });
}

export function resultCountLabel(count: number, status: AlertStatusFilter): string {
  if (status === 'pendentes') return pendingAlertsLabel(count);
  return count === 1 ? '1 alerta' : `${count} alertas`;
}

export function hasActiveFilters(f: Pick<AlertFilterValues, 'category' | 'severity'>): boolean {
  return f.category !== null || f.severity !== null;
}
