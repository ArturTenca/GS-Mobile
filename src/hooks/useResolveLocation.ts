import { useCallback, useState } from 'react';

import { resolveLocation, type LocationInput, type LocationResult } from '@/services/geocoding';

export function useResolveLocation() {
  const [isResolving, setIsResolving] = useState(false);

  const resolve = useCallback(async (input: LocationInput): Promise<LocationResult> => {
    setIsResolving(true);
    try {
      return await resolveLocation(input);
    } catch {
      return { lat: null, lng: null, precision: 'none' };
    } finally {
      setIsResolving(false);
    }
  }, []);

  return { resolve, isResolving };
}
