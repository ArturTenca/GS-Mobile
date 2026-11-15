import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { listFarms } from '@/services/farms';

export const FARMS_STALE_TIME = 5 * 60_000;

export function useFarms() {
  const userId = useAuth().user?.id ?? null;
  // Keys are scoped per user so a session swap can never render another owner's cache.
  return useQuery({
    queryKey: ['farms', userId],
    queryFn: listFarms,
    enabled: !!userId,
    staleTime: FARMS_STALE_TIME,
  });
}
