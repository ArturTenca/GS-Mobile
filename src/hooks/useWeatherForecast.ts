import { useQuery } from '@tanstack/react-query';

import { getForecast, roundCoord } from '@/services/weather';

const isCoord = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Open-Meteo forecast for a point. Public data, keyed by rounded coordinates (not user
 * scoped; sign-out clears the whole cache). Disabled unless both coordinates are finite,
 * so null is never sent to the API (T-02.2-21).
 */
export function useWeatherForecast(lat: number | null | undefined, lng: number | null | undefined) {
  const valid = isCoord(lat) && isCoord(lng);
  const rLat = valid ? roundCoord(lat) : null;
  const rLng = valid ? roundCoord(lng) : null;
  return useQuery({
    queryKey: ['weather', rLat, rLng],
    queryFn: () => getForecast(rLat as number, rLng as number),
    enabled: valid,
    staleTime: 30 * 60_000,
    retry: 1,
  });
}
