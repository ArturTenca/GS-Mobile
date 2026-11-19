import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { readScreenCache, toCachedOverview, writeScreenCache } from '@/lib/screenCache';
import { getHomeOverview, type HomeOverview } from '@/services/home';

export function useHomeOverview(propertyId: string | null | undefined) {
  const userId = useAuth().user?.id ?? null;
  const cacheName = `overview.${propertyId ?? ''}`;
  // Keys are scoped per user and property so a session swap can never render
  // another owner's cache (Phase 1 WR-03).
  return useQuery({
    queryKey: ['home', 'overview', userId, propertyId],
    queryFn: async () => {
      const overview = await getHomeOverview(propertyId as string);
      writeScreenCache(userId, cacheName, toCachedOverview(overview));
      return overview;
    },
    enabled: !!userId && !!propertyId,
    // Last Início seen for this farm renders instantly while the fresh data loads.
    placeholderData: () => (propertyId ? readScreenCache<HomeOverview>(userId, cacheName) : undefined),
  });
}
