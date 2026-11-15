import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { getAlert } from '@/services/alerts';

export function useAlert(id: string | null | undefined) {
  const userId = useAuth().user?.id ?? null;
  // Keys are scoped per user so a session swap can never render another
  // owner's cache (Phase 1 WR-03).
  return useQuery({
    queryKey: ['alert', userId, id],
    queryFn: () => getAlert(id as string),
    enabled: !!userId && !!id,
  });
}
