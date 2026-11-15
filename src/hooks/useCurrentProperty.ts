import { useSelectedFarm } from '@/hooks/useSelectedFarm';

/** Compatibility wrapper: the "current property" is the selected farm. */
export function useCurrentProperty() {
  const { farm, isLoading, isError, isFetching, refetch } = useSelectedFarm();
  return { data: farm, isLoading, isError, isFetching, refetch };
}
