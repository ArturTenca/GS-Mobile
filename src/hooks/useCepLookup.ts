import { useCallback, useRef, useState } from 'react';

import { lookupCep, type CepResult } from '@/services/geocoding';

export type CepLookupStatus = 'idle' | 'loading' | 'found' | 'notFound' | 'error';

export function useCepLookup() {
  const [status, setStatus] = useState<CepLookupStatus>('idle');
  const [result, setResult] = useState<CepResult | null>(null);
  const inFlight = useRef<string | null>(null);

  const lookup = useCallback(async (cep: string): Promise<CepResult | null> => {
    if (inFlight.current === cep) return null;
    inFlight.current = cep;
    setStatus('loading');
    try {
      const found = await lookupCep(cep);
      setResult(found);
      setStatus(found.found ? 'found' : 'notFound');
      return found;
    } catch {
      setResult(null);
      setStatus('error');
      return null;
    } finally {
      inFlight.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    inFlight.current = null;
    setResult(null);
    setStatus('idle');
  }, []);

  return { status, result, lookup, reset };
}
