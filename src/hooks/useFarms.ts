import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { readScreenCache, toCachedFarms, writeScreenCache } from '@/lib/screenCache';
import { listFarms, type Farm } from '@/services/farms';

export const FARMS_STALE_TIME = 5 * 60_000;

/** Fetches farms and keeps a privacy-safe copy on the device for instant next start. */
export async function fetchFarmsCached(userId: string | null): Promise<Farm[]> {
  const farms = await listFarms();
  writeScreenCache(userId, 'farms', toCachedFarms(farms as unknown as Record<string, unknown>[]));
  return farms;
}

export function useFarms() {
  const userId = useAuth().user?.id ?? null;
  // Keys are scoped per user so a session swap can never render another owner's cache.
  return useQuery({
    queryKey: ['farms', userId],
    queryFn: () => fetchFarmsCached(userId),
    enabled: !!userId,
    staleTime: FARMS_STALE_TIME,
    // Last list seen on this device shows instantly; the fresh one replaces it in the background.
    placeholderData: () => readScreenCache<Farm[]>(userId, 'farms'),
  });
}
