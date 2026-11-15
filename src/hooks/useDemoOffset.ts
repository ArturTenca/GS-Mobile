import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { getDemoOffset } from '@/services/readings';

/** Demo time offset for a farm; lives under ['readings'] so regeneration refreshes it. */
export function useDemoOffset(propertyId: string | null | undefined) {
  const userId = useAuth().user?.id ?? null;
  return useQuery({
    queryKey: ['readings', 'offset', userId, propertyId],
    queryFn: () => getDemoOffset(propertyId as string),
    enabled: !!userId && !!propertyId,
    staleTime: 30_000,
  });
}
