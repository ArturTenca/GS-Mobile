import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { newUuid } from '@/lib/uuid';
import { createFarm, type CreateFarmInput, type Farm } from '@/services/farms';
import { useSelectedFarmStore } from '@/stores/selectedFarm';

export type NewFarmInput = Omit<CreateFarmInput, 'id'>;

export function useCreateFarm() {
  const queryClient = useQueryClient();
  const userId = useAuth().user?.id ?? null;
  const setSelected = useSelectedFarmStore((s) => s.setSelected);
  const inFlight = useRef(false);
  // One id per mounted flow attempt: stable across retries until success (idempotent insert).
  const farmId = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: createFarm,
    onSuccess: async (farm) => {
      if (userId) setSelected(userId, farm.id);
      farmId.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['farms'] }),
        queryClient.invalidateQueries({ queryKey: ['property'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
      ]);
    },
  });

  async function submit(input: NewFarmInput): Promise<Farm | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    try {
      if (!farmId.current) farmId.current = newUuid();
      return await mutation.mutateAsync({ ...input, id: farmId.current });
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
