import { useCallback } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useFarms } from '@/hooks/useFarms';
import { pickSelectedFarm, useSelectedFarmStore } from '@/stores/selectedFarm';

export function useSelectedFarm() {
  const userId = useAuth().user?.id ?? null;
  const query = useFarms();
  const storedId = useSelectedFarmStore((s) => (userId ? s.byUser[userId] : undefined));
  const setSelected = useSelectedFarmStore((s) => s.setSelected);

  const farms = query.data ?? [];
  const farm = pickSelectedFarm(farms, storedId);

  const select = useCallback(
    (id: string) => {
      if (userId) setSelected(userId, id);
    },
    [userId, setSelected],
  );

  return {
    farms,
    farm,
    select,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
