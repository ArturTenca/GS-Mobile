import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import {
  DemoDataError,
  generateDemoDataset,
  mapDemoDataError,
  type DemoDataErrorKind,
} from '@/services/demoData';

export function useGenerateDemoData() {
  const queryClient = useQueryClient();
  // Double-tap guard (Pitfall 9); the server also locks the row and throttles (AG429).
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: generateDemoDataset,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['farms'] }),
        queryClient.invalidateQueries({ queryKey: ['readings'] }),
      ]);
    },
  });

  async function generate(propertyId: string): Promise<{ sensors: number; readings: number } | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    try {
      return await mutation.mutateAsync(propertyId);
    } catch {
      return null;
    } finally {
      inFlight.current = false;
    }
  }

  let errorKind: DemoDataErrorKind | null = null;
  let errorMessage: string | null = null;
  if (mutation.error) {
    const mapped =
      mutation.error instanceof DemoDataError
        ? { kind: mutation.error.kind, message: mutation.error.message }
        : mapDemoDataError(null);
    errorKind = mapped.kind;
    errorMessage = mapped.message;
  }

  return {
    generate,
    isGenerating: mutation.isPending,
    errorKind,
    errorMessage,
    reset: mutation.reset,
  };
}
