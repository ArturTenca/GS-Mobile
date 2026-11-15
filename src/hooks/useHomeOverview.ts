import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { getHomeOverview } from '@/services/home';

export function useHomeOverview(propertyId: string | null | undefined) {
  const userId = useAuth().user?.id ?? null;
  // Keys are scoped per user and property so a session swap can never render
  // another owner's cache (Phase 1 WR-03).
  return useQuery({
    queryKey: ['home', 'overview', userId, propertyId],
    queryFn: () => getHomeOverview(propertyId as string),
    enabled: !!userId && !!propertyId,
  });
}
