import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { updateAlertStatus } from '@/services/alerts';

type Status = 'visualizado' | 'resolvido';

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: (v: { id: string; status: Status }) => updateAlertStatus(v.id, v.status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['alert'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
      ]);
    },
  });

  async function update(id: string, status: Status): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;
    try {
      await mutation.mutateAsync({ id, status });
      return true;
    } catch {
      return false;
    } finally {
      inFlight.current = false;
    }
  }

  return {
    update,
    isUpdating: mutation.isPending,
    errorMessage: mutation.error instanceof Error ? mutation.error.message : null,
    reset: mutation.reset,
  };
}
