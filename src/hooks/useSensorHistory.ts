import { useQuery } from '@tanstack/react-query';

import { PERIODS, type PeriodKey } from '@/features/charts/periods';
import { useAuth } from '@/features/auth/AuthProvider';
import { listSensorHistory } from '@/services/readings';

/**
 * Per-sensor history for one period. Waits for the demo offset so the window is
 * anchored correctly; previous periods are not kept, so cards show their skeleton
 * instead of mixing periods (UI-SPEC S5).
 */
export function useSensorHistory(
  sensorId: string | null | undefined,
  period: PeriodKey,
  offsetMs: number | undefined,
) {
  const userId = useAuth().user?.id ?? null;
  return useQuery({
    queryKey: ['readings', 'history', userId, sensorId, period, offsetMs],
    queryFn: () => listSensorHistory(sensorId as string, PERIODS[period].ms, offsetMs as number),
    enabled: !!userId && !!sensorId && typeof offsetMs === 'number',
    staleTime: 60_000,
  });
}
