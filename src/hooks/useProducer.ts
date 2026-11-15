import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { getProducer } from '@/services/producers';

export function useProducer() {
  const userId = useAuth().user?.id ?? null;
  // Keys are scoped per user so a session swap can never render another owner's cache.
  return useQuery({
    queryKey: ['producer', userId],
    queryFn: () => getProducer(userId as string),
    staleTime: 5 * 60_000,
    enabled: !!userId,
  });
}
