import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { listAlerts } from '@/services/alerts';

export function useAlerts(propertyId: string | null | undefined) {
  const userId = useAuth().user?.id ?? null;
  return useQuery({
    queryKey: ['alerts', userId, propertyId],
    queryFn: () => listAlerts(propertyId as string),
    enabled: !!userId && !!propertyId,
    refetchOnWindowFocus: true,
  });
}
