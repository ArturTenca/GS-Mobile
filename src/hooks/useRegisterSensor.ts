import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { registerSensor, type RegisterSensorInput } from '@/services/sensors';

export function useRegisterSensor() {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: registerSensor,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['farms'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
      ]);
    },
  });

  async function submit(input: RegisterSensorInput): Promise<string | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    try {
      return await mutation.mutateAsync(input);
    } catch {
      return null;
    } finally {
      inFlight.current = false;
    }
  }

  return {
    submit,
    isSaving: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error instanceof Error ? mutation.error.message : null,
    reset: mutation.reset,
  };
}
