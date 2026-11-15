import { countPending } from '@/features/alerts/filter';
import { useAlerts } from '@/hooks/useAlerts';

/** Pending alerts (novo + visualizado) for a property; 0 while loading, on error or without a property. */
export function usePendingAlertCount(propertyId: string | null | undefined): number {
  const { data } = useAlerts(propertyId);
  return data ? countPending(data) : 0;
}

/** Tab badge label: hidden at 0, 1..9 as number, '9+' above 9. */
export function badgeLabel(count: number): number | string | undefined {
  if (count <= 0) return undefined;
  return count >= 10 ? '9+' : count;
}
