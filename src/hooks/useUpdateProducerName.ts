import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { updateProducerName } from '@/services/producers';

export function useUpdateProducerName() {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: updateProducerName,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['producer'] });
    },
  });

  async function save(name: string): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;
    try {
      await mutation.mutateAsync(name);
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
