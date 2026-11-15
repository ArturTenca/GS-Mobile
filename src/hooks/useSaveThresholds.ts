import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { saveThresholds, type ThresholdSaveRow } from '@/services/thresholds';

type SaveArgs = { propertyId: string; rows: ThresholdSaveRow[] };

export function useSaveThresholds() {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: ({ propertyId, rows }: SaveArgs) => saveThresholds(propertyId, rows),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['readings'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['alert'] }),
        queryClient.invalidateQueries({ queryKey: ['sensors'] }),
      ]);
    },
  });

  async function save(propertyId: string, rows: ThresholdSaveRow[]): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;
    try {
      await mutation.mutateAsync({ propertyId, rows });
      return true;
    } catch {
      return false;
    } finally {
      inFlight.current = false;
    }
  }

  return {
    save,
    isSaving: mutation.isPending,
    errorMessage: mutation.error instanceof Error ? mutation.error.message : null,
    reset: mutation.reset,
  };
}
