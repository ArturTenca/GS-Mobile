import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { listThresholds } from '@/services/thresholds';

export function useThresholds(propertyId: string | null | undefined) {
  const userId = useAuth().user?.id ?? null;
  return useQuery({
    queryKey: ['readings', 'thresholds', userId, propertyId],
    queryFn: () => listThresholds(propertyId as string),
    enabled: !!userId && !!propertyId,
    staleTime: 5 * 60_000,
  });
}
