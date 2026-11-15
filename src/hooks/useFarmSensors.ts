import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { listFarmSensors } from '@/services/sensors';

export function useFarmSensors(propertyId: string | null | undefined) {
  const userId = useAuth().user?.id ?? null;
  return useQuery({
    queryKey: ['sensors', userId, propertyId],
    queryFn: () => listFarmSensors(propertyId as string),
    enabled: !!userId && !!propertyId,
  });
}
