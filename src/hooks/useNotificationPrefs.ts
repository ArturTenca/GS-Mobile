import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from '@/services/notifications';
import type { AlertCategory } from '@/types/database';

export function useNotificationPrefs() {
  const queryClient = useQueryClient();
  const userId = useAuth().user?.id ?? null;
  const queryKey = ['notifications', 'prefs', userId] as const;

  const query = useQuery({
    queryKey,
    queryFn: getNotificationPrefs,
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: saveNotificationPrefs,
    onMutate: async (patch: Partial<NotificationPrefs>) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationPrefs>(queryKey);
      if (previous) {
        queryClient.setQueryData<NotificationPrefs>(queryKey, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved);
    },
  });

  const prefs = query.data;

  function setEnabled(enabled: boolean) {
    mutation.mutate({ enabled });
  }

  function setCategory(category: AlertCategory, on: boolean) {
    if (!prefs) return;
    const set = new Set(prefs.categories);
    if (on) set.add(category);
    else set.delete(category);
    mutation.mutate({ categories: Array.from(set) });
  }

  return {
    prefs,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
    setEnabled,
    setCategory,
    errorMessage: mutation.isError && mutation.error instanceof Error ? mutation.error.message : null,
    isSaving: mutation.isPending,
  };
}
